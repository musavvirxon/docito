import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ClinicBillingTx = {
  id: string;
  created_at: string;
  amount_cents: number;
  currency: string;
  status: string;
  transaction_type: string;
  invoice_id: string | null;
  provider: string;
  provider_ref: string | null;
  metadata: Record<string, unknown>;
};

export type ClinicBillingSummary = {
  count: number;
  completedCount: number;
  refundCount: number;
  totalCompletedCents: number;
  totalRefundedCents: number;
};

type Resp = {
  ok: boolean;
  error?: string;
  currency?: string;
  summary?: ClinicBillingSummary;
  transactions?: ClinicBillingTx[];
};

export function useClinicBilling(clinicId: string | null, limit: number = 50) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>("usd");
  const [summary, setSummary] = useState<ClinicBillingSummary>({
    count: 0,
    completedCount: 0,
    refundCount: 0,
    totalCompletedCents: 0,
    totalRefundedCents: 0,
  });
  const [transactions, setTransactions] = useState<ClinicBillingTx[]>([]);

  const fetchBilling = useCallback(async () => {
    if (!clinicId) {
      setLoading(false);
      setError(null);
      setCurrency("usd");
      setSummary({
        count: 0,
        completedCount: 0,
        refundCount: 0,
        totalCompletedCents: 0,
        totalRefundedCents: 0,
      });
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke<Resp>("clinic-billing", {
        body: { clinicId, limit },
      });

      if (fnErr) throw fnErr;
      if (!data?.ok) throw new Error(data?.error || "Failed to load billing");

      setCurrency(data.currency || "usd");
      setSummary(
        data.summary || {
          count: 0,
          completedCount: 0,
          refundCount: 0,
          totalCompletedCents: 0,
          totalRefundedCents: 0,
        },
      );
      setTransactions(data.transactions || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load billing");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [clinicId, limit]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  return useMemo(
    () => ({ loading, error, currency, summary, transactions, refetch: fetchBilling }),
    [currency, error, fetchBilling, loading, summary, transactions],
  );
}
