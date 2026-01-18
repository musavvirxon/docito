// File: supabase/functions/clinic-billing/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = {
  clinicId: string;
  limit?: number;
};

type BillingTx = {
  id: string;
  created_at: string;
  amount_cents: number;
  currency: string;
  status: string;
  transaction_type: string;
  invoice_id: string | null;
  provider: string;
  provider_ref: string | null;
  metadata: Record<string, unknown>;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function requireEnv() {
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

async function assertClinicAccess(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  clinicId: string,
) {
  // Primary: clinic admin
  const { data: practice, error: pErr } = await serviceClient
    .from("practices")
    .select("id, admin_id")
    .eq("id", clinicId)
    .maybeSingle();

  if (pErr) throw pErr;
  if (practice?.admin_id === userId) return true;

  // Staff membership
  const { data: staff, error: sErr } = await serviceClient
    .from("practice_staff")
    .select("id, status")
    .eq("practice_id", clinicId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sErr) throw sErr;
  if (staff?.id && String(staff.status || "active") === "active") return true;

  // Super admin fallback
  const { data: role, error: rErr } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();

  if (rErr) return false;
  return Boolean(role?.role);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  // Validate user via anon client
  const authed = createClient(env.url, env.anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const clinicId = String(body?.clinicId || "").trim();
  if (!clinicId) return json({ ok: false, error: "Missing clinicId" }, 400);

  const limit = clampInt(body?.limit, 1, 200, 50);

  const service = createClient(env.url, env.service);

  try {
    const allowed = await assertClinicAccess(service, userRes.user.id, clinicId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    const { data: txs, error: txErr } = await service
      .from("billing_transactions")
      .select(
        "id, created_at, amount_cents, currency, status, transaction_type, invoice_id, provider, provider_ref, metadata",
      )
      .eq("entity_type", "clinic")
      .eq("entity_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (txErr) throw txErr;

    const rows = (txs || []) as BillingTx[];

    const summary = rows.reduce(
      (acc, t) => {
        acc.count += 1;
        if (String(t.status || "").toLowerCase() === "completed") {
          acc.completedCount += 1;
          acc.totalCompletedCents += Number(t.amount_cents || 0);
        }
        if (String(t.transaction_type || "").toLowerCase() === "refund") {
          acc.refundCount += 1;
          acc.totalRefundedCents += Math.abs(Number(t.amount_cents || 0));
        }
        return acc;
      },
      {
        count: 0,
        completedCount: 0,
        refundCount: 0,
        totalCompletedCents: 0,
        totalRefundedCents: 0,
      },
    );

    const currency = rows.find((r) => r.currency)?.currency || "usd";

    return json({
      ok: true,
      currency,
      summary,
      transactions: rows,
    });
  } catch (e: any) {
    console.error("clinic-billing error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
