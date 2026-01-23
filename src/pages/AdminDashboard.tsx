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
  metadata: Record<string, any>;
};

export type BillingInsightsResponse = {
  action: "billing";
  practiceId: string;
  period: { start: string; end: string; days: number };
  summary: {
    transactionCount: number;
    totalRevenueCents: number;
    completedCount: number;
    completedCents: number;
    pendingCount: number;
    pendingCents: number;
    refundCount: number;
    refundCents: number;
  };
  transactions: BillingTx[];
};

export type DailyTrendPoint = {
  date: string;
  bookings: number;
  completed: number;
  revenue_cents: number;
};

export type AnalyticsInsightsResponse = {
  action: "analytics";
  practiceId: string;
  period: { start: string; end: string; days: number };
  kpis: {
    totalRevenueCents: number;
    revenueChangePct: number;
    totalAppointments: number;
    appointmentsChangePct: number;
    uniquePatients: number;
    patientsChangePct: number;
    completedAppointments: number;
    completionRatePct: number;
    noShowRatePct: number;
    patientRetentionPct: number;
    averageRating: number;
  };
  dailyTrend: DailyTrendPoint[];
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

type HookReturn = {
  data: BillingInsightsResponse | AnalyticsInsightsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function usePracticeInsights(args: BillingArgs | AnalyticsArgs | null): HookReturn {
  const stableArgs = useMemo(() => {
    if (!args) return null;
    return {
      action: args.action,
      practiceId: args.practiceId,
      timeRange: (args as any).timeRange ?? ("30d" as PracticeInsightsTimeRange),
      limit: (args as any).limit as number | undefined,
    };
  }, [args]);

  const [data, setData] = useState<BillingInsightsResponse | AnalyticsInsightsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!stableArgs?.practiceId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      setLoading(false);
      setData(null);
      setError(sessionErr.message || "Failed to read session");
      return;
    }

    const token = sessionData?.session?.access_token;
    if (!token) {
      setLoading(false);
      setData(null);
      setError("Not authenticated");
      return;
    }

    const payload: any = {
      action: stableArgs.action,
      practiceId: stableArgs.practiceId,
      timeRange: stableArgs.timeRange,
    };

    if (stableArgs.action === "billing" && stableArgs.limit) {
      payload.limit = stableArgs.limit;
    }

    const { data: fnData, error: fnError } = await supabase.functions.invoke("practice-insights", {
      body: payload,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (fnError) {
      setLoading(false);
      setData(null);
      setError(fnError.message || "Failed to load insights");
      return;
    }

    if (!fnData) {
      setLoading(false);
      setData(null);
      setError("No data returned");
      return;
    }

    setData(fnData as any);
    setLoading(false);
  }, [stableArgs]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
