 /**
  * Book Appointment Edge Function
  * 
  * Security features:
  * - Rate limiting: 30 bookings per 5 minutes per user
  * - Strict input validation with UUID checks
  * - Authentication required
  * - Patient can only book for themselves
  * - Slot conflict validation
  */
 
 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import {
   secureHandler,
   jsonResponse,
   errorResponse,
   corsHeaders,
 } from "../_shared/security-middleware.ts";
 import {
   validateUUID,
   sanitizeString,
   MAX_LENGTHS,
 } from "../_shared/input-validator.ts";

type AppointmentType = "in_person" | "video" | "home_visit" | "messaging" | "follow_up";

type BookAppointmentRequest = {
  patient_id?: string;
  doctor_patient_id?: string;

  entity_id?: string;
  provider_id: string;
  slot_start: string;
  duration_minutes?: number;
  appointment_type?: string;

  // NEW: patient-requested procedure (from that doctor’s procedures)
  procedure_id?: string;

  notes?: string;
};

type Resp =
  | {
      ok: true;
      hold_id: string;
      expires_at: string;
      appointment_date: string;
      start_time: string;
      end_time: string;
      appointment_type: AppointmentType;
      provider_id: string;
      entity_id: string | null;

      // NEW: echoed back if provided/validated
      procedure_id: string | null;
      procedure_name: string | null;
    }
  | { ok: false; error: string; code?: string };

 // ============= VALIDATION SCHEMA =============
 
 const bookingSchema = {
   patient_id: {
     type: 'uuid' as const,
     required: false,
   },
   doctor_patient_id: {
     type: 'uuid' as const,
     required: false,
   },
   entity_id: {
     type: 'uuid' as const,
     required: false,
   },
   provider_id: {
     type: 'uuid' as const,
     required: true,
   },
   slot_start: {
     type: 'string' as const,
     required: true,
     maxLength: 30,
   },
   duration_minutes: {
     type: 'number' as const,
     required: false,
     min: 5,
     max: 480, // 8 hours max
   },
   appointment_type: {
     type: 'string' as const,
     required: false,
     maxLength: 50,
   },
   procedure_id: {
     type: 'uuid' as const,
     required: false,
   },
   notes: {
     type: 'string' as const,
     required: false,
     maxLength: MAX_LENGTHS.notes,
     sanitize: true,
   },
 };
 
 function json(data: Resp, status = 200) {
   return jsonResponse(data, status);
}

function requireEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function normalizeAppointmentType(input?: string): AppointmentType {
   // Sanitize input before processing
   const t = sanitizeString(input || "", 50).toLowerCase();
  if (!t) return "in_person";
  if (t === "in-person" || t === "in_person" || t === "inperson") return "in_person";
  if (t === "video" || t === "telemed" || t === "telemedicine") return "video";
  if (t === "home" || t === "home_visit" || t === "home-visit") return "home_visit";
  if (t === "chat" || t === "message" || t === "messaging") return "messaging";
  if (t === "follow_up" || t === "follow-up" || t === "followup") return "follow_up";
  return "in_person";
}

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}
function hhmmss(d: Date) {
  return d.toISOString().split("T")[1].slice(0, 8);
}

function mergeNotes(original: string | undefined, extraLines: string[]) {
  const base = (original || "").trim();
  const existingLower = base.toLowerCase();
  const toAdd = extraLines.filter((l) => !existingLower.includes(l.toLowerCase()));
  const merged = [base, ...toAdd].filter(Boolean).join("\n").trim();
  return merged.length ? merged : null;
}

async function insertHoldWithFallback(
  service: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
) {
  // Try with payload as-is (may include procedure_id)
  let res = await service
    .from("appointment_holds")
    .insert(payload)
    .select("id, expires_at")
    .single();

  // If procedure_id column doesn't exist, retry without it
  if (res.error && String(res.error.message || "").toLowerCase().includes("procedure_id")) {
    const p2 = { ...payload };
    delete (p2 as any).procedure_id;

    res = await service
      .from("appointment_holds")
      .insert(p2)
      .select("id, expires_at")
      .single();
  }

  return res;
}

