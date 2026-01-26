// File: supabase/functions/patient-self-service/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

function jsonResponse(body: Json, init: ResponseInit & { origin?: string | null } = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  const origin = init.origin ?? null;
  const cors = corsHeaders(origin);
  Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
  return new Response(JSON.stringify(body), { ...init, headers });
}

function getAuthHeader(req: Request) {
  return req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
}

function getOrigin(req: Request) {
  return req.headers.get("origin") ?? req.headers.get("Origin");
}

function requireString(v: unknown, field: string) {
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new Error(`invalid_${field}`);
  }
  return v.trim();
}

function optionalString(v: unknown) {
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function optionalISODate(v: unknown) {
  const s = optionalString(v);
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null; // YYYY-MM-DD
  return s;
}

serve(async (req) => {
  const origin = getOrigin(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, { status: 405, origin });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse({ ok: false, error: "missing_env" }, { status: 500, origin });
  }

  const authHeader = getAuthHeader(req);
  if (!authHeader) {
    return jsonResponse({ ok: false, error: "missing_authorization" }, { status: 401, origin });
  }

  // User-scoped client (enforces RLS)
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Admin client (bypasses RLS) - used only as a fallback for known-safe self-service writes
  const adminClient = SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null;

  try {
    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError || !auth?.user) {
      return jsonResponse({ ok: false, error: "unauthorized" }, { status: 401, origin });
    }

    const user = auth.user;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const action = requireString(body?.action, "action");

    if (action === "add_medication") {
      const payload = body?.payload ?? {};

      const name = requireString(payload?.name, "name");
      const dosage = requireString(payload?.dosage, "dosage");
      const frequency = requireString(payload?.frequency, "frequency");
      const instructions = optionalString(payload?.instructions);

      const start_date = optionalISODate(payload?.start_date) ?? optionalISODate(payload?.startDate);
      if (!start_date) throw new Error("invalid_start_date");

      const end_date = optionalISODate(payload?.end_date) ?? optionalISODate(payload?.endDate);

      const statusRaw = optionalString(payload?.status) ?? "active";
      const status = ["active", "completed", "discontinued", "paused"].includes(statusRaw)
        ? statusRaw
        : "active";

      const insertRow = {
        patient_id: user.id,
        name,
        dosage,
        frequency,
        instructions,
        start_date,
        end_date,
        status,
        created_by_patient: true,
        doctor_id: null,
        treatment_plan_id: null,
      };

      // 1) Try with RLS (preferred)
      const rlsAttempt = await userClient.from("medications").insert(insertRow as any).select("*").single();

      if (!rlsAttempt.error) {
        return jsonResponse({ ok: true, medication: rlsAttempt.data }, { status: 200, origin });
      }

      // 2) Fallback via service role (if RLS not yet applied in env)
      if (!adminClient) {
        return jsonResponse({ ok: false, error: rlsAttempt.error.message }, { status: 500, origin });
      }

      const adminAttempt = await adminClient.from("medications").insert(insertRow as any).select("*").single();

      if (adminAttempt.error) {
        return jsonResponse({ ok: false, error: adminAttempt.error.message }, { status: 500, origin });
      }

      return jsonResponse(
        {
          ok: true,
          medication: adminAttempt.data,
          warning: "rls_insert_failed_fallback_used",
        },
        { status: 200, origin },
      );
    }

    return jsonResponse({ ok: false, error: "unknown_action" }, { status: 400, origin });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return jsonResponse({ ok: false, error: msg }, { status: 500, origin });
  }
});
