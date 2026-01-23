import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Use esm.sh so the edge runtime doesn't require a local node_modules install
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = {
  centerId: string;
  referralId: string;
  findings?: string | null;
  impression?: string | null;
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

async function ensureCenterAccess(
  serviceClient: any,
  userId: string,
  centerId: string,
) {
  const { data: adminRow, error: adminErr } = await serviceClient
    .from("imaging_centers")
    .select("id")
    .eq("id", centerId)
    .eq("admin_id", userId)
    .maybeSingle();

  if (adminErr) throw adminErr;
  if ((adminRow as any)?.id) return true;

  const { data: staffRow, error: staffErr } = await serviceClient
    .from("imaging_staff")
    .select("id")
    .eq("imaging_center_id", centerId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (staffErr) throw staffErr;
  return Boolean((staffRow as any)?.id);
}

function safeObj(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function pickExamFields(attachments: unknown, fallbackReason: string | null) {
  const a = safeObj(attachments);
  const examName = String((a.exam_name as string) || fallbackReason || "Imaging Exam");
  const modality = String((a.modality as string) || "X-ray");
  const bodyPart = a.body_part ? String(a.body_part) : null;
  const contrast = typeof a.contrast === "boolean" ? a.contrast : null;
  return { examName, modality, bodyPart, contrast };
}

async function buildPdf(params: {
  orderNumber: string;
  patientName: string;
  patientPhone?: string | null;
  patientEmail?: string | null;
  examName: string;
  modality: string;
  bodyPart?: string | null;
  contrast?: boolean | null;
  clinicalNotes?: string | null;
  findings?: string | null;
  impression?: string | null;
  createdAtIso: string;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  let y = 841.89 - margin;

  const drawLine = () => {
    y -= 10;
    page.drawLine({
      start: { x: margin, y },
      end: { x: 595.28 - margin, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 18;
  };

  const drawTitle = (t: string) => {
    page.drawText(t, { x: margin, y, size: 18, font: fontBold });
    y -= 28;
  };

  const drawLabelValue = (label: string, value: string) => {
    page.drawText(label, { x: margin, y, size: 10, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
    page.drawText(value, { x: margin + 140, y, size: 10, font });
    y -= 16;
  };

  const drawParagraph = (label: string, value: string) => {
    page.drawText(label, { x: margin, y, size: 10, font: fontBold });
    y -= 14;

    const maxWidth = 595.28 - margin * 2;
    const words = value.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";

    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      const width = font.widthOfTextAtSize(candidate, 10);
      if (width > maxWidth) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);

    for (const l of lines) {
      if (y < margin + 40) break;
      page.drawText(l, { x: margin, y, size: 10, font });
      y -= 14;
    }
    y -= 6;
  };

  const createdAt = new Date(params.createdAtIso).toLocaleString();

  drawTitle("Imaging Report");
  drawLine();

  drawLabelValue("Order Number", params.orderNumber);
  drawLabelValue("Created At", createdAt);
  drawLine();

  drawLabelValue("Patient", params.patientName);
  if (params.patientPhone) drawLabelValue("Phone", params.patientPhone);
  if (params.patientEmail) drawLabelValue("Email", params.patientEmail);
  drawLine();

  drawLabelValue("Exam", params.examName);
  drawLabelValue("Modality", params.modality);
  if (params.bodyPart) drawLabelValue("Body Part", params.bodyPart);
  if (params.contrast !== null && params.contrast !== undefined) drawLabelValue("Contrast", params.contrast ? "Yes" : "No");
  drawLine();

  if (params.clinicalNotes) drawParagraph("Clinical Notes", params.clinicalNotes);
  if (params.findings) drawParagraph("Findings", params.findings);
  if (params.impression) drawParagraph("Impression", params.impression);

  if (!params.clinicalNotes && !params.findings && !params.impression) {
    drawParagraph("Notes", "No additional notes provided.");
  }

  return await pdf.save();
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
  const referralId = trimOrNull(body?.referralId);
  if (!centerId) return json({ ok: false, error: "Missing centerId" }, 400);
  if (!referralId) return json({ ok: false, error: "Missing referralId" }, 400);

  const findings = trimOrNull(body?.findings);
  const impression = trimOrNull(body?.impression);

  const service = createClient(env.url, env.service);

  try {
    const allowed = await ensureCenterAccess(service, userRes.user.id, centerId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    const { data: stateRow, error: stErr } = await service
      .from("imaging_order_state")
      .select("referral_id, imaging_center_id, workflow_status")
      .eq("referral_id", referralId)
      .maybeSingle();

    if (stErr) throw stErr;
    if (!stateRow?.referral_id) return json({ ok: false, error: "Order state not found" }, 404);
    if (stateRow.imaging_center_id !== centerId) return json({ ok: false, error: "Referral does not belong to this center" }, 403);

    const { data: referral, error: rErr } = await service
      .from("referrals")
      .select(
        "id, referral_number, reason, clinical_notes, attachments, created_at, result_attachments, patient_id, patient_name, patient_phone, patient_email",
      )
      .eq("id", referralId)
      .maybeSingle();

    if (rErr) throw rErr;
    if (!referral?.id) return json({ ok: false, error: "Referral not found" }, 404);

    let patientName = (referral.patient_name as string | null) || "Patient";
    if ((!patientName || patientName === "Patient") && referral.patient_id) {
      const { data: prof, error: pErr } = await service
        .from("profiles")
        .select("full_name")
        .eq("user_id", referral.patient_id)
        .maybeSingle();
      if (!pErr && prof) {
        patientName = (prof.full_name as string | null) || patientName;
      }
    }

    const { examName, modality, bodyPart, contrast } = pickExamFields(referral.attachments, referral.reason);

    const pdfBytes = await buildPdf({
      orderNumber: (referral.referral_number as string | null) || `IMG-${referral.id.slice(0, 8).toUpperCase()}`,
      patientName,
      patientPhone: (referral.patient_phone as string | null) || null,
      patientEmail: (referral.patient_email as string | null) || null,
      examName,
      modality,
      bodyPart,
      contrast,
      clinicalNotes: (referral.clinical_notes as string | null) || null,
      findings,
      impression,
      createdAtIso: referral.created_at as string,
    });

    const nowIso = new Date().toISOString();
    const path = `${centerId}/${referralId}/report-${Date.now()}.pdf`;

    const { error: upErr } = await service.storage.from("imaging-reports").upload(path, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (upErr) throw upErr;

    const { data: signed, error: signErr } = await service.storage
      .from("imaging-reports")
      .createSignedUrl(path, 60 * 60 * 24 * 30);

    if (signErr) throw signErr;

    const existing = referral.result_attachments ?? {};
    const existingObj = Array.isArray(existing) ? {} : safeObj(existing);
    const merged = {
      ...existingObj,
      findings: findings ?? (existingObj.findings as string | undefined) ?? null,
      impression: impression ?? (existingObj.impression as string | undefined) ?? null,
      report: {
        path,
        generated_at: nowIso,
        signed_url: signed?.signedUrl ?? null,
      },
    };

    const { error: updErr } = await service
      .from("referrals")
      .update({
        result_attachments: merged,
        status: "completed",
        completed_at: nowIso,
      })
      .eq("id", referralId);

    if (updErr) throw updErr;

    const { error: stUpdErr } = await service
      .from("imaging_order_state")
      .update({
        workflow_status: "completed",
        updated_by: userRes.user.id,
        updated_at: nowIso,
      })
      .eq("referral_id", referralId);

    if (stUpdErr) throw stUpdErr;

    return json({
      ok: true,
      reportPath: path,
      signedUrl: signed?.signedUrl ?? null,
      generatedAt: nowIso,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg }, 500);
  }
});
