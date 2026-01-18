// File: src/components/pharmacy/PharmacyAnalytics.tsx
import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Package, Users, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

type TimeRange = '7d' | '30d' | '90d';

type PharmacyAnalyticsResponse = {
  ok: boolean;
  error?: string;
  kpis?: {
    totalRevenueCents: number;
    totalOrders: number;
    completedOrders: number;
    avgFulfillmentHours: number;
    revenueChangePct: number;
    ordersChangePct: number;
  };
  dailyTrend?: Array<{ date: string; revenueCents: number; orders: number; completed: number }>;
  topMedications?: Array<{ name: string; count: number; quantity: number; revenueCents: number }>;
  statusBreakdown?: Array<{ name: string; value: number }>;
};

const formatCurrency = (cents: number, currency: string = 'USD') => {
  const value = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
};

interface PharmacyAnalyticsProps {
  pharmacyId: string;
}

export default function PharmacyAnalytics({ pharmacyId }: PharmacyAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PharmacyAnalyticsResponse | null>(null);

  const load = async () => {
    if (!pharmacyId) return;
    setLoading(true);
    setError(null);

    try {
      const { data: res, error: fnErr } = await supabase.functions.invoke<PharmacyAnalyticsResponse>('pharmacy-analytics', {
        body: { pharmacyId, timeRange },
      });

      if (fnErr) throw fnErr;
      if (!res?.ok) throw new Error(res?.error || 'Failed to load analytics');

      setData(res);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to load analytics');
      toast.error(e?.message || 'Failed to load analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacyId, timeRange]);

  const chartData = useMemo(() => {
    const rows = data?.dailyTrend || [];
    return rows.map((r) => ({
      date: r.date,
      revenue: (r.revenueCents || 0) / 100,
      orders: r.orders || 0,
      completed: r.completed || 0,
    }));
  }, [data]);

  const kpis = data?.kpis;
  const topMeds = data?.topMedications || [];
  const status = data?.statusBreakdown || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-80 animate-pulse bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !kpis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground">{error || 'No analytics available yet.'}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pharmacy Analytics</h2>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalRevenueCents)}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.revenueChangePct >= 0 ? '+' : ''}
              {kpis.revenueChangePct}% vs previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.ordersChangePct >= 0 ? '+' : ''}
              {kpis.ordersChangePct}% vs previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.completedOrders}</div>
            <p className="text-xs text-muted-foreground">Of {kpis.totalOrders} total orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Fulfillment (hrs)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgFulfillmentHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Created → ready/pickup</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue & Orders Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    if (name === 'revenue') return [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0), 'Revenue'];
                    if (name === 'orders') return [value, 'Orders'];
                    if (name === 'completed') return [value, 'Completed'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke={COLORS[1]} strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="completed" stroke={COLORS[2]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Medications */}
        <Card>
          <CardHeader>
            <CardTitle>Top Medications</CardTitle>
          </CardHeader>
          <CardContent>
            {topMeds.length === 0 ? (
              <div className="text-sm text-muted-foreground">No prescriptions found in this period.</div>
            ) : (
              <div className="space-y-4">
                {topMeds.map((med, index) => (
                  <div key={med.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{med.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {med.count} line item{med.count === 1 ? '' : 's'} · {med.quantity} qty
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{formatCurrency(med.revenueCents)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {status.length === 0 ? (
              <div className="text-sm text-muted-foreground">No orders found in this period.</div>
            ) : (
              <div className="space-y-4">
                {status.map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <p className="font-medium capitalize">{s.name}</p>
                    <Badge variant="outline">{s.value}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
