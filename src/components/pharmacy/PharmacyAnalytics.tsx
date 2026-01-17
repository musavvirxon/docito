// File: src/components/pharmacy/PharmacyAnalytics.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "sonner";

interface Props {
  pharmacyId: string;
}

type AnalyticsResp = {
  ok: boolean;
  error?: string;
  kpis?: {
    totalRevenueCents: number;
    totalOrders: number;
    totalPrescriptions: number;
    avgOrderValueCents: number;
    revenueChangePct: number;
    ordersChangePct: number;
  };
  dailyTrend?: Array<{ date: string; revenueCents: number; orders: number }>;
  topMedications?: Array<{ name: string; count: number; revenueCents: number }>;
  statusBreakdown?: Array<{ name: string; value: number }>;
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function moneyFromCents(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

export default function PharmacyAnalytics({ pharmacyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");

  const [stats, setStats] = useState({
    totalRevenueCents: 0,
    totalOrders: 0,
    totalPrescriptions: 0,
    avgOrderValueCents: 0,
    revenueChange: 0,
    ordersChange: 0,
  });

  const [revenueData, setRevenueData] = useState<Array<{ date: string; revenue: number; orders: number }>>([]);
  const [topMedications, setTopMedications] = useState<Array<{ name: string; count: number; revenue: number }>>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<Array<{ name: string; value: number }>>([]);

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
        totalRevenueCents: k.totalRevenueCents,
        totalOrders: k.totalOrders,
        totalPrescriptions: k.totalPrescriptions,
        avgOrderValueCents: k.avgOrderValueCents,
        revenueChange: k.revenueChangePct,
        ordersChange: k.ordersChangePct,
      });

      setRevenueData(
        (payload.dailyTrend || []).map((d) => ({
          date: new Date(d.date + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          revenue: Math.round((d.revenueCents || 0) / 100),
          orders: d.orders || 0,
        })),
      );

      setTopMedications(
        (payload.topMedications || []).map((m) => ({
          name: m.name,
          count: m.count,
          revenue: Math.round((m.revenueCents || 0) / 100),
        })),
      );

      setOrdersByStatus(
        (payload.statusBreakdown || []).map((s) => ({
          name: s.name,
          value: s.value,
        })),
      );
    } catch (e: any) {
      console.error("Error fetching pharmacy analytics:", e);
      toast.error(e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pharmacyId) fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacyId, timeRange]);

  const revenueChangeUp = useMemo(() => stats.revenueChange >= 0, [stats.revenueChange]);
  const ordersChangeUp = useMemo(() => stats.ordersChange >= 0, [stats.ordersChange]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Analytics Dashboard
        </h2>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold">{moneyFromCents(stats.totalRevenueCents)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {revenueChangeUp ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm ${revenueChangeUp ? "text-green-600" : "text-destructive"}`}>
                    {revenueChangeUp ? "+" : "-"}
                    {Math.abs(stats.revenueChange).toFixed(1)}%
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
                <p className="text-3xl font-bold">{stats.totalOrders}</p>
                <div className="flex items-center gap-1 mt-1">
                  {ordersChangeUp ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm ${ordersChangeUp ? "text-green-600" : "text-destructive"}`}>
                    {ordersChangeUp ? "+" : "-"}
                    {Math.abs(stats.ordersChange).toFixed(1)}%
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
                <p className="text-3xl font-bold">{stats.totalPrescriptions}</p>
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
                <p className="text-3xl font-bold">{moneyFromCents(stats.avgOrderValueCents)}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Orders Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" strokeWidth={2} fillOpacity={0.2} />
                <Area type="monotone" dataKey="orders" strokeWidth={2} fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ordersByStatus}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label
                >
                  {ordersByStatus.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Medications */}
      <Card>
        <CardHeader>
          <CardTitle>Top Medications</CardTitle>
        </CardHeader>
        <CardContent>
          {!topMedications.length ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No medication data in this period.</div>
          ) : (
            <div className="space-y-3">
              {topMedications.slice(0, 8).map((m) => (
                <div key={m.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-muted-foreground">{m.count} units</div>
                  </div>
                  <div className="font-semibold">${m.revenue.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
