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

type EdgeBillingRes = {
  ok: boolean;
  error?: string;
  transactions?: any[];
};

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
  if (s === "succeeded") return "completed";
  if (s === "canceled" || s === "cancelled") return "failed";
  return "pending";
}

function asType(v: unknown): BillingTransaction["transaction_type"] {
  const s = asString(v).toLowerCase();
  if (s === "charge" || s === "refund" || s === "adjustment") return s;
  if (s === "payment") return "charge";
  return "charge";
}

function normalizeTx(row: any): BillingTransaction {
  const meta = row?.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : null;
  const description =
    row?.description != null
      ? asString(row.description)
      : meta?.description != null
        ? asString(meta.description)
        : null;

  return {
    id: asString(row?.id),
    created_at: asString(row?.created_at),
    amount_cents: Math.trunc(asNumber(row?.amount_cents)),
    currency: (asString(row?.currency || "usd") || "usd").toLowerCase(),
    status: asStatus(row?.status),
    transaction_type: asType(row?.transaction_type),
    description,
    invoice_id: row?.invoice_id ? asString(row.invoice_id) : null,
    provider: row?.provider ? asString(row.provider) : null,
    provider_ref: row?.provider_ref ? asString(row.provider_ref) : null,
    metadata: meta,
  };
}

function applyClientFilters(list: BillingTransaction[], filters?: BillingFilters) {
  let out = list;
  if (filters?.status) out = out.filter((t) => t.status === filters.status);
  if (filters?.transactionType) out = out.filter((t) => t.transaction_type === filters.transactionType);
  return out;
}

async function fetchViaEdge(entityType: BillingEntityType, entityId: string): Promise<BillingTransaction[]> {
  if (entityType === "clinic") {
    const { data, error } = await supabase.functions.invoke<EdgeBillingRes>("entity-dashboard", {
      body: { action: "billing", entityType: "clinic", entityId, limit: 200 },
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Failed to load billing");
    return Array.isArray(data.transactions) ? data.transactions.map(normalizeTx) : [];
  }

  const { data, error } = await supabase.functions.invoke<EdgeBillingRes>("facility-billing", {
    body: { entityType, entityId, limit: 200 },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Failed to load billing");
  return Array.isArray(data.transactions) ? data.transactions.map(normalizeTx) : [];
}

// Support both new object style and legacy positional args
export const useBillingTransactions = (
  arg1?: string | BillingFilters,
  arg2?: string,
  arg3?: BillingFilters
) => {
  // Detect call signature
  const filters: BillingFilters | undefined =
    typeof arg1 === "object" ? arg1 : arg3;
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const entityType = filters?.entityType;
      const entityId = filters?.entityId;

      // Prefer edge functions for clinic + facilities (explicit authz + service-role reads).
      if (entityType && entityId) {
        const rows = await fetchViaEdge(entityType, entityId);
        setTransactions(applyClientFilters(rows, filters));
        return;
      }

      // Fallback: direct queries (patient-scoped or legacy call sites).
      let query = (supabase.from as any)("billing_transactions")
        .select(
          "id, created_at, amount_cents, currency, status, transaction_type, description, invoice_id, provider, provider_ref, metadata",
        )
        .order("created_at", { ascending: false })
        .limit(200);

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
    void fetchTransactions();
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
