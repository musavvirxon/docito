import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  TestTube,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { toast } from 'sonner';

interface Props {
  labCenterId: string;
}

type TimeRange = '7d' | '30d' | '90d';

type AnalyticsResponse = {
  stats: {
    totalRevenue: number;
    totalTests: number;
    avgTurnaround: number;
    recollectionRate: number;
    revenueChange: number;
    testsChange: number;
  };
  revenueData: Array<{ date: string; revenue: number; tests: number }>;
  topTests: Array<{ name: string; count: number; revenue: number }>;
  testsByStatus: Array<{ name: string; value: number }>;
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function LabAnalytics({ labCenterId }: Props) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTests: 0,
    avgTurnaround: 0,
    recollectionRate: 0,
    revenueChange: 0,
    testsChange: 0,
  });

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [topTests, setTopTests] = useState<any[]>([]);
  const [testsByStatus, setTestsByStatus] = useState<any[]>([]);

  useEffect(() => {
    if (labCenterId) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labCenterId, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('lab-analytics', {
        body: { lab_center_id: labCenterId, time_range: timeRange },
      });

      if (error) throw error;

      const analytics = (data?.analytics ?? null) as AnalyticsResponse | null;
      if (!analytics) throw new Error('No analytics returned');

      setStats({
        totalRevenue: Number(analytics.stats.totalRevenue ?? 0),
        totalTests: Number(analytics.stats.totalTests ?? 0),
        avgTurnaround: Number(analytics.stats.avgTurnaround ?? 0),
        recollectionRate: Number(analytics.stats.recollectionRate ?? 0),
        revenueChange: Number(analytics.stats.revenueChange ?? 0),
        testsChange: Number(analytics.stats.testsChange ?? 0),
      });

      setRevenueData(Array.isArray(analytics.revenueData) ? analytics.revenueData : []);
      setTopTests(Array.isArray(analytics.topTests) ? analytics.topTests : []);
      setTestsByStatus(Array.isArray(analytics.testsByStatus) ? analytics.testsByStatus : []);

    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      toast.error(err?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
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
                <p className="text-3xl font-bold">${Number(stats.totalRevenue).toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">+{stats.revenueChange}%</span>
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
                <p className="text-3xl font-bold">{Number(stats.totalTests).toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">+{stats.testsChange}%</span>
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
                  <span className="text-sm text-green-600">0%</span>
                </div>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
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
            <CardTitle>Revenue & Test Volume</CardTitle>
            <CardDescription>Daily performance over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
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

        {/* Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Tests by Status</CardTitle>
            <CardDescription>Order status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={testsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {testsByStatus.map((_: any, idx: number) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Top Tests</CardTitle>
          <CardDescription>Most frequently ordered tests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTests}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
