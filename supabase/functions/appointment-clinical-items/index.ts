// File: supabase/functions/appointment-clinical-items/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ItemType = "procedure" | "medication" | "treatment_plan";

type ReqBody =
  | { action: "list"; appointment_id: string }
  | {
      action: "create";
      appointment_id: string;
      item_type: ItemType;
      title: string;
      details?: Record<string, unknown>;
    }
  | {
      action: "update";
      id: string;
      title?: string;
      details?: Record<string, unknown>;
      item_type?: ItemType;
    }
  | { action: "delete"; id: string }
  | { action: "save_as_template"; id: string; template_title?: string }
  | { action: "list_templates" }
  | { action: "create_template"; item_type: ItemType; title: string; details?: Record<string, unknown> }
  | { action: "update_template"; id: string; item_type?: ItemType; title?: string; details?: Record<string, unknown> }
  | { action: "delete_template"; id: string };

type Resp =
  | { ok: true; data?: unknown }
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

function getAuthHeader(req: Request) {
  return req.headers.get("authorization") || req.headers.get("Authorization") || "";
}

async function getAuthedUserId(supabaseUrl: string, anonKey: string, authHeader: string) {
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user?.id) return null;
  return user.id;
}

async function getDoctorIdForUser(service: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await service.from("doctors").select("id").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("Doctor lookup error:", error);
    return null;
  }
  return data?.id ?? null;
}

