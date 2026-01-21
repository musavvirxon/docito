import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RxItem = {
  medication_name: string;
  medication_code?: string | null;
  dosage: string;
  frequency: string;
  quantity: number;
  unit?: string | null;
  instructions?: string | null;
  substitutions_allowed?: boolean | null;
};

type ReqBody = {
  pharmacyId: string;

  patient: {
    patient_id?: string | null; // registered patient auth.users.id (optional)
    full_name: string;
    phone: string;
    email?: string | null;
    date_of_birth?: string | null; // YYYY-MM-DD
  };

  doctor_id?: string | null;
  notes?: string | null;
  refills_total?: number | null;
  items: RxItem[];
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function okFalse(error: string, meta?: Record<string, unknown>) {
  return json({ ok: false, error, ...(meta ? { meta } : {}) }, 200);
}

function trimOrNull(v: unknown) {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

function errMeta(e: unknown) {
  if (!e || typeof e !== "object") return { message: String(e) };
  const anyE = e as any;
  return {
    message: anyE?.message ? String(anyE.message) : "Unknown error",
    code: anyE?.code ? String(anyE.code) : undefined,
    details: anyE?.details ? String(anyE.details) : undefined,
    hint: anyE?.hint ? String(anyE.hint) : undefined,
    status: typeof anyE?.status === "number" ? anyE.status : undefined,
  };
}

async function assertPharmacyAccess(service: ReturnType<typeof createClient>, userId: string, pharmacyId: string) {
  const { data: ph, error: pErr } = await service
    .from("pharmacies")
    .select("id,admin_id,status")
    .eq("id", pharmacyId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (ph?.admin_id === userId) return { ok: true as const, role: "admin" as const };

  const { data: staff, error: sErr } = await service
    .from("pharmacy_staff")
    .select("id,status,can_process_prescriptions")
    .eq("pharmacy_id", pharmacyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (sErr) throw sErr;

  if (!staff?.id || staff.status !== "active") return { ok: false as const, reason: "Not assigned to this pharmacy" };
  if (staff.can_process_prescriptions !== true) return { ok: false as const, reason: "Missing permission: can_process_prescriptions" };
  return { ok: true as const, role: "staff" as const };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return okFalse("Method not allowed");

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return okFalse("Missing Authorization");

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !serviceKey) return okFalse("Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY");

  const authed = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return okFalse("Unauthorized", errMeta(userErr));

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return okFalse("Invalid JSON body");
  }

  const pharmacyId = trimOrNull(body?.pharmacyId);
  if (!pharmacyId) return okFalse("Missing pharmacyId");

  const patientId = trimOrNull(body?.patient?.patient_id);
  const patientName = trimOrNull(body?.patient?.full_name);
  const patientPhone = trimOrNull(body?.patient?.phone);
  const patientEmail = trimOrNull(body?.patient?.email);
  const patientDob = trimOrNull(body?.patient?.date_of_birth);

  if (!patientName) return okFalse("Patient name is required");
  if (!patientPhone) return okFalse("Patient phone is required");

  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length) return okFalse("At least one medication item is required");

  for (const it of items) {
    if (!trimOrNull(it.medication_name)) return okFalse("Medication name is required");
    if (!trimOrNull(it.dosage)) return okFalse("Dosage is required");
    if (!trimOrNull(it.frequency)) return okFalse("Frequency is required");
    if (!Number.isFinite(Number(it.quantity)) || Number(it.quantity) <= 0) return okFalse("Quantity must be > 0");
  }

  const refillsTotal = Number.isFinite(Number(body?.refills_total)) ? Number(body.refills_total) : 0;

  const service = createClient(url, serviceKey);

  try {
    const allowed = await assertPharmacyAccess(service, userRes.user.id, pharmacyId);
    if (!allowed.ok) return okFalse(allowed.reason || "Forbidden");

    // Walk-in registry (only if patientId not provided)
    let facilityPatientId: string | null = null;
    if (!patientId) {
      const { data: fp, error: fpErr } = await service
        .from("facility_patients")
        .upsert(
          {
            facility_type: "pharmacy",
            facility_id: pharmacyId,
            full_name: patientName,
            phone: patientPhone,
            email: patientEmail,
            date_of_birth: patientDob,
          },
          { onConflict: "facility_type,facility_id,phone" },
        )
        .select("id")
        .single();

      if (fpErr) return okFalse("Failed to upsert facility patient", errMeta(fpErr));
      facilityPatientId = fp.id as string;
    }

    const external_patient_ref = patientPhone || patientEmail || null;

    const { data: createdRx, error: rxErr } = await service
      .from("prescriptions")
      .insert({
        pharmacy_id: pharmacyId,
        status: "pending",
        notes: trimOrNull(body?.notes),
        refills_total: refillsTotal,
        refills_remaining: refillsTotal,
        doctor_id: trimOrNull(body?.doctor_id),

        patient_id: patientId,
        facility_patient_id: patientId ? null : facilityPatientId,

        patient_name: patientName,
        patient_phone: patientPhone,
        patient_email: patientEmail,

        patient_snapshot_full_name: patientName,
        patient_snapshot_phone: patientPhone,
        patient_snapshot_email: patientEmail,
        patient_snapshot_dob: patientDob,

        external_patient_ref,
      } as any)
      .select("id,prescription_number")
      .single();

    if (rxErr) return okFalse("Failed to create prescription", errMeta(rxErr));

    const itemsPayload = items.map((it) => ({
      prescription_id: createdRx.id,
      medication_name: String(it.medication_name).trim(),
      medication_code: trimOrNull(it.medication_code),
      dosage: String(it.dosage).trim(),
      frequency: String(it.frequency).trim(),
      quantity: Number(it.quantity),
      unit: trimOrNull(it.unit),
      instructions: trimOrNull(it.instructions),
      substitutions_allowed: it.substitutions_allowed !== false,
    }));

    const { error: itemsErr } = await service.from("prescription_items").insert(itemsPayload as any);
    if (itemsErr) return okFalse("Failed to create prescription items", errMeta(itemsErr));

    return json({
      ok: true,
      prescriptionId: createdRx.id,
      prescriptionNumber: createdRx.prescription_number,
    });
  } catch (e) {
    return okFalse("Unhandled error", errMeta(e));
  }
});
