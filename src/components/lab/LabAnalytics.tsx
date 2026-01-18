// src/components/lab/LabAnalytics.tsx
// File: src/components/lab/LabAnalytics.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  TestTube,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
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
} from 'recharts';
import { toast } from 'sonner';

interface Props {
  labCenterId: string;
}

type AnalyticsResp = {
  ok: boolean;
  error?: string;
  kpis?: {
    totalRevenueCents: number;
    totalTests: number;
    avgTurnaroundHours: number;
    recollectionRatePct: number;
    revenueChangePct: number;
    testsChangePct: number;
  };
  dailyTrend?: Array<{ date: string; revenueCents: number; tests: number }>;
  topTests?: Array<{ name: string; count: number; revenueCents: number }>;
  statusBreakdown?: Array<{ name: string; value: number }>;
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function moneyFromCents(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function LabAnalytics({ labCenterId }: Props) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [stats, setStats] = useState({
    totalRevenueCents: 0,
    totalTests: 0,
    avgTurnaround: 0,
    recollectionRate: 0,
    revenueChange: 0,
    testsChange: 0,
  });

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [topTests, setTopTests] = useState<any[]>([]);
  const [testsByStatus, setTestsByStatus] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    if (!labCenterId) return;
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('lab-analytics', {
        body: { labCenterId, timeRange },
      });

      if (error) throw error;

      const payload = data as AnalyticsResp;
      if (!payload?.ok) throw new Error(payload?.error || 'Failed to load analytics');

      const k = payload.kpis!;
      setStats({
        totalRevenueCents: k.totalRevenueCents,
        totalTests: k.totalTests,
        avgTurnaround: k.avgTurnaroundHours,
        recollectionRate: k.recollectionRatePct,
        revenueChange: k.revenueChangePct,
        testsChange: k.testsChangePct,
      });

      setRevenueData(
        (payload.dailyTrend || []).map((d) => ({
          date: new Date(d.date + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          revenue: Math.round((d.revenueCents || 0) / 100),
          tests: d.tests || 0,
        })),
      );

      setTopTests(
        (payload.topTests || []).map((t) => ({
          name: t.name,
          count: t.count,
          revenue: Math.round((t.revenueCents || 0) / 100),
        })),
      );

      const sb = payload.statusBreakdown || [];
      setTestsByStatus(
        sb.length
          ? sb.map((s) => ({ name: s.name, value: s.value }))
          : [
              { name: 'No data', value: 1 },
            ],
      );
    } catch (e: any) {
      console.error('Error fetching analytics:', e);
      toast.error(e?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labCenterId, timeRange]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const topMax = topTests?.[0]?.count || 1;

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold">{moneyFromCents(stats.totalRevenueCents)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">
                    {stats.revenueChange >= 0 ? '+' : ''}
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
                <p className="text-sm text-muted-foreground">Total Tests</p>
                <p className="text-3xl font-bold">{stats.totalTests.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">
                    {stats.testsChange >= 0 ? '+' : ''}
                    {stats.testsChange}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <TestTube className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Turnaround</p>
                <p className="text-3xl font-bold">{stats.avgTurnaround}h</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recollection Rate</p>
                <p className="text-3xl font-bold">{stats.recollectionRate}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDownRight className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">-</span>
                </div>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue & Test Volume</CardTitle>
            <CardDescription>Daily performance over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorLabRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorLabRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tests by Status</CardTitle>
            <CardDescription>Distribution of test statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={testsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {testsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {testsByStatus.map((entry, index) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Top Performing Tests
          </CardTitle>
          <CardDescription>Most ordered tests this period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topTests.length === 0 ? (
              <div className="text-sm text-muted-foreground">No test item data available for this period.</div>
            ) : (
              topTests.map((test: any, index: number) => (
                <div key={test.name} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{test.name}</span>
                      <span className="text-sm text-muted-foreground">{test.count} orders</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.max(2, (test.count / topMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right w-28">
                    <span className="font-medium text-green-600">${test.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
