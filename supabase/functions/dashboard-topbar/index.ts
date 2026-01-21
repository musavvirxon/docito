// PATH: supabase/functions/dashboard-topbar/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AppRole =
  | "patient"
  | "doctor"
  | "staff"
  | "admin"
  | "clinic_admin"
  | "super_admin"
  | "lab_staff"
  | "lab_admin"
  | "imaging_staff"
  | "imaging_admin"
  | "pharmacy_staff"
  | "pharmacy_admin";

type FacilityType = "practice" | "lab" | "imaging" | "pharmacy" | "doctor" | "none";
type EntityStatus = "active" | "pending" | "verified" | "suspended" | "unknown";

type GetReq = { action: "get"; role: AppRole };
type RequestVerificationReq = { action: "request_verification"; role: AppRole; comment?: string | null };
type ReqBody = GetReq | RequestVerificationReq;

type GetResp = {
  ok: true;
  role: AppRole;
  facilityType: FacilityType;
  entityId: string | null;
  entityName: string | null;
  entityStatus: EntityStatus;
  unreadCount: number;
};

function json(data: unknown, status = 200) {
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

function normRole(r: unknown): AppRole {
  return String(r || "").toLowerCase().trim() as AppRole;
}

async function authedUserClient(url: string, anon: string, authHeader: string) {
  const c = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await c.auth.getUser();
  if (error || !data?.user) throw new Error("Unauthorized");
  return { client: c, user: data.user };
}

function normalizeEntityStatus(v: unknown): EntityStatus {
  const s = String(v || "").toLowerCase().trim();
  if (s.includes("verif") && s.includes("pend")) return "pending";
  if (s === "pending") return "pending";
  if (s === "verified" || s === "approved" || s === "active_verified") return "verified";
  if (s === "suspended" || s === "blocked" || s === "inactive") return "suspended";
  if (s === "active") return "active";
  return "unknown";
}

function statusFromBoolVerified(verified: unknown): EntityStatus {
  return Boolean(verified) ? "verified" : "pending";
}

function statusFromFacilityRow(status: unknown, isVerified: unknown): EntityStatus {
  const s = String(status || "").toLowerCase().trim();
  if (s === "suspended" || s === "blocked" || s === "inactive") return "suspended";
  if (Boolean(isVerified)) return "verified";
  if (s === "active") return "active";
  if (s === "pending" || s === "") return "pending";
  return normalizeEntityStatus(s);
}

async function resolveEntity(
  service: any,
  userId: string,
  role: AppRole,
): Promise<{ facilityType: FacilityType; entityId: string | null; entityName: string | null; entityStatus: EntityStatus }> {
  if (role === "super_admin") {
    return { facilityType: "none", entityId: null, entityName: "Super Admin", entityStatus: "active" };
  }

  // Practice owner/admin (clinic_admin behaves like admin for entity context)
  if (role === "admin" || role === "clinic_admin") {
    const { data, error } = await service
      .from("practices")
      .select("id,name,verified")
      .eq("admin_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    if (!(data as any)?.id) return { facilityType: "practice", entityId: null, entityName: null, entityStatus: "unknown" };

    return {
      facilityType: "practice",
      entityId: (data as any).id,
      entityName: ((data as any).name || "Practice") as string,
      entityStatus: statusFromBoolVerified((data as any).verified),
    };
  }

  // Lab staff/admin
  if (role === "lab_staff" || role === "lab_admin") {
    const { data: row, error: sErr } = await service
      .from("lab_staff")
      .select("lab_center_id,status")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sErr) throw sErr;

    const labId = (row as any)?.lab_center_id || (row as any)?.lab_id || null;
    if (!labId) return { facilityType: "lab", entityId: null, entityName: null, entityStatus: "unknown" };

    const { data: lab, error: lErr } = await service
      .from("lab_centers")
      .select("id,name,status,is_verified")
      .eq("id", labId)
      .maybeSingle();
    if (lErr) throw lErr;

    return {
      facilityType: "lab",
      entityId: (lab as any)?.id ?? labId,
      entityName: (lab as any)?.name ?? "Lab",
      entityStatus: statusFromFacilityRow((lab as any)?.status, (lab as any)?.is_verified),
    };
  }

  // Imaging staff/admin
  if (role === "imaging_staff" || role === "imaging_admin") {
    const { data: row, error: sErr } = await service
      .from("imaging_staff")
      .select("imaging_center_id,status")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sErr) throw sErr;

    const centerId = (row as any)?.imaging_center_id || null;
    if (!centerId) return { facilityType: "imaging", entityId: null, entityName: null, entityStatus: "unknown" };

    const { data: center, error: cErr } = await service
      .from("imaging_centers")
      .select("id,name,status,is_verified")
      .eq("id", centerId)
      .maybeSingle();
    if (cErr) throw cErr;

    return {
      facilityType: "imaging",
      entityId: (center as any)?.id ?? centerId,
      entityName: (center as any)?.name ?? "Imaging Center",
      entityStatus: statusFromFacilityRow((center as any)?.status, (center as any)?.is_verified),
    };
  }

  // Pharmacy staff/admin
  if (role === "pharmacy_staff" || role === "pharmacy_admin") {
    const { data: row, error: sErr } = await service
      .from("pharmacy_staff")
      .select("pharmacy_id,status")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sErr) throw sErr;

    const pharmacyId = (row as any)?.pharmacy_id || null;
    if (!pharmacyId) return { facilityType: "pharmacy", entityId: null, entityName: null, entityStatus: "unknown" };

    const { data: ph, error: pErr } = await service
      .from("pharmacies")
      .select("id,name,verification_status,verified")
      .eq("id", pharmacyId)
      .maybeSingle();
    if (pErr) throw pErr;

    const status = (ph as any)?.verification_status ?? (Boolean((ph as any)?.verified) ? "verified" : "pending");

    return {
      facilityType: "pharmacy",
      entityId: (ph as any)?.id ?? pharmacyId,
      entityName: (ph as any)?.name ?? "Pharmacy",
      entityStatus: normalizeEntityStatus(status),
    };
  }

  // Doctor (topbar identity only)
  if (role === "doctor") {
    const { data: prof, error } = await service
      .from("profiles")
      .select("user_id,full_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;

    const name = (prof as any)?.full_name || "Doctor";

    return { facilityType: "doctor", entityId: userId, entityName: name, entityStatus: "active" };
  }

  return { facilityType: "none", entityId: null, entityName: null, entityStatus: "unknown" };
}

