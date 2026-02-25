// File: src/components/staff/PharmacyDashboardContent.tsx
// FULL FILE REPLACEMENT

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Pill,
  RefreshCw,
  Truck,
  CheckCircle2,
  Clock3,
  Package,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { usePharmacyStaffDashboard } from "@/hooks/usePharmacyStaffDashboard";
import PharmacyAnalytics from "@/components/pharmacy/PharmacyAnalytics";

interface PharmacyDashboardContentProps {
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

function money(n: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PharmacyDashboardContent(props: PharmacyDashboardContentProps) {
  const explicitPharmacyId = props.entityInfo?.id || undefined;
  const {
    pharmacyId,
    loading,
    stats,
    activity,
    recentOrders,
    inventoryMeta,
    queueMeta,
    refresh,
  } = usePharmacyStaffDashboard(explicitPharmacyId);

  const defaultTab = props.activeSection === "analytics" ? "analytics" : "overview";
  const [tab, setTab] = useState<"overview" | "analytics">(defaultTab as "overview" | "analytics");

  const derived = useMemo(() => {
    const orders = (recentOrders || []) as any[];

    const pending = orders.filter((o) => ["pending", "new"].includes(normalizeStatus(o?.status))).length;
    const processing = orders.filter((o) =>
      ["processing", "preparing", "reviewing", "awaiting_payment"].includes(normalizeStatus(o?.status)),
    ).length;
    const ready = orders.filter((o) =>
      ["ready", "ready_for_pickup", "prepared"].includes(normalizeStatus(o?.status)),
    ).length;
    const outForDelivery = orders.filter((o) =>
      ["out_for_delivery", "delivering", "courier_assigned"].includes(normalizeStatus(o?.status)),
    ).length;
    const completed = orders.filter((o) =>
      ["completed", "delivered", "picked_up"].includes(normalizeStatus(o?.status)),
    ).length;
    const unpaid = orders.filter((o) =>
      ["unpaid", "pending", "requires_payment", "failed"].includes(normalizeStatus(o?.payment_status)),
    ).length;

    return { pending, processing, ready, outForDelivery, completed, unpaid };
  }, [recentOrders]);

  const statusBadge = (status?: string, paymentStatus?: string) => {
    const s = normalizeStatus(status);
    const p = normalizeStatus(paymentStatus);

    if (["completed", "delivered", "picked_up"].includes(s)) {
      return <Badge variant="secondary">Completed</Badge>;
    }
    if (["ready", "ready_for_pickup", "prepared"].includes(s)) {
      return <Badge>Ready</Badge>;
    }
    if (["out_for_delivery", "delivering", "courier_assigned"].includes(s)) {
      return <Badge variant="outline">Delivery</Badge>;
    }
    if (["processing", "preparing", "reviewing", "awaiting_payment"].includes(s)) {
      return <Badge variant="outline">Processing</Badge>;
    }
    if (["pending", "new"].includes(s)) {
      return <Badge variant="outline">Pending</Badge>;
    }
    if (["cancelled", "canceled", "rejected"].includes(s)) {
      return <Badge variant="destructive">Cancelled</Badge>;
    }

    if (p && ["unpaid", "failed"].includes(p)) {
      return <Badge variant="destructive">Payment Issue</Badge>;
    }

    return <Badge variant="outline">{titleCase(status)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pharmacy Dashboard</h2>
          <p className="text-muted-foreground">
            Fulfillment, inventory, and analytics pulled from Supabase
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={!pharmacyId || loading} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {!pharmacyId ? (
        <Card>
          <CardHeader>
            <CardTitle>Pharmacy not connected</CardTitle>
            <CardDescription>
              We couldn't detect a pharmacy for this account yet. Once linked, fulfillment and inventory analytics will appear here.
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
                      Out of stock: {inventoryMeta.outOfStockCount} • Expiring soon: {inventoryMeta.expiringCount}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-xl font-bold">{loading ? "…" : queueMeta.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <Pill className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Processing</p>
                    <p className="text-xl font-bold">{loading ? "…" : queueMeta.processing}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ready</p>
                    <p className="text-xl font-bold">{loading ? "…" : queueMeta.ready}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Out for Delivery</p>
                    <p className="text-xl font-bold">{loading ? "…" : queueMeta.outForDelivery}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={queueMeta.unpaid > 0 ? "border-orange-500/30" : undefined}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Unpaid / Issues</p>
                    <p className="text-xl font-bold">{loading ? "…" : queueMeta.unpaid}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={inventoryMeta.lowStockCount > 0 ? "border-orange-500/30" : undefined}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Low Stock</p>
                    <p className="text-xl font-bold">{loading ? "…" : inventoryMeta.lowStockCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Recent Fulfillment Orders
                </CardTitle>
                <CardDescription>Latest pharmacy orders and current fulfillment states</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading fulfillment orders…</p>
                ) : (recentOrders?.length || 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No fulfillment orders yet.</p>
                ) : (
                  (recentOrders as any[]).map((o) => (
                    <div
                      key={o.id}
                      className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{o.medication_name || "Medication"}</p>
                          {o.priority ? (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                              {titleCase(o.priority)}
                            </Badge>
                          ) : null}
                          {o.pickup_method ? (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                              {titleCase(o.pickup_method)}
                            </Badge>
                          ) : null}
                        </div>

                        <p className="text-sm text-muted-foreground truncate">
                          {o.patient_name || "Patient"} • {o.doctor_name || "Doctor"}
                        </p>

                        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                          <span>Created {formatRelative(o.created_at)}</span>
                          {o.estimated_ready_at ? <span>ETA {formatRelative(o.estimated_ready_at)}</span> : null}
                          {o.total_amount != null ? <span>{money(Number(o.total_amount))}</span> : null}
                          {o.payment_status ? <span>Payment: {titleCase(o.payment_status)}</span> : null}
                        </div>
                      </div>

                      <div className="shrink-0">{statusBadge(o.status, o.payment_status)}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Activity Feed
                  </CardTitle>
                  <CardDescription>Recent pharmacy workflow updates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading activity…</p>
                  ) : (activity?.length || 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent activity.</p>
                  ) : (
                    activity.map((a) => (
                      <div key={a.id} className="flex items-start gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                        <div className="mt-1">
                          <Pill className="h-4 w-4 text-primary" />
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
                  <CardTitle>Inventory Snapshot</CardTitle>
                  <CardDescription>Quick inventory risk and value metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total SKUs</span>
                    <span className="font-medium">{loading ? "…" : inventoryMeta.totalSkus}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Low Stock</span>
                    <span className="font-medium">{loading ? "…" : inventoryMeta.lowStockCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Out of Stock</span>
                    <span className="font-medium">{loading ? "…" : inventoryMeta.outOfStockCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Expiring (&lt;30d)</span>
                    <span className="font-medium">{loading ? "…" : inventoryMeta.expiringCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Inventory Value (cost)</span>
                    <span className="font-medium">{loading ? "…" : money(inventoryMeta.stockValue)}</span>
                  </div>
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Full revenue, status mix, top medications, and trend charts are available in the Analytics tab.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Queue Health</CardTitle>
                  <CardDescription>Current recent-order operational snapshot</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-medium">{loading ? "…" : derived.pending}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Processing</span>
                    <span className="font-medium">{loading ? "…" : derived.processing}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ready</span>
                    <span className="font-medium">{loading ? "…" : derived.ready}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Out for Delivery</span>
                    <span className="font-medium">{loading ? "…" : derived.outForDelivery}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium">{loading ? "…" : derived.completed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Unpaid / Issues</span>
                    <span className="font-medium">{loading ? "…" : derived.unpaid}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {pharmacyId ? (
            <PharmacyAnalytics pharmacyId={pharmacyId} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Analytics unavailable</CardTitle>
                <CardDescription>
                  Connect this account to a pharmacy to load pharmacy analytics.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