async function loadAppointment(service: ReturnType<typeof createClient>, appointmentId: string) {
  const { data, error } = await service
    .from("appointments")
    .select("id, doctor_id, patient_id, appointment_date, start_time, status, appointment_type")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) {
    console.error("Appointment read error:", error);
    return { apt: null as any, error: "Failed to load appointment" };
  }
  if (!data) return { apt: null as any, error: "Appointment not found" };
  return { apt: data, error: null as string | null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = getAuthHeader(req);
    if (!authHeader) return json({ ok: false, error: "Missing Authorization header" }, 401);

    const userId = await getAuthedUserId(supabaseUrl, anonKey, authHeader);
    if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);

    let body: ReqBody;
    try {
      body = (await req.json()) as ReqBody;
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const doctorId = await getDoctorIdForUser(service, userId);

    // Templates: doctor-only
    if (body.action === "list_templates") {
      if (!doctorId) return json({ ok: false, error: "Forbidden" }, 403);

      const { data, error } = await service
        .from("clinical_item_templates")
        .select("id, doctor_id, item_type, title, details, created_at, updated_at")
        .eq("doctor_id", doctorId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Templates list error:", error);
        return json({ ok: false, error: "Failed to list templates" }, 500);
      }
      return json({ ok: true, data }, 200);
    }

    if (body.action === "create_template") {
      if (!doctorId) return json({ ok: false, error: "Forbidden" }, 403);

      if (!body.item_type || !body.title) return json({ ok: false, error: "Missing item_type or title" }, 400);

      const { data, error } = await service
        .from("clinical_item_templates")
        .insert({
          doctor_id: doctorId,
          item_type: body.item_type,
          title: body.title,
          details: body.details ?? {},
        })
        .select("id, doctor_id, item_type, title, details, created_at, updated_at")
        .maybeSingle();

      if (error) {
        console.error("Template create error:", error);
        return json({ ok: false, error: "Failed to create template" }, 500);
      }
      return json({ ok: true, data }, 200);
    }

    if (body.action === "update_template") {
      if (!doctorId) return json({ ok: false, error: "Forbidden" }, 403);
      if (!body.id) return json({ ok: false, error: "Missing id" }, 400);

      const patch: Record<string, unknown> = {};
      if (body.title !== undefined) patch.title = body.title;
      if (body.item_type !== undefined) patch.item_type = body.item_type;
      if (body.details !== undefined) patch.details = body.details;

      const { data, error } = await service
        .from("clinical_item_templates")
        .update(patch)
        .eq("id", body.id)
        .eq("doctor_id", doctorId)
        .select("id, doctor_id, item_type, title, details, created_at, updated_at")
        .maybeSingle();

      if (error) {
        console.error("Template update error:", error);
        return json({ ok: false, error: "Failed to update template" }, 500);
      }
      if (!data) return json({ ok: false, error: "Not found", code: "NOT_FOUND" }, 404);
      return json({ ok: true, data }, 200);
    }

    if (body.action === "delete_template") {
      if (!doctorId) return json({ ok: false, error: "Forbidden" }, 403);
      if (!body.id) return json({ ok: false, error: "Missing id" }, 400);

      const { error } = await service.from("clinical_item_templates").delete().eq("id", body.id).eq("doctor_id", doctorId);
      if (error) {
        console.error("Template delete error:", error);
        return json({ ok: false, error: "Failed to delete template" }, 500);
      }
      return json({ ok: true }, 200);
    }

    // Appointment clinical items
    if (body.action === "list") {
      if (!body.appointment_id) return json({ ok: false, error: "Missing appointment_id" }, 400);

      const { apt, error } = await loadAppointment(service, body.appointment_id);
      if (error) return json({ ok: false, error, code: error === "Appointment not found" ? "NOT_FOUND" : undefined }, error === "Appointment not found" ? 404 : 500);

      const isDoctorParty = doctorId && apt.doctor_id === doctorId;
      const isPatientParty = apt.patient_id && apt.patient_id === userId;

      if (!isDoctorParty && !isPatientParty) return json({ ok: false, error: "Forbidden" }, 403);

      const { data, error: listErr } = await service
        .from("appointment_clinical_items")
        .select("id, appointment_id, doctor_id, patient_id, doctor_patient_id, item_type, title, details, created_at, updated_at")
        .eq("appointment_id", apt.id)
        .order("created_at", { ascending: true });

      if (listErr) {
        console.error("Items list error:", listErr);
        return json({ ok: false, error: "Failed to list clinical items" }, 500);
      }

      return json({ ok: true, data }, 200);
    }

    if (body.action === "create") {
      if (!doctorId) return json({ ok: false, error: "Forbidden" }, 403);
      if (!body.appointment_id || !body.item_type || !body.title) return json({ ok: false, error: "Missing appointment_id, item_type, or title" }, 400);

      const { apt, error } = await loadAppointment(service, body.appointment_id);
      if (error) return json({ ok: false, error, code: error === "Appointment not found" ? "NOT_FOUND" : undefined }, error === "Appointment not found" ? 404 : 500);

      if (apt.doctor_id !== doctorId) return json({ ok: false, error: "Forbidden" }, 403);

      const insertRow = {
        appointment_id: apt.id,
        doctor_id: doctorId,
        patient_id: apt.patient_id ?? null,
        doctor_patient_id: null,
        item_type: body.item_type,
        title: body.title,
        details: body.details ?? {},
      };

      const { data, error: insErr } = await service
        .from("appointment_clinical_items")
        .insert(insertRow)
        .select("id, appointment_id, doctor_id, patient_id, doctor_patient_id, item_type, title, details, created_at, updated_at")
        .maybeSingle();

      if (insErr) {
        console.error("Item insert error:", insErr);
        return json({ ok: false, error: "Failed to create clinical item" }, 500);
      }

      return json({ ok: true, data }, 200);
    }

    if (body.action === "update") {
      if (!doctorId) return json({ ok: false, error: "Forbidden" }, 403);
      if (!body.id) return json({ ok: false, error: "Missing id" }, 400);

      const { data: existing, error: getErr } = await service
        .from("appointment_clinical_items")
        .select("id, appointment_id, doctor_id")
        .eq("id", body.id)
        .maybeSingle();

      if (getErr) {
        console.error("Item read error:", getErr);
        return json({ ok: false, error: "Failed to load clinical item" }, 500);
      }
      if (!existing) return json({ ok: false, error: "Not found", code: "NOT_FOUND" }, 404);
      if (existing.doctor_id !== doctorId) return json({ ok: false, error: "Forbidden" }, 403);

      const patch: Record<string, unknown> = {};
      if (body.title !== undefined) patch.title = body.title;
      if (body.item_type !== undefined) patch.item_type = body.item_type;
      if (body.details !== undefined) patch.details = body.details;

      const { data, error: updErr } = await service
        .from("appointment_clinical_items")
        .update(patch)
        .eq("id", body.id)
        .eq("doctor_id", doctorId)
        .select("id, appointment_id, doctor_id, patient_id, doctor_patient_id, item_type, title, details, created_at, updated_at")
        .maybeSingle();

      if (updErr) {
        console.error("Item update error:", updErr);
        return json({ ok: false, error: "Failed to update clinical item" }, 500);
      }
      if (!data) return json({ ok: false, error: "Not found", code: "NOT_FOUND" }, 404);

      return json({ ok: true, data }, 200);
    }

    if (body.action === "delete") {
      if (!doctorId) return json({ ok: false, error: "Forbidden" }, 403);
      if (!body.id) return json({ ok: false, error: "Missing id" }, 400);

      const { data: existing, error: getErr } = await service
        .from("appointment_clinical_items")
        .select("id, doctor_id")
        .eq("id", body.id)
        .maybeSingle();

      if (getErr) {
        console.error("Item read error:", getErr);
        return json({ ok: false, error: "Failed to load clinical item" }, 500);
      }
      if (!existing) return json({ ok: false, error: "Not found", code: "NOT_FOUND" }, 404);
      if (existing.doctor_id !== doctorId) return json({ ok: false, error: "Forbidden" }, 403);

      const { error: delErr } = await service.from("appointment_clinical_items").delete().eq("id", body.id).eq("doctor_id", doctorId);
      if (delErr) {
        console.error("Item delete error:", delErr);
        return json({ ok: false, error: "Failed to delete clinical item" }, 500);
      }
      return json({ ok: true }, 200);
    }

    if (body.action === "save_as_template") {
      if (!doctorId) return json({ ok: false, error: "Forbidden" }, 403);
      if (!body.id) return json({ ok: false, error: "Missing id" }, 400);

      const { data: item, error: itemErr } = await service
        .from("appointment_clinical_items")
        .select("id, doctor_id, item_type, title, details")
        .eq("id", body.id)
        .maybeSingle();

      if (itemErr) {
        console.error("Item read error:", itemErr);
        return json({ ok: false, error: "Failed to load clinical item" }, 500);
      }
      if (!item) return json({ ok: false, error: "Not found", code: "NOT_FOUND" }, 404);
      if (item.doctor_id !== doctorId) return json({ ok: false, error: "Forbidden" }, 403);

      const title = (body.template_title && body.template_title.trim()) ? body.template_title.trim() : item.title;

      const { data: tpl, error: tplErr } = await service
        .from("clinical_item_templates")
        .insert({
          doctor_id: doctorId,
          item_type: item.item_type,
          title,
          details: item.details ?? {},
        })
        .select("id, doctor_id, item_type, title, details, created_at, updated_at")
        .maybeSingle();

      if (tplErr) {
        console.error("Template insert error:", tplErr);
        return json({ ok: false, error: "Failed to save template" }, 500);
      }

      return json({ ok: true, data: tpl }, 200);
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("Error in appointment-clinical-items:", e);
    return json({ ok: false, error: e?.message ?? String(e) }, 500);
  }
});
