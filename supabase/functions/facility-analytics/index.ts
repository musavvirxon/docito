// Path: supabase/functions/facility-analytics/index.ts
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
  permissions: Record<string, any> | null;
};

type ReqBody = {
  entityType: EntityType;
  entityId: string;
  days?: number;
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
  const perms = scope.permissions || {};
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
  const allowed =
    Boolean(scope.is_admin) ||
    hasPermission(scope, "can_view_analytics") ||
    hasPermission(scope, "can_manage_billing");

  if (!allowed) return { ok: false, status: 403, error: "Forbidden" };

  return { ok: true, userId: userRes.user.id, scope };
}

function isoDay(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

  const entityType = (body?.entityType || "") as EntityType;
  const entityId = String(body?.entityId || "").trim();
  if (!entityType || !["lab", "imaging", "pharmacy"].includes(entityType)) {
    return json({ ok: false, error: "Invalid entityType" }, 400);
  }
  if (!entityId || !isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);

  const days = clampInt(body?.days, 7, 365, 30);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

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
    const { data: refs, error: refErr } = await admin
      .from("referrals")
      .select("id, status, created_at, completed_at")
      .eq("receiver_entity_type", entityType)
      .eq("receiver_entity_id", entityId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .limit(5000);

    if (refErr) throw refErr;

    const r = (refs || []) as any[];

    const total = r.length;

    const completed = r.filter((x) => String(x.status || "").toLowerCase() === "completed").length;

    const pending = r.filter((x) => {
      const s = String(x.status || "").toLowerCase();
      return s === "pending" || s === "assigned" || s === "in_progress";
    }).length;

    const cancelled = r.filter((x) => {
      const s = String(x.status || "").toLowerCase();
      return s === "cancelled" || s === "canceled" || s === "rejected";
    }).length;

    // Average turnaround time (hours) for completed referrals
    const completedDurationsHours: number[] = [];
    for (const x of r) {
      const s = String(x.status || "").toLowerCase();
      if (s !== "completed") continue;

      const createdAt = x.created_at ? new Date(x.created_at) : null;
      const completedAt = x.completed_at ? new Date(x.completed_at) : null;
      if (!createdAt || !completedAt) continue;

      const diffMs = completedAt.getTime() - createdAt.getTime();
      if (diffMs <= 0) continue;

      completedDurationsHours.push(diffMs / (1000 * 60 * 60));
    }
    const avgTurnaroundHours =
      completedDurationsHours.length > 0
        ? Math.round((completedDurationsHours.reduce((a, b) => a + b, 0) / completedDurationsHours.length) * 10) / 10
        : 0;

    // Trend: referrals per day over window
    const dayMap = new Map<string, { referrals: number; completed: number }>();
    // fill bucket days
    const end = new Date();
    const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    for (let i = 0; i < days; i++) {
      const d = new Date(endUTC);
      d.setUTCDate(d.getUTCDate() - (days - 1 - i));
      dayMap.set(isoDay(d), { referrals: 0, completed: 0 });
    }

    for (const x of r) {
      const createdAt = x.created_at ? new Date(x.created_at) : null;
      if (!createdAt) continue;

      const day = isoDay(createdAt);
      if (!dayMap.has(day)) continue;

      const bucket = dayMap.get(day)!;
      bucket.referrals += 1;

      const s = String(x.status || "").toLowerCase();
      if (s === "completed") bucket.completed += 1;

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
  } catch (e: any) {
    console.error("facility-analytics error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
