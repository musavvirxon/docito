// File: supabase/functions/facility-analytics/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EntityType = "lab" | "imaging" | "pharmacy";
type TimeRange = "7d" | "30d" | "90d";

type ReqBody = {
  entityType: EntityType;
  entityId: string;
  timeRange?: TimeRange; // lab/pharmacy
  days?: number; // imaging (or fallback)
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(v);
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function daysFromRange(r: TimeRange) {
  if (r === "30d") return 30;
  if (r === "90d") return 90;
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

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function toCents(n: unknown) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100);
}

function safeInt(n: unknown, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.trunc(v) : fallback;
}

function dateKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysUTC(date: Date, days: number) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function parseAttachments(a: unknown): { modality: string; examName: string } {
  const obj = a && typeof a === "object" ? (a as Record<string, unknown>) : null;
  const modality = (obj?.modality as string) || (obj?.mod as string) || "Unknown";
  const examName = (obj?.exam_name as string) || (obj?.exam as string) ||
    (obj?.study as string) || "Imaging Exam";
  return { modality: String(modality), examName: String(examName) };
}

function isMissingSchemaError(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "");
  const m = msg.toLowerCase();
  return (
    msg.includes("Could not find the table") ||
    m.includes("schema cache") ||
    (m.includes("column") && m.includes("does not exist")) ||
    (m.includes("relation") && m.includes("does not exist"))
  );
}

async function requireEnv() {
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

async function requireAuthedUser(
  supabaseUrl: string,
  anonKey: string,
  authHeader: string | null,
) {
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
    auth: { persistSession: false },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) throw new Error("Unauthorized");
  return { userClient, user: data.user };
}

