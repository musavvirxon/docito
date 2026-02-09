// File: src/hooks/useFinanceCategories.ts

import { useCallback, useEffect, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import type { FinanceEntityType } from "@/components/financial/FinanceHub";
import type { FinanceCategoryRow } from "@/components/financial/FinanceEntryDialog";

type UseFinanceCategoriesArgs = {
  entityType: FinanceEntityType;
  entityId: string;
};

export function useFinanceCategories({ entityType, entityId }: UseFinanceCategoriesArgs) {
  const [categories, setCategories] = useState<FinanceCategoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!entityType || !entityId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance_categories")
        .select("id, kind, name, is_active")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("name", { ascending: true })
        .limit(5000);

      if (error) throw error;
      setCategories((data || []) as any);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    categories,
    loading,
    refresh: load,
  };
}
