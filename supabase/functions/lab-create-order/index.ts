import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = {
  labCenterId: string;

  patient: {
    patient_id?: string | null; // registered patient auth.users.id (optional)
    full_name: string;
    phone: string;
    email?: string | null;
    date_of_birth?: string | null; // YYYY-MM-DD
  };

  selectedTestIds: string[]; // test_catalog ids
  priority?: "routine" | "urgent" | "stat";
  clinical_notes?: string | null;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// Always return 200 so invoke() surfaces details.
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

async function assertLabAccess(service: ReturnType<typeof createClient>, userId: string, labCenterId: string) {
  const { data: lab, error: lErr } = await service
    .from("lab_centers")
    .select("id,admin_id,status")
    .eq("id", labCenterId)
    .maybeSingle();
  if (lErr) throw lErr;
  if (lab?.admin_id === userId) return { ok: true as const, role: "admin" as const };

  const { data: staff, error: sErr } = await service
    .from("lab_staff")
    .select("id,status")
    .eq("lab_center_id", labCenterId)
    .eq("user_id", userId)
    .maybeSingle();
  if (sErr) throw sErr;

  if (!staff?.id || staff.status !== "active") return { ok: false as const, reason: "Not assigned to this lab" };
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

  const labCenterId = trimOrNull(body?.labCenterId);
  if (!labCenterId) return okFalse("Missing labCenterId");

  const patientId = trimOrNull(body?.patient?.patient_id);
  const patientName = trimOrNull(body?.patient?.full_name);
  const patientPhone = trimOrNull(body?.patient?.phone);
  const patientEmail = trimOrNull(body?.patient?.email);
  const patientDob = trimOrNull(body?.patient?.date_of_birth);

  const selectedTestIds = Array.isArray(body?.selectedTestIds) ? body.selectedTestIds.filter(Boolean) : [];
  if (!selectedTestIds.length) return okFalse("No tests selected");
  if (!patientPhone) return okFalse("Patient phone is required");
  if (!patientName) return okFalse("Patient name is required");

  const priority = (body?.priority || "routine") as NonNullable<ReqBody["priority"]>;

  const service = createClient(url, serviceKey);

  try {
    const allowed = await assertLabAccess(service, userRes.user.id, labCenterId);
    if (!allowed.ok) return okFalse(allowed.reason || "Forbidden");

    // Validate tests belong to lab or global
    const { data: tests, error: tErr } = await service
      .from("test_catalog")
      .select("id,price,lab_center_id,is_global")
      .in("id", selectedTestIds);

    if (tErr) return okFalse("Failed to load tests", errMeta(tErr));
    if (!tests || tests.length !== selectedTestIds.length) return okFalse("One or more selected tests are invalid");

    for (const t of tests as any[]) {
      const ok = (t.is_global === true) || (t.lab_center_id === labCenterId);
      if (!ok) return okFalse("One or more selected tests do not belong to this lab");
    }

    const total_amount = (tests as any[]).reduce((sum, t) => sum + (Number(t.price) || 0), 0);

    // Walk-in registry (only if patientId not provided)
    let facilityPatientId: string | null = null;
    if (!patientId) {
      const { data: fp, error: fpErr } = await service
        .from("facility_patients")
        .upsert(
          {
            facility_type: "lab",
            facility_id: labCenterId,
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

    const { data: createdOrder, error: oErr } = await service
      .from("test_orders")
      .insert({
        lab_center_id: labCenterId,
        status: "pending",
        priority,
        clinical_notes: trimOrNull(body?.clinical_notes),
        total_amount,

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
      .select("id,order_number")
      .single();

    if (oErr) return okFalse("Failed to create test order", errMeta(oErr));

    const itemsPayload = (tests as any[]).map((t) => ({
      test_order_id: createdOrder.id,
      test_id: t.id,
      price: t.price ?? null,
      status: "pending",
    }));

    const { error: itemsErr } = await service.from("test_order_items").insert(itemsPayload as any);
    if (itemsErr) return okFalse("Failed to create test order items", errMeta(itemsErr));

    return json({
      ok: true,
      orderId: createdOrder.id,
      orderNumber: createdOrder.order_number,
    });
  } catch (e) {
    return okFalse("Unhandled error", errMeta(e));
  }
});
