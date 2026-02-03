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
    const payload = body?.payload ?? {};

    console.log(`[patient-self-service] Action: ${action}, User: ${user.id}`);

    // ===== ADD MEDICATION =====
    if (action === "add_medication") {
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

    // ===== ADD MEDICAL RECORD =====
    if (action === "add_medical_record") {
      const record_type = requireString(payload?.record_type ?? payload?.recordType, "record_type");
      const title = requireString(payload?.title, "title");
      const description = optionalString(payload?.description);
      const record_date = optionalISODate(payload?.record_date ?? payload?.recordDate) ?? new Date().toISOString().split('T')[0];
      const provider_name = optionalString(payload?.provider_name ?? payload?.providerName);
      const notes = optionalString(payload?.notes);

      const insertRow = {
        patient_id: user.id,
        record_type,
        title,
        description,
        record_date,
        provider_name,
        notes,
        created_by_patient: true,
      };

      const rlsAttempt = await userClient.from("medical_records").insert(insertRow as any).select("*").single();

      if (!rlsAttempt.error) {
        return jsonResponse({ ok: true, record: rlsAttempt.data }, { status: 200, origin });
      }

      if (!adminClient) {
        return jsonResponse({ ok: false, error: rlsAttempt.error.message }, { status: 500, origin });
      }

      const adminAttempt = await adminClient.from("medical_records").insert(insertRow as any).select("*").single();

      if (adminAttempt.error) {
        return jsonResponse({ ok: false, error: adminAttempt.error.message }, { status: 500, origin });
      }

      return jsonResponse(
        { ok: true, record: adminAttempt.data, warning: "rls_insert_failed_fallback_used" },
        { status: 200, origin },
      );
    }

    // ===== ADD TEST RESULT =====
    if (action === "add_test_result") {
      // Support both naming conventions from different client components
      const test_type = optionalString(payload?.test_type ?? payload?.testType ?? payload?.category) || "lab";
      const test_name = optionalString(payload?.test_name ?? payload?.testName ?? payload?.title) || "Test Result";
      const result_value = optionalString(payload?.result_value ?? payload?.resultValue);
      const result_unit = optionalString(payload?.result_unit ?? payload?.resultUnit);
      const test_date = optionalISODate(payload?.test_date ?? payload?.testDate) ?? new Date().toISOString().split('T')[0];
      const notes = optionalString(payload?.notes);
      const lab_name = optionalString(payload?.lab_name ?? payload?.labName);
      const attachment_bucket = optionalString(payload?.attachment_bucket);
      const attachment_paths = Array.isArray(payload?.attachment_paths) ? payload.attachment_paths : null;

      const insertRow = {
        patient_id: user.id,
        test_type,
        test_name,
        result_value,
        result_unit,
        test_date,
        notes,
        lab_name,
        attachment_bucket,
        attachment_paths,
        created_by_patient: true,
      };

      const rlsAttempt = await userClient.from("patient_test_results").insert(insertRow as any).select("*").single();

      if (!rlsAttempt.error) {
        return jsonResponse({ ok: true, test_result: rlsAttempt.data }, { status: 200, origin });
      }

      if (!adminClient) {
        return jsonResponse({ ok: false, error: rlsAttempt.error.message }, { status: 500, origin });
      }

      const adminAttempt = await adminClient.from("patient_test_results").insert(insertRow as any).select("*").single();

      if (adminAttempt.error) {
        return jsonResponse({ ok: false, error: adminAttempt.error.message }, { status: 500, origin });
      }

      return jsonResponse(
        { ok: true, test_result: adminAttempt.data, warning: "rls_insert_failed_fallback_used" },
        { status: 200, origin },
      );
    }

    // ===== UPDATE MEDICATION =====
    if (action === "update_medication") {
      const id = requireString(payload?.id, "id");
      
      const updateData: any = {};
      if (payload?.name) updateData.name = requireString(payload.name, "name");
      if (payload?.dosage) updateData.dosage = requireString(payload.dosage, "dosage");
      if (payload?.frequency) updateData.frequency = requireString(payload.frequency, "frequency");
      if (payload?.instructions !== undefined) updateData.instructions = optionalString(payload.instructions);
      if (payload?.status) {
        const statusRaw = optionalString(payload.status) ?? "active";
        updateData.status = ["active", "completed", "discontinued", "paused"].includes(statusRaw) ? statusRaw : "active";
      }
      if (payload?.start_date || payload?.startDate) {
        updateData.start_date = optionalISODate(payload.start_date ?? payload.startDate);
      }
      if (payload?.end_date || payload?.endDate) {
        updateData.end_date = optionalISODate(payload.end_date ?? payload.endDate);
      }

      const rlsAttempt = await userClient
        .from("medications")
        .update(updateData)
        .eq("id", id)
        .eq("patient_id", user.id)
        .select("*")
        .single();

      if (!rlsAttempt.error) {
        return jsonResponse({ ok: true, medication: rlsAttempt.data }, { status: 200, origin });
      }

      if (!adminClient) {
        return jsonResponse({ ok: false, error: rlsAttempt.error.message }, { status: 500, origin });
      }

      const adminAttempt = await adminClient
        .from("medications")
        .update(updateData)
        .eq("id", id)
        .eq("patient_id", user.id)
        .select("*")
        .single();

      if (adminAttempt.error) {
        return jsonResponse({ ok: false, error: adminAttempt.error.message }, { status: 500, origin });
      }

      return jsonResponse(
        { ok: true, medication: adminAttempt.data, warning: "rls_update_failed_fallback_used" },
        { status: 200, origin },
      );
    }

    // ===== DELETE MEDICATION =====
    if (action === "delete_medication") {
      const id = requireString(payload?.id, "id");

      const rlsAttempt = await userClient
        .from("medications")
        .delete()
        .eq("id", id)
        .eq("patient_id", user.id)
        .eq("created_by_patient", true);

      if (!rlsAttempt.error) {
        return jsonResponse({ ok: true }, { status: 200, origin });
      }

      if (!adminClient) {
        return jsonResponse({ ok: false, error: rlsAttempt.error.message }, { status: 500, origin });
      }

      const adminAttempt = await adminClient
        .from("medications")
        .delete()
        .eq("id", id)
        .eq("patient_id", user.id)
        .eq("created_by_patient", true);

      if (adminAttempt.error) {
        return jsonResponse({ ok: false, error: adminAttempt.error.message }, { status: 500, origin });
      }

      return jsonResponse({ ok: true, warning: "rls_delete_failed_fallback_used" }, { status: 200, origin });
    }

    // ===== GET PATIENT DATA =====
    if (action === "get_patient_data") {
      const dataType = optionalString(payload?.data_type ?? payload?.dataType) ?? "all";

      const result: any = {};

      if (dataType === "all" || dataType === "medications") {
        const { data: medications } = await userClient
          .from("medications")
          .select("*")
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false });
        result.medications = medications ?? [];
      }

      if (dataType === "all" || dataType === "medical_records") {
        const { data: records } = await userClient
          .from("medical_records")
          .select("*")
          .eq("patient_id", user.id)
          .order("record_date", { ascending: false });
        result.medical_records = records ?? [];
      }

      if (dataType === "all" || dataType === "test_results") {
        const { data: tests } = await userClient
          .from("patient_test_results")
          .select("*")
          .eq("patient_id", user.id)
          .order("test_date", { ascending: false });
        result.test_results = tests ?? [];
      }

      return jsonResponse({ ok: true, data: result }, { status: 200, origin });
    }

    return jsonResponse({ ok: false, error: "unknown_action" }, { status: 400, origin });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    console.error(`[patient-self-service] Error: ${msg}`);
    return jsonResponse({ ok: false, error: msg }, { status: 500, origin });
  }
});
