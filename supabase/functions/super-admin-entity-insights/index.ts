import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = {
  entityType: "clinic" | "pharmacy" | "laboratory" | "imaging" | "lab" | "practice";
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
  if (!url || !anon) return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" };
  return { ok: true as const, url, anon };
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

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  if (!body?.entityType || !body?.entityId) {
    return json({ ok: false, error: "Missing entityType/entityId" }, 400);
  }

  try {
    const { data, error } = await supabase.rpc("super_admin_entity_insights", {
      p_entity_type: body.entityType,
      p_entity_id: body.entityId,
    });

    if (error) throw error;

    return json({ ok: true, data });
  } catch (e: any) {
    const msg = String(e?.message || "Unknown error");
    const lower = msg.toLowerCase();

    if (lower.includes("forbidden")) return json({ ok: false, error: "Forbidden" }, 403);
    if (lower.includes("permission") || lower.includes("rls")) return json({ ok: false, error: "Forbidden" }, 403);
    if (lower.includes("invalid input syntax for type uuid")) {
      return json({ ok: false, error: "Invalid entityId (uuid)" }, 400);
    }

    console.error("super-admin-entity-insights error:", e);
    return json({ ok: false, error: msg }, 500);
  }
});
