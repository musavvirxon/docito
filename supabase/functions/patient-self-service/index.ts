// File: supabase/functions/patient-self-service/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "add_medication" | "add_medical_record" | "add_test_result";

type ReqBody =
  | {
      action: "add_medication";
      payload: {
        name: string;
        dosage: string;
        route?: string;
        frequency: string;
        instructions?: string | null;
        start_date: string; // YYYY-MM-DD
        end_date?: string | null; // YYYY-MM-DD
        reminder_enabled?: boolean;
      };
    }
  | {
      action: "add_medical_record";
      payload: {
        title: string;
        record_type: string;
        record_date: string; // YYYY-MM-DD
        description?: string | null;
        doctor_name?: string | null;
        practice_name?: string | null;
        attachment_bucket?: string;
        attachment_paths?: string[];
      };
    }
  | {
      action: "add_test_result";
      payload: {
        category: "lab" | "imaging" | "other";
        title: string;
        test_date: string; // YYYY-MM-DD
        notes?: string | null;
        attachment_bucket?: string;
        attachment_paths?: string[];
      };
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
  if (!url || !anon) {
    return {
      ok: false as const,
      error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY",
    };
  }
  return { ok: true as const, url, anon };
}

function asString(v: unknown) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function trimOrNull(v: unknown) {
  const s = asString(v).trim();
  return s ? s : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  // Authenticated client (RLS enforced)
  const supabase = createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);
  const userId = userRes.user.id;

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const action = body?.action as Action;
  if (!action) return json({ ok: false, error: "Missing action" }, 400);

  try {
    if (action === "add_medication") {
      const p = body.payload;

      const name = asString(p?.name).trim();
      const dosage = asString(p?.dosage).trim();
      const frequency = asString(p?.frequency).trim();
      const route = asString(p?.route || "oral").trim() || "oral";
      const start_date = asString(p?.start_date).trim();

      if (!name || !dosage || !frequency || !start_date) {
        return json({ ok: false, error: "Missing required fields (name, dosage, frequency, start_date)" }, 400);
      }

      const insertRow = {
        patient_id: userId,
        name,
        dosage,
        route,
        frequency,
        instructions: trimOrNull(p?.instructions),
        start_date,
        end_date: trimOrNull(p?.end_date),
        reminder_enabled: typeof p?.reminder_enabled === "boolean" ? p.reminder_enabled : true,
        status: "active",
      };

      const { data, error } = await supabase
        .from("medications")
        .insert(insertRow as any)
        .select("*")
        .single();

      if (error) throw error;
      return json({ ok: true, medication: data });
    }

    if (action === "add_medical_record") {
      const p = body.payload;

      const title = asString(p?.title).trim();
      const record_type = asString(p?.record_type).trim();
      const record_date = asString(p?.record_date).trim();

      if (!title || !record_type || !record_date) {
        return json({ ok: false, error: "Missing required fields (title, record_type, record_date)" }, 400);
      }

      const insertRow = {
        patient_id: userId,
        title,
        record_type,
        record_date,
        description: trimOrNull(p?.description),
        doctor_name: trimOrNull(p?.doctor_name),
        practice_name: trimOrNull(p?.practice_name),
        status: "active",
        attachment_bucket: asString(p?.attachment_bucket || "patient-files").trim() || "patient-files",
        attachment_paths: Array.isArray(p?.attachment_paths) ? p.attachment_paths : [],
      };

      const { data, error } = await supabase
        .from("medical_records")
        .insert(insertRow as any)
        .select("*")
        .single();

      if (error) throw error;
      return json({ ok: true, record: data });
    }

    if (action === "add_test_result") {
      const p = body.payload;

      const category = asString(p?.category).trim() as "lab" | "imaging" | "other";
      const title = asString(p?.title).trim();
      const test_date = asString(p?.test_date).trim();

      if (!category || !title || !test_date) {
        return json({ ok: false, error: "Missing required fields (category, title, test_date)" }, 400);
      }

      if (category !== "lab" && category !== "imaging" && category !== "other") {
        return json({ ok: false, error: "Invalid category" }, 400);
      }

      const insertRow = {
        patient_id: userId,
        category,
        title,
        test_date,
        notes: trimOrNull(p?.notes),
        attachment_bucket: asString(p?.attachment_bucket || "patient-files").trim() || "patient-files",
        attachment_paths: Array.isArray(p?.attachment_paths) ? p.attachment_paths : [],
      };

      const { data, error } = await (supabase.from as any)("patient_test_results")
        .insert(insertRow)
        .select("*")
        .single();

      if (error) throw error;
      return json({ ok: true, test_result: data });
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("patient-self-service error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
