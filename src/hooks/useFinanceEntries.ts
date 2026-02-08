// File: src/hooks/useFinanceEntries.ts

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FinanceEntityType } from "@/components/financial/FinanceHub";
import type { FinanceEntryRow } from "@/components/financial/FinanceEntryDialog";

type EntryType = "income" | "expense" | "transfer" | "adjustment" | "payroll";

type UseFinanceEntriesArgs = {
  entityType: FinanceEntityType;
  entityId: string;
  entryType?: EntryType;
  limit?: number;
};

export function useFinanceEntries({ entityType, entityId, entryType, limit = 200 }: UseFinanceEntriesArgs) {
  const [rows, setRows] = useState<FinanceEntryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState("USD");

  const load = useCallback(async () => {
    if (!entityType || !entityId) return;

    setLoading(true);
    try {
      let q = supabase
        .from("finance_entries")
        .select("id, entry_type, category_id, amount_cents, currency, occurred_at, description, metadata")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("occurred_at", { ascending: false })
        .limit(limit);

      if (entryType) q = q.eq("entry_type", entryType);

      const { data, error } = await q;
      if (error) throw error;

      const list = (data || []) as any[];
      setRows(list as FinanceEntryRow[]);

      const c = list.find((r) => r?.currency)?.currency;
      if (c) setCurrency(String(c).toUpperCase());
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, entryType, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    rows,
    loading,
    currency,
    refresh: load,
  };
}
