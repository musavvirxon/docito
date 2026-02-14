import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TimeRange = "7d" | "30d" | "90d";

type ReqBody =
  | {
      action: "billing";
      practiceId: string;
      timeRange?: TimeRange;
      limit?: number;
    }
  | {
      action: "analytics";
      practiceId: string;
      timeRange?: TimeRange;
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
  metadata: Record<string, unknown> | null;
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

function daysFromRange(r?: string): number {
  if (r === "90d") return 90;
  if (r === "30d") return 30;
  return 7;
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

async function assertPracticeAccess(serviceClient: any, userId: string, practiceId: string) {
  // Owner/admin
  const { data: practice, error: pErr } = await serviceClient
    .from("practices")
    .select("id, admin_id")
    .eq("id", practiceId)
    .maybeSingle();
  if (pErr) throw pErr;
  if ((practice as any)?.admin_id === userId) return true;

  // Current staff relationship
  const { data: clinicStaff, error: csErr } = await serviceClient
    .from("clinic_staff")
    .select("id, status")
    .eq("practice_id", practiceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (csErr) {
    // clinic_staff might not exist in some projects; ignore and continue
  } else if ((clinicStaff as any)?.id && String((clinicStaff as any).status || "active") === "active") {
    return true;
  }

  // Legacy staff relationship
  const { data: staff, error: sErr } = await serviceClient
    .from("practice_staff")
    .select("id, status")
    .eq("practice_id", practiceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (sErr) {
    // practice_staff might not exist; ignore and continue
  } else if ((staff as any)?.id && String((staff as any).status || "active") === "active") {
    return true;
  }

  // Super admin
  const { data: role, error: rErr } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (rErr) return false;
  return Boolean((role as any)?.role);
}

function computeRevenueCents(rows: Array<{ amount: any; status: any; transaction_type: any }>) {
  return rows.reduce((sum, t) => {
    const status = String(t.status || "").toLowerCase();
    if (status !== "completed" && status !== "paid") return sum;
    const type = String(t.transaction_type || "charge").toLowerCase();
    const amt = Math.round(Number(t.amount || 0) * 100);
    if (type === "refund") return sum - Math.abs(amt);
    return sum + amt;
  }, 0);
}

function computePendingCents(rows: Array<{ amount: any; status: any; transaction_type: any }>) {
  return rows.reduce((sum, t) => {
    const status = String(t.status || "").toLowerCase();
    if (status !== "pending") return sum;
    const type = String(t.transaction_type || "charge").toLowerCase();
    if (type === "refund") return sum;
    return sum + Math.round(Number(t.amount || 0) * 100);
  }, 0);
}

function pctChange(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
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

  const practiceId = String((body as any)?.practiceId || "").trim();
  if (!practiceId) return json({ ok: false, error: "Missing practiceId" }, 400);

  const action = (body as any)?.action;
  if (action !== "billing" && action !== "analytics") return json({ ok: false, error: "Invalid action" }, 400);

  const service = createClient(env.url, env.service);

  try {
    const allowed = await assertPracticeAccess(service, userRes.user.id, practiceId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    if (action === "billing") {
      const limit = clampInt((body as any)?.limit, 1, 200, 10);
      const days = daysFromRange((body as any)?.timeRange);

      const now = new Date();
      const end = now;
      const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

      const { data: txs, error: txErr } = await service
        .from("billing_transactions")
        .select(
          "id, created_at, amount, currency, status, transaction_type, description, provider_transaction_id, provider_data",
        )
        .eq("practice_id", practiceId)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .order("created_at", { ascending: false })
        .limit(20000);
      if (txErr) throw txErr;

      const txRows = (txs || []) as any[];
      const currency = txRows.find((t: any) => t.currency)?.currency || "usd";

      // Most useful summary: within selected period.
      const totalRevenueCents = computeRevenueCents(txRows);
      const pendingCents = computePendingCents(txRows);
      const refundCents = txRows.reduce((sum: number, t: any) => {
        const status = String(t.status || "").toLowerCase();
        if (status !== "completed" && status !== "paid") return sum;
        const type = String(t.transaction_type || "").toLowerCase();
        if (type !== "refund") return sum;
        return sum + Math.abs(Math.round(Number(t.amount || 0) * 100));
      }, 0);

      const recent = txRows.slice(0, limit);

      return json({
        ok: true,
        currency,
        period: { start: start.toISOString(), end: end.toISOString(), days },
        summary: {
          totalRevenueCents,
          pendingCents,
          refundCents,
          transactionCount: txRows.length,
          completedCount: txRows.filter((t) => ["completed", "paid"].includes(String(t.status || "").toLowerCase())).length,
          pendingCount: txRows.filter((t) => String(t.status || "").toLowerCase() === "pending").length,
        },
        transactions: recent,
      });
    }

    // analytics
    const days = daysFromRange((body as any)?.timeRange);
    const now = new Date();
    const end = now;
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    const prevEnd = start;
    const prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);

    const [{ data: appts, error: aErr }, { data: prevAppts, error: paErr }] = await Promise.all([
      service
        .from("appointments")
        .select("id, appointment_date, status, patient_id")
        .eq("practice_id", practiceId)
        .gte("appointment_date", start.toISOString().slice(0, 10))
        .lte("appointment_date", end.toISOString().slice(0, 10))
        .limit(20000),
      service
        .from("appointments")
        .select("id, appointment_date, status, patient_id")
        .eq("practice_id", practiceId)
        .gte("appointment_date", prevStart.toISOString().slice(0, 10))
        .lte("appointment_date", prevEnd.toISOString().slice(0, 10))
        .limit(20000),
    ]);
    if (aErr) throw aErr;
    if (paErr) throw paErr;

    const aptRows = (appts || []) as any[];
    const prevAptRows = (prevAppts || []) as any[];

    const totalAppointments = aptRows.length;
    const completedAppointments = aptRows.filter((a) => String(a.status || "") === "completed").length;
    const canceledAppointments = aptRows.filter((a) => String(a.status || "") === "canceled").length;
    const noShowAppointments = aptRows.filter((a) => String(a.status || "") === "no_show").length;
    const uniquePatients = new Set(aptRows.map((a) => a.patient_id).filter(Boolean)).size;

    const prevTotalAppointments = prevAptRows.length;
    const prevUniquePatients = new Set(prevAptRows.map((a) => a.patient_id).filter(Boolean)).size;
    const prevCompletedAppointments = prevAptRows.filter((a) => String(a.status || "") === "completed").length;

    const [{ data: txs, error: tErr }, { data: prevTxs, error: ptErr }] = await Promise.all([
      service
        .from("billing_transactions")
        .select("amount, currency, status, created_at, transaction_type")
        .eq("practice_id", practiceId)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .limit(20000),
      service
        .from("billing_transactions")
        .select("amount, currency, status, created_at, transaction_type")
        .eq("practice_id", practiceId)
        .gte("created_at", prevStart.toISOString())
        .lt("created_at", prevEnd.toISOString())
        .limit(20000),
    ]);
    if (tErr) throw tErr;
    if (ptErr) throw ptErr;

    const txRows = (txs || []) as any[];
    const prevTxRows = (prevTxs || []) as any[];

    const currency = (txRows.find((t) => t.currency)?.currency || "usd") as string;
    const totalRevenueCents = computeRevenueCents(txRows);
    const prevRevenueCents = computeRevenueCents(prevTxRows);

    // Patient retention (180d lookback): % of patients with >=2 completed visits
    const start180 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const { data: completed180, error: c180Err } = await service
      .from("appointments")
      .select("patient_id")
      .eq("practice_id", practiceId)
      .eq("status", "completed")
      .gte("appointment_date", start180.toISOString().slice(0, 10))
      .limit(20000);
    if (c180Err) throw c180Err;
    const visitCounts = new Map<string, number>();
    (completed180 || []).forEach((r: any) => {
      if (!r.patient_id) return;
      visitCounts.set(r.patient_id, (visitCounts.get(r.patient_id) || 0) + 1);
    });
    const totalCompletedPatients = visitCounts.size;
    const retainedPatients = Array.from(visitCounts.values()).filter((n) => n >= 2).length;
    const patientRetentionPct =
      totalCompletedPatients > 0 ? Math.round((retainedPatients / totalCompletedPatients) * 100) : 0;

    const noShowRatePct =
      totalAppointments > 0 ? Math.round(((noShowAppointments + canceledAppointments) / totalAppointments) * 100) : 0;

    // Day trend for bookings (appointment_date) + revenue (created_at)
    const dayMap: Record<
      string,
      {
        date: string;
        bookings: number;
        completed: number;
        revenue_cents: number;
      }
    > = {};

    for (let i = 0; i < days; i++) {
      const d = startOfDayUTC(new Date(end.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000));
      const key = dateKeyUTC(d);
      dayMap[key] = { date: key, bookings: 0, completed: 0, revenue_cents: 0 };
    }

    for (const a of aptRows) {
      const key = String(a.appointment_date || "");
      if (!dayMap[key]) continue;
      dayMap[key].bookings += 1;
      if (String(a.status || "") === "completed") dayMap[key].completed += 1;
    }

    for (const t of txRows) {
      const status = String(t.status || "").toLowerCase();
      if (status !== "completed" && status !== "paid") continue;
      const created = new Date(t.created_at);
      const key = dateKeyUTC(startOfDayUTC(created));
      if (!dayMap[key]) continue;
      const type = String(t.transaction_type || "charge").toLowerCase();
      const amt = Math.round(Number(t.amount || 0) * 100);
      if (type === "refund") dayMap[key].revenue_cents -= Math.abs(amt);
      else dayMap[key].revenue_cents += amt;
    }

    const dailyTrend = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    // Practice rating (if present)
    const { data: pRow } = await service
      .from("practices")
      .select("average_rating")
      .eq("id", practiceId)
      .maybeSingle();
    const averageRating = Number((pRow as any)?.average_rating || 0);

    return json({
      ok: true,
      currency,
      period: { start: start.toISOString(), end: end.toISOString(), days },
      kpis: {
        totalRevenueCents,
        totalAppointments,
        completedAppointments,
        canceledAppointments,
        noShowAppointments,
        uniquePatients,
        averageRating,
        patientRetentionPct,
        noShowRatePct,
        revenueChangePct: Math.round(pctChange(totalRevenueCents, prevRevenueCents) * 10) / 10,
        appointmentsChangePct: Math.round(pctChange(totalAppointments, prevTotalAppointments) * 10) / 10,
        patientsChangePct: Math.round(pctChange(uniquePatients, prevUniquePatients) * 10) / 10,
        completionRatePct: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0,
        prev: {
          totalRevenueCents: prevRevenueCents,
          totalAppointments: prevTotalAppointments,
          completedAppointments: prevCompletedAppointments,
        },
      },
      dailyTrend,
    });
  } catch (e: any) {
    console.error("practice-insights error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
