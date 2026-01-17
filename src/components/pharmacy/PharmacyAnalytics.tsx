// File: src/components/pharmacy/PharmacyAnalytics.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  TrendingUp,
  DollarSign,
  Package,
  Users,
  RefreshCw,
  Loader2,
  Pill,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

interface Props {
  pharmacyId: string;
}

type TimeRange = "7d" | "30d" | "90d";

type AnalyticsResponse = {
  ok: true;
  timeRangeDays: number;
  totals: {
    revenueCents: number;
    orders: number;
    prescriptions: number;
    avgFulfillmentHours: number;
    revenueChangePct: number;
    ordersChangePct: number;
    prescriptionsChangePct: number;
  };
  revenueTrend: Array<{ date: string; revenueCents: number; orders: number }>;
  ordersByStatus: Array<{ name: string; value: number }>;
  topMedications: Array<{ name: string; count: number; revenueCents: number }>;
} | {
  ok: false;
  error: string;
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
];

function formatMoneyFromCents(cents: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

function formatPct(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function toDays(range: TimeRange) {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  return 30;
}

export default function PharmacyAnalytics({ pharmacyId }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<Extract<AnalyticsResponse, { ok: true }> | null>(null);

  const fetchAnalytics = async (opts?: { silent?: boolean }) => {
    if (!pharmacyId) return;
    const silent = Boolean(opts?.silent);

    try {
      silent ? setRefreshing(true) : setLoading(true);

      const { data: fnData, error } = await supabase.functions.invoke("pharmacy-analytics", {
        body: {
          pharmacyId,
          timeRangeDays: toDays(timeRange),
        },
      });

      if (error) throw error;

      const payload = fnData as AnalyticsResponse;
      if (!payload || payload.ok !== true) {
        throw new Error((payload as any)?.error || "Failed to load analytics");
      }

      setData(payload);
    } catch (e: any) {
      console.error(e);
      setData(null);
      toast.error(e?.message || "Failed to load pharmacy analytics");
    } finally {
      silent ? setRefreshing(false) : setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacyId, timeRange]);

  const revenueTrend = useMemo(() => {
    const rows = data?.revenueTrend || [];
    return rows.map((r) => ({
      date: r.date,
      revenue: Math.round((r.revenueCents || 0) / 100),
      orders: r.orders || 0,
    }));
  }, [data]);

  const ordersByStatus = useMemo(() => {
    return data?.ordersByStatus || [];
  }, [data]);

  const topMedications = useMemo(() => {
    return (data?.topMedications || []).map((m) => ({
      name: m.name,
      count: m.count,
      revenue: Math.round((m.revenueCents || 0) / 100),
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totals = data?.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Pharmacy Analytics
          </h2>
          <p className="text-muted-foreground">Track your pharmacy performance and trends</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => fetchAnalytics({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatMoneyFromCents(totals?.revenueCents || 0)}
                </p>
                <Badge variant="secondary" className="mt-2">
                  {formatPct(totals?.revenueChangePct || 0)}
                </Badge>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Orders Processed</p>
                <p className="text-2xl font-bold">{totals?.orders ?? 0}</p>
                <Badge variant="secondary" className="mt-2">
                  {formatPct(totals?.ordersChangePct || 0)}
                </Badge>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prescriptions Filled</p>
                <p className="text-2xl font-bold">{totals?.prescriptions ?? 0}</p>
                <Badge variant="secondary" className="mt-2">
                  {formatPct(totals?.prescriptionsChangePct || 0)}
                </Badge>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Fulfillment</p>
                <p className="text-2xl font-bold">{(totals?.avgFulfillmentHours ?? 0).toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground mt-2">Created → Ready/Pickup</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily revenue over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Distribution of order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {ordersByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {ordersByStatus.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Top Selling Medications
          </CardTitle>
          <CardDescription>Most dispensed medications this period</CardDescription>
        </CardHeader>
        <CardContent>
          {(topMedications?.length || 0) === 0 ? (
            <div className="text-sm text-muted-foreground">No medication data for the selected period.</div>
          ) : (
            <div className="space-y-4">
              {topMedications.map((med, index) => (
                <div key={med.name} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{med.name}</span>
                      <span className="text-sm text-muted-foreground">{med.count} units</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(med.count / topMedications[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-green-600">${med.revenue}</span>
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
