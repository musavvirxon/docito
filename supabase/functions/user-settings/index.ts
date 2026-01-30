// File: supabase/functions/user-settings/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Json = Record<string, unknown>;

type ReqBody =
  | { action: "get" }
  | { action: "upsert"; settings: Json; merge?: boolean };

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseAuthHeader(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  if (/^Bearer\s+/i.test(h)) return h;
  return `Bearer ${h}`;
}

function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !anon || !service) {
    return {
      ok: false as const,
      error: "missing_env",
      detail: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
    };
  }
  return { ok: true as const, url, anon, service };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "method_not_allowed" });
  }

  const env = requireEnv();
  if (!env.ok) {
    return jsonResponse(500, { ok: false, error: env.error, detail: env.detail });
  }

  const authHeader = parseAuthHeader(req);
  if (!authHeader) return jsonResponse(401, { ok: false, error: "missing_auth" });

  const userClient = createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) {
    return jsonResponse(401, { ok: false, error: "invalid_auth" });
  }

  let body: ReqBody | null = null;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    body = null;
  }

  if (!body || !(body as any).action) {
    return jsonResponse(400, { ok: false, error: "invalid_body" });
  }

  const action = (body as any).action as ReqBody["action"];
  const userId = userRes.user.id;

  // Use service role for upsert (explicit user scoping enforced).
  const admin = createClient(env.url, env.service, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "user-settings" } },
  });

  try {
    if (action === "get") {
      // Prefer RLS-safe read; fall back to service role if needed.
      const { data: row, error: rlsErr } = await userClient
        .from("user_settings")
        .select("settings, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (!rlsErr) {
        return jsonResponse(200, {
          ok: true,
          settings: (row?.settings as Json) || {},
          meta: { created_at: row?.created_at ?? null, updated_at: row?.updated_at ?? null },
        });
      }

      const { data: row2, error: adminErr } = await admin
        .from("user_settings")
        .select("settings, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (adminErr) throw adminErr;

      return jsonResponse(200, {
        ok: true,
        settings: (row2?.settings as Json) || {},
        meta: { created_at: row2?.created_at ?? null, updated_at: row2?.updated_at ?? null },
      });
    }

    if (action === "upsert") {
      const incoming = (body as any).settings;
      const merge = (body as any).merge !== false;

      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
        return jsonResponse(400, { ok: false, error: "invalid_settings" });
      }

      let next = incoming as Json;

      if (merge) {
        const { data: existing, error: selErr } = await admin
          .from("user_settings")
          .select("settings")
          .eq("user_id", userId)
          .maybeSingle();

        if (selErr) throw selErr;

        const prev = ((existing?.settings as any) || {}) as Json;
        next = { ...prev, ...next };
      }

      const { data: up, error: upErr } = await admin
        .from("user_settings")
        .upsert({ user_id: userId, settings: next }, { onConflict: "user_id" })
        .select("settings, created_at, updated_at")
        .single();

      if (upErr) throw upErr;

      return jsonResponse(200, {
        ok: true,
        settings: (up?.settings as Json) || {},
        meta: { created_at: up?.created_at ?? null, updated_at: up?.updated_at ?? null },
      });
    }

    return jsonResponse(400, { ok: false, error: "unknown_action" });
  } catch (e: any) {
    const msg = String(e?.message || e || "");
    return jsonResponse(500, { ok: false, error: "server_error", detail: msg });
  }
});
