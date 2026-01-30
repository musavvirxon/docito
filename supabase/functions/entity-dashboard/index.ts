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

type ScopeRow = {
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  entity_status: string | null;
  scope_role: string | null;
  is_admin: boolean | null;
  permissions: Record<string, unknown> | null;
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

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function hasPermission(scope: ScopeRow, key: string): boolean {
  const perms = (scope.permissions || {}) as Record<string, unknown>;
  return perms[key] === true;
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
    auth: { persistSession: false },
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

function norm(s: unknown) {
  return String(s || "").trim().toLowerCase();
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isoDay(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pctChange(curr: number, prev: number) {
  const c = Number(curr || 0);
  const p = Number(prev || 0);
  if (p === 0) return c === 0 ? 0 : 100;
  return Math.round(((c - p) / p) * 1000) / 10;
}

function isCompletedAppt(status: unknown) {
  const s = norm(status);
  return s === "completed" || s === "complete" || s === "done";
}

function isCanceledAppt(status: unknown) {
  const s = norm(status);
  return s === "cancelled" || s === "canceled" || s === "rejected" || s === "declined" || s === "no_show";
}

function isChargeTx(t: any) {
  const st = norm(t?.status);
  const tt = norm(t?.transaction_type);
  return (st === "completed" || st === "succeeded") && (tt === "charge" || tt === "payment" || tt === "capture");
}

function isRefundTx(t: any) {
  const st = norm(t?.status);
  const tt = norm(t?.transaction_type);
  return (st === "completed" || st === "succeeded" || st === "refunded") && tt === "refund";
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
  const entityId = String((body as any)?.entityId || "").trim();

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

      const totalPaidCents = tr.filter(isChargeTx).reduce((sum, t) => sum + Number(t.amount_cents || 0), 0);
      const totalRefundedCents = tr.filter(isRefundTx).reduce((sum, t) => sum + Number(t.amount_cents || 0), 0);

      const outstandingCents = inv
        .filter((i) => {
          const s = norm(i.status);
          return s !== "paid" && s !== "void" && s !== "uncollectible";
        })
        .reduce((sum, i) => sum + Number(i.amount_remaining_cents || 0), 0);

      const openInvoiceCount = inv.filter((i) => norm(i.status) === "open").length;

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
      const allowed = Boolean(authz.scope.is_admin) || hasPermission(authz.scope, "can_view_analytics") || hasPermission(authz.scope, "can_manage_billing");
      if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

      const days = clampInt((body as any)?.days, 7, 365, 30);

      const now = new Date();
      const endDay = startOfUtcDay(now); // inclusive end of window at start-of-today
      const currentStart = new Date(endDay);
      currentStart.setUTCDate(currentStart.getUTCDate() - (days - 1));
      const prevStart = new Date(currentStart);
      prevStart.setUTCDate(prevStart.getUTCDate() - days);

      const totalEndExclusive = new Date(endDay);
      totalEndExclusive.setUTCDate(totalEndExclusive.getUTCDate() + 1);

      // Clinics analytics only (per product requirement)
      if (entityType === "clinic") {
        const [{ data: appts, error: apptErr }, { data: payments, error: payErr }] = await Promise.all([
          admin
            .from("appointments")
            .select("id, status, appointment_date, created_at, patient_id")
            .eq("practice_id", entityId)
            .gte("created_at", prevStart.toISOString())
            .lt("created_at", totalEndExclusive.toISOString())
            .order("created_at", { ascending: true })
            .limit(20000),
          admin
            .from("billing_transactions")
            .select("id, status, transaction_type, amount_cents, currency, created_at")
            .eq("entity_type", "clinic")
            .eq("entity_id", entityId)
            .gte("created_at", prevStart.toISOString())
            .lt("created_at", totalEndExclusive.toISOString())
            .order("created_at", { ascending: true })
            .limit(20000),
        ]);

        if (apptErr) throw apptErr;
        if (payErr) throw payErr;

        const a = (appts || []) as any[];
        const p = (payments || []) as any[];

        const curAppts = a.filter((x) => {
          const t = x.created_at ? new Date(x.created_at).getTime() : 0;
          return t >= currentStart.getTime();
        });
        const prevAppts = a.filter((x) => {
          const t = x.created_at ? new Date(x.created_at).getTime() : 0;
          return t >= prevStart.getTime() && t < currentStart.getTime();
        });

        const curTx = p.filter((x) => {
          const t = x.created_at ? new Date(x.created_at).getTime() : 0;
          return t >= currentStart.getTime();
        });
        const prevTx = p.filter((x) => {
          const t = x.created_at ? new Date(x.created_at).getTime() : 0;
          return t >= prevStart.getTime() && t < currentStart.getTime();
        });

        const sumNetCents = (rows: any[]) => {
          const charges = rows.filter(isChargeTx).reduce((sum, t) => sum + Number(t.amount_cents || 0), 0);
          const refunds = rows.filter(isRefundTx).reduce((sum, t) => sum + Number(t.amount_cents || 0), 0);
          return charges - refunds;
        };

        const curRevenueCents = sumNetCents(curTx);
        const prevRevenueCents = sumNetCents(prevTx);

        const curTotalAppointments = curAppts.length;
        const prevTotalAppointments = prevAppts.length;

        const curCompletedAppointments = curAppts.filter((x) => isCompletedAppt(x.status)).length;
        const prevCompletedAppointments = prevAppts.filter((x) => isCompletedAppt(x.status)).length;

        const curCanceledAppointments = curAppts.filter((x) => isCanceledAppt(x.status)).length;
        const prevCanceledAppointments = prevAppts.filter((x) => isCanceledAppt(x.status)).length;

        const curUniquePatients = new Set(
          curAppts
            .map((x) => String(x.patient_id || "").trim())
            .filter((id) => !!id && isUuid(id)),
        ).size;

        const prevUniquePatients = new Set(
          prevAppts
            .map((x) => String(x.patient_id || "").trim())
            .filter((id) => !!id && isUuid(id)),
        ).size;

        const completionRatePct =
          curTotalAppointments > 0 ? Math.round((curCompletedAppointments / curTotalAppointments) * 100) : 0;

        const currency =
          String(
            (curTx.find((t) => String(t.currency || "").trim())?.currency ||
              prevTx.find((t) => String(t.currency || "").trim())?.currency ||
              "usd") as string,
          ).toLowerCase() || "usd";

        // Prefill current window days for stable chart
        const byDay: Record<string, { appointments: number; completed: number; revenue_cents: number }> = {};
        for (let i = 0; i < days; i++) {
          const d = new Date(currentStart);
          d.setUTCDate(d.getUTCDate() + i);
          byDay[isoDay(d)] = { appointments: 0, completed: 0, revenue_cents: 0 };
        }

        for (const x of curAppts) {
          const day =
            String(x.appointment_date || "").slice(0, 10) ||
            String(x.created_at || "").slice(0, 10) ||
            "";
          if (!day || !(day in byDay)) continue;
          byDay[day].appointments += 1;
          if (isCompletedAppt(x.status)) byDay[day].completed += 1;
        }

        for (const t of curTx) {
          const day = String(t.created_at || "").slice(0, 10) || "";
          if (!day || !(day in byDay)) continue;
          if (isChargeTx(t)) byDay[day].revenue_cents += Number(t.amount_cents || 0);
          if (isRefundTx(t)) byDay[day].revenue_cents -= Number(t.amount_cents || 0);
        }

        const trend = Object.entries(byDay)
          .sort((aa, bb) => aa[0].localeCompare(bb[0]))
          .map(([date, v]) => ({ date, ...v }));

        return json({
          ok: true,
          currency,
          entity: { entity_type: entityType, entity_id: entityId },
          window_days: days,
          kpis: {
            totalRevenueCents: curRevenueCents,
            totalAppointments: curTotalAppointments,
            completedAppointments: curCompletedAppointments,
            canceledAppointments: curCanceledAppointments,
            uniquePatients: curUniquePatients,
            revenueChangePct: pctChange(curRevenueCents, prevRevenueCents),
            appointmentsChangePct: pctChange(curTotalAppointments, prevTotalAppointments),
            patientsChangePct: pctChange(curUniquePatients, prevUniquePatients),
            completionRatePct,
            // extra (still numeric, safe for EntitySettingsPage generic renderer)
            prevRevenueCents,
            prevTotalAppointments,
            prevCompletedAppointments,
            prevCanceledAppointments,
          },
          trend,
        });
      }

      // Non-clinic analytics (kept for backwards compatibility)
      const { data: refs, error: refErr } = await admin
        .from("referrals")
        .select("id, status, created_at")
        .eq("receiver_entity_type", entityType)
        .eq("receiver_entity_id", entityId)
        .gte("created_at", prevStart.toISOString())
        .lt("created_at", totalEndExclusive.toISOString())
        .limit(20000);

      if (refErr) throw refErr;

      const r = (refs || []) as any[];
      const curRefs = r.filter((x) => {
        const t = x.created_at ? new Date(x.created_at).getTime() : 0;
        return t >= currentStart.getTime();
      });

      const totalReferrals = curRefs.length;
      const completedReferrals = curRefs.filter((x) => norm(x.status) === "completed").length;
      const pendingReferrals = curRefs.filter((x) => {
        const s = norm(x.status);
        return s === "pending" || s === "assigned" || s === "in_progress";
      }).length;

      const byDay: Record<string, { referrals: number }> = {};
      for (let i = 0; i < days; i++) {
        const d = new Date(currentStart);
        d.setUTCDate(d.getUTCDate() + i);
        byDay[isoDay(d)] = { referrals: 0 };
      }
      for (const x of curRefs) {
        const day = String(x.created_at || "").slice(0, 10) || "";
        if (!day || !(day in byDay)) continue;
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
