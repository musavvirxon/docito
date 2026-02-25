// File: src/components/pharmacy/PharmacyAnalytics.tsx
// FULL FILE REPLACEMENT

import { useMemo, useState } from "react";
import { format, startOfDay, subDays, differenceInMinutes } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  BarChart3,
  RefreshCw,
  DollarSign,
  Package,
  Pill,
  AlertTriangle,
  Snowflake,
  ShieldAlert,
  Clock3,
  TrendingUp,
  Truck,
  CreditCard,
  CheckCircle2,
} from "lucide-react";

import { usePrescriptions, FulfillmentOrder, Prescription } from "@/hooks/usePrescriptions";
import { usePharmacyInventory, InventoryItem } from "@/hooks/usePharmacyInventory";
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

interface Props {
  pharmacyId: string;
}

type TimeRange = "7d" | "30d" | "90d";

type FulfillmentOrderExt = FulfillmentOrder & {
  created_at?: string;
  updated_at?: string;
  notes?: string | null;
};

type PrescriptionExt = Prescription & {
  created_at?: string;
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

function money(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function safeDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function statusLabel(v?: string | null): string {
  const s = (v || "unknown").toLowerCase().trim();
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeStatus(v?: string | null): string {
  return (v || "unknown").toLowerCase().trim();
}

function inRange(dateValue: string | undefined | null, days: number): boolean {
  const d = safeDate(dateValue);
  if (!d) return false;
  const cutoff = startOfDay(subDays(new Date(), days - 1));
  return d >= cutoff;
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

function getOrderCreatedAt(order: FulfillmentOrderExt): string | undefined {
  return order.created_at || (order as any)?.prescription?.created_at || undefined;
}

export default function PharmacyAnalytics({ pharmacyId }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const {
    prescriptions,
    fulfillmentOrders,
    loading: rxLoading,
    fetchPrescriptions,
    fetchFulfillmentOrders,
  } = usePrescriptions(pharmacyId ? { pharmacyId } : undefined);

  const {
    inventory,
    lowStockItems,
    expiringItems,
    loading: invLoading,
    fetchInventory,
  } = usePharmacyInventory(pharmacyId || undefined);

  const loading = rxLoading || invLoading;

  const analytics = useMemo(() => {
    const days = RANGE_DAYS[timeRange];
    const now = new Date();

    const orders = (fulfillmentOrders || []) as FulfillmentOrderExt[];
    const allPrescriptions = (prescriptions || []) as PrescriptionExt[];
    const inv = (inventory || []) as InventoryItem[];

    const ordersInRange = orders.filter((o) => inRange(getOrderCreatedAt(o), days));
    const prescriptionsInRange = allPrescriptions.filter((p) =>
      inRange(p.prescribed_at || p.created_at, days),
    );

    const totalRevenue = ordersInRange.reduce((sum, o) => sum + toNum(o.total_amount), 0);
    const insuranceRevenue = ordersInRange.reduce((sum, o) => sum + toNum(o.insurance_amount), 0);
    const copayRevenue = ordersInRange.reduce((sum, o) => sum + toNum(o.copay_amount), 0);
    const avgOrderValue = ordersInRange.length ? totalRevenue / ordersInRange.length : 0;

    const orderStatusCounts = ordersInRange.reduce<Record<string, number>>((acc, o) => {
      const key = normalizeStatus(o.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const paymentStatusCounts = ordersInRange.reduce<Record<string, number>>((acc, o) => {
      const key = normalizeStatus(o.payment_status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const pickupMethodCounts = ordersInRange.reduce<Record<string, number>>((acc, o) => {
      const key = normalizeStatus(o.pickup_method || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const completedStatuses = new Set([
      "ready",
      "ready_for_pickup",
      "picked_up",
      "completed",
      "delivered",
    ]);
    const activeStatuses = new Set(["pending", "new", "processing", "confirmed"]);
    const cancelledStatuses = new Set(["cancelled", "canceled", "rejected"]);

    const completedOrders = ordersInRange.filter((o) => completedStatuses.has(normalizeStatus(o.status)));
    const activeOrders = ordersInRange.filter((o) => activeStatuses.has(normalizeStatus(o.status)));
    const cancelledOrders = ordersInRange.filter((o) => cancelledStatuses.has(normalizeStatus(o.status)));

    const fillRate = ordersInRange.length ? (completedOrders.length / ordersInRange.length) * 100 : 0;

    const overdueOrders = ordersInRange.filter((o) => {
      const estimated = safeDate(o.estimated_ready_at || null);
      const ready = safeDate(o.ready_at || null);
      const done = completedStatuses.has(normalizeStatus(o.status)) || cancelledStatuses.has(normalizeStatus(o.status));
      return !!estimated && !ready && !done && estimated < now;
    });

    const prepMinutes = completedOrders
      .map((o) => {
        const created = safeDate(getOrderCreatedAt(o));
        const ready = safeDate(o.ready_at || null);
        if (!created || !ready || ready < created) return null;
        return differenceInMinutes(ready, created);
      })
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    const pickupMinutes = completedOrders
      .map((o) => {
        const ready = safeDate(o.ready_at || null);
        const picked = safeDate(o.picked_up_at || null);
        if (!ready || !picked || picked < ready) return null;
        return differenceInMinutes(picked, ready);
      })
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    // Compare with previous period
    const previousPeriodStart = startOfDay(subDays(new Date(), (days * 2) - 1));
    const previousPeriodEnd = startOfDay(subDays(new Date(), days));

    const ordersPrevPeriod = orders.filter((o) => {
      const d = safeDate(getOrderCreatedAt(o));
      return !!d && d >= previousPeriodStart && d < previousPeriodEnd;
    });

    const prevRevenue = ordersPrevPeriod.reduce((sum, o) => sum + toNum(o.total_amount), 0);
    const prevOrderCount = ordersPrevPeriod.length;

    const revenueChangePct =
      prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : totalRevenue > 0 ? 100 : 0;
    const ordersChangePct =
      prevOrderCount > 0
        ? ((ordersInRange.length - prevOrderCount) / prevOrderCount) * 100
        : ordersInRange.length > 0
          ? 100
          : 0;

    // Daily trend (client-side aggregation)
    const dayMap = new Map<string, { date: string; label: string; revenue: number; orders: number; completed: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = startOfDay(subDays(now, i));
      const key = format(d, "yyyy-MM-dd");
      dayMap.set(key, {
        date: key,
        label: format(d, days <= 7 ? "EEE" : "MMM d"),
        revenue: 0,
        orders: 0,
        completed: 0,
      });
    }

    ordersInRange.forEach((o) => {
      const d = safeDate(getOrderCreatedAt(o));
      if (!d) return;
      const key = format(d, "yyyy-MM-dd");
      const row = dayMap.get(key);
      if (!row) return;
      row.orders += 1;
      row.revenue += toNum(o.total_amount);
      if (completedStatuses.has(normalizeStatus(o.status))) row.completed += 1;
    });

    const dailyTrend = Array.from(dayMap.values());

    // Top medications (from prescriptions in range)
    const medMap = new Map<string, { name: string; units: number; rxCount: number }>();
    prescriptionsInRange.forEach((p) => {
      const seenThisRx = new Set<string>();
      (p.items || []).forEach((it: any) => {
        const name = String(it?.medication_name || "Unknown medication").trim() || "Unknown medication";
        const qty = Math.max(0, toNum(it?.quantity));
        const key = name.toLowerCase();
        if (!medMap.has(key)) medMap.set(key, { name, units: 0, rxCount: 0 });
        const row = medMap.get(key)!;
        row.units += qty;
        if (!seenThisRx.has(key)) {
          row.rxCount += 1;
          seenThisRx.add(key);
        }
      });
    });

    const topMedications = Array.from(medMap.values())
      .sort((a, b) => b.units - a.units || b.rxCount - a.rxCount)
      .slice(0, 10);

    // Inventory analytics (not time-range filtered: current snapshot)
    const inventoryRows = inv.map((item) => {
      const onHand = toNum(item.quantity_on_hand);
      const reserved = toNum(item.quantity_reserved);
      const available = Math.max(0, onHand - reserved);
      const reorder = toNum(item.reorder_level);
      const unitCost = toNum(item.unit_cost);
      const unitPrice = toNum(item.unit_price);
      const costValue = onHand * unitCost;
      const retailValue = onHand * unitPrice;
      const expiry = safeDate(item.expiry_date || null);
      const daysToExpiry = expiry ? Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const low = available <= reorder && onHand > 0;
      const out = onHand <= 0;
      const expired = daysToExpiry !== null && daysToExpiry < 0;
      const expSoon = daysToExpiry !== null && daysToExpiry <= 30;

      return {
        ...item,
        onHand,
        reserved,
        available,
        reorder,
        unitCost,
        unitPrice,
        costValue,
        retailValue,
        daysToExpiry,
        low,
        out,
        expired,
        expSoon,
      };
    });

    const inventoryTotals = inventoryRows.reduce(
      (acc, r) => {
        acc.skus += 1;
        acc.onHandUnits += r.onHand;
        acc.availableUnits += r.available;
        acc.reservedUnits += r.reserved;
        acc.costValue += r.costValue;
        acc.retailValue += r.retailValue;
        if (r.low) acc.lowStock += 1;
        if (r.out) acc.outOfStock += 1;
        if (r.expSoon) acc.expiringSoon += 1;
        if (r.expired) acc.expired += 1;
        if (r.requires_refrigeration) acc.refrigerated += 1;
        if (r.is_controlled_substance) acc.controlled += 1;
        return acc;
      },
      {
        skus: 0,
        onHandUnits: 0,
        availableUnits: 0,
        reservedUnits: 0,
        costValue: 0,
        retailValue: 0,
        lowStock: 0,
        outOfStock: 0,
        expiringSoon: 0,
        expired: 0,
        refrigerated: 0,
        controlled: 0,
      },
    );

    const inventoryHealth = [
      { name: "Healthy", value: Math.max(0, inventoryRows.length - inventoryTotals.lowStock - inventoryTotals.outOfStock) },
      { name: "Low Stock", value: inventoryTotals.lowStock },
      { name: "Out of Stock", value: inventoryTotals.outOfStock },
      { name: "Expiring", value: inventoryTotals.expiringSoon },
    ].filter((x) => x.value > 0);

    const expiryBuckets = [
      { label: "Expired", count: 0 },
      { label: "0–7d", count: 0 },
      { label: "8–30d", count: 0 },
      { label: "31–90d", count: 0 },
      { label: "90d+", count: 0 },
      { label: "No expiry", count: 0 },
    ];

    inventoryRows.forEach((r) => {
      const d = r.daysToExpiry;
      if (d === null) expiryBuckets[5].count += 1;
      else if (d < 0) expiryBuckets[0].count += 1;
      else if (d <= 7) expiryBuckets[1].count += 1;
      else if (d <= 30) expiryBuckets[2].count += 1;
      else if (d <= 90) expiryBuckets[3].count += 1;
      else expiryBuckets[4].count += 1;
    });

    const topInventoryValue = [...inventoryRows]
      .sort((a, b) => b.retailValue - a.retailValue)
      .slice(0, 8)
      .map((r) => ({
        name: r.medication_name.length > 18 ? `${r.medication_name.slice(0, 18)}…` : r.medication_name,
        value: Number(r.retailValue.toFixed(2)),
      }));

    const manufacturerCounts = inventoryRows.reduce<Record<string, number>>((acc, r) => {
      const k = (r.manufacturer || "Unknown").trim() || "Unknown";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const manufacturerChart = Object.entries(manufacturerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({
        name: name.length > 16 ? `${name.slice(0, 16)}…` : name,
        count,
      }));

    // Breakdown arrays for charts
    const statusBreakdown = Object.entries(orderStatusCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: statusLabel(name), value }));

    const paymentBreakdown = Object.entries(paymentStatusCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: statusLabel(name), value }));

    const pickupBreakdown = Object.entries(pickupMethodCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: statusLabel(name), value }));

    // Alerts
    const unpaidOrders = ordersInRange.filter((o) => {
      const p = normalizeStatus(o.payment_status);
      return !["paid", "captured", "succeeded", "completed"].includes(p);
    });

    const recentAlerts = [
      ...lowStockItems.slice(0, 5).map((x) => ({
        kind: "inventory-low",
        title: `${x.medication_name} low stock`,
        subtitle: `${toNum(x.quantity_on_hand) - toNum(x.quantity_reserved)} available • reorder ${toNum(x.reorder_level)}`,
        severity: "warning" as const,
      })),
      ...expiringItems.slice(0, 5).map((x) => ({
        kind: "inventory-expiring",
        title: `${x.medication_name} expiring`,
        subtitle: x.expiry_date ? `Expiry ${x.expiry_date}` : "Expiry soon",
        severity: "warning" as const,
      })),
      ...overdueOrders.slice(0, 5).map((o) => ({
        kind: "order-overdue",
        title: `${o.order_number || "Order"} overdue`,
        subtitle: `Status: ${statusLabel(o.status)}${o.estimated_ready_at ? ` • ETA ${format(new Date(o.estimated_ready_at), "MMM d, HH:mm")}` : ""}`,
        severity: "critical" as const,
      })),
      ...unpaidOrders.slice(0, 5).map((o) => ({
        kind: "payment-open",
        title: `${o.order_number || "Order"} payment pending`,
        subtitle: `${statusLabel(o.payment_status)} • ${money(toNum(o.total_amount))}`,
        severity: "info" as const,
      })),
    ].slice(0, 10);

    return {
      days,
      ordersInRange,
      prescriptionsInRange,
      totalRevenue,
      insuranceRevenue,
      copayRevenue,
      avgOrderValue,
      fillRate,
      completedCount: completedOrders.length,
      activeCount: activeOrders.length,
      cancelledCount: cancelledOrders.length,
      overdueCount: overdueOrders.length,
      revenueChangePct,
      ordersChangePct,
      dailyTrend,
      topMedications,
      statusBreakdown,
      paymentBreakdown,
      pickupBreakdown,
      prepMinutesAvg: avg(prepMinutes),
      prepMinutesP90: percentile(prepMinutes, 90),
      pickupMinutesAvg: avg(pickupMinutes),
      pickupMinutesP90: percentile(pickupMinutes, 90),
      inventoryTotals,
      inventoryHealth,
      expiryBuckets,
      topInventoryValue,
      manufacturerChart,
      recentAlerts,
      hasAnyData:
        ordersInRange.length > 0 ||
        prescriptionsInRange.length > 0 ||
        inventoryRows.length > 0,
    };
  }, [timeRange, fulfillmentOrders, prescriptions, inventory, lowStockItems, expiringItems]);

  const handleRefresh = async () => {
    await Promise.allSettled([fetchPrescriptions(), fetchFulfillmentOrders(), fetchInventory()]);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header / Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            End-to-end pharmacy analytics across fulfillment, prescriptions, payments, and inventory
          </p>
        </div>

        <div className="flex items-center gap-2">
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

          <Button variant="outline" size="sm" onClick={handleRefresh}>
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
                <p className="text-sm text-muted-foreground">Revenue ({analytics.days}d)</p>
                <p className="text-2xl font-bold">{money(analytics.totalRevenue)}</p>
                <p className={`text-xs mt-1 ${analytics.revenueChangePct >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {analytics.revenueChangePct >= 0 ? "+" : ""}
                  {analytics.revenueChangePct.toFixed(1)}% vs previous period
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Fulfillment Orders</p>
                <p className="text-2xl font-bold">{analytics.ordersInRange.length.toLocaleString()}</p>
                <p className={`text-xs mt-1 ${analytics.ordersChangePct >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {analytics.ordersChangePct >= 0 ? "+" : ""}
                  {analytics.ordersChangePct.toFixed(1)}% vs previous period
                </p>
              </div>
              <div className="p-2 rounded-lg bg-accent/10">
                <Package className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={analytics.overdueCount > 0 ? "border-orange-500/30" : undefined}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Fill Rate</p>
                <p className="text-2xl font-bold">{analytics.fillRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.completedCount} completed • {analytics.activeCount} active
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
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">{money(analytics.avgOrderValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Insurance {money(analytics.insuranceRevenue)} • Copay {money(analytics.copayRevenue)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operations + SLA + Inventory snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className={analytics.overdueCount > 0 ? "border-yellow-500/30" : undefined}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Prep Time (avg / P90)</p>
                <p className="text-xl font-bold">
                  {analytics.prepMinutesAvg ? `${Math.round(analytics.prepMinutesAvg)}m` : "—"} /{" "}
                  {analytics.prepMinutesP90 ? `${Math.round(analytics.prepMinutesP90)}m` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Pickup Time (avg / P90)</p>
                <p className="text-xl font-bold">
                  {analytics.pickupMinutesAvg ? `${Math.round(analytics.pickupMinutesAvg)}m` : "—"} /{" "}
                  {analytics.pickupMinutesP90 ? `${Math.round(analytics.pickupMinutesP90)}m` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={analytics.inventoryTotals.lowStock + analytics.inventoryTotals.outOfStock > 0 ? "border-yellow-500/30" : undefined}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Inventory Risk</p>
                <p className="text-xl font-bold">
                  {analytics.inventoryTotals.lowStock + analytics.inventoryTotals.outOfStock}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.inventoryTotals.lowStock} low • {analytics.inventoryTotals.outOfStock} out
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Current Inventory Value</p>
                <p className="text-xl font-bold">{money(analytics.inventoryTotals.retailValue)}</p>
                <p className="text-xs text-muted-foreground">
                  Cost basis {money(analytics.inventoryTotals.costValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend + Status */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Revenue & Order Trend</CardTitle>
            <CardDescription>Daily performance for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyTrend}>
                  <defs>
                    <linearGradient id="pharmacyRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === "revenue") return [money(toNum(value)), "Revenue"];
                      if (name === "orders") return [toNum(value), "Orders"];
                      if (name === "completed") return [toNum(value), "Completed"];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="hsl(var(--primary))"
                    fill="url(#pharmacyRevenueFill)"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fulfillment Status Mix</CardTitle>
            <CardDescription>Order status distribution ({analytics.days}d)</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.statusBreakdown.length === 0 ? (
              <div className="text-sm text-muted-foreground">No order data in this period.</div>
            ) : (
              <>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analytics.statusBreakdown} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84}>
                        {analytics.statusBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 mt-2">
                  {analytics.statusBreakdown.slice(0, 6).map((row, i) => (
                    <div key={row.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="truncate text-muted-foreground">{row.name}</span>
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

      {/* Medication + payment/pickup */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Medications</CardTitle>
            <CardDescription>Dispensed / prescribed quantities in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topMedications.length === 0 ? (
              <div className="text-sm text-muted-foreground">No medication line-items in this period.</div>
            ) : (
              <div className="space-y-4">
                {analytics.topMedications.slice(0, 8).map((m, i) => {
                  const maxUnits = analytics.topMedications[0]?.units || 1;
                  const pct = Math.max(2, Math.round((m.units / maxUnits) * 100));
                  return (
                    <div key={`${m.name}-${i}`} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Pill className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate">{m.name}</span>
                        </div>
                        <span className="text-muted-foreground shrink-0">
                          {m.units} units • {m.rxCount} Rx
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments & Pickup Methods</CardTitle>
            <CardDescription>Operational mix for selected orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {analytics.paymentBreakdown.length === 0 && analytics.pickupBreakdown.length === 0 ? (
              <div className="text-sm text-muted-foreground">No payment or pickup data in this period.</div>
            ) : (
              <>
                <div>
                  <div className="text-sm font-medium mb-2">Payment Status</div>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.paymentBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={54} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: any) => [toNum(v), "Orders"]} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Pickup / Delivery Mix</div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {analytics.pickupBreakdown.map((row, i) => (
                      <Badge key={row.name} variant="outline" className="gap-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        {row.name}: {row.value}
                      </Badge>
                    ))}
                  </div>

                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.pickupBreakdown.map((r, idx) => ({ ...r, idx: idx + 1 }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: any) => [toNum(v), "Orders"]} />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--accent))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Health</CardTitle>
            <CardDescription>Current stock snapshot by risk</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.inventoryHealth.length === 0 ? (
              <div className="text-sm text-muted-foreground">No inventory records yet.</div>
            ) : (
              <>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analytics.inventoryHealth} dataKey="value" nameKey="name" innerRadius={46} outerRadius={78}>
                        {analytics.inventoryHealth.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 mt-2 text-sm">
                  {analytics.inventoryHealth.map((row, i) => (
                    <div key={row.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-muted-foreground">{row.name}</span>
                      </div>
                      <span className="font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                  <div className="rounded-md border p-2">
                    <div className="text-muted-foreground">SKUs</div>
                    <div className="font-semibold">{analytics.inventoryTotals.skus}</div>
                  </div>
                  <div className="rounded-md border p-2">
                    <div className="text-muted-foreground">Units On Hand</div>
                    <div className="font-semibold">{analytics.inventoryTotals.onHandUnits.toLocaleString()}</div>
                  </div>
                  <div className="rounded-md border p-2">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Controlled
                    </div>
                    <div className="font-semibold">{analytics.inventoryTotals.controlled}</div>
                  </div>
                  <div className="rounded-md border p-2">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <Snowflake className="h-3.5 w-3.5" />
                      Refrigerated
                    </div>
                    <div className="font-semibold">{analytics.inventoryTotals.refrigerated}</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expiry Distribution</CardTitle>
            <CardDescription>Current inventory expiry buckets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[310px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.expiryBuckets}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => [toNum(v), "SKUs"]} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Inventory Value & Manufacturers</CardTitle>
            <CardDescription>Highest-value stock and supplier concentration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {analytics.topInventoryValue.length > 0 ? (
              <div>
                <div className="text-sm font-medium mb-2">Top Stock by Retail Value</div>
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.topInventoryValue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" hide />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => [money(toNum(v)), "Retail Value"]} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No inventory value data yet.</div>
            )}

            {analytics.manufacturerChart.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Top Manufacturers (SKU count)</div>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.manufacturerChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => [toNum(v), "SKUs"]} />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-3))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts / Operational feed */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Operational Alerts</CardTitle>
            <CardDescription>Cross-module issues needing attention</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentAlerts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No current alerts across fulfillment and inventory.</div>
            ) : (
              <div className="space-y-3">
                {analytics.recentAlerts.map((a, i) => (
                  <div key={`${a.kind}-${i}`} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{a.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{a.subtitle}</div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          a.severity === "critical"
                            ? "border-destructive/30 text-destructive bg-destructive/10"
                            : a.severity === "warning"
                              ? "border-yellow-500/30 text-yellow-700 bg-yellow-500/10"
                              : "border-primary/30 text-primary bg-primary/10"
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

        <Card>
          <CardHeader>
            <CardTitle>Quick Snapshot</CardTitle>
            <CardDescription>Period + current inventory summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Orders ({analytics.days}d)</div>
                <div className="font-semibold text-lg">{analytics.ordersInRange.length}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Prescriptions ({analytics.days}d)</div>
                <div className="font-semibold text-lg">{analytics.prescriptionsInRange.length}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Overdue Orders</div>
                <div className="font-semibold text-lg">{analytics.overdueCount}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Cancelled / Rejected</div>
                <div className="font-semibold text-lg">{analytics.cancelledCount}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Low Stock Items</div>
                <div className="font-semibold text-lg">{analytics.inventoryTotals.lowStock}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Expiring Soon</div>
                <div className="font-semibold text-lg">{analytics.inventoryTotals.expiringSoon}</div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium mb-2">Revenue Composition</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Insurance-paid</span>
                  <span className="font-medium">{money(analytics.insuranceRevenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Copay / patient-paid</span>
                  <span className="font-medium">{money(analytics.copayRevenue)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Total order amount</span>
                  <span className="font-semibold">{money(analytics.totalRevenue)}</span>
                </div>
              </div>
            </div>

            {!analytics.hasAnyData && (
              <div className="text-sm text-muted-foreground">
                No data has been recorded yet. Once prescriptions, fulfillment orders, and inventory items are added,
                analytics will populate automatically from live Supabase data.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
// File: src/components/pharmacy/PharmacyAnalytics.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Package,
  Pill,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

type FulfillmentOrderRow = {
  id: string;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  total_amount?: number | string | null;
  total_amount_cents?: number | string | null;
  amount?: number | string | null;
  amount_cents?: number | string | null;
  copay_amount?: number | string | null;
  insurance_amount?: number | string | null;
  payment_status?: string | null;
  prescription_id?: string | null;
};

type PrescriptionRow = {
  id: string;
  status?: string | null;
  created_at?: string | null;
  prescribed_at?: string | null;
  prescription_items?: Array<{
    medication_name?: string | null;
    quantity?: number | null;
  }> | null;
};

type InventoryRow = {
  id: string;
  medication_name?: string | null;
  quantity_on_hand?: number | null;
  quantity_reserved?: number | null;
  reorder_level?: number | null;
  expiry_date?: string | null;
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function daysFromRange(range: TimeRange) {
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  return 7;
}

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, ".").trim());
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function majorAmountFromRow(row: FulfillmentOrderRow): number {
  const centsLike =
    toNum(row.total_amount_cents) ||
    toNum(row.amount_cents);

  if (centsLike > 0) return centsLike / 100;

  const total = toNum(row.total_amount);
  if (total > 0) return total;

  const alt = toNum(row.amount);
  if (alt > 0) return alt;

  const copay = toNum(row.copay_amount);
  const insurance = toNum(row.insurance_amount);
  const combined = copay + insurance;
  if (combined > 0) return combined;

  return 0;
}

function fmtMoney(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pctChange(current: number, prev: number) {
  if (!prev && !current) return 0;
  if (!prev) return 100;
  return Number((((current - prev) / prev) * 100).toFixed(1));
}

function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(key: string) {
  const d = new Date(`${key}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function fetchFulfillmentOrders(pharmacyId: string, sinceIso: string): Promise<FulfillmentOrderRow[]> {
  // Prefer fulfillment_orders, fallback to pharmacy_orders
  const try1 = await (supabase as any)
    .from("fulfillment_orders")
    .select("id,status,created_at,updated_at,total_amount,total_amount_cents,amount,amount_cents,copay_amount,insurance_amount,payment_status,prescription_id")
    .eq("pharmacy_id", pharmacyId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });

  if (!try1.error) return (try1.data || []) as FulfillmentOrderRow[];

  const try2 = await (supabase as any)
    .from("pharmacy_orders")
    .select("id,status,created_at,updated_at,total_amount,total_amount_cents,amount,amount_cents,copay_amount,insurance_amount,payment_status,prescription_id")
    .eq("pharmacy_id", pharmacyId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });

  if (try2.error) throw try2.error;
  return (try2.data || []) as FulfillmentOrderRow[];
}

export default function PharmacyAnalytics({ pharmacyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalPrescriptions: 0,
    avgOrderValue: 0,
    revenueChange: 0,
    ordersChange: 0,
    lowStockItems: 0,
    expiringSoon: 0,
  });

  const [revenueData, setRevenueData] = useState<Array<{ date: string; revenue: number; orders: number }>>([]);
  const [topMedications, setTopMedications] = useState<Array<{ name: string; count: number; revenue: number }>>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<Array<{ name: string; value: number }>>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<Array<{ name: string; value: number }>>([]);

  const hasAnyData = useMemo(() => {
    return (
      stats.totalOrders > 0 ||
      stats.totalRevenue > 0 ||
      revenueData.length > 0 ||
      topMedications.length > 0 ||
      ordersByStatus.some((x) => (x?.value || 0) > 0)
    );
  }, [ordersByStatus, revenueData.length, stats.totalOrders, stats.totalRevenue, topMedications.length]);

  const fetchAnalytics = useCallback(async () => {
    if (!pharmacyId) return;

    try {
      setLoading(true);

      const days = daysFromRange(timeRange);
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);

      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - days);

      const [ordersAll, prescriptionsResp, inventoryResp] = await Promise.all([
        fetchFulfillmentOrders(pharmacyId, prevStart.toISOString()),
        (supabase as any)
          .from("prescriptions")
          .select("id,status,created_at,prescribed_at,prescription_items(medication_name,quantity)")
          .eq("pharmacy_id", pharmacyId)
          .gte("created_at", prevStart.toISOString())
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("pharmacy_inventory")
          .select("id,medication_name,quantity_on_hand,quantity_reserved,reorder_level,expiry_date")
          .eq("pharmacy_id", pharmacyId),
      ]);

      if (prescriptionsResp.error) throw prescriptionsResp.error;
      if (inventoryResp.error) throw inventoryResp.error;

      const orders = (ordersAll || []) as FulfillmentOrderRow[];
      const prescriptions = ((prescriptionsResp.data || []) as PrescriptionRow[]) ?? [];
      const inventory = ((inventoryResp.data || []) as InventoryRow[]) ?? [];

      const currentOrders = orders.filter((o) => {
        const d = safeDate(o.created_at);
        return !!d && d >= start;
      });
      const previousOrders = orders.filter((o) => {
        const d = safeDate(o.created_at);
        return !!d && d >= prevStart && d < start;
      });

      const currentRevenue = currentOrders.reduce((sum, o) => sum + majorAmountFromRow(o), 0);
      const prevRevenue = previousOrders.reduce((sum, o) => sum + majorAmountFromRow(o), 0);

      const currentPrescriptions = prescriptions.filter((p) => {
        const d = safeDate(p.created_at || p.prescribed_at);
        return !!d && d >= start;
      });

      const dayMap = new Map<string, { revenue: number; orders: number }>();
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dayMap.set(dayKey(d), { revenue: 0, orders: 0 });
      }
      for (const o of currentOrders) {
        const d = safeDate(o.created_at);
        if (!d) continue;
        const key = dayKey(d);
        const slot = dayMap.get(key);
        if (!slot) continue;
        slot.orders += 1;
        slot.revenue += majorAmountFromRow(o);
      }

      const statusCounts = new Map<string, number>();
      const paymentCounts = new Map<string, number>();

      for (const o of currentOrders) {
        const status = (o.status || "unknown").replaceAll("_", " ").trim();
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);

        const pay = (o.payment_status || "unknown").replaceAll("_", " ").trim();
        paymentCounts.set(pay, (paymentCounts.get(pay) || 0) + 1);
      }

      const topMedMap = new Map<string, { count: number; revenue: number }>();

      // Approximate revenue distribution per medication line by splitting order revenue equally across items in a prescription
      const rxById = new Map<string, PrescriptionRow>();
      for (const p of currentPrescriptions) rxById.set(p.id, p);

      for (const o of currentOrders) {
        const p = o.prescription_id ? rxById.get(o.prescription_id) : undefined;
        const items = (p?.prescription_items || []).filter((x) => x?.medication_name);
        if (!items.length) continue;

        const orderRevenue = majorAmountFromRow(o);
        const share = items.length ? orderRevenue / items.length : 0;

        for (const item of items) {
          const name = (item.medication_name || "Medication").trim();
          const entry = topMedMap.get(name) || { count: 0, revenue: 0 };
          entry.count += Math.max(1, Number(item.quantity || 1));
          entry.revenue += share;
          topMedMap.set(name, entry);
        }
      }

      const nowDate = new Date();
      const thirtyDays = new Date();
      thirtyDays.setDate(nowDate.getDate() + 30);

      const lowStock = inventory.filter((i) => {
        const onHand = Number(i.quantity_on_hand || 0);
        const reserved = Number(i.quantity_reserved || 0);
        const reorder = Number(i.reorder_level || 0);
        return onHand - reserved <= reorder;
      }).length;

      const expiringSoon = inventory.filter((i) => {
        if (!i.expiry_date) return false;
        const d = safeDate(i.expiry_date);
        return !!d && d <= thirtyDays;
      }).length;

      setStats({
        totalRevenue: Number(currentRevenue.toFixed(2)),
        totalOrders: currentOrders.length,
        totalPrescriptions: currentPrescriptions.length,
        avgOrderValue: currentOrders.length ? Number((currentRevenue / currentOrders.length).toFixed(2)) : 0,
        revenueChange: pctChange(currentRevenue, prevRevenue),
        ordersChange: pctChange(currentOrders.length, previousOrders.length),
        lowStockItems: lowStock,
        expiringSoon,
      });

      setRevenueData(
        Array.from(dayMap.entries()).map(([k, v]) => ({
          date: formatDayLabel(k),
          revenue: Number(v.revenue.toFixed(2)),
          orders: v.orders,
        })),
      );

      setOrdersByStatus(
        Array.from(statusCounts.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
      );

      setPaymentBreakdown(
        Array.from(paymentCounts.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
      );

      setTopMedications(
        Array.from(topMedMap.entries())
          .map(([name, v]) => ({ name, count: v.count, revenue: Number(v.revenue.toFixed(2)) }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
      );
    } catch (e: any) {
      console.error("Error fetching pharmacy analytics:", e);
      toast.error(e?.message || "Failed to load analytics");
      setStats({
        totalRevenue: 0,
        totalOrders: 0,
        totalPrescriptions: 0,
        avgOrderValue: 0,
        revenueChange: 0,
        ordersChange: 0,
        lowStockItems: 0,
        expiringSoon: 0,
      });
      setRevenueData([]);
      setTopMedications([]);
      setOrdersByStatus([]);
      setPaymentBreakdown([]);
    } finally {
      setLoading(false);
    }
  }, [pharmacyId, timeRange]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const topMax = Math.max(1, ...(topMedications || []).map((m) => Number(m.count || 0)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Analytics Dashboard
        </h2>

        <div className="flex items-center gap-3">
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

          <Button variant="ghost" size="sm" onClick={() => void fetchAnalytics()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card className="xl:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold">{fmtMoney(stats.totalRevenue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {stats.revenueChange >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm ${stats.revenueChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {stats.revenueChange >= 0 ? "+" : ""}
                    {stats.revenueChange}%
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Orders</p>
            <p className="text-3xl font-bold">{stats.totalOrders.toLocaleString()}</p>
            <p className="text-xs mt-1 text-muted-foreground">
              {stats.ordersChange >= 0 ? "+" : ""}
              {stats.ordersChange}% vs previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Prescriptions</p>
            <p className="text-3xl font-bold">{stats.totalPrescriptions.toLocaleString()}</p>
            <p className="text-xs mt-1 text-muted-foreground">Assigned in period</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Avg Order</p>
            <p className="text-3xl font-bold">{fmtMoney(stats.avgOrderValue)}</p>
            <p className="text-xs mt-1 text-muted-foreground">Per fulfillment order</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Low Stock</p>
            <p className="text-3xl font-bold">{stats.lowStockItems}</p>
            <p className="text-xs mt-1 text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Expiring soon: {stats.expiringSoon}
            </p>
          </CardContent>
        </Card>
      </div>

      {!hasAnyData ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No analytics data available yet for this pharmacy.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue and order volume for selected range</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="rxRevenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                      <Tooltip
                        formatter={(value: any, name: any) =>
                          name === "revenue" ? [fmtMoney(Number(value)), "Revenue"] : [Number(value), "Orders"]
                        }
                      />
                      <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rxRevenueFill)" />
                      <Bar yAxisId="right" dataKey="orders" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Status Mix</CardTitle>
                <CardDescription>Current range</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ordersByStatus.length ? ordersByStatus : [{ name: "No data", value: 1 }]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={96}
                        paddingAngle={2}
                      >
                        {(ordersByStatus.length ? ordersByStatus : [{ name: "No data", value: 1 }]).map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 mt-2">
                  {ordersByStatus.slice(0, 6).map((s, i) => (
                    <div key={`${s.name}-${i}`} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="truncate capitalize">{s.name}</span>
                      </div>
                      <span className="font-medium">{s.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Medications</CardTitle>
                <CardDescription>Based on prescription items in selected range</CardDescription>
              </CardHeader>
              <CardContent>
                {topMedications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No medication item data yet.</p>
                ) : (
                  <div className="space-y-4">
                    {topMedications.map((m, idx) => (
                      <div key={`${m.name}-${idx}`} className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Pill className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm font-medium truncate">{m.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0">
                            {m.count} • {fmtMoney(m.revenue)}
                          </div>
                        </div>
                        <div className="h-2 rounded bg-muted overflow-hidden">
                          <div
                            className="h-full rounded bg-primary"
                            style={{ width: `${Math.max(8, (m.count / topMax) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Status Breakdown</CardTitle>
                <CardDescription>Fulfillment order payment statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-18} textAnchor="end" height={52} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Direct Supabase queries only (no edge function dependency).
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
