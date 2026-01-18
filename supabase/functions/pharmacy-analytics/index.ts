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

function toCents(n: unknown) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100);
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
  const { data: pharmacy, error: pErr } = await serviceClient
    .from("pharmacies")
    .select("id,admin_id")
    .eq("id", pharmacyId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (pharmacy?.admin_id === userId) return true;

  const { data: staff, error: sErr } = await serviceClient
    .from("pharmacy_staff")
    .select("id,status")
    .eq("pharmacy_id", pharmacyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (sErr) throw sErr;
  if (staff?.id && String(staff.status || "active") === "active") return true;

  // Super admin fallback (roles table)
  const { data: role, error: rErr } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (rErr) {
    // If roles table missing or RLS blocks, ignore and deny.
    return false;
  }

  return Boolean(role?.role);
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

  const days = daysFromRange(body?.timeRange);
  const now = new Date();
  const end = now;
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const prevEnd = start;
  const prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);

  const service = createClient(env.url, env.service);

  try {
    const allowed = await assertPharmacyAccess(service, userRes.user.id, pharmacyId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    const [{ data: orders, error: oErr }, { data: prevOrders, error: poErr }] = await Promise.all([
      service
        .from("fulfillment_orders")
        .select("id,pharmacy_id,status,total_amount,payment_status,created_at,ready_at,picked_up_at,updated_at,prescription_id")
        .eq("pharmacy_id", pharmacyId)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .limit(10000),
      service
        .from("fulfillment_orders")
        .select("id,pharmacy_id,status,total_amount,payment_status,created_at,ready_at,picked_up_at,updated_at,prescription_id")
        .eq("pharmacy_id", pharmacyId)
        .gte("created_at", prevStart.toISOString())
        .lt("created_at", prevEnd.toISOString())
        .limit(10000),
    ]);

    if (oErr) throw oErr;
    if (poErr) throw poErr;

    const orderRows = orders || [];
    const prevOrderRows = prevOrders || [];

    const isPaidOrCompleted = (o: any) => {
      const ps = String(o.payment_status || "").toLowerCase();
      const st = String(o.status || "").toLowerCase();
      return ps === "paid" || st === "completed";
    };

    const totalOrders = orderRows.length;
    const prevTotalOrders = prevOrderRows.length;

    const completedOrders = orderRows.filter((o) => String(o.status || "").toLowerCase() === "completed").length;

    const totalRevenueCents = orderRows.reduce((sum, o) => {
      if (!isPaidOrCompleted(o)) return sum;
      return sum + toCents(o.total_amount);
    }, 0);

    const prevRevenueCents = prevOrderRows.reduce((sum, o) => {
      if (!isPaidOrCompleted(o)) return sum;
      return sum + toCents(o.total_amount);
    }, 0);

    const revenueChangePct = prevRevenueCents > 0 ? ((totalRevenueCents - prevRevenueCents) / prevRevenueCents) * 100 : 0;
    const ordersChangePct = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0;

    // Avg fulfillment time (hrs): created_at -> ready_at/picked_up_at/updated_at (completed only)
    const completionDurationsHours = orderRows
      .filter((o) => String(o.status || "").toLowerCase() === "completed")
      .map((o) => {
        const created = new Date(o.created_at);
        const done = new Date(o.picked_up_at || o.ready_at || o.updated_at || o.created_at);
        const diff = (done.getTime() - created.getTime()) / (1000 * 60 * 60);
        return Number.isFinite(diff) ? Math.max(0, diff) : 0;
      })
      .filter((n) => n > 0);

    const avgFulfillmentHours = completionDurationsHours.length
      ? completionDurationsHours.reduce((s, v) => s + v, 0) / completionDurationsHours.length
      : 0;

    // Daily trend
    const dayMap: Record<string, { date: string; revenueCents: number; orders: number; completed: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = startOfDayUTC(new Date(end.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000));
      const key = dateKeyUTC(d);
      dayMap[key] = { date: key, revenueCents: 0, orders: 0, completed: 0 };
    }

    for (const o of orderRows) {
      const created = new Date(o.created_at);
      const key = dateKeyUTC(startOfDayUTC(created));
      if (!dayMap[key]) continue;
      dayMap[key].orders += 1;
      if (String(o.status || "").toLowerCase() === "completed") dayMap[key].completed += 1;
      if (isPaidOrCompleted(o)) dayMap[key].revenueCents += toCents(o.total_amount);
    }

    const dailyTrend = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    // Status breakdown
    const statusCounts = new Map<string, number>();
    for (const o of orderRows) {
      const st = String(o.status || "unknown").toLowerCase();
      statusCounts.set(st, (statusCounts.get(st) || 0) + 1);
    }
    const statusBreakdown = Array.from(statusCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Top medications (from prescriptions -> prescription_items)
    const rxIds = Array.from(
      new Set(orderRows.map((o) => o.prescription_id).filter((id) => typeof id === "string" && id.length > 0))
    ) as string[];

    let topMedications: Array<{ name: string; count: number; quantity: number; revenueCents: number }> = [];

    if (rxIds.length) {
      const { data: rxRows, error: rxErr } = await service
        .from("prescriptions")
        .select("id")
        .in("id", rxIds)
        .limit(10000);
      if (rxErr) throw rxErr;

      const rxIdSet = new Set((rxRows || []).map((r: any) => r.id));

      const { data: items, error: iErr } = await service
        .from("prescription_items")
        .select("prescription_id,medication_name,quantity")
        .in("prescription_id", Array.from(rxIdSet))
        .limit(20000);
      if (iErr) throw iErr;

      // Build per-order allocation based on quantity proportions
      const orderByRx = new Map<string, any>();
      for (const o of orderRows) {
        if (o.prescription_id) orderByRx.set(String(o.prescription_id), o);
      }

      const itemsByRx = new Map<string, Array<{ medication_name: string; quantity: number }>>();
      for (const it of items || []) {
        const rxId = String((it as any).prescription_id || "");
        if (!rxId) continue;
        const name = String((it as any).medication_name || "").trim() || "Unknown";
        const qty = Number((it as any).quantity || 0) || 0;
        if (!itemsByRx.has(rxId)) itemsByRx.set(rxId, []);
        itemsByRx.get(rxId)!.push({ medication_name: name, quantity: qty });
      }

      const agg = new Map<string, { count: number; quantity: number; revenueCents: number }>();

      for (const [rxId, its] of itemsByRx.entries()) {
        const o = orderByRx.get(rxId);
        const orderCents = o && isPaidOrCompleted(o) ? toCents(o.total_amount) : 0;

        const totalQty = its.reduce((s, x) => s + (Number(x.quantity) || 0), 0) || 0;

        for (const it of its) {
          const name = it.medication_name;
          const qty = Number(it.quantity) || 0;

          const share = totalQty > 0 ? qty / totalQty : 0;
          const revenueShareCents = Math.round(orderCents * share);

          const cur = agg.get(name) || { count: 0, quantity: 0, revenueCents: 0 };
          cur.count += 1;
          cur.quantity += qty;
          cur.revenueCents += revenueShareCents;
          agg.set(name, cur);
        }
      }

      topMedications = Array.from(agg.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenueCents - a.revenueCents || b.quantity - a.quantity || b.count - a.count)
        .slice(0, 8);
    }

    return json({
      ok: true,
      kpis: {
        totalRevenueCents,
        totalOrders,
        completedOrders,
        avgFulfillmentHours: Math.round(avgFulfillmentHours * 10) / 10,
        revenueChangePct: Math.round(revenueChangePct * 10) / 10,
        ordersChangePct: Math.round(ordersChangePct * 10) / 10,
      },
      dailyTrend,
      topMedications,
      statusBreakdown,
    });
  } catch (e: any) {
    console.error("pharmacy-analytics error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
