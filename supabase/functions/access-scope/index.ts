// Path: supabase/functions/access-scope/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ScopeRow = {
  entity_type: "clinic" | "lab" | "imaging" | "pharmacy" | string;
  entity_id: string;
  entity_name: string | null;
  entity_status: "active" | "pending" | "verified" | "suspended" | string;
  scope_role: string | null;
  is_admin: boolean;
  permissions: Record<string, unknown> | null;
};

type ReqBody = { action?: "get" };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" };
  return { ok: true as const, url, anon };
}

const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 100,

  doctor: 90,

  pharmacy_admin: 88,
  lab_admin: 88,
  imaging_admin: 88,
  clinic_admin: 88,
  admin: 86,

  pharmacist: 60,
  lab_technician: 60,
  internal_imaging_tech: 60,

  pharmacy_staff: 55,
  lab_staff: 55,
  imaging_staff: 55,

  nurse: 50,
  receptionist: 45,
  clinic_staff: 40,
  staff: 35,

  patient: 10,
  practice_staff: 20,
};

function pickPrimary(scopes: ScopeRow[]): ScopeRow | null {
  if (!scopes.length) return null;
  let best = scopes[0];
  let bestScore = ROLE_PRIORITY[String(best.scope_role || "").toLowerCase()] ?? (best.is_admin ? 80 : 30);

  for (const s of scopes.slice(1)) {
    const score = ROLE_PRIORITY[String(s.scope_role || "").toLowerCase()] ?? (s.is_admin ? 80 : 30);
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const supabase = createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody = {};
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    body = {};
  }

  if (body.action && body.action !== "get") return json({ ok: false, error: "Invalid action" }, 400);

  const { data, error } = await supabase.rpc("get_my_entity_scopes");
  if (error) return json({ ok: false, error: error.message }, 500);

  const scopes = (data || []) as ScopeRow[];
  const primary = pickPrimary(scopes);

  return json({
    ok: true,
    userId: userRes.user.id,
    scopes,
    primary,
  });
});
