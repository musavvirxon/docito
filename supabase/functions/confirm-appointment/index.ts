// File: supabase/functions/confirm-appointment/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AppointmentType = "in_person" | "video" | "home_visit" | "messaging" | "follow_up";

type ReqBody = {
  hold_id: string;
};

type Resp =
  | {
      ok: true;
      appointment_id: string;
      appointment_date: string;
      start_time: string;
      end_time: string;
      appointment_type: AppointmentType;

      // NEW: echoed back if we found one
      procedure_id: string | null;
      procedure_name: string | null;
    }
  | { ok: false; error: string; code?: string };

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

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}
function hhmmss(d: Date) {
  return d.toISOString().split("T")[1].slice(0, 8);
}

function extractRequestedProcedureId(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(/requested\s+procedure\s+id\s*:\s*([0-9a-fA-F-]{36})/i);
  return m?.[1] ? String(m[1]) : null;
}

interface HoldData {
  id: string;
  patient_id: string | null;
  doctor_patient_id: string | null;
  doctor_id: string;
  practice_id: string | null;
  start_at: string;
  end_at: string;
  appointment_type: string | null;
  notes: string | null;
  status: string;
  expires_at: string;
  procedure_id?: string | null;
}

async function fetchHold(service: any, holdId: string): Promise<{ data: HoldData | null; error: any }> {
  const baseFields =
    "id, patient_id, doctor_patient_id, doctor_id, practice_id, start_at, end_at, appointment_type, notes, status, expires_at";
  const withProc = `${baseFields}, procedure_id`;

  // Try selecting with procedure_id first; fallback if column doesn't exist.
  let res = await (service as any).from("appointment_holds").select(withProc).eq("id", holdId).maybeSingle();
  if (res.error && String(res.error.message || "").toLowerCase().includes("procedure_id")) {
    res = await (service as any).from("appointment_holds").select(baseFields).eq("id", holdId).maybeSingle();
  }
  return res as { data: HoldData | null; error: any };
}

