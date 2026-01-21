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
    body_part?: string | null;
    contrast?: boolean | null;
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

// Always return 200 so supabase.functions.invoke doesn't collapse the real message into "non-2xx".
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

async function assertImagingManualOrderAccess(
  client: ReturnType<typeof createClient>,
  userId: string,
  centerId: string,
) {
  const { data: center, error: cErr } = await client
    .from("imaging_centers")
    .select("id,admin_id")
    .eq("id", centerId)
    .maybeSingle();

  if (cErr) throw cErr;
  if (center?.admin_id === userId) return { ok: true as const };

  const { data: staff, error: sErr } = await client
    .from("imaging_staff")
    .select("id,status,can_view_orders")
    .eq("imaging_center_id", centerId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sErr) throw sErr;

  if (!staff?.id || staff.status !== "active") {
    return { ok: false as const, reason: "Not assigned to this imaging center" };
  }
  if (!staff.can_view_orders) {
    return { ok: false as const, reason: "Missing permission: can_view_orders" };
  }

  return { ok: true as const };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return okFalse("Method not allowed");

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return okFalse("Missing Authorization");

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return okFalse("Missing SUPABASE_URL / SUPABASE_ANON_KEY");

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || null;

  const authed = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return okFalse("Unauthorized", errMeta(userErr));

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return okFalse("Invalid JSON body");
  }

  const centerId = trimOrNull(body?.centerId);
  if (!centerId) return okFalse("Missing centerId");

  const patientName = trimOrNull(body?.patient?.full_name);
  const patientPhone = trimOrNull(body?.patient?.phone);
  const patientEmail = trimOrNull(body?.patient?.email);
  const studyName = trimOrNull(body?.study?.name);
  const modality = (body?.study?.modality || "other") as ReqBody["study"]["modality"];
  const bodyPart = trimOrNull(body?.study?.body_part);
  const contrast = typeof body?.study?.contrast === "boolean" ? body.study.contrast : null;

  const priority = (body?.priority || "routine") as NonNullable<ReqBody["priority"]>;

  if (!patientName) return okFalse("Patient full_name is required");
  if (!patientPhone) return okFalse("Patient phone is required");
  if (!studyName) return okFalse("Study name is required");

  const db = serviceKey ? createClient(url, serviceKey) : authed;

  try {
    const allowed = await assertImagingManualOrderAccess(db, userRes.user.id, centerId);
    if (!allowed.ok) return okFalse(allowed.reason || "Forbidden");

    const nowIso = new Date().toISOString();

    const attachments = {
      modality,
      exam_name: studyName,
      body_part: bodyPart,
      contrast: contrast ?? false,
      source: "manual_imaging_dashboard",
    };

    // IMPORTANT FIX:
    // Your "referrals" table does NOT have facility_patient_id.
    // So we DO NOT send that field at all (otherwise PostgREST throws PGRST204).
    const { data: referral, error: rErr } = await db
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

        // Walk-in details stored directly on referral (no facility_patient_id column)
        patient_id: null,
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_email: patientEmail ?? null,

        status: "pending",
        sent_at: nowIso,
      })
      .select("id,referral_number")
      .single();

    if (rErr) return okFalse("Failed to create referral", errMeta(rErr));

    const { error: stErr } = await db
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

    const out: Record<string, unknown> = {
      ok: true,
      referralId: referral.id,
      referralNumber: referral.referral_number,
    };

    if (stErr) out.stateWarning = errMeta(stErr);

    return json(out, 200);
  } catch (e) {
    return okFalse("Unhandled error", errMeta(e));
  }
});
