// File: src/components/pharmacy/PharmacyAnalytics.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Pill,
  RefreshCw,
  Truck,
  Shield,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  ClipboardList,
  ThermometerSnowflake,
  Syringe,
  Boxes,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "sonner";

interface Props {
  pharmacyId: string;
}

type TimeRange = "7d" | "30d" | "90d";

type OrderRow = {
  id: string;
  order_number?: string | null;
  pharmacy_id?: string | null;
  patient_id?: string | null;
  prescription_id?: string | null;
  status?: string | null;
  priority?: string | null;
  total_amount?: number | null;
  insurance_amount?: number | null;
  copay_amount?: number | null;
  payment_status?: string | null;
  pickup_method?: string | null;
  estimated_ready_at?: string | null;
  ready_at?: string | null;
  picked_up_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PrescriptionRow = {
  id: string;
  pharmacy_id?: string | null;
  status?: string | null;
  prescribed_at?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  refills_remaining?: number | null;
  refills_total?: number | null;
};

type PrescriptionItemRow = {
  id: string;
  prescription_id?: string | null;
  medication_name?: string | null;
  quantity?: number | null;
  unit?: string | null;
};

type InventoryRow = {
  id: string;
  pharmacy_id?: string | null;
  medication_name?: string | null;
  quantity_on_hand?: number | null;
  quantity_reserved?: number | null;
  reorder_level?: number | null;
  unit_cost?: number | null;
  unit_price?: number | null;
  expiry_date?: string | null;
  requires_refrigeration?: boolean | null;
  is_controlled_substance?: boolean | null;
  controlled_substance_schedule?: string | null;
  manufacturer?: string | null;
};

type ReferralRow = {
  id: string;
  status?: string | null;
  receiver_type?: string | null;
  receiver_entity_id?: string | null;
  created_at?: string | null;
};

type AnalyticsState = {
  kpis: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
    prescriptions: number;
    deliveries: number;
    insuranceCovered: number;
    copayTotal: number;
    claimableOrders: number;
    lowStockItems: number;
    expiringSoon: number;
    outOfStock: number;
    referralsReceived: number;
    fillCompletionRate: number;
    deliveryShare: number;
    avgReadyMinutes: number;
    avgCompletionMinutes: number;
    onTimeReadyRate: number;
    paidOrders: number;
    unpaidOrders: number;
    inventorySkuCount: number;
    inventoryUnits: number;
    inventoryRetailValue: number;
    inventoryCostValue: number;
    controlledSubstanceSkus: number;
    refrigeratedSkus: number;
  };
  changes: {
    revenuePct: number;
    ordersPct: number;
    prescriptionsPct: number;
    referralsPct: number;
  };
  trend: Array<{ date: string; revenue: number; orders: number; completed: number; deliveries: number }>;
  statusBreakdown: Array<{ name: string; value: number }>;
  paymentBreakdown: Array<{ name: string; value: number }>;
  pickupBreakdown: Array<{ name: string; value: number }>;
  claimBreakdown: Array<{ name: string; value: number }>;
  prescriptionStatusBreakdown: Array<{ name: string; value: number }>;
  topMedications: Array<{ name: string; qty: number; rxCount: number }>;
  topRevenueOrders: Array<{ label: string; value: number }>;
  inventoryRiskBuckets: Array<{ name: string; value: number }>;
  warnings: string[];
  dataSources: string[];
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted-foreground))",
];

function toNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatMoney(n: number): string {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(1)}%`;
}

function humanize(value: string): string {
  return String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function startOfUTCDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfUTCDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function getRangeWindow(timeRange: TimeRange) {
  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
  const today = new Date();
  const end = endOfUTCDay(today);
  const start = startOfUTCDay(new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000));

  const previousEnd = endOfUTCDay(new Date(start.getTime() - 24 * 60 * 60 * 1000));
  const previousStart = startOfUTCDay(new Date(previousEnd.getTime() - (days - 1) * 24 * 60 * 60 * 1000));

  return { days, start, end, previousStart, previousEnd };
}

function pctChange(current: number, previous: number): number {
  if (!Number.isFinite(current)) current = 0;
  if (!Number.isFinite(previous)) previous = 0;
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function minutesBetween(a?: string | null, b?: string | null): number | null {
  const d1 = safeDate(a);
  const d2 = safeDate(b);
  if (!d1 || !d2) return null;
  const diff = (d2.getTime() - d1.getTime()) / 60000;
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
}

function buildEmptyAnalytics(): AnalyticsState {
  return {
    kpis: {
      revenue: 0,
      orders: 0,
      avgOrderValue: 0,
      prescriptions: 0,
      deliveries: 0,
      insuranceCovered: 0,
      copayTotal: 0,
      claimableOrders: 0,
      lowStockItems: 0,
      expiringSoon: 0,
      outOfStock: 0,
      referralsReceived: 0,
      fillCompletionRate: 0,
      deliveryShare: 0,
      avgReadyMinutes: 0,
      avgCompletionMinutes: 0,
      onTimeReadyRate: 0,
      paidOrders: 0,
      unpaidOrders: 0,
      inventorySkuCount: 0,
      inventoryUnits: 0,
      inventoryRetailValue: 0,
      inventoryCostValue: 0,
      controlledSubstanceSkus: 0,
      refrigeratedSkus: 0,
    },
    changes: { revenuePct: 0, ordersPct: 0, prescriptionsPct: 0, referralsPct: 0 },
    trend: [],
    statusBreakdown: [],
    paymentBreakdown: [],
    pickupBreakdown: [],
    claimBreakdown: [],
    prescriptionStatusBreakdown: [],
    topMedications: [],
    topRevenueOrders: [],
    inventoryRiskBuckets: [],
    warnings: [],
    dataSources: [],
  };
}

async function queryFulfillmentOrders(
  pharmacyId: string,
  startIso: string,
  endIso: string,
): Promise<{ rows: OrderRow[]; source: string; warning?: string }> {
  const columns =
    "id,order_number,pharmacy_id,patient_id,prescription_id,status,priority,total_amount,insurance_amount,copay_amount,payment_status,pickup_method,estimated_ready_at,ready_at,picked_up_at,created_at,updated_at";

  const primary = await (supabase as any)
    .from("fulfillment_orders")
    .select(columns)
    .eq("pharmacy_id", pharmacyId)
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: true });

  if (!primary.error) {
    return { rows: (primary.data || []) as OrderRow[], source: "fulfillment_orders" };
  }

  const fallback = await (supabase as any)
    .from("pharmacy_orders")
    .select(columns)
    .eq("pharmacy_id", pharmacyId)
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: true });

  if (!fallback.error) {
    return {
      rows: (fallback.data || []) as OrderRow[],
      source: "pharmacy_orders",
      warning: "Using fallback orders table (pharmacy_orders).",
    };
  }

  throw primary.error || fallback.error || new Error("Unable to read fulfillment/pharmacy orders");
}

async function queryPrescriptions(
  pharmacyId: string,
  startIso: string,
  endIso: string,
): Promise<{ rows: PrescriptionRow[]; warning?: string }> {
  const { data, error } = await (supabase as any)
    .from("prescriptions")
    .select("id,pharmacy_id,status,prescribed_at,created_at,expires_at,refills_remaining,refills_total")
    .eq("pharmacy_id", pharmacyId)
    .or(`prescribed_at.gte.${startIso},created_at.gte.${startIso}`)
    .order("created_at", { ascending: true });

  if (error) {
    return { rows: [], warning: `Prescriptions unavailable: ${error.message || "query failed"}` };
  }

  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();

  const rows = ((data || []) as PrescriptionRow[]).filter((row) => {
    const d = safeDate(row.prescribed_at || row.created_at);
    if (!d) return false;
    return d.getTime() >= startMs && d.getTime() <= endMs;
  });

  return { rows };
}

async function queryPrescriptionItems(prescriptionIds: string[]): Promise<{ rows: PrescriptionItemRow[]; warning?: string }> {
  if (!prescriptionIds.length) return { rows: [] };

  const { data, error } = await (supabase as any)
    .from("prescription_items")
    .select("id,prescription_id,medication_name,quantity,unit")
    .in("prescription_id", prescriptionIds.slice(0, 1000));

  if (error) {
    return { rows: [], warning: `Prescription item details unavailable: ${error.message || "query failed"}` };
  }

  return { rows: (data || []) as PrescriptionItemRow[] };
}

async function queryInventory(pharmacyId: string): Promise<{ rows: InventoryRow[]; warning?: string }> {
  const { data, error } = await (supabase as any)
    .from("pharmacy_inventory")
    .select(
      "id,pharmacy_id,medication_name,quantity_on_hand,quantity_reserved,reorder_level,unit_cost,unit_price,expiry_date,requires_refrigeration,is_controlled_substance,controlled_substance_schedule,manufacturer",
    )
    .eq("pharmacy_id", pharmacyId);

  if (error) {
    return { rows: [], warning: `Inventory analytics unavailable: ${error.message || "query failed"}` };
  }

  return { rows: (data || []) as InventoryRow[] };
}

async function queryReferrals(
  pharmacyId: string,
  startIso: string,
  endIso: string,
): Promise<{ rows: ReferralRow[]; warning?: string }> {
  const { data, error } = await (supabase as any)
    .from("referrals")
    .select("id,status,receiver_type,receiver_entity_id,created_at")
    .eq("receiver_type", "pharmacy")
    .eq("receiver_entity_id", pharmacyId)
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: true });

  if (error) {
    return { rows: [], warning: `Referrals unavailable: ${error.message || "query failed"}` };
  }

  return { rows: (data || []) as ReferralRow[] };
}

function sum<T>(rows: T[], fn: (row: T) => number) {
  return rows.reduce((acc, row) => acc + fn(row), 0);
}

function countBy<T>(rows: T[], keyFn: (row: T) => string | null | undefined): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = String(keyFn(row) || "unknown").trim() || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function toBreakdown(map: Record<string, number>) {
  return Object.entries(map)
    .map(([name, value]) => ({ name: humanize(name), value }))
    .sort((a, b) => b.value - a.value);
}

export default function PharmacyAnalytics({ pharmacyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [data, setData] = useState<AnalyticsState>(buildEmptyAnalytics());

  const hasAnyData = useMemo(() => {
    return (
      data.kpis.orders > 0 ||
      data.kpis.prescriptions > 0 ||
      data.kpis.inventorySkuCount > 0 ||
      data.kpis.referralsReceived > 0
    );
  }, [data]);

  const fetchAnalytics = async (isManual = false) => {
    if (!pharmacyId) return;

    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const { start, end, previousStart, previousEnd, days } = getRangeWindow(timeRange);

      const [ordersCurrentRes, ordersPrevRes, rxCurrentRes, rxPrevRes, inventoryRes, referralsCurrentRes, referralsPrevRes] =
        await Promise.all([
          queryFulfillmentOrders(pharmacyId, start.toISOString(), end.toISOString()),
          queryFulfillmentOrders(pharmacyId, previousStart.toISOString(), previousEnd.toISOString()),
          queryPrescriptions(pharmacyId, start.toISOString(), end.toISOString()),
          queryPrescriptions(pharmacyId, previousStart.toISOString(), previousEnd.toISOString()),
          queryInventory(pharmacyId),
          queryReferrals(pharmacyId, start.toISOString(), end.toISOString()),
          queryReferrals(pharmacyId, previousStart.toISOString(), previousEnd.toISOString()),
        ]);

      const warnings: string[] = [];
      const dataSources = new Set<string>();

      if (ordersCurrentRes.warning) warnings.push(ordersCurrentRes.warning);
      if (ordersPrevRes.warning) warnings.push(ordersPrevRes.warning);
      if (rxCurrentRes.warning) warnings.push(rxCurrentRes.warning);
      if (rxPrevRes.warning) warnings.push(rxPrevRes.warning);
      if (inventoryRes.warning) warnings.push(inventoryRes.warning);
      if (referralsCurrentRes.warning) warnings.push(referralsCurrentRes.warning);
      if (referralsPrevRes.warning) warnings.push(referralsPrevRes.warning);

      dataSources.add(ordersCurrentRes.source);
      dataSources.add("prescriptions");
      if (!inventoryRes.warning) dataSources.add("pharmacy_inventory");
      if (!referralsCurrentRes.warning) dataSources.add("referrals");

      const ordersCurrent = ordersCurrentRes.rows;
      const ordersPrevious = ordersPrevRes.rows;
      const prescriptionsCurrent = rxCurrentRes.rows;
      const prescriptionsPrevious = rxPrevRes.rows;
      const inventoryRows = inventoryRes.rows;
      const referralsCurrent = referralsCurrentRes.rows;
      const referralsPrevious = referralsPrevRes.rows;

      const [rxItemsCurrentRes, rxItemsPrevRes] = await Promise.all([
        queryPrescriptionItems(prescriptionsCurrent.map((p) => p.id)),
        queryPrescriptionItems(prescriptionsPrevious.map((p) => p.id)),
      ]);

      if (rxItemsCurrentRes.warning) warnings.push(rxItemsCurrentRes.warning);
      if (rxItemsPrevRes.warning) warnings.push(rxItemsPrevRes.warning);
      if (!rxItemsCurrentRes.warning) dataSources.add("prescription_items");

      const revenue = sum(ordersCurrent, (o) => toNumber(o.total_amount));
      const revenuePrev = sum(ordersPrevious, (o) => toNumber(o.total_amount));
      const ordersCount = ordersCurrent.length;
      const ordersPrevCount = ordersPrevious.length;
      const prescriptionsCount = prescriptionsCurrent.length;
      const deliveries = ordersCurrent.filter((o) => String(o.pickup_method || "").toLowerCase() === "delivery").length;
      const insuranceCovered = sum(ordersCurrent, (o) => toNumber(o.insurance_amount));
      const copayTotal = sum(ordersCurrent, (o) => toNumber(o.copay_amount));
      const claimableOrders = ordersCurrent.filter((o) => toNumber(o.insurance_amount) > 0).length;

      const completedStatuses = new Set(["completed", "delivered", "picked_up"]);
      const completedOrders = ordersCurrent.filter((o) => completedStatuses.has(String(o.status || ""))).length;
      const paidOrders = ordersCurrent.filter((o) =>
        ["paid", "succeeded", "completed"].includes(String(o.payment_status || "").toLowerCase()),
      ).length;
      const unpaidOrders = ordersCurrent.filter(
        (o) => !["paid", "succeeded", "completed"].includes(String(o.payment_status || "").toLowerCase()),
      ).length;

      const readyTimes = ordersCurrent
        .map((o) => minutesBetween(o.created_at, o.ready_at || o.estimated_ready_at))
        .filter((v): v is number => typeof v === "number");

      const completionTimes = ordersCurrent
        .map((o) => minutesBetween(o.created_at, o.picked_up_at || o.updated_at))
        .filter((v): v is number => typeof v === "number");

      const onTimeReadyEligible = ordersCurrent.filter((o) => safeDate(o.estimated_ready_at) && safeDate(o.ready_at));
      const onTimeReadyCount = onTimeReadyEligible.filter((o) => {
        const est = safeDate(o.estimated_ready_at)!;
        const actual = safeDate(o.ready_at)!;
        return actual.getTime() <= est.getTime();
      }).length;

      const inventoryNow = inventoryRows.map((row) => {
        const onHand = toNumber(row.quantity_on_hand);
        const reserved = toNumber(row.quantity_reserved);
        const available = Math.max(0, onHand - reserved);
        const reorder = toNumber(row.reorder_level);
        const expiry = safeDate(row.expiry_date);
        return { ...row, onHand, reserved, available, reorder, expiry };
      });

      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringSoon = inventoryNow.filter((i) => i.expiry && i.expiry.getTime() <= in30Days.getTime()).length;
      const outOfStock = inventoryNow.filter((i) => i.available <= 0).length;
      const lowStockItems = inventoryNow.filter((i) => i.available > 0 && i.available <= i.reorder).length;
      const inventorySkuCount = inventoryNow.length;
      const inventoryUnits = sum(inventoryNow, (i) => i.onHand);
      const inventoryRetailValue = sum(inventoryNow, (i) => i.onHand * toNumber(i.unit_price));
      const inventoryCostValue = sum(inventoryNow, (i) => i.onHand * toNumber(i.unit_cost));
      const controlledSubstanceSkus = inventoryNow.filter((i) => Boolean(i.is_controlled_substance)).length;
      const refrigeratedSkus = inventoryNow.filter((i) => Boolean(i.requires_refrigeration)).length;

      const statusBreakdown = toBreakdown(countBy(ordersCurrent, (o) => o.status));
      const paymentBreakdown = toBreakdown(countBy(ordersCurrent, (o) => o.payment_status));
      const pickupBreakdown = toBreakdown(countBy(ordersCurrent, (o) => o.pickup_method));
      const prescriptionStatusBreakdown = toBreakdown(countBy(prescriptionsCurrent, (p) => p.status));

      const claimBreakdownMap: Record<string, number> = {
        "Claimable Orders": claimableOrders,
        "Non-Claim Orders": Math.max(0, ordersCount - claimableOrders),
      };
      const claimBreakdown = Object.entries(claimBreakdownMap).map(([name, value]) => ({ name, value }));

      const dayBuckets = new Map<string, { date: string; revenue: number; orders: number; completed: number; deliveries: number }>();
      for (let i = 0; i < days; i++) {
        const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        dayBuckets.set(key, {
          date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          revenue: 0,
          orders: 0,
          completed: 0,
          deliveries: 0,
        });
      }

      ordersCurrent.forEach((o) => {
        const d = safeDate(o.created_at);
        if (!d) return;
        const key = d.toISOString().slice(0, 10);
        const bucket = dayBuckets.get(key);
        if (!bucket) return;
        bucket.orders += 1;
        bucket.revenue += toNumber(o.total_amount);
        if (completedStatuses.has(String(o.status || ""))) bucket.completed += 1;
        if (String(o.pickup_method || "").toLowerCase() === "delivery") bucket.deliveries += 1;
      });

      const trend = Array.from(dayBuckets.values());

      const medMap = new Map<string, { name: string; qty: number; rxIds: Set<string> }>();
      rxItemsCurrentRes.rows.forEach((item) => {
        const name = (item.medication_name || "Unknown medication").trim() || "Unknown medication";
        const key = name.toLowerCase();
        if (!medMap.has(key)) medMap.set(key, { name, qty: 0, rxIds: new Set<string>() });
        const entry = medMap.get(key)!;
        entry.qty += Math.max(0, toNumber(item.quantity) || 1);
        if (item.prescription_id) entry.rxIds.add(item.prescription_id);
      });

      let topMedications = Array.from(medMap.values())
        .map((m) => ({ name: m.name, qty: m.qty, rxCount: m.rxIds.size }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 8);

      if (topMedications.length === 0 && inventoryNow.length > 0) {
        topMedications = inventoryNow
          .slice()
          .sort((a, b) => b.onHand - a.onHand)
          .slice(0, 8)
          .map((i) => ({ name: i.medication_name || "Inventory item", qty: i.onHand, rxCount: 0 }));
        warnings.push("Top medications are shown from inventory stock because prescription item data was unavailable.");
      }

      const topRevenueOrders = ordersCurrent
        .slice()
        .sort((a, b) => toNumber(b.total_amount) - toNumber(a.total_amount))
        .slice(0, 8)
        .map((o) => ({ label: o.order_number || o.id.slice(0, 8), value: toNumber(o.total_amount) }));

      const inventoryRiskBuckets = [
        { name: "Healthy", value: inventoryNow.filter((i) => i.available > i.reorder && i.available > 0).length },
        { name: "Low Stock", value: lowStockItems },
        { name: "Out of Stock", value: outOfStock },
        { name: "Expiring ≤30d", value: expiringSoon },
      ];

      const fillCompletionRate = ordersCount > 0 ? (completedOrders / ordersCount) * 100 : 0;
      const deliveryShare = ordersCount > 0 ? (deliveries / ordersCount) * 100 : 0;

      setData({
        kpis: {
          revenue,
          orders: ordersCount,
          avgOrderValue: ordersCount > 0 ? revenue / ordersCount : 0,
          prescriptions: prescriptionsCount,
          deliveries,
          insuranceCovered,
          copayTotal,
          claimableOrders,
          lowStockItems,
          expiringSoon,
          outOfStock,
          referralsReceived: referralsCurrent.length,
          fillCompletionRate,
          deliveryShare,
          avgReadyMinutes: readyTimes.length ? sum(readyTimes, (x) => x) / readyTimes.length : 0,
          avgCompletionMinutes: completionTimes.length ? sum(completionTimes, (x) => x) / completionTimes.length : 0,
          onTimeReadyRate: onTimeReadyEligible.length ? (onTimeReadyCount / onTimeReadyEligible.length) * 100 : 0,
          paidOrders,
          unpaidOrders,
          inventorySkuCount,
          inventoryUnits,
          inventoryRetailValue,
          inventoryCostValue,
          controlledSubstanceSkus,
          refrigeratedSkus,
        },
        changes: {
          revenuePct: pctChange(revenue, revenuePrev),
          ordersPct: pctChange(ordersCount, ordersPrevCount),
          prescriptionsPct: pctChange(prescriptionsCount, prescriptionsPrevious.length),
          referralsPct: pctChange(referralsCurrent.length, referralsPrevious.length),
        },
        trend,
        statusBreakdown,
        paymentBreakdown,
        pickupBreakdown,
        claimBreakdown,
        prescriptionStatusBreakdown,
        topMedications,
        topRevenueOrders,
        inventoryRiskBuckets,
        warnings: Array.from(new Set(warnings)),
        dataSources: Array.from(dataSources),
      });
    } catch (e: any) {
      console.error("Pharmacy analytics error:", e);
      toast.error(e?.message || "Failed to load pharmacy analytics");
      setData({ ...buildEmptyAnalytics(), warnings: [e?.message || "Failed to load analytics"] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacyId, timeRange]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const statusTotal = data.statusBreakdown.reduce((a, b) => a + b.value, 0);
  const paymentTotal = data.paymentBreakdown.reduce((a, b) => a + b.value, 0);
  const pickupTotal = data.pickupBreakdown.reduce((a, b) => a + b.value, 0);
  const topMedMax = Math.max(1, ...data.topMedications.map((m) => m.qty));

  const kpiCards = [
    {
      title: "Revenue",
      value: formatMoney(data.kpis.revenue),
      sub: `${data.changes.revenuePct >= 0 ? "+" : ""}${data.changes.revenuePct.toFixed(1)}% vs previous`,
      icon: <DollarSign className="h-5 w-5 text-primary" />,
    },
    {
      title: "Orders",
      value: data.kpis.orders.toLocaleString(),
      sub: `${data.changes.ordersPct >= 0 ? "+" : ""}${data.changes.ordersPct.toFixed(1)}% vs previous`,
      icon: <ClipboardList className="h-5 w-5 text-primary" />,
    },
    {
      title: "Prescriptions",
      value: data.kpis.prescriptions.toLocaleString(),
      sub: `${data.changes.prescriptionsPct >= 0 ? "+" : ""}${data.changes.prescriptionsPct.toFixed(1)}% vs previous`,
      icon: <Pill className="h-5 w-5 text-primary" />,
    },
    {
      title: "Avg Order Value",
      value: formatMoney(data.kpis.avgOrderValue),
      sub: `${formatPercent(data.kpis.fillCompletionRate)} fill completion`,
      icon: <TrendingUp className="h-5 w-5 text-primary" />,
    },
    {
      title: "Delivery Share",
      value: formatPercent(data.kpis.deliveryShare),
      sub: `${data.kpis.deliveries} delivery order(s)`,
      icon: <Truck className="h-5 w-5 text-primary" />,
    },
    {
      title: "Insurance Covered",
      value: formatMoney(data.kpis.insuranceCovered),
      sub: `${data.kpis.claimableOrders} claimable order(s)`,
      icon: <Shield className="h-5 w-5 text-primary" />,
    },
    {
      title: "Low/Out of Stock",
      value: `${data.kpis.lowStockItems + data.kpis.outOfStock}`,
      sub: `${data.kpis.outOfStock} out • ${data.kpis.lowStockItems} low`,
      icon: <AlertTriangle className="h-5 w-5 text-primary" />,
    },
    {
      title: "Expiring Soon",
      value: data.kpis.expiringSoon.toLocaleString(),
      sub: `Next 30 days`,
      icon: <Clock3 className="h-5 w-5 text-primary" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Pharmacy Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Revenue, fulfillment throughput, inventory health, claims proxy, and referral-driven activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => fetchAnalytics(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {!!data.warnings.length && (
        <Card className="border-yellow-500/30">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Some metrics use partial data / fallbacks
            </div>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              {data.warnings.slice(0, 5).map((w, i) => (
                <li key={`${w}-${i}`}>{w}</li>
              ))}
            </ul>
            {!!data.dataSources.length && (
              <div className="flex flex-wrap gap-2 pt-1">
                {data.dataSources.map((s) => (
                  <Badge key={s} variant="outline">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold break-words">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">{kpi.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Orders & Revenue Trend</CardTitle>
            <CardDescription>Daily order count, completed orders, deliveries, and revenue for the selected range.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.trend.length === 0 ? (
              <div className="text-sm text-muted-foreground">No trend data available.</div>
            ) : (
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trend}>
                    <defs>
                      <linearGradient id="pharmacyRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        if (name === "revenue") return [formatMoney(toNumber(value)), "Revenue"];
                        return [toNumber(value).toLocaleString(), humanize(name)];
                      }}
                    />
                    <Legend />
                    <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#pharmacyRevenueGradient)" />
                    <Line yAxisId="left" type="monotone" dataKey="orders" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="completed" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="deliveries" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Status Mix</CardTitle>
            <CardDescription>{statusTotal} order(s) in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {data.statusBreakdown.length === 0 ? (
              <div className="text-sm text-muted-foreground">No status data available.</div>
            ) : (
              <>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.statusBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {data.statusBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-3">
                  {data.statusBreakdown.slice(0, 6).map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between text-sm gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="truncate text-muted-foreground">{s.name}</span>
                      </div>
                      <span className="font-medium">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>{paymentTotal} order(s) with payment state</CardDescription>
          </CardHeader>
          <CardContent>
            {data.paymentBreakdown.length === 0 ? (
              <div className="text-sm text-muted-foreground">No payment breakdown available.</div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.paymentBreakdown} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Paid Orders</div>
                <div className="text-lg font-semibold">{data.kpis.paidOrders}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Unpaid / Pending</div>
                <div className="text-lg font-semibold">{data.kpis.unpaidOrders}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pickup & Delivery Mix</CardTitle>
            <CardDescription>{pickupTotal} order(s) by pickup method</CardDescription>
          </CardHeader>
          <CardContent>
            {data.pickupBreakdown.length === 0 ? (
              <div className="text-sm text-muted-foreground">No pickup method data available.</div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.pickupBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={82}>
                      {data.pickupBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Claimable Orders</div>
                <div className="text-lg font-semibold">{data.kpis.claimableOrders}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Copay Total</div>
                <div className="text-lg font-semibold">{formatMoney(data.kpis.copayTotal)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational SLA</CardTitle>
            <CardDescription>Turnaround and readiness performance (from available timestamps)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Avg Ready Time</div>
                <div className="text-lg font-semibold">
                  {Number.isFinite(data.kpis.avgReadyMinutes) ? `${Math.round(data.kpis.avgReadyMinutes)} min` : "—"}
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Avg Completion Time</div>
                <div className="text-lg font-semibold">
                  {Number.isFinite(data.kpis.avgCompletionMinutes) ? `${Math.round(data.kpis.avgCompletionMinutes)} min` : "—"}
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">On-Time Ready</div>
                <div className="text-lg font-semibold">{formatPercent(data.kpis.onTimeReadyRate)}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Referrals Received</div>
                <div className="text-lg font-semibold">{data.kpis.referralsReceived}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Fill Completion Rate</span>
                <span className="font-medium">{formatPercent(data.kpis.fillCompletionRate)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, data.kpis.fillCompletionRate))}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Delivery Share</span>
                <span className="font-medium">{formatPercent(data.kpis.deliveryShare)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, data.kpis.deliveryShare))}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5" /> Inventory Health
            </CardTitle>
            <CardDescription>Stock risk, valuation, and controlled/refrigerated inventory coverage.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">SKUs</div>
                <div className="text-xl font-semibold">{data.kpis.inventorySkuCount}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Units On Hand</div>
                <div className="text-xl font-semibold">{data.kpis.inventoryUnits.toLocaleString()}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Retail Value</div>
                <div className="text-xl font-semibold">{formatMoney(data.kpis.inventoryRetailValue)}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Cost Value</div>
                <div className="text-xl font-semibold">{formatMoney(data.kpis.inventoryCostValue)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.inventoryRiskBuckets}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <Syringe className="h-4 w-4 text-primary" /> Controlled Substances
                  </div>
                  <div className="text-2xl font-semibold">{data.kpis.controlledSubstanceSkus}</div>
                  <div className="text-xs text-muted-foreground">SKU(s) marked as controlled substance</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <ThermometerSnowflake className="h-4 w-4 text-primary" /> Refrigerated Inventory
                  </div>
                  <div className="text-2xl font-semibold">{data.kpis.refrigeratedSkus}</div>
                  <div className="text-xs text-muted-foreground">SKU(s) requiring refrigeration</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium mb-1">Inventory Risk Summary</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>{data.kpis.lowStockItems} low-stock SKU(s) at/under reorder level</div>
                    <div>{data.kpis.outOfStock} out-of-stock SKU(s)</div>
                    <div>{data.kpis.expiringSoon} SKU(s) expiring within 30 days</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prescriptions & Claims Proxy</CardTitle>
            <CardDescription>Prescription pipeline, insurance-eligible orders, and payment mix visibility.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[260px]">
                {data.prescriptionStatusBreakdown.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No prescription status data available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.prescriptionStatusBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">Claimable Orders</div>
                  <div className="text-xl font-semibold">{data.kpis.claimableOrders}</div>
                  <div className="text-xs text-muted-foreground mt-1">Orders with insurance amount captured</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">Insurance Covered</div>
                  <div className="text-xl font-semibold">{formatMoney(data.kpis.insuranceCovered)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Insurance amounts in selected period</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">Copay Amount</div>
                  <div className="text-xl font-semibold">{formatMoney(data.kpis.copayTotal)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Copay totals from fulfillment orders</div>
                </div>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.claimBreakdown} dataKey="value" nameKey="name" outerRadius={55}>
                        {data.claimBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Medications</CardTitle>
            <CardDescription>
              Based on prescription item quantities in the selected period
              {data.topMedications.length === 0 ? "" : " (fallbacks may use inventory stock)."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.topMedications.length === 0 ? (
              <div className="text-sm text-muted-foreground">No medication-level data available yet.</div>
            ) : (
              <div className="space-y-3">
                {data.topMedications.map((m) => (
                  <div key={m.name} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="font-medium truncate">{m.name}</div>
                      <div className="text-sm text-muted-foreground shrink-0">{m.qty.toLocaleString()} units</div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mb-2">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (m.qty / topMedMax) * 100)}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground">{m.rxCount.toLocaleString()} prescription(s)</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Largest Orders</CardTitle>
            <CardDescription>Highest-value fulfillment orders in the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topRevenueOrders.length === 0 ? (
              <div className="text-sm text-muted-foreground">No order value data available.</div>
            ) : (
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topRevenueOrders} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any) => [formatMoney(toNumber(v)), "Order Value"]} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!hasAnyData && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              No analytics data yet for this pharmacy. Once prescriptions, fulfillment orders, referrals, and inventory records are added, this dashboard will populate automatically.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
