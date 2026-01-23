import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PracticeInsightsTimeRange = "7d" | "30d" | "90d";

export type BillingTx = {
  id: string;
  created_at: string;
  amount_cents: number;
  currency: string;
  status: string;
  transaction_type: string;
  invoice_id: string | null;
  provider: string;
  provider_ref: string | null;
  metadata: Record<string, unknown> | null;
};

type BillingRes = {
  ok: boolean;
  currency: string;
  period: { start: string; end: string; days: number };
  summary: {
    totalRevenueCents: number;
    pendingCents: number;
    refundCents: number;
    transactionCount: number;
    completedCount: number;
    pendingCount: number;
  };
  transactions: BillingTx[];
  error?: string;
};

export type DailyTrendPoint = {
  date: string; // YYYY-MM-DD
  bookings: number;
  completed: number;
  revenue_cents: number;
};

type AnalyticsRes = {
  ok: boolean;
  currency: string;
  period: { start: string; end: string; days: number };
  kpis: {
    totalRevenueCents: number;
    totalAppointments: number;
    completedAppointments: number;
    canceledAppointments: number;
    noShowAppointments: number;
    uniquePatients: number;
    averageRating: number;
    patientRetentionPct: number;
    noShowRatePct: number;
    revenueChangePct: number;
    appointmentsChangePct: number;
    patientsChangePct: number;
    completionRatePct: number;
    prev: {
      totalRevenueCents: number;
      totalAppointments: number;
      completedAppointments: number;
    };
  };
  dailyTrend: DailyTrendPoint[];
  error?: string;
};

type BillingArgs = {
  action: "billing";
  practiceId: string;
  timeRange?: PracticeInsightsTimeRange;
  limit?: number;
};

type AnalyticsArgs = {
  action: "analytics";
  practiceId: string;
  timeRange?: PracticeInsightsTimeRange;
};

type AnyArgs = BillingArgs | AnalyticsArgs;

export function usePracticeInsights<T extends AnyArgs>(args: T | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BillingRes | AnalyticsRes | null>(null);

  const fetcher = useCallback(async () => {
    if (!args?.practiceId) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: res, error: fnErr } = await supabase.functions.invoke<BillingRes | AnalyticsRes>(
        "practice-insights",
        {
          body: args,
        },
      );

      if (fnErr) throw fnErr;
      if (!res?.ok) throw new Error((res as any)?.error || "Failed to load insights");
      setData(res);
    } catch (e: any) {
      setData(null);
      setError(e?.message || "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, [args]);

  useEffect(() => {
    fetcher();
  }, [fetcher]);

  return useMemo(
    () => ({
      loading,
      error,
      data: data as (T["action"] extends "billing" ? BillingRes : AnalyticsRes) | null,
      refetch: fetcher,
    }),
    [data, error, fetcher, loading],
  );
}
