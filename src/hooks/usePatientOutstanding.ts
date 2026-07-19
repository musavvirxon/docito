import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OutstandingRow {
  currency: string;
  outstanding_cents: number;
}

/**
 * Reads the patient_outstanding_balance_v view (charges − discounts − payments,
 * grouped by currency). Returns one row per currency where a balance remains.
 */
export function usePatientOutstanding(patientId?: string | null) {
  const [rows, setRows] = useState<OutstandingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("patient_outstanding_balance_v")
        .select("currency, outstanding_cents")
        .eq("patient_id", patientId);
      if (!cancelled) {
        if (error) console.warn("[usePatientOutstanding]", error.message);
        setRows(
          ((data as OutstandingRow[]) || []).filter(
            (r) => Number(r.outstanding_cents) > 0,
          ),
        );
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const totalCents = rows.reduce((s, r) => s + Number(r.outstanding_cents || 0), 0);
  return { rows, totalCents, hasBalance: totalCents > 0, loading };
}
