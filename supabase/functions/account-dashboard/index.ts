// File: supabase/functions/account-dashboard/index.ts
// Deno Edge Function: Account dashboard data for signed-in user (Billing + Analytics + Settings).
//
// Hard requirements:
// - Deno + supabase-js v2
// - CORS + Authorization
// - Service-role guarded DB access, manual auth via auth.getUser()

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "billing_summary" | "analytics" | "get_settings" | "update_settings";

type ReqBody =
  | { action: "billing_summary" }
  | { action: "analytics"; days?: number }
  | { action: "get_settings" }
  | { action: "update_settings"; settings: Record<string, unknown> };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function getEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return {
      ok: false as const,
      error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
    };
  }
  return { ok: true as const, url, anon, service };
}

function clampDays(n: unknown, fallback = 30) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(1, Math.min(365, Math.trunc(v)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = getEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const authed = createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const action = (body as any)?.action as Action | undefined;
  if (!action) return json({ ok: false, error: "Missing action" }, 400);

  const admin = createClient(env.url, env.service);
  const userId = userRes.user.id;

  try {
    if (action === "billing_summary") {
      const [{ data: paymentMethods, error: pmErr }, { data: invoices, error: invErr }, { data: payments, error: payErr }] =
        await Promise.all([
          admin
            .from("user_payment_methods")
            .select("id, provider, provider_payment_method_id, brand, last4, exp_month, exp_year, is_default, created_at")
            .eq("user_id", userId)
            .order("is_default", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(10),
          admin
            .from("invoices")
            .select("id, created_at, invoice_number, status, currency, total_amount, due_date, paid_at, pdf_url")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(100),
          admin
            .from("payments")
            .select("id, amount, status, paid_at, created_at, appointment_id, practice_id, transaction_id")
            .eq("patient_id", userId)
            .order("created_at", { ascending: false })
            .limit(100),
        ]);

      if (pmErr) throw pmErr;
      if (invErr) throw invErr;
      if (payErr) throw payErr;

      const invs = (invoices || []) as Array<any>;
      const pays = (payments || []) as Array<any>;

      const totalPaid = pays
        .filter((p) => {
          const s = String(p.status || "").toLowerCase();
          return s === "paid" || s === "completed";
        })
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const totalDue = invs
        .filter((i) => {
          const s = String(i.status || "").toLowerCase();
          return s !== "paid" && s !== "void" && s !== "canceled";
        })
        .reduce((sum, i) => sum + Number(i.total_amount || 0), 0);

      const overdueCount = invs.filter((i) => String(i.status || "").toLowerCase() === "overdue").length;
      const defaultPm = (paymentMethods || []).find((m: any) => Boolean(m.is_default))?.id ?? null;

      return json({
        ok: true,
        payment_methods: paymentMethods || [],
        invoices: invs,
        payments: pays,
        summary: {
          total_paid: totalPaid,
          total_due: totalDue,
          overdue_count: overdueCount,
          default_payment_method_id: defaultPm,
        },
      });
    }

    if (action === "analytics") {
      const days = clampDays((body as any)?.days, 30);
      const { data, error } = await admin.rpc("account_analytics", { p_user_id: userId, p_days: days });
      if (error) throw error;
      return json({ ok: true, data });
    }

    if (action === "get_settings") {
      const { data, error } = await admin
        .from("user_settings")
        .select("settings, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      return json({
        ok: true,
        settings: (data?.settings as Record<string, unknown>) || {},
        meta: { created_at: data?.created_at ?? null, updated_at: data?.updated_at ?? null },
      });
    }

    if (action === "update_settings") {
      const incoming = (body as any)?.settings;
      if (!incoming || typeof incoming !== "object") return json({ ok: false, error: "Invalid settings" }, 400);

      const { data: existing, error: selErr } = await admin
        .from("user_settings")
        .select("settings")
        .eq("user_id", userId)
        .maybeSingle();
      if (selErr) throw selErr;

      const merged = { ...(((existing?.settings as any) || {}) as Record<string, unknown>), ...(incoming as Record<string, unknown>) };

      const { data, error } = await admin
        .from("user_settings")
        .upsert({ user_id: userId, settings: merged }, { onConflict: "user_id" })
        .select("settings, updated_at")
        .single();

      if (error) throw error;

      return json({ ok: true, settings: data.settings, updated_at: data.updated_at });
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("account-dashboard error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
