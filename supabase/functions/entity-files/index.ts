// File: supabase/functions/entity-files/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EntityType = "practice" | "clinic" | "lab" | "imaging" | "pharmacy";

type CreateUploadReq = {
  action: "createUpload";
  entityType: EntityType;
  entityId: string;
  category: string; // e.g. verification|reports
  filename: string;
  contentType: string;
};

type ListReq = {
  action: "list";
  entityType: EntityType;
  entityId: string;
  category?: string; // optional; if omitted list all categories
};

type CreateDownloadReq = {
  action: "createDownload";
  entityType: EntityType;
  entityId: string;
  objectPath: string; // exact path in bucket
  expiresIn?: number; // seconds, default 600
};

type DeleteReq = {
  action: "delete";
  entityType: EntityType;
  entityId: string;
  objectPath: string;
};

type MarkUploadedReq = {
  action: "markUploaded";
  entityType: EntityType;
  entityId: string;
  objectPath: string;
  sizeBytes?: number;
};

type ReqBody = CreateUploadReq | ListReq | CreateDownloadReq | DeleteReq | MarkUploadedReq;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" };
  }
  return { ok: true as const, url, anon, service };
}

function sanitizeFilename(name: string) {
  const base = name.split("/").pop() || "file";
  // keep alnum, dot, dash, underscore; replace other with _
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  return cleaned || "file";
}

function normalizeEntityType(t: string): EntityType {
  const v = String(t || "").toLowerCase().trim();
  if (v === "practice" || v === "clinic" || v === "lab" || v === "imaging" || v === "pharmacy") return v as EntityType;
  throw new Error("Invalid entityType");
}

function normalizeCategory(c: string) {
  const v = String(c || "").toLowerCase().trim();
  if (!v) return "general";
  return v.replace(/[^a-z0-9._-]+/g, "_").slice(0, 50) || "general";
}

async function assertAccessAuthed(authed: ReturnType<typeof createClient>, entityType: EntityType, entityId: string) {
  // Prefer existing access RPC. This MUST exist from earlier phases.
  const accessType = entityType === "clinic" ? "practice" : entityType;

  const { data, error } = await authed.rpc("can_access_entity", {
    entity_type: accessType,
    entity_id: entityId,
  });

  if (error) throw error;
  if (!data) throw new Error("Forbidden");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const authed = createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  if (!body || !(body as any).action) return json({ ok: false, error: "Missing action" }, 400);

  const admin = createClient(env.url, env.service);

  try {
    const action = (body as any).action as ReqBody["action"];
    const entityType = normalizeEntityType((body as any).entityType);
    const entityId = String((body as any).entityId || "").trim();
    if (!entityId) return json({ ok: false, error: "Missing entityId" }, 400);

    await assertAccessAuthed(authed, entityType, entityId);

    const bucket = "entity-files";

    if (action === "createUpload") {
      const b = body as CreateUploadReq;
      const category = normalizeCategory(b.category);
      const filename = sanitizeFilename(b.filename || "file");
      const contentType = String(b.contentType || "application/octet-stream").trim();

      const fileId = crypto.randomUUID();
      const objectPath = `${entityType}/${entityId}/${category}/${fileId}_${filename}`;

      // create signed upload url using service role
      const { data: signed, error: signErr } = await admin.storage.from(bucket).createSignedUploadUrl(objectPath);
      if (signErr) throw signErr;

      // create metadata record (pending)
      const { error: insErr } = await admin.from("entity_files").insert({
        id: fileId,
        entity_type: entityType,
        entity_id: entityId,
        category,
        bucket_id: bucket,
        object_path: objectPath,
        original_filename: filename,
        content_type: contentType,
        status: "pending",
        created_by: userRes.user.id,
      });
      if (insErr) throw insErr;

      return json({
        ok: true,
        file: {
          id: fileId,
          bucket,
          objectPath,
          signedUrl: signed?.signedUrl,
          token: signed?.token,
          path: signed?.path,
          contentType,
        },
      });
    }

    if (action === "markUploaded") {
      const b = body as MarkUploadedReq;
      const objectPath = String(b.objectPath || "").trim();
      if (!objectPath) return json({ ok: false, error: "Missing objectPath" }, 400);

      // Ensure object belongs to this entity prefix
      const expectedPrefix = `${entityType}/${entityId}/`;
      if (!objectPath.startsWith(expectedPrefix)) return json({ ok: false, error: "Forbidden" }, 403);

      const { error: upErr } = await admin
        .from("entity_files")
        .update({
          status: "uploaded",
          size_bytes: typeof b.sizeBytes === "number" ? b.sizeBytes : null,
          updated_at: new Date().toISOString(),
        })
        .eq("bucket_id", bucket)
        .eq("object_path", objectPath);

      if (upErr) throw upErr;

      return json({ ok: true });
    }

    if (action === "list") {
      const b = body as ListReq;
      const category = b.category ? normalizeCategory(b.category) : null;

      const prefix = category
        ? `${entityType}/${entityId}/${category}/`
        : `${entityType}/${entityId}/`;

      const { data: meta, error: mErr } = await admin
        .from("entity_files")
        .select("id,category,bucket_id,object_path,original_filename,content_type,size_bytes,status,created_by,created_at,updated_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .like("object_path", `${prefix}%`)
        .neq("status", "deleted")
        .order("created_at", { ascending: false })
        .limit(200);

      if (mErr) throw mErr;

      return json({ ok: true, files: meta || [] });
    }

    if (action === "createDownload") {
      const b = body as CreateDownloadReq;
      const objectPath = String(b.objectPath || "").trim();
      if (!objectPath) return json({ ok: false, error: "Missing objectPath" }, 400);

      const expectedPrefix = `${entityType}/${entityId}/`;
      if (!objectPath.startsWith(expectedPrefix)) return json({ ok: false, error: "Forbidden" }, 403);

      const expiresIn = typeof b.expiresIn === "number" && b.expiresIn > 0 ? Math.min(b.expiresIn, 3600) : 600;

      const { data: signed, error: sErr } = await admin.storage.from(bucket).createSignedUrl(objectPath, expiresIn);
      if (sErr) throw sErr;

      return json({ ok: true, signedUrl: signed?.signedUrl, expiresIn });
    }

    if (action === "delete") {
      const b = body as DeleteReq;
      const objectPath = String(b.objectPath || "").trim();
      if (!objectPath) return json({ ok: false, error: "Missing objectPath" }, 400);

      const expectedPrefix = `${entityType}/${entityId}/`;
      if (!objectPath.startsWith(expectedPrefix)) return json({ ok: false, error: "Forbidden" }, 403);

      const { error: rmErr } = await admin.storage.from(bucket).remove([objectPath]);
      if (rmErr) throw rmErr;

      const { error: upErr } = await admin
        .from("entity_files")
        .update({ status: "deleted", updated_at: new Date().toISOString() })
        .eq("bucket_id", bucket)
        .eq("object_path", objectPath);

      if (upErr) throw upErr;

      return json({ ok: true });
    }

    return json({ ok: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    console.error("entity-files error:", e);
    const msg = e?.message || "Unknown error";
    if (msg.toLowerCase().includes("forbidden")) return json({ ok: false, error: "Forbidden" }, 403);
    return json({ ok: false, error: msg }, 500);
  }
});
