// File: supabase/functions/document-verify/index.ts
/**
 * Document Verification Lookup — Docito
 *
 * Verifies any Docito document by its verification code.
 * Supports: treatment_plan (TP-), referral (RF-), prescription (RX-), patient token (PT-)
 *
 * Access:
 *  super_admin      — any document
 *  doctor           — treatment plans / prescriptions / referrals they issued; patient tokens they generated
 *  pharmacy staff   — prescriptions + referrals directed at their pharmacy
 *  lab staff        — referrals directed at their lab
 *  imaging staff    — referrals directed at their imaging center
 *
 * Falls back to docito_document_archives for deleted records.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  secureHandler,
  errorResponse,
  jsonResponse,
} from "../_shared/security-middleware.ts";
import { sanitizeString } from "../_shared/input-validator.ts";

type ReqBody = { verification_code: string };

const schema = {
  verification_code: { type: "string" as const, required: true, minLength: 4, maxLength: 128, sanitize: true, trim: true },
};

function normalize(raw: string) {
  const code = sanitizeString(raw || "", 128).trim();
  return { code, variants: [...new Set([code, code.toUpperCase(), code.toLowerCase()])].filter(Boolean) };
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.trim());
}

async function profile(svc: any, id: string) {
  if (!id) return null;
  const { data } = await svc.from("profiles")
    .select("user_id,full_name,email,phone,date_of_birth,gender,address,avatar_url")
    .or(`user_id.eq.${id},id.eq.${id}`).maybeSingle();
  return data ?? null;
}

async function doctorEnriched(svc: any, doctorId: string | null) {
  if (!doctorId) return null;
  const { data: doc } = await svc.from("doctors")
    .select("id,user_id,specialty,practice_id,license_number,verified").eq("id", doctorId).maybeSingle();
  if (!doc) return null;
  const p = await profile(svc, doc.user_id);
  let practice = null;
  if (doc.practice_id) {
    const { data: pr } = await svc.from("practices").select("id,name,phone,email,address,city,country,verified").eq("id", doc.practice_id).maybeSingle();
    practice = pr ?? null;
  }
  return { doctor: doc, profile: p, practice };
}

async function entityInfo(svc: any, type: string | null, id: string | null) {
  if (!id || !type) return null;
  const t = type.toLowerCase();
  try {
    if (t === "doctor") return await doctorEnriched(svc, id);
    if (t === "clinic" || t === "practice") { const { data } = await svc.from("practices").select("id,name,phone,email,address,city,country,verified").eq("id", id).maybeSingle(); return data ? { practice: data } : null; }
    if (t === "lab") { const { data } = await svc.from("lab_centers").select("id,name,phone,email,address,city,country").eq("id", id).maybeSingle(); return data ? { lab_center: data } : null; }
    if (t === "imaging_center" || t === "imaging") { const { data } = await svc.from("imaging_centers").select("id,name,phone,email,address,city,country").eq("id", id).maybeSingle(); return data ? { imaging_center: data } : null; }
    if (t === "pharmacy") { const { data } = await svc.from("pharmacies").select("id,name,phone,email,address,city,country").eq("id", id).maybeSingle(); return data ? { pharmacy: data } : null; }
  } catch { /* missing table */ }
  return null;
}

async function callerCtx(svc: any, userId: string, roles: string[]) {
  const isSA = roles.includes("super_admin");
  const isDoc = roles.includes("doctor");
  let doctorId: string | null = null;
  let phIds: string[] = [], labIds: string[] = [], imgIds: string[] = [];

  if (isDoc) {
    const { data } = await svc.from("doctors").select("id").eq("user_id", userId).maybeSingle();
    doctorId = data?.id ?? null;
  }

  // Pharmacy — admin or staff
  if (roles.includes("pharmacy_admin")) {
    const { data } = await svc.from("pharmacies").select("id").eq("admin_id", userId);
    phIds = (data || []).map((r: any) => r.id);
  }
  const { data: pS } = await svc.from("pharmacy_staff").select("pharmacy_id").eq("user_id", userId).eq("status", "active");
  phIds = [...new Set([...phIds, ...(pS || []).map((r: any) => r.pharmacy_id)])];

  // Lab — admin or staff
  if (roles.includes("lab_admin")) {
    const { data } = await svc.from("lab_centers").select("id").eq("admin_id", userId);
    labIds = (data || []).map((r: any) => r.id);
  }
  const { data: lS } = await svc.from("lab_staff").select("lab_center_id").eq("user_id", userId).eq("status", "active");
  labIds = [...new Set([...labIds, ...(lS || []).map((r: any) => r.lab_center_id)])];

  // Imaging — admin or staff
  if (roles.includes("imaging_admin")) {
    const { data } = await svc.from("imaging_centers").select("id").eq("admin_id", userId);
    imgIds = (data || []).map((r: any) => r.id);
  }
  const { data: iS } = await svc.from("imaging_staff").select("imaging_center_id").eq("user_id", userId).in("status", ["active", "approved"]);
  imgIds = [...new Set([...imgIds, ...(iS || []).map((r: any) => r.imaging_center_id)])];

  return { isSA, isDoc, doctorId, phIds, labIds, imgIds };
}

