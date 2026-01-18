// File: supabase/functions/practice-analytics/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = {
  practiceId: string;
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

async function assertPracticeAccess(serviceClient: ReturnType<typeof createClient>, userId: string, practiceId: string) {
  const { data: practice, error: pErr } = await serviceClient
    .from("practices")
    .select("id,admin_id")
    .eq("id", practiceId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (practice?.admin_id === userId) return true;

  const { data: staff, error: sErr } = await serviceClient
    .from("practice_staff")
    .select("id,status")
    .eq("practice_id", practiceId)
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

  const practiceId = body?.practiceId;
  if (!practiceId) return json({ ok: false, error: "Missing practiceId" }, 400);

  const days = daysFromRange(body?.timeRange);
  const now = new Date();
  const end = now;
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const prevEnd = start;
  const prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);

  const service = createClient(env.url, env.service);
  try {
    const allowed = await assertPracticeAccess(service, userRes.user.id, practiceId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    const [{ data: appts, error: aErr }, { data: prevAppts, error: paErr }] = await Promise.all([
      service
        .from("appointments")
        .select("id,appointment_date,start_time,status,created_at,patient_id")
        .eq("practice_id", practiceId)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .limit(10000),
      service
        .from("appointments")
        .select("id,appointment_date,start_time,status,created_at,patient_id")
        .eq("practice_id", practiceId)
        .gte("created_at", prevStart.toISOString())
        .lt("created_at", prevEnd.toISOString())
        .limit(10000),
    ]);

    if (aErr) throw aErr;
    if (paErr) throw paErr;

    const aptRows = appts || [];
    const prevAptRows = prevAppts || [];

    const totalBookings = aptRows.filter((a) => ["confirmed", "completed"].includes(String((a as any).status || ""))).length;
    const prevTotalBookings = prevAptRows.filter((a) => ["confirmed", "completed"].includes(String((a as any).status || ""))).length;

    const completed = aptRows.filter((a) => String((a as any).status || "") === "completed");
    const cancelled = aptRows.filter((a) => String((a as any).status || "") === "canceled").length;

    // Patient retention: completed patients with 2+ completed visits in last 180 days
    const retentionWindowStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const { data: completedVisits, error: cvErr } = await service
      .from("appointments")
      .select("patient_id")
      .eq("practice_id", practiceId)
      .eq("status", "completed")
      .gte("appointment_date", retentionWindowStart.toISOString().slice(0, 10))
      .limit(20000);
    if (cvErr) throw cvErr;

    const patientVisitCounts = new Map<string, number>();
    (completedVisits || []).forEach((r: any) => {
      if (!r.patient_id) return;
      patientVisitCounts.set(r.patient_id, (patientVisitCounts.get(r.patient_id) || 0) + 1);
    });

    const returning = Array.from(patientVisitCounts.values()).filter((c) => c > 1).length;
    const totalPatients = patientVisitCounts.size;
    const patientRetentionPct = totalPatients > 0 ? (returning / totalPatients) * 100 : 0;

    // No-show rate: canceled / total in range
    const totalCount = aptRows.length;
    const noShowRatePct = totalCount > 0 ? (cancelled / totalCount) * 100 : 0;

    // Avg booking lead time (minutes): (scheduled datetime - created_at)
    const leadMinutes = completed
      .map((a: any) => {
        const created = new Date(a.created_at);
        const date = String(a.appointment_date);
        const time = String(a.start_time);
        const scheduled = new Date(`${date}T${time}Z`);
        const diff = (scheduled.getTime() - created.getTime()) / (1000 * 60);
        return Number.isFinite(diff) ? Math.max(0, diff) : 0;
      })
      .filter((n) => n >= 0);

    const avgLeadTimeMinutes = leadMinutes.length ? leadMinutes.reduce((s, v) => s + v, 0) / leadMinutes.length : 0;

    // Revenue from payments in range (created_at)
    const [{ data: pays, error: payErr }, { data: prevPays, error: ppayErr }] = await Promise.all([
      service
        .from("payments")
        .select("amount,status,created_at")
        .eq("practice_id", practiceId)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .limit(10000),
      service
        .from("payments")
        .select("amount,status,created_at")
        .eq("practice_id", practiceId)
        .gte("created_at", prevStart.toISOString())
        .lt("created_at", prevEnd.toISOString())
        .limit(10000),
    ]);

    if (payErr) throw payErr;
    if (ppayErr) throw ppayErr;

    const payRows = pays || [];
    const prevPayRows = prevPays || [];

    const totalRevenueCents = payRows.reduce((sum, p) => {
      const status = String((p as any).status || "").toLowerCase();
      if (status !== "paid") return sum;
      return sum + toCents((p as any).amount);
    }, 0);

    const prevRevenueCents = prevPayRows.reduce((sum, p) => {
      const status = String((p as any).status || "").toLowerCase();
      if (status !== "paid") return sum;
      return sum + toCents((p as any).amount);
    }, 0);

    const revenueChangePct = prevRevenueCents > 0 ? ((totalRevenueCents - prevRevenueCents) / prevRevenueCents) * 100 : 0;
    const bookingsChangePct = prevTotalBookings > 0 ? ((totalBookings - prevTotalBookings) / prevTotalBookings) * 100 : 0;

    // Daily bookings trend (by created_at)
    const dayMap: Record<string, { date: string; bookings: number; revenueCents: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = startOfDayUTC(new Date(end.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000));
      const key = dateKeyUTC(d);
      dayMap[key] = { date: key, bookings: 0, revenueCents: 0 };
    }

    for (const a of aptRows) {
      const s = String((a as any).status || "");
      if (!["confirmed", "completed"].includes(s)) continue;
      const created = new Date((a as any).created_at);
      const key = dateKeyUTC(startOfDayUTC(created));
      if (dayMap[key]) dayMap[key].bookings += 1;
    }

    for (const p of payRows) {
      const status = String((p as any).status || "").toLowerCase();
      if (status !== "paid") continue;
      const created = new Date((p as any).created_at);
      const key = dateKeyUTC(startOfDayUTC(created));
      if (dayMap[key]) dayMap[key].revenueCents += toCents((p as any).amount);
    }

    const dailyTrend = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    return json({
      ok: true,
      kpis: {
        totalBookings,
        totalRevenueCents,
        completedAppointments: completed.length,
        cancelledAppointments: cancelled,
        revenueChangePct: Math.round(revenueChangePct * 10) / 10,
        bookingsChangePct: Math.round(bookingsChangePct * 10) / 10,
      },
      metrics: {
        patientRetentionPct: Math.round(patientRetentionPct),
        noShowRatePct: Math.round(noShowRatePct),
        avgLeadTimeMinutes: Math.round(avgLeadTimeMinutes),
      },
      dailyTrend,
    });
  } catch (e: any) {
    console.error("practice-analytics error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
