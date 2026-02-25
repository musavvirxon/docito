// File: src/components/imaging/ImagingAnalytics.tsx
// FULL FILE REPLACEMENT

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Clock3,
  Users,
  Wrench,
  AlertTriangle,
  CalendarDays,
  FileText,
  Radio,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface Props {
  centerId: string;
}

type ReferralRow = {
  id: string;
  status: string | null;
  priority: string | null;
  attachments: any;
  reason?: string | null;
  created_at: string;
  accepted_at?: string | null;
  completed_at?: string | null;
  patient_id?: string | null;
  referrer_type?: string | null;
  referrer_entity_id?: string | null;
};

type ImagingOrderStateRow = {
  referral_id: string;
  workflow_status: string | null;
  priority: string | null;
  updated_at: string | null;
};

type ImagingReportRow = {
  modality: string | null;
  created_at: string;
  finalized_at: string | null;
};

type BillingTxRow = {
  amount: number | null;
  transaction_type: string | null;
  status: string | null;
  created_at: string;
  provider_data: any;
};

type ImagingEquipmentRow = {
  id: string;
  name: string;
  modality: string | null;
  status: string | null;
  capacity_per_day: number | null;
};

type ImagingStaffRow = {
  id?: string;
  staff_role: string | null;
  status: string | null;
};

type ProfileDemoRow = {
  user_id: string;
  gender?: string | null;
  date_of_birth?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type DoctorRow = {
  id: string;
  user_id: string | null;
};

type PracticeRow = {
  id: string;
  name: string | null;
};

type AnalyticsData = {
  kpis: {
    totalScans: number;
    completedScans: number;
    pendingScans: number;
    inProgressScans: number;
    pendingReports: number;
    deliveredScans: number;
    revenueCents: number;
    refundsCents: number;
    netRevenueCents: number;
    avgReportHours: number;
    avgAcceptHours: number;
    utilizationPct: number;
    reportBacklog: number;
    activeStaff: number;
    activeEquipment: number;
    scansChangePct: number;
    revenueChangePct: number;
    reportChangePct: number;
  };
  dailyTrend: Array<{ date: string; scans: number; completed: number; delivered: number; revenue: number }>;
  modalityData: Array<{ name: string; value: number; revenue: number }>;
  workflowBreakdown: Array<{ name: string; value: number }>;
  statusBreakdown: Array<{ name: string; value: number }>;
  priorityBreakdown: Array<{ name: string; value: number }>;
  peakHours: Array<{ hour: string; scans: number }>;
  demographics: {
    gender: Array<{ name: string; value: number }>;
    ageBuckets: Array<{ name: string; value: number }>;
  };
  topReferrers: Array<{ name: string; value: number }>;
  turnaroundByModality: Array<{ type: string; avgHours: number }>;
  staffRoleMix: Array<{ name: string; total: number; active: number }>;
  equipmentUtilization: Array<{
    id: string;
    name: string;
    modality: string;
    status: string;
    capacityPerDay: number;
    avgDailyAssigned: number;
    utilizationPct: number;
  }>;
  warnings: string[];
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--chart-1, var(--primary)))",
  "hsl(var(--chart-2, var(--accent)))",
];

