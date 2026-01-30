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

export type ClinicAnalyticsTrendPoint = {
  date: string;
  appointments: number;
  completed: number;
  revenue_cents: number;
};

export type ClinicAnalyticsData = {
  currency: string;
  kpis: ClinicAnalyticsKpis;
  dailyTrend: ClinicAnalyticsTrendPoint[];
};

type EntityDashboardAnalyticsRes = {
  ok: boolean;
  error?: string;
  currency?: string;
  kpis?: Record<string, any>;
  trend?: Array<Record<string, any>>;
  dailyTrend?: Array<Record<string, any>>;
};

function daysFromRange(r: TimeRange) {
  if (r === "30d") return 30;
  if (r === "90d") return 90;
  return 7;
}

export function useClinicAnalytics(clinicId: string | null, timeRange: TimeRange = "30d") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClinicAnalyticsData | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!clinicId) return;

    setLoading(true);
    setError(null);

    try {
      const days = daysFromRange(timeRange);
      const { data: res, error: fnErr } = await supabase.functions.invoke<EntityDashboardAnalyticsRes>(
        "entity-dashboard",
        {
          body: { action: "analytics", entityType: "clinic", entityId: clinicId, days },
        }
      );

      if (fnErr) throw fnErr;
      if (!res?.ok) throw new Error(res?.error || "Failed to load analytics");

      const k = (res.kpis || {}) as Record<string, any>;
      const trendRaw = (res.trend || res.dailyTrend || []) as Array<Record<string, any>>;

      const currency = String(res.currency || "usd");

      const mapped: ClinicAnalyticsData = {
        currency,
        kpis: {
          totalRevenueCents: Number(k.total_revenue_cents ?? k.revenue_cents ?? 0),
          totalAppointments: Number(k.total_appointments ?? 0),
          completedAppointments: Number(k.completed_appointments ?? 0),
          canceledAppointments: Number(k.cancelled_appointments ?? k.canceled_appointments ?? 0),
          uniquePatients: Number(k.unique_patients ?? 0),
          revenueChangePct: Number(k.revenue_change_pct ?? 0),
          appointmentsChangePct: Number(k.appointments_change_pct ?? 0),
          patientsChangePct: Number(k.patients_change_pct ?? 0),
          completionRatePct: Number(k.completion_rate_pct ?? 0),
        },
        dailyTrend: trendRaw
          .map((p) => ({
            date: String(p.date || ""),
            appointments: Number(p.appointments ?? 0),
            completed: Number(p.completed ?? 0),
            revenue_cents: Number(p.revenue_cents ?? 0),
          }))
          .filter((p) => Boolean(p.date)),
      };

      setData(mapped);
    } catch (e: any) {
      setData(null);
      setError(e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [clinicId, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const resolved = useMemo(() => {
    return {
      loading,
      error,
      data,
      refetch: fetchAnalytics,
    };
  }, [data, error, fetchAnalytics, loading]);

  return resolved;
}
