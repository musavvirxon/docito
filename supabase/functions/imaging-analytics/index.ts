// supabase/functions/imaging-analytics/index.ts
// File: supabase/functions/imaging-analytics/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = { centerId: string; days?: number };

type AnalyticsResponse = {
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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
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
  const examName = (obj?.exam_name as string) || (obj?.exam as string) || (obj?.study as string) || "Imaging Exam";
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

async function ensureCenterAccess(service: ReturnType<typeof createClient>, userId: string, centerId: string) {
  const { data: adminRow, error: aErr } = await service
    .from("imaging_centers")
    .select("id")
    .eq("id", centerId)
    .eq("admin_id", userId)
    .maybeSingle();
  if (aErr) throw aErr;
  if (adminRow?.id) return true;

  const { data: staffRow, error: sErr } = await service
    .from("imaging_staff")
    .select("id")
    .eq("imaging_center_id", centerId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (sErr) throw sErr;

  return Boolean(staffRow?.id);
}

function emptyResponse(warnings: string[] = []): AnalyticsResponse {
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }

  const authed = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await authed.auth.getUser();

  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const centerId = (body.centerId || "").trim();
  const days = Math.min(365, Math.max(1, safeInt(body.days ?? 30, 30)));
  if (!centerId) return json({ error: "Missing centerId" }, 400);

  const service = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const allowed = await ensureCenterAccess(service, user.id, centerId);
    if (!allowed) return json({ error: "Forbidden" }, 403);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }

  const warnings: string[] = [];

  try {
    const end = new Date();
    const start = addDaysUTC(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())), -days + 1);
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
      .select(
        "id, status, priority, attachments, created_at, accepted_at, completed_at, patient_id, referrer_type, referrer_entity_id",
      )
      .eq("receiver_type", "imaging_center")
      .eq("receiver_entity_id", centerId)
      .gte("created_at", startISO)
      .order("created_at", { ascending: false });

    if (refErr) {
      if (isMissingSchemaError(refErr)) return json(emptyResponse(["schema_not_ready:referrals"]), 200);
      return json({ error: refErr.message }, 500);
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
        if (dailyBuckets[k]) dailyBuckets[k].revenue += safeInt(t.amount, 0);

        const pd = t.provider_data || {};
        const mod = (pd as any)?.modality ? String((pd as any).modality) : null;
        if (mod) {
          const mm = modMap.get(mod) || { count: 0, revenue: 0 };
          mm.revenue += safeInt(t.amount, 0);
          modMap.set(mod, mm);
        }
      }

      const { data: txPrevData, error: txPrevErr } = await service
        .from("billing_transactions")
        .select("amount, transaction_type, status")
        .eq("entity_type", "imaging_center")
        .eq("entity_id", centerId)
        .gte("created_at", prevStartISO)
        .lt("created_at", prevEndISO);

      if (txPrevErr) {
        if (isMissingSchemaError(txPrevErr)) warnings.push("schema_not_ready:billing_prev");
      } else {
        const prevTransactions = (txPrevData || []) as Array<{ amount: number; transaction_type: string; status: string }>;
        for (const t of prevTransactions) {
          const isCompleted = (t.status || "").toLowerCase() === "completed";
          if (!isCompleted) continue;
          const type = (t.transaction_type || "").toLowerCase();
          if (["appointment_payment", "subscription_payment", "hold_capture"].includes(type)) prevRevenueCents += safeInt(t.amount, 0);
        }
      }
    }

    let reportSumH = 0;
    let reportCnt = 0;
    const modTurnMap = new Map<string, { sumH: number; cnt: number }>();

    const { data: repData, error: repErr } = await service
      .from("imaging_reports")
      .select("modality, created_at, finalized_at")
      .eq("imaging_center_id", centerId)
      .gte("created_at", startISO);

    if (repErr) {
      if (isMissingSchemaError(repErr)) warnings.push("schema_not_ready:imaging_reports");
    } else {
      const reports = (repData || []) as Array<{ modality: string | null; created_at: string; finalized_at: string | null }>;
      for (const r of reports) {
        if (!r.finalized_at) continue;
        const createdAt = new Date(r.created_at);
        const finalizedAt = new Date(r.finalized_at);
        const diffH = Math.max(0, (finalizedAt.getTime() - createdAt.getTime()) / 3600000);
        reportSumH += diffH;
        reportCnt += 1;

        const mod = (r.modality || "Unknown").toString();
        const agg = modTurnMap.get(mod) || { sumH: 0, cnt: 0 };
        agg.sumH += diffH;
        agg.cnt += 1;
        modTurnMap.set(mod, agg);
      }
    }

    if (reportCnt === 0) {
      for (const r of referrals) {
        if (!r.completed_at) continue;
        const createdAt = new Date(r.created_at);
        const completedAt = new Date(r.completed_at);
        const diffH = Math.max(0, (completedAt.getTime() - createdAt.getTime()) / 3600000);
        reportSumH += diffH;
        reportCnt += 1;

        const mod = parseAttachments(r.attachments).modality;
        const agg = modTurnMap.get(mod) || { sumH: 0, cnt: 0 };
        agg.sumH += diffH;
        agg.cnt += 1;
        modTurnMap.set(mod, agg);
      }
    }

    const avgReportHours = reportCnt ? Math.round((reportSumH / reportCnt) * 10) / 10 : 0;
    const avgAcceptHours = acceptCount ? Math.round((acceptSumHours / acceptCount) * 10) / 10 : 0;

    let prevAvgReportHours = avgReportHours;
    const { data: repPrevData, error: repPrevErr } = await service
      .from("imaging_reports")
      .select("created_at, finalized_at")
      .eq("imaging_center_id", centerId)
      .gte("created_at", prevStartISO)
      .lt("created_at", prevEndISO);

    if (repPrevErr) {
      if (isMissingSchemaError(repPrevErr)) warnings.push("schema_not_ready:imaging_reports_prev");
    } else {
      let prevReportSumH = 0;
      let prevReportCnt = 0;
      for (const r of (repPrevData || []) as Array<{ created_at: string; finalized_at: string | null }>) {
        if (!r.finalized_at) continue;
        const createdAt = new Date(r.created_at);
        const finalizedAt = new Date(r.finalized_at);
        const diffH = Math.max(0, (finalizedAt.getTime() - createdAt.getTime()) / 3600000);
        prevReportSumH += diffH;
        prevReportCnt += 1;
      }
      if (prevReportCnt) prevAvgReportHours = prevReportSumH / prevReportCnt;
    }

    let utilizationPct = 0;
    const { data: eqData, error: eqErr } = await service
      .from("imaging_equipment")
      .select("capacity_per_day, status")
      .eq("imaging_center_id", centerId);

    if (eqErr) {
      if (isMissingSchemaError(eqErr)) warnings.push("schema_not_ready:imaging_equipment");
    } else {
      const equipment = (eqData || []) as Array<{ capacity_per_day: number | null; status: string | null }>;
      const activeCapacityPerDay = equipment
        .filter((e) => (e.status || "active") === "active")
        .reduce((sum, e) => sum + safeInt(e.capacity_per_day, 0), 0);

      const avgDailyScans = days ? totalScans / days : 0;
      utilizationPct =
        activeCapacityPerDay > 0 ? Math.min(100, Math.round((avgDailyScans / activeCapacityPerDay) * 100)) : 0;
    }

    let genderCounts = new Map<string, number>();
    const ageCounts: Record<string, number> = { "0-17": 0, "18-29": 0, "30-44": 0, "45-59": 0, "60+": 0, unknown: 0 };

    const patientIdArr = Array.from(patientIds);
    if (patientIdArr.length) {
      const { data: profData, error: profErr } = await service
        .from("profiles")
        .select("user_id, gender, date_of_birth")
        .in("user_id", patientIdArr);

      if (profErr) {
        if (isMissingSchemaError(profErr)) warnings.push("schema_not_ready:profiles");
      } else {
        const now2 = new Date();
        for (const p of (profData || []) as Array<{ user_id: string; gender: string | null; date_of_birth: string | null }>) {
          const g = (p.gender || "unknown").toString();
          genderCounts.set(g, (genderCounts.get(g) || 0) + 1);

          if (!p.date_of_birth) {
            ageCounts.unknown += 1;
            continue;
          }
          const dob = new Date(p.date_of_birth);
          let age = now2.getUTCFullYear() - dob.getUTCFullYear();
          const m = now2.getUTCMonth() - dob.getUTCMonth();
          if (m < 0 || (m === 0 && now2.getUTCDate() < dob.getUTCDate())) age -= 1;

          if (age < 18) ageCounts["0-17"] += 1;
          else if (age < 30) ageCounts["18-29"] += 1;
          else if (age < 45) ageCounts["30-44"] += 1;
          else if (age < 60) ageCounts["45-59"] += 1;
          else if (age >= 60) ageCounts["60+"] += 1;
          else ageCounts.unknown += 1;
        }
      }
    }

    const uniqueDoctorIds = Array.from(new Set(doctorIds)).filter(Boolean);
    const uniquePracticeIds = Array.from(new Set(practiceIds)).filter(Boolean);

    const doctorNameById = new Map<string, string>();
    if (uniqueDoctorIds.length) {
      const { data: docs, error: docsErr } = await service.from("doctors").select("id, user_id").in("id", uniqueDoctorIds);
      if (!docsErr) {
        const docRows = (docs || []) as Array<{ id: string; user_id: string }>;
        const uids = Array.from(new Set(docRows.map((d) => d.user_id)));

        const profMap = new Map<string, string>();
        if (uids.length) {
          const { data: p2, error: p2Err } = await service
            .from("profiles")
            .select("user_id, full_name, first_name, last_name")
            .in("user_id", uids);
          if (!p2Err) {
            for (const r of (p2 || []) as Array<{ user_id: string; full_name: string | null; first_name: string | null; last_name: string | null }>) {
              const nm = r.full_name || [r.first_name, r.last_name].filter(Boolean).join(" ") || "Doctor";
              profMap.set(r.user_id, nm);
            }
          }
        }
        for (const d of docRows) doctorNameById.set(d.id, profMap.get(d.user_id) || "Doctor");
      }
    }

    const practiceNameById = new Map<string, string>();
    if (uniquePracticeIds.length) {
      const { data: prs, error: prsErr } = await service.from("practices").select("id, name").in("id", uniquePracticeIds);
      if (!prsErr) {
        for (const p of (prs || []) as Array<{ id: string; name: string }>) practiceNameById.set(p.id, p.name);
      }
    }

    const topReferrersArr = Array.from(referrerCounter.entries())
      .map(([k, v]) => {
        const [t, id] = k.split(":");
        if (t === "doctor") return { name: doctorNameById.get(id) || "Doctor", value: v };
        if (t === "clinic") return { name: practiceNameById.get(id) || "Clinic", value: v };
        return { name: t, value: v };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const dailyTrend = Object.values(dailyBuckets).sort((a, b) => (a.date < b.date ? -1 : 1));

    const modalityData = Array.from(modMap.entries())
      .map(([name, v]) => ({ name, value: v.count, revenue: v.revenue }))
      .sort((a, b) => b.value - a.value);

    const statusBreakdown = Array.from(statusMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const workflowBreakdown = Array.from(wfMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const peakHours = hourCounts.map((scans, h) => ({ hour: String(h).padStart(2, "0"), scans }));

    const turnaroundByModality = Array.from(modTurnMap.entries())
      .map(([type, agg]) => ({ type, avgHours: agg.cnt ? Math.round((agg.sumH / agg.cnt) * 10) / 10 : 0 }))
      .sort((a, b) => b.avgHours - a.avgHours);

    const scansChangePct =
      prevTotalScans > 0 ? Math.round(((totalScans - prevTotalScans) / prevTotalScans) * 100) : totalScans > 0 ? 100 : 0;

    const revenueChangePct =
      prevRevenueCents > 0 ? Math.round(((revenueCents - prevRevenueCents) / prevRevenueCents) * 100) : revenueCents > 0 ? 100 : 0;

    const reportChangePct =
      prevAvgReportHours > 0 ? Math.round(((avgReportHours - prevAvgReportHours) / prevAvgReportHours) * 100) : avgReportHours > 0 ? 100 : 0;

    const completedScans = statusMap.get("completed") || 0;
    const pendingScans = Math.max(0, totalScans - completedScans);

    const response: AnalyticsResponse = {
      kpis: {
        totalScans,
        completedScans,
        pendingScans,
        revenueCents,
        refundsCents,
        netRevenueCents: revenueCents - refundsCents,
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
      demographics: {
        gender: Array.from(genderCounts.entries()).map(([name, value]) => ({ name, value })),
        ageBuckets: Object.entries(ageCounts).map(([name, value]) => ({ name, value })),
      },
      topReferrers: topReferrersArr,
      turnaroundByModality,
      ...(warnings.length ? { warnings } : {}),
    };

    return json(response, 200);
  } catch (e) {
    return json(emptyResponse([`unhandled:${String((e as any)?.message ?? e)}`]), 200);
  }
});
