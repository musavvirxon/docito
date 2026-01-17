// Path: supabase/functions/verification-files/index.ts
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
  | {
      action: "create_upload";
      entityType: EntityType;
      entityId: string;
      submissionId?: string | null;
      fileName: string;
      mimeType?: string | null;
      sizeBytes?: number | null;
    }
  | {
      action: "list";
      entityType: EntityType;
      entityId: string;
      submissionId?: string | null;
    }
  | {
      action: "remove";
      id: string; // verification_files.id
    };

async function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" };
  }
  return { ok: true as const, url, anon, service };
}

function safeName(name: unknown) {
  const s = String(name ?? "").trim();
  const cleaned = s.replace(/[^\w.\-() ]+/g, "_").replace(/\s+/g, " ").slice(0, 180).trim();
  return cleaned || "file";
}

function uuid() {
  return crypto.randomUUID();
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

  const service = createClient(env.url, env.service);

  try {
    // Super admin check (best-effort; used only for remove)
    const isSuperAdmin = async () => {
      const { data, error } = await authed.rpc("is_super_admin");
      if (error) return false;
      return Boolean(data);
    };

    if (body.action === "create_upload") {
      const entityType = body.entityType;
      const entityId = String(body.entityId ?? "").trim();
      const submissionId = body.submissionId ? String(body.submissionId).trim() : null;
      const fileName = safeName(body.fileName);
      const mimeType = body.mimeType ? String(body.mimeType).trim() : null;
      const sizeBytes = typeof body.sizeBytes === "number" ? Math.max(0, Math.floor(body.sizeBytes)) : null;

      if (!entityType || !entityId || !fileName) return json({ ok: false, error: "Missing entityType/entityId/fileName" }, 400);

      const { data: hasAccess, error: accessErr } = await authed.rpc("has_entity_access", {
        p_entity_type: entityType,
        p_entity_id: entityId,
      });

      if (accessErr) return json({ ok: false, error: accessErr.message }, 500);
      if (!hasAccess) return json({ ok: false, error: "Forbidden" }, 403);

      const bucket = "verification-docs";
      const key = `${entityType}/${entityId}/${submissionId || "draft"}/${uuid()}-${fileName}`;

      const { data: signed, error: sErr } = await service.storage.from(bucket).createSignedUploadUrl(key);
      if (sErr) throw sErr;

      const { data: row, error: iErr } = await service
        .from("verification_files")
        .insert({
          submission_id: submissionId,
          entity_type: entityType,
          entity_id: entityId,
          uploaded_by: userRes.user.id,
          bucket,
          object_path: key,
          file_name: fileName,
          mime_type: mimeType,
          size_bytes: sizeBytes,
          metadata: { source: "verification-files:create_upload" },
        })
        .select("id,submission_id,entity_type,entity_id,uploaded_by,bucket,object_path,file_name,mime_type,size_bytes,created_at,metadata")
        .single();

      if (iErr) throw iErr;

      return json({
        ok: true,
        file: row,
        upload: {
          path: signed.path,
          token: signed.token,
          signedUrl: signed.signedUrl,
        },
      });
    }

    if (body.action === "list") {
      const entityType = body.entityType;
      const entityId = String(body.entityId ?? "").trim();
      const submissionId = body.submissionId ? String(body.submissionId).trim() : null;

      if (!entityType || !entityId) return json({ ok: false, error: "Missing entityType/entityId" }, 400);

      const { data: hasAccess, error: accessErr } = await authed.rpc("has_entity_access", {
        p_entity_type: entityType,
        p_entity_id: entityId,
      });

      if (accessErr) return json({ ok: false, error: accessErr.message }, 500);
      if (!hasAccess) return json({ ok: false, error: "Forbidden" }, 403);

      let q = service
        .from("verification_files")
        .select("id,submission_id,entity_type,entity_id,uploaded_by,bucket,object_path,file_name,mime_type,size_bytes,created_at,metadata")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (submissionId) q = q.eq("submission_id", submissionId);
      const { data: rows, error: rErr } = await q;
      if (rErr) throw rErr;

      // Create short-lived signed download URLs (15 minutes)
      const withUrls = [];
      for (const f of rows ?? []) {
        const { data: dl, error: dlErr } = await service.storage.from(f.bucket).createSignedUrl(f.object_path, 60 * 15);
        if (dlErr) {
          withUrls.push({ ...f, downloadUrl: null });
        } else {
          withUrls.push({ ...f, downloadUrl: dl.signedUrl });
        }
      }

      return json({ ok: true, files: withUrls });
    }

    if (body.action === "remove") {
      const id = String(body.id ?? "").trim();
      if (!id) return json({ ok: false, error: "Missing id" }, 400);

      const { data: file, error: fErr } = await service
        .from("verification_files")
        .select("id,entity_type,entity_id,uploaded_by,bucket,object_path,file_name")
        .eq("id", id)
        .maybeSingle();

      if (fErr) throw fErr;
      if (!file) return json({ ok: false, error: "Not found" }, 404);

      const { data: hasAccess, error: accessErr } = await authed.rpc("has_entity_access", {
        p_entity_type: file.entity_type,
        p_entity_id: file.entity_id,
      });
      if (accessErr) return json({ ok: false, error: accessErr.message }, 500);

      const superAdmin = await isSuperAdmin();
      const isUploader = file.uploaded_by === userRes.user.id;

      if (!hasAccess) return json({ ok: false, error: "Forbidden" }, 403);
      if (!superAdmin && !isUploader) return json({ ok: false, error: "Forbidden" }, 403);

      const { error: delObjErr } = await service.storage.from(file.bucket).remove([file.object_path]);
      if (delObjErr) throw delObjErr;

      const { error: delRowErr } = await service.from("verification_files").delete().eq("id", id);
      if (delRowErr) throw delRowErr;

      return json({ ok: true });
    }

    return json({ ok: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed" }, 500);
  }
});
