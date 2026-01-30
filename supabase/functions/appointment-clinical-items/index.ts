// File: supabase/functions/appointment-clinical-items/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Json = Record<string, unknown>;

type ClinicalItem = {
  id: string;
  appointment_id: string;
  item_type: string;
  title: string | null;
  description: string | null;
  status: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string | null;
};

type ReqBody =
  | { action: "list"; appointmentId: string }
  | { action: "create"; appointmentId: string; item: Partial<ClinicalItem> & { item_type: string } }
  | { action: "update"; appointmentId: string; itemId: string; patch: Partial<ClinicalItem> }
  | { action: "delete"; appointmentId: string; itemId: string }
  | { action: "templates_list"; appointmentId: string }
  | {
    action: "apply_template";
    appointmentId: string;
    templateType: "procedure" | "treatment_plan" | "clinical_template";
    templateId: string;
  };

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseAuthToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function isMissingSchemaError(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "").toLowerCase();
  return (
    msg.includes("could not find the table") ||
    msg.includes("schema cache") ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    (msg.includes("relation") && msg.includes("does not exist"))
  );
}

async function trySelect<T>(
  fn: () => Promise<{ data: T | null; error: any }>,
): Promise<{ ok: true; data: T } | { ok: false; error: any }> {
  try {
    const { data, error } = await fn();
    if (error) return { ok: false, error };
    return { ok: true, data: (data ?? (Array.isArray(data) ? [] : ({} as T))) as T };
  } catch (e: any) {
    return { ok: false, error: e };
  }
}

async function resolveDoctorUserIdForAppointment(
  supabaseAdmin: ReturnType<typeof createClient>,
  appointmentId: string,
): Promise<{ ok: true; doctorUserId: string; doctorIdRaw: string } | { ok: false; error: string }> {
  // appointment.doctor_id may be doctors.id OR auth.user.id depending on schema.
  const apptRes = await supabaseAdmin
    .from("appointments")
    .select("id, doctor_id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (apptRes.error) {
    if (isMissingSchemaError(apptRes.error)) return { ok: false, error: "schema_not_ready:appointments" };
    return { ok: false, error: apptRes.error.message || "Failed to load appointment" };
  }
  if (!apptRes.data?.id || !apptRes.data?.doctor_id) return { ok: false, error: "appointment_not_found" };

  const doctorIdRaw = String((apptRes.data as any).doctor_id);

  // Try doctors table mapping: doctors.id -> doctors.user_id
  const docRes = await supabaseAdmin
    .from("doctors")
    .select("id, user_id")
    .eq("id", doctorIdRaw)
    .maybeSingle();

  if (!docRes.error && docRes.data?.user_id) {
    return { ok: true, doctorUserId: String((docRes.data as any).user_id), doctorIdRaw };
  }

  // Fallback: appointment.doctor_id already is auth.user.id
  return { ok: true, doctorUserId: doctorIdRaw, doctorIdRaw };
}

async function listClinicalItems(
  supabaseAdmin: ReturnType<typeof createClient>,
  appointmentId: string,
): Promise<ClinicalItem[]> {
  const res = await supabaseAdmin
    .from("appointment_clinical_items")
    .select("id, appointment_id, item_type, title, description, status, metadata, created_at, updated_at")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: true });

  if (res.error) {
    if (isMissingSchemaError(res.error)) return [];
    throw res.error;
  }
  return (res.data || []) as any;
}

async function createClinicalItem(
  supabaseAdmin: ReturnType<typeof createClient>,
  appointmentId: string,
  doctorUserId: string,
  item: Partial<ClinicalItem> & { item_type: string },
): Promise<ClinicalItem> {
  const payload: Record<string, unknown> = {
    appointment_id: appointmentId,
    item_type: item.item_type,
    title: item.title ?? null,
    description: item.description ?? null,
    status: item.status ?? "active",
    metadata: item.metadata ?? {},
    // store actor for audit if column exists; ignored if not
    created_by: doctorUserId,
    updated_by: doctorUserId,
  };

  const res = await supabaseAdmin
    .from("appointment_clinical_items")
    .insert(payload)
    .select("id, appointment_id, item_type, title, description, status, metadata, created_at, updated_at")
    .single();

  if (res.error) throw res.error;
  return res.data as any;
}

