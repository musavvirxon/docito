// File: src/hooks/useDoctorRentProfiles.ts

import { useCallback, useEffect, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import type { FinanceEntityType } from "@/components/financial/FinanceHub";

export type DoctorRentProfileRow = {
  id: string;
  entity_type: FinanceEntityType;
  entity_id: string;
  user_id: string;
  room_id: string | null;
  rent_amount_cents: number;
  rent_frequency: "monthly" | "weekly" | "daily";
  effective_from: string;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

type Args = {
  entityType: FinanceEntityType;
  entityId: string;
};

export function useDoctorRentProfiles({ entityType, entityId }: Args) {
  const [rows, setRows] = useState<DoctorRentProfileRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!entityType || !entityId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("doctor_room_rent_profiles")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("is_active", { ascending: false })
        .order("effective_from", { ascending: false })
        .limit(5000);

      if (error) throw error;
      setRows(((data || []) as any) as DoctorRentProfileRow[]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, refresh: load };
}
