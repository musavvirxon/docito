// File: src/hooks/useBillingTransactions.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BillingTransaction {
  id: string;
  user_id: string;
  practice_id: string | null;
  appointment_id: string | null;
  subscription_id: string | null;
  payment_hold_id: string | null;
  amount: number;
  currency: string;
  transaction_type: "appointment_payment" | "subscription_payment" | "refund" | "hold_capture" | "hold_release" | "cancellation_fee";
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  description: string | null;
  provider_transaction_id: string | null;
  provider_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  entity_type?: string | null;
  entity_id?: string | null;
}

export type BillingFilters = {
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  entityType?: string;
  entityId?: string;
};

function isMissingColumnOrTable(error: unknown) {
  const msg = String((error as any)?.message ?? error ?? "");
  const m = msg.toLowerCase();
  return (
    msg.includes("Could not find the table") ||
    m.includes("schema cache") ||
    (m.includes("column") && m.includes("does not exist")) ||
    (m.includes("relation") && m.includes("does not exist"))
  );
}

export const useBillingTransactions = (userId?: string, practiceId?: string, filters?: BillingFilters) => {
  const enabled = Boolean(userId || practiceId || filters?.entityId || filters?.entityType);

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ["billing-transactions", userId ?? null, practiceId ?? null, filters?.startDate ?? null, filters?.endDate ?? null, filters?.entityType ?? null, filters?.entityId ?? null],
    queryFn: async () => {
      let query = supabase.from("billing_transactions").select("*").order("created_at", { ascending: false });

      if (userId) query = query.eq("user_id", userId);
      if (practiceId) query = query.eq("practice_id", practiceId);

      if (filters?.startDate) query = query.gte("created_at", filters.startDate);
      if (filters?.endDate) query = query.lte("created_at", filters.endDate);

      if (filters?.entityType) query = query.eq("entity_type", filters.entityType);
      if (filters?.entityId) query = query.eq("entity_id", filters.entityId);

      const { data, error } = await query;

      if (error) {
        // If entity columns/tables aren't present yet, avoid crashing the UI.
        if ((filters?.entityType || filters?.entityId) && isMissingColumnOrTable(error)) {
          return [] as BillingTransaction[];
        }
        throw error;
      }

      return (data ?? []) as BillingTransaction[];
    },
    enabled,
  });

  const totalRevenue =
    transactions?.reduce((sum, t) => {
      if (t.status === "completed" && ["appointment_payment", "subscription_payment", "hold_capture"].includes(t.transaction_type)) {
        return sum + t.amount;
      }
      return sum;
    }, 0) || 0;

  const totalRefunds =
    transactions?.reduce((sum, t) => {
      if (["refund", "hold_release"].includes(t.transaction_type) && t.status === "completed") {
        return sum + t.amount;
      }
      return sum;
    }, 0) || 0;

  return {
    transactions,
    isLoading,
    refetch,
    totalRevenue,
    totalRefunds,
    netRevenue: totalRevenue - totalRefunds,
  };
};
