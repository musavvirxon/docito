// File: src/components/lab/LabAnalytics.tsx
// FULL FILE REPLACEMENT

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, subDays, differenceInHours, differenceInMinutes } from "date-fns";
import {
  BarChart3,
  RefreshCw,
  Loader2,
  TestTube2,
  Clock3,
  CheckCircle2,
  Hourglass,
  XCircle,
  AlertTriangle,
  CircleDollarSign,
  FlaskConical,
  ShieldCheck,
  Activity,
  ClipboardList,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Props = {
  labCenterId: string;
};

type TimeRange = "7d" | "30d" | "90d";

type LabOrder = {
  id: string;
  order_number: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  sample_collected_at: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string | null;
  priority: string | null;
  payment_status: string | null;
  total_amount: number | null;
  insurance_covered: boolean | null;
  patient_id: string | null;
  patient_name?: string | null;
  patient_snapshot_full_name?: string | null;
};

type LabOrderItem = {
  id: string;
  test_order_id: string;
  test_id: string;
  created_at: string;
  updated_at: string;
  status: string | null;
  price: number | null;
  notes: string | null;
  test?: {
    id: string;
    name: string;
    test_code: string;
    category: string;
    sample_type: string | null;
    turnaround_hours: number | null;
    price: number | null;
  } | null;
};

type LabResult = {
  id: string;
  test_order_item_id: string;
  created_at: string;
  updated_at: string;
  performed_at: string | null;
  verified_at: string | null;
  status: string | null;
  is_abnormal: boolean | null;
  abnormal_flag: string | null;
  test_order_item?: {
    id: string;
    test_order_id: string;
    test_id: string;
    status: string | null;
    created_at: string;
    updated_at: string;
  } | null;
};

type LabReferral = {
  id: string;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  sent_at: string | null;
  status: string | null;
  priority: string | null;
  referral_type_enum: string | null;
};

type CatalogRow = {
  id: string;
  name: string;
  test_code: string;
  category: string;
  sample_type: string | null;
  turnaround_hours: number | null;
  price: number | null;
  is_active: boolean | null;
  is_global: boolean | null;
};

type AnalyticsState = {
  orders: LabOrder[];
  orderItems: LabOrderItem[];
  results: LabResult[];
  referrals: LabReferral[];
  catalog: CatalogRow[];
};

const RANGE_DAYS: Record<TimeRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted-foreground))",
];

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function safeDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeStatus(v?: string | null): string {
  return (v || "unknown").toLowerCase().trim();
}