async function updateClinicalItem(
  supabaseAdmin: ReturnType<typeof createClient>,
  appointmentId: string,
  itemId: string,
  doctorUserId: string,
  patch: Partial<ClinicalItem>,
): Promise<ClinicalItem> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title ?? null;
  if (patch.description !== undefined) payload.description = patch.description ?? null;
  if (patch.status !== undefined) payload.status = patch.status ?? null;
  if (patch.metadata !== undefined) payload.metadata = patch.metadata ?? {};
  payload.updated_by = doctorUserId;

  const res = await supabaseAdmin
    .from("appointment_clinical_items")
    .update(payload)
    .eq("id", itemId)
    .eq("appointment_id", appointmentId)
    .select("id, appointment_id, item_type, title, description, status, metadata, created_at, updated_at")
    .single();

  if (res.error) throw res.error;
  return res.data as any;
}

async function deleteClinicalItem(
  supabaseAdmin: ReturnType<typeof createClient>,
  appointmentId: string,
  itemId: string,
) {
  const res = await supabaseAdmin
    .from("appointment_clinical_items")
    .delete()
    .eq("id", itemId)
    .eq("appointment_id", appointmentId);

  if (res.error) throw res.error;
  return true;
}

async function templatesList(
  supabaseAdmin: ReturnType<typeof createClient>,
  doctorIdRaw: string,
  doctorUserId: string,
) {
  // Doctor custom procedures
  const proceduresAttempt1 = await trySelect<any[]>(() =>
    supabaseAdmin
      .from("doctor_procedures")
      .select("id, doctor_id, name, description, duration_minutes, price_cents, metadata, created_at, updated_at")
      .eq("doctor_id", doctorIdRaw)
      .order("name", { ascending: true })
  );

  const proceduresAttempt2 = proceduresAttempt1.ok
    ? proceduresAttempt1
    : await trySelect<any[]>(() =>
      supabaseAdmin
        .from("doctor_procedures")
        .select("id, doctor_user_id, name, description, duration_minutes, price_cents, metadata, created_at, updated_at")
        .eq("doctor_user_id", doctorUserId)
        .order("name", { ascending: true })
    );

  const procedures = proceduresAttempt2.ok ? (proceduresAttempt2.data || []) : [];

  // Doctor custom treatment plan templates
  const plansAttempt1 = await trySelect<any[]>(() =>
    supabaseAdmin
      .from("treatment_plan_templates")
      .select("id, doctor_id, title, description, plan_json, metadata, created_at, updated_at")
      .eq("doctor_id", doctorIdRaw)
      .order("updated_at", { ascending: false })
  );

  const plansAttempt2 = plansAttempt1.ok
    ? plansAttempt1
    : await trySelect<any[]>(() =>
      supabaseAdmin
        .from("doctor_treatment_plan_templates")
        .select("id, doctor_id, title, description, plan_json, metadata, created_at, updated_at")
        .eq("doctor_id", doctorIdRaw)
        .order("updated_at", { ascending: false })
    );

  const plansAttempt3 = plansAttempt2.ok
    ? plansAttempt2
    : await trySelect<any[]>(() =>
      supabaseAdmin
        .from("treatment_plan_templates")
        .select("id, doctor_user_id, title, description, plan_json, metadata, created_at, updated_at")
        .eq("doctor_user_id", doctorUserId)
        .order("updated_at", { ascending: false })
    );

  const treatmentPlans = plansAttempt3.ok ? (plansAttempt3.data || []) : [];

  // Optional: appointment clinical templates (multi-item presets)
  const clinicalTemplatesAttempt1 = await trySelect<any[]>(() =>
    supabaseAdmin
      .from("appointment_clinical_templates")
      .select("id, doctor_id, name, description, items_json, metadata, created_at, updated_at")
      .eq("doctor_id", doctorIdRaw)
      .order("updated_at", { ascending: false })
  );

  const clinicalTemplatesAttempt2 = clinicalTemplatesAttempt1.ok
    ? clinicalTemplatesAttempt1
    : await trySelect<any[]>(() =>
      supabaseAdmin
        .from("appointment_clinical_templates")
        .select("id, doctor_user_id, name, description, items_json, metadata, created_at, updated_at")
        .eq("doctor_user_id", doctorUserId)
        .order("updated_at", { ascending: false })
    );

  const clinicalTemplates = clinicalTemplatesAttempt2.ok ? (clinicalTemplatesAttempt2.data || []) : [];

  return {
    ok: true,
    procedures,
    treatmentPlans,
    clinicalTemplates,
  };
}

