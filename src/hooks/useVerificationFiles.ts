// Path: src/hooks/useVerificationFiles.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EntityType = "clinic" | "lab" | "imaging" | "pharmacy";

export type VerificationFile = {
  id: string;
  submission_id: string | null;
  entity_type: EntityType;
  entity_id: string;
  uploaded_by: string;
  bucket: string;
  object_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  metadata: Record<string, unknown>;
  downloadUrl: string | null;
};

type CreateUploadResp = {
  ok: boolean;
  error?: string;
  file?: Omit<VerificationFile, "downloadUrl">;
  upload?: { path: string; token: string; signedUrl: string };
};

type ListResp = { ok: boolean; error?: string; files?: VerificationFile[] };
type RemoveResp = { ok: boolean; error?: string };

export function useVerificationFiles(params: { entityType: EntityType; entityId: string | null; submissionId?: string | null }) {
  const { entityType, entityId, submissionId } = params;

  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<VerificationFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!entityId) {
      setFiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("verification-files", {
        body: { action: "list", entityType, entityId, submissionId: submissionId ?? null },
      });
      if (fnErr) throw fnErr;

      const payload = data as ListResp;
      if (!payload?.ok) throw new Error(payload?.error || "Failed to list files");

      setFiles(payload.files || []);
    } catch (e: any) {
      setError(e?.message || "Failed to list files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, submissionId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!entityId) throw new Error("Missing entityId");

      const { data, error: fnErr } = await supabase.functions.invoke("verification-files", {
        body: {
          action: "create_upload",
          entityType,
          entityId,
          submissionId: submissionId ?? null,
          fileName: file.name,
          mimeType: file.type || null,
          sizeBytes: file.size || null,
        },
      });
      if (fnErr) throw fnErr;

      const payload = data as CreateUploadResp;
      if (!payload?.ok || !payload.upload?.signedUrl) throw new Error(payload?.error || "Failed to create upload URL");

      const res = await fetch(payload.upload.signedUrl, {
        method: "PUT",
        headers: {
          "content-type": file.type || "application/octet-stream",
          "x-upsert": "true",
        },
        body: file,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Upload failed (${res.status}): ${txt || res.statusText}`);
      }

      await refetch();
      return payload.file?.id ?? null;
    },
    [entityId, entityType, submissionId, refetch],
  );

  const removeFile = useCallback(
    async (id: string) => {
      const { data, error: fnErr } = await supabase.functions.invoke("verification-files", {
        body: { action: "remove", id },
      });
      if (fnErr) throw fnErr;

      const payload = data as RemoveResp;
      if (!payload?.ok) throw new Error(payload?.error || "Failed to remove file");

      await refetch();
    },
    [refetch],
  );

  return { loading, files, error, actions: { refetch, uploadFile, removeFile } };
}
