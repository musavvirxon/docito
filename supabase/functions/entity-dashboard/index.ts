// File: src/components/lab/LabAnalytics.tsx

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertTriangle,
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

type FacilityAnalyticsResp = {
  ok: boolean;
  error?: string;
  window_days?: number;
  kpis?: {
    total_referrals: number;
    completed_referrals: number;
    pending_referrals: number;
    cancelled_referrals: number;
    avg_turnaround_hours: number;
  };
  trend?: Array<{ date: string; referrals: number; completed: number }>;
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function pctChange(current: number, prev: number) {
  const c = Number(current || 0);
  const p = Number(prev || 0);
  if (p <= 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 1000) / 10;
}

function formatHours(h: number) {
  const v = Number(h || 0);
  if (!Number.isFinite(v) || v <= 0) return '0h';
  if (v < 1) return `${Math.round(v * 60)}m`;
  return `${Math.round(v * 10) / 10}h`;
}

export default function LabAnalytics({ labCenterId }: Props) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const [stats, setStats] = useState({
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    cancelledReferrals: 0,
    avgTurnaroundHours: 0,
    referralsChangePct: 0,
    completedChangePct: 0,
  });

  const [trendData, setTrendData] = useState<any[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<any[]>([]);
  const [busiestDays, setBusiestDays] = useState<any[]>([]);

  const days = useMemo(() => {
    if (timeRange === '90d') return 90;
    if (timeRange === '7d') return 7;
    return 30;
  }, [timeRange]);

  const fetchAnalytics = async () => {
    if (!labCenterId) return;

    try {
      setLoading(true);

      const [curRes, prevRes] = await Promise.all([
        supabase.functions.invoke<FacilityAnalyticsResp>('facility-analytics', {
          body: { entityType: 'lab', entityId: labCenterId, days },
        }),
        supabase.functions.invoke<FacilityAnalyticsResp>('facility-analytics', {
          body: { entityType: 'lab', entityId: labCenterId, days: clampInt(days * 2, 7, 365, days * 2) },
        }),
      ]);

      if (curRes.error) throw curRes.error;
      if (!curRes.data?.ok) throw new Error(curRes.data?.error || 'Failed to load analytics');

      const cur = curRes.data;
      const k = cur.kpis || {
        total_referrals: 0,
        completed_referrals: 0,
        pending_referrals: 0,
        cancelled_referrals: 0,
        avg_turnaround_hours: 0,
      };

      const curTrend = (cur.trend || []).map((d) => ({
        date: new Date(`${d.date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        referrals: Number(d.referrals || 0),
        completed: Number(d.completed || 0),
      }));

      // Compute change % using 2x window trend (if available)
      let referralsChangePct = 0;
      let completedChangePct = 0;

      const prevPayload = prevRes.data;
      if (!prevRes.error && prevPayload?.ok) {
        const fullTrend = prevPayload.trend || [];
        if (fullTrend.length >= days * 2) {
          const first = fullTrend.slice(0, days);
          const last = fullTrend.slice(fullTrend.length - days);

          const prevTotal = first.reduce((acc, x) => acc + Number(x.referrals || 0), 0);
          const curTotal = last.reduce((acc, x) => acc + Number(x.referrals || 0), 0);

          const prevCompleted = first.reduce((acc, x) => acc + Number(x.completed || 0), 0);
          const curCompleted = last.reduce((acc, x) => acc + Number(x.completed || 0), 0);

          referralsChangePct = pctChange(curTotal, prevTotal);
          completedChangePct = pctChange(curCompleted, prevCompleted);
        }
      }

      setStats({
        totalReferrals: Number(k.total_referrals || 0),
        completedReferrals: Number(k.completed_referrals || 0),
        pendingReferrals: Number(k.pending_referrals || 0),
        cancelledReferrals: Number(k.cancelled_referrals || 0),
        avgTurnaroundHours: Number(k.avg_turnaround_hours || 0),
        referralsChangePct,
        completedChangePct,
      });

      setTrendData(curTrend);

      const sb = [
        { name: 'Completed', value: Number(k.completed_referrals || 0) },
        { name: 'Pending', value: Number(k.pending_referrals || 0) },
        { name: 'Cancelled', value: Number(k.cancelled_referrals || 0) },
      ].filter((x) => x.value > 0);

      setStatusBreakdown(sb.length ? sb : [{ name: 'No data', value: 1 }]);

      const busiest = (cur.trend || [])
        .slice()
        .sort((a, b) => Number(b.referrals || 0) - Number(a.referrals || 0))
        .slice(0, 5)
        .map((d) => ({
          name: new Date(`${d.date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          count: Number(d.referrals || 0),
        }));

      setBusiestDays(busiest);
    } catch (e: any) {
      console.error('Error fetching analytics:', e);
      toast.error(e?.message || 'Failed to load analytics');
      setStats({
        totalReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        cancelledReferrals: 0,
        avgTurnaroundHours: 0,
        referralsChangePct: 0,
        completedChangePct: 0,
      });
      setTrendData([]);
      setStatusBreakdown([{ name: 'No data', value: 1 }]);
      setBusiestDays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labCenterId, days]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const busiestMax = busiestDays?.[0]?.count || 1;

  const referralsTrendUp = stats.referralsChangePct >= 0;
  const completedTrendUp = stats.completedChangePct >= 0;

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
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-3xl font-bold">{stats.totalReferrals.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {referralsTrendUp ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm ${referralsTrendUp ? 'text-green-600' : 'text-destructive'}`}>
                    {stats.referralsChangePct >= 0 ? '+' : ''}
                    {stats.referralsChangePct}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold">{stats.completedReferrals.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {completedTrendUp ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm ${completedTrendUp ? 'text-green-600' : 'text-destructive'}`}>
                    {stats.completedChangePct >= 0 ? '+' : ''}
                    {stats.completedChangePct}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Turnaround</p>
                <p className="text-3xl font-bold">{formatHours(stats.avgTurnaroundHours)}</p>
                <p className="text-xs text-muted-foreground mt-1">Completed referrals only</p>
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
                <p className="text-sm text-muted-foreground">Open / Cancelled</p>
                <p className="text-3xl font-bold">{stats.pendingReferrals.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.cancelledReferrals.toLocaleString()} cancelled
                </p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Referral Volume</CardTitle>
            <CardDescription>Daily referrals and completions over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorLabReferrals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLabCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
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
                    dataKey="referrals"
                    name="Referrals"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorLabReferrals)"
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="hsl(var(--accent))"
                    fillOpacity={1}
                    fill="url(#colorLabCompleted)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
            <CardDescription>Distribution of referral statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {statusBreakdown.map((entry, index) => (
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
            <Activity className="h-5 w-5" />
            Busiest Days
          </CardTitle>
          <CardDescription>Highest referral volume days this period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {busiestDays.length === 0 ? (
              <div className="text-sm text-muted-foreground">No referral trend data available for this period.</div>
            ) : (
              busiestDays.map((d: any, index: number) => (
                <div key={`${d.name}-${index}`} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{d.name}</span>
                      <span className="text-sm text-muted-foreground">{d.count} referrals</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.max(2, (d.count / busiestMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right w-20">
                    <span className="font-medium">{d.count}</span>
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
