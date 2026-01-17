// File: supabase/functions/pharmacy-analytics/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = {
  pharmacyId: string;
  timeRange: "7d" | "30d" | "90d";
};

type Resp = {
  ok: boolean;
  error?: string;
  kpis?: {
    totalRevenueCents: number;
    totalOrders: number;
    totalPrescriptions: number;
    avgOrderValueCents: number;
    revenueChangePct: number;
    ordersChangePct: number;
  };
  dailyTrend?: Array<{ date: string; revenueCents: number; orders: number }>;
  topMedications?: Array<{ name: string; count: number; revenueCents: number }>;
  statusBreakdown?: Array<{ name: string; value: number }>;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function daysFromRange(r: string) {
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

function toCentsMoney(n: unknown) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100);
}

function safeLower(v: unknown) {
  return String(v ?? "").toLowerCase();
}

async function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" };
  }
  return { ok: true as const, url, anon, service };
}

async function assertPharmacyAccess(serviceClient: ReturnType<typeof createClient>, userId: string, pharmacyId: string) {
  const { data: pRow, error: pErr } = await serviceClient
    .from("pharmacies")
    .select("id,admin_id")
    .eq("id", pharmacyId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (pRow?.admin_id === userId) return true;

  const { data: staffRow, error: sErr } = await serviceClient
    .from("pharmacy_staff")
    .select("id")
    .eq("pharmacy_id", pharmacyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (sErr) throw sErr;

  return Boolean(staffRow?.id);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = await requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const authed = createClient(env.url, env.anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const pharmacyId = body?.pharmacyId;
  if (!pharmacyId) return json({ ok: false, error: "Missing pharmacyId" }, 400);

  const service = createClient(env.url, env.service);
  const allowed = await assertPharmacyAccess(service, userRes.user.id, pharmacyId);
  if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

  const days = daysFromRange(body.timeRange);
  const now = new Date();
  const end = now;
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const prevEnd = start;
  const prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    const [{ data: orders, error: oErr }, { data: prevOrders, error: poErr }] = await Promise.all([
      service
        .from("fulfillment_orders")
        .select("id,status,created_at,total_amount,payment_status,prescription_id")
        .eq("pharmacy_id", pharmacyId)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .limit(5000),
      service
        .from("fulfillment_orders")
        .select("id,status,created_at,total_amount,payment_status,prescription_id")
        .eq("pharmacy_id", pharmacyId)
        .gte("created_at", prevStart.toISOString())
        .lt("created_at", prevEnd.toISOString())
        .limit(5000),
    ]);

    if (oErr) throw oErr;
    if (poErr) throw poErr;

    const orderRows = orders || [];
    const prevOrderRows = prevOrders || [];

    // Optional: billing_transactions (if present). If missing/blocked, fallback to order totals.
    const [{ data: txs, error: tErr }, { data: prevTxs, error: ptErr }] = await Promise.all([
      service
        .from("billing_transactions")
        .select("amount,created_at,status,transaction_type")
        .eq("entity_type", "pharmacy")
        .eq("entity_id", pharmacyId)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .limit(5000),
      service
        .from("billing_transactions")
        .select("amount,created_at,status,transaction_type")
        .eq("entity_type", "pharmacy")
        .eq("entity_id", pharmacyId)
        .gte("created_at", prevStart.toISOString())
        .lt("created_at", prevEnd.toISOString())
        .limit(5000),
    ]);

    const txRows = tErr ? [] : (txs || []);
    const prevTxRows = ptErr ? [] : (prevTxs || []);

    const revenueCentsFromTx = txRows.reduce((sum, r) => {
      const status = String((r as any).status || "");
      if (status !== "completed") return sum;
      const type = safeLower((r as any).transaction_type);
      const amt = toCentsMoney((r as any).amount);
      if (type.includes("refund") || amt < 0) return sum + amt;
      return sum + amt;
    }, 0);

    const revenueCentsFromOrders = orderRows.reduce((sum, r) => sum + toCentsMoney((r as any).total_amount), 0);
    const totalRevenueCents = revenueCentsFromTx !== 0 ? revenueCentsFromTx : revenueCentsFromOrders;

    const prevRevenueCentsFromTx = prevTxRows.reduce((sum, r) => {
      const status = String((r as any).status || "");
      if (status !== "completed") return sum;
      const type = safeLower((r as any).transaction_type);
      const amt = toCentsMoney((r as any).amount);
      if (type.includes("refund") || amt < 0) return sum + amt;
      return sum + amt;
    }, 0);

    const prevRevenueCentsFromOrders = prevOrderRows.reduce((sum, r) => sum + toCentsMoney((r as any).total_amount), 0);
    const prevTotalRevenueCents = prevRevenueCentsFromTx !== 0 ? prevRevenueCentsFromTx : prevRevenueCentsFromOrders;

    const totalOrders = orderRows.length;
    const prevTotalOrders = prevOrderRows.length;

    const revenueChangePct =
      prevTotalRevenueCents > 0 ? ((totalRevenueCents - prevTotalRevenueCents) / prevTotalRevenueCents) * 100 : 0;

    const ordersChangePct = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0;

    const totalPrescriptions = orderRows.filter((o) => safeLower((o as any).status) === "completed").length;

    const avgOrderValueCents = totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;

    // Daily trend (use orders totals for consistency)
    const dayMap: Record<string, { date: string; revenueCents: number; orders: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = startOfDayUTC(new Date(end.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000));
      const key = dateKeyUTC(d);
      dayMap[key] = { date: key, revenueCents: 0, orders: 0 };
    }

    for (const o of orderRows) {
      const created = new Date((o as any).created_at);
      const key = dateKeyUTC(startOfDayUTC(created));
      if (!dayMap[key]) continue;
      dayMap[key].orders += 1;
      dayMap[key].revenueCents += toCentsMoney((o as any).total_amount);
    }

    const dailyTrend = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    for (const o of orderRows) {
      const s = safeLower((o as any).status) || "unknown";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }
    const statusBreakdown = Object.entries(statusCounts)
      .map(([k, v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1),
        value: v,
      }))
      .sort((a, b) => b.value - a.value);

    // Top medications (approximate revenue allocation per order by item quantity)
    const prescriptionIds = Array.from(
      new Set(orderRows.map((o) => (o as any).prescription_id).filter(Boolean)),
    ) as string[];

    type ItemRow = { prescription_id: string; medication_name: string; quantity: number };

    const topMedications: Array<{ name: string; count: number; revenueCents: number }> = [];

    if (prescriptionIds.length) {
      const { data: items, error: iErr } = await service
        .from("prescription_items")
        .select("prescription_id,medication_name,quantity")
        .in("prescription_id", prescriptionIds)
        .limit(20000);

      if (iErr) throw iErr;

      const itemsRows = (items || []) as any as ItemRow[];

      const orderByRx = new Map<string, { totalCents: number }>();
      for (const o of orderRows) {
        const rx = (o as any).prescription_id;
        if (!rx) continue;
        orderByRx.set(rx, { totalCents: toCentsMoney((o as any).total_amount) });
      }

      const totalQtyByRx = new Map<string, number>();
      for (const it of itemsRows) {
        const q = Number(it.quantity || 0);
        if (!it.prescription_id) continue;
        totalQtyByRx.set(it.prescription_id, (totalQtyByRx.get(it.prescription_id) || 0) + Math.max(0, q));
      }

      const agg = new Map<string, { count: number; revenueCents: number }>();
      for (const it of itemsRows) {
        const name = String(it.medication_name || "").trim() || "Unknown medication";
        const q = Math.max(0, Number(it.quantity || 0));
        const rx = it.prescription_id;
        const order = orderByRx.get(rx);
        const denom = totalQtyByRx.get(rx) || 0;

        let alloc = 0;
        if (order && denom > 0) {
          alloc = Math.round((order.totalCents * q) / denom);
        }

        const cur = agg.get(name) || { count: 0, revenueCents: 0 };
        cur.count += q;
        cur.revenueCents += alloc;
        agg.set(name, cur);
      }

      topMedications.push(
        ...Array.from(agg.entries())
          .map(([name, v]) => ({ name, count: v.count, revenueCents: v.revenueCents }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      );
    }

    const resp: Resp = {
      ok: true,
      kpis: {
        totalRevenueCents,
        totalOrders,
        totalPrescriptions,
        avgOrderValueCents,
        revenueChangePct: Math.round(revenueChangePct * 10) / 10,
        ordersChangePct: Math.round(ordersChangePct * 10) / 10,
      },
      dailyTrend,
      topMedications,
      statusBreakdown: statusBreakdown.length ? statusBreakdown : [{ name: "No data", value: 1 }],
    };

    return json(resp);
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to load pharmacy analytics" }, 500);
  }
});