async function applyTemplate(
  supabaseAdmin: ReturnType<typeof createClient>,
  appointmentId: string,
  doctorIdRaw: string,
  doctorUserId: string,
  templateType: "procedure" | "treatment_plan" | "clinical_template",
  templateId: string,
) {
  if (templateType === "procedure") {
    const p1 = await supabaseAdmin
      .from("doctor_procedures")
      .select("id, doctor_id, name, description, duration_minutes, price_cents, metadata")
      .eq("id", templateId)
      .maybeSingle();

    if (p1.error && !isMissingSchemaError(p1.error)) throw p1.error;

    let proc = p1.data as any | null;

    if (!proc) {
      const p2 = await supabaseAdmin
        .from("doctor_procedures")
        .select("id, doctor_user_id, name, description, duration_minutes, price_cents, metadata")
        .eq("id", templateId)
        .maybeSingle();
      if (p2.error && !isMissingSchemaError(p2.error)) throw p2.error;
      proc = p2.data as any | null;
    }

    if (!proc) return { ok: false, error: "template_not_found" };

    // Ensure ownership
    const ownerOk =
      String(proc.doctor_id ?? "") === doctorIdRaw || String(proc.doctor_user_id ?? "") === doctorUserId;

    if (!ownerOk) return { ok: false, error: "forbidden" };

    const inserted = await createClinicalItem(supabaseAdmin, appointmentId, doctorUserId, {
      item_type: "procedure",
      title: String(proc.name || "Procedure"),
      description: proc.description ? String(proc.description) : null,
      status: "active",
      metadata: {
        ...(proc.metadata || {}),
        procedure_id: proc.id,
        duration_minutes: proc.duration_minutes ?? null,
        price_cents: proc.price_cents ?? null,
      },
    });

    return { ok: true, inserted: [inserted] };
  }

  if (templateType === "treatment_plan") {
    // Try common tables
    const t1 = await supabaseAdmin
      .from("treatment_plan_templates")
      .select("id, doctor_id, doctor_user_id, title, description, plan_json, metadata")
      .eq("id", templateId)
      .maybeSingle();

    if (t1.error && !isMissingSchemaError(t1.error)) throw t1.error;

    let tpl = t1.data as any | null;

    if (!tpl) {
      const t2 = await supabaseAdmin
        .from("doctor_treatment_plan_templates")
        .select("id, doctor_id, title, description, plan_json, metadata")
        .eq("id", templateId)
        .maybeSingle();
      if (t2.error && !isMissingSchemaError(t2.error)) throw t2.error;
      tpl = t2.data as any | null;
    }

    if (!tpl) return { ok: false, error: "template_not_found" };

    const ownerOk =
      String(tpl.doctor_id ?? "") === doctorIdRaw || String(tpl.doctor_user_id ?? "") === doctorUserId;

    if (!ownerOk) return { ok: false, error: "forbidden" };

    const inserted = await createClinicalItem(supabaseAdmin, appointmentId, doctorUserId, {
      item_type: "treatment_plan",
      title: String(tpl.title || "Treatment Plan"),
      description: tpl.description ? String(tpl.description) : null,
      status: "active",
      metadata: {
        ...(tpl.metadata || {}),
        treatment_plan_template_id: tpl.id,
        plan_json: tpl.plan_json ?? null,
      },
    });

    return { ok: true, inserted: [inserted] };
  }

  // clinical_template: insert multiple items from template.items_json
  const c1 = await supabaseAdmin
    .from("appointment_clinical_templates")
    .select("id, doctor_id, doctor_user_id, name, description, items_json, metadata")
    .eq("id", templateId)
    .maybeSingle();

  if (c1.error && !isMissingSchemaError(c1.error)) throw c1.error;

  if (!c1.data) return { ok: false, error: "template_not_found" };

  const ownerOk =
    String((c1.data as any).doctor_id ?? "") === doctorIdRaw ||
    String((c1.data as any).doctor_user_id ?? "") === doctorUserId;

  if (!ownerOk) return { ok: false, error: "forbidden" };

  const itemsJson = (c1.data as any).items_json;
  const arr = Array.isArray(itemsJson) ? itemsJson : [];

  const inserted: ClinicalItem[] = [];
  for (const raw of arr) {
    const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const item_type = String(r.item_type || r.type || "note");
    const title = r.title !== undefined ? String(r.title) : null;
    const description = r.description !== undefined ? String(r.description) : null;
    const status = r.status !== undefined ? String(r.status) : "active";
    const metadata = (r.metadata && typeof r.metadata === "object")
      ? (r.metadata as Json)
      : {};

    const created = await createClinicalItem(supabaseAdmin, appointmentId, doctorUserId, {
      item_type,
      title,
      description,
      status,
      metadata: {
        ...metadata,
        source_clinical_template_id: (c1.data as any).id,
      },
    });
    inserted.push(created);
  }

  // If template had no items, create a placeholder note
  if (inserted.length === 0) {
    const created = await createClinicalItem(supabaseAdmin, appointmentId, doctorUserId, {
      item_type: "note",
      title: String((c1.data as any).name || "Clinical Template"),
      description: (c1.data as any).description ? String((c1.data as any).description) : null,
      status: "active",
      metadata: {
        ...(((c1.data as any).metadata || {}) as Json),
        source_clinical_template_id: (c1.data as any).id,
      },
    });
    inserted.push(created);
  }

  return { ok: true, inserted };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(500, { ok: false, error: "missing_env" });
    }

    const token = parseAuthToken(req);
    if (!token) return jsonResponse(401, { ok: false, error: "missing_auth" });

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse(401, { ok: false, error: "invalid_auth" });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body = (await req.json().catch(() => null)) as ReqBody | null;
    if (!body || !(body as any).action) return jsonResponse(400, { ok: false, error: "invalid_body" });

    const appointmentId = String((body as any).appointmentId || "").trim();
    if (!appointmentId) return jsonResponse(400, { ok: false, error: "missing_appointment_id" });

    const resolved = await resolveDoctorUserIdForAppointment(supabaseAdmin, appointmentId);
    if (!resolved.ok) return jsonResponse(400, { ok: false, error: resolved.error });

    const { doctorUserId, doctorIdRaw } = resolved;

    // Only the appointment's doctor may manage clinical items/templates.
    if (userData.user.id !== doctorUserId) return jsonResponse(403, { ok: false, error: "forbidden" });

    const action = (body as any).action as ReqBody["action"];

    if (action === "list") {
      const items = await listClinicalItems(supabaseAdmin, appointmentId);
      return jsonResponse(200, { ok: true, items });
    }

    if (action === "create") {
      const item = (body as any).item as any;
      if (!item?.item_type) return jsonResponse(400, { ok: false, error: "missing_item_type" });
      const created = await createClinicalItem(supabaseAdmin, appointmentId, doctorUserId, item);
      const items = await listClinicalItems(supabaseAdmin, appointmentId);
      return jsonResponse(200, { ok: true, created, items });
    }

    if (action === "update") {
      const itemId = String((body as any).itemId || "").trim();
      if (!itemId) return jsonResponse(400, { ok: false, error: "missing_item_id" });

      const patch = ((body as any).patch || {}) as any;
      const updated = await updateClinicalItem(supabaseAdmin, appointmentId, itemId, doctorUserId, patch);
      const items = await listClinicalItems(supabaseAdmin, appointmentId);
      return jsonResponse(200, { ok: true, updated, items });
    }

    if (action === "delete") {
      const itemId = String((body as any).itemId || "").trim();
      if (!itemId) return jsonResponse(400, { ok: false, error: "missing_item_id" });

      await deleteClinicalItem(supabaseAdmin, appointmentId, itemId);
      const items = await listClinicalItems(supabaseAdmin, appointmentId);
      return jsonResponse(200, { ok: true, deleted: true, items });
    }

    if (action === "templates_list") {
      const payload = await templatesList(supabaseAdmin, doctorIdRaw, doctorUserId);
      return jsonResponse(200, payload);
    }

    if (action === "apply_template") {
      const templateType = (body as any).templateType as any;
      const templateId = String((body as any).templateId || "").trim();
      if (!templateType || !templateId) {
        return jsonResponse(400, { ok: false, error: "missing_template" });
      }
      if (!["procedure", "treatment_plan", "clinical_template"].includes(String(templateType))) {
        return jsonResponse(400, { ok: false, error: "invalid_template_type" });
      }

      const result = await applyTemplate(
        supabaseAdmin,
        appointmentId,
        doctorIdRaw,
        doctorUserId,
        templateType,
        templateId,
      );

      if (!(result as any).ok) return jsonResponse(400, result);

      const items = await listClinicalItems(supabaseAdmin, appointmentId);
      return jsonResponse(200, { ...result, items });
    }

    return jsonResponse(400, { ok: false, error: "unsupported_action" });
  } catch (e: any) {
    const msg = String(e?.message || e || "");
    if (msg.toLowerCase().includes("unauthorized")) {
      return jsonResponse(401, { ok: false, error: "unauthorized" });
    }
    return jsonResponse(500, { ok: false, error: "server_error", detail: msg });
  }
});
