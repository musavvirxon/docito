// Path: src/hooks/useClinicAnalytics.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TimeRange = "7d" | "30d" | "90d";

export type ClinicAnalyticsKpis = {
  totalRevenueCents: number;
  totalAppointments: number;
  completedAppointments: number;
  canceledAppointments: number;
  uniquePatients: number;
  revenueChangePct: number;
  appointmentsChangePct: number;
  patientsChangePct: number;
  completionRatePct: number;
};

export type ClinicDailyTrend = {
  date: string;
  appointments: number;
  completed: number;
  revenue_cents: number;
};

type Resp = {
  ok: boolean;
  error?: string;
  currency?: string;
  kpis?: ClinicAnalyticsKpis;
  trend?: ClinicDailyTrend[];
};

function daysFromRange(range: TimeRange) {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  return 30;
}

export function useClinicAnalytics(clinicId: string | null, timeRange: TimeRange) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>("usd");
  const [kpis, setKpis] = useState<ClinicAnalyticsKpis>({
    totalRevenueCents: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    canceledAppointments: 0,
    uniquePatients: 0,
    revenueChangePct: 0,
    appointmentsChangePct: 0,
    patientsChangePct: 0,
    completionRatePct: 0,
  });
  const [dailyTrend, setDailyTrend] = useState<ClinicDailyTrend[]>([]);

  const fetchAnalytics = useCallback(async () => {
    if (!clinicId) {
      setLoading(false);
      setError(null);
      setCurrency("usd");
      setKpis({
        totalRevenueCents: 0,
        totalAppointments: 0,
        completedAppointments: 0,
        canceledAppointments: 0,
        uniquePatients: 0,
        revenueChangePct: 0,
        appointmentsChangePct: 0,
        patientsChangePct: 0,
        completionRatePct: 0,
      });
      setDailyTrend([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const days = daysFromRange(timeRange);

      const { data, error: fnErr } = await supabase.functions.invoke<Resp>("entity-dashboard", {
        body: {
          action: "analytics",
          entityType: "clinic",
          entityId: clinicId,
          days,
        },
      });

      if (fnErr) throw fnErr;
      if (!data?.ok) throw new Error(data?.error || "Failed to load analytics");

      setCurrency(String(data.currency || "usd").toLowerCase());
      setKpis(
        data.kpis || {
          totalRevenueCents: 0,
          totalAppointments: 0,
          completedAppointments: 0,
          canceledAppointments: 0,
          uniquePatients: 0,
          revenueChangePct: 0,
          appointmentsChangePct: 0,
          patientsChangePct: 0,
          completionRatePct: 0,
        },
      );
      setDailyTrend((data.trend || []) as ClinicDailyTrend[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load analytics");
      setDailyTrend([]);
    } finally {
      setLoading(false);
    }
  }, [clinicId, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return useMemo(
    () => ({ loading, error, currency, kpis, dailyTrend, refetch: fetchAnalytics }),
    [currency, dailyTrend, error, fetchAnalytics, kpis, loading],
  );
}
