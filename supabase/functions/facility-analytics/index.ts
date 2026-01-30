// supabase/functions/facility-analytics/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EntityType = "lab" | "imaging" | "pharmacy";

type ScopeRow = {
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  entity_status: string | null;
  scope_role: string | null;
  is_admin: boolean | null;
  permissions: Record<string, unknown> | null;
};

type ReqBody = {
  // preferred
  entityType?: EntityType;
  entityId?: string;
  days?: number;

  // legacy compat (so existing UIs keep working until rewired)
  timeRange?: string; // "7d" | "30d" | "90d"
  labCenterId?: string;
  centerId?: string;
  pharmacyId?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
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

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function hasPermission(scope: ScopeRow, key: string): boolean {
  const perms = (scope.permissions || {}) as Record<string, unknown>;
  return perms[key] === true;
}

async function authorizeFacilityAnalyticsAccess(params: {
  url: string;
  anon: string;
  authHeader: string;
  entityType: EntityType;
  entityId: string;
}): Promise<{ ok: true; userId: string; scope: ScopeRow } | { ok: false; status: number; error: string }> {
  const { url, anon, authHeader, entityType, entityId } = params;

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return { ok: false, status: 401, error: "Unauthorized" };

  const { data: scopes, error: scopesErr } = await userClient.rpc("get_my_entity_scopes");
  if (scopesErr) return { ok: false, status: 500, error: scopesErr.message || "Failed to load scopes" };

  const list = (scopes || []) as ScopeRow[];
  const scope = list.find((s) => s.entity_type === entityType && String(s.entity_id) === entityId);
  if (!scope) return { ok: false, status: 403, error: "Forbidden" };

  // allow: admin OR can_view_analytics OR can_manage_billing (legacy)
  const allowed = Boolean(scope.is_admin) || hasPermission(scope, "can_view_analytics") || hasPermission(scope, "can_manage_billing");
  if (!allowed) return { ok: false, status: 403, error: "Forbidden" };

  return { ok: true, userId: userRes.user.id, scope };
}

function isoDay(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function pctChange(curr: number, prev: number) {
  if (!Number.isFinite(curr)) curr = 0;
  if (!Number.isFinite(prev)) prev = 0;
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 100);
}

function round1(n: number) {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

function norm(s: unknown) {
  return String(s || "").trim().toLowerCase();
}

function isCompletedStatus(s: unknown) {
  const v = norm(s);
  return v === "completed" || v === "complete" || v === "finalized" || v === "done";
}

function isCancelledStatus(s: unknown) {
  const v = norm(s);
  return v === "cancelled" || v === "canceled" || v === "rejected" || v === "declined" || v === "failed" || v === "expired";
}

function inferDaysFromBody(body: ReqBody) {
  if (body?.days != null) return clampInt(body.days, 7, 365, 30);
  const tr = String(body?.timeRange || "").trim().toLowerCase();
  if (tr === "7d") return 7;
  if (tr === "30d") return 30;
  if (tr === "90d") return 90;
  return 30;
}

function inferEntityFromBody(body: ReqBody): { entityType: EntityType | null; entityId: string | null } {
  const t = (body?.entityType || null) as EntityType | null;
  const id = body?.entityId ? String(body.entityId).trim() : null;

  if (t && id) return { entityType: t, entityId: id };

  // legacy
  if (body?.labCenterId) return { entityType: "lab", entityId: String(body.labCenterId).trim() };
  if (body?.centerId) return { entityType: "imaging", entityId: String(body.centerId).trim() };
  if (body?.pharmacyId) return { entityType: "pharmacy", entityId: String(body.pharmacyId).trim() };

  return { entityType: null, entityId: null };
}

function billingEntityTypesFor(entityType: EntityType): string[] {
  if (entityType === "imaging") return ["imaging_center", "imaging"];
  if (entityType === "pharmacy") return ["pharmacy"];
  // lab: older/varied values exist in migrations
  return ["lab", "lab_center", "laboratory"];
}

function labelGender(g: string) {
  const v = norm(g);
  if (v === "male") return "Male";
  if (v === "female") return "Female";
  if (v === "other") return "Other";
  if (v === "prefer_not_to_say") return "Prefer not to say";
  return "Unknown";
}

function calcAgeYears(dob: unknown) {
  if (!dob) return null;
  const dt = new Date(String(dob));
  if (Number.isNaN(dt.getTime())) return null;

  const now = new Date();
  let age = now.getUTCFullYear() - dt.getUTCFullYear();
  const m = now.getUTCMonth() - dt.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dt.getUTCDate())) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

function ageBucket(age: number) {
  if (age <= 17) return "0-17";
  if (age <= 34) return "18-34";
  if (age <= 49) return "35-49";
  if (age <= 64) return "50-64";
  return "65+";
}

async function chunkedIn<T>(
  admin: ReturnType<typeof createClient>,
  table: string,
  select: string,
  col: string,
  ids: string[],
  chunkSize = 900,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await admin.from(table).select(select).in(col as any, chunk as any);
    if (error) throw error;
    out.push(...(((data || []) as unknown) as T[]));
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const inferred = inferEntityFromBody(body);
  const entityType = inferred.entityType;
  const entityId = inferred.entityId;

  if (!entityType || !["lab", "imaging", "pharmacy"].includes(entityType)) {
    return json({ ok: false, error: "Invalid entityType" }, 400);
  }
  if (!entityId || !isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);

  const days = inferDaysFromBody(body);
  const now = new Date();
  const endDay = startOfUtcDay(now);
  const currentStart = new Date(endDay);
  currentStart.setUTCDate(currentStart.getUTCDate() - (days - 1));
  const prevStart = new Date(currentStart);
  prevStart.setUTCDate(prevStart.getUTCDate() - days);

  const authz = await authorizeFacilityAnalyticsAccess({
    url: env.url,
    anon: env.anon,
    authHeader,
    entityType,
    entityId,
  });
  if (!authz.ok) return json({ ok: false, error: authz.error }, authz.status);

  const admin = createClient(env.url, env.service, {
    auth: { persistSession: false },
    global: { "X-Client-Info": "facility-analytics" } as any,
  });

  try {
    // Shared: pull referrals for current+previous window so we can compute deltas
    const { data: referralRows, error: refErr } = await admin
      .from("referrals")
      .select(
        "id,status,created_at,accepted_at,completed_at,receiver_entity_type,receiver_entity_id,imaging_workflow_status,referrer_type,referrer_entity_id,referring_doctor_id,patient_id",
      )
      .eq("receiver_entity_type", entityType)
      .eq("receiver_entity_id", entityId)
      .gte("created_at", prevStart.toISOString())
      .order("created_at", { ascending: true })
      .limit(20000);

    if (refErr) throw refErr;

    const allRefs = (referralRows || []) as any[];

    const curRefs = allRefs.filter((r) => {
      const t = r.created_at ? new Date(r.created_at).getTime() : 0;
      return t >= currentStart.getTime();
    });

    const prevRefs = allRefs.filter((r) => {
      const t = r.created_at ? new Date(r.created_at).getTime() : 0;
      return t >= prevStart.getTime() && t < currentStart.getTime();
    });

    // LAB: keep existing lightweight response (referrals-based)
    if (entityType === "lab") {
      const total = curRefs.length;

      const completed = curRefs.filter((x) => isCompletedStatus(x.status)).length;

      const pending = curRefs.filter((x) => {
        const s = norm(x.status);
        return s === "pending" || s === "assigned" || s === "in_progress" || s === "accepted" || s === "scheduled";
      }).length;

      const cancelled = curRefs.filter((x) => isCancelledStatus(x.status)).length;

      // Average turnaround time (hours) for completed referrals
      const completedDurationsHours: number[] = [];
      for (const x of curRefs) {
        if (!isCompletedStatus(x.status)) continue;

        const createdAt = x.created_at ? new Date(x.created_at) : null;
        const completedAt = x.completed_at ? new Date(x.completed_at) : null;
        if (!createdAt || !completedAt) continue;

        const diffMs = completedAt.getTime() - createdAt.getTime();
        if (diffMs <= 0) continue;

        completedDurationsHours.push(diffMs / (1000 * 60 * 60));
      }
      const avgTurnaroundHours =
        completedDurationsHours.length > 0
          ? round1(completedDurationsHours.reduce((a, b) => a + b, 0) / completedDurationsHours.length)
          : 0;

      // Trend: referrals per day over window
      const dayMap = new Map<string, { referrals: number; completed: number }>();
      for (let i = 0; i < days; i++) {
        const d = new Date(currentStart);
        d.setUTCDate(d.getUTCDate() + i);
        dayMap.set(isoDay(d), { referrals: 0, completed: 0 });
      }

      for (const x of curRefs) {
        const createdAt = x.created_at ? new Date(x.created_at) : null;
        if (!createdAt) continue;

        const day = isoDay(createdAt);
        if (!dayMap.has(day)) continue;

        const bucket = dayMap.get(day)!;
        bucket.referrals += 1;
        if (isCompletedStatus(x.status)) bucket.completed += 1;
        dayMap.set(day, bucket);
      }

      const trend = Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v }));

      return json({
        ok: true,
        entity: { entity_type: entityType, entity_id: entityId },
        window_days: days,
        kpis: {
          total_referrals: total,
          completed_referrals: completed,
          pending_referrals: pending,
          cancelled_referrals: cancelled,
          avg_turnaround_hours: avgTurnaroundHours,
        },
        trend,
      });
    }

    // IMAGING: rich analytics payload expected by ImagingAnalytics UI
    if (entityType === "imaging") {
      // imaging reports (for modality + report lifecycle)
      const { data: reportsRows, error: repErr } = await admin
        .from("imaging_reports")
        .select("referral_id,modality,status,created_at,finalized_at")
        .eq("imaging_center_id", entityId)
        .gte("created_at", prevStart.toISOString())
        .order("created_at", { ascending: true })
        .limit(20000);

      if (repErr) throw repErr;

      const allReports = (reportsRows || []) as any[];
      const reportByReferral = new Map<string, { modality: string; finalized_at: string | null; created_at: string | null }>();
      for (const r of allReports) {
        if (!r?.referral_id) continue;
        reportByReferral.set(String(r.referral_id), {
          modality: String(r.modality || "Unknown"),
          finalized_at: r.finalized_at ? String(r.finalized_at) : null,
          created_at: r.created_at ? String(r.created_at) : null,
        });
      }

      // billing transactions (revenue/refunds)
      const billingTypes = billingEntityTypesFor("imaging");
      const { data: txRows, error: txErr } = await admin
        .from("billing_transactions")
        .select("amount,transaction_type,status,provider_data,created_at,entity_type,entity_id")
        .in("entity_type", billingTypes)
        .eq("entity_id", entityId)
        .gte("created_at", prevStart.toISOString())
        .order("created_at", { ascending: true })
        .limit(20000);

      if (txErr) throw txErr;

      const allTx = (txRows || []) as any[];
      const curTx = allTx.filter((t) => {
        const ms = t.created_at ? new Date(t.created_at).getTime() : 0;
        return ms >= currentStart.getTime();
      });
      const prevTx = allTx.filter((t) => {
        const ms = t.created_at ? new Date(t.created_at).getTime() : 0;
        return ms >= prevStart.getTime() && ms < currentStart.getTime();
      });

      const sumTx = (rows: any[]) => {
        let revenue = 0;
        let refunds = 0;
        for (const t of rows) {
          const amt = Number(t.amount || 0);
          const st = norm(t.status);
          const tt = norm(t.transaction_type);
          const isRefund = tt === "refund" || st === "refunded";
          const isCountable = st === "completed" || st === "refunded";
          if (!isCountable) continue;
          if (isRefund) refunds += Math.max(0, amt);
          else revenue += Math.max(0, amt);
        }
        return { revenueCents: revenue, refundsCents: refunds, netRevenueCents: revenue - refunds };
      };

      const curMoney = sumTx(curTx);
      const prevMoney = sumTx(prevTx);

      const totalScans = curRefs.length;
      const completedScans = curRefs.filter((r) => isCompletedStatus(r.status) || norm(r.imaging_workflow_status) === "completed").length;

      const pendingScans = curRefs.filter((r) => {
        if (isCompletedStatus(r.status) || isCancelledStatus(r.status)) return false;
        const w = norm(r.imaging_workflow_status);
        if (w === "cancelled") return false;
        return true;
      }).length;

      const avgAcceptHours = (() => {
        const diffs: number[] = [];
        for (const r of curRefs) {
          if (!r.created_at || !r.accepted_at) continue;
          const a = new Date(r.accepted_at).getTime();
          const c = new Date(r.created_at).getTime();
          if (!Number.isFinite(a) || !Number.isFinite(c) || a <= c) continue;
          diffs.push((a - c) / (1000 * 60 * 60));
        }
        return diffs.length ? round1(diffs.reduce((x, y) => x + y, 0) / diffs.length) : 0;
      })();

      const avgReportHours = (() => {
        const diffs: number[] = [];
        for (const r of curRefs) {
          const createdAt = r.created_at ? new Date(r.created_at).getTime() : null;
          if (!createdAt) continue;

          const acceptedAt = r.accepted_at ? new Date(r.accepted_at).getTime() : null;

          // prefer referrals.completed_at; fallback to report.finalized_at
          const completedAt = r.completed_at
            ? new Date(r.completed_at).getTime()
            : (() => {
                const rep = reportByReferral.get(String(r.id));
                return rep?.finalized_at ? new Date(rep.finalized_at).getTime() : null;
              })();

          if (!completedAt || completedAt <= createdAt) continue;

          const start = acceptedAt && acceptedAt > createdAt ? acceptedAt : createdAt;
          if (completedAt <= start) continue;

          diffs.push((completedAt - start) / (1000 * 60 * 60));
        }
        return diffs.length ? round1(diffs.reduce((x, y) => x + y, 0) / diffs.length) : 0;
      })();

      const prevAvgReportHours = (() => {
        const diffs: number[] = [];
        for (const r of prevRefs) {
          const createdAt = r.created_at ? new Date(r.created_at).getTime() : null;
          if (!createdAt) continue;

          const acceptedAt = r.accepted_at ? new Date(r.accepted_at).getTime() : null;

          const completedAt = r.completed_at
            ? new Date(r.completed_at).getTime()
            : (() => {
                const rep = reportByReferral.get(String(r.id));
                return rep?.finalized_at ? new Date(rep.finalized_at).getTime() : null;
              })();

          if (!completedAt || completedAt <= createdAt) continue;

          const start = acceptedAt && acceptedAt > createdAt ? acceptedAt : createdAt;
          if (completedAt <= start) continue;

          diffs.push((completedAt - start) / (1000 * 60 * 60));
        }
        return diffs.length ? round1(diffs.reduce((x, y) => x + y, 0) / diffs.length) : 0;
      })();

      const reportBacklog = curRefs.filter((r) => norm(r.imaging_workflow_status) === "awaiting_report").length;

      const utilizationPct = totalScans ? Math.min(100, Math.round((completedScans / totalScans) * 100)) : 0;

      const scansChangePct = pctChange(totalScans, prevRefs.length);
      const revenueChangePct = pctChange(curMoney.netRevenueCents, prevMoney.netRevenueCents);
      const reportChangePct = pctChange(avgReportHours, prevAvgReportHours);

      // daily trend
      const dayTrend = new Map<string, { scans: number; completed: number; revenue: number }>();
      for (let i = 0; i < days; i++) {
        const d = new Date(currentStart);
        d.setUTCDate(d.getUTCDate() + i);
        dayTrend.set(isoDay(d), { scans: 0, completed: 0, revenue: 0 });
      }

      for (const r of curRefs) {
        if (!r.created_at) continue;
        const day = isoDay(new Date(r.created_at));
        const b = dayTrend.get(day);
        if (!b) continue;
        b.scans += 1;
        if (isCompletedStatus(r.status) || norm(r.imaging_workflow_status) === "completed") b.completed += 1;
        dayTrend.set(day, b);
      }

      for (const t of curTx) {
        if (!t.created_at) continue;
        const st = norm(t.status);
        const tt = norm(t.transaction_type);
        const isRefund = tt === "refund" || st === "refunded";
        const isCountable = st === "completed" || st === "refunded";
        if (!isCountable || isRefund) continue;

        const day = isoDay(new Date(t.created_at));
        const b = dayTrend.get(day);
        if (!b) continue;
        b.revenue += Math.max(0, Number(t.amount || 0));
        dayTrend.set(day, b);
      }

      const dailyTrend = Array.from(dayTrend.entries()).map(([date, v]) => ({({ date, ...v }))(v));

      // modality data: combine referral counts (report modality) + revenue (tx provider_data.modality)
      const modalityCounts = new Map<string, number>();
      for (const r of curRefs) {
        const rep = reportByReferral.get(String(r.id));
        const mod = String(rep?.modality || "Unknown").trim() || "Unknown";
        modalityCounts.set(mod, (modalityCounts.get(mod) || 0) + 1);
      }

      const modalityRevenue = new Map<string, number>();
      for (const t of curTx) {
        const st = norm(t.status);
        const tt = norm(t.transaction_type);
        const isRefund = tt === "refund" || st === "refunded";
        const isCountable = st === "completed" || st === "refunded";
        if (!isCountable || isRefund) continue;

        const pd = (t.provider_data || {}) as Record<string, unknown>;
        const mod = String((pd as any).modality || "Unknown").trim() || "Unknown";
        modalityRevenue.set(mod, (modalityRevenue.get(mod) || 0) + Math.max(0, Number(t.amount || 0)));
      }

      const modalities = new Set<string>([...modalityCounts.keys(), ...modalityRevenue.keys()]);
      const modalityData = Array.from(modalities)
        .map((m) => ({ name: m, value: modalityCounts.get(m) || 0, revenue: modalityRevenue.get(m) || 0 }))
        .sort((a, b) => b.value - a.value);

      // workflow breakdown
      const workflowMap = new Map<string, number>();
      for (const r of curRefs) {
        const w = String(r.imaging_workflow_status || "scheduled").trim() || "scheduled";
        workflowMap.set(w, (workflowMap.get(w) || 0) + 1);
      }
      const workflowBreakdown = Array.from(workflowMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // status breakdown
      const statusMap = new Map<string, number>();
      for (const r of curRefs) {
        const s = String(r.status || "pending").trim() || "pending";
        statusMap.set(s, (statusMap.get(s) || 0) + 1);
      }
      const statusBreakdown = Array.from(statusMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // peak hours
      const hourMap = new Map<number, number>();
      for (let h = 0; h < 24; h++) hourMap.set(h, 0);
      for (const r of curRefs) {
        if (!r.created_at) continue;
        const h = new Date(r.created_at).getUTCHours();
        hourMap.set(h, (hourMap.get(h) || 0) + 1);
      }
      const peakHours = Array.from(hourMap.entries()).map(([h, scans]) => ({
        hour: `${String(h).padStart(2, "0")}:00`,
        scans,
      }));

      // demographics (gender + age buckets)
      const patientIds = Array.from(new Set(curRefs.map((r) => String(r.patient_id || "")).filter((id) => isUuid(id))));
      const profiles = patientIds.length
        ? await chunkedIn<{ user_id: string; gender: string | null; date_of_birth: string | null }>(
            admin,
            "profiles",
            "user_id,gender,date_of_birth",
            "user_id",
            patientIds,
          )
        : [];

      const genderCounts = new Map<string, number>();
      const ageCounts = new Map<string, number>();

      for (const p of profiles) {
        const g = labelGender(p.gender || "unknown");
        genderCounts.set(g, (genderCounts.get(g) || 0) + 1);

        const age = calcAgeYears(p.date_of_birth);
        if (age != null) {
          const b = ageBucket(age);
          ageCounts.set(b, (ageCounts.get(b) || 0) + 1);
        }
      }

      const demographics = {
        gender: Array.from(genderCounts.entries()).map(([name, value]) => ({ name, value })),
        ageBuckets: Array.from(ageCounts.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => {
            const order = ["0-17", "18-34", "35-49", "50-64", "65+"];
            return order.indexOf(a.name) - order.indexOf(b.name);
          }),
      };

      // top referrers (resolve names)
      const refKey = (r: any) => {
        const t = String(r.referrer_type || "").trim();
        const id = r.referrer_entity_id ? String(r.referrer_entity_id).trim() : "";
        const legacyDoctorId = r.referring_doctor_id ? String(r.referring_doctor_id).trim() : "";
        if (t && id) return `${t}:${id}`;
        if (legacyDoctorId) return `doctor:${legacyDoctorId}`;
        return "unknown:";
      };

      const refCounts = new Map<string, number>();
      for (const r of curRefs) {
        const k = refKey(r);
        refCounts.set(k, (refCounts.get(k) || 0) + 1);
      }

      const topKeys = Array.from(refCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([k]) => k);

      const doctorIds = topKeys.filter((k) => k.startsWith("doctor:")).map((k) => k.split(":")[1]);
      const clinicIds = topKeys.filter((k) => k.startsWith("clinic:")).map((k) => k.split(":")[1]);
      const practiceIds = topKeys.filter((k) => k.startsWith("practice:")).map((k) => k.split(":")[1]);

      const refNameByKey = new Map<string, string>();

      // doctors -> profiles
      if (doctorIds.length) {
        const docs = await chunkedIn<{ id: string; user_id: string | null }>(admin, "doctors", "id,user_id", "id", doctorIds);
        const userIds = Array.from(new Set(docs.map((d) => d.user_id).filter((u): u is string => !!u)));
        const profs = userIds.length
          ? await chunkedIn<{ user_id: string; full_name: string | null }>(admin, "profiles", "user_id,full_name", "user_id", userIds)
          : [];
        const nameByUser = new Map<string, string>();
        for (const p of profs) nameByUser.set(p.user_id, String(p.full_name || "Doctor"));
        for (const d of docs) {
          const name = d.user_id ? nameByUser.get(d.user_id) : null;
          refNameByKey.set(`doctor:${d.id}`, name || "Doctor");
        }
      }

      // clinics/practices
      const combinedPracticeIds = Array.from(new Set([...clinicIds, ...practiceIds].filter((id) => isUuid(id))));
      if (combinedPracticeIds.length) {
        const practices = await chunkedIn<{ id: string; name: string | null }>(admin, "practices", "id,name", "id", combinedPracticeIds);
        for (const p of practices) {
          refNameByKey.set(`clinic:${p.id}`, String(p.name || "Clinic"));
          refNameByKey.set(`practice:${p.id}`, String(p.name || "Clinic"));
        }
      }

      for (const k of topKeys) {
        if (!refNameByKey.has(k)) refNameByKey.set(k, k.startsWith("unknown") ? "Unknown" : "Referrer");
      }

      const topReferrers = topKeys.map((k) => ({ name: refNameByKey.get(k) || "Unknown", value: refCounts.get(k) || 0 }));

      // turnaround by modality (avg report hours per modality)
      const modTurn = new Map<string, number[]>();
      for (const r of curRefs) {
        const rep = reportByReferral.get(String(r.id));
        const mod = String(rep?.modality || "Unknown").trim() || "Unknown";

        const createdAt = r.created_at ? new Date(r.created_at).getTime() : null;
        if (!createdAt) continue;

        const acceptedAt = r.accepted_at ? new Date(r.accepted_at).getTime() : null;
        const completedAt = r.completed_at
          ? new Date(r.completed_at).getTime()
          : rep?.finalized_at
          ? new Date(rep.finalized_at).getTime()
          : null;

        if (!completedAt || completedAt <= createdAt) continue;

        const start = acceptedAt && acceptedAt > createdAt ? acceptedAt : createdAt;
        if (completedAt <= start) continue;

        const hrs = (completedAt - start) / (1000 * 60 * 60);
        if (!Number.isFinite(hrs) || hrs <= 0) continue;

        if (!modTurn.has(mod)) modTurn.set(mod, []);
        modTurn.get(mod)!.push(hrs);
      }

      const turnaroundByModality = Array.from(modTurn.entries())
        .map(([type, arr]) => ({ type, avgHours: round1(arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length)) }))
        .sort((a, b) => a.avgHours - b.avgHours);

      return json({
        ok: true,
        entity: { entity_type: entityType, entity_id: entityId },
        window_days: days,
        kpis: {
          totalScans,
          completedScans,
          pendingScans,
          revenueCents: curMoney.revenueCents,
          refundsCents: curMoney.refundsCents,
          netRevenueCents: curMoney.netRevenueCents,
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
      });
    }

    // PHARMACY: rich analytics payload expected by PharmacyAnalytics UI
    if (entityType === "pharmacy") {
      const { data: orderRows, error: ordErr } = await admin
        .from("fulfillment_orders")
        .select("id,created_at,status,total_amount,payment_status,prescription_id")
        .eq("pharmacy_id", entityId)
        .gte("created_at", prevStart.toISOString())
        .order("created_at", { ascending: true })
        .limit(20000);

      if (ordErr) throw ordErr;

      const allOrders = (orderRows || []) as any[];
      const curOrders = allOrders.filter((o) => {
        const ms = o.created_at ? new Date(o.created_at).getTime() : 0;
        return ms >= currentStart.getTime();
      });
      const prevOrders = allOrders.filter((o) => {
        const ms = o.created_at ? new Date(o.created_at).getTime() : 0;
        return ms >= prevStart.getTime() && ms < currentStart.getTime();
      });

      const isRevenueOrder = (o: any) => {
        const ps = norm(o.payment_status);
        const st = norm(o.status);
        if (ps === "paid" || ps === "completed") return true;
        return st === "completed" || st === "picked_up" || st === "delivered" || st === "dispensed" || st === "ready";
      };

      const sumRevenue = (orders: any[]) =>
        orders.reduce((acc, o) => acc + (isRevenueOrder(o) ? Number(o.total_amount || 0) : 0), 0);

      const totalOrders = curOrders.length;
      const totalRevenue = sumRevenue(curOrders);
      const prevRevenue = sumRevenue(prevOrders);

      const filledStatuses = new Set(["completed", "picked_up", "delivered", "dispensed"]);
      const totalPrescriptionsFilled = curOrders.filter((o) => filledStatuses.has(norm(o.status))).length;

      const avgOrderValue = totalOrders ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

      const revenueChangePct = pctChange(totalRevenue, prevRevenue);
      const ordersChangePct = pctChange(totalOrders, prevOrders.length);

      // daily trend
      const dayMap = new Map<string, { orders: number; revenue: number }>();
      for (let i = 0; i < days; i++) {
        const d = new Date(currentStart);
        d.setUTCDate(d.getUTCDate() + i);
        dayMap.set(isoDay(d), { orders: 0, revenue: 0 });
      }

      for (const o of curOrders) {
        if (!o.created_at) continue;
        const day = isoDay(new Date(o.created_at));
        const b = dayMap.get(day);
        if (!b) continue;
        b.orders += 1;
        if (isRevenueOrder(o)) b.revenue += Number(o.total_amount || 0);
        dayMap.set(day, b);
      }

      const dailyTrend = Array.from(dayMap.entries()).map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orders }));

      // status breakdown
      const statusMap = new Map<string, number>();
      for (const o of curOrders) {
        const s = String(o.status || "pending").trim() || "pending";
        statusMap.set(s, (statusMap.get(s) || 0) + 1);
      }
      const statusBreakdown = Array.from(statusMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // top medications
      const rxIds = Array.from(new Set(curOrders.map((o) => String(o.prescription_id || "")).filter((id) => isUuid(id))));
      const items = rxIds.length
        ? await chunkedIn<{ prescription_id: string; medication_name: string; quantity: number }>(
            admin,
            "prescription_items",
            "prescription_id,medication_name,quantity",
            "prescription_id",
            rxIds,
          )
        : [];

      // build per-prescription quantities
      const itemsByRx = new Map<string, Array<{ name: string; qty: number }>>();
      for (const it of items) {
        const rx = String(it.prescription_id);
        const name = String(it.medication_name || "Unknown");
        const qty = Number(it.quantity || 0);
        if (!itemsByRx.has(rx)) itemsByRx.set(rx, []);
        itemsByRx.get(rx)!.push({ name, qty: qty > 0 ? qty : 1 });
      }

      const medCounts = new Map<string, number>();
      const medRevenue = new Map<string, number>();

      for (const o of curOrders) {
        if (!o.prescription_id) continue;
        const rx = String(o.prescription_id);
        const list = itemsByRx.get(rx) || [];
        if (!list.length) continue;

        const orderRev = isRevenueOrder(o) ? Number(o.total_amount || 0) : 0;
        const totalQty = list.reduce((a, b) => a + (b.qty > 0 ? b.qty : 1), 0) || 1;

        for (const it of list) {
          const name = it.name || "Unknown";
          const qty = it.qty > 0 ? it.qty : 1;

          medCounts.set(name, (medCounts.get(name) || 0) + qty);

          const share = orderRev > 0 ? (orderRev * qty) / totalQty : 0;
          medRevenue.set(name, (medRevenue.get(name) || 0) + share);
        }
      }

      const topMedications = Array.from(medCounts.entries())
        .map(([name, count]) => ({ name, count, revenue: Math.round((medRevenue.get(name) || 0) * 100) / 100 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      return json({
        ok: true,
        entity: { entity_type: entityType, entity_id: entityId },
        window_days: days,
        kpis: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalOrders,
          totalPrescriptionsFilled,
          avgOrderValue,
          revenueChangePct,
          ordersChangePct,
        },
        dailyTrend,
        statusBreakdown,
        topMedications,
      });
    }

    return json({ ok: false, error: "Unsupported entityType" }, 400);
  } catch (e: any) {
    console.error("facility-analytics error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
