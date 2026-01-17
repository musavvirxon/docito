// File: supabase/functions/dashboard-topbar/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AppRole =
  | "super_admin"
  | "admin"
  | "clinic_admin"
  | "doctor"
  | "pharmacy_admin"
  | "lab_admin"
  | "imaging_admin"
  | "pharmacy_staff"
  | "pharmacist"
  | "lab_staff"
  | "lab_technician"
  | "imaging_staff"
  | "internal_imaging_tech"
  | "clinic_staff"
  | "staff"
  | "receptionist"
  | "nurse"
  | "patient";

type EntityStatus = "active" | "pending" | "verified" | "suspended";
type FacilityType = "practice" | "lab" | "imaging" | "pharmacy" | "doctor" | "none";

type RequestBody =
  | {
      action?: "get";
      role?: AppRole;
    }
  | {
      action: "request_verification";
      role?: AppRole;
      comment?: string;
    };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const ROLE_PRIORITY: Record<AppRole, number> = {
  super_admin: 100,
  doctor: 90,

  pharmacy_admin: 88,
  lab_admin: 88,
  imaging_admin: 88,

  admin: 80,
  clinic_admin: 78,

  pharmacist: 60,
  lab_technician: 60,
  internal_imaging_tech: 60,

  pharmacy_staff: 55,
  lab_staff: 55,
  imaging_staff: 55,

  nurse: 50,
  receptionist: 45,
  clinic_staff: 40,
  staff: 35,

  patient: 10,
};

function pickPrimaryRole(roles: AppRole[]): AppRole {
  if (!roles.length) return "patient";
  return roles.reduce((best, r) => (ROLE_PRIORITY[r] > ROLE_PRIORITY[best] ? r : best), "patient");
}

function normalizeStatus(input: unknown): EntityStatus {
  const s = String(input ?? "").toLowerCase();
  if (s === "verified") return "verified";
  if (s === "suspended") return "suspended";
  if (s === "active") return "active";
  return "pending";
}

async function getUnreadCount(service: ReturnType<typeof createClient>, userId: string) {
  const { count, error } = await service
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) return 0;
  return count ?? 0;
}

async function getRoles(service: ReturnType<typeof createClient>, userId: string): Promise<AppRole[]> {
  const { data, error } = await service.from("user_roles").select("role").eq("user_id", userId);
  if (error || !data) return [];
  return (data as Array<{ role: AppRole }>).map((r) => r.role);
}

