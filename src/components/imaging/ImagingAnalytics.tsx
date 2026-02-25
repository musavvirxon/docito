// File: src/components/imaging/ImagingAnalytics.tsx
// FULL FILE REPLACEMENT (no backend / no edge function; direct Supabase queries)

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Activity,
  Users,
  ListChecks,
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  centerId: string;
}

type AnalyticsResponse = {
  kpis: {
    totalScans: number;
    completedScans: number;
    pendingScans: number;
    revenueCents: number;
    refundsCents: number;
    netRevenueCents: number;
    avgReportHours: number;
    avgAcceptHours: number;
    utilizationPct: number;
    reportBacklog: number;
    scansChangePct: number;
    revenueChangePct: number;
    reportChangePct: number;
  };
  dailyTrend: Array<{ date: string; scans: number; completed: number; revenue: number }>;
  modalityData: Array<{ name: string; value: number; revenue: number }>;
  workflowBreakdown: Array<{ name: string; value: number }>;
  statusBreakdown: Array<{ name: string; value: number }>;
  peakHours: Array<{ hour: string; scans: number }>;
  demographics: {
    gender: Array<{ name: string; value: number }>;
    ageBuckets: Array<{ name: string; value: number }>;
  };
  topReferrers: Array<{ name: string; value: number }>;
  turnaroundByModality: Array<{ type: string; avgHours: number }>;
};

type JsonObj = Record<string, unknown>;

type ReferralRow = {
  id: string;
  created_at: string;
  updated_at: string;
  accepted_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  referral_number?: string | null;
  attachments?: unknown;
  result_attachments?: unknown;
  reason?: string | null;
  patient_name?: string | null;
  patient_snapshot_full_name?: string | null;
  patient_snapshot_gender?: string | null;
  patient_snapshot_dob?: string | null;
  referrer_entity_id?: string | null;
  referrer_user_id?: string | null;
};

type ImagingOrderStateRow = {
  referral_id: string;
  workflow_status?: string | null;
  priority?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type ImagingReportRow = {
  referral_id: string;
  status?: string | null;
  created_at?: string | null;
  finalized_at?: string | null;
  delivered_at?: string | null;
  updated_at?: string | null;
};

type BillingTxRow = {
  id: string;
  created_at?: string | null;
  status?: string | null;
  transaction_type?: string | null;
  amount_cents?: number | null;
  amount?: number | null;
  currency?: string | null;
  provider_data?: unknown;
  metadata?: unknown;
  entity_id?: string | null;
  entity_type?: string | null;
};

type EquipmentRow = {
  id: string;
  status?: string | null;
  capacity_per_day?: number | null;
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-3, 215 85% 55%))",
  "hsl(var(--chart-4, 32 95% 55%))",
  "hsl(var(--chart-5, 142 70% 45%))",
];

function formatMoneyCents(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents || 0) / 100);
}

