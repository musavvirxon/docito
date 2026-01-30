// File: supabase/functions/entity-dashboard/index.ts

/// <reference lib="deno.unstable" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Json = Record<string, unknown>;

type ReqBody = {
  action: "billing" | "analytics";
  entityType: "clinic";
  entityId: string;
  limit?: number;
  days?: number;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseAuthToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function startOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeNum(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function assertClinicAccess(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  clinicId: string,
) {
  // Prefer a "user scopes" style view/table if present.
  const candidates: Array<() => Promise<boolean>> = [
    async () => {
      const { data, error } = await supabaseAdmin
        .from("user_entity_scopes")
        .select("entity_id, entity_type, is_admin, permissions, status")
        .eq("user_id", userId)
        .eq("entity_type", "clinic")
        .eq("entity_id", clinicId)
        .maybeSingle();
      if (error) return false;
      return Boolean(data) && (data as any).status !== "inactive";
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from("entity_memberships")
        .select("entity_id, entity_type, status")
        .eq("user_id", userId)
        .eq("entity_type", "clinic")
        .eq("entity_id", clinicId)
        .maybeSingle();
      if (error) return false;
      return Boolean(data) && (data as any).status !== "inactive";
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from("practice_staff")
        .select("practice_id, status")
        .eq("user_id", userId)
        .eq("practice_id", clinicId)
        .maybeSingle();
      if (error) return false;
      return Boolean(data) && (data as any).status !== "inactive";
    },
    async () => {
      // doctors table often ties a doctor to a practice/clinic
      const { data, error } = await supabaseAdmin
        .from("doctors")
        .select("id, practice_id, clinic_id, user_id")
        .eq("user_id", userId)
        .or(`practice_id.eq.${clinicId},clinic_id.eq.${clinicId}`)
        .limit(1)
        .maybeSingle();
      if (error) return false;
      return Boolean(data);
    },
  ];

  for (const fn of candidates) {
    try {
      if (await fn()) return;
    } catch {
      // ignore and try next
    }
  }

  throw new Error("forbidden");
}

async function loadClinicBilling(
  supabaseAdmin: ReturnType<typeof createClient>,
  clinicId: string,
  limit: number,
) {
  // Prefer generic billing_transactions table if present
  const tryTables = [
    async () => {
      const { data, error } = await supabaseAdmin
        .from("billing_transactions")
        .select(
          "id, created_at, status, transaction_type, currency, amount_cents, metadata, entity_type, entity_id, invoice_id, provider, provider_ref",
        )
        .eq("entity_type", "clinic")
        .eq("entity_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as any[];
    },
    async () => {
      const { data, error } = await supabaseAdmin
        .from("facility_billing_transactions")
        .select(
          "id, created_at, status, transaction_type, currency, amount_cents, metadata, entity_type, entity_id, invoice_id, provider, provider_ref",
        )
        .eq("entity_type", "clinic")
        .eq("entity_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as any[];
    },
  ];

  let rows: any[] = [];
  let lastErr: unknown = null;
  for (const t of tryTables) {
    try {
      rows = await t();
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  if (lastErr) throw lastErr;

  const currency = (rows.find((r) => r.currency)?.currency as string | undefined) ||
    "usd";

  // Summary
  let paid = 0;
  let refunded = 0;

  for (const r of rows) {
    const status = String(r.status || "").toLowerCase();
    if (status !== "completed" && status !== "paid") continue;

    const amt = safeNum(r.amount_cents, 0);
    const type = String(r.transaction_type || "").toLowerCase();

    if (type.includes("refund") || amt < 0) refunded += Math.abs(amt);
    else paid += amt;
  }

  return {
    ok: true,
    currency,
    summary: {
      total_paid_cents: paid,
      total_refunded_cents: refunded,
      net_cents: paid - refunded,
    },
    transactions: rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      status: r.status,
      transaction_type: r.transaction_type,
      currency: r.currency || currency,
      amount_cents: safeNum(r.amount_cents, 0),
      metadata: (r.metadata || {}) as Json,
      provider: r.provider ?? null,
      provider_ref: r.provider_ref ?? null,
      invoice_id: r.invoice_id ?? null,
    })),
  };
}

async function loadClinicAnalytics(
  supabaseAdmin: ReturnType<typeof createClient>,
  clinicId: string,
  days: number,
) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (Math.max(1, days) - 1));
  start.setHours(0, 0, 0, 0);

  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - Math.max(1, days));
  const prevEnd = new Date(start);
  prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);

  // Appointments (current period)
  const { data: appts, error: apptErr } = await supabaseAdmin
    .from("appointments")
    .select("id, appointment_date, status, patient_id")
    .eq("practice_id", clinicId)
    .gte("appointment_date", ymd(start))
    .lte("appointment_date", ymd(now));
  if (apptErr) throw apptErr;

  // Appointments (previous period)
  const { data: prevAppts, error: prevApptErr } = await supabaseAdmin
    .from("appointments")
    .select("id, appointment_date, status, patient_id")
    .eq("practice_id", clinicId)
    .gte("appointment_date", ymd(prevStart))
    .lte("appointment_date", ymd(prevEnd));
  if (prevApptErr) throw prevApptErr;

  const total = (appts || []).length;
  const completed = (appts || []).filter((a: any) => {
    const s = String(a.status || "").toLowerCase();
    return s === "completed" || s === "done";
  }).length;

  const prevTotal = (prevAppts || []).length;
  const prevCompleted = (prevAppts || []).filter((a: any) => {
    const s = String(a.status || "").toLowerCase();
    return s === "completed" || s === "done";
  }).length;

  const uniquePatients = new Set(
    (appts || []).map((a: any) => a.patient_id).filter(Boolean),
  ).size;
  const prevUniquePatients = new Set(
    (prevAppts || []).map((a: any) => a.patient_id).filter(Boolean),
  ).size;

  const completionRatePct = total > 0 ? (completed / total) * 100 : 0;
  const prevCompletionRatePct = prevTotal > 0
    ? (prevCompleted / prevTotal) * 100
    : 0;

  const pctChange = (cur: number, prev: number) => {
    if (!Number.isFinite(cur) || !Number.isFinite(prev)) return 0;
    if (prev === 0) return cur === 0 ? 0 : 100;
    return ((cur - prev) / prev) * 100;
  };

  // Revenue from billing (current + prev) via the same data source as billing action
  const billingNow = await loadClinicBilling(supabaseAdmin, clinicId, 1000);
  const currentRevenue = safeNum((billingNow as any)?.summary?.net_cents, 0);

  let prevRevenue = 0;
  try {
    // Attempt date-bounded revenue if billing table supports created_at filtering
    const { data: txs, error } = await supabaseAdmin
      .from("billing_transactions")
      .select("status, transaction_type, amount_cents, created_at, entity_type, entity_id")
      .eq("entity_type", "clinic")
      .eq("entity_id", clinicId)
      .gte("created_at", prevStart.toISOString())
      .lte("created_at", prevEnd.toISOString())
      .limit(2000);
    if (!error) {
      let paid = 0;
      let refunded = 0;
      for (const r of txs || []) {
        const status = String((r as any).status || "").toLowerCase();
        if (status !== "completed" && status !== "paid") continue;
        const amt = safeNum((r as any).amount_cents, 0);
        const type = String((r as any).transaction_type || "").toLowerCase();
        if (type.includes("refund") || amt < 0) refunded += Math.abs(amt);
        else paid += amt;
      }
      prevRevenue = paid - refunded;
    }
  } catch {
    prevRevenue = 0;
  }

  // Daily trend for appointments (and revenue best-effort)
  const dayMap = new Map<string, { date: string; appointments: number; completed: number; uniquePatients: Set<string>; revenue_cents: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const k = ymd(d);
    dayMap.set(k, {
      date: k,
      appointments: 0,
      completed: 0,
      uniquePatients: new Set(),
      revenue_cents: 0,
    });
  }

  for (const a of appts || []) {
    const k = String((a as any).appointment_date);
    const row = dayMap.get(k);
    if (!row) continue;
    row.appointments += 1;
    const s = String((a as any).status || "").toLowerCase();
    if (s === "completed" || s === "done") row.completed += 1;
    const pid = (a as any).patient_id;
    if (pid) row.uniquePatients.add(String(pid));
  }

  // Revenue per day (best-effort from billingNow transactions)
  try {
    const txs = (billingNow as any)?.transactions as any[] | undefined;
    if (Array.isArray(txs)) {
      for (const t of txs) {
        const status = String(t.status || "").toLowerCase();
        if (status !== "completed" && status !== "paid") continue;
        const created = new Date(String(t.created_at));
        const k = ymd(created);
        const row = dayMap.get(k);
        if (!row) continue;

        const amt = safeNum(t.amount_cents, 0);
        const type = String(t.transaction_type || "").toLowerCase();
        if (type.includes("refund") || amt < 0) row.revenue_cents -= Math.abs(amt);
        else row.revenue_cents += amt;
      }
    }
  } catch {
    // ignore
  }

  const daily = Array.from(dayMap.values()).map((r) => ({
    date: r.date,
    appointments: r.appointments,
    completed: r.completed,
    uniquePatients: r.uniquePatients.size,
    revenue_cents: r.revenue_cents,
  }));

  return {
    ok: true,
    range: {
      days,
      start_date: ymd(start),
      end_date: ymd(now),
    },
    kpis: {
      uniquePatients,
      uniquePatientsChangePct: pctChange(uniquePatients, prevUniquePatients),
      completionRatePct,
      completionRateChangePct: pctChange(completionRatePct, prevCompletionRatePct),
      revenueNetCents: currentRevenue,
      revenueNetChangePct: pctChange(currentRevenue, prevRevenue),
      appointmentsTotal: total,
      appointmentsTotalChangePct: pctChange(total, prevTotal),
    },
    daily,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(500, { ok: false, error: "missing_env" });
    }

    const token = parseAuthToken(req);
    if (!token) return jsonResponse(401, { ok: false, error: "missing_auth" });

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse(401, { ok: false, error: "invalid_auth" });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body = (await req.json().catch(() => null)) as ReqBody | null;
    if (!body || !body.action || !body.entityType || !body.entityId) {
      return jsonResponse(400, { ok: false, error: "invalid_body" });
    }

    if (body.entityType !== "clinic") {
      return jsonResponse(400, { ok: false, error: "unsupported_entity_type" });
    }

    const userId = userData.user.id;
    await assertClinicAccess(supabaseAdmin, userId, body.entityId);

    if (body.action === "billing") {
      const limit = Math.min(Math.max(body.limit ?? 200, 1), 1000);
      const payload = await loadClinicBilling(supabaseAdmin, body.entityId, limit);
      return jsonResponse(200, payload);
    }

    if (body.action === "analytics") {
      const days = Math.min(Math.max(body.days ?? 30, 1), 365);
      const payload = await loadClinicAnalytics(supabaseAdmin, body.entityId, days);
      return jsonResponse(200, payload);
    }

    return jsonResponse(400, { ok: false, error: "unsupported_action" });
  } catch (e: any) {
    const msg = String(e?.message || e || "");
    if (msg === "forbidden") return jsonResponse(403, { ok: false, error: "forbidden" });
    return jsonResponse(500, { ok: false, error: "server_error", detail: msg });
  }
});
