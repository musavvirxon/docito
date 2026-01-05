import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, FlaskConical, ClipboardList, RefreshCw } from "lucide-react";
import { useLabStaffDashboard } from "@/hooks/useLabStaffDashboard";
import { useTestOrders } from "@/hooks/useTestOrders";

export default function LabDashboardContent() {
  const { labId, loading, stats, activity, recentOrders } = useLabStaffDashboard();
  const { fetchLabOrders } = useTestOrders(labId || "");

  const statusBadge = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (["completed", "done", "result_ready"].includes(s)) return <Badge variant="secondary">Completed</Badge>;
    if (["in_progress", "processing", "under_review"].includes(s)) return <Badge>In Progress</Badge>;
    if (["pending", "new"].includes(s)) return <Badge variant="outline">Pending</Badge>;
    return <Badge variant="outline">{status || "Unknown"}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lab Staff Dashboard</h2>
          <p className="text-muted-foreground">Orders, workflow, and lab activity pulled from Supabase</p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchLabOrders()}
          disabled={!labId || loading}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading orders…</p>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lab orders yet.</p>
            ) : (
              recentOrders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="font-medium">{o.test_name || "Lab Test"}</p>
                    <p className="text-sm text-muted-foreground">
                      {o.patient?.full_name || "Patient"} • {o.doctor?.full_name || "Doctor"}
                    </p>
                  </div>
                  {statusBadge(o.status)}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading activity…</p>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              activity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="mt-1">
                    <FlaskConical className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.patient} • {a.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

