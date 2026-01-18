// File: supabase/functions/facility-verification-admin/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FacilityType = "practice" | "lab" | "imaging" | "pharmacy";
type RequestStatus = "submitted" | "in_review" | "approved" | "rejected" | "cancelled";

type RequestBody =
  | {
      action: "list";
      facility_type?: FacilityType;
      status?: RequestStatus | "all";
      limit?: number;
    }
  | {
      action: "set_status";
      request_id: string;
      status: RequestStatus;
      comment?: string;
      rejection_reason?: string;
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

async function isSuperAdmin(service: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error) return false;
  return !!data;
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    // Verify user via anon client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    // Use service role for admin operations
    const service = createClient(supabaseUrl, serviceKey);

    const ok = await isSuperAdmin(service, user.id);
    if (!ok) return json({ error: "Forbidden: super_admin required" }, 403);

    const body = (await req.json()) as RequestBody;

    if ((body as any).action === "list") {
      const facilityType = (body as any).facility_type as FacilityType | undefined;
      const status = ((body as any).status ?? "all") as RequestStatus | "all";
      const limit = Math.min(Math.max(Number((body as any).limit ?? 100), 1), 500);

      let q = service
        .from("facility_verification_requests")
        .select(
          "id, facility_type, facility_id, requested_by, status, comment, rejection_reason, payload, reviewed_by, reviewed_at, created_at, updated_at"
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (facilityType) q = q.eq("facility_type", facilityType);
      if (status !== "all") q = q.eq("status", status);

      const { data: requests, error } = await q;
      if (error) throw error;

      const reqs = requests ?? [];

      // Hydrate facility names/admins
      const byType: Record<FacilityType, string[]> = {
        practice: [],
        lab: [],
        imaging: [],
        pharmacy: [],
      };

      for (const r of reqs as any[]) {
        if (byType[r.facility_type as FacilityType]) byType[r.facility_type as FacilityType].push(r.facility_id);
      }

      const practiceIds = uniq(byType.practice);
      const labIds = uniq(byType.lab);
      const imagingIds = uniq(byType.imaging);
      const pharmacyIds = uniq(byType.pharmacy);

      const [practicesRes, labsRes, imagingRes, pharmaciesRes] = await Promise.all([
        practiceIds.length
          ? service.from("practices").select("id,name,admin_id,is_verified,status,verification_status").in("id", practiceIds)
          : Promise.resolve({ data: [] as any[], error: null as any }),
        labIds.length
          ? service.from("lab_centers").select("id,name,admin_id,is_verified,status").in("id", labIds)
          : Promise.resolve({ data: [] as any[], error: null as any }),
        imagingIds.length
          ? service.from("imaging_centers").select("id,name,admin_id,is_verified,status").in("id", imagingIds)
          : Promise.resolve({ data: [] as any[], error: null as any }),
        pharmacyIds.length
          ? service.from("pharmacies").select("id,name,admin_id,verified,verification_status,status").in("id", pharmacyIds)
          : Promise.resolve({ data: [] as any[], error: null as any }),
      ]);

      if (practicesRes.error) throw practicesRes.error;
      if (labsRes.error) throw labsRes.error;
      if (imagingRes.error) throw imagingRes.error;
      if (pharmaciesRes.error) throw pharmaciesRes.error;

      const practiceMap = new Map((practicesRes.data ?? []).map((x: any) => [x.id, x]));
      const labMap = new Map((labsRes.data ?? []).map((x: any) => [x.id, x]));
      const imagingMap = new Map((imagingRes.data ?? []).map((x: any) => [x.id, x]));
      const pharmacyMap = new Map((pharmaciesRes.data ?? []).map((x: any) => [x.id, x]));

      const enriched = (reqs as any[]).map((r) => {
        let facility: any = null;
        if (r.facility_type === "practice") facility = practiceMap.get(r.facility_id) ?? null;
        if (r.facility_type === "lab") facility = labMap.get(r.facility_id) ?? null;
        if (r.facility_type === "imaging") facility = imagingMap.get(r.facility_id) ?? null;
        if (r.facility_type === "pharmacy") facility = pharmacyMap.get(r.facility_id) ?? null;

        return {
          ...r,
          facility_name: facility?.name ?? null,
          facility_admin_id: facility?.admin_id ?? null,
          facility_snapshot: facility,
        };
      });

      return json({ ok: true, requests: enriched });
    }

    if ((body as any).action === "set_status") {
      const requestId = (body as any).request_id as string | undefined;
      const status = (body as any).status as RequestStatus | undefined;
      const comment = (body as any).comment as string | undefined;
      const rejectionReason = (body as any).rejection_reason as string | undefined;

      if (!requestId || !status) return json({ error: "Missing request_id or status" }, 400);
      if (!["submitted", "in_review", "approved", "rejected", "cancelled"].includes(status)) {
        return json({ error: "Invalid status" }, 400);
      }

      // Load request
      const { data: reqRow, error: reqErr } = await service
        .from("facility_verification_requests")
        .select("id, facility_type, facility_id, status, payload")
        .eq("id", requestId)
        .single();

      if (reqErr) throw reqErr;

      const facilityType = (reqRow as any).facility_type as FacilityType;
      const facilityId = (reqRow as any).facility_id as string;

      // Update request row
      const { data: updatedReq, error: updErr } = await service
        .from("facility_verification_requests")
        .update({
          status,
          comment: comment ?? null,
          rejection_reason: status === "rejected" ? (rejectionReason ?? "Rejected") : null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select("id, facility_type, facility_id, status, comment, rejection_reason, reviewed_by, reviewed_at, payload, created_at, updated_at")
        .single();

      if (updErr) throw updErr;

      // Apply facility state changes on approve/reject
      if (status === "approved") {
        if (facilityType === "practice") {
          await service
            .from("practices")
            .update({ is_verified: true, verification_status: "verified", status: "active" })
            .eq("id", facilityId);
        } else if (facilityType === "pharmacy") {
          await service
            .from("pharmacies")
            .update({ verified: true, verification_status: "verified", status: "verified" })
            .eq("id", facilityId);
        } else if (facilityType === "lab") {
          await service
            .from("lab_centers")
            .update({ is_verified: true, status: "active" })
            .eq("id", facilityId);
        } else if (facilityType === "imaging") {
          await service
            .from("imaging_centers")
            .update({ is_verified: true, status: "active" })
            .eq("id", facilityId);
        }
      }

      if (status === "rejected") {
        if (facilityType === "practice") {
          await service
            .from("practices")
            .update({ is_verified: false, verification_status: "rejected" })
            .eq("id", facilityId);
        } else if (facilityType === "pharmacy") {
          await service
            .from("pharmacies")
            .update({ verified: false, verification_status: "rejected" })
            .eq("id", facilityId);
        } else if (facilityType === "lab") {
          await service
            .from("lab_centers")
            .update({ is_verified: false, status: "pending" })
            .eq("id", facilityId);
        } else if (facilityType === "imaging") {
          await service
            .from("imaging_centers")
            .update({ is_verified: false, status: "pending" })
            .eq("id", facilityId);
        }
      }

      // Audit log
      await service.from("entity_audit_logs").insert({
        entity_type: facilityType,
        entity_id: facilityId,
        action: `facility_verification_${status}`,
        actor_id: user.id,
        new_values: { request_status: status },
        metadata: { request_id: requestId, comment: comment ?? null, rejection_reason: rejectionReason ?? null },
      });

      return json({ ok: true, request: updatedReq });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
