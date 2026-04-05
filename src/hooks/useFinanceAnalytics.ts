// File: src/hooks/useFinanceAnalytics.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FinanceEntityType } from "@/components/financial/FinanceHub";

type EntryType = "income" | "expense" | "payroll" | "transfer" | "adjustment";

export type FinanceAnalyticsResponse = {
  ok: boolean;
  error?: string;

  entityType: FinanceEntityType;
  entityId: string;

  range: { from: string; to: string };
  currency: string;

  totals: {
    incomeCents: number;
    expenseCents: number;
    payrollCents: number;
    opCostCents: number;
    netCents: number;
    payrollRatioBps: number;
    opCostRatioBps: number;
  };

  totalsByType: Record<EntryType, number>;

  topExpenseCategories: Array<{
    categoryId: string | null;
    name: string;
    kind: string;
    totalCents: number;
  }>;

  topIncomeCategories: Array<{
    categoryId: string | null;
    name: string;
    kind: string;
    totalCents: number;
  }>;

  series: Array<{
    day: string;
    incomeCents: number;
    expenseCents: number;
    payrollCents: number;
    netCents: number;
  }>;
};

type Args = {
  entityType: FinanceEntityType;
  entityId: string;
  from?: string;
  to?: string;
  locationId?: string;
};

export function useFinanceAnalytics({ entityType, entityId, from, to, locationId }: Args) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FinanceAnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(() => `${entityType}:${entityId}:${from || ""}:${to || ""}:${locationId || ""}`, [entityType, entityId, from, to, locationId]);

  const refresh = useCallback(async () => {
    if (!entityType || !entityId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: resp, error: fnErr } = await supabase.functions.invoke<FinanceAnalyticsResponse>(
        "finance-analytics",
        {
          body: {
            entityType,
            entityId,
            from: from || undefined,
            to: to || undefined,
            locationId: locationId || undefined,
            groupBy: "day",
          },
        },
      );

      if (fnErr) throw fnErr;
      if (!resp?.ok) throw new Error(resp?.error || "Failed to load analytics");

      setData(resp);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, from, to, locationId]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { loading, data, error, refresh };
}