type Ctx = Awaited<ReturnType<typeof callerCtx>>;

function allowed(ctx: Ctx, type: string, rec: any): boolean {
  if (ctx.isSA) return true;
  const t = type.toLowerCase();

  if (t === "treatment_plan") return ctx.isDoc && !!ctx.doctorId && rec?.doctor_id === ctx.doctorId;

  if (t === "referral") {
    const r = rec?.referral ?? rec;
    if (ctx.isDoc && ctx.doctorId && (r?.referrer_entity_id === ctx.doctorId || r?.doctor_id === ctx.doctorId)) return true;
    if (ctx.phIds.includes(r?.receiver_entity_id)) return true;
    if (ctx.labIds.includes(r?.receiver_entity_id)) return true;
    if (ctx.imgIds.includes(r?.receiver_entity_id)) return true;
    return false;
  }

  if (t === "prescription") {
    if (ctx.isDoc && ctx.doctorId && rec?.doctor_id === ctx.doctorId) return true;
    if (ctx.phIds.length > 0) return true; // any pharmacy staff can verify prescriptions
    return false;
  }

  if (t === "patient") {
    return ctx.isDoc && !!ctx.doctorId && rec?.doctor_id === ctx.doctorId;
  }

  return false;
}

serve(async (req) => {
  const { response, context, validatedBody } = await secureHandler(req, "document-verify", {
    requireAuth: true,
    allowedMethods: ["POST", "OPTIONS"],
    rateLimit: "standard",
    validationSchema: schema,
    logRequests: false,
  });

  if (response) return response;
  if (!context || !validatedBody) return errorResponse("Internal server error", 500);

  const { userId, roles } = context;
  const svc = context.serviceClient;
  const { code, variants } = normalize((validatedBody as ReqBody).verification_code);
  if (!code) return errorResponse("verification_code required", 400);

  const ctx = await callerCtx(svc, userId, roles || []);
  if (!ctx.isSA && !ctx.isDoc && !ctx.phIds.length && !ctx.labIds.length && !ctx.imgIds.length) {
    return errorResponse("Access denied — insufficient role", 403);
  }

  const prefUpper = code.toUpperCase();
  const hint = prefUpper.startsWith("TP-") ? "treatment_plan"
    : prefUpper.startsWith("RF-") ? "referral"
    : prefUpper.startsWith("RX-") ? "prescription"
    : prefUpper.startsWith("PT-") ? "patient"
    : null;

  // ── Treatment Plans ──────────────────────────────────────────────────────
  if (!hint || hint === "treatment_plan") {
    const tpCols = "id,verification_code,doctor_id,patient_id,title,status,total_cost,notes,created_at,updated_at,published_at";

    let tp: any = null;
    const { data: tpByCode } = await svc.from("treatment_plans")
      .select(tpCols)
      .in("verification_code", variants)
      .maybeSingle();
    tp = tpByCode;

    // Backward compatibility: older PDFs may contain the treatment plan UUID itself
    if (!tp && isUuid(code)) {
      const { data: tpById } = await svc.from("treatment_plans")
        .select(tpCols)
        .eq("id", code)
        .maybeSingle();
      tp = tpById;
    }

    if (tp?.id) {
      if (!allowed(ctx, "treatment_plan", tp)) return errorResponse("Forbidden", 403);
      const { data: snap } = await svc.rpc("docito_snapshot_treatment_plan", { plan_id: tp.id });
      return jsonResponse({
        source: "live", entity_type: "treatment_plan", entity_id: tp.id,
        verification_code: (tp as any).verification_code || code,
        snapshot: snap ?? { treatment_plan: tp },
        enriched: {
          patient_profile: tp.patient_id ? await profile(svc, tp.patient_id) : null,
          doctor: tp.doctor_id ? await doctorEnriched(svc, tp.doctor_id) : null,
        },
      }, 200);
    }
  }

  // ── Referrals ────────────────────────────────────────────────────────────
  if (!hint || hint === "referral") {
    const { data: rf } = await svc.from("referrals").select("*").in("verification_code", variants).maybeSingle();
    if (rf?.id) {
      if (!allowed(ctx, "referral", rf)) return errorResponse("Forbidden", 403);
      const { data: snap } = await svc.rpc("docito_snapshot_referral", { ref_id: rf.id });
      const pid = (rf as any).patient_id || (rf as any).patient_user_id || null;
      return jsonResponse({
        source: "live", entity_type: "referral", entity_id: rf.id,
        verification_code: (rf as any).verification_code || code,
        snapshot: snap ?? { referral: rf },
        enriched: {
          patient_profile: pid ? await profile(svc, pid) : null,
          referrer: await entityInfo(svc, (rf as any).referrer_type, (rf as any).referrer_entity_id),
          receiver: await entityInfo(svc, (rf as any).receiver_type, (rf as any).receiver_entity_id),
        },
      }, 200);
    }
  }

  // ── Prescriptions ────────────────────────────────────────────────────────
  if (!hint || hint === "prescription") {
    const cols = "id,verification_code,prescription_number,patient_id,doctor_id,pharmacy_id,status,prescribed_at,expires_at,refills_remaining,refills_total,notes,diagnosis_code";
    let rx: any = null;
    const { data: rxByCode } = await svc.from("prescriptions").select(cols).in("verification_code", variants).maybeSingle();
    rx = rxByCode;
    if (!rx) { const { data: rxByNum } = await svc.from("prescriptions").select(cols).in("prescription_number", variants).maybeSingle(); rx = rxByNum; }
    if (rx?.id) {
      if (!allowed(ctx, "prescription", rx)) return errorResponse("Forbidden", 403);
      const { data: items } = await svc.from("prescription_items").select("medication_name,dosage,frequency,quantity,unit,instructions,substitutions_allowed").eq("prescription_id", rx.id);
      let pharmacy = null;
      if (rx.pharmacy_id) { const { data: ph } = await svc.from("pharmacies").select("id,name,phone,address").eq("id", rx.pharmacy_id).maybeSingle(); pharmacy = ph; }
      return jsonResponse({
        source: "live", entity_type: "prescription", entity_id: rx.id,
        verification_code: rx.verification_code || rx.prescription_number,
        snapshot: { prescription: rx, items: items || [] },
        enriched: {
          patient_profile: rx.patient_id ? await profile(svc, rx.patient_id) : null,
          doctor: rx.doctor_id ? await doctorEnriched(svc, rx.doctor_id) : null,
          pharmacy,
        },
      }, 200);
    }
  }

  // ── Patient PDF Tokens ───────────────────────────────────────────────────
  if (!hint || hint === "patient") {
    const { data: tok } = await svc.from("patient_pdf_tokens")
      .select("id,patient_id,doctor_id,token,generated_at,expires_at")
      .in("token", variants).maybeSingle();
    if (tok?.id) {
      if (!allowed(ctx, "patient", tok)) return errorResponse("Forbidden", 403);
      const expired = tok.expires_at && new Date(tok.expires_at) < new Date();
      return jsonResponse({
        source: expired ? "expired" : "live", entity_type: "patient", entity_id: tok.patient_id,
        verification_code: tok.token,
        snapshot: { token_id: tok.id, patient_id: tok.patient_id, generated_at: tok.generated_at, expires_at: tok.expires_at, expired },
        enriched: {
          patient_profile: await profile(svc, tok.patient_id),
          doctor: tok.doctor_id ? await doctorEnriched(svc, tok.doctor_id) : null,
        },
      }, 200);
    }
  }

  // ── Archive fallback ─────────────────────────────────────────────────────
  const { data: arc } = await svc.from("docito_document_archives")
    .select("entity_type,entity_id,verification_code,snapshot,deleted_at")
    .in("verification_code", variants).maybeSingle();
  if (arc?.verification_code) {
    const arcSnap = arc.snapshot as any;
    const arcRec = arcSnap?.[arc.entity_type] ?? arcSnap;
    if (!ctx.isSA && !allowed(ctx, arc.entity_type, arcRec)) return errorResponse("Forbidden", 403);
    return jsonResponse({
      source: "archive", entity_type: arc.entity_type, entity_id: arc.entity_id,
      verification_code: arc.verification_code, deleted_at: arc.deleted_at, snapshot: arc.snapshot,
    }, 200);
  }

  return errorResponse("Verification code not found", 404);
});
