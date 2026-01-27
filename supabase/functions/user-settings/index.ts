// Path: supabase/functions/user-settings/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody =
  | { action: "get" }
  | { action: "upsert"; settings: Record<string, unknown>; merge?: boolean };

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const authed = createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const action = (body as any)?.action as ReqBody["action"] | undefined;
  if (!action) return json({ ok: false, error: "Missing action" }, 400);

  const userId = userRes.user.id;

  // Service role used for writes (manual user scoping enforced).
  const admin = createClient(env.url, env.service, {
    auth: { persistSession: false },
    global: { "X-Client-Info": "user-settings" } as any,
  });

  try {
    if (action === "get") {
      const { data, error } = await authed
        .from("user_settings")
        .select("settings, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      return json({
        ok: true,
        settings: (data?.settings as Record<string, unknown>) || {},
        meta: { created_at: data?.created_at ?? null, updated_at: data?.updated_at ?? null },
      });
    }

    if (action === "upsert") {
      const incoming = (body as any)?.settings;
      const merge = (body as any)?.merge !== false;

      if (!incoming || typeof incoming !== "object") return json({ ok: false, error: "Invalid settings" }, 400);

      let next = incoming as Record<string, unknown>;

      if (merge) {
        const { data: existing, error: selErr } = await admin
          .from("user_settings")
          .select("settings")
          .eq("user_id", userId)
          .maybeSingle();

        if (selErr) throw selErr;

        const prev = ((existing?.settings as any) || {}) as Record<string, unknown>;
        next = { ...prev, ...next };
      }

      const { data, error } = await admin
        .from("user_settings")
        .upsert({ user_id: userId, settings: next }, { onConflict: "user_id" })
        .select("settings, created_at, updated_at")
        .single();

      if (error) throw error;

      return json({
        ok: true,
        settings: (data.settings as Record<string, unknown>) || {},
        meta: { created_at: data.created_at ?? null, updated_at: data.updated_at ?? null },
      });
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("user-settings error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
