// Path: supabase/functions/verification-submit/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

type EntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type ReqBody =
  | { action: "get_draft"; entityType: EntityType; entityId: string }
  | { action: "save_draft"; entityType: EntityType; entityId: string; payload: unknown }
  | { action: "submit"; entityType: EntityType; entityId: string; payload: unknown };

async function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" };
  }
  return { ok: true as const, url, anon, service };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, error: "Missing Authorization header" }, 401);

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

  if (!("entityType" in body) || !("entityId" in body)) return json({ ok: false, error: "Missing entityType/entityId" }, 400);
  const entityType = body.entityType;
  const entityId = body.entityId;

  const service = createClient(env.url, env.service);

  // Enforce entity access (do NOT trust RLS because we are using service role)
  const { data: hasAccess, error: accessErr } = await authed.rpc("has_entity_access", {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });

  if (accessErr) return json({ ok: false, error: accessErr.message }, 500);
  if (!hasAccess) return json({ ok: false, error: "Forbidden" }, 403);

  try {
    if (body.action === "get_draft") {
      const { data, error } = await service
        .from("verification_submissions")
        .select("id,entity_type,entity_id,submitted_by,status,payload,submitted_at,created_at,updated_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return json({ ok: true, draft: data ?? null });
    }

    if (body.action === "save_draft") {
      const payload = (body as any).payload ?? {};
      const { data, error } = await service
        .from("verification_submissions")
        .upsert(
          {
            entity_type: entityType,
            entity_id: entityId,
            submitted_by: userRes.user.id,
            status: "draft",
            payload,
            submitted_at: null,
          },
          { onConflict: "entity_type,entity_id" },
        )
        .select("id,entity_type,entity_id,submitted_by,status,payload,submitted_at,created_at,updated_at")
        .single();

      if (error) throw error;

      // notify entity admin that draft exists only when first created
      return json({ ok: true, draft: data });
    }

    if (body.action === "submit") {
      const payload = (body as any).payload ?? {};
      const submittedAt = new Date().toISOString();

      const { data: row, error } = await service
        .from("verification_submissions")
        .upsert(
          {
            entity_type: entityType,
            entity_id: entityId,
            submitted_by: userRes.user.id,
            status: "submitted",
            payload,
            submitted_at: submittedAt,
          },
          { onConflict: "entity_type,entity_id" },
        )
        .select("id,entity_type,entity_id,submitted_by,status,payload,submitted_at,created_at,updated_at")
        .single();

      if (error) throw error;

      // Best-effort: notify entity admin about submission
      let adminId: string | null = null;

      if (entityType === "clinic") {
        const { data } = await service.from("practices").select("admin_id").eq("id", entityId).maybeSingle();
        adminId = (data as any)?.admin_id ?? null;
      } else if (entityType === "lab") {
        const { data } = await service.from("lab_centers").select("admin_id").eq("id", entityId).maybeSingle();
        adminId = (data as any)?.admin_id ?? null;
      } else if (entityType === "imaging") {
        const { data } = await service.from("imaging_centers").select("admin_id").eq("id", entityId).maybeSingle();
        adminId = (data as any)?.admin_id ?? null;
      } else if (entityType === "pharmacy") {
        const { data } = await service.from("pharmacies").select("admin_id").eq("id", entityId).maybeSingle();
        adminId = (data as any)?.admin_id ?? null;
      }

      if (adminId) {
        await service.rpc("notify_user", {
          p_user_id: adminId,
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_role_scope: "admin",
          p_level: "info",
          p_title: "Verification submitted",
          p_body: "A verification submission was submitted and is awaiting review.",
          p_action_url: `/verification/${entityType}`,
          p_metadata: { entityType, entityId, submissionId: row.id },
        });
      }

      return json({ ok: true, submission: row });
    }

    return json({ ok: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Failed" }, 500);
  }
});
