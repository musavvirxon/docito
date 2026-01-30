// Path: supabase/functions/appointment-clinical-items/index.ts
// FILE: supabase/functions/appointment-clinical-items/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ItemType = "procedure" | "medication" | "treatment_plan";

type ListReq = { action: "list"; appointment_id: string };
type CatalogListReq = {
  action: "catalog_list";
  appointment_id: string;
  include_inactive?: boolean | null;
  limit?: number | null;
};
type CreateReq = {
  action: "create";
  appointment_id: string;
  type: ItemType;
  name: string;
  description?: string | null;
  quantity?: number | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  cost?: number | null;
  template_id?: string | null;
  save_as_template?: boolean;
  template_name?: string | null;
  template_description?: string | null;
  template_default_cost?: number | null;
};
type UpdateReq = {
  action: "update";
  item_id: string;
  appointment_id: string;
  type?: ItemType;
  name?: string;
  description?: string | null;
  quantity?: number | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  cost?: number | null;
  template_id?: string | null;
};
type DeleteReq = { action: "delete"; item_id: string; appointment_id: string };

type TemplatesListReq = { action: "templates_list"; type?: ItemType | null; include_inactive?: boolean | null };
type TemplatesCreateReq = {
  action: "templates_create";
  type: ItemType;
  name: string;
  description?: string | null;
  default_cost?: number | null;
  is_active?: boolean | null;
};
type TemplatesUpdateReq = {
  action: "templates_update";
  template_id: string;
  type?: ItemType;
  name?: string;
  description?: string | null;
  default_cost?: number | null;
  is_active?: boolean | null;
};
type TemplatesDeleteReq = { action: "templates_delete"; template_id: string };

type ApplyTemplateReq = {
  action: "apply_template";
  appointment_id: string;
  template_id: string;
  overrides?: Partial<Pick<CreateReq, "name" | "description" | "quantity" | "dosage" | "frequency" | "duration" | "cost">> | null;
};

type ReqBody =
  | ListReq
  | CatalogListReq
  | CreateReq
  | UpdateReq
  | DeleteReq
  | TemplatesListReq
  | TemplatesCreateReq
  | TemplatesUpdateReq
  | TemplatesDeleteReq
  | ApplyTemplateReq;

type Resp =
  | {
      ok: true;
      items?: unknown[];
      templates?: unknown[];
      item?: unknown;
      template?: unknown;
      catalog?: { procedures: unknown[]; treatment_plans: unknown[] };
    }
  | { ok: false; error: string; code?: string };

function json(data: Resp, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function requireEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function isBearer(h: string | null) {
  return Boolean(h && h.toLowerCase().startsWith("bearer "));
}

function asString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function isMissingColumnError(err: any, columnName: string) {
  const msg = String(err?.message || "").toLowerCase();
  const col = columnName.toLowerCase();
  return msg.includes("schema cache") && msg.includes(col);
}

function pickDefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

async function getUserFromAuth(supabaseUrl: string, anonKey: string, authHeader: string) {
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) throw new Error("Unauthorized");
  return data.user;
}

