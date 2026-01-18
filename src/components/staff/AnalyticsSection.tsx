// File: src/components/staff/AnalyticsSection.tsx

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, BarChart3, TrendingUp, Users, CalendarCheck, CheckCircle2, XCircle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { toast } from "sonner";
import { useClinicAnalytics, type TimeRange } from "@/hooks/useClinicAnalytics";

type Props = {
  clinicId: string;
};

function moneyFromCents(currency: string, cents: number) {
  const value = Number(cents || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency || "usd").toUpperCase(),
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function pct(n: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0%";
  const sign = v > 0 ? "+" : "";
  return `${sign}${Math.round(v * 10) / 10}%`;
}

export default function AnalyticsSection({ clinicId }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const { loading, error, currency, kpis, dailyTrend, refetch } = useClinicAnalytics(clinicId, timeRange);

  const chartData = useMemo(() => {
    return (dailyTrend || []).map((d) => ({
      date: new Date(`${d.date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      revenue: Number(d.revenue_cents || 0) / 100,
      appointments: Number(d.appointments || 0),
      completed: Number(d.completed || 0),
    }));
  }, [dailyTrend]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>We couldn't load analytics for this clinic.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">{error}</div>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await refetch();
              } catch (e: any) {
                toast.error(e?.message || "Failed to refresh");
              }
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Analytics
        </h2>

        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                await refetch();
              } catch (e: any) {
                toast.error(e?.message || "Failed to refresh");
              }
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-bold">{moneyFromCents(currency, kpis.totalRevenueCents)}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {pct(kpis.revenueChangePct)} vs prior
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-bold">{kpis.totalAppointments}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  {pct(kpis.appointmentsChangePct)} vs prior
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-bold">{kpis.uniquePatients}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Users className="h-3.5 w-3.5" />
                  {pct(kpis.patientsChangePct)} vs prior
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-bold">{kpis.completionRatePct}%</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {kpis.completedAppointments}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" /> {kpis.canceledAppointments}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
          <CardDescription>Revenue and appointment volume over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-muted-foreground" />
                <YAxis yAxisId="left" className="text-muted-foreground" />
                <YAxis yAxisId="right" orientation="right" className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "10px",
                  }}
                />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="appointments" name="Appointments" fillOpacity={0.15} strokeWidth={2} />
                <Area yAxisId="left" type="monotone" dataKey="completed" name="Completed" fillOpacity={0.15} strokeWidth={2} />
                <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
