// File: supabase/functions/clinic-analytics/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = {
  clinicId: string;
  timeRange?: "7d" | "30d" | "90d";
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function daysFromRange(r?: string) {
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

async function assertClinicAccess(
  serviceClient: any,
  userId: string,
  clinicId: string,
) {
  const { data: practice, error: pErr } = await serviceClient
    .from("practices")
    .select("id, admin_id")
    .eq("id", clinicId)
    .maybeSingle();

  if (pErr) throw pErr;
  if ((practice as any)?.admin_id === userId) return true;

  const { data: staff, error: sErr } = await serviceClient
    .from("practice_staff")
    .select("id, status")
    .eq("practice_id", clinicId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sErr) throw sErr;
  if ((staff as any)?.id && String((staff as any).status || "active") === "active") return true;

  const { data: role, error: rErr } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();

  if (rErr) return false;
  return Boolean((role as any)?.role);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
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

  const clinicId = String(body?.clinicId || "").trim();
  if (!clinicId) return json({ ok: false, error: "Missing clinicId" }, 400);

  const days = daysFromRange(body?.timeRange);
  const now = new Date();
  const end = now;
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const prevEnd = start;
  const prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);

  const service = createClient(env.url, env.service);

  try {
    const allowed = await assertClinicAccess(service, userRes.user.id, clinicId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    const [{ data: appts, error: aErr }, { data: prevAppts, error: paErr }] = await Promise.all([
      service
        .from("appointments")
        .select("id, created_at, status, patient_id")
        .eq("practice_id", clinicId)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .limit(20000),
      service
        .from("appointments")
        .select("id, created_at, status, patient_id")
        .eq("practice_id", clinicId)
        .gte("created_at", prevStart.toISOString())
        .lt("created_at", prevEnd.toISOString())
        .limit(20000),
    ]);

    if (aErr) throw aErr;
    if (paErr) throw paErr;

    const aptRows = (appts || []) as any[];
    const prevAptRows = (prevAppts || []) as any[];

    const totalAppointments = aptRows.length;
    const completedAppointments = aptRows.filter((a) => String(a.status || "") === "completed").length;
    const canceledAppointments = aptRows.filter((a) => String(a.status || "") === "canceled").length;
    const uniquePatients = new Set(aptRows.map((a) => a.patient_id).filter(Boolean)).size;

    const prevTotalAppointments = prevAptRows.length;
    const prevCompletedAppointments = prevAptRows.filter((a) => String(a.status || "") === "completed").length;
    const prevUniquePatients = new Set(prevAptRows.map((a) => a.patient_id).filter(Boolean)).size;

    const [{ data: txs, error: tErr }, { data: prevTxs, error: ptErr }] = await Promise.all([
      service
        .from("billing_transactions")
        .select("amount_cents, currency, status, created_at, transaction_type")
        .eq("entity_type", "clinic")
        .eq("entity_id", clinicId)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .limit(20000),
      service
        .from("billing_transactions")
        .select("amount_cents, currency, status, created_at, transaction_type")
        .eq("entity_type", "clinic")
        .eq("entity_id", clinicId)
        .gte("created_at", prevStart.toISOString())
        .lt("created_at", prevEnd.toISOString())
        .limit(20000),
    ]);

    if (tErr) throw tErr;
    if (ptErr) throw ptErr;

    const txRows = (txs || []) as any[];
    const prevTxRows = (prevTxs || []) as any[];

    const currency = (txRows.find((t) => t.currency)?.currency || "usd") as string;

    const totalRevenueCents = txRows.reduce((sum, t) => {
      const status = String(t.status || "").toLowerCase();
      if (status !== "completed") return sum;
      const type = String(t.transaction_type || "charge").toLowerCase();
      const amt = Number(t.amount_cents || 0);
      if (type === "refund") return sum - Math.abs(amt);
      return sum + amt;
    }, 0);

    const prevRevenueCents = prevTxRows.reduce((sum, t) => {
      const status = String(t.status || "").toLowerCase();
      if (status !== "completed") return sum;
      const type = String(t.transaction_type || "charge").toLowerCase();
      const amt = Number(t.amount_cents || 0);
      if (type === "refund") return sum - Math.abs(amt);
      return sum + amt;
    }, 0);

    const revenueChangePct =
      prevRevenueCents !== 0 ? ((totalRevenueCents - prevRevenueCents) / Math.abs(prevRevenueCents)) * 100 : 0;
    const apptChangePct =
      prevTotalAppointments !== 0 ? ((totalAppointments - prevTotalAppointments) / Math.abs(prevTotalAppointments)) * 100 : 0;
    const patientsChangePct =
      prevUniquePatients !== 0 ? ((uniquePatients - prevUniquePatients) / Math.abs(prevUniquePatients)) * 100 : 0;

    const dayMap: Record<string, { date: string; appointments: number; completed: number; revenue_cents: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = startOfDayUTC(new Date(end.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000));
      const key = dateKeyUTC(d);
      dayMap[key] = { date: key, appointments: 0, completed: 0, revenue_cents: 0 };
    }

    for (const a of aptRows) {
      const created = new Date(a.created_at);
      const key = dateKeyUTC(startOfDayUTC(created));
      if (!dayMap[key]) continue;
      dayMap[key].appointments += 1;
      if (String(a.status || "") === "completed") dayMap[key].completed += 1;
    }

    for (const t of txRows) {
      const status = String(t.status || "").toLowerCase();
      if (status !== "completed") continue;
      const created = new Date(t.created_at);
      const key = dateKeyUTC(startOfDayUTC(created));
      if (!dayMap[key]) continue;
      const type = String(t.transaction_type || "charge").toLowerCase();
      const amt = Number(t.amount_cents || 0);
      if (type === "refund") dayMap[key].revenue_cents -= Math.abs(amt);
      else dayMap[key].revenue_cents += amt;
    }

    const dailyTrend = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    return json({
      ok: true,
      currency,
      kpis: {
        totalRevenueCents,
        totalAppointments,
        completedAppointments,
        canceledAppointments,
        uniquePatients,
        revenueChangePct: Math.round(revenueChangePct * 10) / 10,
        appointmentsChangePct: Math.round(apptChangePct * 10) / 10,
        patientsChangePct: Math.round(patientsChangePct * 10) / 10,
        completionRatePct: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0,
      },
      dailyTrend,
      previous: {
        totalRevenueCents: prevRevenueCents,
        totalAppointments: prevTotalAppointments,
        completedAppointments: prevCompletedAppointments,
        uniquePatients: prevUniquePatients,
      },
    });
  } catch (e: any) {
    console.error("clinic-analytics error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
