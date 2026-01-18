// File: src/components/pharmacy/PharmacyAnalytics.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

type AnalyticsResp = {
  ok: boolean;
  error?: string;
  kpis?: {
    totalRevenue: number;
    totalOrders: number;
    totalPrescriptionsFilled: number;
    avgOrderValue: number;
    revenueChangePct: number;
    ordersChangePct: number;
  };
  dailyTrend?: Array<{ date: string; revenue: number; orders: number }>;
  topMedications?: Array<{ name: string; count: number; revenue: number }>;
  statusBreakdown?: Array<{ name: string; value: number }>;
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function money(n: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PharmacyAnalytics({ pharmacyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalPrescriptions: 0,
    avgOrderValue: 0,
    revenueChange: 0,
    ordersChange: 0,
  });

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [topMedications, setTopMedications] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);

  const hasAnyData = useMemo(() => {
    return (
      stats.totalOrders > 0 ||
      revenueData.length > 0 ||
      topMedications.length > 0 ||
      ordersByStatus.some((x) => (x?.value || 0) > 0)
    );
  }, [ordersByStatus, revenueData.length, stats.totalOrders, topMedications.length]);

  const fetchAnalytics = async () => {
    if (!pharmacyId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("pharmacy-analytics", {
        body: { pharmacyId, timeRange },
      });

      if (error) throw error;

      const payload = data as AnalyticsResp;
      if (!payload?.ok) throw new Error(payload?.error || "Failed to load analytics");

      const k = payload.kpis!;
      setStats({
        totalRevenue: k.totalRevenue,
        totalOrders: k.totalOrders,
        totalPrescriptions: k.totalPrescriptionsFilled,
        avgOrderValue: k.avgOrderValue,
        revenueChange: k.revenueChangePct,
        ordersChange: k.ordersChangePct,
      });

      setRevenueData(
        (payload.dailyTrend || []).map((d) => ({
          date: new Date(d.date + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          revenue: d.revenue,
          orders: d.orders,
        })),
      );

      setTopMedications(payload.topMedications || []);

      const sb = payload.statusBreakdown || [];
      setOrdersByStatus(
        sb.length
          ? sb.map((s) => ({ name: s.name, value: s.value }))
          : [{ name: "No data", value: 1 }],
      );
    } catch (e: any) {
      console.error("Error fetching analytics:", e);
      toast.error(e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacyId, timeRange]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const topMax = topMedications?.[0]?.count || 1;

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Analytics Dashboard
        </h2>
        <div className="flex items-center gap-4">
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
          <Button variant="ghost" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold">{money(stats.totalRevenue)}</p>
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
              <div className="p-3 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-3xl font-bold">{stats.totalOrders.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {stats.ordersChange >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm ${stats.ordersChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {stats.ordersChange >= 0 ? "+" : ""}
                    {stats.ordersChange}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <Package className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prescriptions Filled</p>
                <p className="text-3xl font-bold">{stats.totalPrescriptions.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Pill className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-3xl font-bold">{money(stats.avgOrderValue)}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily revenue over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: any, name: any) =>
                      name === "revenue" ? [money(Number(value)), "Revenue"] : [value, "Orders"]
                    }
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

        {/* Orders Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Current period breakdown</CardDescription>
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
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {ordersByStatus.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {ordersByStatus.length > 0 && ordersByStatus[0]?.name !== "No data" && (
              <div className="mt-4 space-y-2">
                {ordersByStatus.slice(0, 4).map((s: any, idx: number) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-sm"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{s.name}</span>
                    </div>
                    <span className="font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Medications */}
      <Card>
        <CardHeader>
          <CardTitle>Top Medications</CardTitle>
          <CardDescription>Most dispensed medications this period</CardDescription>
        </CardHeader>
        <CardContent>
          {topMedications.length === 0 ? (
            <div className="text-sm text-muted-foreground">No medication data available for this period.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {topMedications.map((med: any) => (
                  <div key={med.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{med.name}</span>
                      <span className="text-muted-foreground">{med.count} units</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${Math.min(100, (med.count / topMax) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Revenue</span>
                      <span>{money(Number(med.revenue || 0))}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topMedications}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" hide />
                    <YAxis className="text-xs" />
                    <Tooltip formatter={(v: any) => [v, "Units"]} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!hasAnyData && (
        <div className="text-sm text-muted-foreground">
          No data for this pharmacy yet. Once orders come in, analytics will populate automatically.
        </div>
      )}
    </div>
  );
}
