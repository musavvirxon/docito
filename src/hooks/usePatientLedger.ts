import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LedgerKind = "opening" | "charge" | "discount" | "payment";

export interface LedgerRow {
  entry_id: string;
  patient_id: string;
  practice_id: string | null;
  appointment_id: string | null;
  entry_date: string;
  kind: LedgerKind;
  description: string | null;
  charge_cents: number;
  payment_cents: number;
  currency: string;
  method: string | null;
}

/**
 * Reads public.patient_ledger_v — a chronological, bank-statement style ledger
 * mixing the optional opening balance, charges/discounts and payments.
 *
 * The balance is always derived here from the live rows; nothing is cached
 * or stored server-side.
 */
export function usePatientLedger(patientId?: string | null) {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!patientId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await (supabase as any)
      .from("patient_ledger_v")
      .select("*")
      .eq("patient_id", patientId)
      .order("entry_date", { ascending: true });
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setRows(
        ((data as LedgerRow[]) || []).map((r) => ({
          ...r,
          charge_cents: Number(r.charge_cents || 0),
          payment_cents: Number(r.payment_cents || 0),
        })),
      );
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}
