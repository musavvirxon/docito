// Path: supabase/functions/entity-dashboard/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EntityType = "clinic" | "lab" | "imaging" | "pharmacy";
type Action = "billing" | "analytics";

type ReqBody =
  | { action: "billing"; entityType: EntityType; entityId: string; limit?: number }
  | { action: "analytics"; entityType: EntityType; entityId: string; days?: number };

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

async function authorizeEntityAccess(params: {
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

async function loadClinicBilling(serviceClient: ReturnType<typeof createClient>, entityType: EntityType, entityId: string, limit: number) {
  const { data: invoices, error: invErr } = await serviceClient
    .from("billing_invoices")
    .select("id,status,currency,amount_due_cents,amount_paid_cents,amount_remaining_cents,due_at,paid_at,created_at,hosted_invoice_url,invoice_pdf_url")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (invErr) throw invErr;

  const { data: transactions, error: txErr } = await serviceClient
    .from("billing_transactions")
    .select("id,entity_type,entity_id,status,transaction_type,currency,amount_cents,provider,provider_ref,invoice_id,created_at,metadata")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit * 2);

  if (txErr) throw txErr;

  const txs = (transactions || []) as Array<any>;
  const totalPaid = txs.filter((t) => t.status === "completed" && t.transaction_type === "charge").reduce((s, t) => s + (t.amount_cents || 0), 0);
  const totalRefunded = txs.filter((t) => t.status === "completed" && t.transaction_type === "refund").reduce((s, t) => s + (t.amount_cents || 0), 0);

  const invs = (invoices || []) as Array<any>;
  const outstanding = invs.filter((i) => i.status === "open").reduce((s, i) => s + (i.amount_remaining_cents || 0), 0);
  const openInvoiceCount = invs.filter((i) => i.status === "open").length;
  const currency = invs?.[0]?.currency || txs?.[0]?.currency || "usd";

  return {
    ok: true,
    currency,
    summary: {
      total_paid_cents: totalPaid,
      total_refunded_cents: totalRefunded,
      outstanding_cents: outstanding,
      open_invoice_count: openInvoiceCount,
    },
    invoices: invs,
    transactions: txs.map((t) => ({
      ...t,
      provider_ref: t.provider_ref ?? null,
      invoice_id: t.invoice_id ?? null,
      metadata: t.metadata ?? null,
    })),
  };
}

async function loadClinicAnalytics(serviceClient: ReturnType<typeof createClient>, entityType: EntityType, entityId: string, days: number) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - Math.max(1, Math.min(365, days)));

  const startIso = start.toISOString();

  const { data: appts, error: apptErr } = await serviceClient
    .from("appointments")
    .select("id,start_time,status,price_cents")
    .eq("clinic_id", entityId)
    .gte("start_time", startIso);

  if (apptErr) throw apptErr;

  const { data: txs, error: txErr } = await serviceClient
    .from("billing_transactions")
    .select("created_at,status,transaction_type,amount_cents,currency")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .gte("created_at", startIso);

  if (txErr) throw txErr;

  const apptList = (appts || []) as Array<any>;
  const txList = (txs || []) as Array<any>;

  const totalAppointments = apptList.length;
  const completedAppointments = apptList.filter((a) => a.status === "completed").length;
  const cancelledAppointments = apptList.filter((a) => a.status === "cancelled").length;

  const totalRevenue = txList
    .filter((t) => t.status === "completed" && t.transaction_type === "charge")
    .reduce((s, t) => s + (t.amount_cents || 0), 0);

  const totalRefunds = txList
    .filter((t) => t.status === "completed" && t.transaction_type === "refund")
    .reduce((s, t) => s + (t.amount_cents || 0), 0);

  const currency = txList?.[0]?.currency || "usd";

  const byDate = new Map<string, { date: string; appointments: number; completed: number; revenue_cents: number }>();
  for (let i = 0; i <= days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, { date: key, appointments: 0, completed: 0, revenue_cents: 0 });
  }

  for (const a of apptList) {
    const key = new Date(a.start_time).toISOString().slice(0, 10);
    const row = byDate.get(key);
    if (!row) continue;
    row.appointments += 1;
    if (a.status === "completed") row.completed += 1;
  }

  for (const t of txList) {
    const key = new Date(t.created_at).toISOString().slice(0, 10);
    const row = byDate.get(key);
    if (!row) continue;
    if (t.status === "completed" && t.transaction_type === "charge") row.revenue_cents += t.amount_cents || 0;
    if (t.status === "completed" && t.transaction_type === "refund") row.revenue_cents -= t.amount_cents || 0;
  }

  const trend = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    ok: true,
    window_days: days,
    currency,
    kpis: {
      total_appointments: totalAppointments,
      completed_appointments: completedAppointments,
      cancelled_appointments: cancelledAppointments,
      revenue_cents: totalRevenue - totalRefunds,
    },
    trend,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const env = requireEnv();
    if (!env.ok) return json(env, 500);

    const authHeader = req.headers.get("authorization");
    const body = (await req.json().catch(() => null)) as ReqBody | null;
    if (!body) return json({ ok: false, error: "Invalid JSON body" }, 400);

    if (!("action" in body)) return json({ ok: false, error: "Missing action" }, 400);

    const action = body.action as Action;
    const entityType = (body as any).entityType as EntityType;
    const entityId = (body as any).entityId as string;

    if (!entityType || !entityId) return json({ ok: false, error: "Missing entityType/entityId" }, 400);
    if (!isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);

    const required =
      action === "billing"
        ? { anyOf: ["billing:view", "billing:manage"] }
        : { anyOf: ["analytics:view", "analytics:manage"] };

    const authz = await authorizeEntityAccess({
      url: env.url,
      anon: env.anon,
      service: env.service,
      authHeader,
      entityType,
      entityId,
      required,
    });

    if (!authz.ok) return json(authz, 403);

    if (action === "billing") {
      const limit = Math.max(1, Math.min(200, (body as any).limit ?? 50));
      const data = await loadClinicBilling(authz.serviceClient, entityType, entityId, limit);
      return json(data);
    }

    if (action === "analytics") {
      const days = Math.max(1, Math.min(365, (body as any).days ?? 30));
      const data = await loadClinicAnalytics(authz.serviceClient, entityType, entityId, days);
      return json(data);
    }

    return json({ ok: false, error: "Unsupported action" }, 400);
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Server error" }, 500);
  }
});
