// File: supabase/functions/finance-ensure-default-categories/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type ReqBody = {
  entityType: FinanceEntityType;
  entityId: string;
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

function normalizeEntityType(v: string): FinanceEntityType | null {
  const t = String(v || "").toLowerCase().trim();
  if (t === "clinic" || t === "lab" || t === "imaging" || t === "pharmacy") return t as FinanceEntityType;
  return null;
}

async function assertAccess(userClient: any, entityType: FinanceEntityType, entityId: string) {
  const { data, error } = await userClient.rpc("can_access_entity", {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw error;
  return Boolean(data);
}

const DEFAULT_CATEGORIES: Array<{ kind: "income" | "expense" | "payroll"; name: string }> = [
  { kind: "income", name: "Services" },
  { kind: "income", name: "Other income" },

  { kind: "expense", name: "Supplies" },
  { kind: "expense", name: "Utilities" },
  { kind: "expense", name: "Rent" },
  { kind: "expense", name: "Taxes" },
  { kind: "expense", name: "Maintenance" },
  { kind: "expense", name: "Other expenses" },

  { kind: "payroll", name: "Payroll" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const userClient = createClient(env.url, env.anon, { global: { headers: { Authorization: authHeader } } });
  const { data: u, error: uErr } = await userClient.auth.getUser();
  if (uErr || !u?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const entityType = normalizeEntityType((body as any)?.entityType);
  const entityId = String((body as any)?.entityId || "").trim();

  if (!entityType) return json({ ok: false, error: "Invalid entityType" }, 400);
  if (!isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);

  try {
    const allowed = await assertAccess(userClient, entityType, entityId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    const serviceClient = createClient(env.url, env.service);

    const rows = DEFAULT_CATEGORIES.map((c) => ({
      entity_type: entityType,
      entity_id: entityId,
      kind: c.kind,
      name: c.name,
      is_default: true,
      created_by: u.user.id,
    }));

    // Upsert by unique constraint (entity_type, entity_id, kind, name_norm)
    const { error } = await serviceClient
      .from("finance_categories")
      .upsert(rows as any[], { onConflict: "entity_type,entity_id,kind,name_norm" });

    if (error) throw error;

    return json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to ensure defaults" }, 500);
  }
});
