// File: supabase/functions/pharmacy-analytics/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = {
  pharmacyId: string;
  timeRangeDays?: number;
};

type TrendRow = { date: string; revenueCents: number; orders: number };
type StatusRow = { name: string; value: number };
type MedicationRow = { name: string; count: number; revenueCents: number };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function badRequest(msg: string) {
  return json({ ok: false, error: msg }, 400);
}

function unauthorized(msg = "Unauthorized") {
  return json({ ok: false, error: msg }, 401);
}

function asInt(v: unknown, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.trunc(n));
}

function dayKey(d: Date) {
  // YYYY-MM-DD
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateAddDays(d: Date, days: number) {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function diffHours(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return ms / (1000 * 60 * 60);
}

function safePctChange(curr: number, prev: number) {
  if (!Number.isFinite(curr) || !Number.isFinite(prev)) return 0;
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / prev) * 100;
}

async function getAuthedUserId(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return { ok: false as const, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" };

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return { ok: false as const, error: "Unauthorized" };
  return { ok: true as const, userId: data.user.id };
}

function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

async function ensurePharmacyAccess(supabase: ReturnType<typeof createClient>, userId: string, pharmacyId: string) {
  // Admin
  const admin = await supabase
    .from("pharmacies")
    .select("id")
    .eq("id", pharmacyId)
    .eq("admin_id", userId)
    .maybeSingle();

  if (admin.data?.id) return true;

  // Staff
  const staff = await supabase
    .from("pharmacy_staff")
    .select("id")
    .eq("pharmacy_id", pharmacyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return Boolean(staff.data?.id);
}

type FulfillmentOrderRow = {
  id: string;
  created_at: string;
  status: string | null;
  total_amount: number | null;
  prescription_id: string;
  ready_at: string | null;
  picked_up_at: string | null;
};

type PrescriptionItemRow = {
  prescription_id: string;
  medication_name: string;
  quantity: number;
};

function dollarsToCents(v: number | null | undefined) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

async function fetchOrders(
  supabase: ReturnType<typeof createClient>,
  pharmacyId: string,
  startIso: string,
  endIso: string,
) {
  const { data, error } = await supabase
    .from("fulfillment_orders")
    .select("id, created_at, status, total_amount, prescription_id, ready_at, picked_up_at")
    .eq("pharmacy_id", pharmacyId)
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: true })
    .limit(5000);

  if (error) throw error;
  return (data || []) as FulfillmentOrderRow[];
}

async function fetchPrescriptionItems(
  supabase: ReturnType<typeof createClient>,
  prescriptionIds: string[],
) {
  if (!prescriptionIds.length) return [] as PrescriptionItemRow[];

  const uniq = Array.from(new Set(prescriptionIds));
  const chunks: string[][] = [];
  for (let i = 0; i < uniq.length; i += 500) chunks.push(uniq.slice(i, i + 500));

  const out: PrescriptionItemRow[] = [];
  for (const ch of chunks) {
    const { data, error } = await supabase
      .from("prescription_items")
      .select("prescription_id, medication_name, quantity")
      .in("prescription_id", ch)
      .limit(10000);
    if (error) throw error;
    out.push(...((data || []) as PrescriptionItemRow[]));
  }
  return out;
}

function buildTrend(
  start: Date,
  days: number,
  orders: FulfillmentOrderRow[],
) {
  const buckets = new Map<string, { revenueCents: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    const k = dayKey(dateAddDays(start, i));
    buckets.set(k, { revenueCents: 0, orders: 0 });
  }

  for (const o of orders) {
    const created = new Date(o.created_at);
    const k = dayKey(created);
    const b = buckets.get(k);
    if (!b) continue;
    b.orders += 1;
    b.revenueCents += dollarsToCents(o.total_amount);
  }

  const out: TrendRow[] = [];
  for (let i = 0; i < days; i++) {
    const d = dateAddDays(start, i);
    const k = dayKey(d);
    const b = buckets.get(k)!;
    out.push({ date: k, revenueCents: b.revenueCents, orders: b.orders });
  }
  return out;
}

function buildStatusDist(orders: FulfillmentOrderRow[]) {
  const map = new Map<string, number>();
  for (const o of orders) {
    const s = (o.status || "unknown").toLowerCase();
    map.set(s, (map.get(s) || 0) + 1);
  }
  const out: StatusRow[] = Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  return out;
}

function buildAvgFulfillmentHours(orders: FulfillmentOrderRow[]) {
  const durations: number[] = [];
  for (const o of orders) {
    const start = new Date(o.created_at);
    const endStr = o.ready_at || o.picked_up_at;
    if (!endStr) continue;
    const end = new Date(endStr);
    const h = diffHours(start, end);
    if (Number.isFinite(h) && h >= 0) durations.push(h);
  }
  if (!durations.length) return 0;
  const sum = durations.reduce((a, b) => a + b, 0);
  return sum / durations.length;
}

function buildTopMedications(
  orders: FulfillmentOrderRow[],
  items: PrescriptionItemRow[],
  limit = 10,
) {
  const byPrescription = new Map<string, PrescriptionItemRow[]>();
  for (const it of items) {
    const arr = byPrescription.get(it.prescription_id) || [];
    arr.push(it);
    byPrescription.set(it.prescription_id, arr);
  }

  const agg = new Map<string, { count: number; revenueCents: number }>();

  for (const o of orders) {
    const arr = byPrescription.get(o.prescription_id) || [];
    if (!arr.length) continue;

    const totalUnits = arr.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const orderRevenueCents = dollarsToCents(o.total_amount);

    for (const it of arr) {
      const qty = Number(it.quantity) || 0;
      if (!qty) continue;
      const name = String(it.medication_name || "Unknown");
      const share = totalUnits > 0 ? qty / totalUnits : 0;
      const rev = Math.round(orderRevenueCents * share);
      const prev = agg.get(name) || { count: 0, revenueCents: 0 };
      prev.count += qty;
      prev.revenueCents += rev;
      agg.set(name, prev);
    }
  }

  const out: MedicationRow[] = Array.from(agg.entries())
    .map(([name, v]) => ({ name, count: v.count, revenueCents: v.revenueCents }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return badRequest("POST required");

  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader) return unauthorized();

  const authed = await getAuthedUserId(authHeader);
  if (!authed.ok) return unauthorized(authed.error);

  const supabase = getServiceClient();
  if (!supabase) return json({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return badRequest("Invalid JSON");
  }

  const pharmacyId = String(body?.pharmacyId || "").trim();
  if (!pharmacyId) return badRequest("pharmacyId is required");

  const timeRangeDays = Math.min(365, asInt(body?.timeRangeDays, 30));

  const allowed = await ensurePharmacyAccess(supabase, authed.userId, pharmacyId);
  if (!allowed) return unauthorized("Not authorized for this pharmacy");

  // Current period: [now - N days, now)
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const start = dateAddDays(end, -timeRangeDays);
  const prevEnd = start;
  const prevStart = dateAddDays(prevEnd, -timeRangeDays);

  try {
    const [currOrders, prevOrders] = await Promise.all([
      fetchOrders(supabase, pharmacyId, start.toISOString(), end.toISOString()),
      fetchOrders(supabase, pharmacyId, prevStart.toISOString(), prevEnd.toISOString()),
    ]);

    const currRevenueCents = currOrders.reduce((sum, o) => sum + dollarsToCents(o.total_amount), 0);
    const prevRevenueCents = prevOrders.reduce((sum, o) => sum + dollarsToCents(o.total_amount), 0);

    const currPrescriptions = new Set(currOrders.map((o) => o.prescription_id)).size;
    const prevPrescriptions = new Set(prevOrders.map((o) => o.prescription_id)).size;

    const avgFulfillmentHours = buildAvgFulfillmentHours(currOrders);

    const revenueTrend = buildTrend(start, timeRangeDays, currOrders);
    const ordersByStatus = buildStatusDist(currOrders);

    const currPrescriptionIds = currOrders.map((o) => o.prescription_id).filter(Boolean);
    const items = await fetchPrescriptionItems(supabase, currPrescriptionIds);
    const topMedications = buildTopMedications(currOrders, items, 10);

    return json({
      ok: true,
      timeRangeDays,
      totals: {
        revenueCents: currRevenueCents,
        orders: currOrders.length,
        prescriptions: currPrescriptions,
        avgFulfillmentHours,
        revenueChangePct: safePctChange(currRevenueCents, prevRevenueCents),
        ordersChangePct: safePctChange(currOrders.length, prevOrders.length),
        prescriptionsChangePct: safePctChange(currPrescriptions, prevPrescriptions),
      },
      revenueTrend,
      ordersByStatus,
      topMedications,
    });
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to compute analytics" }, 500);
  }
});
