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

type ScopeRow = {
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  entity_status: string | null;
  scope_role: string | null;
  is_admin: boolean | null;
  permissions: Record<string, any> | null;
};

function hasPermission(scope: ScopeRow, key: string): boolean {
  const perms = scope.permissions || {};
  const v = perms[key];
  return v === true;
}

async function authorizeFacilityAccess(params: {
  url: string;
  anon: string;
  service: string;
  authHeader: string | null;
  entityType: EntityType;
  entityId: string;
  required: { anyOf: string[] };
}) {
  if (!params.authHeader) return { ok: false as const, error: "Missing Authorization header" };

  const userClient = createClient(params.url, params.anon, {
    global: { headers: { Authorization: params.authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return { ok: false as const, error: "Unauthorized" };

  const serviceClient = createClient(params.url, params.service, { auth: { persistSession: false } });

  const { data: scopes, error: scopesErr } = await serviceClient.rpc("get_my_entity_scopes" as any, {});
  if (scopesErr) return { ok: false as const, error: "Unable to authorize access" };

  const wanted = (scopes as ScopeRow[] | null)?.find((s) => s.entity_type === params.entityType && s.entity_id === params.entityId) || null;
  if (!wanted) return { ok: false as const, error: "Forbidden" };

  const isAdmin = !!wanted.is_admin;
  const okByPermission = params.required.anyOf.some((k) => hasPermission(wanted, k));
  if (!isAdmin && !okByPermission) return { ok: false as const, error: "Forbidden" };

  return { ok: true as const, userId: userData.user.id, scope: wanted, serviceClient };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const env = requireEnv();
    if (!env.ok) return json(env, 500);

    const authHeader = req.headers.get("authorization");
    const body = (await req.json().catch(() => null)) as ReqBody | null;
    if (!body) return json({ ok: false, error: "Invalid JSON body" }, 400);

    const entityType = body.entityType;
    const entityId = body.entityId;
    if (!entityType || !entityId) return json({ ok: false, error: "Missing entityType/entityId" }, 400);
    if (!isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);

    const authz = await authorizeFacilityAccess({
      url: env.url,
      anon: env.anon,
      service: env.service,
      authHeader,
      entityType,
      entityId,
      required: { anyOf: ["analytics:view", "analytics:manage"] },
    });

    if (!authz.ok) return json(authz, 403);

    const days = Math.max(1, Math.min(365, body.days ?? 30));
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - days);
    const startIso = start.toISOString();

    const { data: referrals, error: refErr } = await authz.serviceClient
      .from("referrals")
      .select("id,created_at,status,reason,referral_type_enum")
      .eq("referred_to_entity_type", entityType)
      .eq("referred_to_entity_id", entityId)
      .gte("created_at", startIso);

    if (refErr) throw refErr;

    const list = (referrals || []) as Array<any>;
    const total = list.length;
    const completed = list.filter((r) => r.status === "completed").length;
    const pending = list.filter((r) => r.status === "pending").length;
    const cancelled = list.filter((r) => r.status === "cancelled").length;

    const byDate = new Map<string, { date: string; referrals: number; completed: number; pending: number; cancelled: number }>();
    for (let i = 0; i <= days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      byDate.set(key, { date: key, referrals: 0, completed: 0, pending: 0, cancelled: 0 });
    }

    for (const r of list) {
      const key = new Date(r.created_at).toISOString().slice(0, 10);
      const row = byDate.get(key);
      if (!row) continue;
      row.referrals += 1;
      if (r.status === "completed") row.completed += 1;
      if (r.status === "pending") row.pending += 1;
      if (r.status === "cancelled") row.cancelled += 1;
    }

    const trend = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

    return json({
      ok: true,
      window_days: days,
      kpis: {
        total_referrals: total,
        completed_referrals: completed,
        pending_referrals: pending,
        cancelled_referrals: cancelled,
      },
      trend,
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Server error" }, 500);
  }
});
