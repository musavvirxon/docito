// supabase/functions/fx-rates-refresh/index.ts
//
// Daily refresh of FX rates from the European Central Bank (free, no API key).
// Triggered by pg_cron via pg_net (see migration). Can also be invoked manually.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ECB publishes EUR-based daily rates. We re-pivot to USD so the platform's
// canonical base is USD. Currencies missing from ECB get a sensible fallback.
const ECB_FEED = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

const TARGET_QUOTES = [
  "USD","EUR","GBP","JPY","KRW","RUB","TRY","UZS",
  "CNY","SAR","BRL","MXN","CAD","AUD","CHF","INR",
];

// Conservative fallbacks (only used if ECB is unreachable).
const FALLBACK_USD: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 155, KRW: 1380, RUB: 92,
  TRY: 32.5, UZS: 12700, CNY: 7.25, SAR: 3.75, BRL: 5.10,
  MXN: 17, CAD: 1.36, AUD: 1.52, CHF: 0.91, INR: 83,
};

function parseEcbXml(xml: string): { eurToUsd: number | null; eurRates: Record<string, number> } {
  const eurRates: Record<string, number> = { EUR: 1 };
  // Lightweight parsing: <Cube currency="USD" rate="1.0823"/>
  const re = /<Cube\s+currency="([A-Z]{3})"\s+rate="([0-9.]+)"\s*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    eurRates[m[1]] = Number(m[2]);
  }
  return { eurToUsd: eurRates.USD ?? null, eurRates };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Fetch ECB rates
    let usdRates: Record<string, number> = { ...FALLBACK_USD };
    let source = "fallback";
    try {
      const res = await fetch(ECB_FEED, {
        headers: { Accept: "application/xml,text/xml" },
      });
      if (res.ok) {
        const xml = await res.text();
        const { eurToUsd, eurRates } = parseEcbXml(xml);
        if (eurToUsd && eurToUsd > 0) {
          // Convert each ECB EUR→X rate into USD→X rate.
          // EUR→X = X per 1 EUR. USD→X = X per 1 USD.
          // 1 EUR = eurToUsd USD, so: USD→X = (EUR→X) / eurToUsd
          for (const code of TARGET_QUOTES) {
            const eurX = eurRates[code];
            if (typeof eurX === "number" && eurX > 0) {
              usdRates[code] = code === "USD" ? 1 : eurX / eurToUsd;
            }
          }
          source = "ecb";
        }
      }
    } catch (fetchErr) {
      console.error("ECB fetch failed, using fallbacks:", fetchErr);
    }

    // 2. Upsert into fx_rates
    const rows = TARGET_QUOTES.map((quote) => ({
      base: "USD",
      quote,
      rate: Number(usdRates[quote] ?? FALLBACK_USD[quote] ?? 1).toFixed(6),
      fetched_at: new Date().toISOString(),
      source,
    }));

    const { error } = await supabase
      .from("fx_rates")
      .upsert(rows, { onConflict: "base,quote" });

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, source, count: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("fx-rates-refresh error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
