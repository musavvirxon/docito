// File: supabase/functions/document-verify/index.ts
/**
 * Document Verification Lookup (Docito)
 *
 * Purpose:
 * - Super Admin can lookup ANY treatment plan / referral by verification_code
 * - Works even if patient/doctor deletes the original record (uses docito_document_archives)
 *
 * Security:
 * - Auth required
 * - Role required: super_admin
 *
 * Input:
 * - { verification_code: string }
 *
 * Output:
 * - { source: "live" | "archive", entity_type, entity_id, verification_code, deleted_at?, snapshot, enriched? }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  secureHandler,
  errorResponse,
  jsonResponse,
} from "../_shared/security-middleware.ts";
import { sanitizeString } from "../_shared/input-validator.ts";

type ReqBody = {
  verification_code: string;
};

type VerifyResponse = {
  source: "live" | "archive";
  entity_type: "treatment_plan" | "referral" | string;
  entity_id: string;
  verification_code: string;
  deleted_at?: string | null;
  snapshot: unknown;
  enriched?: Record<string, unknown>;
};

const schema = {
  verification_code: {
    type: "string" as const,
    required: true,
    minLength: 4,
    maxLength: 64,
    sanitize: true,
    trim: true,
  },
};

function normalizeCode(raw: string): { code: string; variants: string[] } {
  const code = sanitizeString(raw || "", 64).trim();
  const variants = Array.from(new Set([code, code.toUpperCase(), code.toLowerCase()])).filter(Boolean);
  return { code, variants };
}

async function fetchProfileByUserOrId(service: any, userOrId: string) {
  if (!userOrId) return null;
  const { data } = await service
    .from("profiles")
    .select("id, user_id, full_name, email, phone, date_of_birth, gender, address, avatar_url")
    .or(`user_id.eq.${userOrId},id.eq.${userOrId}`)
    .maybeSingle();
  return data ?? null;
}

async function fetchDoctorEnriched(service: any, doctorId: string | null) {
  if (!doctorId) return null;

  const { data: doctor } = await service
    .from("doctors")
    .select("id, user_id, specialty, practice_id, license_number, verified, created_at")
    .eq("id", doctorId)
    .maybeSingle();

  if (!doctor) return null;

  const profile = await fetchProfileByUserOrId(service, doctor.user_id);
  let practice: any = null;

  if (doctor.practice_id) {
    const { data: p } = await service
      .from("practices")
      .select("id, name, phone, email, address, city, country, logo_url, verified, created_at")
      .eq("id", doctor.practice_id)
      .maybeSingle();
    practice = p ?? null;
  }

  return { doctor, profile, practice };
}

async function fetchReferralEntity(service: any, type: string | null, entityId: string | null, userId: string | null) {
  // Prefer entityId; fallback to userId (profiles) when present.
  const t = (type || "").toLowerCase();

  try {
    if (t === "doctor") {
      if (entityId) return await fetchDoctorEnriched(service, entityId);
      if (userId) {
        // Try to locate doctor by user_id
        const { data: doc } = await service
          .from("doctors")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (doc?.id) return await fetchDoctorEnriched(service, doc.id);
      }
    }

    if (t === "clinic") {
      if (!entityId) return null;
      const { data } = await service
        .from("practices")
        .select("id, name, phone, email, address, city, country, logo_url, verified, created_at")
        .eq("id", entityId)
        .maybeSingle();
      return data ? { practice: data } : null;
    }

    if (t === "lab") {
      if (!entityId) return null;
      const { data } = await service
        .from("lab_centers")
        .select("id, name, phone, email, address, city, country, logo_url, verified, created_at")
        .eq("id", entityId)
        .maybeSingle();
      return data ? { lab_center: data } : null;
    }

    if (t === "imaging_center") {
      if (!entityId) return null;
      const { data } = await service
        .from("imaging_centers")
        .select("id, name, phone, email, address, city, country, logo_url, verified, created_at")
        .eq("id", entityId)
        .maybeSingle();
      return data ? { imaging_center: data } : null;
    }

    if (t === "pharmacy") {
      if (!entityId) return null;
      const { data } = await service
        .from("pharmacies")
        .select("id, name, phone, email, address, city, country, logo_url, verified, created_at")
        .eq("id", entityId)
        .maybeSingle();
      return data ? { pharmacy: data } : null;
    }

    // Fallback: profiles
    if (userId) {
      const profile = await fetchProfileByUserOrId(service, userId);
      return profile ? { profile } : null;
    }

    return null;
  } catch {
    // Gracefully handle missing tables in some deployments
    if (userId) {
      const profile = await fetchProfileByUserOrId(service, userId);
      return profile ? { profile } : null;
    }
    return null;
  }
}

serve(async (req) => {
  const { response, context, validatedBody } = await secureHandler(req, "document-verify", {
    requireAuth: true,
    requireRoles: ["super_admin"],
    allowedMethods: ["POST", "OPTIONS"],
    rateLimit: "standard",
    validationSchema: schema,
    logRequests: true,
  });

  if (response) return response;
  if (!context || !validatedBody) return errorResponse("Internal server error", 500);

  const { verification_code } = validatedBody as ReqBody;
  const { code, variants } = normalizeCode(verification_code);

  if (!code) return errorResponse("verification_code is required", 400);
  if (variants.length === 0) return errorResponse("verification_code is invalid", 400);

  const service = context.serviceClient;

  // Prefix hints (best-effort)
  const prefixUpper = code.toUpperCase();
  const hintedTypes: Array<"treatment_plan" | "referral"> = [];
  if (prefixUpper.startsWith("TP-")) hintedTypes.push("treatment_plan");
  if (prefixUpper.startsWith("RF-")) hintedTypes.push("referral");
  if (hintedTypes.length === 0) hintedTypes.push("treatment_plan", "referral");

  // 1) Try LIVE records first
  for (const entityType of hintedTypes) {
    if (entityType === "treatment_plan") {
      const { data: tp } = await service
        .from("treatment_plans")
        .select("id, verification_code, doctor_id, patient_id, title, status, total_cost, notes, created_at, updated_at, published_at")
        .in("verification_code", variants)
        .maybeSingle();

      if (tp?.id) {
        const { data: snapshotData } = await service.rpc("docito_snapshot_treatment_plan", {
          plan_id: tp.id,
        });

        const patientProfile = tp.patient_id ? await fetchProfileByUserOrId(service, tp.patient_id) : null;
        const doctorEnriched = tp.doctor_id ? await fetchDoctorEnriched(service, tp.doctor_id) : null;

        const payload: VerifyResponse = {
          source: "live",
          entity_type: "treatment_plan",
          entity_id: tp.id,
          verification_code: (tp as any).verification_code || code,
          snapshot: snapshotData ?? { treatment_plan: tp },
          enriched: {
            patient_profile: patientProfile,
            doctor: doctorEnriched,
          },
        };

        return jsonResponse(payload, 200);
      }
    }

    if (entityType === "referral") {
      const { data: referral } = await service
        .from("referrals")
        .select("*")
        .in("verification_code", variants)
        .maybeSingle();

      if (referral?.id) {
        const { data: snapshotData } = await service.rpc("docito_snapshot_referral", {
          ref_id: referral.id,
        });

        const patientId =
          (referral as any).patient_id ||
          (referral as any).patient_user_id ||
          (referral as any).patientId ||
          null;

        const patientProfile = patientId ? await fetchProfileByUserOrId(service, patientId) : null;

        const referrer = await fetchReferralEntity(
          service,
          (referral as any).referrer_type || null,
          (referral as any).referrer_entity_id || null,
          (referral as any).referrer_user_id || null
        );

        const receiver = await fetchReferralEntity(
          service,
          (referral as any).receiver_type || null,
          (referral as any).receiver_entity_id || null,
          (referral as any).receiver_user_id || null
        );

        const payload: VerifyResponse = {
          source: "live",
          entity_type: "referral",
          entity_id: referral.id,
          verification_code: (referral as any).verification_code || code,
          snapshot: snapshotData ?? { referral },
          enriched: {
            patient_profile: patientProfile,
            referrer,
            receiver,
          },
        };

        return jsonResponse(payload, 200);
      }
    }
  }

  // 2) Fall back to ARCHIVE
  const { data: archived } = await service
    .from("docito_document_archives")
    .select("entity_type, entity_id, verification_code, snapshot, deleted_at")
    .in("verification_code", variants)
    .maybeSingle();

  if (archived?.verification_code) {
    const payload: VerifyResponse = {
      source: "archive",
      entity_type: archived.entity_type,
      entity_id: archived.entity_id,
      verification_code: archived.verification_code,
      deleted_at: archived.deleted_at,
      snapshot: archived.snapshot,
    };
    return jsonResponse(payload, 200);
  }

  return errorResponse("Verification code not found", 404);
});
