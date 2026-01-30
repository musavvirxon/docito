// Path: src/components/lab/LabAnalytics.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, RefreshCw, BarChart3, Clock, CheckCircle2, Hourglass, XCircle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";

type Props = {
  labCenterId: string;
};

type TimeRange = "7d" | "30d" | "90d";

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
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function daysFromRange(r: TimeRange) {
  if (r === "30d") return 30;
  if (r === "90d") return 90;
  return 7;
}

export default function LabAnalytics({ labCenterId }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    avgTurnaroundHours: 0,
  });

  const [trend, setTrend] = useState<Array<{ date: string; referrals: number; completed: number }>>([]);

  const fetchAnalytics = async () => {
    if (!labCenterId) return;

    try {
      setLoading(true);

      const days = daysFromRange(timeRange);

      const { data, error } = await supabase.functions.invoke<FacilityAnalyticsResp>("facility-analytics", {
        body: { entityType: "lab", entityId: labCenterId, days },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to load analytics");

      const next = data.kpis || {
        total_referrals: 0,
        completed_referrals: 0,
        pending_referrals: 0,
        cancelled_referrals: 0,
        avg_turnaround_hours: 0,
      };

      setKpis({
        total: Number(next.total_referrals || 0),
        completed: Number(next.completed_referrals || 0),
        pending: Number(next.pending_referrals || 0),
        cancelled: Number(next.cancelled_referrals || 0),
        avgTurnaroundHours: Number(next.avg_turnaround_hours || 0),
      });

      setTrend(
        (data.trend || []).map((d) => ({
          date: d.date,
          referrals: Number(d.referrals || 0),
          completed: Number(d.completed || 0),
        })),
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load analytics");
      setKpis({ total: 0, completed: 0, pending: 0, cancelled: 0, avgTurnaroundHours: 0 });
      setTrend([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labCenterId, timeRange]);

  const chartData = useMemo(() => {
    return (trend || []).map((d) => ({
      date: new Date(`${d.date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      referrals: d.referrals,
      completed: d.completed,
    }));
  }, [trend]);

  const statusData = useMemo(() => {
    const total = kpis.total;
    const completed = kpis.completed;
    const pending = kpis.pending;
    const cancelled = kpis.cancelled;

    const sum = completed + pending + cancelled;
    if (sum <= 0) return [{ name: "No data", value: 1 }];

    const rows = [
      { name: "Completed", value: completed },
      { name: "Pending", value: pending },
      { name: "Cancelled", value: cancelled },
    ];

    // If totals mismatch (due to legacy statuses), normalize the remainder into Pending.
    const remainder = Math.max(0, total - sum);
    if (remainder > 0) rows[1].value += remainder;

    return rows;
  }, [kpis.cancelled, kpis.completed, kpis.pending, kpis.total]);

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
            <SelectTrigger className="w-[160px]">
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Created in selected range</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">{kpis.completed.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Finished referrals</div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">{kpis.pending.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Awaiting completion</div>
            </div>
            <Hourglass className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">{kpis.cancelled.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Rejected or cancelled</div>
            </div>
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg turnaround</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">{kpis.avgTurnaroundHours.toLocaleString()}h</div>
              <div className="text-xs text-muted-foreground mt-1">Created → completed</div>
            </div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Referral Volume</CardTitle>
            <CardDescription>Created and completed referrals over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "10px",
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="referrals" name="Referrals" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="completed" name="Completed" fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
            <CardDescription>Distribution of referral outcomes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={110} innerRadius={55} paddingAngle={2}>
                    {statusData.map((_, idx) => (
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
    </div>
  );
}
