// File: supabase/functions/entity-settings/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EntityType = "practice" | "clinic" | "lab" | "imaging" | "pharmacy";

type ReqBody =
  | { action: "get"; entityType: EntityType; entityId: string }
  | { action: "save"; entityType: EntityType; entityId: string; payload: Record<string, unknown> };

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

  const supabase = createClient(env.url, env.anon, { global: { headers: { Authorization: authHeader } } });

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  if (!body?.action) return json({ ok: false, error: "Missing action" }, 400);

  try {
    if (body.action === "get") {
      const { data, error } = await supabase.rpc("get_entity_settings", {
        p_entity_type: body.entityType,
        p_entity_id: body.entityId,
      });
      if (error) throw error;

      return json({ ok: true, settings: data || null });
    }

    if (body.action === "save") {
      const { data, error } = await supabase.rpc("upsert_entity_settings", {
        p_entity_type: body.entityType,
        p_entity_id: body.entityId,
        p_payload: body.payload ?? {},
      });
      if (error) throw error;

      return json({ ok: true, settings: data });
    }

    return json({ ok: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    console.error("entity-settings error:", e);
    const msg = e?.message || "Unknown error";
    if (msg.toLowerCase().includes("forbidden")) return json({ ok: false, error: "Forbidden" }, 403);
    return json({ ok: false, error: msg }, 500);
  }
});
