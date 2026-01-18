// File: supabase/functions/facility-verification/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FacilityType = "practice" | "lab" | "imaging" | "pharmacy";

type RequestBody =
  | {
      action: "get_draft";
      facility_type: FacilityType;
      facility_id: string;
    }
  | {
      action: "save_draft";
      facility_type: FacilityType;
      facility_id: string;
      payload: Record<string, unknown>;
    }
  | {
      action: "submit";
      facility_type: FacilityType;
      facility_id: string;
      payload?: Record<string, unknown>;
      comment?: string;
    }
  | {
      action: "get_status";
      facility_type: FacilityType;
      facility_id: string;
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as RequestBody;

    const facilityType = (body as any).facility_type as FacilityType | undefined;
    const facilityId = (body as any).facility_id as string | undefined;

    if (!facilityType || !facilityId) {
      return json({ error: "Missing facility_type or facility_id" }, 400);
    }

    if (!["practice", "lab", "imaging", "pharmacy"].includes(facilityType)) {
      return json({ error: "Invalid facility_type" }, 400);
    }

    // Helpers
    const ensureDraft = async () => {
      const { data: existing, error: selErr } = await userClient
        .from("facility_verification_drafts")
        .select("id, facility_type, facility_id, payload, created_by, updated_by, created_at, updated_at")
        .eq("facility_type", facilityType)
        .eq("facility_id", facilityId)
        .maybeSingle();

      if (selErr) throw selErr;
      if (existing) return existing;

      // Create empty draft (RLS ensures membership)
      const { data: inserted, error: insErr } = await userClient
        .from("facility_verification_drafts")
        .insert({
          facility_type: facilityType,
          facility_id: facilityId,
          created_by: user.id,
          updated_by: user.id,
          payload: {},
        })
        .select("id, facility_type, facility_id, payload, created_by, updated_by, created_at, updated_at")
        .single();

      if (insErr) throw insErr;
      return inserted;
    };

    const getActiveRequest = async () => {
      const { data, error } = await userClient
        .from("facility_verification_requests")
        .select("id, status, comment, rejection_reason, payload, created_at, updated_at, reviewed_at, reviewed_by")
        .eq("facility_type", facilityType)
        .eq("facility_id", facilityId)
        .in("status", ["submitted", "in_review", "approved", "rejected"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return (data && data.length > 0) ? data[0] : null;
    };

    // Action handling
    switch ((body as any).action) {
      case "get_draft": {
        const draft = await ensureDraft();
        const activeRequest = await getActiveRequest();
        return json({ ok: true, draft, active_request: activeRequest });
      }

      case "save_draft": {
        const payload = (body as any).payload as Record<string, unknown> | undefined;
        if (!payload || typeof payload !== "object") return json({ error: "Missing payload" }, 400);

        // Ensure draft exists first
        await ensureDraft();

        const { data: updated, error: updErr } = await userClient
          .from("facility_verification_drafts")
          .update({ payload, updated_by: user.id })
          .eq("facility_type", facilityType)
          .eq("facility_id", facilityId)
          .select("id, facility_type, facility_id, payload, created_by, updated_by, created_at, updated_at")
          .single();

        if (updErr) throw updErr;

        const activeRequest = await getActiveRequest();
        return json({ ok: true, draft: updated, active_request: activeRequest });
      }

      case "submit": {
        const comment = (body as any).comment as string | undefined;

        // Use provided payload, else draft payload
        let payload = (body as any).payload as Record<string, unknown> | undefined;

        if (!payload) {
          const draft = await ensureDraft();
          payload = (draft as any).payload || {};
        } else if (typeof payload !== "object") {
          return json({ error: "Invalid payload" }, 400);
        }

        // Check if active request exists (unique index prevents duplicates)
        const existing = await getActiveRequest();
        if (existing && ["submitted", "in_review"].includes(existing.status)) {
          return json({ ok: true, created: false, request: existing });
        }

        const { data: inserted, error: insErr } = await userClient
          .from("facility_verification_requests")
          .insert({
            facility_type: facilityType,
            facility_id: facilityId,
            requested_by: user.id,
            status: "submitted",
            comment: comment ?? null,
            payload,
          })
          .select("id, status, comment, rejection_reason, payload, created_at, updated_at")
          .single();

        if (insErr) throw insErr;

        return json({ ok: true, created: true, request: inserted });
      }

      case "get_status": {
        const draft = await ensureDraft();
        const activeRequest = await getActiveRequest();
        return json({ ok: true, draft, active_request: activeRequest });
      }

      default:
        return json({ error: "Invalid action" }, 400);
    }
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
