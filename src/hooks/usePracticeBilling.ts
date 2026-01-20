// File: src/hooks/usePracticeBilling.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PracticeBillingPaymentStatus = "pending" | "paid" | "failed" | "refunded" | "void";
export type PracticeBillingInvoiceStatus = "draft" | "issued" | "paid" | "void" | "cancelled";

export type PracticeBillingPayment = {
  id: string;
  invoice_id: string | null;
  patient_id: string;
  provider: string | null;
  amount: number;
  currency: string;
  status: PracticeBillingPaymentStatus;
  paid_at: string | null;
  created_at: string;
};

export type PracticeBillingInvoice = {
  id: string;
  patient_id: string;
  status: PracticeBillingInvoiceStatus;
  currency: string;
  total_amount: number;
  issued_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export type PracticeBillingSummary = {
  currency: string;
  periodDays: number;
  paidAmountPeriod: number;
  paidCountPeriod: number;
  outstandingAmount: number;
  outstandingCount: number;
  totalPaidAllTime: number;
  totalPaidCountAllTime: number;
};

export type PracticeBillingResponse = {
  ok: boolean;
  error?: string;
  summary?: PracticeBillingSummary;
  recentPayments?: PracticeBillingPayment[];
  recentInvoices?: PracticeBillingInvoice[];
};

export function usePracticeBilling(practiceId?: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PracticeBillingSummary | null>(null);
  const [recentPayments, setRecentPayments] = useState<PracticeBillingPayment[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<PracticeBillingInvoice[]>([]);

  const fetchBilling = useCallback(async () => {
    if (!practiceId) {
      setLoading(false);
      setError(null);
      setSummary(null);
      setRecentPayments([]);
      setRecentInvoices([]);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fnError } = await supabase.functions.invoke<PracticeBillingResponse>("practice-billing", {
      body: {
        practiceId,
        rangeDays: 30,
        limit: 20,
      },
    });

    if (fnError) {
      setError(fnError.message || "Failed to load billing");
      setLoading(false);
      return;
    }

    if (!data?.ok) {
      setError(data?.error || "Failed to load billing");
      setLoading(false);
      return;
    }

    setSummary(data.summary || null);
    setRecentPayments(Array.isArray(data.recentPayments) ? data.recentPayments : []);
    setRecentInvoices(Array.isArray(data.recentInvoices) ? data.recentInvoices : []);
    setLoading(false);
  }, [practiceId]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const currency = useMemo(() => summary?.currency || "USD", [summary?.currency]);

  return {
    loading,
    error,
    summary,
    recentPayments,
    recentInvoices,
    currency,
    refresh: fetchBilling,
  };
}
