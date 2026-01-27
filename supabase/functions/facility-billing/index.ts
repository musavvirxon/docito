// Path: supabase/functions/facility-billing/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EntityType = "lab" | "imaging" | "pharmacy";

type ScopeRow = {
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  entity_status: string | null;
  scope_role: string | null;
  is_admin: boolean | null;
  permissions: Record<string, any> | null;
};

type ReqBody = {
  entityType: EntityType;
  entityId: string;
  limit?: number;
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
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return {
      ok: false as const,
      error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
    };
  }
  return { ok: true as const, url, anon, service };
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function hasPermission(scope: ScopeRow, key: string): boolean {
  const perms = scope.permissions || {};
  return perms[key] === true;
}

async function authorizeFacilityBillingAccess(params: {
  url: string;
  anon: string;
  authHeader: string;
  entityType: EntityType;
  entityId: string;
}): Promise<{ ok: true; userId: string; scope: ScopeRow } | { ok: false; status: number; error: string }> {
  const { url, anon, authHeader, entityType, entityId } = params;

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return { ok: false, status: 401, error: "Unauthorized" };

  const { data: scopes, error: scopesErr } = await userClient.rpc("get_my_entity_scopes");
  if (scopesErr) return { ok: false, status: 500, error: scopesErr.message || "Failed to load scopes" };

  const list = (scopes || []) as ScopeRow[];
  const scope = list.find((s) => s.entity_type === entityType && String(s.entity_id) === entityId);
  if (!scope) return { ok: false, status: 403, error: "Forbidden" };

  if (!scope.is_admin && !hasPermission(scope, "can_manage_billing")) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, userId: userRes.user.id, scope };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const entityType = (body?.entityType || "") as EntityType;
  const entityId = String(body?.entityId || "").trim();
  if (!entityType || !["lab", "imaging", "pharmacy"].includes(entityType)) {
    return json({ ok: false, error: "Invalid entityType" }, 400);
  }
  if (!entityId || !isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);

  const limit = clampInt(body?.limit, 1, 200, 50);

  const authz = await authorizeFacilityBillingAccess({
    url: env.url,
    anon: env.anon,
    authHeader,
    entityType,
    entityId,
  });
  if (!authz.ok) return json({ ok: false, error: authz.error }, authz.status);

  const admin = createClient(env.url, env.service, {
    auth: { persistSession: false },
    global: { "X-Client-Info": "facility-billing" } as any,
  });

  try {
    const [{ data: invoices, error: invErr }, { data: txs, error: txErr }] = await Promise.all([
      admin
        .from("billing_invoices")
        .select(
          "id, status, currency, amount_due_cents, amount_paid_cents, amount_remaining_cents, due_at, paid_at, created_at, hosted_invoice_url, invoice_pdf_url, metadata",
        )
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(limit),
      admin
        .from("billing_transactions")
        .select(
          "id, status, transaction_type, currency, amount_cents, provider, provider_ref, created_at, metadata, invoice_id",
        )
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    if (invErr) throw invErr;
    if (txErr) throw txErr;

    const inv = (invoices || []) as any[];
    const tr = (txs || []) as any[];

    const totalPaidCents = tr
      .filter((t) => String(t.status || "").toLowerCase() === "completed" && String(t.transaction_type || "") === "charge")
      .reduce((sum, t) => sum + Number(t.amount_cents || 0), 0);

    const totalRefundedCents = tr
      .filter((t) => String(t.status || "").toLowerCase() === "completed" && String(t.transaction_type || "") === "refund")
      .reduce((sum, t) => sum + Math.abs(Number(t.amount_cents || 0)), 0);

    const outstandingCents = inv
      .filter((i) => {
        const s = String(i.status || "").toLowerCase();
        return s !== "paid" && s !== "void" && s !== "uncollectible";
      })
      .reduce((sum, i) => sum + Number(i.amount_remaining_cents || 0), 0);

    const openInvoiceCount = inv.filter((i) => String(i.status || "").toLowerCase() === "open").length;
    const currency = inv.find((i) => i.currency)?.currency || tr.find((t) => t.currency)?.currency || "usd";

    return json({
      ok: true,
      entity: { entity_type: entityType, entity_id: entityId },
      currency,
      summary: {
        total_paid_cents: totalPaidCents,
        total_refunded_cents: totalRefundedCents,
        outstanding_cents: outstandingCents,
        open_invoice_count: openInvoiceCount,
      },
      invoices: inv,
      transactions: tr,
    });
  } catch (e: any) {
    console.error("facility-billing error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
