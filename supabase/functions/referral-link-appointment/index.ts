// File: supabase/functions/referral-link-appointment/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  secureHandler,
  jsonResponse,
  errorResponse,
} from "../_shared/security-middleware.ts";

type LinkReferralAppointmentRequest = {
  referral_id: string;
  appointment_id: string;
};

type LinkReferralAppointmentResponse =
  | {
      ok: true;
      referral_id: string;
      appointment_id: string;
      referral_appointment_id: string;
      already_linked: boolean;
      referral_status_updated: boolean;
    }
  | { ok: false; error: string; code?: string };

const schema = {
  referral_id: { type: "uuid" as const, required: true },
  appointment_id: { type: "uuid" as const, required: true },
};

serve(async (req) => {
  const { response, context, validatedBody } = await secureHandler(
    req,
    "referral-link-appointment",
    {
      requireAuth: true,
      allowedMethods: ["POST", "OPTIONS"],
      rateLimit: "booking",
      validationSchema: schema,
      logRequests: false,
    },
  );

  if (response) return response;
  if (!context?.userId) return errorResponse("Unauthorized", 401);

  try {
    const body = validatedBody as LinkReferralAppointmentRequest;

    // Load referral (RLS ensures user can only read what they're allowed to)
    const { data: referral, error: refErr } = await context.supabase
      .from("referrals")
      .select(
        "id, patient_id, receiver_type, receiver_entity_id, status, referral_number",
      )
      .eq("id", body.referral_id)
      .maybeSingle();

    if (refErr) {
      console.error("Referral read error:", refErr);
      return jsonResponse(
        { ok: false, error: "Failed to load referral" } satisfies LinkReferralAppointmentResponse,
        500,
      );
    }

    if (!referral) {
      return jsonResponse(
        { ok: false, error: "Referral not found", code: "REFERRAL_NOT_FOUND" } satisfies LinkReferralAppointmentResponse,
        404,
      );
    }

    if (referral.patient_id !== context.userId) {
      return jsonResponse(
        { ok: false, error: "Forbidden", code: "FORBIDDEN" } satisfies LinkReferralAppointmentResponse,
        403,
      );
    }

    // This link flow is for booking "appointments" (doctor schedule). Other receiver types can use referral_slots.
    if (referral.receiver_type !== "doctor") {
      return jsonResponse(
        {
          ok: false,
          error: "Only doctor referrals can be linked to a scheduled appointment",
          code: "UNSUPPORTED_RECEIVER_TYPE",
        } satisfies LinkReferralAppointmentResponse,
        400,
      );
    }

    // Load appointment (RLS ensures user can only read their own appointment)
    const { data: appt, error: apptErr } = await context.supabase
      .from("appointments")
      .select("id, patient_id, doctor_id, appointment_date, start_time, end_time, notes, status")
      .eq("id", body.appointment_id)
      .maybeSingle();

    if (apptErr) {
      console.error("Appointment read error:", apptErr);
      return jsonResponse(
        { ok: false, error: "Failed to load appointment" } satisfies LinkReferralAppointmentResponse,
        500,
      );
    }

    if (!appt) {
      return jsonResponse(
        { ok: false, error: "Appointment not found", code: "APPOINTMENT_NOT_FOUND" } satisfies LinkReferralAppointmentResponse,
        404,
      );
    }

    // Authorize: caller must be the patient OR the doctor that owns the appointment (or their staff)
    let authorized = appt.patient_id === context.userId;
    if (!authorized) {
      const { data: doctorRow } = await context.supabase
        .from("doctors")
        .select("id, user_id")
        .eq("id", appt.doctor_id)
        .maybeSingle();
      if (doctorRow?.user_id === context.userId) authorized = true;
    }
    if (!authorized) {
      return jsonResponse(
        { ok: false, error: "Forbidden", code: "FORBIDDEN" } satisfies LinkReferralAppointmentResponse,
        403,
      );
    }

    // If the referral is a "specific doctor" referral, receiver_entity_id should match the appointment doctor_id.
    // For general referrals (if your DB allows null/empty receiver_entity_id), we skip this strict check.
    const receiverEntityId = (referral.receiver_entity_id ?? "").trim();
    if (receiverEntityId && receiverEntityId !== appt.doctor_id) {
      return jsonResponse(
        {
          ok: false,
          error: "This appointment does not match the referred doctor",
          code: "DOCTOR_MISMATCH",
        } satisfies LinkReferralAppointmentResponse,
        409,
      );
    }

    // Check existing link
    const { data: existing, error: existsErr } = await context.supabase
      .from("referral_appointments")
      .select("id")
      .eq("referral_id", referral.id)
      .eq("appointment_id", appt.id)
      .maybeSingle();

    if (existsErr) {
      console.error("Existing link check error:", existsErr);
      return jsonResponse(
        { ok: false, error: "Failed to validate existing referral link" } satisfies LinkReferralAppointmentResponse,
        500,
      );
    }

    if (existing?.id) {
      // Ensure status is at least "booked" (best-effort)
      let referralStatusUpdated = false;
      if (
        referral.status !== "booked" &&
        !["completed", "cancelled", "rejected", "expired"].includes(String(referral.status))
      ) {
        const { error: updErr } = await context.supabase
          .from("referrals")
          .update({ status: "booked" })
          .eq("id", referral.id);

        if (!updErr) referralStatusUpdated = true;
      }

      return jsonResponse(
        {
          ok: true,
          referral_id: referral.id,
          appointment_id: appt.id,
          referral_appointment_id: existing.id,
          already_linked: true,
          referral_status_updated: referralStatusUpdated,
        } satisfies LinkReferralAppointmentResponse,
        200,
      );
    }

    // Insert link row
    const { data: inserted, error: insErr } = await context.supabase
      .from("referral_appointments")
      .insert({
        referral_id: referral.id,
        appointment_id: appt.id,
        appointment_date: appt.appointment_date,
        start_time: appt.start_time,
        end_time: appt.end_time,
        status: "scheduled",
        booked_by: context.userId,
        notes: appt.notes ?? null,
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("Insert referral_appointments error:", insErr);
      return jsonResponse(
        { ok: false, error: "Failed to link referral to appointment" } satisfies LinkReferralAppointmentResponse,
        500,
      );
    }

    // Update referral status -> booked (best-effort)
    let referralStatusUpdated = false;
    if (
      referral.status !== "booked" &&
      !["completed", "cancelled", "rejected", "expired"].includes(String(referral.status))
    ) {
      const { error: updErr } = await context.supabase
        .from("referrals")
        .update({ status: "booked" })
        .eq("id", referral.id);

      if (!updErr) referralStatusUpdated = true;
    }

    // Audit log (best-effort; uses SECURITY DEFINER but needs auth.uid -> call via user client)
    await context.supabase
      .rpc("log_referral_action", {
        p_referral_id: referral.id,
        p_action: "booked",
        p_notes: `Linked appointment ${appt.id} to referral`,
      })
      .catch(() => {});

    return jsonResponse(
      {
        ok: true,
        referral_id: referral.id,
        appointment_id: appt.id,
        referral_appointment_id: inserted.id,
        already_linked: false,
        referral_status_updated: referralStatusUpdated,
      } satisfies LinkReferralAppointmentResponse,
      201,
    );
  } catch (e: any) {
    console.error("Error in referral-link-appointment:", e);
    return jsonResponse(
      { ok: false, error: e?.message ?? String(e) } satisfies LinkReferralAppointmentResponse,
      500,
    );
  }
});
