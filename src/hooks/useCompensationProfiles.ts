// File: src/hooks/useCompensationProfiles.ts

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FinanceEntityType } from "@/components/financial/FinanceHub";

export type CompensationProfileRow = {
  id: string;
  entity_type: FinanceEntityType;
  entity_id: string;
  user_id: string;
  compensation_type: "salary" | "hourly";
  salary_amount_cents: number | null;
  salary_period: "monthly" | "weekly" | "daily" | null;
  hourly_rate_cents: number | null;
  payout_frequency: "monthly" | "weekly" | "daily" | "each_time";
  effective_from: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
};

type Args = {
  entityType: FinanceEntityType;
  entityId: string;
};

export function useCompensationProfiles({ entityType, entityId }: Args) {
  const [rows, setRows] = useState<CompensationProfileRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!entityType || !entityId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff_compensation_profiles")
        .select(
          "id,entity_type,entity_id,user_id,compensation_type,salary_amount_cents,salary_period,hourly_rate_cents,payout_frequency,effective_from,is_active,notes,created_at",
        )
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("is_active", { ascending: false })
        .order("effective_from", { ascending: false })
        .limit(5000);

      if (error) throw error;
      setRows(((data || []) as any) as CompensationProfileRow[]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    rows,
    loading,
    refresh: load,
  };
}
