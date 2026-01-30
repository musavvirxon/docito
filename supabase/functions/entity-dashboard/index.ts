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

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function dateKeyUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

      const limit = clampInt((body as any)?.limit, 5, 200, 50);

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
      const days = clampInt((body as any)?.days, 7, 365, 30);
      const msDay = 24 * 60 * 60 * 1000;

      const end = new Date();
      const start = new Date(end.getTime() - days * msDay);
      const prevEnd = start;
      const prevStart = new Date(prevEnd.getTime() - days * msDay);

      // Clinics: appointments-based analytics (compatible with existing clinic analytics UI)
      if (entityType === "clinic") {
        const [{ data: appts, error: apptErr }, { data: prevAppts, error: prevApptErr }] = await Promise.all([
          admin
            .from("appointments")
            .select("id, status, created_at, patient_id")
            .eq("practice_id", entityId)
            .gte("created_at", start.toISOString())
            .lt("created_at", end.toISOString())
            .limit(20000),
          admin
            .from("appointments")
            .select("id, status, created_at, patient_id")
            .eq("practice_id", entityId)
            .gte("created_at", prevStart.toISOString())
            .lt("created_at", prevEnd.toISOString())
            .limit(20000),
        ]);

        if (apptErr) throw apptErr;
        if (prevApptErr) throw prevApptErr;

        const [{ data: txs, error: txErr }, { data: prevTxs, error: prevTxErr }] = await Promise.all([
          admin
            .from("billing_transactions")
            .select("amount_cents, currency, status, created_at, transaction_type")
            .eq("entity_type", "clinic")
            .eq("entity_id", entityId)
            .gte("created_at", start.toISOString())
            .lt("created_at", end.toISOString())
            .limit(20000),
          admin
            .from("billing_transactions")
            .select("amount_cents, currency, status, created_at, transaction_type")
            .eq("entity_type", "clinic")
            .eq("entity_id", entityId)
            .gte("created_at", prevStart.toISOString())
            .lt("created_at", prevEnd.toISOString())
            .limit(20000),
        ]);

        if (txErr) throw txErr;
        if (prevTxErr) throw prevTxErr;

        const a = (appts || []) as any[];
        const pa = (prevAppts || []) as any[];
        const t = (txs || []) as any[];
        const pt = (prevTxs || []) as any[];

        const totalAppointments = a.length;
        const completedAppointments = a.filter((x) => String(x.status || "").toLowerCase() === "completed").length;
        const cancelledAppointments = a.filter((x) => {
          const s = String(x.status || "").toLowerCase();
          return s === "canceled" || s === "cancelled";
        }).length;
        const uniquePatients = new Set(a.map((x) => x.patient_id).filter(Boolean)).size;

        const prevTotalAppointments = pa.length;
        const prevUniquePatients = new Set(pa.map((x) => x.patient_id).filter(Boolean)).size;

        const currency = String(t.find((x) => x.currency)?.currency || "usd");

        const revenueCents = t.reduce((sum, x) => {
          const status = String(x.status || "").toLowerCase();
          if (status !== "completed") return sum;
          const typ = String(x.transaction_type || "charge").toLowerCase();
          const amt = Number(x.amount_cents || 0);
          if (typ === "refund") return sum - Math.abs(amt);
          return sum + amt;
        }, 0);

        const prevRevenueCents = pt.reduce((sum, x) => {
          const status = String(x.status || "").toLowerCase();
          if (status !== "completed") return sum;
          const typ = String(x.transaction_type || "charge").toLowerCase();
          const amt = Number(x.amount_cents || 0);
          if (typ === "refund") return sum - Math.abs(amt);
          return sum + amt;
        }, 0);

        const revenueChangePct = prevRevenueCents !== 0
          ? ((revenueCents - prevRevenueCents) / Math.abs(prevRevenueCents)) * 100
          : 0;
        const appointmentsChangePct = prevTotalAppointments !== 0
          ? ((totalAppointments - prevTotalAppointments) / Math.abs(prevTotalAppointments)) * 100
          : 0;
        const patientsChangePct = prevUniquePatients !== 0
          ? ((uniquePatients - prevUniquePatients) / Math.abs(prevUniquePatients)) * 100
          : 0;

        const completionRatePct = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;

        const dayMap: Record<string, { date: string; appointments: number; completed: number; revenue_cents: number }> = {};
        for (let i = 0; i < days; i++) {
          const d = startOfDayUTC(new Date(end.getTime() - (days - 1 - i) * msDay));
          const key = dateKeyUTC(d);
          dayMap[key] = { date: key, appointments: 0, completed: 0, revenue_cents: 0 };
        }

        for (const x of a) {
          const createdAt = new Date(String(x.created_at || ""));
          if (Number.isNaN(createdAt.getTime())) continue;
          const key = dateKeyUTC(startOfDayUTC(createdAt));
          if (!dayMap[key]) continue;
          dayMap[key].appointments += 1;
          if (String(x.status || "").toLowerCase() === "completed") dayMap[key].completed += 1;
        }

        for (const x of t) {
          const status = String(x.status || "").toLowerCase();
          if (status !== "completed") continue;
          const createdAt = new Date(String(x.created_at || ""));
          if (Number.isNaN(createdAt.getTime())) continue;
          const key = dateKeyUTC(startOfDayUTC(createdAt));
          if (!dayMap[key]) continue;
          const typ = String(x.transaction_type || "charge").toLowerCase();
          const amt = Number(x.amount_cents || 0);
          if (typ === "refund") dayMap[key].revenue_cents -= Math.abs(amt);
          else dayMap[key].revenue_cents += amt;
        }

        const trend = Object.values(dayMap).sort((aa, bb) => aa.date.localeCompare(bb.date));

        return json({
          ok: true,
          entity: { entity_type: entityType, entity_id: entityId },
          window_days: days,
          currency,
          kpis: {
            total_appointments: totalAppointments,
            completed_appointments: completedAppointments,
            cancelled_appointments: cancelledAppointments,
            unique_patients: uniquePatients,
            revenue_cents: revenueCents,
            completion_rate_pct: completionRatePct,
            revenue_change_pct: Math.round(revenueChangePct * 10) / 10,
            appointments_change_pct: Math.round(appointmentsChangePct * 10) / 10,
            patients_change_pct: Math.round(patientsChangePct * 10) / 10,
          },
          trend,
        });
      }

      // Facilities: referrals-based analytics (lab/imaging/pharmacy)
      const since = start.toISOString();
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
