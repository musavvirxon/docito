// File: supabase/functions/book-appointment/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookAppointmentRequest {
  patient_id?: string;
  doctor_patient_id?: string;

  entity_id?: string; // practice_id (optional)
  provider_id: string; // doctor_id
  slot_start: string; // ISO string
  duration_minutes?: number;
  appointment_type?: string;
  procedure_id?: string;
  notes?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function normalizeAppointmentType(
  input?: string,
): "in_person" | "video" | "home_visit" | "messaging" | "follow_up" {
  const t = (input || "").trim().toLowerCase();
  if (!t) return "in_person";
  if (t === "in-person" || t === "in_person" || t === "inperson") return "in_person";
  if (t === "video" || t === "telemed" || t === "telemedicine") return "video";
  if (t === "home" || t === "home_visit" || t === "home-visit") return "home_visit";
  if (t === "chat" || t === "message" || t === "messaging") return "messaging";
  if (t === "follow_up" || t === "follow-up" || t === "followup") return "follow_up";
  return "in_person";
}

function timeToMinutes(t: string) {
  const [h, m, s] = t.split(":").map((x) => Number(x));
  return (h || 0) * 60 + (m || 0) + (s ? s / 60 : 0);
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Missing authorization header" }, 401);
    }
    const token = authHeader.replace(/bearer\s+/i, "").trim();

    const {
      patient_id,
      doctor_patient_id,
      entity_id,
      provider_id,
      slot_start,
      duration_minutes = 30,
      appointment_type,
      procedure_id,
      notes,
    } = (await req.json()) as BookAppointmentRequest;

    if (!provider_id || !slot_start) {
      return json({ error: "Missing required fields: provider_id, slot_start" }, 400);
    }

    const hasPatientId = Boolean(patient_id);
    const hasDoctorPatientId = Boolean(doctor_patient_id);
    if (hasPatientId === hasDoctorPatientId) {
      return json({ error: "Provide exactly one of patient_id or doctor_patient_id" }, 400);
    }

    const { data: userRes, error: authError } = await supabase.auth.getUser(token);
    const user = userRes?.user;
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const bookingForSelf = hasPatientId && patient_id === user.id;

    // Authorization: if booking for someone else, must be doctor/staff (depending on entity_id)
    if (!bookingForSelf) {
      if (!entity_id) {
        const { data: doctorRole } = await supabase
          .from("doctors")
          .select("id")
          .eq("id", provider_id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!doctorRole) return json({ error: "Unauthorized: cannot book for this patient" }, 403);
      } else {
        const { data: staffRole } = await supabase
          .from("clinic_staff")
          .select("id")
          .eq("practice_id", entity_id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        const { data: doctorRole } = await supabase
          .from("doctors")
          .select("id")
          .eq("practice_id", entity_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!staffRole && !doctorRole) {
          return json({ error: "Unauthorized: cannot book for this patient" }, 403);
        }
      }
    }

    const slotDate = new Date(slot_start);
    if (Number.isNaN(slotDate.getTime())) {
      return json({ error: "Invalid slot_start", code: "INVALID_SLOT_START" }, 400);
    }

    // Server-enforced: no booking in the past (with 60s skew)
    const now = new Date();
    if (slotDate.getTime() <= now.getTime() + 60_000) {
      return json({ error: "Cannot book an appointment in the past", code: "PAST_TIME" }, 400);
    }

    const appointmentDate = slotDate.toISOString().split("T")[0];
    const startTime = slotDate.toTimeString().slice(0, 8);
    const endDate = new Date(slotDate.getTime() + duration_minutes * 60000);
    const endTime = endDate.toTimeString().slice(0, 8);

    // Validate against blocked times
    const { data: blocked, error: blockedErr } = await supabase
      .from("blocked_times")
      .select("id, blocked_date, start_time, end_time")
      .eq("doctor_id", provider_id)
      .eq("blocked_date", appointmentDate);
    if (blockedErr) {
      console.error("Blocked times check error:", blockedErr);
      return json({ error: "Failed to validate slot availability" }, 500);
    }
    for (const b of blocked || []) {
      if (
        overlaps(
          timeToMinutes(startTime),
          timeToMinutes(endTime),
          timeToMinutes((b as any).start_time),
          timeToMinutes((b as any).end_time),
        )
      ) {
        return json({ error: "Slot is blocked", code: "SLOT_BLOCKED" }, 409);
      }
    }

    // Conflict check: existing appointments
    const { data: existingAppointments, error: conflictErr } = await supabase
      .from("appointments")
      .select("id,start_time,end_time,status")
      .eq("appointment_date", appointmentDate)
      .eq("doctor_id", provider_id)
      .neq("status", "canceled");

    if (conflictErr) {
      console.error("Conflict check error:", conflictErr);
      return json({ error: "Failed to validate slot availability" }, 500);
    }

    const hasConflictWithAppointments = (existingAppointments || []).some((a: any) =>
      overlaps(
        timeToMinutes(startTime),
        timeToMinutes(endTime),
        timeToMinutes(a.start_time),
        timeToMinutes(a.end_time),
      ),
    );
    if (hasConflictWithAppointments) {
      return json({ error: "Slot is no longer available", code: "SLOT_TAKEN" }, 409);
    }

    // Conflict check: pending appointment requests (unconfirmed holds)
    const { data: pendingRequests, error: reqErr } = await supabase
      .from("appointment_requests")
      .select("id,start_time,end_time,expires_at,status")
      .eq("doctor_id", provider_id)
      .eq("appointment_date", appointmentDate)
      .eq("status", "pending");
    if (reqErr) {
      console.error("Request conflict check error:", reqErr);
      return json({ error: "Failed to validate slot availability" }, 500);
    }

    const nowIso = new Date().toISOString();
    const hasConflictWithRequests = (pendingRequests || []).some((r: any) => {
      if (r.expires_at && r.expires_at <= nowIso) return false;
      return overlaps(
        timeToMinutes(startTime),
        timeToMinutes(endTime),
        timeToMinutes(r.start_time),
        timeToMinutes(r.end_time),
      );
    });
    if (hasConflictWithRequests) {
      return json({ error: "Slot is temporarily held", code: "SLOT_HELD" }, 409);
    }

    const normalizedType = normalizeAppointmentType(appointment_type);

    // If a doctor_patient_id is used (no auth-user patient), create appointment immediately (no confirmation step possible).
    if (hasDoctorPatientId) {
      const insertPayload: any = {
        doctor_id: provider_id,
        practice_id: entity_id || null,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        notes: notes ?? null,
        status: "pending",
        appointment_type: normalizedType,
        patient_id: null,
        doctor_patient_id,
        procedure_id: procedure_id ?? null,
        patient_confirmation_status: null,
      };

      const { data: appointment, error: insertError } = await supabase
        .from("appointments")
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) {
        console.error("Error creating appointment:", insertError);
        return json({ error: "Failed to create appointment", details: insertError.message }, 500);
      }

      await supabase.from("entity_audit_logs").insert({
        entity_type: "appointment",
        entity_id: appointment.id,
        action: "create",
        actor_id: user.id,
        new_values: appointment,
        metadata: { appointment_type: normalizedType, booked_via: "edge_function" },
      });

      return json(
        {
          appointment_id: appointment.id,
          pending_confirmation: false,
          status: appointment.status,
          appointment_date: appointment.appointment_date,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          appointment_type: appointment.appointment_type,
        },
        201,
      );
    }

    // Patient flow: create a request (hold) and require explicit patient confirmation.
    if (!hasPatientId) {
      return json({ error: "Missing patient_id" }, 400);
    }

    const { data: requestRow, error: reqInsertErr } = await supabase
      .from("appointment_requests")
      .insert({
        patient_id,
        doctor_id: provider_id,
        practice_id: entity_id || null,
        procedure_id: procedure_id ?? null,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        appointment_type: normalizedType,
        notes: notes ?? null,
        status: "pending",
      })
      .select("id, expires_at")
      .single();

    if (reqInsertErr) {
      console.error("Error creating appointment request:", reqInsertErr);
      const isUnique = String(reqInsertErr.message || "").toLowerCase().includes("uniq_appointment_requests_pending_slot");
      if (isUnique) return json({ error: "Slot is temporarily held", code: "SLOT_HELD" }, 409);
      return json({ error: "Failed to create appointment request", details: reqInsertErr.message }, 500);
    }

    await supabase.from("entity_audit_logs").insert({
      entity_type: "appointment_request",
      entity_id: requestRow.id,
      action: "create",
      actor_id: user.id,
      new_values: requestRow,
      metadata: { appointment_type: normalizedType, booked_via: "edge_function" },
    });

    return json(
      {
        request_id: requestRow.id,
        expires_at: requestRow.expires_at,
        pending_confirmation: true,
      },
      201,
    );
  } catch (error: any) {
    console.error("Error in book-appointment:", error);
    return json({ error: error?.message ?? String(error) }, 500);
  }
};

serve(handler);