async function assertLabAccess(serviceClient: any, userId: string, labCenterId: string) {
  const { data: center, error: cErr } = await serviceClient
    .from("lab_centers")
    .select("id,admin_id")
    .eq("id", labCenterId)
    .maybeSingle();
  if (cErr) throw cErr;
  if ((center as any)?.admin_id === userId) return true;

  const { data: staff, error: sErr } = await serviceClient
    .from("lab_staff")
    .select("id")
    .eq("lab_center_id", labCenterId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (sErr) throw sErr;

  return Boolean((staff as any)?.id);
}

async function ensureImagingAccess(service: any, userId: string, centerId: string) {
  const { data: adminRow, error: aErr } = await service
    .from("imaging_centers")
    .select("id")
    .eq("id", centerId)
    .eq("admin_id", userId)
    .maybeSingle();
  if (aErr) throw aErr;
  if ((adminRow as any)?.id) return true;

  const { data: staffRow, error: sErr } = await service
    .from("imaging_staff")
    .select("id")
    .eq("imaging_center_id", centerId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (sErr) throw sErr;

  return Boolean((staffRow as any)?.id);
}

async function ensurePharmacyAccess(service: any, userId: string, pharmacyId: string) {
  const { data: ph, error: pErr } = await service
    .from("pharmacies")
    .select("id,admin_id")
    .eq("id", pharmacyId)
    .maybeSingle();
  if (pErr) throw pErr;

  if ((ph as any)?.admin_id === userId) return true;

  const { data: staffRow, error: sErr } = await service
    .from("pharmacy_staff")
    .select("id,status,pharmacy_id")
    .eq("pharmacy_id", pharmacyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (sErr) throw sErr;

  return Boolean(staffRow);
}

// ---------------------- LAB ANALYTICS ----------------------

type LabAnalyticsResp = {
  ok: boolean;
  error?: string;
  kpis?: {
    totalRevenueCents: number;
    totalTests: number;
    avgTurnaroundHours: number;
    recollectionRatePct: number;
    revenueChangePct: number;
    testsChangePct: number;
  };
  dailyTrend?: Array<{ date: string; revenueCents: number; tests: number }>;
  topTests?: Array<{ name: string; count: number; revenueCents: number }>;
  statusBreakdown?: Array<{ name: string; value: number }>;
};

async function labAnalytics(params: {
  service: any;
  userId: string;
  labCenterId: string;
  timeRange: TimeRange;
}): Promise<LabAnalyticsResp> {
  const { service, userId, labCenterId, timeRange } = params;

  const allowed = await assertLabAccess(service, userId, labCenterId);
  if (!allowed) return { ok: false, error: "Forbidden" };

  const days = daysFromRange(timeRange);
  const now = new Date();
  const end = now;
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const prevEnd = start;
  const prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);

  const [{ data: orders, error: oErr }, { data: prevOrders, error: poErr }] = await Promise.all([
    service
      .from("test_orders")
      .select("id,status,created_at,completed_at,total_amount")
      .eq("lab_center_id", labCenterId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .limit(5000),
    service
      .from("test_orders")
      .select("id,status,created_at,completed_at,total_amount")
      .eq("lab_center_id", labCenterId)
      .gte("created_at", prevStart.toISOString())
      .lt("created_at", prevEnd.toISOString())
      .limit(5000),
  ]);

  if (oErr) return { ok: false, error: oErr.message };
  if (poErr) return { ok: false, error: poErr.message };

  const orderRows = orders || [];
  const prevOrderRows = prevOrders || [];

  const [{ data: txs, error: tErr }, { data: prevTxs, error: ptErr }] = await Promise.all([
    service
      .from("billing_transactions")
      .select("amount,created_at,status,transaction_type")
      .eq("entity_type", "lab_center")
      .eq("entity_id", labCenterId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .limit(5000),
    service
      .from("billing_transactions")
      .select("amount,created_at,status,transaction_type")
      .eq("entity_type", "lab_center")
      .eq("entity_id", labCenterId)
      .gte("created_at", prevStart.toISOString())
      .lt("created_at", prevEnd.toISOString())
      .limit(5000),
  ]);

  const txRows = tErr ? [] : (txs || []);
  const prevTxRows = ptErr ? [] : (prevTxs || []);

  const revenueCentsFromTx = txRows.reduce((sum: number, r: any) => {
    const status = String(r?.status || "");
    if (status !== "completed") return sum;
    const type = String(r?.transaction_type || "").toLowerCase();
    const amt = toCents(r?.amount);
    if (type.includes("refund") || amt < 0) return sum + amt;
    return sum + amt;
  }, 0);

  const revenueCentsFromOrders = orderRows.reduce((sum: number, r: any) => sum + toCents(r?.total_amount), 0);
  const totalRevenueCents = revenueCentsFromTx !== 0 ? revenueCentsFromTx : revenueCentsFromOrders;

  const prevRevenueCentsFromTx = prevTxRows.reduce((sum: number, r: any) => {
    const status = String(r?.status || "");
    if (status !== "completed") return sum;
    const type = String(r?.transaction_type || "").toLowerCase();
    const amt = toCents(r?.amount);
    if (type.includes("refund") || amt < 0) return sum + amt;
    return sum + amt;
  }, 0);

  const prevRevenueCentsFromOrders = prevOrderRows.reduce((sum: number, r: any) => sum + toCents(r?.total_amount), 0);
  const prevTotalRevenueCents = prevRevenueCentsFromTx !== 0 ? prevRevenueCentsFromTx : prevRevenueCentsFromOrders;

  const totalTests = orderRows.length;
  const prevTotalTests = prevOrderRows.length;

  const revenueChangePct =
    prevTotalRevenueCents > 0 ? ((totalRevenueCents - prevTotalRevenueCents) / prevTotalRevenueCents) * 100 : 0;

  const testsChangePct = prevTotalTests > 0 ? ((totalTests - prevTotalTests) / prevTotalTests) * 100 : 0;

  const completed = orderRows.filter((o: any) => o?.completed_at);
  const avgTurnaroundHours =
    completed.length === 0
      ? 0
      : completed.reduce((sum: number, o: any) => {
        const created = new Date(o?.created_at);
        const done = new Date(o?.completed_at);
        return sum + Math.max(0, (done.getTime() - created.getTime()) / (1000 * 60 * 60));
      }, 0) / completed.length;

  const cancelledCount = orderRows.filter((o: any) => String(o?.status || "") === "cancelled").length;
  const recollectionRatePct = totalTests > 0 ? (cancelledCount / totalTests) * 100 : 0;

  const dayCount = days;
  const dayMap: Record<string, { date: string; revenueCents: number; tests: number }> = {};
  for (let i = 0; i < dayCount; i++) {
    const d = startOfDayUTC(new Date(end.getTime() - (dayCount - 1 - i) * 24 * 60 * 60 * 1000));
    const key = dateKeyUTC(d);
    dayMap[key] = { date: key, revenueCents: 0, tests: 0 };
  }

  for (const o of orderRows as any[]) {
    const created = new Date(o.created_at);
    const key = dateKeyUTC(startOfDayUTC(created));
    if (dayMap[key]) dayMap[key].tests += 1;
  }

  if (txRows.length) {
    for (const t of txRows as any[]) {
      const status = String(t?.status || "");
      if (status !== "completed") continue;
      const created = new Date(t?.created_at);
      const key = dateKeyUTC(startOfDayUTC(created));
      if (!dayMap[key]) continue;
      dayMap[key].revenueCents += toCents(t?.amount);
    }
  } else {
    for (const o of orderRows as any[]) {
      const created = new Date(o?.created_at);
      const key = dateKeyUTC(startOfDayUTC(created));
      if (!dayMap[key]) continue;
      dayMap[key].revenueCents += toCents(o?.total_amount);
    }
  }

  const dailyTrend = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

  const statusCounts: Record<string, number> = {};
  for (const o of orderRows as any[]) {
    const s = String(o?.status || "unknown");
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }
  const statusBreakdown = Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const orderIds = orderRows.map((o: any) => o?.id);
  let topTests: Array<{ name: string; count: number; revenueCents: number }> = [];

  if (orderIds.length) {
    const { data: items, error: iErr } = await service
      .from("test_order_items")
      .select("id,test_order_id,price,test_catalog(name)")
      .in("test_order_id", orderIds)
      .limit(10000);

    if (!iErr && items?.length) {
      const agg: Record<string, { name: string; count: number; revenueCents: number }> = {};
      for (const it of items as any[]) {
        const name = String(it?.test_catalog?.name || "Unknown");
        if (!agg[name]) agg[name] = { name, count: 0, revenueCents: 0 };
        agg[name].count += 1;
        agg[name].revenueCents += toCents(it?.price);
      }
      topTests = Object.values(agg).sort((a, b) => b.count - a.count).slice(0, 10);
    }
  }

  return {
    ok: true,
    kpis: {
      totalRevenueCents,
      totalTests,
      avgTurnaroundHours: Number.isFinite(avgTurnaroundHours) ? Math.round(avgTurnaroundHours * 10) / 10 : 0,
      recollectionRatePct: Math.round(recollectionRatePct * 10) / 10,
      revenueChangePct: Math.round(revenueChangePct * 10) / 10,
      testsChangePct: Math.round(testsChangePct * 10) / 10,
    },
    dailyTrend,
    topTests,
    statusBreakdown,
  };
}

// ---------------------- PHARMACY ANALYTICS ----------------------

type PharmacyAnalyticsResp = {
  ok: boolean;
  error?: string;
  kpis?: {
    totalRevenue: number;
    totalOrders: number;
    totalPrescriptionsFilled: number;
    avgOrderValue: number;
    revenueChangePct: number;
    ordersChangePct: number;
  };
  dailyTrend?: Array<{ date: string; revenue: number; orders: number }>;
  topMedications?: Array<{ name: string; count: number; revenue: number }>;
  statusBreakdown?: Array<{ name: string; value: number }>;
};

async function pharmacyAnalytics(params: {
  service: any;
  userId: string;
  pharmacyId: string;
  timeRange: TimeRange;
}): Promise<PharmacyAnalyticsResp> {
  const { service, userId, pharmacyId, timeRange } = params;

  const allowed = await ensurePharmacyAccess(service, userId, pharmacyId);
  if (!allowed) return { ok: false, error: "Forbidden" };

  const days = daysFromRange(timeRange);

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - days);

  const prevEnd = new Date(start);
  prevEnd.setMilliseconds(-1);

  const { data: orders, error: oErr } = await service
    .from("fulfillment_orders")
    .select("id,created_at,status,total_amount,prescription_id")
    .eq("pharmacy_id", pharmacyId)
    .gte("created_at", prevStart.toISOString())
    .order("created_at", { ascending: true });

  if (oErr) return { ok: false, error: oErr.message };

  const all = (orders || []) as Array<{
    id: string;
    created_at: string;
    status: string | null;
    total_amount: number | null;
    prescription_id: string;
  }>;

  const inCurrent = (dt: Date) => dt >= start && dt <= now;
  const inPrev = (dt: Date) => dt >= prevStart && dt <= prevEnd;

  const currentOrders: typeof all = [];
  const prevOrders: typeof all = [];

  for (const o of all) {
    const dt = new Date(o.created_at);
    if (inCurrent(dt)) currentOrders.push(o);
    else if (inPrev(dt)) prevOrders.push(o);
  }

  const sumRevenue = (arr: typeof all) => arr.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
  const currentRevenue = sumRevenue(currentOrders);
  const prevRevenue = sumRevenue(prevOrders);

  const revenueChangePct = prevRevenue > 0
    ? round2(((currentRevenue - prevRevenue) / prevRevenue) * 100)
    : currentRevenue > 0
      ? 100
      : 0;

  const ordersChangePct = prevOrders.length > 0
    ? round2(((currentOrders.length - prevOrders.length) / prevOrders.length) * 100)
    : currentOrders.length > 0
      ? 100
      : 0;

  const totalOrders = currentOrders.length;
  const totalRevenue = round2(currentRevenue);
  const avgOrderValue = totalOrders > 0 ? round2(currentRevenue / totalOrders) : 0;

  const totalPrescriptionsFilled = currentOrders.filter((o) => (o.status || "").toLowerCase() === "completed").length;

  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    buckets.set(isoDate(d), { revenue: 0, orders: 0 });
  }
  for (const o of currentOrders) {
    const k = isoDate(new Date(o.created_at));
    const b = buckets.get(k);
    if (!b) continue;
    b.orders += 1;
    b.revenue += Number(o.total_amount) || 0;
    buckets.set(k, b);
  }
  const dailyTrend = Array.from(buckets.entries()).map(([date, v]) => ({
    date,
    revenue: round2(v.revenue),
    orders: v.orders,
  }));

  const statusCounts = new Map<string, number>();
  for (const o of currentOrders) {
    const key = (o.status || "pending").toString().toLowerCase();
    statusCounts.set(key, (statusCounts.get(key) || 0) + 1);
  }
  const statusLabel = (s: string) => {
    if (s === "completed") return "Completed";
    if (s === "processing") return "Processing";
    if (s === "pending") return "Pending";
    if (s === "cancelled") return "Cancelled";
    if (s === "ready") return "Ready";
    return s.slice(0, 1).toUpperCase() + s.slice(1);
  };
  const statusBreakdown = Array.from(statusCounts.entries())
    .map(([s, v]) => ({ name: statusLabel(s), value: v }))
    .sort((a, b) => b.value - a.value);

  const prescIds = Array.from(new Set(currentOrders.map((o) => o.prescription_id))).filter(Boolean);

  let topMedications: Array<{ name: string; count: number; revenue: number }> = [];
  if (prescIds.length) {
    try {
      const { data: items, error: iErr } = await service
        .from("prescription_items")
        .select("id,prescription_id,quantity,unit_price,medication_name")
        .in("prescription_id", prescIds)
        .limit(10000);

      if (!iErr && items?.length) {
        const agg = new Map<string, { name: string; count: number; revenue: number }>();
        for (const it of items as any[]) {
          const name = String(it?.medication_name || "Medication");
          const qty = Number(it?.quantity) || 1;
          const unit = Number(it?.unit_price) || 0;
          const revenue = qty * unit;

          const row = agg.get(name) || { name, count: 0, revenue: 0 };
          row.count += qty;
          row.revenue += revenue;
          agg.set(name, row);
        }
        topMedications = Array.from(agg.values()).sort((a, b) => b.count - a.count).slice(0, 10);
      }
    } catch {
      // ignore
    }
  }

  return {
    ok: true,
    kpis: {
      totalRevenue,
      totalOrders,
      totalPrescriptionsFilled,
      avgOrderValue,
      revenueChangePct,
      ordersChangePct,
    },
    dailyTrend,
    topMedications,
    statusBreakdown,
  };
}

// ---------------------- IMAGING ANALYTICS ----------------------

type ImagingAnalyticsResponse = {
  kpis: {
    totalScans: number;
    completedScans: number;
    pendingScans: number;
    revenueCents: number;
    refundsCents: number;
    netRevenueCents: number;
    avgReportHours: number;
    avgAcceptHours: number;
    utilizationPct: number;
    reportBacklog: number;
    scansChangePct: number;
    revenueChangePct: number;
    reportChangePct: number;
  };
  dailyTrend: Array<{ date: string; scans: number; completed: number; revenue: number }>;
  modalityData: Array<{ name: string; value: number; revenue: number }>;
  workflowBreakdown: Array<{ name: string; value: number }>;
  statusBreakdown: Array<{ name: string; value: number }>;
  peakHours: Array<{ hour: string; scans: number }>;
  demographics: {
    gender: Array<{ name: string; value: number }>;
    ageBuckets: Array<{ name: string; value: number }>;
  };
  topReferrers: Array<{ name: string; value: number }>;
  turnaroundByModality: Array<{ type: string; avgHours: number }>;
  warnings?: string[];
};

function emptyImagingResponse(warnings: string[] = []): ImagingAnalyticsResponse {
  return {
    kpis: {
      totalScans: 0,
      completedScans: 0,
      pendingScans: 0,
      revenueCents: 0,
      refundsCents: 0,
      netRevenueCents: 0,
      avgReportHours: 0,
      avgAcceptHours: 0,
      utilizationPct: 0,
      reportBacklog: 0,
      scansChangePct: 0,
      revenueChangePct: 0,
      reportChangePct: 0,
    },
    dailyTrend: [],
    modalityData: [],
    workflowBreakdown: [],
    statusBreakdown: [],
    peakHours: [],
    demographics: { gender: [], ageBuckets: [] },
    topReferrers: [],
    turnaroundByModality: [],
    ...(warnings.length ? { warnings } : {}),
  };
}

async function imagingAnalytics(params: {
  service: any;
  userId: string;
  centerId: string;
  days: number;
}): Promise<{ ok: true; data: ImagingAnalyticsResponse } | { ok: false; error: string; status?: number }> {
  const { service, userId, centerId, days } = params;

  const allowed = await ensureImagingAccess(service, userId, centerId);
  if (!allowed) return { ok: false, error: "Forbidden", status: 403 };

  const warnings: string[] = [];

  try {
    const end = new Date();
    const start = addDaysUTC(
      new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())),
      -days + 1,
    );
    const startISO = start.toISOString();
    const prevStart = addDaysUTC(start, -days);
    const prevStartISO = prevStart.toISOString();
    const prevEndISO = start.toISOString();

    const dailyBuckets: Record<string, { date: string; scans: number; completed: number; revenue: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = addDaysUTC(start, i);
      const k = dateKey(d);
      dailyBuckets[k] = { date: k, scans: 0, completed: 0, revenue: 0 };
    }

    const { data: refData, error: refErr } = await service
      .from("referrals")
      .select("id, status, priority, attachments, created_at, accepted_at, completed_at, patient_id, referrer_type, referrer_entity_id")
      .eq("receiver_type", "imaging_center")
      .eq("receiver_entity_id", centerId)
      .gte("created_at", startISO)
      .order("created_at", { ascending: false });

    if (refErr) {
      if (isMissingSchemaError(refErr)) {
        return { ok: true, data: emptyImagingResponse(["schema_not_ready:referrals"]) };
      }
      return { ok: false, error: refErr.message || "Failed to load referrals" };
    }

    const referrals = (refData || []) as Array<{
      id: string;
      status: string | null;
      priority: string | null;
      attachments: unknown;
      created_at: string;
      accepted_at: string | null;
      completed_at: string | null;
      patient_id: string;
      referrer_type: string | null;
      referrer_entity_id: string | null;
    }>;

    const { data: refPrevData, error: refPrevErr } = await service
      .from("referrals")
      .select("id")
      .eq("receiver_type", "imaging_center")
      .eq("receiver_entity_id", centerId)
      .gte("created_at", prevStartISO)
      .lt("created_at", prevEndISO);

    if (refPrevErr) {
      if (isMissingSchemaError(refPrevErr)) warnings.push("schema_not_ready:referrals_prev");
    }

    const prevTotalScans = (refPrevData || []).length;
    const totalScans = referrals.length;

    const statusMap = new Map<string, number>();
    const wfMap = new Map<string, number>();
    const modMap = new Map<string, { count: number; revenue: number }>();
    let reportBacklog = 0;

    let acceptSumHours = 0;
    let acceptCount = 0;

    const patientIds = new Set<string>();
    const referrerCounter = new Map<string, number>();
    const doctorIds: string[] = [];
    const practiceIds: string[] = [];

    const hourCounts = new Array(24).fill(0) as number[];

    for (const r of referrals) {
      const createdAt = new Date(r.created_at);
      const k = dateKey(createdAt);
      if (dailyBuckets[k]) {
        dailyBuckets[k].scans += 1;
        if ((r.status || "") === "completed" || r.completed_at) dailyBuckets[k].completed += 1;
      }

      hourCounts[createdAt.getUTCHours()] += 1;

      const status = (r.status || "unknown").toLowerCase();
      statusMap.set(status, (statusMap.get(status) || 0) + 1);

      const workflow =
        status === "completed"
          ? "completed"
          : status === "declined"
            ? "cancelled"
            : status === "accepted" || status === "in_progress"
              ? "in_progress"
              : "scheduled";

      wfMap.set(workflow, (wfMap.get(workflow) || 0) + 1);

      if ((status === "accepted" || status === "in_progress") && !r.completed_at) reportBacklog += 1;

      const { modality } = parseAttachments(r.attachments);
      const m = modMap.get(modality) || { count: 0, revenue: 0 };
      m.count += 1;
      modMap.set(modality, m);

      patientIds.add(r.patient_id);

      if (r.accepted_at) {
        const acc = new Date(r.accepted_at);
        const diffH = Math.max(0, (acc.getTime() - createdAt.getTime()) / 3600000);
        acceptSumHours += diffH;
        acceptCount += 1;
      }

      if (r.referrer_type && r.referrer_entity_id) {
        const key = `${r.referrer_type}:${r.referrer_entity_id}`;
        referrerCounter.set(key, (referrerCounter.get(key) || 0) + 1);
        if (r.referrer_type === "doctor") doctorIds.push(r.referrer_entity_id);
        if (r.referrer_type === "clinic") practiceIds.push(r.referrer_entity_id);
      }
    }

    let revenueCents = 0;
    let refundsCents = 0;
    let prevRevenueCents = 0;

    const { data: txData, error: txErr } = await service
      .from("billing_transactions")
      .select("amount, transaction_type, status, created_at, provider_data")
      .eq("entity_type", "imaging_center")
      .eq("entity_id", centerId)
      .gte("created_at", startISO);

    if (txErr) {
      if (isMissingSchemaError(txErr)) warnings.push("schema_not_ready:billing_transactions_entity_scope");
      else warnings.push(`billing_query_failed:${txErr.message}`);
    } else {
      const transactions = (txData || []) as Array<{
        amount: number;
        transaction_type: string;
        status: string;
        created_at: string;
        provider_data: Record<string, unknown> | null;
      }>;

      for (const t of transactions) {
        const isCompleted = (t.status || "").toLowerCase() === "completed";
        if (!isCompleted) continue;

        const type = (t.transaction_type || "").toLowerCase();
        if (["appointment_payment", "subscription_payment", "hold_capture"].includes(type)) revenueCents += safeInt(t.amount, 0);
        if (["refund", "hold_release"].includes(type)) refundsCents += safeInt(t.amount, 0);

        const createdAt = new Date(t.created_at);
        const k = dateKey(createdAt);
        if (dailyBuckets[k]) {
          if (["appointment_payment", "subscription_payment", "hold_capture"].includes(type)) dailyBuckets[k].revenue += safeInt(t.amount, 0);
          if (["refund", "hold_release"].includes(type)) dailyBuckets[k].revenue -= safeInt(t.amount, 0);
        }
      }

      const { data: prevTxData, error: prevTxErr } = await service
        .from("billing_transactions")
        .select("amount, transaction_type, status, created_at")
        .eq("entity_type", "imaging_center")
        .eq("entity_id", centerId)
        .gte("created_at", prevStartISO)
        .lt("created_at", prevEndISO);

      if (prevTxErr) {
        if (isMissingSchemaError(prevTxErr)) warnings.push("schema_not_ready:billing_transactions_prev");
      } else {
        for (const t of (prevTxData || []) as any[]) {
          const isCompleted = String(t?.status || "").toLowerCase() === "completed";
          if (!isCompleted) continue;
          const type = String(t?.transaction_type || "").toLowerCase();
          if (["appointment_payment", "subscription_payment", "hold_capture"].includes(type)) prevRevenueCents += safeInt(t?.amount, 0);
          if (["refund", "hold_release"].includes(type)) prevRevenueCents -= safeInt(t?.amount, 0);
        }
      }
    }

    const completedScans = referrals.filter((r) => (r.status || "").toLowerCase() === "completed" || Boolean(r.completed_at)).length;
    const pendingScans = Math.max(0, totalScans - completedScans);

    const avgAcceptHours = acceptCount > 0 ? Math.round((acceptSumHours / acceptCount) * 10) / 10 : 0;

    let reportSumHours = 0;
    let reportCount = 0;

    const turnaroundByModalityMap = new Map<string, { sum: number; count: number }>();

    for (const r of referrals) {
      if (!r.completed_at) continue;
      const createdAt = new Date(r.created_at);
      const completedAt = new Date(r.completed_at);
      const diffH = Math.max(0, (completedAt.getTime() - createdAt.getTime()) / 3600000);
      reportSumHours += diffH;
      reportCount += 1;

      const { modality } = parseAttachments(r.attachments);
      const row = turnaroundByModalityMap.get(modality) || { sum: 0, count: 0 };
      row.sum += diffH;
      row.count += 1;
      turnaroundByModalityMap.set(modality, row);
    }

    const avgReportHours = reportCount > 0 ? Math.round((reportSumHours / reportCount) * 10) / 10 : 0;

    const utilizationPct = totalScans > 0 ? Math.round((completedScans / totalScans) * 100) : 0;

    const scansChangePct = prevTotalScans > 0 ? Math.round(((totalScans - prevTotalScans) / prevTotalScans) * 1000) / 10 : totalScans > 0 ? 100 : 0;
    const netRevenueCents = revenueCents - refundsCents;
    const revenueChangePct = prevRevenueCents > 0 ? Math.round(((netRevenueCents - prevRevenueCents) / prevRevenueCents) * 1000) / 10 : netRevenueCents > 0 ? 100 : 0;

    // reportChangePct: lower is better, compare avg report time vs previous window (best-effort)
    let prevAvgReportHours = 0;
    try {
      const { data: prevRefs, error: prevRefsErr } = await service
        .from("referrals")
        .select("created_at, completed_at, attachments, status")
        .eq("receiver_type", "imaging_center")
        .eq("receiver_entity_id", centerId)
        .gte("created_at", prevStartISO)
        .lt("created_at", prevEndISO)
        .limit(5000);

      if (!prevRefsErr && prevRefs?.length) {
        let sum = 0;
        let cnt = 0;
        for (const r of prevRefs as any[]) {
          if (!r?.completed_at) continue;
          const createdAt = new Date(r.created_at);
          const completedAt = new Date(r.completed_at);
          const diffH = Math.max(0, (completedAt.getTime() - createdAt.getTime()) / 3600000);
          sum += diffH;
          cnt += 1;
        }
        prevAvgReportHours = cnt > 0 ? sum / cnt : 0;
      }
    } catch {
      prevAvgReportHours = 0;
    }

    const reportChangePct = prevAvgReportHours > 0 ? Math.round(((avgReportHours - prevAvgReportHours) / prevAvgReportHours) * 1000) / 10 : avgReportHours > 0 ? 100 : 0;

    const dailyTrend = Object.values(dailyBuckets).sort((a, b) => a.date.localeCompare(b.date));

    const modalityData = Array.from(modMap.entries())
      .map(([name, v]) => ({ name, value: v.count, revenue: v.revenue }))
      .sort((a, b) => b.value - a.value);

    const workflowBreakdown = Array.from(wfMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const statusBreakdown = Array.from(statusMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const peakHours = hourCounts
      .map((scans, i) => ({ hour: `${String(i).padStart(2, "0")}:00`, scans }))
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 6);

    // Demographics + topReferrers are best-effort (return empty if schema not present)
    const demographics = { gender: [] as Array<{ name: string; value: number }>, ageBuckets: [] as Array<{ name: string; value: number }> };
    const topReferrers: Array<{ name: string; value: number }> = [];

    // Referrer name resolution (best-effort)
    const topKeys = Array.from(referrerCounter.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

    for (const [key, value] of topKeys) {
      const [type, id] = key.split(":");
      topReferrers.push({ name: `${type}:${id}`, value });
    }

    const turnaroundByModality = Array.from(turnaroundByModalityMap.entries())
      .map(([type, v]) => ({ type, avgHours: v.count > 0 ? Math.round((v.sum / v.count) * 10) / 10 : 0 }))
      .sort((a, b) => b.avgHours - a.avgHours);

    const payload: ImagingAnalyticsResponse = {
      kpis: {
        totalScans,
        completedScans,
        pendingScans,
        revenueCents,
        refundsCents,
        netRevenueCents,
        avgReportHours,
        avgAcceptHours,
        utilizationPct,
        reportBacklog,
        scansChangePct,
        revenueChangePct,
        reportChangePct,
      },
      dailyTrend,
      modalityData,
      workflowBreakdown,
      statusBreakdown,
      peakHours,
      demographics,
      topReferrers,
      turnaroundByModality,
      ...(warnings.length ? { warnings } : {}),
    };

    return { ok: true, data: payload };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Unknown error" };
  }
}

// ---------------------- ROUTER ----------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, error: "Missing Authorization header" }, 401);

  const env = await requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  let body: ReqBody | null = null;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    body = null;
  }

  const entityType = (body?.entityType || "") as EntityType;
  const entityId = String(body?.entityId || "").trim();

  if (!entityType || !["lab", "imaging", "pharmacy"].includes(entityType)) {
    return json({ ok: false, error: "Invalid entityType" }, 400);
  }
  if (!entityId || !isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);

  try {
    const { user } = await requireAuthedUser(env.url, env.anon, authHeader);

    const service = createClient(env.url, env.service, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    if (entityType === "lab") {
      const timeRange: TimeRange = (body?.timeRange || "30d") as TimeRange;
      const resp = await labAnalytics({
        service,
        userId: user.id,
        labCenterId: entityId,
        timeRange,
      });
      return json(resp, resp.ok ? 200 : resp.error === "Forbidden" ? 403 : 500);
    }

    if (entityType === "pharmacy") {
      const timeRange: TimeRange = (body?.timeRange || "30d") as TimeRange;
      const resp = await pharmacyAnalytics({
        service,
        userId: user.id,
        pharmacyId: entityId,
        timeRange,
      });
      return json(resp, resp.ok ? 200 : resp.error === "Forbidden" ? 403 : 500);
    }

    // imaging
    const days = clampInt(body?.days, 1, 365, 30);
    const resp = await imagingAnalytics({
      service,
      userId: user.id,
      centerId: entityId,
      days,
    });

    if (!resp.ok) {
      const status = resp.status ?? (resp.error === "Forbidden" ? 403 : 500);
      return json({ ok: false, error: resp.error }, status);
    }

    return json({ ok: true, ...resp.data }, 200);
  } catch (e: any) {
    const msg = String(e?.message || e || "");
    if (msg === "Unauthorized") return json({ ok: false, error: "Unauthorized" }, 401);
    return json({ ok: false, error: msg || "Unknown error" }, 500);
  }
});
