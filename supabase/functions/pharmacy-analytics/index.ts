// File: supabase/functions/pharmacy-analytics/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TimeRange = "7d" | "30d" | "90d";

type ReqBody = {
  pharmacyId: string;
  timeRange?: TimeRange;
};

type AnalyticsResp = {
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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function daysFromTimeRange(tr: TimeRange): number {
  if (tr === "30d") return 30;
  if (tr === "90d") return 90;
  return 7;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function requireAuthedUser(
  supabaseUrl: string,
  anonKey: string,
  authHeader: string | null,
) {
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) throw new Error("Unauthorized");
  return { userClient, user: data.user };
}

async function ensurePharmacyAccess(
  service: ReturnType<typeof createClient>,
  userId: string,
  pharmacyId: string,
) {
  // Admin access
  const { data: ph } = await service
    .from("pharmacies")
    .select("id,admin_id")
    .eq("id", pharmacyId)
    .maybeSingle();

  if ((ph as any)?.admin_id === userId) return true;

  // Staff access
  const { data: staffRow } = await service
    .from("pharmacy_staff")
    .select("id,status,pharmacy_id")
    .eq("pharmacy_id", pharmacyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return Boolean(staffRow);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" } satisfies AnalyticsResp, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ ok: false, error: "Missing Supabase env" } satisfies AnalyticsResp, 500);
    }

    const authHeader = req.headers.get("authorization");
    const { user } = await requireAuthedUser(supabaseUrl, anonKey, authHeader);

    const body = (await req.json().catch(() => null)) as ReqBody | null;
    if (!body?.pharmacyId) return json({ ok: false, error: "pharmacyId is required" } satisfies AnalyticsResp, 400);

    const timeRange: TimeRange = body.timeRange ?? "7d";
    const days = daysFromTimeRange(timeRange);

    const service = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    const allowed = await ensurePharmacyAccess(service, user.id, body.pharmacyId);
    if (!allowed) return json({ ok: false, error: "Forbidden" } satisfies AnalyticsResp, 403);

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - days);

    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);

    // Pull fulfillment orders for both current + previous windows (single query)
    const { data: orders, error: oErr } = await service
      .from("fulfillment_orders")
      .select("id,created_at,status,total_amount,prescription_id")
      .eq("pharmacy_id", body.pharmacyId)
      .gte("created_at", prevStart.toISOString())
      .order("created_at", { ascending: true });

    if (oErr) throw oErr;

    const all = (orders || []) as Array<{
      id: string;
      created_at: string;
      status: string | null;
      total_amount: number | null;
      prescription_id: string;
    }>;

    const inCurrent = (dt: Date) => dt >= start && dt <= now;
    const inPrev = (dt: Date) => dt >= prevStart && dt <= prevEnd;

    const currentOrders = [];
    const prevOrders = [];
    for (const o of all) {
      const dt = new Date(o.created_at);
      if (inCurrent(dt)) currentOrders.push(o);
      else if (inPrev(dt)) prevOrders.push(o);
    }

    const sumRevenue = (arr: typeof all) => arr.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    const currentRevenue = sumRevenue(currentOrders as any);
    const prevRevenue = sumRevenue(prevOrders as any);

    const revenueChangePct = prevRevenue > 0 ? round2(((currentRevenue - prevRevenue) / prevRevenue) * 100) : currentRevenue > 0 ? 100 : 0;
    const ordersChangePct = prevOrders.length > 0 ? round2(((currentOrders.length - prevOrders.length) / prevOrders.length) * 100) : currentOrders.length > 0 ? 100 : 0;

    const totalOrders = currentOrders.length;
    const totalRevenue = round2(currentRevenue);
    const avgOrderValue = totalOrders > 0 ? round2(currentRevenue / totalOrders) : 0;

    // "Prescriptions filled": treat completed orders as filled
    const totalPrescriptionsFilled = currentOrders.filter((o) => (o.status || "").toLowerCase() === "completed").length;

    // Daily trend
    const buckets = new Map<string, { revenue: number; orders: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      buckets.set(isoDate(d), { revenue: 0, orders: 0 });
    }
    for (const o of currentOrders as any) {
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

    // Status breakdown
    const statusCounts = new Map<string, number>();
    for (const o of currentOrders as any) {
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

    // Top medications (best-effort): aggregate prescription_items for prescriptions in current orders
    const prescIds = Array.from(new Set((currentOrders as any).map((o: any) => o.prescription_id))).filter(Boolean);
    let topMedications: Array<{ name: string; count: number; revenue: number }> = [];

    if (prescIds.length) {
      const { data: items, error: iErr } = await service
        .from("prescription_items")
        .select("prescription_id, medication_name, quantity")
        .in("prescription_id", prescIds)
        .limit(5000);

      if (!iErr && items?.length) {
        const revByPrescription = new Map<string, number>();
        for (const o of currentOrders as any) {
          revByPrescription.set(o.prescription_id, (revByPrescription.get(o.prescription_id) || 0) + (Number(o.total_amount) || 0));
        }

        const medAgg = new Map<string, { count: number; revenue: number }>();
        for (const it of items as any[]) {
          const name = (it.medication_name || "Unknown").toString();
          const qty = Number(it.quantity) || 0;

          // Allocate prescription revenue proportionally by item qty share (simple heuristic)
          const prescRev = revByPrescription.get(it.prescription_id) || 0;

          const cur = medAgg.get(name) || { count: 0, revenue: 0 };
          cur.count += qty > 0 ? qty : 1;
          cur.revenue += prescRev * 0.0; // default 0; we’ll allocate below with second pass
          medAgg.set(name, cur);
        }

        // Better allocation: divide per prescription across its items equally
        const itemsByPresc = new Map<string, any[]>();
        for (const it of items as any[]) {
          const arr = itemsByPresc.get(it.prescription_id) || [];
          arr.push(it);
          itemsByPresc.set(it.prescription_id, arr);
        }

        for (const [pid, arr] of itemsByPresc.entries()) {
          const prescRev = revByPrescription.get(pid) || 0;
          const perItem = arr.length ? prescRev / arr.length : 0;
          for (const it of arr) {
            const name = (it.medication_name || "Unknown").toString();
            const cur = medAgg.get(name) || { count: 0, revenue: 0 };
            cur.revenue += perItem;
            medAgg.set(name, cur);
          }
        }

        topMedications = Array.from(medAgg.entries())
          .map(([name, v]) => ({ name, count: v.count, revenue: round2(v.revenue) }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
      }
    }

    const resp: AnalyticsResp = {
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

    return json(resp);
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Unknown error" } satisfies AnalyticsResp, 500);
  }
});
