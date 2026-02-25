// File: src/components/staff/ImagingDashboardContent.tsx
// FULL FILE REPLACEMENT

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileImage,
  RefreshCw,
  ScanLine,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useImagingStaffDashboard } from "@/hooks/useImagingStaffDashboard";
import ImagingAnalytics from "@/components/imaging/ImagingAnalytics";

interface ImagingDashboardContentProps {
  entityInfo?: any;
  permissions?: any;
  activeSection?: string;
}

function normalizeStatus(status?: string | null) {
  return (status || "").toLowerCase().trim();
}

function titleCase(value?: string | null) {
  return (value || "Unknown")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelative(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

export default function ImagingDashboardContent(props: ImagingDashboardContentProps) {
  const { imagingCenterId, loading, stats, activity, recentOrders, refresh } = useImagingStaffDashboard();
  const defaultTab = props.activeSection === "analytics" ? "analytics" : "overview";
  const [tab, setTab] = useState<"overview" | "analytics">(defaultTab as "overview" | "analytics");

  const derived = useMemo(() => {
    const orders = (recentOrders || []) as any[];

    const pending = orders.filter((o) => ["pending", "new"].includes(normalizeStatus(o?.status))).length;
    const scheduled = orders.filter((o) => ["scheduled", "booked"].includes(normalizeStatus(o?.status))).length;
    const inProgress = orders.filter((o) =>
      ["checked_in", "in_progress", "images_ready", "awaiting_report"].includes(normalizeStatus(o?.status)),
    ).length;
    const completed = orders.filter((o) =>
      ["completed", "done", "result_ready", "delivered"].includes(normalizeStatus(o?.status)),
    ).length;
    const urgent = orders.filter((o) => ["urgent", "stat", "high"].includes(normalizeStatus(o?.priority))).length;
    const overdue = orders.filter((o) => {
      const s = normalizeStatus(o?.status);
      if (["completed", "done", "result_ready", "delivered", "cancelled", "canceled"].includes(s)) return false;
      const created = new Date(o?.created_at || 0);
      if (Number.isNaN(created.getTime())) return false;
      const hours = (Date.now() - created.getTime()) / (1000 * 60 * 60);
      return hours > 48;
    }).length;

    const modalities = new Map<string, number>();
    for (const o of orders) {
      const m = (o?.modality || o?.study_type || "X-ray") as string;
      modalities.set(m, (modalities.get(m) || 0) + 1);
    }
    const topModality =
      Array.from(modalities.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    return { pending, scheduled, inProgress, completed, urgent, overdue, topModality };
  }, [recentOrders]);

  const statusBadge = (status?: string) => {
    const s = normalizeStatus(status);

    if (["completed", "done", "result_ready", "delivered"].includes(s)) {
      return <Badge variant="secondary">Completed</Badge>;
    }
    if (["checked_in", "in_progress", "images_ready", "awaiting_report"].includes(s)) {
      return <Badge>In Progress</Badge>;
    }
    if (["scheduled", "booked"].includes(s)) {
      return <Badge variant="outline">Scheduled</Badge>;
    }
    if (["pending", "new"].includes(s)) {
      return <Badge variant="outline">Pending</Badge>;
    }
    if (["cancelled", "canceled", "rejected"].includes(s)) {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    return <Badge variant="outline">{titleCase(status)}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Imaging Staff Dashboard</h2>
          <p className="text-muted-foreground">
            Orders, scan workflow, and analytics pulled from Supabase
          </p>
        </div>

        <Button
          variant="outline"
          onClick={refresh}
          disabled={!imagingCenterId || loading}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {!imagingCenterId ? (
        <Card>
          <CardHeader>
            <CardTitle>Imaging center not connected</CardTitle>
            <CardDescription>
              We couldn't detect an imaging center for this staff account yet. Once your staff profile is linked,
              orders and analytics will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v as "overview" | "analytics")} className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full md:w-[320px]">
          <TabsTrigger value="overview" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Primary stats from hook */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? "…" : stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional ops cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Queue</p>
                    <p className="text-xl font-bold">{loading ? "…" : derived.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled</p>
                    <p className="text-xl font-bold">{loading ? "…" : derived.scheduled}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <ScanLine className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-xl font-bold">{loading ? "…" : derived.inProgress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-xl font-bold">{loading ? "…" : derived.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={derived.urgent > 0 ? "border-orange-500/30" : undefined}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Urgent / STAT</p>
                    <p className="text-xl font-bold">{loading ? "…" : derived.urgent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={derived.overdue > 0 ? "border-destructive/30" : undefined}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <FileImage className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue (&gt;48h)</p>
                    <p className="text-xl font-bold">{loading ? "…" : derived.overdue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {/* Recent Orders */}
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Recent Imaging Orders
                </CardTitle>
                <CardDescription>
                  Latest imaging referrals and workflow state
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading imaging orders…</p>
                ) : (recentOrders?.length || 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No imaging orders yet.</p>
                ) : (
                  (recentOrders as any[]).map((o) => (
                    <div
                      key={o.id}
                      className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">
                            {o.exam_name || o.study_type || "Imaging Study"}
                          </p>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                            {o.modality || "X-ray"}
                          </Badge>
                          {o.priority ? (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                              {titleCase(o.priority)}
                            </Badge>
                          ) : null}
                        </div>

                        <p className="text-sm text-muted-foreground truncate">
                          {(o.patient_name || o.patient?.full_name || "Patient")} •{" "}
                          {(o.doctor_name || o.doctor?.full_name || "Doctor")}
                        </p>

                        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                          <span>Created {formatRelative(o.created_at)}</span>
                          {o.preferred_date ? <span>Preferred {formatDate(o.preferred_date)}</span> : null}
                          {o.preferred_time_slot ? <span>{o.preferred_time_slot}</span> : null}
                          {o.body_part ? <span>{o.body_part}</span> : null}
                        </div>
                      </div>

                      <div className="shrink-0">{statusBadge(o.status)}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Activity + quick health */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Activity Feed
                  </CardTitle>
                  <CardDescription>Recent workflow updates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading activity…</p>
                  ) : (activity?.length || 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent activity.</p>
                  ) : (
                    activity.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-start gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                      >
                        <div className="mt-1">
                          <ScanLine className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{a.action}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {a.patient} • {a.time}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Queue Health</CardTitle>
                  <CardDescription>Quick snapshot from recent imaging orders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-medium">{loading ? "…" : derived.pending}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Scheduled</span>
                    <span className="font-medium">{loading ? "…" : derived.scheduled}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">In Progress</span>
                    <span className="font-medium">{loading ? "…" : derived.inProgress}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium">{loading ? "…" : derived.completed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Top Modality</span>
                    <span className="font-medium">{loading ? "…" : derived.topModality}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Overdue (&gt;48h)</span>
                    <span className="font-medium">{loading ? "…" : derived.overdue}</span>
                  </div>

                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Full trends, turnaround, demographics, referrers, and revenue metrics are available in the Analytics tab.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {imagingCenterId ? (
            <ImagingAnalytics centerId={imagingCenterId} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Analytics unavailable</CardTitle>
                <CardDescription>
                  Connect this staff account to an imaging center to load imaging analytics.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
