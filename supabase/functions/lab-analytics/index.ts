// supabase/functions/lab-analytics/index.ts
// File: supabase/functions/lab-analytics/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = {
  labCenterId: string;
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

async function assertLabAccess(serviceClient: ReturnType<typeof createClient>, userId: string, labCenterId: string) {
  const { data: center, error: cErr } = await serviceClient
    .from("lab_centers")
    .select("id,admin_id")
    .eq("id", labCenterId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (center?.admin_id === userId) return true;

  const { data: staff, error: sErr } = await serviceClient
    .from("lab_staff")
    .select("id")
    .eq("lab_center_id", labCenterId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (sErr) throw sErr;

  return Boolean(staff?.id);
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

  const labCenterId = body?.labCenterId;
  if (!labCenterId) return json({ ok: false, error: "Missing labCenterId" }, 400);

  const service = createClient(env.url, env.service);
  const allowed = await assertLabAccess(service, userRes.user.id, labCenterId);
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

    if (oErr) throw oErr;
    if (poErr) throw poErr;

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

    const revenueCentsFromTx = txRows.reduce((sum, r) => {
      const status = String((r as any).status || "");
      if (status !== "completed") return sum;
      const type = String((r as any).transaction_type || "").toLowerCase();
      const amt = toCents((r as any).amount);
      if (type.includes("refund") || amt < 0) return sum + amt;
      return sum + amt;
    }, 0);

    const revenueCentsFromOrders = orderRows.reduce((sum, r) => sum + toCents((r as any).total_amount), 0);
    const totalRevenueCents = revenueCentsFromTx !== 0 ? revenueCentsFromTx : revenueCentsFromOrders;

    const prevRevenueCentsFromTx = prevTxRows.reduce((sum, r) => {
      const status = String((r as any).status || "");
      if (status !== "completed") return sum;
      const type = String((r as any).transaction_type || "").toLowerCase();
      const amt = toCents((r as any).amount);
      if (type.includes("refund") || amt < 0) return sum + amt;
      return sum + amt;
    }, 0);

    const prevRevenueCentsFromOrders = prevOrderRows.reduce((sum, r) => sum + toCents((r as any).total_amount), 0);
    const prevTotalRevenueCents = prevRevenueCentsFromTx !== 0 ? prevRevenueCentsFromTx : prevRevenueCentsFromOrders;

    const totalTests = orderRows.length;
    const prevTotalTests = prevOrderRows.length;

    const revenueChangePct =
      prevTotalRevenueCents > 0 ? ((totalRevenueCents - prevTotalRevenueCents) / prevTotalRevenueCents) * 100 : 0;

    const testsChangePct = prevTotalTests > 0 ? ((totalTests - prevTotalTests) / prevTotalTests) * 100 : 0;

    const completed = orderRows.filter((o) => (o as any).completed_at);
    const avgTurnaroundHours =
      completed.length === 0
        ? 0
        : completed.reduce((sum, o) => {
            const created = new Date((o as any).created_at);
            const done = new Date((o as any).completed_at);
            return sum + Math.max(0, (done.getTime() - created.getTime()) / (1000 * 60 * 60));
          }, 0) / completed.length;

    const cancelledCount = orderRows.filter((o) => String((o as any).status || "") === "cancelled").length;
    const recollectionRatePct = totalTests > 0 ? (cancelledCount / totalTests) * 100 : 0;

    const dayCount = days;
    const dayMap: Record<string, { date: string; revenueCents: number; tests: number }> = {};
    for (let i = 0; i < dayCount; i++) {
      const d = startOfDayUTC(new Date(end.getTime() - (dayCount - 1 - i) * 24 * 60 * 60 * 1000));
      const key = dateKeyUTC(d);
      dayMap[key] = { date: key, revenueCents: 0, tests: 0 };
    }

    for (const o of orderRows) {
      const created = new Date((o as any).created_at);
      const key = dateKeyUTC(startOfDayUTC(created));
      if (dayMap[key]) dayMap[key].tests += 1;
    }

    if (txRows.length) {
      for (const t of txRows) {
        const status = String((t as any).status || "");
        if (status !== "completed") continue;
        const created = new Date((t as any).created_at);
        const key = dateKeyUTC(startOfDayUTC(created));
        if (!dayMap[key]) continue;
        dayMap[key].revenueCents += toCents((t as any).amount);
      }
    } else {
      for (const o of orderRows) {
        const created = new Date((o as any).created_at);
        const key = dateKeyUTC(startOfDayUTC(created));
        if (!dayMap[key]) continue;
        dayMap[key].revenueCents += toCents((o as any).total_amount);
      }
    }

    const dailyTrend = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    const statusCounts: Record<string, number> = {};
    for (const o of orderRows) {
      const s = String((o as any).status || "unknown");
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }
    const statusBreakdown = Object.entries(statusCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const orderIds = orderRows.map((o) => (o as any).id);
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

    return json({
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
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg }, 500);
  }
});
