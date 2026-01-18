// File: src/hooks/useFacilityVerification.ts

import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "sonner";

export type FacilityType = "practice" | "lab" | "imaging" | "pharmacy";

export type FacilityVerificationRequestStatus =
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "cancelled";

export interface FacilityVerificationDraft {
  id: string;
  facility_type: FacilityType;
  facility_id: string;
  payload: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FacilityVerificationRequest {
  id: string;
  facility_type: FacilityType;
  facility_id: string;
  status: FacilityVerificationRequestStatus;
  comment?: string | null;
  rejection_reason?: string | null;
  payload: Record<string, any>;
  created_at: string;
  updated_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface VerificationDocumentRow {
  id: string;
  entity_type: string;
  entity_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  status?: string | null;
  rejection_reason?: string | null;
  created_at: string;
}

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE = 5 * 1024 * 1024;

export function useFacilityVerification(facilityType: FacilityType, facilityId: string | null) {
  const { uploadFile, uploading } = useFileUpload();

  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<FacilityVerificationDraft | null>(null);
  const [activeRequest, setActiveRequest] = useState<FacilityVerificationRequest | null>(null);
  const [documents, setDocuments] = useState<VerificationDocumentRow[]>([]);

  const canUse = useMemo(() => Boolean(facilityType && facilityId), [facilityType, facilityId]);

  const refresh = useCallback(async () => {
    if (!canUse || !facilityId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("facility-verification", {
        body: { action: "get_draft", facility_type: facilityType, facility_id: facilityId },
      });

      if (error) throw error;

      setDraft((data as any).draft ?? null);
      setActiveRequest((data as any).active_request ?? null);

      const { data: docs, error: docsErr } = await supabase
        .from("verification_documents" as any)
        .select("id, entity_type, entity_id, document_type, file_name, file_path, file_size, status, rejection_reason, created_at")
        .eq("entity_type", facilityType)
        .eq("entity_id", facilityId)
        .order("created_at", { ascending: false });

      if (docsErr) throw docsErr;

      setDocuments((docs as any[]) ?? []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load verification draft");
    } finally {
      setLoading(false);
    }
  }, [canUse, facilityId, facilityType]);

  const saveDraft = useCallback(
    async (payload: Record<string, any>) => {
      if (!canUse || !facilityId) return;

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("facility-verification", {
          body: { action: "save_draft", facility_type: facilityType, facility_id: facilityId, payload },
        });

        if (error) throw error;

        setDraft((data as any).draft ?? null);
        setActiveRequest((data as any).active_request ?? null);
        toast.success("Draft saved");
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to save draft");
      } finally {
        setLoading(false);
      }
    },
    [canUse, facilityId, facilityType]
  );

  const submit = useCallback(
    async (payload?: Record<string, any>, comment?: string) => {
      if (!canUse || !facilityId) return;

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("facility-verification", {
          body: {
            action: "submit",
            facility_type: facilityType,
            facility_id: facilityId,
            payload: payload ?? undefined,
            comment: comment ?? undefined,
          },
        });

        if (error) throw error;

        setActiveRequest((data as any).request ?? null);
        toast.success((data as any).created ? "Submitted for review" : "Already submitted");
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to submit verification request");
      } finally {
        setLoading(false);
      }
    },
    [canUse, facilityId, facilityType]
  );

  const uploadDocument = useCallback(
    async (documentType: string, file: File) => {
      if (!canUse || !facilityId) return;

      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Upload PDF, JPG, or PNG only");
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error("File size must be <= 5MB");
        return;
      }

      try {
        const uploadPath = `${facilityType}/${facilityId}/${documentType}_${Date.now()}_${file.name}`;
        const result = await uploadFile(file, "verification-documents", uploadPath);
        if (!result?.path) throw new Error("Upload failed");

        const { error: insErr } = await supabase.from("verification_documents" as any).insert({
          entity_type: facilityType,
          entity_id: facilityId,
          document_type: documentType,
          file_name: file.name,
          file_path: result.path,
          file_size: file.size,
          status: "pending",
        });

        if (insErr) throw insErr;

        toast.success("Document uploaded");
        await refresh();
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to upload document");
      }
    },
    [canUse, facilityId, facilityType, refresh, uploadFile]
  );

  return {
    loading,
    uploading,
    draft,
    activeRequest,
    documents,
    refresh,
    saveDraft,
    submit,
    uploadDocument,
  };
}
