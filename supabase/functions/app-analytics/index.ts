// File: supabase/functions/app-analytics/index.ts
// Deno Edge Function: User-level analytics + billing snapshot for the app UI.
// - Deno + supabase-js v2
// - CORS + Authorization
// - Runs with ANON (RLS) for reads; uses auth header for per-user access

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = {
  rangeDays?: number; // default 30
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" };
  return { ok: true as const, url, anon };
}

function clampDays(n: unknown, fallback = 30) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(7, Math.min(365, Math.trunc(v)));
}

function toISODate(d: Date) {
  // YYYY-MM-DD (UTC)
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const supabase = createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody = {};
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    body = {};
  }

  const rangeDays = clampDays(body?.rangeDays, 30);
  const userId = userRes.user.id;

  const end = new Date();
  const start = new Date(end.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  try {
    // 1) High-level analytics (RPC)
    const { data: analyticsRow, error: analyticsErr } = await supabase.rpc("account_analytics", {
      p_user_id: userId,
      p_days: rangeDays,
    });
    if (analyticsErr) throw analyticsErr;

    // 2) Spending trend (payments)
    const { data: payments, error: payErr } = await supabase
      .from("payments")
      .select("created_at,amount,status")
      .eq("patient_id", userId)
      .gte("created_at", startISO)
      .lte("created_at", endISO)
      .order("created_at", { ascending: true })
      .limit(2000);
    if (payErr) throw payErr;

    // Pre-fill daily buckets
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
      d.setUTCDate(d.getUTCDate() - (rangeDays - 1 - i));
      dailyMap.set(toISODate(d), 0);
    }

    for (const p of (payments || []) as any[]) {
      const status = String(p.status || "").toLowerCase();
      if (status && status !== "paid" && status !== "completed") continue;

      const key = toISODate(new Date(p.created_at));
      if (!dailyMap.has(key)) continue;

      const raw = Number(p.amount || 0);
      if (!Number.isFinite(raw)) continue;

      // payments.amount is stored as numeric (usually in cents in this app)
      const cents = Math.round(raw);
      dailyMap.set(key, (dailyMap.get(key) || 0) + cents);
    }

    const dailySpend = Array.from(dailyMap.entries()).map(([date, spend_cents]) => ({
      date,
      spend_cents,
    }));

    // 3) Billing snapshot (invoices + payment methods)
    const [{ data: invoices, error: invErr }, { data: methods, error: pmErr }] = await Promise.all([
      supabase
        .from("invoices")
        .select("id,created_at,invoice_number,status,currency,total_amount,due_date,paid_at,pdf_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("user_payment_methods")
        .select("id,provider,brand,last4,exp_month,exp_year,is_default,created_at")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (invErr) throw invErr;
    if (pmErr) throw pmErr;

    return json(
      {
        ok: true,
        rangeDays,
        analytics: analyticsRow || null,
        dailySpend,
        billing: {
          invoices: invoices || [],
          paymentMethods: methods || [],
        },
      },
      200,
    );
  } catch (e: any) {
    console.error("app-analytics error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