function safeObj(v: unknown): JsonObj {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as JsonObj;
  return {};
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeStatus(v?: string | null) {
  return (v || "").trim().toLowerCase();
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hourLabel(dt: Date) {
  return `${String(dt.getHours()).padStart(2, "0")}:00`;
}

function pctChange(current: number, prev: number) {
  if (!prev && !current) return 0;
  if (!prev && current) return 100;
  return Number((((current - prev) / prev) * 100).toFixed(1));
}

function diffHours(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const from = new Date(a).getTime();
  const to = new Date(b).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
  return (to - from) / (1000 * 60 * 60);
}

function parseModalityAndExam(ref: ReferralRow) {
  const a = safeObj(ref.attachments);
  const modality =
    asString(a.modality) ||
    asString(a.imaging_modality) ||
    asString(a.study_type) ||
    "X-ray";

  const exam =
    asString(a.exam_name) ||
    asString(a.study_name) ||
    asString(a.test_name) ||
    ref.reason ||
    "Imaging Exam";

  const bodyPart = asString(a.body_part) || asString(a.anatomy) || "";
  return { modality, exam, bodyPart };
}

function normalizeTxStatus(s?: string | null) {
  const x = normalizeStatus(s);
  if (x === "succeeded") return "completed";
  if (x === "cancelled" || x === "canceled") return "failed";
  return x || "pending";
}

function normalizeTxType(s?: string | null) {
  const x = normalizeStatus(s);
  if (x === "payment") return "charge";
  return x || "charge";
}

function txAmountCents(tx: BillingTxRow) {
  if (typeof tx.amount_cents === "number" && Number.isFinite(tx.amount_cents)) {
    return Math.trunc(tx.amount_cents);
  }
  if (typeof tx.amount === "number" && Number.isFinite(tx.amount)) {
    // Heuristic: if amount is too small, assume major currency and convert to cents.
    if (Math.abs(tx.amount) < 100000) return Math.round(tx.amount * 100);
    return Math.trunc(tx.amount);
  }
  return 0;
}

function buildDateRange(days: number) {
  const now = new Date();
  const currentEnd = endOfDay(now);
  const currentStart = startOfDay(addDays(now, -(days - 1)));
  const prevEnd = endOfDay(addDays(currentStart, -1));
  const prevStart = startOfDay(addDays(prevEnd, -(days - 1)));
  return { currentStart, currentEnd, prevStart, prevEnd };
}

function inRange(ts: string | null | undefined, start: Date, end: Date) {
  if (!ts) return false;
  const t = new Date(ts).getTime();
  return Number.isFinite(t) && t >= start.getTime() && t <= end.getTime();
}

function avg(values: Array<number | null | undefined>) {
  const arr = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!arr.length) return 0;
  return Number((arr.reduce((s, n) => s + n, 0) / arr.length).toFixed(1));
}

function titleizeStatus(s: string) {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase()) || "Unknown";
}

function ageBucketFromDob(dob?: string | null): string | null {
  if (!dob) return null;
  const dt = new Date(dob);
  if (!Number.isFinite(dt.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dt.getFullYear();
  const m = now.getMonth() - dt.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dt.getDate())) age--;
  if (!Number.isFinite(age) || age < 0) return null;
  if (age <= 17) return "0-17";
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  if (age <= 64) return "55-64";
  return "65+";
}

