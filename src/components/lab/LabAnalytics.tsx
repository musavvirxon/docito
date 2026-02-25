// File: src/components/lab/LabAnalytics.tsx
// FULL FILE REPLACEMENT
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  BarChart3,
  Clock3,
  CheckCircle2,
  Hourglass,
  XCircle,
  AlertTriangle,
  Percent,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type Props = {
  labCenterId: string;
};

type TimeRange = "7d" | "30d" | "90d";
type OrderRow = Record<string, any>;

type Kpis = {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  cancelled: number;
  overdue: number;
  completionRatePct: number;
  avgTurnaroundHours: number;
  avgProcessingHours: number;
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted-foreground))",
];

function daysFromRange(r: TimeRange) {
  if (r === "30d") return 30;
  if (r === "90d") return 90;
  return 7;
}

function normalizeStatus(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function isPendingStatus(status: string) {
  return ["pending", "new", "awaiting_sample", "awaiting_confirmation"].includes(status);
}

function isInProgressStatus(status: string) {
  return [
    "in_progress",
    "processing",
    "under_review",
    "sample_collected",
    "analyzing",
    "testing",
    "in_lab",
    "received",
  ].includes(status);
}

function isCompletedStatus(status: string) {
  return ["completed", "done", "result_ready", "reported", "finalized"].includes(status);
}

function isCancelledStatus(status: string) {
  return ["cancelled", "canceled", "rejected", "declined", "voided"].includes(status);
}

function isReadyStatus(status: string) {
  return ["result_ready", "completed", "reported", "finalized"].includes(status);
}

function toDateSafe(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function pickDate(row: OrderRow, keys: string[]): Date | null {
  for (const k of keys) {
    const d = toDateSafe(row?.[k]);
    if (d) return d;
  }
  return null;
}

function getCreatedAt(order: OrderRow) {
  return pickDate(order, ["created_at", "ordered_at", "requested_at", "scheduled_at"]);
}

function getCompletedAt(order: OrderRow) {
  return pickDate(order, ["completed_at", "result_ready_at", "reported_at", "finalized_at", "updated_at"]);
}

function getDueAt(order: OrderRow) {
  return pickDate(order, ["due_at", "expected_completion_at", "promised_at", "target_at", "deadline_at"]);
}

function getStartedAt(order: OrderRow) {
  return pickDate(order, ["sample_collected_at", "collected_at", "received_at", "accepted_at", "created_at"]);
}

function getDeliveredAt(order: OrderRow) {
  return pickDate(order, ["result_delivered_at", "delivered_at", "shared_at", "patient_notified_at", "sent_at"]);
}

function getCategory(order: OrderRow): string {
  const raw =
    order?.test_category ??
    order?.category ??
    order?.test_type ??
    order?.panel_name ??
    order?.test_name ??
    order?.service_name ??
    order?.name;

  const s = String(raw || "").trim();
  if (!s) return "Other";
  return s.length > 28 ? `${s.slice(0, 28)}…` : s;
}

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function labelFromDayKey(key: string) {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return Math.round(sorted[idx] * 10) / 10;
}

export default function LabAnalytics({ labCenterId }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const fetchAnalytics = async () => {
    if (!labCenterId) return;
    setLoading(true);

    try {
      const days = daysFromRange(timeRange);
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - (days - 1));

      const { data, error } = await supabase
        .from("test_orders")
        .select("*")
        .eq("lab_center_id", labCenterId)
        .gte("created_at", from.toISOString())
        .order("created_at", { ascending: true })
        .limit(5000);

      if (error) throw error;

      setOrders((data || []) as OrderRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load analytics");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labCenterId, timeRange]);

  const analytics = useMemo(() => {
    const now = new Date();
    const days = daysFromRange(timeRange);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const filtered = orders.filter((o) => {
      const created = getCreatedAt(o);
      return !!created && created >= start && created <= now;
    });

    const total = filtered.length;
    const completed = filtered.filter((o) => isCompletedStatus(normalizeStatus(o?.status))).length;
    const pending = filtered.filter((o) => isPendingStatus(normalizeStatus(o?.status))).length;
    const inProgress = filtered.filter((o) => isInProgressStatus(normalizeStatus(o?.status))).length;
    const cancelled = filtered.filter((o) => isCancelledStatus(normalizeStatus(o?.status))).length;

    const overdue = filtered.filter((o) => {
      const due = getDueAt(o);
      const status = normalizeStatus(o?.status);
      return !!due && due < now && !isCompletedStatus(status) && !isCancelledStatus(status);
    }).length;

    const completionRatePct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const turnaroundHoursList = filtered
      .filter((o) => isCompletedStatus(normalizeStatus(o?.status)))
      .map((o) => {
        const created = getCreatedAt(o);
        const completedAt = getCompletedAt(o);
        if (!created || !completedAt) return null;
        const h = (completedAt.getTime() - created.getTime()) / (1000 * 60 * 60);
        if (!Number.isFinite(h) || h <= 0 || h > 24 * 60) return null;
        return h;
      })
      .filter((v): v is number => v !== null);

    const processingHoursList = filtered
      .filter((o) => isCompletedStatus(normalizeStatus(o?.status)))
      .map((o) => {
        const started = getStartedAt(o);
        const completedAt = getCompletedAt(o);
        if (!started || !completedAt) return null;
        const h = (completedAt.getTime() - started.getTime()) / (1000 * 60 * 60);
        if (!Number.isFinite(h) || h <= 0 || h > 24 * 60) return null;
        return h;
      })
      .filter((v): v is number => v !== null);

    const kpis: Kpis = {
      total,
      completed,
      pending,
      inProgress,
      cancelled,
      overdue,
      completionRatePct,
      avgTurnaroundHours: mean(turnaroundHoursList),
      avgProcessingHours: mean(processingHoursList),
    };

    const trendMap = new Map<
      string,
      {
        day: string;
        label: string;
        created: number;
        completed: number;
        overdueOpened: number;
        readyNotDelivered: number;
      }
    >();

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = dayKey(d);
      trendMap.set(key, {
        day: key,
        label: labelFromDayKey(key),
        created: 0,
        completed: 0,
        overdueOpened: 0,
        readyNotDelivered: 0,
      });
    }

    filtered.forEach((o) => {
      const created = getCreatedAt(o);
      const completedAt = getCompletedAt(o);
      const due = getDueAt(o);
      const status = normalizeStatus(o?.status);

      if (created) {
        const key = dayKey(created);
        const row = trendMap.get(key);
        if (row) row.created += 1;
      }

      if (completedAt && isCompletedStatus(status)) {
        const key = dayKey(completedAt);
        const row = trendMap.get(key);
        if (row) row.completed += 1;
      }

      if (due && due < now && !isCompletedStatus(status) && !isCancelledStatus(status)) {
        const key = dayKey(due);
        const row = trendMap.get(key);
        if (row) row.overdueOpened += 1;
      }

      if (isReadyStatus(status) && !getDeliveredAt(o)) {
        const key = dayKey(getCompletedAt(o) || getCreatedAt(o) || now);
        const row = trendMap.get(key);
        if (row) row.readyNotDelivered += 1;
      }
    });

    const trend = [...trendMap.values()];

    const statusBreakdownRaw = [
      { name: "Completed", value: completed },
      { name: "Pending", value: pending },
      { name: "In Progress", value: inProgress },
      { name: "Cancelled", value: cancelled },
      { name: "Overdue", value: overdue },
    ];
    const statusBreakdown = statusBreakdownRaw.filter((r) => r.value > 0);
    if (!statusBreakdown.length) statusBreakdown.push({ name: "No data", value: 1 });

    const categoryMap = new Map<string, number>();
    filtered.forEach((o) => {
      const c = getCategory(o);
      categoryMap.set(c, (categoryMap.get(c) || 0) + 1);
    });
    const topCategories = [...categoryMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const tatDistributionSource = turnaroundHoursList.length ? turnaroundHoursList : processingHoursList;
    const tatBuckets = [
      { name: "≤6h", count: 0 },
      { name: "6–12h", count: 0 },
      { name: "12–24h", count: 0 },
      { name: "1–2d", count: 0 },
      { name: ">2d", count: 0 },
    ];

    tatDistributionSource.forEach((h) => {
      if (h <= 6) tatBuckets[0].count += 1;
      else if (h <= 12) tatBuckets[1].count += 1;
      else if (h <= 24) tatBuckets[2].count += 1;
      else if (h <= 48) tatBuckets[3].count += 1;
      else tatBuckets[4].count += 1;
    });

    const operational = {
      p50TatHours: percentile(tatDistributionSource, 0.5),
      p90TatHours: percentile(tatDistributionSource, 0.9),
      readyNotDelivered: filtered.filter((o) => isReadyStatus(normalizeStatus(o?.status)) && !getDeliveredAt(o)).length,
      reportedDelivered: filtered.filter((o) => isReadyStatus(normalizeStatus(o?.status)) && !!getDeliveredAt(o)).length,
    };

    return { kpis, trend, statusBreakdown, topCategories, tatBuckets, operational };
  }, [orders, timeRange]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Analytics Dashboard
        </h2>

        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[170px]">
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orders in range</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">{analytics.kpis.total.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Created in selected window</div>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">{analytics.kpis.completed.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Results finalized / reported</div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending + In Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">
                {(analytics.kpis.pending + analytics.kpis.inProgress).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {analytics.kpis.pending} pending • {analytics.kpis.inProgress} processing
              </div>
            </div>
            <Hourglass className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion rate</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">{analytics.kpis.completionRatePct}%</div>
              <div className="text-xs text-muted-foreground mt-1">Completed ÷ total orders</div>
            </div>
            <Percent className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">{analytics.kpis.overdue.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Past due and not completed</div>
            </div>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">{analytics.kpis.cancelled.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Rejected / cancelled orders</div>
            </div>
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg TAT</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">{analytics.kpis.avgTurnaroundHours.toLocaleString()}h</div>
              <div className="text-xs text-muted-foreground mt-1">Created → completed</div>
            </div>
            <Clock3 className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Processing</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">{analytics.kpis.avgProcessingHours.toLocaleString()}h</div>
              <div className="text-xs text-muted-foreground mt-1">Collection/received → completed</div>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Order Volume Trend</CardTitle>
            <CardDescription>Created vs completed orders across the selected range.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-muted-foreground" />
                  <YAxis allowDecimals={false} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "10px",
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="created" name="Created" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="completed" name="Completed" fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
            <CardDescription>Distribution of order outcomes and queue state.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    innerRadius={55}
                    paddingAngle={2}
                  >
                    {analytics.statusBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "10px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Test Categories</CardTitle>
            <CardDescription>Most ordered tests/panels in the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topCategories}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "10px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" name="Orders" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Turnaround Distribution</CardTitle>
            <CardDescription>How completed orders are distributed by turnaround time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.tatBuckets}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "10px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" name="Completed Orders" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">P50 TAT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.operational.p50TatHours}h</div>
            <div className="text-xs text-muted-foreground mt-1">Median turnaround</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">P90 TAT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.operational.p90TatHours}h</div>
            <div className="text-xs text-muted-foreground mt-1">Long-tail turnaround</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready, Not Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.operational.readyNotDelivered}</div>
            <div className="text-xs text-muted-foreground mt-1">Follow-up / notification gap</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready + Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.operational.reportedDelivered}</div>
            <div className="text-xs text-muted-foreground mt-1">Result delivery recorded</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
