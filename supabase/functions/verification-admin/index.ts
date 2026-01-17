// Path: supabase/functions/verification-admin/index.ts
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
type SubmissionStatus = "draft" | "submitted" | "approved" | "rejected";

type ReqBody =
  | { action: "list"; status?: SubmissionStatus | "all"; limit?: number; offset?: number }
  | { action: "get"; id: string }
  | { action: "approve"; id: string; note?: string | null }
  | { action: "reject"; id: string; reason: string; note?: string | null };

async function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" };
  }
  return { ok: true as const, url, anon, service };
}

async function assertSuperAdmin(authed: ReturnType<typeof createClient>) {
  const { data, error } = await authed.rpc("is_super_admin");
  if (error) throw error;
  return Boolean(data);
}

function nowIso() {
  return new Date().toISOString();
}

function safeText(v: unknown, max = 2000) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

async function notifySubmitter(
  service: ReturnType<typeof createClient>,
  submission: any,
  title: string,
  body: string,
  level: "info" | "success" | "warning" | "error",
) {
  const submitter = submission?.submitted_by;
  const entityType = submission?.entity_type;
  const entityId = submission?.entity_id;
  if (!submitter || !entityType || !entityId) return;

  await service.rpc("notify_user", {
    p_user_id: submitter,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_role_scope: "submitter",
    p_level: level,
    p_title: title,
    p_body: body,
    p_action_url: `/verification/${entityType}`,
    p_metadata: {
      submissionId: submission.id,
      entityType,
      entityId,
      status: submission.status,
    },
  });
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

  try {
    const ok = await assertSuperAdmin(authed);
    if (!ok) return json({ ok: false, error: "Forbidden" }, 403);

    const service = createClient(env.url, env.service);

    if (body.action === "list") {
      const limit = Math.min(Math.max(body.limit ?? 25, 1), 200);
      const offset = Math.max(body.offset ?? 0, 0);
      const status = (body.status ?? "submitted") as any;

      let q = service
        .from("verification_submissions")
        .select(
          "id,entity_type,entity_id,submitted_by,status,submitted_at,created_at,updated_at,reviewed_by,reviewed_at,rejection_reason,payload",
          { count: "exact" },
        )
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status && status !== "all") {
        q = q.eq("status", status);
      }

      const { data, error, count } = await q;
      if (error) throw error;

      return json({ ok: true, submissions: data ?? [], total: count ?? 0, limit, offset });
    }

    if (body.action === "get") {
      if (!body.id) return json({ ok: false, error: "Missing id" }, 400);

      const { data, error } = await service
        .from("verification_submissions")
        .select("id,entity_type,entity_id,submitted_by,status,payload,submitted_at,created_at,updated_at,reviewed_by,reviewed_at,rejection_reason")
        .eq("id", body.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return json({ ok: false, error: "Not found" }, 404);

      return json({ ok: true, submission: data });
    }

    if (body.action === "approve") {
      if (!body.id) return json({ ok: false, error: "Missing id" }, 400);

      const { data: existing, error: exErr } = await service
        .from("verification_submissions")
        .select("id,entity_type,entity_id,submitted_by,status,payload")
        .eq("id", body.id)
        .maybeSingle();

      if (exErr) throw exErr;
      if (!existing) return json({ ok: false, error: "Not found" }, 404);

      if (existing.status !== "submitted") {
        return json({ ok: false, error: "Only submitted items can be approved" }, 400);
      }

      const { data: updated, error: upErr } = await service
        .from("verification_submissions")
        .update({
          status: "approved",
          reviewed_by: userRes.user.id,
          reviewed_at: nowIso(),
          rejection_reason: null,
        })
        .eq("id", body.id)
        .select("id,entity_type,entity_id,submitted_by,status,reviewed_by,reviewed_at,rejection_reason")
        .single();

      if (upErr) throw upErr;

      await notifySubmitter(
        service,
        { ...existing, ...updated },
        "Verification approved",
        safeText(body.note) || "Your verification has been approved.",
        "success",
      );

      return json({ ok: true, submission: updated });
    }

    if (body.action === "reject") {
      if (!body.id) return json({ ok: false, error: "Missing id" }, 400);
      if (!safeText(body.reason)) return json({ ok: false, error: "Missing rejection reason" }, 400);

      const { data: existing, error: exErr } = await service
        .from("verification_submissions")
        .select("id,entity_type,entity_id,submitted_by,status,payload")
        .eq("id", body.id)
        .maybeSingle();

      if (exErr) throw exErr;
      if (!existing) return json({ ok: false, error: "Not found" }, 404);

      if (existing.status !== "submitted") {
        return json({ ok: false, error: "Only submitted items can be rejected" }, 400);
      }

      const { data: updated, error: upErr } = await service
        .from("verification_submissions")
        .update({
          status: "rejected",
          reviewed_by: userRes.user.id,
          reviewed_at: nowIso(),
          rejection_reason: safeText(body.reason, 4000),
        })
        .eq("id", body.id)
        .select("id,entity_type,entity_id,submitted_by,status,reviewed_by,reviewed_at,rejection_reason")
        .single();

      if (upErr) throw upErr;

      const note = safeText(body.note);
      const msg = note
        ? `Rejected: ${safeText(body.reason)}\n\n${note}`
        : `Rejected: ${safeText(body.reason)}`;

      await notifySubmitter(service, { ...existing, ...updated }, "Verification rejected", msg, "warning");

      return json({ ok: true, submission: updated });
    }

    return json({ ok: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Failed" }, 500);
  }
});
