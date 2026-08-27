// File: src/hooks/useDoctorPaymentSubmissions.ts

import { useCallback, useEffect, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import type { FinanceEntityType } from "@/components/financial/FinanceHub";

export type PaymentSubmissionRow = {
  id: string;
  entity_type: FinanceEntityType;
  entity_id: string;
  user_id: string;
  payment_type: "rent_payment" | "commission_received";
  amount_cents: number;
  period_start: string | null;
  period_end: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

type Args =
  | { mode: "user"; userId?: string | null }
  | { mode: "entity"; entityType: FinanceEntityType; entityId: string };

export function useDoctorPaymentSubmissions(args: Args) {
  const [rows, setRows] = useState<PaymentSubmissionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const key = args.mode === "user" ? args.userId || "" : `${args.entityType}:${args.entityId}`;

  const load = useCallback(async () => {
    if (!key) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      let query = supabase
        .from("doctor_payment_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (args.mode === "user") {
        query = query.eq("user_id", (args as any).userId);
      } else {
        query = query
          .eq("entity_type", (args as any).entityType)
          .eq("entity_id", (args as any).entityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRows(((data || []) as any) as PaymentSubmissionRow[]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Doctor-side insert. Status is forced to pending by RLS anyway. */
  const submit = useCallback(
    async (payload: {
      entityType: FinanceEntityType;
      entityId: string;
      userId: string;
      paymentType: PaymentSubmissionRow["payment_type"];
      amountCents: number;
      periodStart?: string | null;
      periodEnd?: string | null;
      note?: string | null;
    }) => {
      const { error } = await supabase.from("doctor_payment_submissions").insert({
        entity_type: payload.entityType,
        entity_id: payload.entityId,
        user_id: payload.userId,
        payment_type: payload.paymentType,
        amount_cents: payload.amountCents,
        period_start: payload.periodStart ?? null,
        period_end: payload.periodEnd ?? null,
        note: payload.note || null,
        status: "pending",
      });
      if (error) throw error;
      await load();
    },
    [load],
  );

  /** Admin-side review — only status/review fields are writable (DB trigger enforces it). */
  const review = useCallback(
    async (id: string, status: "approved" | "rejected", reviewNote?: string | null) => {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("doctor_payment_submissions")
        .update({
          status,
          review_note: reviewNote || null,
          reviewed_by: authData?.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      await load();
    },
    [load],
  );

  return { rows, loading, refresh: load, submit, review };
}
