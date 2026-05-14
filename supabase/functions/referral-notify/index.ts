// File: supabase/functions/referral-notify/index.ts
// Deno Edge Function: Create an in-app notification for a patient when a referral is created/sent.
// Requirements: Deno + supabase-js v2 + CORS + Authorization (Bearer).
//
// Security:
// - Only non-patient roles can call (doctor/admin/staff/super_admin).
// - Caller must be the referral referrer OR have access to the referrer entity (clinic/lab/imaging/pharmacy) OR be the referrer doctor.
// - Idempotent: uses referral_notifications row existence to dedupe per (referral_id, recipient_id, notification_type).
//
// Frontend usage (later):
// supabase.functions.invoke("referral-notify", { body: { referral_id, event: "sent" } })

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReferralEvent = "created" | "sent";

type ReqBody = {
  referral_id: string;
  event?: ReferralEvent;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function getEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return {
      ok: false as const,
      error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
    };
  }
  return { ok: true as const, url, anon, service };
}

function isUuid(v: unknown) {
  const s = String(v || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function mapReferrerTypeToAccessEntityType(referrerType: string): string | null {
  const t = String(referrerType || "").toLowerCase();
  if (t === "clinic") return "clinic";
  if (t === "lab") return "lab";
  if (t === "pharmacy") return "pharmacy";
  if (t === "imaging_center") return "imaging";
  // doctor is handled separately
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = getEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const authed = createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const referralId = String(body?.referral_id || "").trim();
  if (!isUuid(referralId)) return json({ ok: false, error: "Invalid referral_id" }, 400);

  const event: ReferralEvent = (String(body?.event || "sent").toLowerCase() === "created" ? "created" : "sent") as ReferralEvent;

  const admin = createClient(env.url, env.service, {
    auth: { persistSession: false },
    global: { "X-Client-Info": "referral-notify" } as any,
  });

  const userId = userRes.user.id;

  try {
    // 1) Role gate (non-patient)
    const { data: roleRows, error: rolesErr } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if (rolesErr) throw rolesErr;

    const roles = (roleRows || []).map((r: any) => String(r.role || "").toLowerCase());
    const allowed = ["doctor", "admin", "staff", "super_admin"];
    const hasAllowedRole = allowed.some((r) => roles.includes(r));
    if (!hasAllowedRole) return json({ ok: false, error: "Insufficient permissions" }, 403);

    // 2) Load referral
    const { data: referral, error: refErr } = await admin
      .from("referrals")
      .select("id, patient_id, referral_number, status, referrer_user_id, referrer_type, referrer_entity_id")
      .eq("id", referralId)
      .single();

    if (refErr) {
      const msg = String(refErr?.message || "").toLowerCase();
      if (msg.includes("0 rows")) return json({ ok: false, error: "Referral not found" }, 404);
      throw refErr;
    }

    const patientId = String((referral as any).patient_id || "").trim();
    // For unregistered (doctor-created) patients there is no auth user to notify — skip gracefully.
    if (!isUuid(patientId)) {
      return json({ ok: true, skipped: true, reason: "no_registered_patient" }, 200);
    }

    // 3) Authorization: must be referrer OR have access to referrer entity/doctor OR super_admin
    const isSuper = roles.includes("super_admin");
    const isReferrerUser = String((referral as any).referrer_user_id || "") === userId;

    let hasEntityAccess = false;

    if (!isSuper && !isReferrerUser) {
      const referrerType = String((referral as any).referrer_type || "").toLowerCase();
      const referrerEntityId = String((referral as any).referrer_entity_id || "").trim();

      if (referrerType === "doctor") {
        if (isUuid(referrerEntityId)) {
          const { data: doc } = await admin
            .from("doctors")
            .select("id")
            .eq("id", referrerEntityId)
            .eq("user_id", userId)
            .maybeSingle();
          hasEntityAccess = !!doc;
        }
      } else {
        const accessEntityType = mapReferrerTypeToAccessEntityType(referrerType);
        if (accessEntityType && isUuid(referrerEntityId)) {
          const { data: can, error: canErr } = await authed.rpc("can_access_entity", {
            p_entity_type: accessEntityType,
            p_entity_id: referrerEntityId,
          });
          if (canErr) throw canErr;
          hasEntityAccess = Boolean(can);
        }
      }
    }

    if (!isSuper && !isReferrerUser && !hasEntityAccess) {
      return json({ ok: false, error: "Forbidden" }, 403);
    }

    // 4) Determine patient's language for action_url
    const { data: prof } = await admin.from("profiles").select("language").eq("user_id", patientId).maybeSingle();
    const lang = String((prof as any)?.language || "en").trim() || "en";

    // Note: PatientDashboard will be updated later to read ?section=referrals&referral=<id>
    const actionUrl = `/${encodeURIComponent(lang)}/patient-dashboard?section=referrals&referral=${encodeURIComponent(referralId)}`;

    // 5) Idempotency via referral_notifications
    const notificationType = `referral_${event}`;

    const { data: existingNotif, error: existErr } = await admin
      .from("referral_notifications")
      .select("id")
      .eq("referral_id", referralId)
      .eq("recipient_id", patientId)
      .eq("notification_type", notificationType)
      .limit(1)
      .maybeSingle();

    if (existErr) throw existErr;

    if (existingNotif?.id) {
      return json({ ok: true, deduped: true, notification_id: existingNotif.id });
    }

    const referralNumber = String((referral as any).referral_number || "").trim();
    const title = event === "created" ? "Referral created" : "New referral";
    const message =
      event === "created"
        ? `A referral (${referralNumber || "REF"}) was created for you.`
        : `You received a referral (${referralNumber || "REF"}). Tap Open to review and book.`;

    // 6) Insert into referral_notifications (legacy/in-app tracking)
    const { data: insRN, error: insRNErr } = await admin
      .from("referral_notifications")
      .insert({
        referral_id: referralId,
        recipient_id: patientId,
        notification_type: notificationType,
        title,
        message,
        channel: "in_app",
        sent_at: new Date().toISOString(),
        delivery_status: "sent",
      })
      .select("id")
      .single();

    if (insRNErr) throw insRNErr;

    // 7) Insert into unified notifications table (used by Notifications UI)
    const { data: insertedId, error: notifErr } = await admin.rpc("create_notification", {
      p_user_id: patientId,
      p_entity_type: "patient",
      p_entity_id: patientId,
      p_level: "info",
      p_title: title,
      p_body: message,
      p_action_url: actionUrl,
    });

    if (notifErr) throw notifErr;

    return json({
      ok: true,
      referral_notification_id: insRN?.id ?? null,
      notification_id: insertedId ?? null,
      action_url: actionUrl,
    });
  } catch (e: any) {
    console.error("referral-notify error:", e);
    const msg = e?.message || "Unknown error";
    const lower = String(msg).toLowerCase();
    if (lower.includes("unauthorized")) return json({ ok: false, error: "Unauthorized" }, 401);
    if (lower.includes("forbidden")) return json({ ok: false, error: "Forbidden" }, 403);
    return json({ ok: false, error: msg }, 500);
  }
});