serve(async (req) => {
   // Apply security middleware with rate limiting
   const { response, context, validatedBody } = await secureHandler(req, 'book-appointment', {
     rateLimit: 'booking', // 30 requests per 5 minutes
     requireAuth: true,
     allowedMethods: ['POST', 'OPTIONS'],
     validationSchema: bookingSchema,
     logRequests: true,
   });
   
   // Return early if middleware returned a response
   if (response) return response;
   if (!context || !validatedBody) {
     return json({ ok: false, error: 'Internal server error' }, 500);
   }
   
   try {
     const { user, serviceClient: service, ip } = context;
     const body = validatedBody as BookAppointmentRequest;

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
     } = body;
 
     // Validate UUIDs explicitly
     if (provider_id && !validateUUID(provider_id)) {
       return json({ ok: false, error: "Invalid provider_id format" }, 400);
     }
 
     if (entity_id && !validateUUID(entity_id)) {
       return json({ ok: false, error: "Invalid entity_id format" }, 400);
     }
 
     if (procedure_id && !validateUUID(procedure_id)) {
       return json({ ok: false, error: "Invalid procedure_id format" }, 400);
     }

    if (!provider_id || !slot_start) {
      return json({ ok: false, error: "Missing required fields: provider_id, slot_start" }, 400);
    }

    const hasPatientId = Boolean(patient_id);
    const hasDoctorPatientId = Boolean(doctor_patient_id);

    if (hasPatientId === hasDoctorPatientId) {
      return json({ ok: false, error: "Provide exactly one of patient_id or doctor_patient_id" }, 400);
    }

     if (!hasPatientId || patient_id !== user!.id) {
      return json({ ok: false, error: "Unauthorized: patient_id must match authenticated user" }, 403);
    }

    const startAt = new Date(slot_start);
    if (Number.isNaN(startAt.getTime())) {
      return json({ ok: false, error: "Invalid slot_start", code: "INVALID_SLOT_START" }, 400);
    }

    const now = new Date();
    if (startAt.getTime() <= now.getTime() + 60_000) {
      return json({ ok: false, error: "Cannot book an appointment in the past", code: "PAST_TIME" }, 400);
    }

    const endAt = new Date(startAt.getTime() + Math.max(5, Number(duration_minutes || 30)) * 60_000);
     // Sanitize notes before storing
     const sanitizedNotes = notes ? sanitizeString(notes, MAX_LENGTHS.notes) : undefined;

    await service.rpc("cleanup_expired_appointment_holds").catch(() => {});

    const appointmentDate = isoDate(startAt);
    const startTime = hhmmss(startAt);
    const endTime = hhmmss(endAt);

    // Slot conflict check: appointments
    const { data: existingAppointments, error: conflictErr } = await service
      .from("appointments")
      .select("id")
      .eq("appointment_date", appointmentDate)
      .eq("doctor_id", provider_id)
      .neq("status", "canceled")
      .or(
        `and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime})`,
      );

    if (conflictErr) {
      console.error("Conflict check error:", conflictErr);
      return json({ ok: false, error: "Failed to validate slot availability" }, 500);
    }

    if (existingAppointments && existingAppointments.length > 0) {
      return json({ ok: false, error: "Slot is no longer available", code: "SLOT_TAKEN" }, 409);
    }

    // Slot conflict check: holds
    const { data: otherHolds, error: holdErr } = await service
      .from("appointment_holds")
      .select("id")
      .eq("doctor_id", provider_id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .or(
        `and(start_at.lte.${startAt.toISOString()},end_at.gt.${startAt.toISOString()}),and(start_at.lt.${endAt.toISOString()},end_at.gte.${endAt.toISOString()})`,
      );

    if (holdErr) {
      console.error("Hold conflict check error:", holdErr);
      return json({ ok: false, error: "Failed to validate slot availability" }, 500);
    }

    if (otherHolds && otherHolds.length > 0) {
      return json({ ok: false, error: "Slot is temporarily held by another patient", code: "SLOT_TAKEN" }, 409);
    }

    const normalizedType = normalizeAppointmentType(appointment_type);

    // NEW: Validate requested procedure (must belong to this doctor & be bookable/active)
    let procedureName: string | null = null;
    let procedureId: string | null = null;

    if (procedure_id) {
      const pid = String(procedure_id).trim();
      if (!pid) {
        return json({ ok: false, error: "procedure_id is invalid" }, 400);
      }

      const { data: proc, error: procErr } = await service
        .from("procedures")
        .select("id, name, dentist_id, is_active, is_bookable")
        .eq("id", pid)
        .maybeSingle();

      if (procErr) {
        console.error("Procedure lookup error:", procErr);
        return json({ ok: false, error: "Failed to validate procedure" }, 500);
      }

      if (!proc?.id) {
        return json({ ok: false, error: "Requested procedure not found", code: "PROCEDURE_NOT_FOUND" }, 404);
      }

      if (String((proc as any).dentist_id) !== String(provider_id)) {
        return json({ ok: false, error: "Requested procedure does not belong to this doctor", code: "PROCEDURE_FORBIDDEN" }, 403);
      }

      if ((proc as any).is_active === false) {
        return json({ ok: false, error: "Requested procedure is not active", code: "PROCEDURE_INACTIVE" }, 409);
      }

      if ((proc as any).is_bookable === false) {
        return json({ ok: false, error: "Requested procedure is not bookable", code: "PROCEDURE_NOT_BOOKABLE" }, 409);
      }

      procedureId = String(proc.id);
      procedureName = proc.name ? String(proc.name) : null;
    }

    // Put procedure info into notes so it’s visible even if DB column isn’t present yet
    const merged = mergeNotes(notes, [
       procedureName ? `Requested Procedure: ${sanitizeString(procedureName, 200)}` : "",
       procedureId ? `Requested Procedure ID: ${procedureId}` : "", 
    ]);

    const holdPayload: Record<string, unknown> = {
       patient_id: user!.id,
      doctor_patient_id: null,
      doctor_id: provider_id,
      practice_id: entity_id || null,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      appointment_type: normalizedType,
      notes: merged,
      status: "pending",
    };

    // If appointment_holds has procedure_id column, store it too.
    if (procedureId) holdPayload.procedure_id = procedureId;

    const { data: holdRow, error: insertErr } = await insertHoldWithFallback(service, holdPayload);

    if (insertErr || !holdRow) {
      console.error("Error creating appointment hold:", insertErr);
      return json({ ok: false, error: "Failed to create booking hold" }, 500);
    }

     console.log(`Appointment booked: patient=${user!.id}, provider=${provider_id}, date=${appointmentDate}, ip=${ip}`);
 
    return json(
      {
        ok: true,
        hold_id: holdRow.id,
        expires_at: holdRow.expires_at,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        appointment_type: normalizedType,
        provider_id,
        entity_id: entity_id || null,
        procedure_id: procedureId,
        procedure_name: procedureName,
      },
      201,
    );
  } catch (e: any) {
    console.error("Error in book-appointment:", e);
    return json({ ok: false, error: e?.message ?? String(e) }, 500);
  }
});
