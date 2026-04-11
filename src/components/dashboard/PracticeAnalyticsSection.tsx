// File: src/components/dashboard/PracticeAnalyticsSection.tsx
import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Users, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
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

type TimeRange = '7d' | '30d' | '90d';

type PracticeAnalyticsResponse = {
  ok: boolean;
  error?: string;
  kpis?: {
    totalBookings: number;
    totalRevenueCents: number;
    completedAppointments: number;
    cancelledAppointments: number;
    revenueChangePct: number;
    bookingsChangePct: number;
  };
  metrics?: {
    patientRetentionPct: number;
    noShowRatePct: number;
    avgLeadTimeMinutes: number;
  };
  dailyTrend?: Array<{ date: string; bookings: number; revenueCents: number }>;
};

const formatCurrency = (cents: number, currency: string = 'USD') => {
  const value = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
};

const formatMinutes = (minutes: number) => {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
};

interface Props {
  practiceId: string;
}

export default function PracticeAnalyticsSection({ practiceId }: Props) {
  const { t } = useTranslation('dashboard');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PracticeAnalyticsResponse | null>(null);

  const load = async () => {
    if (!practiceId) return;
    setLoading(true);
    setError(null);

    try {
      const { data: res, error: fnErr } = await supabase.functions.invoke<PracticeAnalyticsResponse>('practice-analytics', {
        body: { practiceId, timeRange },
      });

      if (fnErr) throw fnErr;
      if (!res?.ok) throw new Error(res?.error || t("practiceAnalytics.loadFailed"));

      setData(res);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || t("practiceAnalytics.loadFailed"));
      toast.error(e?.message || t("practiceAnalytics.loadFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceId, timeRange]);

  const chartData = useMemo(() => {
    const rows = data?.dailyTrend || [];
    return rows.map((r) => ({
      date: r.date,
      bookings: r.bookings || 0,
      revenue: (r.revenueCents || 0) / 100,
    }));
  }, [data]);

  const kpis = data?.kpis;
  const metrics = data?.metrics;

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

  if (error || !kpis || !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("practiceAnalytics.analyticsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground">{error || t("practiceAnalytics.noAnalytics")}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("practiceAnalytics.title")}</h2>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("practiceAnalytics.selectRange")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{t("practiceAnalytics.timeRanges.7d")}</SelectItem>
            <SelectItem value="30d">{t("practiceAnalytics.timeRanges.30d")}</SelectItem>
            <SelectItem value="90d">{t("practiceAnalytics.timeRanges.90d")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("practiceAnalytics.kpis.bookings")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.bookingsChangePct >= 0 ? '+' : ''}
              {kpis.bookingsChangePct}% {t("practiceAnalytics.vsPrevious")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("practiceAnalytics.kpis.revenue")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalRevenueCents)}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.revenueChangePct >= 0 ? '+' : ''}
              {kpis.revenueChangePct}% {t("practiceAnalytics.vsPrevious")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("practiceAnalytics.kpis.patientRetention")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.patientRetentionPct}%</div>
            <p className="text-xs text-muted-foreground">{t("practiceAnalytics.returningPatients")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("practiceAnalytics.kpis.noShowRate")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.noShowRatePct}%</div>
            <p className="text-xs text-muted-foreground">{t("practiceAnalytics.canceledTotal")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("practiceAnalytics.trendTitle")}</CardTitle>
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
                    if (name === 'revenue') return [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0), t("practiceAnalytics.kpis.revenue")];
                    if (name === 'bookings') return [value, t("practiceAnalytics.kpis.bookings")];
                    return [value, name];
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="bookings" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("practiceAnalytics.operational")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("practiceAnalytics.completedAppointments")}</span>
              <Badge variant="outline">{kpis.completedAppointments}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("practiceAnalytics.canceledAppointments")}</span>
              <Badge variant="outline">{kpis.cancelledAppointments}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("practiceAnalytics.avgBookingLeadTime")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t("practiceAnalytics.leadTime")}
              </span>
              <Badge variant="secondary">{formatMinutes(metrics.avgLeadTimeMinutes)}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{t("practiceAnalytics.leadTimeDesc")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