async function resolveFacilityByRole(
  service: ReturnType<typeof createClient>,
  userId: string,
  role: AppRole
): Promise<{
  facilityType: FacilityType;
  facilityId?: string;
  entityName?: string;
  entityStatus: EntityStatus;
}> {
  // Defaults
  const base = { facilityType: "none" as FacilityType, entityStatus: "active" as EntityStatus };

  // Practice / clinic
  if (role === "admin" || role === "clinic_admin") {
    const { data } = await service.from("practices").select("id,name,is_verified,status,verification_status").eq("admin_id", userId).maybeSingle();
    if (!data) return { ...base, facilityType: "practice", entityStatus: "pending" };
    const verified = Boolean((data as any).is_verified);
    const status = normalizeStatus((data as any).status ?? (data as any).verification_status);
    return {
      facilityType: "practice",
      facilityId: (data as any).id,
      entityName: (data as any).name ?? undefined,
      entityStatus: verified ? "verified" : status,
    };
  }

  if (role === "clinic_staff" || role === "staff" || role === "receptionist" || role === "nurse") {
    const { data: staffRow } = await service
      .from("clinic_staff")
      .select("practice_id, practices(id,name,is_verified,status,verification_status)")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    const pr = (staffRow as any)?.practices;
    if (!pr) return { ...base, facilityType: "practice", entityStatus: "pending" };

    const verified = Boolean(pr.is_verified);
    const status = normalizeStatus(pr.status ?? pr.verification_status);
    return {
      facilityType: "practice",
      facilityId: pr.id,
      entityName: pr.name ?? undefined,
      entityStatus: verified ? "verified" : status,
    };
  }

  // Lab
  if (role === "lab_admin") {
    const { data } = await service.from("lab_centers").select("id,name,is_verified,status").eq("admin_id", userId).maybeSingle();
    if (!data) return { ...base, facilityType: "lab", entityStatus: "pending" };
    const verified = Boolean((data as any).is_verified);
    const status = normalizeStatus((data as any).status);
    return {
      facilityType: "lab",
      facilityId: (data as any).id,
      entityName: (data as any).name ?? undefined,
      entityStatus: verified ? "verified" : status,
    };
  }

  if (role === "lab_staff" || role === "lab_technician") {
    const { data: staffRow } = await service
      .from("lab_staff")
      .select("lab_center_id, lab_centers(id,name,is_verified,status)")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    const lc = (staffRow as any)?.lab_centers;
    if (!lc) return { ...base, facilityType: "lab", entityStatus: "pending" };

    const verified = Boolean(lc.is_verified);
    const status = normalizeStatus(lc.status);
    return {
      facilityType: "lab",
      facilityId: lc.id,
      entityName: lc.name ?? undefined,
      entityStatus: verified ? "verified" : status,
    };
  }

  // Imaging
  if (role === "imaging_admin") {
    const { data } = await service.from("imaging_centers").select("id,name,is_verified,status").eq("admin_id", userId).maybeSingle();
    if (!data) return { ...base, facilityType: "imaging", entityStatus: "pending" };
    const verified = Boolean((data as any).is_verified);
    const status = normalizeStatus((data as any).status);
    return {
      facilityType: "imaging",
      facilityId: (data as any).id,
      entityName: (data as any).name ?? undefined,
      entityStatus: verified ? "verified" : status,
    };
  }

  if (role === "imaging_staff" || role === "internal_imaging_tech") {
    const { data: staffRow } = await service
      .from("imaging_staff")
      .select("imaging_center_id, imaging_centers(id,name,is_verified,status)")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    const ic = (staffRow as any)?.imaging_centers;
    if (!ic) return { ...base, facilityType: "imaging", entityStatus: "pending" };

    const verified = Boolean(ic.is_verified);
    const status = normalizeStatus(ic.status);
    return {
      facilityType: "imaging",
      facilityId: ic.id,
      entityName: ic.name ?? undefined,
      entityStatus: verified ? "verified" : status,
    };
  }

  // Pharmacy
  if (role === "pharmacy_admin") {
    const { data } = await service.from("pharmacies").select("id,name,verified,verification_status").eq("admin_id", userId).maybeSingle();
    if (!data) return { ...base, facilityType: "pharmacy", entityStatus: "pending" };
    const verified = Boolean((data as any).verified);
    const status = normalizeStatus((data as any).verification_status);
    return {
      facilityType: "pharmacy",
      facilityId: (data as any).id,
      entityName: (data as any).name ?? undefined,
      entityStatus: verified ? "verified" : status,
    };
  }

  if (role === "pharmacy_staff" || role === "pharmacist") {
    const { data: staffRow } = await service
      .from("pharmacy_staff")
      .select("pharmacy_id, pharmacies(id,name,verified,verification_status)")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    const ph = (staffRow as any)?.pharmacies;
    if (!ph) return { ...base, facilityType: "pharmacy", entityStatus: "pending" };

    const verified = Boolean(ph.verified);
    const status = normalizeStatus(ph.verification_status);
    return {
      facilityType: "pharmacy",
      facilityId: ph.id,
      entityName: ph.name ?? undefined,
      entityStatus: verified ? "verified" : status,
    };
  }

  // Doctors/patients/etc.
  if (role === "doctor") return { ...base, facilityType: "doctor", entityStatus: "active" };
  if (role === "patient") return { ...base, facilityType: "none", entityStatus: "active" };
  if (role === "super_admin") return { ...base, facilityType: "none", entityStatus: "active" };

  return base;
}

async function ensureActiveRequest(
  service: ReturnType<typeof createClient>,
  facilityType: FacilityType,
  facilityId: string,
  userId: string,
  comment?: string
) {
  const { data: existing } = await service
    .from("facility_verification_requests")
    .select("id,status,created_at")
    .eq("facility_type", facilityType)
    .eq("facility_id", facilityId)
    .in("status", ["submitted", "in_review"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing && (existing as any[]).length > 0) {
    return { created: false, request: (existing as any[])[0] };
  }

  const { data: inserted, error } = await service
    .from("facility_verification_requests")
    .insert({
      facility_type: facilityType,
      facility_id: facilityId,
      requested_by: userId,
      status: "submitted",
      comment: comment ?? null,
    })
    .select("id,status,created_at")
    .single();

  if (error) throw error;
  return { created: true, request: inserted };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const service = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      body = { action: "get" };
    }

    const roles = await getRoles(service, user.id);
    const requestedRole = (body as any)?.role as AppRole | undefined;
    const role = requestedRole && roles.includes(requestedRole) ? requestedRole : pickPrimaryRole(roles);

    // Disallow spoofing a role they don't have
    if (requestedRole && !roles.includes(requestedRole)) {
      return json({ error: "Forbidden: role not assigned to user" }, 403);
    }

    const resolved = await resolveFacilityByRole(service, user.id, role);
    const unreadCount = await getUnreadCount(service, user.id);

    const action = (body as any)?.action ?? "get";

    if (action === "request_verification") {
      if (!resolved.facilityId || resolved.facilityType === "none" || resolved.facilityType === "doctor") {
        return json({ error: "No facility to verify for this role" }, 400);
      }

      const ensured = await ensureActiveRequest(
        service,
        resolved.facilityType,
        resolved.facilityId,
        user.id,
        (body as any)?.comment
      );

      return json({
        ok: true,
        role,
        facilityType: resolved.facilityType,
        facilityId: resolved.facilityId,
        request: ensured.request,
        created: ensured.created,
      });
    }

    // action === "get"
    return json({
      ok: true,
      role,
      facilityType: resolved.facilityType,
      entityId: resolved.facilityId ?? null,
      entityName: resolved.entityName ?? null,
      entityStatus: resolved.entityStatus,
      unreadCount,
    });
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