function safeNum(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateLabelShort(key: string) {
  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function titleize(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeStatus(status?: string | null) {
  return String(status || "").trim().toLowerCase();
}

function pctChange(curr: number, prev: number) {
  if (prev > 0) return Math.round(((curr - prev) / prev) * 100);
  if (curr > 0) return 100;
  return 0;
}

function hoursDiff(from?: string | null, to?: string | null) {
  const a = parseDate(from || null);
  const b = parseDate(to || null);
  if (!a || !b) return 0;
  const h = (b.getTime() - a.getTime()) / (1000 * 60 * 60);
  return h > 0 && Number.isFinite(h) ? h : 0;
}

function formatMoneyCents(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents || 0) / 100);
}

function parseReferralMeta(r: ReferralRow): { modality: string; examName: string } {
  const a = safeObj(r.attachments);
  const modality =
    (typeof a.modality === "string" && a.modality) ||
    (typeof a.mod === "string" && a.mod) ||
    (typeof a.modality_type === "string" && a.modality_type) ||
    "Unknown";
  const examName =
    (typeof a.exam_name === "string" && a.exam_name) ||
    (typeof a.exam === "string" && a.exam) ||
    (typeof a.study === "string" && a.study) ||
    (r.reason || "Imaging Exam");
  return { modality: String(modality), examName: String(examName) };
}

function inferWorkflow(referralStatus: string, stateWorkflow?: string | null) {
  const wf = normalizeStatus(stateWorkflow);
  if (wf) return wf;
  const rs = normalizeStatus(referralStatus);
  if (["delivered"].includes(rs)) return "delivered";
  if (["completed"].includes(rs)) return "completed";
  if (["accepted", "in_progress"].includes(rs)) return "in_progress";
  if (["declined", "cancelled", "rejected"].includes(rs)) return "cancelled";
  return "scheduled";
}

function formatHourTick(hour: string) {
  const h = Number(hour);
  if (!Number.isFinite(h)) return hour;
  return `${String(h).padStart(2, "0")}:00`;
}

function displayProfileName(p?: Partial<ProfileDemoRow> | null, fallback = "Doctor") {
  if (!p) return fallback;
  return (
    p.full_name ||
    [p.first_name, p.last_name].filter(Boolean).join(" ").trim() ||
    fallback
  );
}

async function safeSelect<T = any>(
  queryFactory: () => Promise<{ data: T[] | null; error: any }>,
  warnings: string[],
  warningKey: string,
): Promise<T[]> {
  try {
    const res = await queryFactory();
    if (res.error) {
      warnings.push(`${warningKey}:${res.error.message || "query failed"}`);
      return [];
    }
    return (res.data || []) as T[];
  } catch (e: any) {
    warnings.push(`${warningKey}:${e?.message || "query failed"}`);
    return [];
  }
}

export default function ImagingAnalytics({ centerId }: Props) {
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const days = useMemo(() => Number(period), [period]);

  const fetchAnalytics = async () => {
    if (!centerId) {
      setData(null);
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const rangeEnd = endOfDay(now);
      const rangeStart = startOfDay(addDays(now, -(days - 1)));
      const prevRangeStart = startOfDay(addDays(rangeStart, -days));
      const prevRangeEnd = new Date(rangeStart.getTime() - 1);

      const warnings: string[] = [];

      const referrals = await safeSelect<ReferralRow>(
        () =>
          (supabase.from as any)("referrals")
            .select(
              "id, status, priority, attachments, reason, created_at, accepted_at, completed_at, patient_id, referrer_type, referrer_entity_id",
            )
            .eq("receiver_type", "imaging_center")
            .eq("receiver_entity_id", centerId)
            .gte("created_at", rangeStart.toISOString())
            .lte("created_at", rangeEnd.toISOString())
            .order("created_at", { ascending: false }),
        warnings,
        "referrals_current",
      );

      const prevReferrals = await safeSelect<ReferralRow>(
        () =>
          (supabase.from as any)("referrals")
            .select("id")
            .eq("receiver_type", "imaging_center")
            .eq("receiver_entity_id", centerId)
            .gte("created_at", prevRangeStart.toISOString())
            .lte("created_at", prevRangeEnd.toISOString()),
        warnings,
        "referrals_previous",
      );

      const states = await safeSelect<ImagingOrderStateRow>(
        () =>
          (supabase.from as any)("imaging_order_state")
            .select("referral_id, workflow_status, priority, updated_at")
            .eq("imaging_center_id", centerId)
            .limit(5000),
        warnings,
        "imaging_order_state",
      );

      const reports = await safeSelect<ImagingReportRow>(
        () =>
          (supabase.from as any)("imaging_reports")
            .select("modality, created_at, finalized_at")
            .eq("imaging_center_id", centerId)
            .gte("created_at", rangeStart.toISOString())
            .lte("created_at", rangeEnd.toISOString()),
        warnings,
        "imaging_reports_current",
      );

      const prevReports = await safeSelect<ImagingReportRow>(
        () =>
          (supabase.from as any)("imaging_reports")
            .select("created_at, finalized_at")
            .eq("imaging_center_id", centerId)
            .gte("created_at", prevRangeStart.toISOString())
            .lte("created_at", prevRangeEnd.toISOString()),
        warnings,
        "imaging_reports_previous",
      );

      const equipment = await safeSelect<ImagingEquipmentRow>(
        () =>
          (supabase.from as any)("imaging_equipment")
            .select("id, name, modality, status, capacity_per_day")
            .eq("imaging_center_id", centerId),
        warnings,
        "imaging_equipment",
      );

      const staff = await safeSelect<ImagingStaffRow>(
        () =>
          (supabase.from as any)("imaging_staff")
            .select("id, staff_role, status")
            .eq("imaging_center_id", centerId),
        warnings,
        "imaging_staff",
      );

      const txs = await safeSelect<BillingTxRow>(
        () =>
          (supabase.from as any)("billing_transactions")
            .select("amount, transaction_type, status, created_at, provider_data")
            .eq("entity_type", "imaging_center")
            .eq("entity_id", centerId)
            .gte("created_at", rangeStart.toISOString())
            .lte("created_at", rangeEnd.toISOString()),
        warnings,
        "billing_transactions_current",
      );

      const prevTxs = await safeSelect<BillingTxRow>(
        () =>
          (supabase.from as any)("billing_transactions")
            .select("amount, transaction_type, status, created_at")
            .eq("entity_type", "imaging_center")
            .eq("entity_id", centerId)
            .gte("created_at", prevRangeStart.toISOString())
            .lte("created_at", prevRangeEnd.toISOString()),
        warnings,
        "billing_transactions_previous",
      );

      const stateMap = new Map<string, ImagingOrderStateRow>();
      for (const s of states) stateMap.set(s.referral_id, s);

      const dailyBuckets: Record<string, { date: string; scans: number; completed: number; delivered: number; revenue: number }> = {};
      for (let i = 0; i < days; i++) {
        const d = addDays(rangeStart, i);
        const k = dateKey(d);
        dailyBuckets[k] = { date: k, scans: 0, completed: 0, delivered: 0, revenue: 0 };
      }

      const statusMap = new Map<string, number>();
      const workflowMap = new Map<string, number>();
      const priorityMap = new Map<string, number>();
      const modalityMap = new Map<string, { count: number; revenue: number }>();
      const referrerCounter = new Map<string, number>();
      const hourCounts = Array.from({ length: 24 }, () => 0);
      const patientIds = new Set<string>();
      const doctorIds = new Set<string>();
      const practiceIds = new Set<string>();

      let completedScans = 0;
      let deliveredScans = 0;
      let inProgressScans = 0;
      let pendingReports = 0;
      let reportBacklog = 0;
      let acceptSumHours = 0;
      let acceptCount = 0;

      for (const r of referrals) {
        const created = parseDate(r.created_at);
        if (!created) continue;

        const k = dateKey(created);
        if (dailyBuckets[k]) dailyBuckets[k].scans += 1;

        const st = normalizeStatus(r.status || "scheduled");
        statusMap.set(st || "unknown", (statusMap.get(st || "unknown") || 0) + 1);

        const state = stateMap.get(r.id);
        const wf = inferWorkflow(st, state?.workflow_status);
        workflowMap.set(titleize(wf), (workflowMap.get(titleize(wf)) || 0) + 1);

        const pr = String((state?.priority || r.priority || "routine")).toLowerCase();
        priorityMap.set(pr === "stat" ? "STAT" : titleize(pr), (priorityMap.get(pr === "stat" ? "STAT" : titleize(pr)) || 0) + 1);

        if (["completed"].includes(wf)) {
          completedScans += 1;
          if (dailyBuckets[k]) dailyBuckets[k].completed += 1;
        }
        if (["delivered"].includes(wf)) {
          deliveredScans += 1;
          if (dailyBuckets[k]) dailyBuckets[k].delivered += 1;
        }
        if (["checked_in", "in_progress"].includes(wf)) inProgressScans += 1;
        if (["images_ready", "awaiting_report"].includes(wf)) {
          pendingReports += 1;
          reportBacklog += 1;
        }

        if (r.accepted_at) {
          const h = hoursDiff(r.created_at, r.accepted_at);
          if (h > 0) {
            acceptSumHours += h;
            acceptCount += 1;
          }
        }

        hourCounts[created.getHours()] += 1;

        const meta = parseReferralMeta(r);
        const m = modalityMap.get(meta.modality) || { count: 0, revenue: 0 };
        m.count += 1;
        modalityMap.set(meta.modality, m);

        if (r.patient_id) patientIds.add(r.patient_id);

        if (r.referrer_type && r.referrer_entity_id) {
          const key = `${r.referrer_type}:${r.referrer_entity_id}`;
          referrerCounter.set(key, (referrerCounter.get(key) || 0) + 1);
          if (r.referrer_type === "doctor") doctorIds.add(r.referrer_entity_id);
          if (r.referrer_type === "clinic" || r.referrer_type === "practice") practiceIds.add(r.referrer_entity_id);
        }
      }

      let revenueCents = 0;
      let refundsCents = 0;
      let prevRevenueCents = 0;

      for (const t of txs) {
        const status = normalizeStatus(t.status);
        if (status !== "completed") continue;

        const amount = Math.round(safeNum(t.amount, 0));
        const type = normalizeStatus(t.transaction_type);

        if (["appointment_payment", "subscription_payment", "hold_capture", "payment", "charge"].includes(type)) {
          revenueCents += amount;
        }
        if (["refund", "hold_release", "chargeback"].includes(type)) {
          refundsCents += amount;
        }

        const created = parseDate(t.created_at);
        if (created) {
          const k = dateKey(created);
          if (dailyBuckets[k]) dailyBuckets[k].revenue += amount;
        }

        const pd = safeObj(t.provider_data);
        const modality = typeof pd.modality === "string" ? pd.modality : typeof pd.mod === "string" ? pd.mod : null;
        if (modality) {
          const m = modalityMap.get(modality) || { count: 0, revenue: 0 };
          m.revenue += amount;
          modalityMap.set(modality, m);
        }
      }

      for (const t of prevTxs) {
        const status = normalizeStatus(t.status);
        if (status !== "completed") continue;
        const amount = Math.round(safeNum(t.amount, 0));
        const type = normalizeStatus(t.transaction_type);
        if (["appointment_payment", "subscription_payment", "hold_capture", "payment", "charge"].includes(type)) {
          prevRevenueCents += amount;
        }
      }

      let reportSumHours = 0;
      let reportCount = 0;
      const turnaroundMap = new Map<string, { sum: number; count: number }>();

      if (reports.length > 0) {
        for (const rep of reports) {
          if (!rep.finalized_at) continue;
          const diff = hoursDiff(rep.created_at, rep.finalized_at);
          if (diff <= 0) continue;
          reportSumHours += diff;
          reportCount += 1;

          const mod = String(rep.modality || "Unknown");
          const agg = turnaroundMap.get(mod) || { sum: 0, count: 0 };
          agg.sum += diff;
          agg.count += 1;
          turnaroundMap.set(mod, agg);
        }
      } else {
        for (const r of referrals) {
          if (!r.completed_at) continue;
          const diff = hoursDiff(r.created_at, r.completed_at);
          if (diff <= 0) continue;
          reportSumHours += diff;
          reportCount += 1;

          const mod = parseReferralMeta(r).modality;
          const agg = turnaroundMap.get(mod) || { sum: 0, count: 0 };
          agg.sum += diff;
          agg.count += 1;
          turnaroundMap.set(mod, agg);
        }
      }

      let prevAvgReportHoursRaw = 0;
      let prevReportCount = 0;
      for (const rep of prevReports) {
        if (!rep.finalized_at) continue;
        const diff = hoursDiff(rep.created_at, rep.finalized_at);
        if (diff <= 0) continue;
        prevAvgReportHoursRaw += diff;
        prevReportCount += 1;
      }

      const avgReportHoursRaw = reportCount > 0 ? reportSumHours / reportCount : 0;
      const avgReportHours = Math.round(avgReportHoursRaw * 10) / 10;
      const prevAvgReportHours = prevReportCount > 0 ? prevAvgReportHoursRaw / prevReportCount : 0;
      const avgAcceptHours = acceptCount > 0 ? Math.round((acceptSumHours / acceptCount) * 10) / 10 : 0;

      const totalScans = referrals.length;
      const pendingScans = Math.max(0, totalScans - completedScans - deliveredScans);

      const activeCapacityPerDay = equipment
        .filter((e) => normalizeStatus(e.status || "active") === "active")
        .reduce((sum, e) => sum + Math.max(0, Math.round(safeNum(e.capacity_per_day, 0))), 0);

      const avgDailyScans = days > 0 ? totalScans / days : 0;
      const utilizationPct = activeCapacityPerDay > 0 ? Math.min(100, Math.round((avgDailyScans / activeCapacityPerDay) * 100)) : 0;

      const activeEquipment = equipment.filter((e) => normalizeStatus(e.status || "active") === "active").length;
      const activeStaff = staff.filter((s) => normalizeStatus(s.status || "active") === "active").length;

      const staffRoleMap = new Map<string, { name: string; total: number; active: number }>();
      for (const s of staff) {
        const role = titleize(String(s.staff_role || "staff"));
        const row = staffRoleMap.get(role) || { name: role, total: 0, active: 0 };
        row.total += 1;
        if (normalizeStatus(s.status || "active") === "active") row.active += 1;
        staffRoleMap.set(role, row);
      }

      const staffRoleMix = [...staffRoleMap.values()].sort((a, b) => b.total - a.total);

      // Avg daily assigned by modality (for equipment utilization snapshot)
      const modalityDailyAssigned = new Map<string, number>();
      for (const [name, agg] of modalityMap.entries()) {
        modalityDailyAssigned.set(name, days > 0 ? Math.round((agg.count / days) * 10) / 10 : 0);
      }

      const equipmentUtilization = equipment
        .map((eq) => {
          const modality = String(eq.modality || "Other");
          const capacity = Math.max(0, Math.round(safeNum(eq.capacity_per_day, 0)));
          const avgAssigned = safeNum(modalityDailyAssigned.get(modality) || 0, 0);
          const util = capacity > 0 ? Math.min(100, Math.round((avgAssigned / capacity) * 100)) : 0;
          return {
            id: eq.id,
            name: eq.name,
            modality,
            status: String(eq.status || "active"),
            capacityPerDay: capacity,
            avgDailyAssigned: avgAssigned,
            utilizationPct: util,
          };
        })
        .sort((a, b) => b.utilizationPct - a.utilizationPct || a.name.localeCompare(b.name));

      // Demographics
      const patientProfiles =
        patientIds.size > 0
          ? await safeSelect<ProfileDemoRow>(
              () =>
                (supabase.from as any)("profiles")
                  .select("user_id, gender, date_of_birth")
                  .in("user_id", Array.from(patientIds)),
              warnings,
              "profiles_patients",
            )
          : [];

      const genderMap = new Map<string, number>();
      const ageBuckets: Record<string, number> = {
        "0-17": 0,
        "18-29": 0,
        "30-44": 0,
        "45-59": 0,
        "60+": 0,
        Unknown: 0,
      };

      for (const p of patientProfiles) {
        const gender = titleize(String(p.gender || "Unknown"));
        genderMap.set(gender, (genderMap.get(gender) || 0) + 1);

        if (!p.date_of_birth) {
          ageBuckets.Unknown += 1;
          continue;
        }

        const dob = parseDate(p.date_of_birth);
        if (!dob) {
          ageBuckets.Unknown += 1;
          continue;
        }

        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;

        if (age < 18) ageBuckets["0-17"] += 1;
        else if (age < 30) ageBuckets["18-29"] += 1;
        else if (age < 45) ageBuckets["30-44"] += 1;
        else if (age < 60) ageBuckets["45-59"] += 1;
        else if (age >= 60) ageBuckets["60+"] += 1;
        else ageBuckets.Unknown += 1;
      }

      // Referrer names
      const doctorRows =
        doctorIds.size > 0
          ? await safeSelect<DoctorRow>(
              () => (supabase.from as any)("doctors").select("id, user_id").in("id", Array.from(doctorIds)),
              warnings,
              "doctors_lookup",
            )
          : [];

      const doctorUserIds = doctorRows.map((d) => d.user_id).filter(Boolean) as string[];
      const doctorProfiles =
        doctorUserIds.length > 0
          ? await safeSelect<ProfileDemoRow>(
              () =>
                (supabase.from as any)("profiles")
                  .select("user_id, full_name, first_name, last_name")
                  .in("user_id", doctorUserIds),
              warnings,
              "profiles_doctors",
            )
          : [];

      const practiceRows =
        practiceIds.size > 0
          ? await safeSelect<PracticeRow>(
              () => (supabase.from as any)("practices").select("id, name").in("id", Array.from(practiceIds)),
              warnings,
              "practices_lookup",
            )
          : [];

      const doctorProfileMap = new Map<string, ProfileDemoRow>();
      for (const p of doctorProfiles) doctorProfileMap.set(p.user_id, p);
      const doctorNameById = new Map<string, string>();
      for (const d of doctorRows) {
        doctorNameById.set(d.id, displayProfileName(d.user_id ? doctorProfileMap.get(d.user_id) : null, "Doctor"));
      }
      const practiceNameById = new Map<string, string>();
      for (const p of practiceRows) practiceNameById.set(p.id, String(p.name || "Practice"));

      const topReferrers = [...referrerCounter.entries()]
        .map(([key, value]) => {
          const [type, id] = key.split(":");
          if (type === "doctor") return { name: doctorNameById.get(id) || "Doctor", value };
          if (type === "clinic" || type === "practice") return { name: practiceNameById.get(id) || "Practice", value };
          return { name: titleize(type), value };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      const modalityData = [...modalityMap.entries()]
        .map(([name, agg]) => ({ name, value: agg.count, revenue: agg.revenue }))
        .sort((a, b) => b.value - a.value);

      const turnaroundByModality = [...turnaroundMap.entries()]
        .map(([type, agg]) => ({
          type,
          avgHours: agg.count > 0 ? Math.round((agg.sum / agg.count) * 10) / 10 : 0,
        }))
        .sort((a, b) => b.avgHours - a.avgHours);

      const dailyTrend = Object.values(dailyBuckets).sort((a, b) => a.date.localeCompare(b.date));

      const statusBreakdown = [...statusMap.entries()]
        .map(([name, value]) => ({ name: titleize(name || "unknown"), value }))
        .sort((a, b) => b.value - a.value);

      const workflowBreakdown = [...workflowMap.entries()].sort((a, b) => b.value - a.value);

      const priorityBreakdown = [...priorityMap.entries()].sort((a, b) => b.value - a.value);

      const peakHours = hourCounts.map((scans, idx) => ({ hour: String(idx).padStart(2, "0"), scans }));

      const payload: AnalyticsData = {
        kpis: {
          totalScans,
          completedScans,
          pendingScans,
          inProgressScans,
          pendingReports,
          deliveredScans,
          revenueCents,
          refundsCents,
          netRevenueCents: revenueCents - refundsCents,
          avgReportHours,
          avgAcceptHours,
          utilizationPct,
          reportBacklog,
          activeStaff,
          activeEquipment,
          scansChangePct: pctChange(totalScans, prevReferrals.length),
          revenueChangePct: pctChange(revenueCents, prevRevenueCents),
          reportChangePct: pctChange(Math.round(avgReportHoursRaw * 10), Math.round(prevAvgReportHours * 10)),
        },
        dailyTrend,
        modalityData,
        workflowBreakdown,
        statusBreakdown,
        priorityBreakdown,
        peakHours,
        demographics: {
          gender: [...genderMap.entries()]
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value),
          ageBuckets: Object.entries(ageBuckets).map(([name, value]) => ({ name, value })),
        },
        topReferrers,
        turnaroundByModality,
        staffRoleMix,
        equipmentUtilization: equipmentUtilization.slice(0, 10),
        warnings,
      };

      setData(payload);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load imaging analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId, days]);

  const exportCSV = () => {
    if (!data) return;

    const rows: string[] = [];
    rows.push(["Date", "Scans", "Completed", "Delivered", "RevenueCents"].join(","));
    for (const p of data.dailyTrend) {
      rows.push([p.date, p.scans, p.completed, p.delivered, p.revenue].join(","));
    }

    rows.push("");
    rows.push(["Modality", "Count", "RevenueCents"].join(","));
    for (const m of data.modalityData) {
      rows.push([m.name, m.value, m.revenue].join(","));
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `imaging-analytics-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = data?.kpis;
  const hasWarnings = (data?.warnings?.length || 0) > 0;

  const trend = data?.dailyTrend || [];
  const modalityData = data?.modalityData || [];
  const workflowBreakdown = data?.workflowBreakdown || [];
  const statusBreakdown = data?.statusBreakdown || [];
  const priorityBreakdown = data?.priorityBreakdown || [];
  const peakHours = data?.peakHours || [];
  const topReferrers = data?.topReferrers || [];
  const demographics = data?.demographics || { gender: [], ageBuckets: [] };
  const turnaroundByModality = data?.turnaroundByModality || [];
  const staffRoleMix = data?.staffRoleMix || [];
  const equipmentUtilization = data?.equipmentUtilization || [];

  const maxModalityRevenue = modalityData.reduce((m, x) => Math.max(m, x.revenue), 0);

  const TrendDelta = ({ value, inverseGood = false }: { value: number; inverseGood?: boolean }) => {
    const positive = value >= 0;
    const good = inverseGood ? !positive : positive;
    const Icon = positive ? TrendingUp : TrendingDown;
    return (
      <div className={`flex items-center gap-1 text-xs ${good ? "text-green-600" : "text-destructive"}`}>
        <Icon className="h-3 w-3" />
        <span>{Math.abs(value)}% vs previous period</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="h-10 w-60 rounded bg-muted animate-pulse" />
          <div className="h-10 w-72 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card><CardContent className="p-6"><div className="h-72 rounded bg-muted animate-pulse" /></CardContent></Card>
          <Card><CardContent className="p-6"><div className="h-72 rounded bg-muted animate-pulse" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!data || !kpis) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No analytics data available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try refreshing or wait until imaging orders and reports are created.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => void fetchAnalytics()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={(v) => setPeriod(v as "7" | "30" | "90")}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => void fetchAnalytics()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          {hasWarnings && (
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Partial data
            </Badge>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Warning card */}
      {hasWarnings && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Some analytics panels are using partial data
            </CardTitle>
            <CardDescription>
              One or more tables/queries are unavailable under current schema or permissions. Core referral analytics still loads.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {data.warnings.slice(0, 8).map((w) => (
                <Badge key={w} variant="outline" className="text-xs">
                  {w.split(":")[0]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalScans}</div>
            <TrendDelta value={kpis.scansChangePct} />
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{kpis.completedScans} completed</Badge>
              <Badge variant="outline">{kpis.deliveredScans} delivered</Badge>
              <Badge variant="secondary">{kpis.pendingScans} pending</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatMoneyCents(kpis.netRevenueCents)}</div>
            <TrendDelta value={kpis.revenueChangePct} />
            <div className="mt-2 text-xs text-muted-foreground">
              Revenue {formatMoneyCents(kpis.revenueCents)} • Refunds {formatMoneyCents(kpis.refundsCents)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Report Turnaround</CardTitle>
            <Clock3 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgReportHours}h</div>
            <TrendDelta value={kpis.reportChangePct} inverseGood />
            <div className="mt-2 text-xs text-muted-foreground">Avg acceptance time: {kpis.avgAcceptHours}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational Health</CardTitle>
            <Badge variant="outline">{kpis.utilizationPct}% util</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.utilizationPct}%</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{kpis.reportBacklog} report backlog</Badge>
              <Badge variant="outline">{kpis.inProgressScans} in progress</Badge>
              <Badge variant="outline">{kpis.pendingReports} pending reports</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pendingReports}</div>
            <p className="text-xs text-muted-foreground mt-2">Images ready / awaiting report stages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Results</CardTitle>
            <Radio className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.deliveredScans}</div>
            <p className="text-xs text-muted-foreground mt-2">Results delivered in selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.activeStaff}</div>
            <p className="text-xs text-muted-foreground mt-2">{staffRoleMix.length} staff role groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Equipment</CardTitle>
            <Wrench className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.activeEquipment}</div>
            <p className="text-xs text-muted-foreground mt-2">{equipmentUtilization.length} registered devices</p>
          </CardContent>
        </Card>
      </div>

      {/* Trends and modality */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Daily Trend
            </CardTitle>
            <CardDescription>Scans, completions, deliveries, and revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trend}>
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tickFormatter={(v) => dateLabelShort(String(v))}
                  minTickGap={20}
                />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(v) => dateLabelShort(String(v))}
                  formatter={(value, name) => {
                    if (name === "revenue") return [formatMoneyCents(Number(value)), "Revenue"];
                    if (name === "completed") return [value as any, "Completed"];
                    if (name === "delivered") return [value as any, "Delivered"];
                    return [value as any, "Scans"];
                  }}
                />
                <Line type="monotone" dataKey="scans" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completed" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="delivered" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modality Mix</CardTitle>
            <CardDescription>Scan volume by modality (with recorded revenue)</CardDescription>
          </CardHeader>
          <CardContent>
            {modalityData.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
                No modality data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={modalityData} cx="50%" cy="50%" innerRadius={60} outerRadius={110} dataKey="value" paddingAngle={2}>
                    {modalityData.map((_, idx) => (
                      <Cell key={`modality-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value, _name, p: any) => {
                      const row = p?.payload as { name: string; value: number; revenue: number };
                      return [`${value} scans • ${formatMoneyCents(row?.revenue || 0)}`, row?.name || "Modality"];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdown cards */}
      <div className="grid gap-6 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow</CardTitle>
            <CardDescription>Current pipeline distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {workflowBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              workflowBreakdown.map((r, i) => (
                <div key={r.name} className="flex items-center justify-between p-2 rounded bg-muted/40">
                  <span className="text-sm">{r.name}</span>
                  <Badge variant={i === 0 ? "default" : "outline"}>{r.value}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Referral Status</CardTitle>
            <CardDescription>Raw referral status values</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {statusBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              statusBreakdown.map((r, i) => (
                <div key={r.name} className="flex items-center justify-between p-2 rounded bg-muted/40">
                  <span className="text-sm">{r.name}</span>
                  <Badge variant={i === 0 ? "default" : "outline"}>{r.value}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Priority Mix</CardTitle>
            <CardDescription>Routine / urgent / STAT</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {priorityBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              priorityBreakdown.map((r, i) => (
                <div key={r.name} className="flex items-center justify-between p-2 rounded bg-muted/40">
                  <span className="text-sm">{r.name}</span>
                  <Badge variant={i === 0 ? "default" : "outline"}>{r.value}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Referrers</CardTitle>
            <CardDescription>Who sends the most imaging work</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topReferrers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              topReferrers.slice(0, 8).map((r) => (
                <div key={`${r.name}-${r.value}`} className="flex items-center justify-between p-2 rounded bg-muted/40">
                  <span className="text-sm truncate pr-2">{r.name}</span>
                  <Badge variant="outline">{r.value}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Peak hours + demographics */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
            <CardDescription>Referral/scans volume by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={peakHours}>
                <XAxis dataKey="hour" className="text-xs" tickFormatter={(v) => formatHourTick(String(v))} minTickGap={18} />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(v) => formatHourTick(String(v))}
                />
                <Bar dataKey="scans" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient Demographics</CardTitle>
            <CardDescription>Based on referred patients in selected period</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={demographics.gender} cx="50%" cy="50%" innerRadius={40} outerRadius={76} dataKey="value" paddingAngle={2}>
                    {demographics.gender.map((_, idx) => (
                      <Cell key={`gender-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center text-xs text-muted-foreground mt-2">Gender</div>
            </div>

            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographics.ageBuckets}>
                  <XAxis dataKey="name" className="text-xs" minTickGap={6} />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="text-center text-xs text-muted-foreground mt-2">Age buckets</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Turnaround + staff/equipment */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Turnaround by Modality</CardTitle>
            <CardDescription>Average report completion time (hours)</CardDescription>
          </CardHeader>
          <CardContent>
            {turnaroundByModality.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                No turnaround data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={turnaroundByModality} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="type" type="category" className="text-xs" width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(v) => [`${v}h`, "Avg turnaround"]}
                  />
                  <Bar dataKey="avgHours" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff Role Coverage</CardTitle>
            <CardDescription>Active vs total staff by role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {staffRoleMix.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                No staff records found.
              </div>
            ) : (
              <>
                {staffRoleMix.slice(0, 8).map((row) => (
                  <div key={row.name} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{row.name}</p>
                      <Badge variant="outline">
                        {row.active}/{row.total} active
                      </Badge>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${row.total > 0 ? Math.round((row.active / row.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by modality + equipment utilization */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Modality</CardTitle>
            <CardDescription>Based on recorded billing transactions (provider_data.modality)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {modalityData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No modality revenue data available yet.</p>
            ) : (
              modalityData.map((item, index) => {
                const width = maxModalityRevenue > 0 ? Math.round((item.revenue / maxModalityRevenue) * 100) : 0;
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-medium truncate">{item.name}</div>
                    <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${width}%`, backgroundColor: COLORS[index % COLORS.length] }}
                      />
                    </div>
                    <div className="w-32 text-right text-sm font-medium">{formatMoneyCents(item.revenue)}</div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipment Utilization Snapshot</CardTitle>
            <CardDescription>Estimated from modality volume vs configured capacity/day</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {equipmentUtilization.length === 0 ? (
              <p className="text-sm text-muted-foreground">No equipment registered.</p>
            ) : (
              equipmentUtilization.map((eq) => (
                <div key={eq.id} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{eq.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {eq.modality}
                        {eq.capacityPerDay > 0 ? ` • cap ${eq.capacityPerDay}/day` : ""}
                        {` • avg ${eq.avgDailyAssigned}/day`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={normalizeStatus(eq.status) === "active" ? "default" : "secondary"}>
                        {titleize(eq.status)}
                      </Badge>
                      <Badge variant="outline">{eq.utilizationPct}%</Badge>
                    </div>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, eq.utilizationPct))}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
