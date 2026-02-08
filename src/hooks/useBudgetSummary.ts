// File: src/hooks/useBudgetSummary.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FinanceEntityType } from "@/components/financial/FinanceHub";

export type BudgetSummaryRow = {
  categoryId: string;
  name: string;
  kind: "expense" | "payroll";
  budgetCents: number;
  actualCents: number;
  varianceCents: number;
};

export type BudgetSummaryResponse = {
  ok: boolean;
  error?: string;

  entityType: FinanceEntityType;
  entityId: string;

  monthStart: string;
  monthEndExclusive: string | null;

  currency: string;

  totals: {
    budgetCents: number;
    actualCents: number;
    varianceCents: number;
    uncategorizedCents: number;
  };

  rows: BudgetSummaryRow[];
};

type Args = {
  entityType: FinanceEntityType;
  entityId: string;
  monthStart: string; // YYYY-MM-DD
};

export function useBudgetSummary({ entityType, entityId, monthStart }: Args) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BudgetSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(() => `${entityType}:${entityId}:${monthStart}`, [entityType, entityId, monthStart]);

  const refresh = useCallback(async () => {
    if (!entityType || !entityId || !monthStart) return;

    setLoading(true);
    setError(null);

    try {
      const { data: resp, error: fnErr } = await supabase.functions.invoke<BudgetSummaryResponse>(
        "finance-budget-summary",
        {
          body: { entityType, entityId, monthStart },
        },
      );

      if (fnErr) throw fnErr;
      if (!resp?.ok) throw new Error(resp?.error || "Failed to load budget summary");

      setData(resp);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load budget summary");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, monthStart]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { loading, data, error, refresh };
}
