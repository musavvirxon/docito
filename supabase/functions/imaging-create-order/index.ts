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

async function assertImagingAccess(serviceClient: ReturnType<typeof createClient>, userId: string, centerId: string) {
  const { data: center, error: cErr } = await serviceClient
    .from("imaging_centers")
    .select("id,admin_id")
    .eq("id", centerId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (center?.admin_id === userId) return true;

  const { data: staff, error: sErr } = await serviceClient
    .from("imaging_staff")
    .select("id")
    .eq("imaging_center_id", centerId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (sErr) throw sErr;
  return Boolean(staff?.id);
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

  if (!body?.centerId) return json({ ok: false, error: "Missing centerId" }, 400);
  if (!body?.patient?.full_name?.trim()) return json({ ok: false, error: "Patient full_name is required" }, 400);
  if (!body?.patient?.phone?.trim()) return json({ ok: false, error: "Patient phone is required" }, 400);
  if (!body?.study?.name?.trim()) return json({ ok: false, error: "Study name is required" }, 400);

  const service = createClient(env.url, env.service);

  const allowed = await assertImagingAccess(service, userRes.user.id, body.centerId);
  if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

  try {
    // 1) Upsert facility patient (walk-in registry)
    const { data: fp, error: fpErr } = await service
      .from("facility_patients")
      .upsert(
        {
          facility_type: "imaging_center",
          facility_id: body.centerId,
          full_name: body.patient.full_name.trim(),
          phone: body.patient.phone.trim(),
          email: body.patient.email?.trim() || null,
          date_of_birth: body.patient.date_of_birth || null,
        },
        { onConflict: "facility_type,facility_id,phone" },
      )
      .select("id,full_name,phone,email")
      .single();

    if (fpErr) throw fpErr;

    // 2) Create referral (imaging order) pointing to facility_patient_id
    const priority = body.priority || "routine";

    const attachments = {
      modality: body.study.modality,
      exam_name: body.study.name.trim(),
      source: "manual_imaging_dashboard",
    };

    const { data: referral, error: rErr } = await service
      .from("referrals")
      .insert({
        // referrer = same imaging center (walk-in)
        referrer_type: "imaging_center",
        referrer_entity_id: body.centerId,
        referrer_user_id: userRes.user.id,

        // receiver = imaging center
        receiver_type: "imaging_center",
        receiver_entity_id: body.centerId,

        referral_type_enum: "imaging_study",
        priority,
        reason: body.reason?.trim() || body.study.name.trim(),
        clinical_notes: body.clinical_notes?.trim() || null,
        preferred_date: body.preferred_date || null,
        preferred_time_slot: body.preferred_time_slot || null,
        attachments,

        // walk-in patient linkage
        patient_id: null,
        facility_patient_id: fp.id,
        patient_name: fp.full_name,
        patient_phone: fp.phone,
        patient_email: fp.email ?? null,

        status: "pending",
        sent_at: new Date().toISOString(),
      })
      .select("id,referral_number")
      .single();

    if (rErr) throw rErr;

    // 3) Ensure imaging_order_state exists for workflow display
    const { error: stErr } = await service
      .from("imaging_order_state")
      .upsert(
        {
          referral_id: referral.id,
          imaging_center_id: body.centerId,
          workflow_status: "scheduled",
          priority,
          assigned_staff_id: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "referral_id" },
      );

    if (stErr) {
      // Non-fatal: the UI can still show the referral row; but return warning
      return json({ ok: true, referralId: referral.id, referralNumber: referral.referral_number, warning: stErr.message });
    }

    return json({ ok: true, referralId: referral.id, referralNumber: referral.referral_number });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg }, 500);
  }
});
