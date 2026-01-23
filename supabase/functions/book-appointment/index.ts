import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookAppointmentRequest {
  patient_id?: string;
  doctor_patient_id?: string;

  entity_id?: string; // practice_id (optional for independent practitioners)
  provider_id: string; // doctor_id (required)
  slot_start: string;
  duration_minutes?: number;
  appointment_type?: string;
  notes?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function normalizeAppointmentType(input?: string): "in_person" | "video" | "home_visit" | "messaging" | "follow_up" {
  const t = (input || "").trim().toLowerCase();
  if (!t) return "in_person";
  if (t === "in-person" || t === "in_person" || t === "inperson") return "in_person";
  if (t === "video" || t === "telemed" || t === "telemedicine") return "video";
  if (t === "home" || t === "home_visit" || t === "home-visit") return "home_visit";
  if (t === "chat" || t === "message" || t === "messaging") return "messaging";
  if (t === "follow_up" || t === "follow-up" || t === "followup") return "follow_up";
  return "in_person";
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
        // Independent practitioner: only the doctor can book for someone else
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

        if (!staffRole && !doctorRole) return json({ error: "Unauthorized: cannot book for this patient" }, 403);
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

    const { data: existingAppointments, error: conflictErr } = await supabase
      .from("appointments")
      .select("id")
      .eq("appointment_date", appointmentDate)
      .eq("doctor_id", provider_id)
      .neq("status", "canceled")
      .or(`and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime})`);

    if (conflictErr) {
      console.error("Conflict check error:", conflictErr);
      return json({ error: "Failed to validate slot availability" }, 500);
    }

    if (existingAppointments && existingAppointments.length > 0) {
      return json({ error: "Slot is no longer available", code: "SLOT_TAKEN" }, 409);
    }

    const normalizedType = normalizeAppointmentType(appointment_type);

    const insertPayload: any = {
      doctor_id: provider_id,
      practice_id: entity_id || null,
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: endTime,
      notes: notes ?? null,
      status: "pending",
      appointment_type: normalizedType,
      patient_confirmation_status: hasPatientId ? "pending" : null,
    };

    if (hasPatientId) {
      insertPayload.patient_id = patient_id;
      insertPayload.doctor_patient_id = null;
    } else {
      insertPayload.patient_id = null;
      insertPayload.doctor_patient_id = doctor_patient_id;
    }

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
        status: appointment.status,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        appointment_type: appointment.appointment_type,
      },
      201,
    );
  } catch (error: any) {
    console.error("Error in book-appointment:", error);
    return json({ error: error?.message ?? String(error) }, 500);
  }
};

serve(handler);
