// File: supabase/functions/appointment-clinical-items/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ClinicalItemType = "procedure" | "medication" | "treatment_plan";

type Action =
  | "list"
  | "create"
  | "update"
  | "delete"
  | "templates_list"
  | "template_create"
  | "template_update"
  | "template_delete";

type ReqBody =
  | {
      action: "list";
      appointment_id: string;
    }
  | {
      action: "create";
      appointment_id: string;
      item: {
        item_type: ClinicalItemType;
        title: string;
        details?: Record<string, unknown>;
      };
      save_as_template?: boolean;
      template?: {
        name?: string;
        description?: string | null;
        default_cost?: number | null;
      };
    }
  | {
      action: "update";
      appointment_id: string;
      item_id: string;
      patch: {
        title?: string;
        details?: Record<string, unknown>;
        item_type?: ClinicalItemType;
      };
    }
  | {
      action: "delete";
      appointment_id: string;
      item_id: string;
    }
  | {
      action: "templates_list";
    }
  | {
      action: "template_create";
      template: {
        type: ClinicalItemType;
        name: string;
        description?: string | null;
        default_cost?: number | null;
        is_active?: boolean;
      };
    }
  | {
      action: "template_update";
      template_id: string;
      patch: {
        type?: ClinicalItemType;
        name?: string;
        description?: string | null;
        default_cost?: number | null;
        is_active?: boolean;
      };
    }
  | {
      action: "template_delete";
      template_id: string;
    };

type Resp =
  | { ok: true; items?: unknown[]; templates?: unknown[] }
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

function getBearer(req: Request) {
  return req.headers.get("authorization") || req.headers.get("Authorization");
}

async function getAuthedUser(supabaseUrl: string, anonKey: string, authHeader: string) {
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return { user: null as any, error: error?.message || "Unauthorized" };
  return { user: data.user, error: null as string | null };
}

async function getDoctorIdByUserId(admin: any, userId: string): Promise<string | null> {
  const { data, error } = await admin.from("doctors").select("id").eq("user_id", userId).maybeSingle();
  if (error) return null;
  return data?.id ?? null;
}

async function assertAppointmentAccess(params: {
  admin: any;
  appointmentId: string;
  userId: string;
}): Promise<
  | { ok: true; role: "doctor" | "patient"; appointment: any; doctorId: string | null }
  | { ok: false; error: string; code?: string }
> {
  const { admin, appointmentId, userId } = params;

  const { data: appt, error: apptErr } = await admin
    .from("appointments")
    .select("id, doctor_id, patient_id, doctor_patient_id, practice_id, status, appointment_type, appointment_date, start_time, end_time")
    .eq("id", appointmentId)
    .maybeSingle();

  if (apptErr) return { ok: false, error: "Failed to load appointment", code: "APPOINTMENT_READ_FAILED" };
  if (!appt) return { ok: false, error: "Appointment not found", code: "NOT_FOUND" };

  // Doctor?
  const doctorId = await getDoctorIdByUserId(admin, userId);
  if (doctorId && appt.doctor_id === doctorId) {
    return { ok: true, role: "doctor", appointment: appt, doctorId };
  }

  // Patient?
  if (appt.patient_id && appt.patient_id === userId) {
    return { ok: true, role: "patient", appointment: appt, doctorId: null };
  }

  return { ok: false, error: "Forbidden", code: "FORBIDDEN" };
}