function titleCaseStatus(v?: string | null): string {
  return (v || "unknown")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function percentile(nums: number[], p: number): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

function chunk<T>(arr: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function formatCurrency(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isInCurrentRange(dateValue: string | null | undefined, days: number) {
  const d = safeDate(dateValue);
  if (!d) return false;
  const cutoff = startOfDay(subDays(new Date(), days - 1));
  return d >= cutoff;
}

export default function LabAnalytics({ labCenterId }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsState>({
    orders: [],
    orderItems: [],
    results: [],
    referrals: [],
    catalog: [],
  });

  const fetchAnalytics = async () => {
    if (!labCenterId) {
      setData({ orders: [], orderItems: [], results: [], referrals: [], catalog: [] });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const days = RANGE_DAYS[timeRange];
      const extendedWindowDays = Math.max(days * 2 + 7, 30);
      const sinceIso = subDays(new Date(), extendedWindowDays).toISOString();

      const [
        ordersResp,
        referralsResp,
        catalogResp,
      ] = await Promise.all([
        supabase
          .from("test_orders")
          .select(
            "id,order_number,created_at,updated_at,completed_at,sample_collected_at,scheduled_date,scheduled_time,status,priority,payment_status,total_amount,insurance_covered,patient_id,patient_name,patient_snapshot_full_name",
          )
          .eq("lab_center_id", labCenterId)
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false }),
        supabase
          .from("referrals")
          .select("id,created_at,updated_at,accepted_at,completed_at,sent_at,status,priority,referral_type_enum")
          .eq("receiver_type", "lab")
          .eq("receiver_entity_id", labCenterId)
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false }),
        supabase
          .from("test_catalog")
          .select("id,name,test_code,category,sample_type,turnaround_hours,price,is_active,is_global")
          .or(`lab_center_id.eq.${labCenterId},is_global.eq.true`)
          .order("created_at", { ascending: false }),
      ]);

      if (ordersResp.error) throw ordersResp.error;
      if (referralsResp.error) throw referralsResp.error;
      if (catalogResp.error) throw catalogResp.error;

      const orders = ((ordersResp.data || []) as any[]).map(
        (o) =>
          ({
            ...o,
            total_amount: o.total_amount === null ? null : Number(o.total_amount),
          }) as LabOrder,
      );

      const referrals = ((referralsResp.data || []) as any[]) as LabReferral[];
      const catalog = ((catalogResp.data || []) as any[]) as CatalogRow[];

      const orderIds = orders.map((o) => o.id);
      let orderItems: LabOrderItem[] = [];
      let results: LabResult[] = [];

      if (orderIds.length > 0) {
        const itemChunks = chunk(orderIds, 500);
        const itemQueries = itemChunks.map((ids) =>
          supabase
            .from("test_order_items")
            .select(
              "id,test_order_id,test_id,created_at,updated_at,status,price,notes,test:test_catalog(id,name,test_code,category,sample_type,turnaround_hours,price)",
            )
            .in("test_order_id", ids),
        );

        const itemResponses = await Promise.all(itemQueries);
        for (const r of itemResponses) {
          if (r.error) throw r.error;
          orderItems.push(...(((r.data || []) as any[]) as LabOrderItem[]));
        }

        const itemIds = orderItems.map((i) => i.id);
        if (itemIds.length > 0) {
          const resultChunks = chunk(itemIds, 500);
          const resultQueries = resultChunks.map((ids) =>
            supabase
              .from("test_results")
              .select(
                "id,test_order_item_id,created_at,updated_at,performed_at,verified_at,status,is_abnormal,abnormal_flag,test_order_item:test_order_items(id,test_order_id,test_id,status,created_at,updated_at)",
              )
              .in("test_order_item_id", ids),
          );
          const resultResponses = await Promise.all(resultQueries);
          for (const r of resultResponses) {
            if (r.error) throw r.error;
            results.push(...(((r.data || []) as any[]) as LabResult[]));
          }
        }
      }

      setData({
        orders,
        orderItems,
        results,
        referrals,
        catalog,
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load lab analytics");
      setData({ orders: [], orderItems: [], results: [], referrals: [], catalog: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labCenterId, timeRange]);

  const analytics = useMemo(() => {
    const days = RANGE_DAYS[timeRange];
    const now = new Date();

    const currentCutoff = startOfDay(subDays(now, days - 1));
    const prevStart = startOfDay(subDays(now, days * 2 - 1));
    const prevEnd = startOfDay(subDays(now, days));

    const ordersCurrent = data.orders.filter((o) => {
      const d = safeDate(o.created_at);
      return !!d && d >= currentCutoff;
    });

    const ordersPrev = data.orders.filter((o) => {
      const d = safeDate(o.created_at);
      return !!d && d >= prevStart && d < prevEnd;
    });

    const orderById = new Map(data.orders.map((o) => [o.id, o]));
    const itemsCurrent = data.orderItems.filter((i) => {
      const order = orderById.get(i.test_order_id);
      return !!order && isInCurrentRange(order.created_at, days);
    });
    const itemById = new Map(data.orderItems.map((i) => [i.id, i]));

    const resultsCurrent = data.results.filter((r) => {
      const item = itemById.get(r.test_order_item_id);
      if (!item) return false;
      const order = orderById.get(item.test_order_id);
      if (!order) return false;
      return isInCurrentRange(order.created_at, days);
    });

    const referralsCurrent = data.referrals.filter((r) => isInCurrentRange(r.created_at, days));
    const referralsPrev = data.referrals.filter((r) => {
      const d = safeDate(r.created_at);
      return !!d && d >= prevStart && d < prevEnd;
    });

    const completedOrderStatuses = new Set(["completed", "done", "result_ready"]);
    const inProgressStatuses = new Set(["processing", "in_progress", "under_review", "sample_collected"]);
    const pendingStatuses = new Set(["pending", "new", "scheduled"]);
    const cancelledStatuses = new Set(["cancelled", "canceled", "rejected", "expired"]);

    const completedOrders = ordersCurrent.filter((o) => completedOrderStatuses.has(normalizeStatus(o.status)));
    const inProgressOrders = ordersCurrent.filter((o) => inProgressStatuses.has(normalizeStatus(o.status)));
    const pendingOrders = ordersCurrent.filter((o) => pendingStatuses.has(normalizeStatus(o.status)));
    const cancelledOrders = ordersCurrent.filter((o) => cancelledStatuses.has(normalizeStatus(o.status)));

    const completionRate = ordersCurrent.length ? (completedOrders.length / ordersCurrent.length) * 100 : 0;

    const totalRevenueCurrent = ordersCurrent.reduce((sum, o) => sum + toNum(o.total_amount), 0);
    const totalRevenuePrev = ordersPrev.reduce((sum, o) => sum + toNum(o.total_amount), 0);
    const avgOrderValue = ordersCurrent.length ? totalRevenueCurrent / ordersCurrent.length : 0;

    const totalTestsCurrent = itemsCurrent.length;
    const avgTestsPerOrder = ordersCurrent.length ? totalTestsCurrent / ordersCurrent.length : 0;

    const createdToCompletedHours = completedOrders
      .map((o) => {
        const created = safeDate(o.created_at);
        const completed = safeDate(o.completed_at);
        if (!created || !completed || completed < created) return null;
        return differenceInHours(completed, created);
      })
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    const createdToSampleMinutes = ordersCurrent
      .map((o) => {
        const created = safeDate(o.created_at);
        const sampled = safeDate(o.sample_collected_at);
        if (!created || !sampled || sampled < created) return null;
        return differenceInMinutes(sampled, created);
      })
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    const orderStatusBreakdown = ordersCurrent.reduce<Record<string, number>>((acc, o) => {
      const key = normalizeStatus(o.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const paymentStatusBreakdown = ordersCurrent.reduce<Record<string, number>>((acc, o) => {
      const key = normalizeStatus(o.payment_status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const priorityBreakdown = ordersCurrent.reduce<Record<string, number>>((acc, o) => {
      const key = normalizeStatus(o.priority || "routine");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const categoryBreakdown = itemsCurrent.reduce<Record<string, number>>((acc, i) => {
      const key = (i.test?.category || "Uncategorized").trim() || "Uncategorized";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const sampleTypeBreakdown = itemsCurrent.reduce<Record<string, number>>((acc, i) => {
      const key = (i.test?.sample_type || "Unknown").trim() || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topTestsMap = new Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        category: string;
        volume: number;
        revenue: number;
        abnormal: number;
      }
    >();

    itemsCurrent.forEach((i) => {
      const key = i.test_id;
      const name = i.test?.name || "Unknown test";
      const code = i.test?.test_code || "—";
      const category = i.test?.category || "Uncategorized";
      const price = i.price ?? i.test?.price ?? 0;
      if (!topTestsMap.has(key)) {
        topTestsMap.set(key, { id: key, name, code, category, volume: 0, revenue: 0, abnormal: 0 });
      }
      const row = topTestsMap.get(key)!;
      row.volume += 1;
      row.revenue += toNum(price);
    });

    const resultByItemId = new Map<string, LabResult[]>();
    resultsCurrent.forEach((r) => {
      if (!resultByItemId.has(r.test_order_item_id)) resultByItemId.set(r.test_order_item_id, []);
      resultByItemId.get(r.test_order_item_id)!.push(r);
    });

    itemsCurrent.forEach((i) => {
      const row = topTestsMap.get(i.test_id);
      if (!row) return;
      const list = resultByItemId.get(i.id) || [];
      if (list.some((r) => r.is_abnormal === true)) row.abnormal += 1;
    });

    const topTests = Array.from(topTestsMap.values())
      .sort((a, b) => b.volume - a.volume || b.revenue - a.revenue)
      .slice(0, 10);

    const abnormalCount = resultsCurrent.filter((r) => r.is_abnormal === true).length;
    const verifiedCount = resultsCurrent.filter((r) => !!r.verified_at).length;
    const performedCount = resultsCurrent.filter((r) => !!r.performed_at).length;
    const abnormalRate = resultsCurrent.length ? (abnormalCount / resultsCurrent.length) * 100 : 0;
    const verificationRate = resultsCurrent.length ? (verifiedCount / resultsCurrent.length) * 100 : 0;

    const resultTurnaroundHours = resultsCurrent
      .map((r) => {
        const item = itemById.get(r.test_order_item_id);
        const order = item ? orderById.get(item.test_order_id) : null;
        const created = safeDate(order?.created_at || null);
        const done = safeDate(r.verified_at || r.performed_at || r.updated_at || null);
        if (!created || !done || done < created) return null;
        return differenceInHours(done, created);
      })
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    const slaBreaches = itemsCurrent.filter((i) => {
      const targetHours = toNum(i.test?.turnaround_hours);
      if (!targetHours) return false;
      const order = orderById.get(i.test_order_id);
      const created = safeDate(order?.created_at || null);
      const itemResults = (resultByItemId.get(i.id) || []).slice().sort((a, b) => {
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      });
      const done = safeDate(itemResults[itemResults.length - 1]?.verified_at || itemResults[itemResults.length - 1]?.performed_at || itemResults[itemResults.length - 1]?.updated_at || null);
      if (!created) return false;
      const effectiveDone = done || now;
      const hours = differenceInHours(effectiveDone, created);
      return hours > targetHours;
    }).length;

    const overdueOrders = ordersCurrent.filter((o) => {
      const status = normalizeStatus(o.status);
      if (completedOrderStatuses.has(status) || cancelledStatuses.has(status)) return false;
      const created = safeDate(o.created_at);
      if (!created) return false;
      return differenceInHours(now, created) > 48;
    });

    const pendingVerification = resultsCurrent.filter((r) => !r.verified_at).length;

    const referralStatusBreakdown = referralsCurrent.reduce<Record<string, number>>((acc, r) => {
      const key = normalizeStatus(r.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const referralPriorityBreakdown = referralsCurrent.reduce<Record<string, number>>((acc, r) => {
      const key = normalizeStatus(r.priority || "routine");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const referralCompleted = referralsCurrent.filter((r) =>
      ["completed", "done"].includes(normalizeStatus(r.status)),
    ).length;
    const referralAccepted = referralsCurrent.filter((r) =>
      ["accepted", "booked", "in_progress", "completed"].includes(normalizeStatus(r.status)),
    ).length;

    const revenueChangePct =
      totalRevenuePrev > 0
        ? ((totalRevenueCurrent - totalRevenuePrev) / totalRevenuePrev) * 100
        : totalRevenueCurrent > 0
          ? 100
          : 0;
    const ordersChangePct =
      ordersPrev.length > 0
        ? ((ordersCurrent.length - ordersPrev.length) / ordersPrev.length) * 100
        : ordersCurrent.length > 0
          ? 100
          : 0;
    const referralsChangePct =
      referralsPrev.length > 0
        ? ((referralsCurrent.length - referralsPrev.length) / referralsPrev.length) * 100
        : referralsCurrent.length > 0
          ? 100
          : 0;

    // Daily trend
    const dayMap = new Map<
      string,
      {
        date: string;
        label: string;
        orders: number;
        completedOrders: number;
        tests: number;
        results: number;
        revenue: number;
      }
    >();

    for (let i = days - 1; i >= 0; i--) {
      const d = startOfDay(subDays(now, i));
      const key = format(d, "yyyy-MM-dd");
      dayMap.set(key, {
        date: key,
        label: format(d, days <= 7 ? "EEE" : "MMM d"),
        orders: 0,
        completedOrders: 0,
        tests: 0,
        results: 0,
        revenue: 0,
      });
    }

    ordersCurrent.forEach((o) => {
      const created = safeDate(o.created_at);
      if (!created) return;
      const key = format(created, "yyyy-MM-dd");
      const row = dayMap.get(key);
      if (!row) return;
      row.orders += 1;
      row.revenue += toNum(o.total_amount);
      if (completedOrderStatuses.has(normalizeStatus(o.status))) row.completedOrders += 1;
    });

    itemsCurrent.forEach((i) => {
      const order = orderById.get(i.test_order_id);
      const created = safeDate(order?.created_at || null);
      if (!created) return;
      const key = format(created, "yyyy-MM-dd");
      const row = dayMap.get(key);
      if (!row) return;
      row.tests += 1;
    });

    resultsCurrent.forEach((r) => {
      const item = itemById.get(r.test_order_item_id);
      const order = item ? orderById.get(item.test_order_id) : null;
      const created = safeDate(order?.created_at || null);
      if (!created) return;
      const key = format(created, "yyyy-MM-dd");
      const row = dayMap.get(key);
      if (!row) return;
      row.results += 1;
    });

    const dailyTrend = Array.from(dayMap.values());

    const orderStatusChart = Object.entries(orderStatusBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: titleCaseStatus(name), value }));

    const paymentStatusChart = Object.entries(paymentStatusBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: titleCaseStatus(name), value }));

    const priorityChart = Object.entries(priorityBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: titleCaseStatus(name), value }));

    const categoryChart = Object.entries(categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    const sampleTypeChart = Object.entries(sampleTypeBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    const referralStatusChart = Object.entries(referralStatusBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: titleCaseStatus(name), value }));

    const referralPriorityChart = Object.entries(referralPriorityBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: titleCaseStatus(name), value }));

    const catalogTotal = data.catalog.length;
    const activeCatalog = data.catalog.filter((c) => c.is_active !== false).length;
    const localCatalog = data.catalog.filter((c) => c.is_global !== true).length;
    const catalogCategories = new Set(
      data.catalog.map((c) => (c.category || "").trim()).filter(Boolean),
    ).size;

    const alerts = [
      ...overdueOrders.slice(0, 5).map((o) => ({
        type: "overdue-order",
        severity: "warning" as const,
        title: `${o.order_number} overdue`,
        subtitle: `${titleCaseStatus(o.status)} • created ${format(new Date(o.created_at), "MMM d, HH:mm")}`,
      })),
      ...(pendingVerification > 0
        ? [
            {
              type: "verification-backlog",
              severity: "critical" as const,
              title: "Pending result verification",
              subtitle: `${pendingVerification} result(s) not yet verified`,
            },
          ]
        : []),
      ...(slaBreaches > 0
        ? [
            {
              type: "sla-breach",
              severity: "warning" as const,
              title: "Turnaround SLA breaches",
              subtitle: `${slaBreaches} test item(s) exceeded target turnaround`,
            },
          ]
        : []),
    ].slice(0, 8);

    return {
      days,
      ordersCurrent,
      ordersPrev,
      itemsCurrent,
      resultsCurrent,
      referralsCurrent,
      totalRevenueCurrent,
      avgOrderValue,
      totalTestsCurrent,
      avgTestsPerOrder,
      completionRate,
      completedOrdersCount: completedOrders.length,
      inProgressOrdersCount: inProgressOrders.length,
      pendingOrdersCount: pendingOrders.length,
      cancelledOrdersCount: cancelledOrders.length,
      overdueOrdersCount: overdueOrders.length,
      abnormalCount,
      abnormalRate,
      verifiedCount,
      verificationRate,
      performedCount,
      pendingVerification,
      slaBreaches,
      revenueChangePct,
      ordersChangePct,
      referralsChangePct,
      createdToCompletedAvgHours: avg(createdToCompletedHours),
      createdToCompletedP90Hours: percentile(createdToCompletedHours, 90),
      createdToSampleAvgMin: avg(createdToSampleMinutes),
      createdToSampleP90Min: percentile(createdToSampleMinutes, 90),
      resultTurnaroundAvgHours: avg(resultTurnaroundHours),
      resultTurnaroundP90Hours: percentile(resultTurnaroundHours, 90),
      dailyTrend,
      orderStatusChart,
      paymentStatusChart,
      priorityChart,
      categoryChart,
      sampleTypeChart,
      referralStatusChart,
      referralPriorityChart,
      topTests,
      referralCompleted,
      referralAccepted,
      catalogTotal,
      activeCatalog,
      localCatalog,
      catalogCategories,
      alerts,
      hasData:
        ordersCurrent.length > 0 ||
        itemsCurrent.length > 0 ||
        resultsCurrent.length > 0 ||
        referralsCurrent.length > 0 ||
        data.catalog.length > 0,
    };
  }, [data, timeRange]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header / Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Lab operations analytics across orders, tests, results, referrals, and catalog performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => void fetchAnalytics()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Executive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Orders ({analytics.days}d)</p>
                <p className="text-2xl font-bold">{analytics.ordersCurrent.length.toLocaleString()}</p>
                <p className={`text-xs mt-1 ${analytics.ordersChangePct >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {analytics.ordersChangePct >= 0 ? "+" : ""}
                  {analytics.ordersChangePct.toFixed(1)}% vs previous period
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={analytics.overdueOrdersCount > 0 ? "border-yellow-500/30" : undefined}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.completedOrdersCount} completed • {analytics.pendingOrdersCount} pending
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Test Volume</p>
                <p className="text-2xl font-bold">{analytics.totalTestsCurrent.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.avgTestsPerOrder.toFixed(1)} tests / order
                </p>
              </div>
              <div className="p-2 rounded-lg bg-accent/10">
                <TestTube2 className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Revenue ({analytics.days}d)</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.totalRevenueCurrent)}</p>
                <p className={`text-xs mt-1 ${analytics.revenueChangePct >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {analytics.revenueChangePct >= 0 ? "+" : ""}
                  {analytics.revenueChangePct.toFixed(1)}% vs previous period
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <CircleDollarSign className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA / Result Quality / Referrals / Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Turnaround (avg / P90)</p>
                <p className="text-xl font-bold">
                  {analytics.createdToCompletedAvgHours ? `${Math.round(analytics.createdToCompletedAvgHours)}h` : "—"} /{" "}
                  {analytics.createdToCompletedP90Hours ? `${Math.round(analytics.createdToCompletedP90Hours)}h` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Order created → completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={analytics.pendingVerification > 0 ? "border-orange-500/30" : undefined}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Result Verification</p>
                <p className="text-xl font-bold">{analytics.verificationRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {analytics.verifiedCount} verified • {analytics.pendingVerification} pending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Abnormal Results</p>
                <p className="text-xl font-bold">{analytics.abnormalRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {analytics.abnormalCount} of {analytics.resultsCurrent.length} results
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Incoming Referrals</p>
                <p className="text-xl font-bold">{analytics.referralsCurrent.length}</p>
                <p className={`text-xs mt-1 ${analytics.referralsChangePct >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {analytics.referralsChangePct >= 0 ? "+" : ""}
                  {analytics.referralsChangePct.toFixed(1)}% vs previous period
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend + Status mix */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Orders, Tests & Results Trend</CardTitle>
            <CardDescription>Daily lab throughput in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[330px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyTrend}>
                  <defs>
                    <linearGradient id="labOrdersFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === "revenue") return [formatCurrency(toNum(value)), "Revenue"];
                      return [toNum(value), name];
                    }}
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="orders" name="Orders" stroke="hsl(var(--primary))" fill="url(#labOrdersFill)" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="tests" name="Tests" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="results" name="Results" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Status Mix</CardTitle>
            <CardDescription>Status distribution for lab test orders</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.orderStatusChart.length === 0 ? (
              <div className="text-sm text-muted-foreground">No orders in this period.</div>
            ) : (
              <>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analytics.orderStatusChart} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82}>
                        {analytics.orderStatusChart.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 text-sm mt-2">
                  {analytics.orderStatusChart.slice(0, 7).map((row, idx) => (
                    <div key={row.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <span className="text-muted-foreground truncate">{row.name}</span>
                      </div>
                      <span className="font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top tests + category/payment/priority */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Tests</CardTitle>
            <CardDescription>Most ordered tests in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topTests.length === 0 ? (
              <div className="text-sm text-muted-foreground">No test items found in this period.</div>
            ) : (
              <div className="space-y-4">
                {analytics.topTests.slice(0, 8).map((t, idx) => {
                  const maxVol = analytics.topTests[0]?.volume || 1;
                  const width = Math.max(2, Math.round((t.volume / maxVol) * 100));
                  const abnormalPct = t.volume ? (t.abnormal / t.volume) * 100 : 0;

                  return (
                    <div key={t.id} className="space-y-1.5">
                      <div className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{t.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {t.code} • {t.category}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-medium">{t.volume} tests</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(t.revenue)} • {abnormalPct.toFixed(0)}% abnormal
                          </div>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                      </div>
                      {idx < analytics.topTests.length - 1 && <div className="pt-1" />}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational Mix</CardTitle>
            <CardDescription>Priority, payment, and category distributions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-sm font-medium mb-2">Priority Mix</div>
              <div className="flex flex-wrap gap-2">
                {analytics.priorityChart.length ? (
                  analytics.priorityChart.map((row, i) => (
                    <Badge key={row.name} variant="outline" className="gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      {row.name}: {row.value}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No priority data</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Payment Status</div>
              <div className="h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.paymentStatusChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={52} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any) => [toNum(v), "Orders"]} />
                    <Bar dataKey="value" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Test Categories</div>
              <div className="h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.categoryChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={56} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any) => [toNum(v), "Items"]} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-3))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Turnaround / quality / referrals / catalog */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Turnaround & Quality</CardTitle>
            <CardDescription>SLA and quality indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Order TAT avg / P90</div>
                <div className="font-semibold text-lg">
                  {analytics.createdToCompletedAvgHours ? `${Math.round(analytics.createdToCompletedAvgHours)}h` : "—"} /{" "}
                  {analytics.createdToCompletedP90Hours ? `${Math.round(analytics.createdToCompletedP90Hours)}h` : "—"}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Result TAT avg / P90</div>
                <div className="font-semibold text-lg">
                  {analytics.resultTurnaroundAvgHours ? `${Math.round(analytics.resultTurnaroundAvgHours)}h` : "—"} /{" "}
                  {analytics.resultTurnaroundP90Hours ? `${Math.round(analytics.resultTurnaroundP90Hours)}h` : "—"}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Sample collection avg / P90</div>
                <div className="font-semibold text-lg">
                  {analytics.createdToSampleAvgMin ? `${Math.round(analytics.createdToSampleAvgMin)}m` : "—"} /{" "}
                  {analytics.createdToSampleP90Min ? `${Math.round(analytics.createdToSampleP90Min)}m` : "—"}
                </div>
              </div>
              <div className={`rounded-md border p-3 ${analytics.slaBreaches > 0 ? "border-yellow-500/30" : ""}`}>
                <div className="text-muted-foreground">SLA Breaches</div>
                <div className="font-semibold text-lg">{analytics.slaBreaches}</div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Performed results</span>
                <span className="font-medium">{analytics.performedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Verified results</span>
                <span className="font-medium">{analytics.verifiedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending verification</span>
                <span className="font-medium">{analytics.pendingVerification}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Abnormal results</span>
                <span className="font-medium">{analytics.abnormalCount}</span>
              </div>
            </div>

            {analytics.sampleTypeChart.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Sample Type Mix</div>
                <div className="flex flex-wrap gap-2">
                  {analytics.sampleTypeChart.map((row, i) => (
                    <Badge key={row.name} variant="outline" className="gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      {row.name}: {row.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referral Funnel</CardTitle>
            <CardDescription>Incoming referral pipeline for this lab</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Received</div>
                <div className="font-semibold text-lg">{analytics.referralsCurrent.length}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Accepted / Active</div>
                <div className="font-semibold text-lg">{analytics.referralAccepted}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Completed</div>
                <div className="font-semibold text-lg">{analytics.referralCompleted}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Completion Rate</div>
                <div className="font-semibold text-lg">
                  {analytics.referralsCurrent.length
                    ? `${((analytics.referralCompleted / analytics.referralsCurrent.length) * 100).toFixed(1)}%`
                    : "—"}
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Referral Status</div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.referralStatusChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={52} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any) => [toNum(v), "Referrals"]} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {analytics.referralPriorityChart.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {analytics.referralPriorityChart.map((row, i) => (
                  <Badge key={row.name} variant="outline" className="gap-2">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    {row.name}: {row.value}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catalog Coverage</CardTitle>
            <CardDescription>Test catalog breadth and readiness</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Catalog Total</div>
                <div className="font-semibold text-lg">{analytics.catalogTotal}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Active Tests</div>
                <div className="font-semibold text-lg">{analytics.activeCatalog}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Local Tests</div>
                <div className="font-semibold text-lg">{analytics.localCatalog}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Categories</div>
                <div className="font-semibold text-lg">{analytics.catalogCategories}</div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium mb-3">Current Period Snapshot</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg order value</span>
                  <span className="font-medium">{formatCurrency(analytics.avgOrderValue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">In progress orders</span>
                  <span className="font-medium">{analytics.inProgressOrdersCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cancelled orders</span>
                  <span className="font-medium">{analytics.cancelledOrdersCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Overdue orders (&gt;48h)</span>
                  <span className="font-medium">{analytics.overdueOrdersCount}</span>
                </div>
              </div>
            </div>

            {!analytics.hasData && (
              <div className="text-sm text-muted-foreground">
                No analytics data yet. This dashboard will populate automatically as test orders, results, referrals,
                and catalog items are added.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Operational Alerts</CardTitle>
          <CardDescription>Items requiring attention across lab workflow</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.alerts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No active alerts.</div>
          ) : (
            <div className="space-y-3">
              {analytics.alerts.map((a, idx) => (
                <div key={`${a.type}-${idx}`} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {a.severity === "critical" ? (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : a.severity === "warning" ? (
                          <Hourglass className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        <span>{a.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{a.subtitle}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        a.severity === "critical"
                          ? "border-destructive/30 text-destructive bg-destructive/10"
                          : "border-yellow-500/30 text-yellow-700 bg-yellow-500/10"
                      }
                    >
                      {a.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


