import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type RequestStartAppointmentBody = {
  appointment_id?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function isBearer(authHeader: string | null) {
  return Boolean(authHeader && authHeader.toLowerCase().startsWith("bearer "));
}

function randomRoomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("authorization");
    if (!isBearer(authHeader)) {
      return json({ error: "Missing authorization header" }, 401);
    }

    const token = authHeader!.replace(/bearer\s+/i, "").trim();

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
    const user = userRes?.user;
    if (userErr || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as RequestStartAppointmentBody;
    const appointmentId = body.appointment_id;
    if (!appointmentId) {
      return json({ error: "appointment_id is required" }, 400);
    }

    const { data: appointment, error: apptErr } = await supabaseAdmin
      .from("appointments")
      .select(
        `
        id,
        doctor_id,
        practice_id,
        patient_id,
        doctor_patient_id,
        appointment_date,
        start_time,
        end_time,
        status,
        appointment_type,
        patient_confirmation_status,
        patient_confirmed_at,
        start_requested_by_doctor,
        start_requested_by_patient,
        start_requested_doctor_at,
        start_requested_patient_at,
        started_at,
        doctors:doctor_id(id, user_id)
      `
      )
      .eq("id", appointmentId)
      .single();

    if (apptErr || !appointment) {
      return json({ error: apptErr?.message || "Appointment not found" }, 404);
    }

    const doctorUserId = (appointment as any)?.doctors?.user_id as string | undefined;
    const isPatient = appointment.patient_id && appointment.patient_id === user.id;
    const isDoctor = doctorUserId && doctorUserId === user.id;

    let isStaff = false;
    if (!isDoctor && !isPatient && appointment.practice_id) {
      const { data: staff } = await supabaseAdmin
        .from("clinic_staff")
        .select("id")
        .eq("practice_id", appointment.practice_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      isStaff = Boolean(staff);
    }

    if (!isDoctor && !isPatient && !isStaff) {
      return json({ error: "Forbidden" }, 403);
    }

    const nowIso = new Date().toISOString();

    if (isPatient) {
      const patch: Record<string, unknown> = {
        start_requested_by_patient: true,
        start_requested_patient_at: nowIso,
        patient_confirmation_status: "confirmed",
      };
      if (!appointment.patient_confirmed_at) patch.patient_confirmed_at = nowIso;

      const { error: upErr } = await supabaseAdmin
        .from("appointments")
        .update(patch)
        .eq("id", appointmentId);
      if (upErr) return json({ error: upErr.message }, 500);
    } else {
      const { error: upErr } = await supabaseAdmin
        .from("appointments")
        .update({
          start_requested_by_doctor: true,
          start_requested_doctor_at: nowIso,
        })
        .eq("id", appointmentId);
      if (upErr) return json({ error: upErr.message }, 500);
    }

    const { data: appt2, error: appt2Err } = await supabaseAdmin
      .from("appointments")
      .select(
        `
        id,
        doctor_id,
        practice_id,
        patient_id,
        doctor_patient_id,
        appointment_date,
        start_time,
        end_time,
        status,
        appointment_type,
        patient_confirmation_status,
        patient_confirmed_at,
        start_requested_by_doctor,
        start_requested_by_patient,
        start_requested_doctor_at,
        start_requested_patient_at,
        started_at
      `
      )
      .eq("id", appointmentId)
      .single();

    if (appt2Err || !appt2) {
      return json({ error: appt2Err?.message || "Failed to reload appointment" }, 500);
    }

    const appointmentType = (appt2 as any).appointment_type || "in_person";
    const hasDirectPatient = Boolean(appt2.doctor_patient_id) && !appt2.patient_id;

    const patientAccepted = hasDirectPatient
      ? true
      : (appt2.patient_confirmation_status || "pending") === "confirmed";

    const bothRequested = hasDirectPatient
      ? Boolean(appt2.start_requested_by_doctor)
      : Boolean(appt2.start_requested_by_doctor) && Boolean(appt2.start_requested_by_patient);

    const canStart = patientAccepted && bothRequested;

    let session: any = null;
    let consultation: any = null;

    if (canStart) {
      const { data: sessionRow, error: sessionErr } = await supabaseAdmin
        .from("appointment_sessions")
        .upsert(
          {
            appointment_id: appt2.id,
            doctor_id: appt2.doctor_id,
            patient_id: appt2.patient_id || null,
            doctor_patient_id: appt2.doctor_patient_id || null,
            session_type: appointmentType,
            session_status: "active",
            started_at: appt2.started_at || nowIso,
          },
          { onConflict: "appointment_id" }
        )
        .select()
        .single();

      if (sessionErr) return json({ error: sessionErr.message }, 500);
      session = sessionRow;

      const apptStatus = (appt2.status as string) || "pending";
      const nextStatus = apptStatus === "pending" ? "confirmed" : apptStatus;
      const { error: apptUp2Err } = await supabaseAdmin
        .from("appointments")
        .update({ started_at: appt2.started_at || nowIso, status: nextStatus })
        .eq("id", appt2.id);
      if (apptUp2Err) return json({ error: apptUp2Err.message }, 500);

      if (appointmentType === "video" && appt2.patient_id) {
        const { data: existingCons } = await supabaseAdmin
          .from("video_consultations")
          .select("id, room_id, room_url, status")
          .eq("appointment_id", appt2.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (existingCons && existingCons.length > 0) {
          consultation = existingCons[0];
        } else {
          const roomId = `apt-${appt2.id}-${randomRoomId()}`;
          const roomUrl = roomId;

          const { data: newCons, error: consErr } = await supabaseAdmin
            .from("video_consultations")
            .insert({
              appointment_id: appt2.id,
              doctor_id: appt2.doctor_id,
              patient_id: appt2.patient_id,
              scheduled_start: `${appt2.appointment_date}T${appt2.start_time}`,
              status: "scheduled",
              room_id: roomId,
              room_url: roomUrl,
            } as any)
            .select("id, room_id, room_url, status")
            .single();

          if (consErr) return json({ error: consErr.message }, 500);
          consultation = newCons;
        }
      }
    }

    return json({
      ok: true,
      can_start: canStart,
      appointment: appt2,
      session,
      consultation,
    });
  } catch (e) {
    console.error("request-start-appointment error", e);
    return json({ error: String(e) }, 500);
  }
});
