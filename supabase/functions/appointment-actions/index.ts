// File: supabase/functions/appointment-actions/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = {
  action: "request_start";
  appointment_id: string;
};

type OkResp = { ok: true };
type ErrResp = { ok: false; error: string; code?: string };
type Resp = OkResp | ErrResp;

function json(data: Resp, status = 200) {
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

function getAuthHeader(req: Request) {
  return req.headers.get("authorization") || req.headers.get("Authorization") || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = getAuthHeader(req);
    if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

    let body: ReqBody;
    try {
      body = (await req.json()) as ReqBody;
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    if (!body?.action) return json({ ok: false, error: "Missing action" }, 400);
    if (body.action !== "request_start") return json({ ok: false, error: "Invalid action" }, 400);
    if (!body.appointment_id) return json({ ok: false, error: "Missing appointment_id" }, 400);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) return json({ ok: false, error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const userId = user.id;
    const nowIso = new Date().toISOString();

    const { data: apt, error: aptErr } = await admin
      .from("appointments")
      .select(
        `
        id,
        doctor_id,
        patient_id,
        appointment_date,
        start_time,
        appointment_type,
        status,
        start_requested_by_patient,
        start_requested_patient_at,
        patient_confirmation_status,
        patient_confirmed_at,
        doctors:doctor_id(id, user_id)
      `,
      )
      .eq("id", body.appointment_id)
      .maybeSingle();

    if (aptErr) {
      console.error("appointments select error:", aptErr);
      return json({ ok: false, error: "Failed to load appointment" }, 500);
    }
    if (!apt) return json({ ok: false, error: "Appointment not found", code: "NOT_FOUND" }, 404);

    if (!apt.patient_id || apt.patient_id !== userId) return json({ ok: false, error: "Forbidden" }, 403);

    // Idempotent patch: only set timestamps if not already requested.
    if (!apt.start_requested_by_patient) {
      const patch: Record<string, unknown> = {
        start_requested_by_patient: true,
        patient_confirmation_status: "confirmed",
      };

      if (!apt.start_requested_patient_at) patch.start_requested_patient_at = nowIso;
      if (!apt.patient_confirmed_at) patch.patient_confirmed_at = nowIso;

      const { error: upErr } = await admin.from("appointments").update(patch).eq("id", apt.id);
      if (upErr) {
        console.error("appointments update error:", upErr);
        return json({ ok: false, error: "Failed to update appointment" }, 500);
      }
    }

    // Notify doctor (deduped by unread notification of same type)
    const doctorUserId = (apt as any)?.doctors?.user_id as string | undefined;
    if (doctorUserId) {
      const { data: existing, error: existingErr } = await admin
        .from("notifications")
        .select("id")
        .eq("user_id", doctorUserId)
        .eq("entity_type", "appointment")
        .eq("entity_id", apt.id)
        .eq("metadata->>type", "appointment_start_request")
        .is("read_at", null)
        .limit(1);

      if (existingErr) console.error("notifications dedupe error:", existingErr);

      if (!existing || existing.length === 0) {
        const { error: insErr } = await admin.from("notifications").insert({
          user_id: doctorUserId,
          entity_type: "appointment",
          entity_id: apt.id,
          role_scope: "doctor",
          level: "info",
          title: "Patient is ready to start",
          body: `Appointment start requested for ${apt.appointment_date} ${apt.start_time}`,
          action_url: `/appointment-session/${apt.id}`,
          metadata: {
            type: "appointment_start_request",
            appointment_type: apt.appointment_type,
          },
        });

        if (insErr) console.error("notifications insert error:", insErr);
      }
    }

    return json({ ok: true }, 200);
  } catch (e: any) {
    console.error("appointment-actions error:", e);
    return json({ ok: false, error: e?.message ?? String(e) }, 500);
  }
});
