// File: supabase/functions/notify/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EntityType = "practice" | "clinic" | "lab" | "imaging" | "pharmacy" | "doctor" | "patient" | "platform";
type Level = "info" | "success" | "warning" | "error";

type ReqBody = {
  action: "create";
  user_id: string;
  entity_type: EntityType;
  entity_id?: string | null;
  level?: Level;
  title: string;
  body?: string | null;
  action_url?: string | null;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function requireEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const url = requireEnv("SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    // NOTE: This function is intended for server/serverless callers only.
    // We still require Authorization, and we require caller to be super_admin.
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) return json({ ok: false, error: "Unauthorized" }, 401);

    // Verify super_admin with service role
    const service = createClient(url, serviceKey);

    const { data: roleRow, error: roleErr } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (roleErr) throw roleErr;
    if (!roleRow) return json({ ok: false, error: "Forbidden" }, 403);

    const body = (await req.json()) as ReqBody;

    if (body.action !== "create") return json({ ok: false, error: "Invalid action" }, 400);
    if (!body.user_id || !body.entity_type || !body.title) return json({ ok: false, error: "Missing fields" }, 400);

    const { data: insertedId, error: insErr } = await service.rpc("create_notification", {
      p_user_id: body.user_id,
      p_entity_type: body.entity_type,
      p_entity_id: body.entity_id ?? null,
      p_level: body.level ?? "info",
      p_title: body.title,
      p_body: body.body ?? null,
      p_action_url: body.action_url ?? null,
    });

    if (insErr) throw insErr;

    return json({ ok: true, id: insertedId });
  } catch (e) {
    return json({ ok: false, error: String((e as any)?.message ?? e) }, 500);
  }
});
