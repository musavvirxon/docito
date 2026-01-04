import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookAppointmentRequest {
  patient_id: string;
  entity_id: string;
  provider_id?: string;
  slot_start: string;
  appointment_type?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { patient_id, entity_id, provider_id, slot_start, appointment_type, notes } =
      (await req.json()) as BookAppointmentRequest;

    // Validate input
    if (!patient_id || !entity_id || !slot_start) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: patient_id, entity_id, slot_start" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify patient_id matches current user or user has staff role
    if (patient_id !== user.id) {
      // Check if user is staff/doctor at this entity
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
        return new Response(
          JSON.stringify({ error: "Unauthorized: cannot book for other users" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Parse slot time
    const slotDate = new Date(slot_start);
    const appointmentDate = slotDate.toISOString().split("T")[0];
    const startTime = slotDate.toTimeString().slice(0, 8);
    const endDate = new Date(slotDate.getTime() + 30 * 60000); // 30 min duration
    const endTime = endDate.toTimeString().slice(0, 8);

    // Check if slot is still available (prevent race conditions)
    const { data: existingAppointments } = await supabase
      .from("appointments")
      .select("id")
      .eq("appointment_date", appointmentDate)
      .eq("doctor_id", provider_id)
      .neq("status", "canceled")
      .or(`and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime})`);

    if (existingAppointments && existingAppointments.length > 0) {
      return new Response(
        JSON.stringify({ error: "Slot is no longer available", code: "SLOT_TAKEN" }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create the appointment
    const { data: appointment, error: insertError } = await supabase
      .from("appointments")
      .insert({
        doctor_id: provider_id,
        patient_id: patient_id,
        practice_id: entity_id,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        notes: notes,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating appointment:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create appointment", details: insertError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Write audit log
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
        end_time: appointment.end_time
      }),
      { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in book_appointment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