export default function ImagingAnalytics({ centerId }: Props) {
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  const days = useMemo(() => Number(period), [period]);

  const fetchAnalytics = async () => {
    if (!centerId) {
      setData(null);
      return;
    }

    setLoading(true);

    try {
      const { currentStart, currentEnd, prevStart } = buildDateRange(days);

      // 1) Referrals (core source of imaging orders)
      const { data: referralsRaw, error: referralsErr } = await supabase
        .from("referrals")
        .select(
          [
            "id",
            "created_at",
            "updated_at",
            "accepted_at",
            "completed_at",
            "status",
            "referral_number",
            "attachments",
            "result_attachments",
            "reason",
            "patient_name",
            "patient_snapshot_full_name",
            "patient_snapshot_gender",
            "patient_snapshot_dob",
            "referrer_entity_id",
            "referrer_user_id",
          ].join(","),
        )
        .eq("receiver_type", "imaging_center")
        .eq("receiver_entity_id", centerId)
        .gte("created_at", prevStart.toISOString())
        .order("created_at", { ascending: true })
        .limit(5000);

      if (referralsErr) throw referralsErr;
      const referrals = (referralsRaw || []) as unknown as ReferralRow[];

      const referralIds = referrals.map((r) => r.id);

      // 2) Imaging workflow state (custom table, may not exist in stale client types)
      let workflowRows: ImagingOrderStateRow[] = [];
      try {
        if (referralIds.length) {
          const { data: stData, error: stErr } = await (supabase.from as any)("imaging_order_state")
            .select("referral_id, workflow_status, priority, updated_at, created_at")
            .eq("imaging_center_id", centerId)
            .in("referral_id", referralIds);
          if (stErr) throw stErr;
          workflowRows = (stData || []) as ImagingOrderStateRow[];
        }
      } catch (e) {
        console.warn("imaging_order_state unavailable or restricted:", e);
        workflowRows = [];
      }

      // 3) Imaging reports (custom table, may not exist in stale client types)
      let reportRows: ImagingReportRow[] = [];
      try {
        if (referralIds.length) {
          const { data: repData, error: repErr } = await (supabase.from as any)("imaging_reports")
            .select("referral_id, status, created_at, finalized_at, delivered_at, updated_at")
            .eq("imaging_center_id", centerId)
            .in("referral_id", referralIds);
          if (repErr) throw repErr;
          reportRows = (repData || []) as ImagingReportRow[];
        }
      } catch (e) {
        console.warn("imaging_reports unavailable or restricted:", e);
        reportRows = [];
      }

      // 4) Billing transactions (prefer modern billing_transactions; fallback legacy transactions)
      let txRows: BillingTxRow[] = [];
      let currency = "USD";

      try {
        const { data: txData, error: txErr } = await (supabase.from as any)("billing_transactions")
          .select(
            "id, created_at, status, transaction_type, amount_cents, amount, currency, provider_data, metadata, entity_type, entity_id",
          )
          .eq("entity_type", "imaging")
          .eq("entity_id", centerId)
          .gte("created_at", prevStart.toISOString())
          .order("created_at", { ascending: true })
          .limit(5000);

        if (txErr) throw txErr;
        txRows = (txData || []) as BillingTxRow[];
      } catch (e) {
        console.warn("billing_transactions unavailable/restricted, trying legacy transactions:", e);
        try {
          const { data: legacyTx, error: legacyErr } = await supabase
            .from("transactions")
            .select("id, created_at, status, transaction_type, amount, currency, metadata")
            .gte("created_at", prevStart.toISOString())
            .order("created_at", { ascending: true })
            .limit(5000);

          if (legacyErr) throw legacyErr;
          txRows = ((legacyTx || []) as any[]).map((t) => ({
            id: t.id,
            created_at: t.created_at,
            status: t.status,
            transaction_type: t.transaction_type,
            amount: t.amount,
            currency: t.currency,
            metadata: t.metadata,
          }));
        } catch (e2) {
          console.warn("legacy transactions unavailable/restricted:", e2);
          txRows = [];
        }
      }

      const firstCurrency = txRows.find((t) => (t.currency || "").trim())?.currency;
      if (firstCurrency) currency = String(firstCurrency).toUpperCase();

      // 5) Equipment (optional; for utilization)
      let equipmentRows: EquipmentRow[] = [];
      try {
        const { data: eqData, error: eqErr } = await (supabase.from as any)("imaging_equipment")
          .select("id, status, capacity_per_day")
          .eq("imaging_center_id", centerId);
        if (eqErr) throw eqErr;
        equipmentRows = (eqData || []) as EquipmentRow[];
      } catch (e) {
        console.warn("imaging_equipment unavailable/restricted:", e);
        equipmentRows = [];
      }

      // 6) Referrer user names (optional)
      const referrerUserIds = Array.from(new Set(referrals.map((r) => r.referrer_user_id).filter(Boolean))) as string[];
      const referrerNameMap = new Map<string, string>();
      if (referrerUserIds.length) {
        try {
          const { data: profs, error: profErr } = await supabase
            .from("profiles")
            .select("user_id, full_name, first_name, last_name")
            .in("user_id", referrerUserIds);
          if (profErr) throw profErr;

          for (const p of (profs || []) as any[]) {
            const name =
              p.full_name ||
              [p.first_name, p.last_name].filter(Boolean).join(" ") ||
              "Doctor";
            referrerNameMap.set(p.user_id, name);
          }
        } catch (e) {
          console.warn("profiles unavailable for referrers:", e);
        }
      }

      const stateByReferral = new Map<string, ImagingOrderStateRow>();
      for (const st of workflowRows) {
        if (!st?.referral_id) continue;
        stateByReferral.set(st.referral_id, st);
      }

      const reportByReferral = new Map<string, ImagingReportRow>();
      for (const rep of reportRows) {
        if (!rep?.referral_id) continue;
        reportByReferral.set(rep.referral_id, rep);
      }

      // Normalize referrals into analytics records
      const enriched = referrals.map((r) => {
        const st = stateByReferral.get(r.id);
        const rep = reportByReferral.get(r.id);
        const { modality } = parseModalityAndExam(r);

        const referralStatus = normalizeStatus(r.status);
        const workflowStatus = normalizeStatus(st?.workflow_status) || referralStatus || "scheduled";
        const reportStatus = normalizeStatus(rep?.status);

        const reportDoneAt = rep?.delivered_at || rep?.finalized_at || r.completed_at || null;
        const reportHours = diffHours(r.created_at, reportDoneAt);
        const acceptHours = diffHours(r.created_at, r.accepted_at || null);

        const isCompleted =
          !!reportDoneAt ||
          ["completed", "delivered"].includes(workflowStatus) ||
          ["completed", "delivered"].includes(referralStatus) ||
          ["finalized", "delivered"].includes(reportStatus);

        const isCancelled =
          ["cancelled", "canceled", "rejected"].includes(workflowStatus) ||
          ["cancelled", "canceled", "rejected"].includes(referralStatus);

        const backlogLike =
          ["awaiting_report", "images_ready", "in_progress", "checked_in"].includes(workflowStatus) &&
          !isCompleted &&
          !isCancelled;

        const patientName =
          r.patient_snapshot_full_name ||
          r.patient_name ||
          "Patient";

        const referrerKey =
          (r.referrer_user_id && `user:${r.referrer_user_id}`) ||
          (r.referrer_entity_id && `entity:${r.referrer_entity_id}`) ||
          "unknown";

        const referrerName =
          (r.referrer_user_id && referrerNameMap.get(r.referrer_user_id)) ||
          (r.referrer_entity_id ? `Entity ${r.referrer_entity_id.slice(0, 8)}` : null) ||
          "Unknown referrer";

        return {
          ...r,
          modality,
          patientName,
          workflowStatus,
          referralStatus,
          reportStatus,
          isCompleted,
          isCancelled,
          backlogLike,
          reportDoneAt,
          reportHours,
          acceptHours,
          referrerKey,
          referrerName,
        };
      });

      const currentRefs = enriched.filter((r) => inRange(r.created_at, currentStart, currentEnd));
      const prevRefs = enriched.filter((r) => inRange(r.created_at, prevStart, endOfDay(addDays(currentStart, -1))));

      // Transactions scoped to selected/previous windows
      const currentTx = txRows.filter((t) => inRange(t.created_at || null, currentStart, currentEnd));
      const prevTx = txRows.filter((t) => inRange(t.created_at || null, prevStart, endOfDay(addDays(currentStart, -1))));

      const calcRevenue = (list: BillingTxRow[]) => {
        let charge = 0;
        let refund = 0;

        for (const tx of list) {
          const st = normalizeTxStatus(tx.status);
          const ty = normalizeTxType(tx.transaction_type);
          if (!["completed", "succeeded", "refunded"].includes(st) && st !== "completed") continue;

          const cents = Math.abs(txAmountCents(tx));
          if (ty === "refund" || st === "refunded") refund += cents;
          else charge += cents;
        }

        return {
          revenueCents: charge,
          refundsCents: refund,
          netRevenueCents: Math.max(0, charge - refund),
        };
      };

      const currentMoney = calcRevenue(currentTx);
      const prevMoney = calcRevenue(prevTx);

      const totalScans = currentRefs.length;
      const completedScans = currentRefs.filter((r) => r.isCompleted).length;
      const pendingScans = currentRefs.filter((r) => !r.isCompleted && !r.isCancelled).length;
      const reportBacklog = currentRefs.filter((r) => r.backlogLike).length;

      const avgReportHoursCurrent = avg(currentRefs.map((r) => r.reportHours));
      const avgReportHoursPrev = avg(prevRefs.map((r) => r.reportHours));
      const avgAcceptHoursCurrent = avg(currentRefs.map((r) => r.acceptHours));

      // Utilization estimate = scans / total active capacity in selected period
      const activeEquipment = equipmentRows.filter((e) => normalizeStatus(e.status) === "active");
      const totalCapacityPerDay = activeEquipment.reduce((sum, e) => sum + Math.max(0, asNum(e.capacity_per_day)), 0);
      const capacityForWindow = totalCapacityPerDay * days;
      const utilizationPct =
        capacityForWindow > 0 ? Math.min(999, Math.round((totalScans / capacityForWindow) * 100)) : 0;

      // Daily trend
      const dayMap = new Map<string, { date: string; scans: number; completed: number; revenue: number }>();
      for (let d = new Date(currentStart); d <= currentEnd; d = addDays(d, 1)) {
        const k = dateKey(d);
        dayMap.set(k, { date: k, scans: 0, completed: 0, revenue: 0 });
      }

      for (const r of currentRefs) {
        const k = dateKey(new Date(r.created_at));
        const row = dayMap.get(k);
        if (row) row.scans += 1;
      }

      for (const r of currentRefs) {
        if (!r.reportDoneAt) continue;
        if (!inRange(r.reportDoneAt, currentStart, currentEnd)) continue;
        const k = dateKey(new Date(r.reportDoneAt));
        const row = dayMap.get(k);
        if (row) row.completed += 1;
      }

      // Revenue by day + modality
      const modalityRevenue = new Map<string, number>();
      for (const tx of currentTx) {
        const created = tx.created_at ? new Date(tx.created_at) : null;
        if (!created || !Number.isFinite(created.getTime())) continue;

        const st = normalizeTxStatus(tx.status);
        const ty = normalizeTxType(tx.transaction_type);
        if (st !== "completed" && st !== "refunded") continue;

        const cents = Math.abs(txAmountCents(tx));
        const sign = ty === "refund" || st === "refunded" ? -1 : 1;

        const dk = dateKey(created);
        const dayRow = dayMap.get(dk);
        if (dayRow) dayRow.revenue += sign * cents;

        const pData = safeObj(tx.provider_data);
        const meta = safeObj(tx.metadata);

        const modality =
          asString(pData.modality) ||
          asString(meta.modality) ||
          asString(meta.study_type) ||
          asString(meta.exam_modality);

        if (modality) {
          modalityRevenue.set(modality, (modalityRevenue.get(modality) || 0) + sign * cents);
        }
      }

      const dailyTrend = Array.from(dayMap.values());

      // Modality mix from referrals + revenue by tx metadata/provider_data
      const modalityCount = new Map<string, number>();
      for (const r of currentRefs) {
        const key = r.modality || "Unknown";
        modalityCount.set(key, (modalityCount.get(key) || 0) + 1);
      }

      const modalityData = Array.from(modalityCount.entries())
        .map(([name, value]) => ({
          name,
          value,
          revenue: modalityRevenue.get(name) || 0,
        }))
        .sort((a, b) => b.value - a.value);

      // Workflow breakdown
      const workflowCount = new Map<string, number>();
      for (const r of currentRefs) {
        const key = r.workflowStatus || "scheduled";
        workflowCount.set(key, (workflowCount.get(key) || 0) + 1);
      }
      const workflowBreakdown = Array.from(workflowCount.entries())
        .map(([name, value]) => ({ name: titleizeStatus(name), value }))
        .sort((a, b) => b.value - a.value);

      // Referral status breakdown
      const statusCount = new Map<string, number>();
      for (const r of currentRefs) {
        const key = r.referralStatus || "unknown";
        statusCount.set(key, (statusCount.get(key) || 0) + 1);
      }
      const statusBreakdown = Array.from(statusCount.entries())
        .map(([name, value]) => ({ name: titleizeStatus(name), value }))
        .sort((a, b) => b.value - a.value);

      // Peak hours
      const hourCount = new Map<string, number>();
      for (const r of currentRefs) {
        const h = hourLabel(new Date(r.created_at));
        hourCount.set(h, (hourCount.get(h) || 0) + 1);
      }
      const peakHours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`).map((h) => ({
        hour: h,
        scans: hourCount.get(h) || 0,
      }));

      // Demographics
      const genderCount = new Map<string, number>();
      const ageBucketCount = new Map<string, number>();

      for (const r of currentRefs) {
        const g = normalizeStatus(r.patient_snapshot_gender);
        if (g) {
          const pretty =
            g === "m" || g === "male"
              ? "Male"
              : g === "f" || g === "female"
                ? "Female"
                : g === "other"
                  ? "Other"
                  : "Unknown";
          genderCount.set(pretty, (genderCount.get(pretty) || 0) + 1);
        }

        const bucket = ageBucketFromDob(r.patient_snapshot_dob);
        if (bucket) ageBucketCount.set(bucket, (ageBucketCount.get(bucket) || 0) + 1);
      }

      const demographics = {
        gender: Array.from(genderCount.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        ageBuckets: ["0-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"].map((name) => ({
          name,
          value: ageBucketCount.get(name) || 0,
        })),
      };

      // Top referrers
      const referrerCount = new Map<string, { name: string; value: number }>();
      for (const r of currentRefs) {
        const key = r.referrerKey;
        const existing = referrerCount.get(key);
        if (existing) existing.value += 1;
        else referrerCount.set(key, { name: r.referrerName, value: 1 });
      }
      const topReferrers = Array.from(referrerCount.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Turnaround by modality
      const turnaroundGroups = new Map<string, number[]>();
      for (const r of currentRefs) {
        if (typeof r.reportHours !== "number") continue;
        const key = r.modality || "Unknown";
        const arr = turnaroundGroups.get(key) || [];
        arr.push(r.reportHours);
        turnaroundGroups.set(key, arr);
      }

      const turnaroundByModality = Array.from(turnaroundGroups.entries())
        .map(([type, values]) => ({
          type,
          avgHours: Number((values.reduce((s, n) => s + n, 0) / values.length).toFixed(1)),
        }))
        .sort((a, b) => b.avgHours - a.avgHours);

      const next: AnalyticsResponse = {
        kpis: {
          totalScans,
          completedScans,
          pendingScans,
          revenueCents: currentMoney.revenueCents,
          refundsCents: currentMoney.refundsCents,
          netRevenueCents: currentMoney.netRevenueCents,
          avgReportHours: avgReportHoursCurrent,
          avgAcceptHours: avgAcceptHoursCurrent,
          utilizationPct,
          reportBacklog,
          scansChangePct: pctChange(totalScans, prevRefs.length),
          revenueChangePct: pctChange(currentMoney.netRevenueCents, prevMoney.netRevenueCents),
          // Lower report time is better, UI already inverts arrow logic using <= 0
          reportChangePct: pctChange(avgReportHoursCurrent, avgReportHoursPrev),
        },
        dailyTrend,
        modalityData,
        workflowBreakdown,
        statusBreakdown,
        peakHours,
        demographics,
        topReferrers,
        turnaroundByModality,
      };

      setData(next);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load analytics");
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
    rows.push(["Date", "Scans", "Completed", "RevenueCents"].join(","));
    for (const p of data.dailyTrend || []) {
      rows.push([p.date, p.scans, p.completed, p.revenue].join(","));
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `imaging-analytics-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="h-64 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="h-64 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalScans: 0,
    completedScans: 0,
    pendingScans: 0,
    revenueCents: 0,
    refundsCents: 0,
    netRevenueCents: 0,
    avgReportHours: 0,
    avgAcceptHours: 0,
    utilizationPct: 0,
    reportBacklog: 0,
    scansChangePct: 0,
    revenueChangePct: 0,
    reportChangePct: 0,
  };

  const dailyTrend = data?.dailyTrend || [];
  const modalityData = data?.modalityData || [];
  const workflowBreakdown = data?.workflowBreakdown || [];
  const statusBreakdown = data?.statusBreakdown || [];
  const peakHours = data?.peakHours || [];
  const topReferrers = data?.topReferrers || [];
  const demographics = data?.demographics || { gender: [], ageBuckets: [] };
  const turnaroundByModality = data?.turnaroundByModality || [];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as "7" | "30" | "90")}>
            <SelectTrigger className="w-48">
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
        </div>

        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalScans}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {kpis.scansChangePct >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className={kpis.scansChangePct >= 0 ? "text-green-600" : "text-destructive"}>
                {Math.abs(kpis.scansChangePct)}% vs prev
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{kpis.completedScans} completed</Badge>
              <Badge variant="secondary">{kpis.pendingScans} pending</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatMoneyCents(kpis.netRevenueCents)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {kpis.revenueChangePct >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className={kpis.revenueChangePct >= 0 ? "text-green-600" : "text-destructive"}>
                {Math.abs(kpis.revenueChangePct)}% vs prev
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {formatMoneyCents(kpis.revenueCents)} revenue • {formatMoneyCents(kpis.refundsCents)} refunds
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Report Time</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgReportHours}h</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {kpis.reportChangePct <= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className={kpis.reportChangePct <= 0 ? "text-green-600" : "text-destructive"}>
                {Math.abs(kpis.reportChangePct)}% vs prev
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Avg accept time: {kpis.avgAcceptHours}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ops Health</CardTitle>
            <Badge variant="outline">{kpis.utilizationPct}% util</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.utilizationPct}%</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={kpis.reportBacklog > 0 ? "secondary" : "outline"}>{kpis.reportBacklog} backlog</Badge>
              <Badge variant="outline">{Math.max(0, kpis.pendingScans)} open</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend + Modality */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Trend</CardTitle>
            <CardDescription>Scans and revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrend}>
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value, name) => {
                    if (name === "revenue") return [formatMoneyCents(Number(value)), "Revenue"];
                    return [value as any, String(name)];
                  }}
                />
                <Line type="monotone" dataKey="scans" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Scans" />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={false}
                  name="Completed"
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--chart-3, 215 85% 55%))"
                  strokeWidth={2}
                  dot={false}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modality Mix</CardTitle>
            <CardDescription>Scan distribution by modality</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={modalityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {modalityData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value, _name, props: any) => {
                    const row = props?.payload as { name: string; value: number; revenue: number };
                    return [`${value} scans • ${formatMoneyCents(row?.revenue || 0)}`, row?.name || "Modality"];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ops breakdowns */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Workflow
            </CardTitle>
            <CardDescription>Internal workflow breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {workflowBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                workflowBreakdown.map((r, i) => (
                  <div key={r.name} className="flex items-center justify-between">
                    <span className="text-sm">{r.name}</span>
                    <Badge variant={i === 0 ? "default" : "outline"}>{r.value}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Referral Status
            </CardTitle>
            <CardDescription>Receiver-side status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statusBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                statusBreakdown.map((r, i) => (
                  <div key={r.name} className="flex items-center justify-between">
                    <span className="text-sm">{r.name}</span>
                    <Badge variant={i === 0 ? "default" : "outline"}>{r.value}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Referrers
            </CardTitle>
            <CardDescription>Who sends you the most</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topReferrers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                topReferrers.slice(0, 6).map((r) => (
                  <div key={r.name} className="flex items-center justify-between gap-2">
                    <span className="text-sm truncate">{r.name}</span>
                    <Badge variant="outline">{r.value}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peak hours + Demographics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
            <CardDescription>Scan volume by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={peakHours}>
                <XAxis dataKey="hour" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="scans" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient Demographics</CardTitle>
            <CardDescription>Based on referred patients</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={demographics.gender} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {demographics.gender.map((_, index) => (
                      <Cell key={`cell-g-${index}`} fill={COLORS[index % COLORS.length]} />
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
              <div className="mt-2 text-center text-xs text-muted-foreground">Gender</div>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographics.ageBuckets}>
                  <XAxis dataKey="name" className="text-xs" />
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
              <div className="mt-2 text-center text-xs text-muted-foreground">Age Buckets</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Turnaround by modality */}
      <Card>
        <CardHeader>
          <CardTitle>Turnaround by Modality</CardTitle>
          <CardDescription>Average report completion time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={turnaroundByModality} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="type" type="category" className="text-xs" width={90} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value) => [`${value} hours`, "Avg. Time"]}
              />
              <Bar dataKey="avgHours" fill="hsl(var(--chart-4, 32 95% 55%))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue by Modality */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Modality</CardTitle>
          <CardDescription>Based on recorded billing transactions (if modality metadata is available)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {modalityData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No modality revenue data available yet.</p>
            ) : (
              modalityData.map((item, index) => {
                const max = Math.max(...modalityData.map((m) => Math.abs(m.revenue || 0)), 1);
                const width = (Math.abs(item.revenue || 0) / max) * 100;
                return (
                  <div key={item.name} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">{item.name}</div>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${width}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                    <div className="w-28 text-right text-sm font-medium">{formatMoneyCents(item.revenue)}</div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


