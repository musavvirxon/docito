// File: supabase/functions/user-timezone/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestBody = {
  timezone?: string;
  source?: string;
  allow_overwrite?: boolean;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function requireEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function pickCountryFromHeaders(headers: Headers): string | null {
  const candidates = [
    "cf-ipcountry",
    "x-vercel-ip-country",
    "x-country-code",
    "x-country",
    "x-geo-country",
    "x-appengine-country",
  ];

  for (const key of candidates) {
    const v = headers.get(key) || headers.get(key.toUpperCase());
    if (v && typeof v === "string") {
      const cc = v.trim().toUpperCase();
      if (cc.length === 2) return cc;
    }
  }
  return null;
}

// Minimal fallback map used only when the database mapping function is unavailable.
const fallbackCountryTimezone: Record<string, string> = {
  US: "America/New_York",
  CA: "America/Toronto",
  MX: "America/Mexico_City",
  BR: "America/Sao_Paulo",
  AR: "America/Argentina/Buenos_Aires",
  GB: "Europe/London",
  IE: "Europe/Dublin",
  FR: "Europe/Paris",
  DE: "Europe/Berlin",
  ES: "Europe/Madrid",
  IT: "Europe/Rome",
  NL: "Europe/Amsterdam",
  SE: "Europe/Stockholm",
  NO: "Europe/Oslo",
  DK: "Europe/Copenhagen",
  PL: "Europe/Warsaw",
  TR: "Europe/Istanbul",
  UA: "Europe/Kyiv",
  RU: "Europe/Moscow",
  KZ: "Asia/Almaty",
  UZ: "Asia/Tashkent",
  AE: "Asia/Dubai",
  SA: "Asia/Riyadh",
  IN: "Asia/Kolkata",
  PK: "Asia/Karachi",
  BD: "Asia/Dhaka",
  TH: "Asia/Bangkok",
  VN: "Asia/Ho_Chi_Minh",
  CN: "Asia/Shanghai",
  JP: "Asia/Tokyo",
  KR: "Asia/Seoul",
  AU: "Australia/Sydney",
  NZ: "Pacific/Auckland",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, 405);

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, error: "Missing Authorization header" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) return json({ ok: false, error: "Unauthorized" }, 401);

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const allowOverwrite = Boolean(body.allow_overwrite);
    const requestedTz = typeof body.timezone === "string" ? body.timezone.trim() : "";
    const requestedSource = typeof body.source === "string" ? body.source.trim() : "";

    const { data: prof, error: profErr } = await userClient
      .from("profiles")
      .select("timezone")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profErr) throw profErr;

    const existingTz = (prof as any)?.timezone ? String((prof as any).timezone).trim() : "";

    // Default behavior: only set when missing.
    if (!allowOverwrite && existingTz) {
      return json({ ok: true, timezone: existingTz, source: null, changed: false });
    }

    // Determine timezone
    let chosenTimezone = requestedTz;
    let chosenSource = requestedSource || (requestedTz ? "signup_browser" : "signup_ip");

    // If client didn't provide tz, try to infer from country header.
    if (!chosenTimezone) {
      const country = pickCountryFromHeaders(req.headers);
      if (country) {
        // Prefer a DB function if present (optional), otherwise fallback map.
        try {
          const { data: tzData, error: tzErr } = await userClient.rpc("docito_country_to_timezone", {
            p_country_code: country,
          });
          if (!tzErr && typeof tzData === "string" && tzData.trim()) {
            chosenTimezone = tzData.trim();
            chosenSource = "signup_ip";
          }
        } catch {
          // ignore
        }

        if (!chosenTimezone && fallbackCountryTimezone[country]) {
          chosenTimezone = fallbackCountryTimezone[country];
          chosenSource = "signup_ip";
        }
      }
    }

    if (!chosenTimezone) {
      chosenTimezone = existingTz || "UTC";
      chosenSource = "fallback";
    }

    // Update timezone directly on profiles table.
    const { error: updErr } = await userClient
      .from("profiles")
      .update({
        timezone: chosenTimezone,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updErr) throw updErr;

    return json({ ok: true, timezone: chosenTimezone, source: chosenSource, changed: true });
  } catch (e) {
    return json({ ok: false, error: String((e as any)?.message ?? e) }, 500);
  }
});
