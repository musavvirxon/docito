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

    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    await service.rpc("cleanup_expired_appointment_holds").catch(() => {});

    // Try select with procedure_id; fallback without if DB not migrated yet
    let hold: any = null;
    let holdErr: any = null;

    const q1 = await service
      .from("appointment_holds")
      .select(
        "id, patient_id, doctor_patient_id, doctor_id, practice_id, start_at, end_at, appointment_type, notes, status, expires_at, procedure_id",
      )
      .eq("id", body.hold_id)
      .maybeSingle();

    if (!q1.error) {
      hold = q1.data;
    } else {
      const q2 = await service
        .from("appointment_holds")
        .select("id, patient_id, doctor_patient_id, doctor_id, practice_id, start_at, end_at, appointment_type, notes, status, expires_at")
        .eq("id", body.hold_id)
        .maybeSingle();

      hold = q2.data;
      holdErr = q2.error || q1.error;
    }

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

    const { data: otherHolds, error: otherHoldErr } = await service
      .from("appointment_holds")
      .select("id")
      .eq("doctor_id", hold.doctor_id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .neq("id", hold.id)
      .or(`and(start_at.lte.${hold.start_at},end_at.gt.${hold.start_at}),and(start_at.lt.${hold.end_at},end_at.gte.${hold.end_at})`);

    if (otherHoldErr) {
      console.error("Other hold check error:", otherHoldErr);
      return json({ ok: false, error: "Failed to validate slot availability" }, 500);
    }

    if (otherHolds && otherHolds.length > 0) {
      await service.from("appointment_holds").delete().eq("id", hold.id);
      return json({ ok: false, error: "Slot is temporarily held by another patient", code: "SLOT_TAKEN" }, 409);
    }

    const procedureId = (hold as any)?.procedure_id ?? null;

    // Insert appointment (procedure_id already exists on appointments table in your schema)
    const payload: any = {
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
      procedure_id: procedureId,
    };

    const tryInsert = async (p: any) => {
      return await service
        .from("appointments")
        .insert(p as any)
        .select("id, appointment_date, start_time, end_time, appointment_type")
        .single();
    };

    let appointment: any = null;
    let insertErr: any = null;

    const ins1 = await tryInsert(payload);
    if (!ins1.error && ins1.data) {
      appointment = ins1.data;
    } else {
      insertErr = ins1.error;
      const msg = String(insertErr?.message || "");
      // fallback if DB somehow lacks procedure_id
      if (msg.toLowerCase().includes("procedure_id")) {
        const retry = { ...payload };
        delete retry.procedure_id;
        const ins2 = await tryInsert(retry);
        if (!ins2.error && ins2.data) {
          appointment = ins2.data;
          insertErr = null;
        } else {
          insertErr = ins2.error;
        }
      }
    }

    if (insertErr || !appointment) {
      console.error("Appointment insert error:", insertErr);
      return json({ ok: false, error: "Failed to confirm appointment" }, 500);
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
        metadata: { confirmed_from_hold: hold.id },
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
      },
      201,
    );
  } catch (e: any) {
    console.error("Error in confirm-appointment:", e);
    return json({ ok: false, error: e?.message ?? String(e) }, 500);
  }
});