function safeType(t: unknown): ClinicalItemType {
  const v = String(t || "").trim().toLowerCase();
  if (v === "procedure" || v === "medication" || v === "treatment_plan") return v;
  throw new Error("Invalid item_type");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 200);

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = getBearer(req);
    if (!authHeader) return json({ ok: false, error: "Missing Authorization header", code: "NO_AUTH" }, 200);

    const { user, error: userError } = await getAuthedUser(supabaseUrl, anonKey, authHeader);
    if (!user) return json({ ok: false, error: userError || "Unauthorized", code: "UNAUTHORIZED" }, 200);

    let body: ReqBody;
    try {
      body = (await req.json()) as ReqBody;
    } catch {
      return json({ ok: false, error: "Invalid JSON body", code: "BAD_JSON" }, 200);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const action = (body as any)?.action as Action | undefined;
    if (!action) return json({ ok: false, error: "Missing action", code: "MISSING_ACTION" }, 200);

    // -----------------------
    // Templates (doctor-only)
    // -----------------------
    if (action === "templates_list") {
      const doctorId = await getDoctorIdByUserId(admin, user.id);
      if (!doctorId) return json({ ok: false, error: "Forbidden", code: "NOT_DOCTOR" }, 200);

      const { data, error } = await admin
        .from("appointment_clinical_item_templates")
        .select("id, doctor_id, type, name, description, default_cost, is_active, created_at, updated_at")
        .eq("doctor_id", doctorId)
        .order("updated_at", { ascending: false });

      if (error) return json({ ok: false, error: error.message, code: "TEMPLATES_READ_FAILED" }, 200);
      return json({ ok: true, templates: data || [] }, 200);
    }

    if (action === "template_create") {
      const doctorId = await getDoctorIdByUserId(admin, user.id);
      if (!doctorId) return json({ ok: false, error: "Forbidden", code: "NOT_DOCTOR" }, 200);

      const t = (body as any).template;
      if (!t?.name) return json({ ok: false, error: "template.name is required", code: "MISSING_NAME" }, 200);

      const type = safeType(t.type);

      const { data, error } = await admin
        .from("appointment_clinical_item_templates")
        .insert({
          doctor_id: doctorId,
          type,
          name: String(t.name).trim(),
          description: t.description ?? null,
          default_cost: t.default_cost ?? null,
          is_active: typeof t.is_active === "boolean" ? t.is_active : true,
        })
        .select("id, doctor_id, type, name, description, default_cost, is_active, created_at, updated_at")
        .single();

      if (error) return json({ ok: false, error: error.message, code: "TEMPLATE_CREATE_FAILED" }, 200);
      return json({ ok: true, templates: [data] }, 200);
    }

    if (action === "template_update") {
      const doctorId = await getDoctorIdByUserId(admin, user.id);
      if (!doctorId) return json({ ok: false, error: "Forbidden", code: "NOT_DOCTOR" }, 200);

      const templateId = (body as any).template_id;
      const patch = (body as any).patch || {};
      if (!templateId) return json({ ok: false, error: "template_id is required", code: "MISSING_TEMPLATE_ID" }, 200);

      const updatePatch: Record<string, unknown> = {};
      if (patch.type != null) updatePatch.type = safeType(patch.type);
      if (patch.name != null) updatePatch.name = String(patch.name).trim();
      if (patch.description !== undefined) updatePatch.description = patch.description ?? null;
      if (patch.default_cost !== undefined) updatePatch.default_cost = patch.default_cost ?? null;
      if (patch.is_active !== undefined) updatePatch.is_active = Boolean(patch.is_active);

      const { data: owned, error: ownedErr } = await admin
        .from("appointment_clinical_item_templates")
        .select("id")
        .eq("id", templateId)
        .eq("doctor_id", doctorId)
        .maybeSingle();

      if (ownedErr) return json({ ok: false, error: ownedErr.message, code: "TEMPLATE_OWNERSHIP_CHECK_FAILED" }, 200);
      if (!owned) return json({ ok: false, error: "Not found", code: "NOT_FOUND" }, 200);

      const { data, error } = await admin
        .from("appointment_clinical_item_templates")
        .update(updatePatch)
        .eq("id", templateId)
        .select("id, doctor_id, type, name, description, default_cost, is_active, created_at, updated_at")
        .single();

      if (error) return json({ ok: false, error: error.message, code: "TEMPLATE_UPDATE_FAILED" }, 200);
      return json({ ok: true, templates: [data] }, 200);
    }

    if (action === "template_delete") {
      const doctorId = await getDoctorIdByUserId(admin, user.id);
      if (!doctorId) return json({ ok: false, error: "Forbidden", code: "NOT_DOCTOR" }, 200);

      const templateId = (body as any).template_id;
      if (!templateId) return json({ ok: false, error: "template_id is required", code: "MISSING_TEMPLATE_ID" }, 200);

      const { data: owned, error: ownedErr } = await admin
        .from("appointment_clinical_item_templates")
        .select("id")
        .eq("id", templateId)
        .eq("doctor_id", doctorId)
        .maybeSingle();

      if (ownedErr) return json({ ok: false, error: ownedErr.message, code: "TEMPLATE_OWNERSHIP_CHECK_FAILED" }, 200);
      if (!owned) return json({ ok: false, error: "Not found", code: "NOT_FOUND" }, 200);

      const { error } = await admin.from("appointment_clinical_item_templates").delete().eq("id", templateId);
      if (error) return json({ ok: false, error: error.message, code: "TEMPLATE_DELETE_FAILED" }, 200);

      return json({ ok: true }, 200);
    }

    // -----------------------
    // Appointment items
    // -----------------------
    if (action === "list") {
      const appointmentId = (body as any).appointment_id;
      if (!appointmentId) return json({ ok: false, error: "appointment_id is required", code: "MISSING_APPOINTMENT_ID" }, 200);

      const access = await assertAppointmentAccess({ admin, appointmentId, userId: user.id });
      if (!access.ok) return json(access, 200);

      const { data, error } = await admin
        .from("appointment_clinical_items")
        .select("id, appointment_id, doctor_id, patient_id, doctor_patient_id, item_type, title, details, created_at, updated_at")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: true });

      if (error) return json({ ok: false, error: error.message, code: "ITEMS_LIST_FAILED" }, 200);
      return json({ ok: true, items: data || [] }, 200);
    }

    if (action === "create") {
      const appointmentId = (body as any).appointment_id;
      const item = (body as any).item;
      if (!appointmentId) return json({ ok: false, error: "appointment_id is required", code: "MISSING_APPOINTMENT_ID" }, 200);
      if (!item?.item_type || !item?.title) {
        return json({ ok: false, error: "item.item_type and item.title are required", code: "MISSING_FIELDS" }, 200);
      }

      const access = await assertAppointmentAccess({ admin, appointmentId, userId: user.id });
      if (!access.ok) return json(access, 200);
      if (access.role !== "doctor") return json({ ok: false, error: "Forbidden", code: "DOCTOR_ONLY" }, 200);

      const itemType = safeType(item.item_type);
      const title = String(item.title).trim();
      const details = (item.details ?? {}) as Record<string, unknown>;

      // Fill patient_id/doctor_patient_id from appointment
      const appt = access.appointment;

      const { data: created, error } = await admin
        .from("appointment_clinical_items")
        .insert({
          appointment_id: appointmentId,
          doctor_id: appt.doctor_id,
          patient_id: appt.patient_id ?? null,
          doctor_patient_id: appt.doctor_patient_id ?? null,
          item_type: itemType,
          title,
          details,
        })
        .select("id, appointment_id, doctor_id, patient_id, doctor_patient_id, item_type, title, details, created_at, updated_at")
        .single();

      if (error) return json({ ok: false, error: error.message, code: "ITEM_CREATE_FAILED" }, 200);

      // Optional "save as template" (best-effort)
      const saveAsTemplate = Boolean((body as any).save_as_template);
      if (saveAsTemplate && access.doctorId) {
        const t = (body as any).template || {};
        const name = String(t.name || title).trim();

        const descFromDetails =
          typeof details?.description === "string"
            ? String(details.description)
            : typeof details?.notes === "string"
              ? String(details.notes)
              : null;

        const description = (t.description ?? descFromDetails) ?? null;

        const defaultCost =
          typeof t.default_cost === "number"
            ? t.default_cost
            : typeof (details as any)?.cost === "number"
              ? Number((details as any).cost)
              : null;

        await admin
          .from("appointment_clinical_item_templates")
          .insert({
            doctor_id: access.doctorId,
            type: itemType,
            name,
            description,
            default_cost: defaultCost,
            is_active: true,
          })
          .catch(() => {
            // ignore template errors
          });
      }

      return json({ ok: true, items: [created] }, 200);
    }

    if (action === "update") {
      const appointmentId = (body as any).appointment_id;
      const itemId = (body as any).item_id;
      const patch = (body as any).patch || {};
      if (!appointmentId) return json({ ok: false, error: "appointment_id is required", code: "MISSING_APPOINTMENT_ID" }, 200);
      if (!itemId) return json({ ok: false, error: "item_id is required", code: "MISSING_ITEM_ID" }, 200);

      const access = await assertAppointmentAccess({ admin, appointmentId, userId: user.id });
      if (!access.ok) return json(access, 200);
      if (access.role !== "doctor") return json({ ok: false, error: "Forbidden", code: "DOCTOR_ONLY" }, 200);

      const { data: ownedItem, error: ownedErr } = await admin
        .from("appointment_clinical_items")
        .select("id, doctor_id, appointment_id")
        .eq("id", itemId)
        .eq("appointment_id", appointmentId)
        .maybeSingle();

      if (ownedErr) return json({ ok: false, error: ownedErr.message, code: "ITEM_OWNERSHIP_CHECK_FAILED" }, 200);
      if (!ownedItem) return json({ ok: false, error: "Not found", code: "NOT_FOUND" }, 200);

      const updatePatch: Record<string, unknown> = {};
      if (patch.title != null) updatePatch.title = String(patch.title).trim();
      if (patch.details != null) updatePatch.details = patch.details;
      if (patch.item_type != null) updatePatch.item_type = safeType(patch.item_type);

      const { data: updated, error } = await admin
        .from("appointment_clinical_items")
        .update(updatePatch)
        .eq("id", itemId)
        .select("id, appointment_id, doctor_id, patient_id, doctor_patient_id, item_type, title, details, created_at, updated_at")
        .single();

      if (error) return json({ ok: false, error: error.message, code: "ITEM_UPDATE_FAILED" }, 200);
      return json({ ok: true, items: [updated] }, 200);
    }

    if (action === "delete") {
      const appointmentId = (body as any).appointment_id;
      const itemId = (body as any).item_id;
      if (!appointmentId) return json({ ok: false, error: "appointment_id is required", code: "MISSING_APPOINTMENT_ID" }, 200);
      if (!itemId) return json({ ok: false, error: "item_id is required", code: "MISSING_ITEM_ID" }, 200);

      const access = await assertAppointmentAccess({ admin, appointmentId, userId: user.id });
      if (!access.ok) return json(access, 200);
      if (access.role !== "doctor") return json({ ok: false, error: "Forbidden", code: "DOCTOR_ONLY" }, 200);

      const { data: ownedItem, error: ownedErr } = await admin
        .from("appointment_clinical_items")
        .select("id")
        .eq("id", itemId)
        .eq("appointment_id", appointmentId)
        .maybeSingle();

      if (ownedErr) return json({ ok: false, error: ownedErr.message, code: "ITEM_OWNERSHIP_CHECK_FAILED" }, 200);
      if (!ownedItem) return json({ ok: false, error: "Not found", code: "NOT_FOUND" }, 200);

      const { error } = await admin.from("appointment_clinical_items").delete().eq("id", itemId);
      if (error) return json({ ok: false, error: error.message, code: "ITEM_DELETE_FAILED" }, 200);

      return json({ ok: true }, 200);
    }

    return json({ ok: false, error: "Unknown action", code: "UNKNOWN_ACTION" }, 200);
  } catch (e: any) {
    console.error("Error in appointment-clinical-items:", e);
    return json({ ok: false, error: e?.message ?? String(e), code: "UNEXPECTED" }, 200);
  }
});
