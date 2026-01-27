// Path: supabase/functions/entity-dashboard/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EntityType = "clinic" | "lab" | "imaging" | "pharmacy";
type Action = "billing" | "analytics";

type ReqBody =
  | { action: "billing"; entityType: EntityType; entityId: string; limit?: number }
  | { action: "analytics"; entityType: EntityType; entityId: string; days?: number };

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

async function authorizeEntityAccess(params: {
  url: string;
  anon: string;
  authHeader: string;
  entityType: EntityType;
  entityId: string;
}): Promise<{ ok: true; userId: string; scope: ScopeRow } | { ok: false; status: number; error: string }> {
  const { url, anon, authHeader, entityType, entityId } = params;

  const supabaseUser = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) return { ok: false, status: 401, error: "Unauthorized" };

  const { data: scopes, error: scopesErr } = await supabaseUser.rpc("get_my_entity_scopes");
  if (scopesErr) return { ok: false, status: 500, error: scopesErr.message || "Failed to load scopes" };

  const list = (scopes || []) as ScopeRow[];
  const scope = list.find((s) => s.entity_type === entityType && String(s.entity_id) === entityId);
  if (!scope) return { ok: false, status: 403, error: "Forbidden" };

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

  const action = (body as any)?.action as Action | undefined;
  const entityType = (body as any)?.entityType as EntityType | undefined;
  const entityId = String((body as any)?.entityId || "");

  if (!action) return json({ ok: false, error: "Missing action" }, 400);
  if (!entityType) return json({ ok: false, error: "Missing entityType" }, 400);
  if (!entityId || !isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);

  const authz = await authorizeEntityAccess({
    url: env.url,
    anon: env.anon,
    authHeader,
    entityType,
    entityId,
  });
  if (!authz.ok) return json({ ok: false, error: authz.error }, authz.status);

  // Service role for DB reads (RLS-bypassing), but only after manual scope checks above.
  const admin = createClient(env.url, env.service, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "entity-dashboard" } },
  });

  try {
    if (action === "billing") {
      if (!authz.scope.is_admin && !hasPermission(authz.scope, "can_manage_billing")) {
        return json({ ok: false, error: "Forbidden" }, 403);
      }

      const limit = Math.max(5, Math.min(200, Number((body as any)?.limit ?? 50) || 50));

      const [{ data: invoices, error: invErr }, { data: txs, error: txErr }] = await Promise.all([
        admin
          .from("billing_invoices")
          .select(
            "id, status, currency, amount_due_cents, amount_paid_cents, amount_remaining_cents, due_at, paid_at, created_at, hosted_invoice_url, invoice_pdf_url, metadata"
          )
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .order("created_at", { ascending: false })
          .limit(limit),
        admin
          .from("billing_transactions")
          .select("id, status, transaction_type, currency, amount_cents, provider, provider_ref, created_at, metadata, invoice_id")
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
        entity: { entity_type: entityType, entity_id: entityId },
        summary: {
          total_paid_cents: totalPaidCents,
          total_refunded_cents: totalRefundedCents,
          outstanding_cents: outstandingCents,
          open_invoice_count: openInvoiceCount,
        },
        invoices: inv,
        transactions: tr,
      });
    }

    if (action === "analytics") {
      const days = Math.max(7, Math.min(365, Number((body as any)?.days ?? 30) || 30));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Clinics: appointments-based analytics
      if (entityType === "clinic") {
        const [{ data: appts, error: apptErr }, { data: payments, error: payErr }] = await Promise.all([
          admin
            .from("appointments")
            .select("id, status, appointment_date, created_at, appointment_type, total_amount")
            .eq("practice_id", entityId)
            .gte("created_at", since),
          admin
            .from("billing_transactions")
            .select("id, status, transaction_type, amount_cents, created_at")
            .eq("entity_type", "clinic")
            .eq("entity_id", entityId)
            .gte("created_at", since),
        ]);

        if (apptErr) throw apptErr;
        if (payErr) throw payErr;

        const a = (appts || []) as any[];
        const p = (payments || []) as any[];

        const totalAppointments = a.length;
        const completedAppointments = a.filter((x) => String(x.status || "").toLowerCase() === "completed").length;
        const canceledAppointments = a.filter((x) => String(x.status || "").toLowerCase() === "cancelled").length;

        const revenueCents = p
          .filter((t) => String(t.status || "").toLowerCase() === "completed" && String(t.transaction_type || "") === "charge")
          .reduce((sum, t) => sum + Number(t.amount_cents || 0), 0);

        const byDay: Record<string, { appointments: number; created: number; revenue_cents: number }> = {};
        for (const x of a) {
          const day = String(x.appointment_date || "").slice(0, 10) || String(x.created_at || "").slice(0, 10);
          if (!day) continue;
          byDay[day] ||= { appointments: 0, created: 0, revenue_cents: 0 };
          byDay[day].appointments += 1;
        }
        for (const t of p) {
          const day = String(t.created_at || "").slice(0, 10);
          if (!day) continue;
          byDay[day] ||= { appointments: 0, created: 0, revenue_cents: 0 };
          if (String(t.status || "").toLowerCase() === "completed" && String(t.transaction_type || "") === "charge") {
            byDay[day].revenue_cents += Number(t.amount_cents || 0);
          }
        }

        const trend = Object.entries(byDay)
          .sort((aa, bb) => aa[0].localeCompare(bb[0]))
          .map(([date, v]) => ({ date, ...v }));

        return json({
          ok: true,
          entity: { entity_type: entityType, entity_id: entityId },
          window_days: days,
          kpis: {
            total_appointments: totalAppointments,
            completed_appointments: completedAppointments,
            cancelled_appointments: canceledAppointments,
            revenue_cents: revenueCents,
          },
          trend,
        });
      }

      // Facilities: referrals-based analytics (lab/imaging/pharmacy)
      const { data: refs, error: refErr } = await admin
        .from("referrals")
        .select("id, status, created_at")
        .eq("receiver_entity_type", entityType)
        .eq("receiver_entity_id", entityId)
        .gte("created_at", since);

      if (refErr) throw refErr;

      const r = (refs || []) as any[];
      const totalReferrals = r.length;
      const completedReferrals = r.filter((x) => String(x.status || "").toLowerCase() === "completed").length;
      const pendingReferrals = r.filter((x) => {
        const s = String(x.status || "").toLowerCase();
        return s === "pending" || s === "assigned" || s === "in_progress";
      }).length;

      const byDay: Record<string, { referrals: number }> = {};
      for (const x of r) {
        const day = String(x.created_at || "").slice(0, 10);
        if (!day) continue;
        byDay[day] ||= { referrals: 0 };
        byDay[day].referrals += 1;
      }
      const trend = Object.entries(byDay)
        .sort((aa, bb) => aa[0].localeCompare(bb[0]))
        .map(([date, v]) => ({ date, ...v }));

      return json({
        ok: true,
        entity: { entity_type: entityType, entity_id: entityId },
        window_days: days,
        kpis: {
          total_referrals: totalReferrals,
          completed_referrals: completedReferrals,
          pending_referrals: pendingReferrals,
        },
        trend,
      });
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("entity-dashboard error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
