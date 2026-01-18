// supabase/functions/imaging-create-order/index.ts
// File: supabase/functions/imaging-create-order/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = {
  centerId: string;
  patient: {
    full_name: string;
    phone: string;
    email?: string | null;
    date_of_birth?: string | null; // YYYY-MM-DD
  };
  study: {
    modality: "xray" | "ct" | "mri" | "ultrasound" | "mammography" | "other";
    name: string;
  };
  priority?: "routine" | "urgent" | "stat";
  preferred_date?: string | null; // YYYY-MM-DD
  preferred_time_slot?: string | null;
  reason?: string | null;
  clinical_notes?: string | null;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" };
  }
  return { ok: true as const, url, anon, service };
}

function trimOrNull(v: unknown) {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

async function assertImagingManualOrderAccess(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  centerId: string,
) {
  const { data: center, error: cErr } = await serviceClient
    .from("imaging_centers")
    .select("id,admin_id")
    .eq("id", centerId)
    .maybeSingle();

  if (cErr) throw cErr;
  if (center?.admin_id === userId) return { ok: true as const, role: "admin" as const };

  const { data: staff, error: sErr } = await serviceClient
    .from("imaging_staff")
    .select("id,status,can_view_orders")
    .eq("imaging_center_id", centerId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sErr) throw sErr;

  if (!staff?.id || staff.status !== "active") return { ok: false as const, reason: "Not assigned to this imaging center" };
  if (!staff.can_view_orders) return { ok: false as const, reason: "Missing permission: can_view_orders" };

  return { ok: true as const, role: "staff" as const, staffId: staff.id as string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = await requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const authed = createClient(env.url, env.anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const centerId = trimOrNull(body?.centerId);
  if (!centerId) return json({ ok: false, error: "Missing centerId" }, 400);

  const patientName = trimOrNull(body?.patient?.full_name);
  const patientPhone = trimOrNull(body?.patient?.phone);
  const patientEmail = trimOrNull(body?.patient?.email);
  const patientDob = trimOrNull(body?.patient?.date_of_birth);

  const studyName = trimOrNull(body?.study?.name);
  const modality = (body?.study?.modality || "other") as ReqBody["study"]["modality"];

  if (!patientName) return json({ ok: false, error: "Patient full_name is required" }, 400);
  if (!patientPhone) return json({ ok: false, error: "Patient phone is required" }, 400);
  if (!studyName) return json({ ok: false, error: "Study name is required" }, 400);

  const priority = (body?.priority || "routine") as NonNullable<ReqBody["priority"]>;

  const service = createClient(env.url, env.service);

  const allowed = await assertImagingManualOrderAccess(service, userRes.user.id, centerId);
  if (!allowed.ok) return json({ ok: false, error: allowed.reason || "Forbidden" }, 403);

  try {
    const { data: fp, error: fpErr } = await service
      .from("facility_patients")
      .upsert(
        {
          facility_type: "imaging_center",
          facility_id: centerId,
          full_name: patientName,
          phone: patientPhone,
          email: patientEmail,
          date_of_birth: patientDob,
        },
        { onConflict: "facility_type,facility_id,phone" },
      )
      .select("id,full_name,phone,email")
      .single();

    if (fpErr) throw fpErr;

    const attachments = {
      modality,
      exam_name: studyName,
      source: "manual_imaging_dashboard",
    };

    const nowIso = new Date().toISOString();

    const { data: referral, error: rErr } = await service
      .from("referrals")
      .insert({
        referrer_type: "imaging_center",
        referrer_entity_id: centerId,
        referrer_user_id: userRes.user.id,

        receiver_type: "imaging_center",
        receiver_entity_id: centerId,

        referral_type_enum: "imaging_study",
        priority,
        reason: trimOrNull(body?.reason) || studyName,
        clinical_notes: trimOrNull(body?.clinical_notes),
        preferred_date: trimOrNull(body?.preferred_date),
        preferred_time_slot: trimOrNull(body?.preferred_time_slot),
        attachments,

        patient_id: null,
        facility_patient_id: fp.id,
        patient_name: fp.full_name,
        patient_phone: fp.phone,
        patient_email: fp.email ?? null,

        status: "pending",
        sent_at: nowIso,
      })
      .select("id,referral_number")
      .single();

    if (rErr) throw rErr;

    const { error: stErr } = await service
      .from("imaging_order_state")
      .upsert(
        {
          referral_id: referral.id,
          imaging_center_id: centerId,
          workflow_status: "scheduled",
          priority,
          assigned_staff_id: null,
          updated_by: userRes.user.id,
          updated_at: nowIso,
        },
        { onConflict: "referral_id" },
      );

    if (stErr) {
      return json({
        ok: true,
        referralId: referral.id,
        referralNumber: referral.referral_number,
        facilityPatientId: fp.id,
        warning: stErr.message,
      });
    }

    return json({
      ok: true,
      referralId: referral.id,
      referralNumber: referral.referral_number,
      facilityPatientId: fp.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg }, 500);
  }
});
