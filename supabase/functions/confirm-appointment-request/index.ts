// File: supabase/functions/confirm-appointment-request/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmRequestBody {
  request_id: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
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

    const { data: userRes, error: authError } = await supabase.auth.getUser(token);
    const user = userRes?.user;
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as ConfirmRequestBody;
    const requestId = String(body?.request_id || "").trim();
    if (!requestId) return json({ error: "Missing request_id" }, 400);

    const { data: reqRow, error: reqFetchErr } = await supabase
      .from("appointment_requests")
      .select(
        "id, patient_id, doctor_id, practice_id, procedure_id, appointment_date, start_time, end_time, appointment_type, notes, status, expires_at, appointment_id",
      )
      .eq("id", requestId)
      .single();

    if (reqFetchErr || !reqRow) {
      return json({ error: "Appointment request not found", code: "NOT_FOUND" }, 404);
    }

    if (reqRow.patient_id !== user.id) {
      return json({ error: "Forbidden", code: "FORBIDDEN" }, 403);
    }

    if (reqRow.status !== "pending") {
      if (reqRow.status === "confirmed" && reqRow.appointment_id) {
        return json({ appointment_id: reqRow.appointment_id, already_confirmed: true }, 200);
      }
      return json({ error: "Request is not pending", code: "NOT_PENDING" }, 409);
    }

    const now = new Date();
    const expiresAt = new Date(reqRow.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
      await supabase.from("appointment_requests").delete().eq("id", requestId);
      return json({ error: "Request expired", code: "EXPIRED" }, 409);
    }

    const appointmentDate = reqRow.appointment_date;
    const startTime = String(reqRow.start_time).slice(0, 8);
    const endTime = String(reqRow.end_time).slice(0, 8);

    // Validate against blocked times
    const { data: blocked, error: blockedErr } = await supabase
      .from("blocked_times")
      .select("id, start_time, end_time")
      .eq("doctor_id", reqRow.doctor_id)
      .eq("blocked_date", appointmentDate);
    if (blockedErr) {
      console.error("Blocked times check error:", blockedErr);
      return json({ error: "Failed to validate slot" }, 500);
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
        await supabase.from("appointment_requests").delete().eq("id", requestId);
        return json({ error: "Slot is blocked", code: "SLOT_BLOCKED" }, 409);
      }
    }

    // Conflict check: existing appointments
    const { data: existingAppointments, error: conflictErr } = await supabase
      .from("appointments")
      .select("id,start_time,end_time,status")
      .eq("appointment_date", appointmentDate)
      .eq("doctor_id", reqRow.doctor_id)
      .neq("status", "canceled");
    if (conflictErr) {
      console.error("Appointment conflict check error:", conflictErr);
      return json({ error: "Failed to validate slot" }, 500);
    }

    const hasAppointmentConflict = (existingAppointments || []).some((a: any) =>
      overlaps(
        timeToMinutes(startTime),
        timeToMinutes(endTime),
        timeToMinutes(a.start_time),
        timeToMinutes(a.end_time),
      ),
    );
    if (hasAppointmentConflict) {
      await supabase.from("appointment_requests").delete().eq("id", requestId);
      return json({ error: "Slot is no longer available", code: "SLOT_TAKEN" }, 409);
    }

    // Conflict check: other pending requests
    const { data: pendingRequests, error: reqErr } = await supabase
      .from("appointment_requests")
      .select("id,start_time,end_time,expires_at,status")
      .eq("doctor_id", reqRow.doctor_id)
      .eq("appointment_date", appointmentDate)
      .eq("status", "pending")
      .neq("id", requestId);
    if (reqErr) {
      console.error("Request conflict check error:", reqErr);
      return json({ error: "Failed to validate slot" }, 500);
    }

    const nowIso = now.toISOString();
    const hasRequestConflict = (pendingRequests || []).some((r: any) => {
      if (r.expires_at && r.expires_at <= nowIso) return false;
      return overlaps(
        timeToMinutes(startTime),
        timeToMinutes(endTime),
        timeToMinutes(r.start_time),
        timeToMinutes(r.end_time),
      );
    });
    if (hasRequestConflict) {
      await supabase.from("appointment_requests").delete().eq("id", requestId);
      return json({ error: "Slot is temporarily held", code: "SLOT_HELD" }, 409);
    }

    // Create appointment
    const { data: appointment, error: insertError } = await supabase
      .from("appointments")
      .insert({
        doctor_id: reqRow.doctor_id,
        practice_id: reqRow.practice_id ?? null,
        patient_id: reqRow.patient_id,
        doctor_patient_id: null,
        procedure_id: reqRow.procedure_id ?? null,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        appointment_type: reqRow.appointment_type,
        notes: reqRow.notes ?? null,
        status: "pending",
        patient_confirmation_status: "confirmed",
      })
      .select("id")
      .single();

    if (insertError || !appointment) {
      console.error("Error creating appointment:", insertError);
      return json({ error: "Failed to create appointment" }, 500);
    }

    // Update request to confirmed + link appointment
    const { error: updateErr } = await supabase
      .from("appointment_requests")
      .update({ status: "confirmed", appointment_id: appointment.id })
      .eq("id", requestId);
    if (updateErr) {
      console.error("Error updating request:", updateErr);
    }

    await supabase.from("entity_audit_logs").insert({
      entity_type: "appointment",
      entity_id: appointment.id,
      action: "create",
      actor_id: user.id,
      new_values: appointment,
      metadata: { booked_via: "appointment_request_confirmation" },
    });

    return json({ appointment_id: appointment.id }, 201);
  } catch (error: any) {
    console.error("Error in confirm-appointment-request:", error);
    return json({ error: error?.message ?? String(error) }, 500);
  }
};

serve(handler);
