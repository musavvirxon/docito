import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function toTimestamptz(date: string, time: string) {
  // Keep it parseable; DB will coerce to timestamptz.
  // Use "Z" to avoid ambiguous parsing in edge runtime.
  const t = time.length === 5 ? `${time}:00` : time;
  return `${date}T${t}Z`;
}

function minutesBetween(startTime: string, endTime: string) {
  const s = startTime.length === 5 ? `${startTime}:00` : startTime;
  const e = endTime.length === 5 ? `${endTime}:00` : endTime;
  const [sh, sm, ss] = s.split(":").map((x) => Number(x));
  const [eh, em, es] = e.split(":").map((x) => Number(x));
  const start = sh * 3600 + sm * 60 + (ss || 0);
  const end = eh * 3600 + em * 60 + (es || 0);
  const diff = Math.max(0, end - start);
  return Math.round(diff / 60);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // IMPORTANT: functions.invoke treats non-2xx as "error"
  // so we return 200 for all expected failures with ok:false.
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({
      ok: false,
      error: "Missing required environment variables (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY)",
    });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!isBearer(authHeader)) return json({ ok: false, error: "Missing authorization header" });

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
    if (userErr || !user) return json({ ok: false, error: "Unauthorized" });

    const body = (await req.json().catch(() => ({}))) as RequestStartAppointmentBody;
    const appointmentId = body.appointment_id;
    if (!appointmentId) return json({ ok: false, error: "appointment_id is required" });

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
      `,
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (apptErr) return json({ ok: false, error: apptErr.message });
    if (!appointment) return json({ ok: false, error: "Appointment not found" });

    const doctorUserId = (appointment as any)?.doctors?.user_id as string | undefined;
    const isPatient = Boolean(appointment.patient_id && appointment.patient_id === user.id);
    const isDoctor = Boolean(doctorUserId && doctorUserId === user.id);

    let isStaff = false;
    if (!isDoctor && !isPatient && appointment.practice_id) {
      const { data: staff, error: staffErr } = await supabaseAdmin
        .from("clinic_staff")
        .select("id")
        .eq("practice_id", appointment.practice_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (staffErr) return json({ ok: false, error: staffErr.message });
      isStaff = Boolean(staff);
    }

    if (!isDoctor && !isPatient && !isStaff) {
      return json({ ok: false, error: "Forbidden" });
    }

    const nowIso = new Date().toISOString();

    // Mark the "start requested" flag for the actor
    if (isPatient) {
      const patch: Record<string, unknown> = {
        start_requested_by_patient: true,
        start_requested_patient_at: nowIso,
        patient_confirmation_status: "confirmed",
      };
      if (!(appointment as any).patient_confirmed_at) patch.patient_confirmed_at = nowIso;

      const { error: upErr } = await supabaseAdmin.from("appointments").update(patch).eq("id", appointmentId);
      if (upErr) return json({ ok: false, error: upErr.message });
    } else {
      const { error: upErr } = await supabaseAdmin
        .from("appointments")
        .update({
          start_requested_by_doctor: true,
          start_requested_doctor_at: nowIso,
        })
        .eq("id", appointmentId);
      if (upErr) return json({ ok: false, error: upErr.message });
    }

    // Reload appointment
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
      `,
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (appt2Err) return json({ ok: false, error: appt2Err.message });
    if (!appt2) return json({ ok: false, error: "Failed to reload appointment" });

    const appointmentType = ((appt2 as any).appointment_type || "in_person") as string;
    const hasDirectPatient = Boolean(appt2.doctor_patient_id) && !appt2.patient_id;

    const patientAccepted = hasDirectPatient
      ? true
      : ((appt2.patient_confirmation_status || "pending") as string) === "confirmed";

    const bothRequested = hasDirectPatient
      ? Boolean(appt2.start_requested_by_doctor)
      : Boolean(appt2.start_requested_by_doctor) && Boolean(appt2.start_requested_by_patient);

    const canStart = patientAccepted && bothRequested;

    // For VIDEO appointments: create (or fetch) the room as soon as either side requests start,
    // so the doctor can open the room and wait (no more 500 due to missing scheduled_end).
    let consultation: any = null;

    if (appointmentType === "video" && appt2.patient_id) {
      const { data: existingCons, error: consFetchErr } = await supabaseAdmin
        .from("video_consultations")
        .select("id, room_id, room_url, status, scheduled_start, scheduled_end, actual_start, doctor_joined_at, patient_joined_at")
        .eq("appointment_id", appt2.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (consFetchErr) return json({ ok: false, error: consFetchErr.message });

      if (existingCons && existingCons.length > 0) {
        consultation = existingCons[0];
      } else {
        const roomId = `apt-${appt2.id}-${randomRoomId()}`;
        const roomUrl = roomId;

        const scheduledStart = toTimestamptz(appt2.appointment_date, appt2.start_time);
        const scheduledEnd = toTimestamptz(appt2.appointment_date, appt2.end_time);
        const duration = minutesBetween(appt2.start_time, appt2.end_time);

        const { data: newCons, error: consErr } = await supabaseAdmin
          .from("video_consultations")
          .insert({
            appointment_id: appt2.id,
            doctor_id: appt2.doctor_id,
            patient_id: appt2.patient_id,
            scheduled_start: scheduledStart,
            scheduled_end: scheduledEnd,
            duration_minutes: duration || null,
            status: canStart ? "in_progress" : "waiting",
            room_id: roomId,
            room_url: roomUrl,
          } as any)
          .select("id, room_id, room_url, status, scheduled_start, scheduled_end, actual_start, doctor_joined_at, patient_joined_at")
          .single();

        if (consErr) return json({ ok: false, error: consErr.message });
        consultation = newCons;
      }

      // If starting is allowed, mark consultation as in_progress and set join timestamps
      if (consultation) {
        const needsInProgress = canStart && consultation.status !== "in_progress";
        const joinPatch: Record<string, unknown> = {};

        if (canStart && !consultation.actual_start) joinPatch.actual_start = nowIso;

        if ((isDoctor || isStaff) && !consultation.doctor_joined_at) joinPatch.doctor_joined_at = nowIso;
        if (isPatient && !consultation.patient_joined_at) joinPatch.patient_joined_at = nowIso;

        if (needsInProgress) joinPatch.status = "in_progress";

        if (Object.keys(joinPatch).length > 0) {
          const { data: updated, error: updErr } = await supabaseAdmin
            .from("video_consultations")
            .update(joinPatch)
            .eq("id", consultation.id)
            .select("id, room_id, room_url, status, scheduled_start, scheduled_end, actual_start, doctor_joined_at, patient_joined_at")
            .single();

          if (updErr) return json({ ok: false, error: updErr.message });
          consultation = updated;
        }
      }
    }

    // Create an appointment session when fully allowed to start
    let session: any = null;

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
          { onConflict: "appointment_id" },
        )
        .select()
        .single();

      if (sessionErr) return json({ ok: false, error: sessionErr.message });
      session = sessionRow;

      const apptStatus = ((appt2.status as string) || "pending") as string;
      const nextStatus = apptStatus === "pending" ? "confirmed" : apptStatus;

      const { error: apptUp2Err } = await supabaseAdmin
        .from("appointments")
        .update({ started_at: appt2.started_at || nowIso, status: nextStatus })
        .eq("id", appt2.id);

      if (apptUp2Err) return json({ ok: false, error: apptUp2Err.message });
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
    return json({ ok: false, error: String(e) });
  }
});
