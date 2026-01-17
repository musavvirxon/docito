// Path: src/hooks/useAdminVerification.ts
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EntityType = "clinic" | "lab" | "imaging" | "pharmacy";
export type SubmissionStatus = "draft" | "submitted" | "approved" | "rejected";

export type VerificationSubmission = {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  submitted_by: string;
  status: SubmissionStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  payload: any;
};

type ListResp = {
  ok: boolean;
  error?: string;
  submissions?: VerificationSubmission[];
  total?: number;
  limit?: number;
  offset?: number;
};

type GetResp = {
  ok: boolean;
  error?: string;
  submission?: VerificationSubmission;
};

type MutResp = {
  ok: boolean;
  error?: string;
  submission?: Partial<VerificationSubmission>;
};

export function useAdminVerification() {
  const [loading, setLoading] = useState(false);

  const list = useCallback(
    async (params?: { status?: SubmissionStatus | "all"; limit?: number; offset?: number }) => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("verification-admin", {
          body: {
            action: "list",
            status: params?.status ?? "submitted",
            limit: params?.limit ?? 25,
            offset: params?.offset ?? 0,
          },
        });
        if (error) throw error;

        const payload = data as ListResp;
        if (!payload?.ok) throw new Error(payload?.error || "Failed to list submissions");

        return payload;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const get = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verification-admin", {
        body: { action: "get", id },
      });
      if (error) throw error;

      const payload = data as GetResp;
      if (!payload?.ok) throw new Error(payload?.error || "Failed to load submission");

      return payload.submission!;
    } finally {
      setLoading(false);
    }
  }, []);

  const approve = useCallback(async (id: string, note?: string | null) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verification-admin", {
        body: { action: "approve", id, note: note ?? null },
      });
      if (error) throw error;

      const payload = data as MutResp;
      if (!payload?.ok) throw new Error(payload?.error || "Failed to approve");

      return payload.submission!;
    } finally {
      setLoading(false);
    }
  }, []);

  const reject = useCallback(async (id: string, reason: string, note?: string | null) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verification-admin", {
        body: { action: "reject", id, reason, note: note ?? null },
      });
      if (error) throw error;

      const payload = data as MutResp;
      if (!payload?.ok) throw new Error(payload?.error || "Failed to reject");

      return payload.submission!;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, list, get, approve, reject };
}