function verificationRouteForFacility(f: FacilityType) {
  if (f === "practice") return "/dashboard/verify";
  if (f === "lab") return "/lab/verification";
  if (f === "imaging") return "/imaging/verification";
  if (f === "pharmacy") return "/pharmacy/verification";
  return "/dashboard/verify";
}

function entityTypeForFacility(f: FacilityType): "practice" | "lab" | "imaging" | "pharmacy" | null {
  if (f === "practice") return "practice";
  if (f === "lab") return "lab";
  if (f === "imaging") return "imaging";
  if (f === "pharmacy") return "pharmacy";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const url = requireEnv("SUPABASE_URL");
    const anon = requireEnv("SUPABASE_ANON_KEY");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

    const { user } = await authedUserClient(url, anon, authHeader);

    const body = (await req.json().catch(() => null)) as ReqBody | null;
    if (!body?.action) return json({ ok: false, error: "Missing action" }, 400);

    const role = normRole((body as any).role);

    const service = createClient(url, serviceKey, { auth: { persistSession: false } });
    const entity = await resolveEntity(service, user.id, role);

    // Fetch unread count with graceful fallback
    let unreadCount = 0;
    try {
      const { data, error: unreadErr } = await createClient(url, anon, {
        global: { headers: { Authorization: authHeader } },
      }).rpc("get_my_unread_notifications_count");
      if (!unreadErr && typeof data === "number") {
        unreadCount = data;
      }
    } catch {
      // Fallback to 0 if RPC fails
    }

    if (body.action === "get") {
      const resp: GetResp = {
        ok: true,
        role,
        facilityType: entity.facilityType,
        entityId: entity.entityId,
        entityName: entity.entityName,
        entityStatus: entity.entityStatus,
        unreadCount: Number(unreadCount || 0),
      };
      return json(resp);
    }

    if (body.action === "request_verification") {
      if (!entity.entityId || entity.facilityType === "none" || entity.facilityType === "doctor") {
        return json({ ok: false, error: "No entity available for verification" }, 400);
      }

      const entityType = entityTypeForFacility(entity.facilityType);
      if (!entityType) return json({ ok: false, error: "Invalid entity for verification" }, 400);

      const authed = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
      const { data: reqId, error: reqErr } = await authed.rpc("request_entity_verification", {
        p_entity_type: entityType,
        p_entity_id: entity.entityId,
        p_comment: (body as RequestVerificationReq).comment ?? null,
      });
      if (reqErr) throw reqErr;

      const { data: superAdmins, error: saErr } = await service.from("user_roles").select("user_id").eq("role", "super_admin");
      if (saErr) throw saErr;

      const actionUrl = verificationRouteForFacility(entity.facilityType);
      const title = `Verification request: ${entity.entityName || entity.facilityType}`;
      const note =
        ((body as RequestVerificationReq).comment || "").trim() ||
        "A verification request was submitted. Review uploaded documents and approve/reject.";

      const ids = (superAdmins || []).map((r: any) => r.user_id).filter(Boolean);

      for (const adminUserId of ids) {
        await service.rpc("create_notification", {
          p_user_id: adminUserId,
          p_entity_type: entityType,
          p_entity_id: entity.entityId,
          p_level: "info",
          p_title: title,
          p_body: note,
          p_action_url: actionUrl,
        });
      }

      await service.rpc("write_audit_log", {
        p_entity_type: entityType,
        p_entity_id: entity.entityId,
        p_action: "verification_request_submitted",
        p_actor_id: user.id,
        p_old_values: null,
        p_new_values: { request_id: reqId },
        p_metadata: { comment: (body as RequestVerificationReq).comment ?? null, route: actionUrl },
      });

      return json({ ok: true, requestId: reqId });
    }

    return json({ ok: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    const msg = e?.message || "Unknown error";
    const lower = String(msg).toLowerCase();
    if (lower.includes("unauthorized")) return json({ ok: false, error: "Unauthorized" }, 401);
    if (lower.includes("forbidden")) return json({ ok: false, error: "Forbidden" }, 403);
    return json({ ok: false, error: msg }, 500);
  }
});