async function insertAppointmentWithFallback(
  service: any,
  payload: Record<string, unknown>,
): Promise<{ data: any; error: any }> {
  // Try with payload as-is (may include procedure_id)
  let res = await service
    .from("appointments")
    .insert(payload as any)
    .select("id, appointment_date, start_time, end_time, appointment_type")
    .single();

  // If procedure_id column doesn't exist, retry without it
  if (res.error && String(res.error.message || "").toLowerCase().includes("procedure_id")) {
    const p2 = { ...payload };
    delete (p2 as any).procedure_id;

    res = await service
      .from("appointments")
      .insert(p2 as any)
      .select("id, appointment_date, start_time, end_time, appointment_type")
      .single();
  }

  return res;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, error: "Missing Authorization header" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) return json({ ok: false, error: "Unauthorized" }, 401);

    let body: ReqBody;
    try {
      body = (await req.json()) as ReqBody;
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    if (!body.hold_id) return json({ ok: false, error: "Missing hold_id" }, 400);

    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;

    // Cleanup expired holds (fire-and-forget, ignore errors)
    try {
      await service.rpc("cleanup_expired_appointment_holds");
    } catch {
      // Ignore cleanup errors
    }

    const { data: hold, error: holdErr } = await fetchHold(service, body.hold_id);

    if (holdErr) {
      console.error("Hold read error:", holdErr);
      return json({ ok: false, error: "Failed to load booking hold" }, 500);
    }
    if (!hold) return json({ ok: false, error: "Booking hold not found", code: "HOLD_NOT_FOUND" }, 404);

    if (hold.status !== "pending") {
      await service.from("appointment_holds").delete().eq("id", hold.id);
      return json({ ok: false, error: "Booking hold is no longer valid", code: "HOLD_INVALID" }, 409);
    }

    if (!hold.patient_id || hold.patient_id !== user.id) {
      return json({ ok: false, error: "Forbidden" }, 403);
    }

    const expiresAt = new Date(hold.expires_at);
    if (expiresAt.getTime() < Date.now()) {
      await service.from("appointment_holds").delete().eq("id", hold.id);
      return json({ ok: false, error: "Booking hold has expired", code: "HOLD_EXPIRED" }, 409);
    }

    const startAt = new Date(hold.start_at);
    const endAt = new Date(hold.end_at);

    const appointmentDate = isoDate(startAt);
    const startTime = hhmmss(startAt);
    const endTime = hhmmss(endAt);

    // Conflict check: existing appointments
    const { data: existingAppointments, error: conflictErr } = await service
      .from("appointments")
      .select("id")
      .eq("appointment_date", appointmentDate)
      .eq("doctor_id", hold.doctor_id)
      .neq("status", "canceled")
      .or(
        `and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime})`,
      );

    if (conflictErr) {
      console.error("Conflict check error:", conflictErr);
      return json({ ok: false, error: "Failed to validate slot availability" }, 500);
    }

    if (existingAppointments && existingAppointments.length > 0) {
      await service.from("appointment_holds").delete().eq("id", hold.id);
      return json({ ok: false, error: "Slot is no longer available", code: "SLOT_TAKEN" }, 409);
    }

    // Conflict check: other holds
    const { data: otherHolds, error: otherHoldErr } = await service
      .from("appointment_holds")
      .select("id")
      .eq("doctor_id", hold.doctor_id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .neq("id", hold.id)
      .or(
        `and(start_at.lte.${hold.start_at},end_at.gt.${hold.start_at}),and(start_at.lt.${hold.end_at},end_at.gte.${hold.end_at})`,
      );

    if (otherHoldErr) {
      console.error("Other hold check error:", otherHoldErr);
      return json({ ok: false, error: "Failed to validate slot availability" }, 500);
    }

    if (otherHolds && otherHolds.length > 0) {
      await service.from("appointment_holds").delete().eq("id", hold.id);
      return json({ ok: false, error: "Slot is temporarily held by another patient", code: "SLOT_TAKEN" }, 409);
    }

    // NEW: get procedure_id from hold (if column exists) OR from notes line
    const holdProcedureId =
      (hold as any).procedure_id ? String((hold as any).procedure_id) : extractRequestedProcedureId(hold.notes ?? null);

    let procedureName: string | null = null;

    // Validate procedure belongs to this doctor (if present) and fetch name/cost for appointment_procedures
    let validatedProcedureId: string | null = null;
    let estimatedCost: number | null = null;

    if (holdProcedureId) {
      const { data: proc, error: procErr } = await service
        .from("procedures")
        .select("id, name, dentist_id, default_cost, price, is_active, is_bookable")
        .eq("id", holdProcedureId)
        .maybeSingle();

      if (procErr) {
        console.error("Procedure lookup error:", procErr);
        // do not hard-fail appointment confirm; just don't attach procedure
      } else if (proc?.id && String((proc as any).dentist_id) === String(hold.doctor_id)) {
        if ((proc as any).is_active === false || (proc as any).is_bookable === false) {
          // still allow appointment confirm, but do not attach procedure
          validatedProcedureId = null;
        } else {
          validatedProcedureId = String(proc.id);
          procedureName = proc.name ? String(proc.name) : null;

          const p = (proc as any).price ?? (proc as any).default_cost;
          estimatedCost = p == null ? null : Number(p);
          if (Number.isNaN(estimatedCost as any)) estimatedCost = null;
        }
      }
    }

    const appointmentPayload: Record<string, unknown> = {
      doctor_id: hold.doctor_id,
      practice_id: hold.practice_id,
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: endTime,
      notes: hold.notes ?? null,
      status: "confirmed",
      appointment_type: (hold.appointment_type as AppointmentType) ?? "in_person",
      patient_id: hold.patient_id,
      doctor_patient_id: hold.doctor_patient_id,
      patient_confirmation_status: "confirmed",
    };

    // If appointments has procedure_id column, store it too.
    if (validatedProcedureId) appointmentPayload.procedure_id = validatedProcedureId;

    const { data: appointment, error: insertErr } = await insertAppointmentWithFallback(service, appointmentPayload);

    if (insertErr || !appointment) {
      console.error("Appointment insert error:", insertErr);
      return json({ ok: false, error: "Failed to confirm appointment" }, 500);
    }

    // NEW: Create appointment_procedures row so doctor calendar/details can show requested procedure
    if (validatedProcedureId) {
      await service
        .from("appointment_procedures")
        .insert({
          appointment_id: appointment.id,
          procedure_id: validatedProcedureId,
          prescribed_by: user.id, // patient requested; still record requester
          patient_consent_status: "pending",
          procedure_notes: "Requested during booking",
          estimated_cost: estimatedCost,
          status: "scheduled",
        } as any)
        .catch((e: any) => {
          console.error("Failed to create appointment_procedures:", e);
        });
    }

    await service.from("appointment_holds").delete().eq("id", hold.id);

    await service
      .from("entity_audit_logs")
      .insert({
        entity_type: "appointment",
        entity_id: appointment.id,
        action: "create",
        actor_id: user.id,
        new_values: appointment,
        metadata: { confirmed_from_hold: hold.id, requested_procedure_id: validatedProcedureId ?? null },
      })
      .catch(() => {});

    return json(
      {
        ok: true,
        appointment_id: appointment.id,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        appointment_type: appointment.appointment_type as AppointmentType,
        procedure_id: validatedProcedureId,
        procedure_name: procedureName,
      },
      201,
    );
  } catch (e: any) {
    console.error("Error in confirm-appointment:", e);
    return json({ ok: false, error: e?.message ?? String(e) }, 500);
  }
});
