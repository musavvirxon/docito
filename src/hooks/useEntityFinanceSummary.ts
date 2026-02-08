// File: src/hooks/useEntityFinanceSummary.ts

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FinanceEntityType } from "@/components/financial/FinanceHub";

type SummaryResponse = {
  ok: boolean;
  error?: string;
  entityType?: FinanceEntityType;
  entityId?: string;
  currency?: string;
  window?: {
    startUtc: string;
    endExclusiveUtc: string;
    days: number;
  };
  totals?: {
    entriesCount: number;
    incomeCents: number;
    expenseCents: number;
    netCents: number;
  };
  daily?: Array<{
    date: string;
    incomeCents: number;
    expenseCents: number;
    netCents: number;
  }>;
  breakdown?: {
    topIncomeCategories: Array<{
      categoryId: string | null;
      name: string;
      kind: string;
      amountCents: number;
      count: number;
    }>;
    topExpenseCategories: Array<{
      categoryId: string | null;
      name: string;
      kind: string;
      amountCents: number;
      count: number;
    }>;
  };
};

type UseEntityFinanceSummaryArgs = {
  entityType: FinanceEntityType;
  entityId: string;
  days: number;
};

export function useEntityFinanceSummary({ entityType, entityId, days }: UseEntityFinanceSummaryArgs) {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!entityType || !entityId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<SummaryResponse>("entity-finance-summary", {
        body: { entityType, entityId, days },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to load finance summary");

      setData(data);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data,
    loading,
    refresh: load,
  };
}
