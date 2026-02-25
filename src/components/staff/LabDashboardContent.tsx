// File: src/components/staff/LabDashboardContent.tsx
// FULL FILE REPLACEMENT

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  ClipboardList,
  FlaskConical,
  RefreshCw,
  TestTube2,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLabStaffDashboard } from "@/hooks/useLabStaffDashboard";
import LabAnalytics from "@/components/lab/LabAnalytics";

interface LabDashboardContentProps {
  entityInfo?: any;
  permissions?: any;
  activeSection?: string;
}

function normalizeStatus(status?: string) {
  return (status || "").toLowerCase().trim();
}

function titleCaseStatus(status?: string) {
  return (status || "Unknown")
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

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function LabDashboardContent(props: LabDashboardContentProps) {
  const { labId, loading, stats, activity, recentOrders, refresh } = useLabStaffDashboard();
  const defaultTab = props.activeSection === "analytics" ? "analytics" : "overview";
  const [tab, setTab] = useState<"overview" | "analytics">(defaultTab as "overview" | "analytics");

  const derived = useMemo(() => {
    const orders = (recentOrders || []) as any[];

    const pending = orders.filter((o) =>
      ["pending", "new", "scheduled"].includes(normalizeStatus(o?.status)),
    ).length;
    const inProgress = orders.filter((o) =>
      ["in_progress", "processing", "under_review", "sample_collected"].includes(normalizeStatus(o?.status)),
    ).length;
    const completed = orders.filter((o) =>
      ["completed", "done", "result_ready"].includes(normalizeStatus(o?.status)),
    ).length;
    const urgent = orders.filter((o) =>
      ["urgent", "stat", "high"].includes(normalizeStatus(o?.priority)),
    ).length;
    const overdue = orders.filter((o) => {
      const s = normalizeStatus(o?.status);
      if (["completed", "done", "result_ready", "cancelled", "canceled", "rejected"].includes(s)) return false;
      const created = new Date(o?.created_at || 0);
      if (Number.isNaN(created.getTime())) return false;
      const hours = (Date.now() - created.getTime()) / (1000 * 60 * 60);
      return hours > 48;
    }).length;

    return { pending, inProgress, completed, urgent, overdue };
  }, [recentOrders]);

  const statusBadge = (status?: string) => {
    const s = normalizeStatus(status);
    if (["completed", "done", "result_ready"].includes(s)) {
      return <Badge variant="secondary">Completed</Badge>;
    }
    if (["in_progress", "processing", "under_review", "sample_collected"].includes(s)) {
      return <Badge>In Progress</Badge>;
    }
    if (["pending", "new", "scheduled"].includes(s)) {
      return <Badge variant="outline">Pending</Badge>;
    }
    if (["cancelled", "canceled", "rejected"].includes(s)) {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    return <Badge variant="outline">{titleCaseStatus(status)}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lab Staff Dashboard</h2>
          <p className="text-muted-foreground">
            Orders, workflow, results pipeline, and analytics pulled from Supabase
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={!labId || loading}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {!labId ? (
        <Card>
          <CardHeader>
            <CardTitle>Lab not connected</CardTitle>
            <CardDescription>
              We couldn't detect a lab entity for this staff account yet. Once your staff profile is linked to a lab,
              dashboard data and analytics will appear here.
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

          {/* Additional operational cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card className={derived.pending > 0 ? "border-primary/20" : undefined}>
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
                  <FlaskConical className="h-5 w-5 text-primary" />
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
                    <p className="text-sm text-muted-foreground">Completed (recent)</p>
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
                  <ShieldCheck className="h-5 w-5 text-primary" />
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Recent Lab Orders
                  </CardTitle>
                  <CardDescription>
                    Latest orders and workflow state
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading lab orders…</p>
                ) : recentOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No lab orders yet.</p>
                ) : (
                  (recentOrders as any[]).map((o) => (
                    <div
                      key={o.id}
                      className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">
                            {o.order_number || o.test_name || "Lab Order"}
                          </p>
                          {o.priority ? (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                              {titleCaseStatus(o.priority)}
                            </Badge>
                          ) : null}
                        </div>

                        <p className="text-sm text-muted-foreground truncate">
                          {(o.patient_name || o.patient_snapshot_full_name || o.patient?.full_name || "Patient")} •{" "}
                          {(o.doctor?.full_name || "Doctor")}
                        </p>

                        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                          <span>Created {formatRelative(o.created_at)}</span>
                          {o.sample_collected_at ? <span>Sample collected {formatRelative(o.sample_collected_at)}</span> : null}
                          {o.completed_at ? <span>Completed {formatRelative(o.completed_at)}</span> : null}
                          {o.payment_status ? <span>Payment: {titleCaseStatus(o.payment_status)}</span> : null}
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
                  ) : activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent activity.</p>
                  ) : (
                    activity.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-start gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                      >
                        <div className="mt-1">
                          <FlaskConical className="h-4 w-4 text-primary" />
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
                  <CardTitle className="flex items-center gap-2">
                    <TestTube2 className="h-5 w-5" />
                    Queue Health
                  </CardTitle>
                  <CardDescription>Quick operational snapshot from recent orders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-medium">{loading ? "…" : derived.pending}</span>
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
                    <span className="text-muted-foreground">Urgent / STAT</span>
                    <span className="font-medium">{loading ? "…" : derived.urgent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Overdue (&gt;48h)</span>
                    <span className="font-medium">{loading ? "…" : derived.overdue}</span>
                  </div>

                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Full operational analytics, trends, and SLA metrics are available in the Analytics tab.
                  </div>
                </CardContent>
              </Card>

              {!loading && (recentOrders?.length || 0) > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Latest Order Timestamp</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {formatDateTime((recentOrders as any[])[0]?.created_at)}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {labId ? (
            <LabAnalytics labCenterId={labId} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Analytics unavailable</CardTitle>
                <CardDescription>
                  Connect this staff account to a lab entity to load lab analytics.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
