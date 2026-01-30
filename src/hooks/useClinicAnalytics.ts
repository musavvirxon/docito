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

type EntityDashboardAnalyticsResp = {
  ok: boolean;
  error?: string;
  window_days?: number;
  kpis?: {
    total_appointments: number;
    completed_appointments: number;
    cancelled_appointments: number;
    revenue_cents: number;
  };
  trend?: Array<{
    date: string;
    appointments?: number;
    created?: number;
    revenue_cents?: number;
  }>;
};

type AppointmentRow = {
  id: string;
  patient_id: string | null;
  status: string | null;
  appointment_date: string | null;
};

function daysForRange(range: TimeRange): number {
  if (range === "90d") return 90;
  if (range === "30d") return 30;
  return 7;
}

function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pctChange(current: number, prev: number): number {
  const c = Number(current || 0);
  const p = Number(prev || 0);
  if (p <= 0) return c > 0 ? 100 : 0;
  return ((c - p) / p) * 100;
}

function normalizeStatus(s: string | null | undefined) {
  return String(s || "").toLowerCase();
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
      const windowDays = daysForRange(timeRange);
      const totalDays = Math.min(365, windowDays * 2);

      const today = toUtcMidnight(new Date());
      const currentStart = new Date(today);
      currentStart.setUTCDate(currentStart.getUTCDate() - (windowDays - 1));

      const prevStart = new Date(currentStart);
      prevStart.setUTCDate(prevStart.getUTCDate() - windowDays);

      const sinceDate = ymd(prevStart);

      const [{ data: dash, error: fnErr }, { data: appts, error: apptErr }] = await Promise.all([
        supabase.functions.invoke<EntityDashboardAnalyticsResp>("entity-dashboard", {
          body: { action: "analytics", entityType: "clinic", entityId: clinicId, days: totalDays },
        }),
        supabase
          .from("appointments")
          .select("id, patient_id, status, appointment_date")
          .eq("practice_id", clinicId)
          .gte("appointment_date", sinceDate),
      ]);

      if (fnErr) throw fnErr;
      if (!dash?.ok) throw new Error(dash?.error || "Failed to load analytics");
      if (apptErr) throw apptErr;

      const apptRows = ((appts || []) as AppointmentRow[]).filter((a) => !!a.appointment_date);

      // Revenue trend from entity-dashboard
      const revenueByDate = new Map<string, number>();
      const dashTrend = (dash.trend || []) as Array<{ date: string; revenue_cents?: number }>;
      for (const r of dashTrend) {
        const key = String(r.date || "").slice(0, 10);
        if (!key) continue;
        revenueByDate.set(key, Number(r.revenue_cents || 0));
      }

      // Appointments aggregates (current + prev) from direct query (RLS)
      let curAppointments = 0;
      let curCompleted = 0;
      let curCanceled = 0;
      const curPatients = new Set<string>();

      let prevAppointments = 0;
      let prevCompleted = 0;
      let prevCanceled = 0;
      const prevPatients = new Set<string>();

      const apptByDate = new Map<string, { appointments: number; completed: number }>();

      for (const a of apptRows) {
        const dateStr = String(a.appointment_date || "").slice(0, 10);
        if (!dateStr) continue;

        const dateObj = new Date(`${dateStr}T00:00:00Z`);
        const s = normalizeStatus(a.status);

        const inCurrent = dateObj >= currentStart && dateObj <= today;
        const inPrev = dateObj >= prevStart && dateObj < currentStart;

        if (inCurrent) {
          curAppointments += 1;
          if (s === "completed") curCompleted += 1;
          if (s === "cancelled" || s === "canceled") curCanceled += 1;
          if (a.patient_id) curPatients.add(String(a.patient_id));

          const row = apptByDate.get(dateStr) || { appointments: 0, completed: 0 };
          row.appointments += 1;
          if (s === "completed") row.completed += 1;
          apptByDate.set(dateStr, row);
        } else if (inPrev) {
          prevAppointments += 1;
          if (s === "completed") prevCompleted += 1;
          if (s === "cancelled" || s === "canceled") prevCanceled += 1;
          if (a.patient_id) prevPatients.add(String(a.patient_id));
        }
      }

      // Revenue sums (current vs prev) from entity-dashboard trend
      let curRevenueCents = 0;
      let prevRevenueCents = 0;

      for (let i = 0; i < windowDays; i++) {
        const d = new Date(currentStart);
        d.setUTCDate(currentStart.getUTCDate() + i);
        const key = ymd(d);
        curRevenueCents += revenueByDate.get(key) || 0;
      }

      for (let i = 0; i < windowDays; i++) {
        const d = new Date(prevStart);
        d.setUTCDate(prevStart.getUTCDate() + i);
        const key = ymd(d);
        prevRevenueCents += revenueByDate.get(key) || 0;
      }

      const completionRatePct = curAppointments > 0 ? Math.round((curCompleted / curAppointments) * 100) : 0;

      const nextKpis: ClinicAnalyticsKpis = {
        totalRevenueCents: curRevenueCents,
        totalAppointments: curAppointments,
        completedAppointments: curCompleted,
        canceledAppointments: curCanceled,
        uniquePatients: curPatients.size,
        revenueChangePct: pctChange(curRevenueCents, prevRevenueCents),
        appointmentsChangePct: pctChange(curAppointments, prevAppointments),
        patientsChangePct: pctChange(curPatients.size, prevPatients.size),
        completionRatePct,
      };

      // Fill daily trend (current window) with zeros for missing days
      const nextTrend: ClinicDailyTrend[] = [];
      for (let i = 0; i < windowDays; i++) {
        const d = new Date(currentStart);
        d.setUTCDate(currentStart.getUTCDate() + i);
        const key = ymd(d);

        const ap = apptByDate.get(key) || { appointments: 0, completed: 0 };
        nextTrend.push({
          date: key,
          appointments: ap.appointments,
          completed: ap.completed,
          revenue_cents: revenueByDate.get(key) || 0,
        });
      }

      setCurrency("usd");
      setKpis(nextKpis);
      setDailyTrend(nextTrend);
    } catch (e: any) {
      setError(e?.message || "Failed to load analytics");
      setDailyTrend([]);
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
