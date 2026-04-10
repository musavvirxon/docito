// File: src/components/pharmacy/FulfillmentQueue.tsx
// FULL FILE REPLACEMENT

import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

import { usePrescriptions, FulfillmentOrder } from "@/hooks/usePrescriptions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Clock,
  CheckCircle,
  Package,
  Truck,
  Eye,
  RefreshCw,
  Timer,
  Activity,
  DollarSign,
  AlertTriangle,
  ClipboardList,
  CreditCard,
  Pill,
} from "lucide-react";

interface Props {
  pharmacyId: string;
}

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

function humanize(value?: string | null) {
  return String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isActiveQueueStatus(status?: string | null) {
  return ["pending", "processing", "ready"].includes(String(status || "").toLowerCase());
}

function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function money(v: number) {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FulfillmentQueue({ pharmacyId }: Props) {
  const { t } = useTranslation("pharmacyAdminDashboard");
  const { fulfillmentOrders, loading, processFulfillment, fetchFulfillmentOrders } = usePrescriptions({ pharmacyId });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [pickupFilter, setPickupFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return fulfillmentOrders.filter((order) => {
      const matchesSearch =
        !q ||
        order.order_number?.toLowerCase().includes(q) ||
        order.status?.toLowerCase().includes(q) ||
        order.priority?.toLowerCase().includes(q) ||
        order.pickup_method?.toLowerCase().includes(q) ||
        order.payment_status?.toLowerCase().includes(q) ||
        order.prescription?.prescription_number?.toLowerCase().includes(q) ||
        order.prescription?.items?.some((item) =>
          `${item.medication_name} ${item.dosage} ${item.frequency}`.toLowerCase().includes(q),
        );

      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || (order.priority || "normal") === priorityFilter;
      const matchesPickup = pickupFilter === "all" || order.pickup_method === pickupFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesPickup;
    });
  }, [fulfillmentOrders, searchTerm, statusFilter, priorityFilter, pickupFilter]);

  const analytics = useMemo(() => {
    const all = fulfillmentOrders;
    const active = all.filter((o) => isActiveQueueStatus(o.status));
    const now = Date.now();

    const byStatus = all.reduce<Record<string, number>>((acc, o) => {
      const key = String(o.status || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byPriority = all.reduce<Record<string, number>>((acc, o) => {
      const key = String(o.priority || "normal");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byPickup = all.reduce<Record<string, number>>((acc, o) => {
      const key = String(o.pickup_method || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byPayment = all.reduce<Record<string, number>>((acc, o) => {
      const key = String(o.payment_status || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const overdueActive = active.filter((o) => {
      const est = safeDate(o.estimated_ready_at);
      return !!est && est.getTime() < now && ["pending", "processing"].includes(String(o.status || ""));
    });

    const readyAwaitingPickup = all.filter((o) => o.status === "ready");
    const deliveryInQueue = all.filter(
      (o) => o.pickup_method === "delivery" && ["pending", "processing", "ready", "out_for_delivery"].includes(o.status),
    );

    const totalValue = all.reduce((s, o) => s + toNumber(o.total_amount), 0);
    const insuranceCovered = all.reduce((s, o) => s + toNumber(o.insurance_amount), 0);
    const copays = all.reduce((s, o) => s + toNumber(o.copay_amount), 0);

    const avgCycleMins = (() => {
      const completed = all.filter((o) => o.status === "completed" && o.ready_at);
      if (!completed.length) return 0;
      const values = completed
        .map((o) => {
          const start = safeDate((o as any).created_at || o.estimated_ready_at || null);
          const end = safeDate(o.picked_up_at || o.ready_at || null);
          if (!start || !end) return null;
          return (end.getTime() - start.getTime()) / 60000;
        })
        .filter((v): v is number => v !== null && Number.isFinite(v) && v >= 0);
      if (!values.length) return 0;
      return values.reduce((a, b) => a + b, 0) / values.length;
    })();

    const statusPie = Object.entries(byStatus).map(([name, value]) => ({
      name: humanize(name),
      value,
    }));

    const priorityBar = ["urgent", "high", "normal", "low"].map((k) => ({
      name: humanize(k),
      value: byPriority[k] || 0,
    }));

    const pickupBar = Object.entries(byPickup).map(([name, value]) => ({
      name: humanize(name),
      value,
    }));

    const trendBuckets = new Map<string, { date: string; incoming: number; completed: number; value: number }>();

    all.forEach((o: any) => {
      const created = safeDate(o.created_at || null);
      if (created) {
        const key = created.toISOString().slice(0, 10);
        if (!trendBuckets.has(key)) {
          trendBuckets.set(key, {
            date: format(created, "MMM d"),
            incoming: 0,
            completed: 0,
            value: 0,
          });
        }
        const row = trendBuckets.get(key)!;
        row.incoming += 1;
        row.value += toNumber(o.total_amount);
      }

      const completedAt = safeDate(o.picked_up_at || o.ready_at || null);
      if (o.status === "completed" && completedAt) {
        const key = completedAt.toISOString().slice(0, 10);
        if (!trendBuckets.has(key)) {
          trendBuckets.set(key, {
            date: format(completedAt, "MMM d"),
            incoming: 0,
            completed: 0,
            value: 0,
          });
        }
        const row = trendBuckets.get(key)!;
        row.completed += 1;
      }
    });

    const trend = Array.from(trendBuckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([, v]) => ({
        ...v,
        value: Number(v.value.toFixed(2)),
      }));

    const paymentMix = Object.entries(byPayment).map(([name, value]) => ({
      name: humanize(name),
      value,
    }));

    return {
      counts: {
        total: all.length,
        active: active.length,
        pending: byStatus.pending || 0,
        processing: byStatus.processing || 0,
        ready: byStatus.ready || 0,
        completed: byStatus.completed || 0,
        cancelled: byStatus.cancelled || 0,
        overdueActive: overdueActive.length,
        readyAwaitingPickup: readyAwaitingPickup.length,
        deliveryInQueue: deliveryInQueue.length,
        urgent: byPriority.urgent || 0,
        high: byPriority.high || 0,
      },
      finance: {
        totalValue,
        insuranceCovered,
        copays,
        avgOrderValue: all.length ? totalValue / all.length : 0,
        avgCycleMins,
      },
      statusPie,
      priorityBar,
      pickupBar,
      paymentMix,
      trend,
    };
  }, [fulfillmentOrders]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
      processing: "bg-blue-500/10 text-blue-700 border-blue-500/30",
      ready: "bg-green-500/10 text-green-700 border-green-500/30",
      completed: "bg-primary/10 text-primary border-primary/30",
      cancelled: "bg-destructive/10 text-destructive border-destructive/30",
      out_for_delivery: "bg-orange-500/10 text-orange-700 border-orange-500/30",
      delivered: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    };

    return (
      <Badge variant="outline" className={styles[status] || "bg-muted text-muted-foreground"}>
        {humanize(status)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority?: string | null) => {
    const value = String(priority || "normal");
    if (value === "urgent") return <Badge variant="destructive">Urgent</Badge>;
    if (value === "high") return <Badge variant="secondary">High</Badge>;
    if (value === "low") return <Badge variant="outline">Low</Badge>;
    return <Badge variant="outline">Normal</Badge>;
  };

  const handleAction = async (orderId: string, action: string) => {
    setProcessing(true);
    try {
      await processFulfillment(orderId, action);
      setIsDetailsOpen(false);
      setSelectedOrder(null);
    } finally {
      setProcessing(false);
    }
  };

  const viewDetails = (order: FulfillmentOrder) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const getOrderAge = (order: FulfillmentOrder) => {
    const created = safeDate((order as any).created_at || null);
    if (!created) return "—";
    return formatDistanceToNow(created, { addSuffix: true });
  };

  const isOverdue = (order: FulfillmentOrder) => {
    if (!["pending", "processing"].includes(order.status)) return false;
    const est = safeDate(order.estimated_ready_at);
    return !!est && est.getTime() < Date.now();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Pill className="h-6 w-6" />
              Fulfillment Queue
            </h2>
            <p className="text-sm text-muted-foreground">
              End-to-end processing queue for prescription fulfillment orders
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={() => fetchFulfillmentOrders()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Orders
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Active Queue</p>
                  <p className="text-2xl font-bold">{analytics.counts.active}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.counts.pending} pending • {analytics.counts.processing} processing • {analytics.counts.ready} ready
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={analytics.counts.overdueActive > 0 ? "border-yellow-500/30" : undefined}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue / At Risk</p>
                  <p className="text-2xl font-bold">{analytics.counts.overdueActive}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.counts.urgent} urgent • {analytics.counts.high} high priority
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Queue Value</p>
                  <p className="text-2xl font-bold">{money(analytics.finance.totalValue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg order {money(analytics.finance.avgOrderValue)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Insurance / Copay</p>
                  <p className="text-xl font-bold">{money(analytics.finance.insuranceCovered)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Copay {money(analytics.finance.copays)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Fulfillment Cycle</p>
                  <p className="text-xl font-bold">
                    {analytics.finance.avgCycleMins > 0 ? `${Math.round(analytics.finance.avgCycleMins)} min` : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Ready Awaiting Pickup</p>
                  <p className="text-xl font-bold">{analytics.counts.readyAwaitingPickup}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Queue</p>
                  <p className="text-xl font-bold">{analytics.counts.deliveryInQueue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Completed Orders</p>
                  <p className="text-xl font-bold">{analytics.counts.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Queue Throughput Trend</CardTitle>
              <CardDescription>Incoming and completed orders (last 14 activity days)</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.trend.length === 0 ? (
                <div className="text-sm text-muted-foreground">No throughput data yet.</div>
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: any, name: string) => {
                          if (name === "value") return [money(toNumber(value)), "Order Value"];
                          return [toNumber(value), humanize(name)];
                        }}
                      />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="incoming" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line yAxisId="left" type="monotone" dataKey="completed" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="value" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Mix</CardTitle>
              <CardDescription>Distribution across all fulfillment orders</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.statusPie.length === 0 ? (
                <div className="text-sm text-muted-foreground">No orders available.</div>
              ) : (
                <>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.statusPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82}>
                          {analytics.statusPie.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 mt-2">
                    {analytics.statusPie.map((s, i) => (
                      <div key={s.name} className="flex items-center justify-between text-sm gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Priority Distribution</CardTitle>
              <CardDescription>Workload by urgency level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.priorityBar}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any) => [toNumber(v), "Orders"]} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pickup & Payment Mix</CardTitle>
              <CardDescription>Operational split for fulfillment routing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-sm font-medium mb-2">Pickup Methods</p>
                <div className="space-y-2">
                  {analytics.pickupBar.length ? (
                    analytics.pickupBar.map((row) => (
                      <div key={row.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{row.name}</span>
                        <span className="font-medium">{row.value}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No pickup data.</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Payment Statuses</p>
                <div className="space-y-2">
                  {analytics.paymentMix.length ? (
                    analytics.paymentMix.map((row) => (
                      <div key={row.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{row.name}</span>
                        <span className="font-medium">{row.value}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No payment data.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queue table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Queue Orders
            </CardTitle>
            <CardDescription>Search, filter, monitor SLA risk, and process fulfillment actions</CardDescription>
          </CardHeader>

          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search order #, status, meds, prescription..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="out_for_delivery">Out for delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={pickupFilter} onValueChange={setPickupFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pickup" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All pickup</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amounts</TableHead>
                    <TableHead>ETA / Age</TableHead>
                    <TableHead>Prescription</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No orders match the current filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id} className={isOverdue(order) ? "bg-yellow-500/5" : undefined}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{order.order_number}</div>
                            <div className="text-xs text-muted-foreground font-mono">{order.id.slice(0, 8)}…</div>
                          </div>
                        </TableCell>

                        <TableCell>{getPriorityBadge(order.priority)}</TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {order.pickup_method === "delivery" ? (
                              <>
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <span>Delivery</span>
                              </>
                            ) : (
                              <>
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span>Pickup</span>
                              </>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>{getStatusBadge(order.status)}</TableCell>

                        <TableCell>
                          <div className="text-sm">
                            <div>{humanize(order.payment_status)}</div>
                            {toNumber(order.insurance_amount) > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Insurance {money(toNumber(order.insurance_amount))}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{money(toNumber(order.total_amount))}</div>
                            <div className="text-xs text-muted-foreground">
                              Copay {money(toNumber(order.copay_amount))}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="text-muted-foreground">
                              {order.estimated_ready_at
                                ? format(new Date(order.estimated_ready_at), "MMM d, h:mm a")
                                : "No ETA"}
                            </div>
                            <div className={`text-xs ${isOverdue(order) ? "text-yellow-700 font-medium" : "text-muted-foreground"}`}>
                              {getOrderAge(order)}
                              {isOverdue(order) ? " • Overdue" : ""}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1 text-sm max-w-[220px]">
                            <div className="truncate">
                              {order.prescription?.prescription_number || order.prescription_id || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {(order.prescription?.items || []).slice(0, 2).map((i) => i.medication_name).join(", ") || "No items"}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => viewDetails(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>

                            {order.status === "pending" && (
                              <Button size="sm" onClick={() => handleAction(order.id, "start_processing")}>
                                <Clock className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            )}

                            {order.status === "processing" && (
                              <Button size="sm" onClick={() => handleAction(order.id, "ready_for_pickup")}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {order.pickup_method === "delivery" ? "Dispatch Ready" : "Ready"}
                              </Button>
                            )}

                            {order.status === "ready" && order.pickup_method !== "delivery" && (
                              <Button size="sm" onClick={() => handleAction(order.id, "complete")}>
                                Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Showing {filteredOrders.length} of {fulfillmentOrders.length} order(s) in fulfillment queue.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order Details — {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Prescription, pricing, routing, and fulfillment action controls
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(selectedOrder.status)}
                {getPriorityBadge(selectedOrder.priority)}
                <Badge variant="outline">{humanize(selectedOrder.pickup_method)}</Badge>
                <Badge variant="outline">{humanize(selectedOrder.payment_status)}</Badge>
                {isOverdue(selectedOrder) && (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">
                    Overdue
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium">Order Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Order Number</span>
                      <span className="font-medium">{selectedOrder.order_number}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Order ID</span>
                      <span className="font-mono text-xs">{selectedOrder.id}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Prescription</span>
                      <span className="font-medium">
                        {selectedOrder.prescription?.prescription_number || selectedOrder.prescription_id}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Patient ID</span>
                      <span className="font-mono text-xs">{selectedOrder.patient_id}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">ETA</span>
                      <span>
                        {selectedOrder.estimated_ready_at
                          ? format(new Date(selectedOrder.estimated_ready_at), "MMM d, yyyy h:mm a")
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Age</span>
                      <span>{getOrderAge(selectedOrder)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium">Pricing</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Total Amount</span>
                      <span className="font-medium">{money(toNumber(selectedOrder.total_amount))}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Insurance Amount</span>
                      <span>{money(toNumber(selectedOrder.insurance_amount))}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Copay Amount</span>
                      <span>{money(toNumber(selectedOrder.copay_amount))}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between gap-3">
                      <span className="text-muted-foreground">Payment Status</span>
                      <span>{humanize(selectedOrder.payment_status)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedOrder.prescription && (
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-3">Prescription Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.prescription.items?.length ? (
                      selectedOrder.prescription.items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-3 p-3 rounded-md bg-muted/40">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{item.medication_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.dosage} • {item.frequency}
                            </p>
                            {item.instructions ? (
                              <p className="text-xs text-muted-foreground mt-1">{item.instructions}</p>
                            ) : null}
                          </div>
                          <div className="text-right text-sm shrink-0">
                            <p>
                              Qty: {item.quantity} {item.unit || ""}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No prescription items linked.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-3">Timeline</h4>
                <div className="space-y-3">
                  {(() => {
                    const entries = [
                      (selectedOrder as any).created_at
                        ? { label: "Order Created", at: (selectedOrder as any).created_at, icon: <ClipboardList className="h-4 w-4 text-primary" /> }
                        : null,
                      selectedOrder.estimated_ready_at
                        ? { label: "Estimated Ready", at: selectedOrder.estimated_ready_at, icon: <Clock className="h-4 w-4 text-blue-600" /> }
                        : null,
                      selectedOrder.ready_at
                        ? { label: "Marked Ready", at: selectedOrder.ready_at, icon: <Package className="h-4 w-4 text-green-600" /> }
                        : null,
                      selectedOrder.picked_up_at
                        ? { label: "Completed / Picked Up", at: selectedOrder.picked_up_at, icon: <CheckCircle className="h-4 w-4 text-primary" /> }
                        : null,
                    ].filter(Boolean) as Array<{ label: string; at: string; icon: JSX.Element }>;

                    if (!entries.length) {
                      return <p className="text-sm text-muted-foreground">No timeline events available.</p>;
                    }

                    return entries.map((event, idx) => (
                      <div key={`${event.label}-${idx}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {event.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{event.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.at), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>

            {selectedOrder?.status === "pending" && (
              <Button onClick={() => handleAction(selectedOrder.id, "start_processing")} disabled={processing}>
                {processing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
                Start Processing
              </Button>
            )}

            {selectedOrder?.status === "processing" && (
              <Button onClick={() => handleAction(selectedOrder.id, "ready_for_pickup")} disabled={processing}>
                {processing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {selectedOrder.pickup_method === "delivery" ? "Mark Ready for Dispatch" : "Mark Ready"}
              </Button>
            )}

            {selectedOrder?.status === "ready" && selectedOrder.pickup_method !== "delivery" && (
              <Button onClick={() => handleAction(selectedOrder.id, "complete")} disabled={processing}>
                {processing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                Complete Order
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
