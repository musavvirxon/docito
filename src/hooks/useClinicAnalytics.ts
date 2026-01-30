// File: src/hooks/useClinicAnalytics.ts

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
  dailyTrend?: ClinicDailyTrend[];
  trend?: ClinicDailyTrend[];
};

export function useClinicAnalytics(clinicId: string | null, timeRange: TimeRange) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>("usd");
  const emptyKpis: ClinicAnalyticsKpis = useMemo(
    () => ({
      totalRevenueCents: 0,
      totalAppointments: 0,
      completedAppointments: 0,
      canceledAppointments: 0,
      uniquePatients: 0,
      revenueChangePct: 0,
      appointmentsChangePct: 0,
      patientsChangePct: 0,
      completionRatePct: 0,
    }),
    [],
  );

  const [kpis, setKpis] = useState<ClinicAnalyticsKpis>(emptyKpis);
  const [dailyTrend, setDailyTrend] = useState<ClinicDailyTrend[]>([]);

  const fetchAnalytics = useCallback(async () => {
    if (!clinicId) {
      setLoading(false);
      setError(null);
      setCurrency("usd");
      setKpis(emptyKpis);
      setDailyTrend([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke<Resp>("entity-dashboard", {
        body: { action: "analytics", entityType: "clinic", entityId: clinicId, timeRange },
      });

      if (fnErr) throw fnErr;
      if (!data?.ok) throw new Error(data?.error || "Failed to load analytics");

      setCurrency(data.currency || "usd");
      setKpis(data.kpis || emptyKpis);
      setDailyTrend(data.dailyTrend || data.trend || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load analytics");
      setCurrency("usd");
      setKpis(emptyKpis);
      setDailyTrend([]);
    } finally {
      setLoading(false);
    }
  }, [clinicId, emptyKpis, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return useMemo(
    () => ({ loading, error, currency, kpis, dailyTrend, refetch: fetchAnalytics }),
    [currency, dailyTrend, error, fetchAnalytics, kpis, loading],
  );
}
