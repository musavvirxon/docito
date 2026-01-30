// Path: supabase/functions/facility-analytics/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EntityType = "lab" | "imaging" | "pharmacy";
type ReqBody = {
  entityType: EntityType;
  entityId: string;
  days?: number;
};

type ScopeRow = {
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  entity_status: string | null;
  scope_role: string | null;
  is_admin: boolean | null;
  permissions: Record<string, unknown> | null;
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

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function norm(s: unknown) {
  return String(s || "").trim().toLowerCase();
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function isoDay(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isCompletedReferral(status: unknown) {
  const s = norm(status);
  return s === "completed" || s === "complete" || s === "done";
}

function isCancelledReferral(status: unknown) {
  const s = norm(status);
  return s === "cancelled" || s === "canceled" || s === "rejected" || s === "declined";
}

function isPendingReferral(status: unknown) {
  const s = norm(status);
  return (
    s === "pending" ||
    s === "assigned" ||
    s === "in_progress" ||
    s === "in-progress" ||
    s === "processing"
  );
}

async function authorizeEntityAccess(params: {
  url: string;
  anon: string;
  authHeader: string;
  entityType: EntityType;
  entityId: string;
}): Promise<{ ok: true; userId: string; scope: ScopeRow } | { ok: false; status: number; error: string }> {
  const { url, anon, authHeader, entityType, entityId } = params;

  const supabaseUser = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) return { ok: false, status: 401, error: "Unauthorized" };

  const { data: scopes, error: scopesErr } = await supabaseUser.rpc("get_my_entity_scopes");
  if (scopesErr) return { ok: false, status: 500, error: scopesErr.message || "Failed to load scopes" };

  const list = (scopes || []) as ScopeRow[];
  const scope = list.find((s) => s.entity_type === entityType && String(s.entity_id) === entityId);
  if (!scope) return { ok: false, status: 403, error: "Forbidden" };

  return { ok: true, userId: userRes.user.id, scope };
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

  const entityType = (body as any)?.entityType as EntityType | undefined;
  const entityId = String((body as any)?.entityId || "").trim();
  const days = clampInt((body as any)?.days, 7, 365, 30);

  if (!entityType) return json({ ok: false, error: "Missing entityType" }, 400);
  if (!entityId || !isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);

  const authz = await authorizeEntityAccess({
    url: env.url,
    anon: env.anon,
    authHeader,
    entityType,
    entityId,
  });
  if (!authz.ok) return json({ ok: false, error: authz.error }, authz.status);

  const admin = createClient(env.url, env.service, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "facility-analytics" } },
  });

  try {
    const now = new Date();
    const endDay = startOfUtcDay(now); // start of today (UTC)
    const startDay = new Date(endDay);
    startDay.setUTCDate(startDay.getUTCDate() - (days - 1));

    const endExclusive = new Date(endDay);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    // Pull referrals for the window (and a small lookback for turnaround if needed)
    const lookbackStart = new Date(startDay);
    lookbackStart.setUTCDate(lookbackStart.getUTCDate() - 7);

    const { data: referrals, error: refErr } = await admin
      .from("referrals")
      .select("id, status, created_at, updated_at, completed_at")
      .eq("receiver_entity_type", entityType)
      .eq("receiver_entity_id", entityId)
      .gte("created_at", lookbackStart.toISOString())
      .lt("created_at", endExclusive.toISOString())
      .order("created_at", { ascending: true })
      .limit(20000);

    if (refErr) throw refErr;

    const rows = (referrals || []) as any[];

    // Filter to current window for KPIs & trend
    const windowRows = rows.filter((r) => {
      const t = r?.created_at ? new Date(r.created_at).getTime() : 0;
      return t >= startDay.getTime() && t < endExclusive.getTime();
    });

    const total = windowRows.length;
    const completed = windowRows.filter((r) => isCompletedReferral(r.status)).length;
    const cancelled = windowRows.filter((r) => isCancelledReferral(r.status)).length;
    const pending = windowRows.filter((r) => isPendingReferral(r.status)).length;

    // Average turnaround hours: compute for completed referrals in window
    const completedRows = windowRows.filter((r) => isCompletedReferral(r.status));
    const turnaroundHours = completedRows
      .map((r) => {
        const createdAt = r?.created_at ? new Date(r.created_at).getTime() : NaN;
        const completedAtRaw = r?.completed_at || r?.updated_at;
        const completedAt = completedAtRaw ? new Date(completedAtRaw).getTime() : NaN;
        if (!Number.isFinite(createdAt) || !Number.isFinite(completedAt) || completedAt < createdAt) return null;
        return (completedAt - createdAt) / (1000 * 60 * 60);
      })
      .filter((v) => v !== null) as number[];

    const avgTurnaroundHours =
      turnaroundHours.length > 0
        ? Math.round((turnaroundHours.reduce((a, b) => a + b, 0) / turnaroundHours.length) * 10) / 10
        : 0;

    // Build stable day buckets for trend
    const byDay: Record<
      string,
      { referrals: number; completed: number; cancelled: number; avg_turnaround_hours: number; _turnaround_sum: number; _turnaround_count: number }
    > = {};

    for (let i = 0; i < days; i++) {
      const d = new Date(startDay);
      d.setUTCDate(d.getUTCDate() + i);
      const key = isoDay(d);
      byDay[key] = {
        referrals: 0,
        completed: 0,
        cancelled: 0,
        avg_turnaround_hours: 0,
        _turnaround_sum: 0,
        _turnaround_count: 0,
      };
    }

    for (const r of windowRows) {
      const day = String(r?.created_at || "").slice(0, 10);
      if (!day || !(day in byDay)) continue;

      byDay[day].referrals += 1;
      if (isCompletedReferral(r.status)) {
        byDay[day].completed += 1;

        const createdAt = r?.created_at ? new Date(r.created_at).getTime() : NaN;
        const completedAtRaw = r?.completed_at || r?.updated_at;
        const completedAt = completedAtRaw ? new Date(completedAtRaw).getTime() : NaN;
        if (Number.isFinite(createdAt) && Number.isFinite(completedAt) && completedAt >= createdAt) {
          const h = (completedAt - createdAt) / (1000 * 60 * 60);
          byDay[day]._turnaround_sum += h;
          byDay[day]._turnaround_count += 1;
        }
      }
      if (isCancelledReferral(r.status)) byDay[day].cancelled += 1;
    }

    const trend = Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => {
        const avg =
          v._turnaround_count > 0
            ? Math.round((v._turnaround_sum / v._turnaround_count) * 10) / 10
            : 0;
        return {
          date,
          referrals: v.referrals,
          completed: v.completed,
          cancelled: v.cancelled,
          avg_turnaround_hours: avg,
        };
      });

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
  } catch (e: any) {
    console.error("facility-analytics error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
