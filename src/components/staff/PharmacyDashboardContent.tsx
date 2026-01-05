import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Pill, ClipboardList, RefreshCw } from "lucide-react";
import { usePharmacyStaffDashboard } from "@/hooks/usePharmacyStaffDashboard";
import { usePrescriptions } from "@/hooks/usePrescriptions";

export default function PharmacyDashboardContent() {
  const { pharmacyId, loading, stats, activity, recentOrders, inventoryMeta } = usePharmacyStaffDashboard();
  const { fetchFulfillmentOrders } = usePrescriptions(pharmacyId || undefined);

  const statusBadge = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (["completed", "delivered", "picked_up"].includes(s)) return <Badge variant="secondary">Completed</Badge>;
    if (["ready", "ready_for_pickup"].includes(s)) return <Badge>Ready</Badge>;
    if (["pending", "new"].includes(s)) return <Badge variant="outline">Pending</Badge>;
    return <Badge variant="outline">{status || "Unknown"}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pharmacy Staff Dashboard</h2>
          <p className="text-muted-foreground">Fulfillment + inventory pulled from Supabase</p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchFulfillmentOrders()}
          disabled={!pharmacyId || loading}
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
              {stat.title === "Low Stock Items" && !loading ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Expiring soon: {inventoryMeta.expiringCount}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Fulfillment */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Recent Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading prescriptions…</p>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No prescriptions yet.</p>
            ) : (
              recentOrders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="font-medium">{o.medication_name || "Medication"}</p>
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
                    <Pill className="h-4 w-4 text-primary" />
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

