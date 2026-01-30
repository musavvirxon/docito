// Path: supabase/functions/facility-billing/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = {
  facilityId: string;
  facilityType: "lab" | "imaging" | "pharmacy" | "facility";
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

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type ScopeRow = {
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  entity_status: string | null;
  scope_role: string | null;
  is_admin: boolean | null;
  permissions: Record<string, any> | null;
};

function hasPermission(scope: ScopeRow, key: string): boolean {
  const perms = scope.permissions || {};
  const v = perms[key];
  return v === true;
}

async function authorizeFacilityAccess(params: {
  url: string;
  anon: string;
  authHeader: string;
  facilityType: string;
  facilityId: string;
}): Promise<{ ok: true; userId: string; scope: ScopeRow } | { ok: false; status: number; error: string }> {
  const { url, anon, authHeader, facilityType, facilityId } = params;

  const supabaseUser = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) return { ok: false, status: 401, error: "Unauthorized" };

  const { data: scopes, error: scopesErr } = await supabaseUser.rpc("get_my_entity_scopes");
  if (scopesErr) return { ok: false, status: 500, error: scopesErr.message || "Failed to load scopes" };

  const list = (scopes || []) as ScopeRow[];
  const scope = list.find((s) => s.entity_type === facilityType && String(s.entity_id) === facilityId);
  if (!scope) return { ok: false, status: 403, error: "Forbidden" };

  // billing permission
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

  const facilityId = String(body.facilityId || "");
  const facilityType = String(body.facilityType || "");

  if (!facilityId || !isUuid(facilityId)) return json({ ok: false, error: "Invalid facilityId" }, 400);
  if (!facilityType) return json({ ok: false, error: "Invalid facilityType" }, 400);

  const authz = await authorizeFacilityAccess({
    url: env.url,
    anon: env.anon,
    authHeader,
    facilityType,
    facilityId,
  });
  if (!authz.ok) return json({ ok: false, error: authz.error }, authz.status);

  const admin = createClient(env.url, env.service, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "facility-billing" } },
  });

  try {
    const limit = Math.max(5, Math.min(200, Number(body.limit ?? 50) || 50));

    const [{ data: invoices, error: invErr }, { data: txs, error: txErr }] = await Promise.all([
      admin
        .from("billing_invoices")
        .select(
          "id, status, currency, amount_due_cents, amount_paid_cents, amount_remaining_cents, due_at, paid_at, created_at, hosted_invoice_url, invoice_pdf_url, metadata",
        )
        .eq("entity_type", facilityType)
        .eq("entity_id", facilityId)
        .order("created_at", { ascending: false })
        .limit(limit),
      admin
        .from("billing_transactions")
        .select(
          "id, status, transaction_type, currency, amount_cents, provider, provider_ref, created_at, metadata, invoice_id",
        )
        .eq("entity_type", facilityType)
        .eq("entity_id", facilityId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    if (invErr) throw invErr;
    if (txErr) throw txErr;

    const inv = (invoices || []) as any[];
    const tr = (txs || []) as any[];

    const totalPaidCents = tr
      .filter(
        (t) =>
          String(t.status || "").toLowerCase() === "completed" &&
          String(t.transaction_type || "") === "charge",
      )
      .reduce((sum, t) => sum + Number(t.amount_cents || 0), 0);

    const totalRefundedCents = tr
      .filter(
        (t) =>
          String(t.status || "").toLowerCase() === "completed" &&
          String(t.transaction_type || "") === "refund",
      )
      .reduce((sum, t) => sum + Number(t.amount_cents || 0), 0);

    const outstandingCents = inv
      .filter((i) => {
        const s = String(i.status || "").toLowerCase();
        return s !== "paid" && s !== "void" && s !== "uncollectible";
      })
      .reduce((sum, i) => sum + Number(i.amount_remaining_cents || 0), 0);

    const openInvoiceCount = inv.filter((i) => String(i.status || "").toLowerCase() === "open").length;

    return json({
      ok: true,
      facility: { facility_type: facilityType, facility_id: facilityId },
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
