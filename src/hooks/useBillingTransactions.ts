// File: src/hooks/useBillingTransactions.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BillingEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

export interface BillingTransaction {
  id: string;
  created_at: string;
  amount_cents: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  transaction_type: "charge" | "refund" | "adjustment";
  description: string | null;
  invoice_id: string | null;
  provider: string | null;
  provider_ref: string | null;
  metadata: Record<string, unknown> | null;
}

export interface BillingFilters {
  status?: BillingTransaction["status"];
  transactionType?: BillingTransaction["transaction_type"];
  entityType?: BillingEntityType;
  entityId?: string;
}

function asString(v: unknown) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function asNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asStatus(v: unknown): BillingTransaction["status"] {
  const s = asString(v).toLowerCase();
  if (s === "completed" || s === "pending" || s === "failed" || s === "refunded") return s;
  return "pending";
}

function asType(v: unknown): BillingTransaction["transaction_type"] {
  const s = asString(v).toLowerCase();
  if (s === "charge" || s === "refund" || s === "adjustment") return s;
  return "charge";
}

function normalizeTx(row: any): BillingTransaction {
  return {
    id: asString(row?.id),
    created_at: asString(row?.created_at),
    amount_cents: Math.trunc(asNumber(row?.amount_cents)),
    currency: asString(row?.currency || "USD") || "USD",
    status: asStatus(row?.status),
    transaction_type: asType(row?.transaction_type),
    description: row?.description ? asString(row.description) : null,
    invoice_id: row?.invoice_id ? asString(row.invoice_id) : null,
    provider: row?.provider ? asString(row.provider) : null,
    provider_ref: row?.provider_ref ? asString(row.provider_ref) : null,
    metadata: row?.metadata && typeof row.metadata === "object" ? row.metadata : null,
  };
}

// Back-compat signature (older call sites passed userId, practiceId)
export const useBillingTransactions = (_userId?: string, _practiceId?: string, filters?: BillingFilters) => {
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      let query = (supabase.from as any)("billing_transactions")
        .select(
          "id, created_at, amount_cents, currency, status, transaction_type, description, invoice_id, provider, provider_ref, metadata",
        )
        .order("created_at", { ascending: false });

      if (filters?.entityType) query = query.eq("entity_type", filters.entityType);
      if (filters?.entityId) query = query.eq("entity_id", filters.entityId);
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.transactionType) query = query.eq("transaction_type", filters.transactionType);

      const { data, error } = await query;
      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      setTransactions(rows.map(normalizeTx));
    } catch (error) {
      console.error("Error fetching billing transactions:", error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.entityType, filters?.entityId, filters?.status, filters?.transactionType]);

  const totals = useMemo(() => {
    const completed = transactions.filter((t) => t.status === "completed");
    const refunded = transactions.filter((t) => t.transaction_type === "refund" || t.status === "refunded");

    const totalRevenueCents = completed
      .filter((t) => t.transaction_type !== "refund")
      .reduce((sum, t) => sum + (t.amount_cents || 0), 0);

    const totalRefundsCents = refunded.reduce((sum, t) => sum + Math.abs(t.amount_cents || 0), 0);

    return {
      totalRevenueCents,
      totalRefundsCents,
      netRevenueCents: totalRevenueCents - totalRefundsCents,
    };
  }, [transactions]);

  return {
    transactions,
    isLoading,
    refetch: fetchTransactions,
    // Back-compat with existing UI: amounts are in cents
    totalRevenue: totals.totalRevenueCents,
    totalRefunds: totals.totalRefundsCents,
    netRevenue: totals.netRevenueCents,
    totals,
  };
};
