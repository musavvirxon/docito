// File: src/components/imaging/ImagingAnalytics.tsx

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, TrendingUp, TrendingDown, Clock, DollarSign, Activity, Users, ListChecks } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  centerId: string;
}

type AnalyticsResponse = {
  kpis: {
    totalScans: number;
    completedScans: number;
    pendingScans: number;
    revenueCents: number;
    refundsCents: number;
    netRevenueCents: number;
    avgReportHours: number;
    avgAcceptHours: number;
    utilizationPct: number;
    reportBacklog: number;
    scansChangePct: number;
    revenueChangePct: number;
    reportChangePct: number;
  };
  dailyTrend: Array<{ date: string; scans: number; completed: number; revenue: number }>;
  modalityData: Array<{ name: string; value: number; revenue: number }>;
  workflowBreakdown: Array<{ name: string; value: number }>;
  statusBreakdown: Array<{ name: string; value: number }>;
  peakHours: Array<{ hour: string; scans: number }>;
  demographics: {
    gender: Array<{ name: string; value: number }>;
    ageBuckets: Array<{ name: string; value: number }>;
  };
  topReferrers: Array<{ name: string; value: number }>;
  turnaroundByModality: Array<{ type: string; avgHours: number }>;
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--muted))"];

function formatMoneyCents(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents || 0) / 100);
}

export default function ImagingAnalytics({ centerId }: Props) {
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  const days = useMemo(() => Number(period), [period]);

  const fetchAnalytics = async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke("imaging-analytics", {
        body: { centerId, days },
      });
      if (error) throw error;
      setData((resp || null) as AnalyticsResponse | null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId, days]);

  const exportCSV = () => {
    if (!data) return;

    const rows: string[] = [];
    rows.push(["Date", "Scans", "Completed", "RevenueCents"].join(","));
    for (const p of data.dailyTrend || []) {
      rows.push([p.date, p.scans, p.completed, p.revenue].join(","));
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `imaging-analytics-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="h-64 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="h-64 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalScans: 0,
    completedScans: 0,
    pendingScans: 0,
    revenueCents: 0,
    refundsCents: 0,
    netRevenueCents: 0,
    avgReportHours: 0,
    avgAcceptHours: 0,
    utilizationPct: 0,
    reportBacklog: 0,
    scansChangePct: 0,
    revenueChangePct: 0,
    reportChangePct: 0,
  };

  const dailyTrend = data?.dailyTrend || [];
  const modalityData = data?.modalityData || [];
  const workflowBreakdown = data?.workflowBreakdown || [];
  const statusBreakdown = data?.statusBreakdown || [];
  const peakHours = data?.peakHours || [];
  const topReferrers = data?.topReferrers || [];
  const demographics = data?.demographics || { gender: [], ageBuckets: [] };
  const turnaroundByModality = data?.turnaroundByModality || [];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalScans}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {kpis.scansChangePct >= 0 ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
              <span className={kpis.scansChangePct >= 0 ? "text-green-600" : "text-destructive"}>{Math.abs(kpis.scansChangePct)}% vs prev</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{kpis.completedScans} completed</Badge>
              <Badge variant="secondary">{kpis.pendingScans} pending</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatMoneyCents(kpis.netRevenueCents)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {kpis.revenueChangePct >= 0 ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
              <span className={kpis.revenueChangePct >= 0 ? "text-green-600" : "text-destructive"}>{Math.abs(kpis.revenueChangePct)}% vs prev</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {formatMoneyCents(kpis.revenueCents)} revenue • {formatMoneyCents(kpis.refundsCents)} refunds
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Report Time</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgReportHours}h</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {kpis.reportChangePct <= 0 ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
              <span className={kpis.reportChangePct <= 0 ? "text-green-600" : "text-destructive"}>{Math.abs(kpis.reportChangePct)}% vs prev</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Avg accept time: {kpis.avgAcceptHours}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ops Health</CardTitle>
            <Badge variant="outline">{kpis.utilizationPct}% util</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.utilizationPct}%</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={kpis.reportBacklog > 0 ? "secondary" : "outline"}>{kpis.reportBacklog} backlog</Badge>
              <Badge variant="outline">{Math.max(0, kpis.pendingScans)} open</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend + Modality */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Trend</CardTitle>
            <CardDescription>Scans and revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrend}>
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(value, name) => {
                    if (name === "revenue") return [formatMoneyCents(Number(value)), "Revenue"];
                    return [value as any, String(name)];
                  }}
                />
                <Line type="monotone" dataKey="scans" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Scans" />
                <Line type="monotone" dataKey="completed" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="Completed" />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modality Mix</CardTitle>
            <CardDescription>Scan distribution by modality</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={modalityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {modalityData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(value, _name, props: any) => {
                    const row = props?.payload as { name: string; value: number; revenue: number };
                    return [`${value} scans • ${formatMoneyCents(row?.revenue || 0)}`, row?.name || "Modality"];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ops breakdowns */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Workflow
            </CardTitle>
            <CardDescription>Internal workflow breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {workflowBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                workflowBreakdown.map((r, i) => (
                  <div key={r.name} className="flex items-center justify-between">
                    <span className="text-sm">{r.name}</span>
                    <Badge variant={i === 0 ? "default" : "outline"}>{r.value}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Referral Status
            </CardTitle>
            <CardDescription>Receiver-side status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statusBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                statusBreakdown.map((r, i) => (
                  <div key={r.name} className="flex items-center justify-between">
                    <span className="text-sm">{r.name}</span>
                    <Badge variant={i === 0 ? "default" : "outline"}>{r.value}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Referrers
            </CardTitle>
            <CardDescription>Who sends you the most</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topReferrers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                topReferrers.slice(0, 6).map((r) => (
                  <div key={r.name} className="flex items-center justify-between">
                    <span className="text-sm truncate">{r.name}</span>
                    <Badge variant="outline">{r.value}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peak hours + Demographics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
            <CardDescription>Scan volume by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={peakHours}>
                <XAxis dataKey="hour" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="scans" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient Demographics</CardTitle>
            <CardDescription>Based on referred patients</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={demographics.gender} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {demographics.gender.map((_, index) => (
                      <Cell key={`cell-g-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 text-center text-xs text-muted-foreground">Gender</div>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographics.ageBuckets}>
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 text-center text-xs text-muted-foreground">Age Buckets</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Turnaround by modality */}
      <Card>
        <CardHeader>
          <CardTitle>Turnaround by Modality</CardTitle>
          <CardDescription>Average report completion time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={turnaroundByModality} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="type" type="category" className="text-xs" width={90} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                formatter={(value) => [`${value} hours`, "Avg. Time"]}
              />
              <Bar dataKey="avgHours" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue by Modality (progress list) */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Modality</CardTitle>
          <CardDescription>Based on recorded transactions (provider_data.modality)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {modalityData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No modality revenue data available yet.</p>
            ) : (
              modalityData.map((item, index) => {
                const max = Math.max(...modalityData.map((m) => m.revenue));
                const width = max > 0 ? (item.revenue / max) * 100 : 0;
                return (
                  <div key={item.name} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">{item.name}</div>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                    </div>
                    <div className="w-28 text-right text-sm font-medium">{formatMoneyCents(item.revenue)}</div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