async function getAppointment(service: any, appointmentId: string) {
  const { data, error } = await service.from("appointments").select("*").eq("id", appointmentId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as any;
}

async function getDoctor(service: any, doctorId: string) {
  const { data, error } = await service.from("doctors").select("id,user_id").eq("id", doctorId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as any;
}

function normalizeItem(row: any) {
  const details = row?.details && typeof row.details === "object" ? row.details : {};
  const type = (row?.item_type || row?.type) as ItemType;
  const name = (row?.title || row?.name) as string;

  const description = row?.description ?? details?.description ?? details?.notes ?? null;
  const quantity = row?.quantity ?? details?.quantity ?? null;
  const dosage = row?.dosage ?? details?.dosage ?? null;
  const frequency = row?.frequency ?? details?.frequency ?? null;
  const duration = row?.duration ?? details?.duration ?? null;
  const cost = row?.cost ?? details?.cost ?? details?.estimated_cost ?? null;

  return {
    id: row?.id,
    appointment_id: row?.appointment_id,
    doctor_id: row?.doctor_id,
    patient_id: row?.patient_id ?? null,
    doctor_patient_id: row?.doctor_patient_id ?? null,
    template_id: row?.template_id ?? null,
    type,
    name,
    description,
    quantity,
    dosage,
    frequency,
    duration,
    cost,
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

function normalizeTemplate(row: any) {
  return {
    id: row?.id,
    doctor_id: row?.doctor_id,
    type: row?.type,
    name: row?.name,
    description: row?.description ?? null,
    default_cost: row?.default_cost ?? null,
    is_active: row?.is_active ?? true,
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

function normalizeProcedure(row: any) {
  const active = row?.active ?? row?.is_active ?? true;
  const cost = row?.price ?? row?.default_cost ?? null;
  const duration =
    row?.estimated_duration_minutes ?? row?.duration_minutes ?? row?.estimated_duration ?? row?.duration ?? null;

  return {
    id: row?.id,
    name: row?.name,
    category: row?.category ?? null,
    type: row?.type ?? null,
    notes: row?.notes ?? null,
    cost,
    duration_minutes: duration,
    is_bookable: row?.is_bookable ?? null,
    is_consultation: row?.is_consultation ?? null,
    active: Boolean(active),
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

function normalizeTreatmentPlan(row: any) {
  return {
    id: row?.id,
    title: row?.title,
    status: row?.status ?? null,
    total_cost: row?.total_cost ?? null,
    notes: row?.notes ?? null,
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
    published_at: row?.published_at ?? null,
  };
}

async function resolveContext(service: any, userId: string, appointmentId: string) {
  const appt = await getAppointment(service, appointmentId);
  if (!appt) return { ok: false as const, code: "NOT_FOUND", error: "Appointment not found" };

  const doctor = await getDoctor(service, appt.doctor_id);
  if (!doctor) return { ok: false as const, code: "NOT_FOUND", error: "Doctor not found for appointment" };

  const isDoctor = asString(doctor.user_id) === userId;
  const isPatient = appt.patient_id && asString(appt.patient_id) === userId;

  return {
    ok: true as const,
    appt,
    doctor,
    isDoctor,
    isPatient,
  };
}

async function insertItemLegacy(service: any, appt: any, payload: any) {
  const details: Record<string, unknown> = {
    description: payload.description ?? null,
    quantity: payload.quantity ?? null,
    dosage: payload.dosage ?? null,
    frequency: payload.frequency ?? null,
    duration: payload.duration ?? null,
    cost: payload.cost ?? null,
  };

  const base: Record<string, unknown> = {
    appointment_id: appt.id,
    doctor_id: appt.doctor_id,
    patient_id: appt.patient_id ?? null,
    doctor_patient_id: appt.doctor_patient_id ?? null,
    item_type: payload.type,
    title: payload.name,
    details,
    template_id: payload.template_id ?? null,
  };

  const { data, error } = await service.from("appointment_clinical_items").insert(base).select("*").maybeSingle();
  if (!error) return { data, error: null };

  if (isMissingColumnError(error, "doctor_patient_id")) {
    const retry = { ...base };
    delete retry.doctor_patient_id;
    const r2 = await service.from("appointment_clinical_items").insert(retry).select("*").maybeSingle();
    return { data: r2.data, error: r2.error };
  }

  if (isMissingColumnError(error, "template_id")) {
    const retry = { ...base };
    delete retry.template_id;
    const r2 = await service.from("appointment_clinical_items").insert(retry).select("*").maybeSingle();
    return { data: r2.data, error: r2.error };
  }

  return { data: null, error };
}

async function insertItemNew(service: any, appt: any, payload: any) {
  const base: Record<string, unknown> = {
    appointment_id: appt.id,
    doctor_id: appt.doctor_id,
    patient_id: appt.patient_id ?? null,
    type: payload.type,
    name: payload.name,
    description: payload.description ?? null,
    quantity: payload.quantity ?? null,
    dosage: payload.dosage ?? null,
    frequency: payload.frequency ?? null,
    duration: payload.duration ?? null,
    cost: payload.cost ?? null,
    template_id: payload.template_id ?? null,
  };

  const { data, error } = await service.from("appointment_clinical_items").insert(base).select("*").maybeSingle();
  if (!error) return { data, error: null };

  if (isMissingColumnError(error, "template_id")) {
    const retry = { ...base };
    delete retry.template_id;
    const r2 = await service.from("appointment_clinical_items").insert(retry).select("*").maybeSingle();
    return { data: r2.data, error: r2.error };
  }

  return { data: null, error };
}

async function updateItemLegacy(service: any, appt: any, itemId: string, patch: any) {
  const details: Record<string, unknown> = {};
  if (patch.description !== undefined) details.description = patch.description ?? null;
  if (patch.quantity !== undefined) details.quantity = patch.quantity ?? null;
  if (patch.dosage !== undefined) details.dosage = patch.dosage ?? null;
  if (patch.frequency !== undefined) details.frequency = patch.frequency ?? null;
  if (patch.duration !== undefined) details.duration = patch.duration ?? null;
  if (patch.cost !== undefined) details.cost = patch.cost ?? null;

  const updatePayload: Record<string, unknown> = {
    ...(patch.type !== undefined ? { item_type: patch.type } : {}),
    ...(patch.name !== undefined ? { title: patch.name } : {}),
    ...(Object.keys(details).length > 0 ? { details } : {}),
    ...(patch.template_id !== undefined ? { template_id: patch.template_id ?? null } : {}),
  };

  const { data, error } = await service
    .from("appointment_clinical_items")
    .update(updatePayload)
    .eq("id", itemId)
    .eq("appointment_id", appt.id)
    .select("*")
    .maybeSingle();

  if (!error) return { data, error: null };

  if (isMissingColumnError(error, "template_id")) {
    const retry = { ...updatePayload };
    delete retry.template_id;
    const r2 = await service
      .from("appointment_clinical_items")
      .update(retry)
      .eq("id", itemId)
      .eq("appointment_id", appt.id)
      .select("*")
      .maybeSingle();
    return { data: r2.data, error: r2.error };
  }

  return { data: null, error };
}

async function updateItemNew(service: any, appt: any, itemId: string, patch: any) {
  const updatePayload: Record<string, unknown> = pickDefined({
    type: patch.type,
    name: patch.name,
    description: patch.description,
    quantity: patch.quantity,
    dosage: patch.dosage,
    frequency: patch.frequency,
    duration: patch.duration,
    cost: patch.cost,
    template_id: patch.template_id,
  });

  const { data, error } = await service
    .from("appointment_clinical_items")
    .update(updatePayload)
    .eq("id", itemId)
    .eq("appointment_id", appt.id)
    .select("*")
    .maybeSingle();

  if (!error) return { data, error: null };

  if (isMissingColumnError(error, "template_id")) {
    const retry = { ...updatePayload };
    delete retry.template_id;
    const r2 = await service
      .from("appointment_clinical_items")
      .update(retry)
      .eq("id", itemId)
      .eq("appointment_id", appt.id)
      .select("*")
      .maybeSingle();
    return { data: r2.data, error: r2.error };
  }

  return { data: null, error };
}

async function createTemplate(service: any, doctorId: string, payload: any) {
  const row = {
    doctor_id: doctorId,
    type: payload.type,
    name: payload.name,
    description: payload.description ?? null,
    default_cost: payload.default_cost ?? null,
    is_active: payload.is_active ?? true,
  };

  const { data, error } = await service.from("appointment_clinical_item_templates").insert(row).select("*").single();
  if (error) throw error;
  return data;
}

async function listDoctorProcedures(service: any, doctorId: string, includeInactive: boolean, limit: number) {
  // Prefer dentist_id (most common in this schema). Fallback to doctor_id if needed.
  let q = service.from("procedures").select("*").eq("dentist_id", doctorId);
  if (!includeInactive) q = q.eq("active", true);

  const r1 = await q.order("updated_at", { ascending: false }).limit(limit);
  if (!r1.error) return (r1.data || []) as any[];

  if (isMissingColumnError(r1.error, "dentist_id")) {
    let q2 = service.from("procedures").select("*").eq("doctor_id", doctorId);
    if (!includeInactive) q2 = q2.eq("active", true);
    const r2 = await q2.order("updated_at", { ascending: false }).limit(limit);
    if (r2.error) throw r2.error;
    return (r2.data || []) as any[];
  }

  if (isMissingColumnError(r1.error, "active")) {
    const r2 = await service.from("procedures").select("*").eq("dentist_id", doctorId).order("updated_at", { ascending: false }).limit(limit);
    if (r2.error) throw r2.error;
    return (r2.data || []) as any[];
  }

  throw r1.error;
}

async function listDoctorTreatmentPlans(service: any, doctorId: string, patientId: string | null, limit: number) {
  // This table has drift between doctor_id vs dentist_id in older migrations.
  // Also many plans are patient-specific; if we have a patient_id on the appointment, scope to it.
  const tryDoctorId = async () => {
    let q = service.from("treatment_plans").select("*").eq("doctor_id", doctorId);
    if (patientId) q = q.eq("patient_id", patientId);
    const r = await q.order("updated_at", { ascending: false }).limit(limit);
    return r;
  };

  const r1 = await tryDoctorId();
  if (!r1.error) return (r1.data || []) as any[];

  if (isMissingColumnError(r1.error, "doctor_id")) {
    let q2 = service.from("treatment_plans").select("*").eq("dentist_id", doctorId);
    if (patientId) q2 = q2.eq("patient_id", patientId);
    const r2 = await q2.order("updated_at", { ascending: false }).limit(limit);
    if (r2.error) throw r2.error;
    return (r2.data || []) as any[];
  }

  throw r1.error;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!isBearer(authHeader)) return json({ ok: false, error: "Missing Authorization" }, 401);

    const user = await getUserFromAuth(supabaseUrl, anonKey, authHeader!);
    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = (await req.json().catch(() => null)) as ReqBody | null;
    if (!body?.action) return json({ ok: false, error: "Missing action" }, 400);

    // -----------------------
    // Templates (doctor-only)
    // -----------------------
    if (
      body.action === "templates_list" ||
      body.action === "templates_create" ||
      body.action === "templates_update" ||
      body.action === "templates_delete"
    ) {
      const { data: doctor, error: dErr } = await service
        .from("doctors")
        .select("id,user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (dErr) return json({ ok: false, error: dErr.message }, 500);
      if (!doctor?.id) return json({ ok: false, error: "Forbidden" }, 403);

      if (body.action === "templates_list") {
        let q = service
          .from("appointment_clinical_item_templates")
          .select("*")
          .eq("doctor_id", doctor.id)
          .order("created_at", { ascending: false });

        if (body.type) q = q.eq("type", body.type);
        if (!body.include_inactive) q = q.eq("is_active", true);

        const { data, error } = await q;
        if (error) return json({ ok: false, error: error.message }, 500);

        return json({ ok: true, templates: (data || []).map(normalizeTemplate) });
      }

      if (body.action === "templates_create") {
        const t = await createTemplate(service, doctor.id, body);
        return json({ ok: true, template: normalizeTemplate(t) });
      }

      if (body.action === "templates_update") {
        const patch = pickDefined({
          type: body.type,
          name: body.name,
          description: body.description,
          default_cost: body.default_cost,
          is_active: body.is_active,
        });

        const { data, error } = await service
          .from("appointment_clinical_item_templates")
          .update(patch)
          .eq("id", body.template_id)
          .eq("doctor_id", doctor.id)
          .select("*")
          .maybeSingle();

        if (error) return json({ ok: false, error: error.message }, 500);
        if (!data) return json({ ok: false, error: "Template not found" }, 404);

        return json({ ok: true, template: normalizeTemplate(data) });
      }

      if (body.action === "templates_delete") {
        const { error } = await service
          .from("appointment_clinical_item_templates")
          .delete()
          .eq("id", body.template_id)
          .eq("doctor_id", doctor.id);

        if (error) return json({ ok: false, error: error.message }, 500);
        return json({ ok: true });
      }
    }

    // -----------------------
    // Appointment context
    // -----------------------
    const appointmentId = (body as any).appointment_id;
    if (!appointmentId) return json({ ok: false, error: "appointment_id is required" }, 400);

    const ctx = await resolveContext(service, user.id, appointmentId);
    if (!ctx.ok) return json({ ok: false, error: ctx.error, code: ctx.code }, 404);

    const { appt, doctor, isDoctor, isPatient } = ctx;

    // Patients can only read their own appointment items; doctors can read/write their own.
    if (!isDoctor && !isPatient) return json({ ok: false, error: "Forbidden" }, 403);

    // -----------------------
    // Catalog (doctor-only)
    // -----------------------
    if (body.action === "catalog_list") {
      if (!isDoctor) return json({ ok: false, error: "Forbidden" }, 403);

      const includeInactive = Boolean(body.include_inactive);
      const limit = Math.min(Math.max(Number(body.limit ?? 200), 1), 1000);

      const procedures = await listDoctorProcedures(service, appt.doctor_id, includeInactive, limit);
      const treatmentPlans = await listDoctorTreatmentPlans(
        service,
        appt.doctor_id,
        appt.patient_id ? String(appt.patient_id) : null,
        limit,
      );

      return json({
        ok: true,
        catalog: {
          procedures: (procedures || []).map(normalizeProcedure),
          treatment_plans: (treatmentPlans || []).map(normalizeTreatmentPlan),
        },
      });
    }

    // -----------------------
    // Items
    // -----------------------
    if (body.action === "list") {
      const { data, error } = await service
        .from("appointment_clinical_items")
        .select("*")
        .eq("appointment_id", appt.id)
        .order("created_at", { ascending: false });

      if (error) return json({ ok: false, error: error.message }, 500);

      const items = (data || []).map(normalizeItem);

      // Defense-in-depth: if patient, filter to their rows when patient_id is present
      const filtered = isPatient ? items.filter((i: any) => !i.patient_id || i.patient_id === user.id) : items;

      return json({ ok: true, items: filtered });
    }

    // Doctor-only writes
    if (!isDoctor) return json({ ok: false, error: "Forbidden" }, 403);

    if (body.action === "apply_template") {
      const { data: tpl, error: tErr } = await service
        .from("appointment_clinical_item_templates")
        .select("*")
        .eq("id", body.template_id)
        .eq("doctor_id", doctor.id)
        .maybeSingle();

      if (tErr) return json({ ok: false, error: tErr.message }, 500);
      if (!tpl) return json({ ok: false, error: "Template not found" }, 404);

      const overrides = body.overrides || {};
      const payload = {
        type: (overrides as any).type ?? tpl.type,
        name: (overrides as any).name ?? tpl.name,
        description: (overrides as any).description ?? tpl.description ?? null,
        quantity: (overrides as any).quantity ?? null,
        dosage: (overrides as any).dosage ?? null,
        frequency: (overrides as any).frequency ?? null,
        duration: (overrides as any).duration ?? null,
        cost: (overrides as any).cost ?? tpl.default_cost ?? null,
        template_id: tpl.id,
      };

      let inserted: any = null;
      let lastErr: any = null;

      const r1 = await insertItemLegacy(service, appt, payload);
      if (r1.error) {
        lastErr = r1.error;
        const r2 = await insertItemNew(service, appt, payload);
        if (r2.error) lastErr = r2.error;
        else inserted = r2.data;
      } else {
        inserted = r1.data;
      }

      if (lastErr) return json({ ok: false, error: String(lastErr?.message || lastErr) }, 500);
      return json({ ok: true, item: normalizeItem(inserted) });
    }

    if (body.action === "create") {
      if (!body.type || !body.name) return json({ ok: false, error: "type and name are required" }, 400);

      let createdTemplate: any = null;
      let templateIdToUse: string | null = body.template_id ?? null;

      if (body.save_as_template) {
        const tplPayload = {
          type: body.type,
          name: body.template_name?.trim() || body.name,
          description: body.template_description ?? body.description ?? null,
          default_cost: body.template_default_cost ?? body.cost ?? null,
          is_active: true,
        };
        createdTemplate = await createTemplate(service, doctor.id, tplPayload);
        templateIdToUse = createdTemplate.id;
      }

      const payload = {
        type: body.type,
        name: body.name,
        description: body.description ?? null,
        quantity: body.quantity ?? null,
        dosage: body.dosage ?? null,
        frequency: body.frequency ?? null,
        duration: body.duration ?? null,
        cost: body.cost ?? null,
        template_id: templateIdToUse,
      };

      let inserted: any = null;
      let lastErr: any = null;

      const r1 = await insertItemLegacy(service, appt, payload);
      if (r1.error) {
        lastErr = r1.error;
        const r2 = await insertItemNew(service, appt, payload);
        if (r2.error) lastErr = r2.error;
        else inserted = r2.data;
      } else {
        inserted = r1.data;
      }

      if (lastErr) return json({ ok: false, error: String(lastErr?.message || lastErr) }, 500);

      return json({
        ok: true,
        item: normalizeItem(inserted),
        ...(createdTemplate ? { template: normalizeTemplate(createdTemplate) } : {}),
      });
    }

    if (body.action === "update") {
      if (!body.item_id) return json({ ok: false, error: "item_id is required" }, 400);

      let updated: any = null;
      let lastErr: any = null;

      const r1 = await updateItemLegacy(service, appt, body.item_id, body);
      if (r1.error) {
        lastErr = r1.error;
        const r2 = await updateItemNew(service, appt, body.item_id, body);
        if (r2.error) lastErr = r2.error;
        else updated = r2.data;
      } else {
        updated = r1.data;
      }

      if (lastErr) return json({ ok: false, error: String(lastErr?.message || lastErr) }, 500);
      if (!updated) return json({ ok: false, error: "Item not found" }, 404);

      return json({ ok: true, item: normalizeItem(updated) });
    }

    if (body.action === "delete") {
      if (!body.item_id) return json({ ok: false, error: "item_id is required" }, 400);

      const { error } = await service
        .from("appointment_clinical_items")
        .delete()
        .eq("id", body.item_id)
        .eq("appointment_id", appt.id);

      if (error) return json({ ok: false, error: error.message }, 500);

      return json({ ok: true });
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("appointment-clinical-items error:", e);
    return json({ ok: false, error: e?.message ?? String(e) }, 500);
  }
});
