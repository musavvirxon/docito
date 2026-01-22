import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookAppointmentRequest {
  // ✅ allow either registered patient or doctor-added patient
  patient_id?: string;
  doctor_patient_id?: string;

  entity_id?: string;       // practice_id (optional for independent practitioners)
  provider_id: string;      // doctor_id (required)
  slot_start: string;
  duration_minutes?: number;
  appointment_type?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

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

    // provider_id and slot_start are required; entity_id is optional (for independent doctors)
    if (!provider_id || !slot_start) {
      return new Response(JSON.stringify({ error: "Missing required fields: provider_id, slot_start" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ✅ Must provide exactly one of patient_id or doctor_patient_id
    const hasPatientId = Boolean(patient_id);
    const hasDoctorPatientId = Boolean(doctor_patient_id);
    if (hasPatientId === hasDoctorPatientId) {
      return new Response(
        JSON.stringify({ error: "Provide exactly one of patient_id or doctor_patient_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ✅ Authorization rules:
    // - If booking for self (patient_id == user.id) => OK
    // - Otherwise must be staff/doctor at this entity (if entity_id provided)
    const bookingForSelf = hasPatientId && patient_id === user.id;

    if (!bookingForSelf) {
      // For independent practitioners (no entity_id), only the doctor themselves can book
      if (!entity_id) {
        const { data: doctorRole } = await supabase
          .from("doctors")
          .select("id")
          .eq("id", provider_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!doctorRole) {
          return new Response(JSON.stringify({ error: "Unauthorized: cannot book for this patient" }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
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
          return new Response(JSON.stringify({ error: "Unauthorized: cannot book for this patient" }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }
    }

    // Parse slot time with dynamic duration
    const slotDate = new Date(slot_start);
    const appointmentDate = slotDate.toISOString().split("T")[0];
    const startTime = slotDate.toTimeString().slice(0, 8);
    const endDate = new Date(slotDate.getTime() + duration_minutes * 60000);
    const endTime = endDate.toTimeString().slice(0, 8);

    // Prevent race conditions: check conflicts
    const { data: existingAppointments } = await supabase
      .from("appointments")
      .select("id")
      .eq("appointment_date", appointmentDate)
      .eq("doctor_id", provider_id)
      .neq("status", "canceled")
      .or(
        `and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime})`
      );

    if (existingAppointments && existingAppointments.length > 0) {
      return new Response(JSON.stringify({ error: "Slot is no longer available", code: "SLOT_TAKEN" }), {
        status: 409,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ✅ Insert appointment with correct patient field
    const insertPayload: any = {
      doctor_id: provider_id,
      practice_id: entity_id || null, // null for independent practitioners
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: endTime,
      notes: notes ?? null,
      status: "pending",
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
      return new Response(
        JSON.stringify({ error: "Failed to create appointment", details: insertError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    await supabase.from("entity_audit_logs").insert({
      entity_type: "appointment",
      entity_id: appointment.id,
      action: "create",
      actor_id: user.id,
      new_values: appointment,
      metadata: { appointment_type, booked_via: "edge_function" },
    });

    return new Response(
      JSON.stringify({
        appointment_id: appointment.id,
        status: appointment.status,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
      }),
      { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in book_appointment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
