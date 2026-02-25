// File: src/pages/lab/LabDashboardPage.tsx
// FULL FILE REPLACEMENT
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { DashboardShell, type SidebarItem } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatsGrid, type StatCardProps } from "@/components/dashboard/StatsGrid";
import { EmptyState } from "@/components/dashboard/EmptyState";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import LabDashboardContent from "@/components/staff/LabDashboardContent";
import { LabOrderQueue } from "@/components/lab/LabOrderQueue";
import LabHomeCollection from "@/components/lab/LabHomeCollection";
import LabSampleManager from "@/components/lab/LabSampleManager";
import LabAnalytics from "@/components/lab/LabAnalytics";
import LabBillingInsurance from "@/components/lab/LabBillingInsurance";
import { LabReferralsSection } from "@/components/lab/LabReferralsSection";
import { LabStaffManager } from "@/components/lab/LabStaffManager";
import FinanceManagementSection from "@/components/financial/FinanceManagementSection";

import {
  LayoutDashboard,
  ClipboardList,
  Home,
  TestTube2,
  BarChart3,
  CreditCard,
  ArrowRightLeft,
  Users,
  Settings,
  Loader2,
  FlaskConical,
  DollarSign,
  Calendar,
  Activity,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  PackageCheck,
  Percent,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
} from "lucide-react";

type LabCenterRow = {
  id: string;
  name: string;
  is_verified: boolean | null;
  status: string | null;
};

type AnyOrder = Record<string, any>;
type RangeDays = 7 | 30 | 90;

type PeriodMetrics = {
  total: number;
  createdToday: number;
  pending: number;
  inProgress: number;
  completedTotal: number;
  completedToday: number;
  overdue: number;
  readyNotDelivered: number;
  avgTatHours: number;
  completionRatePct: number;
  breakdown: Array<{ label: string; count: number }>;
};

function toDateSafe(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function pickDate(order: AnyOrder, keys: string[]): Date | null {
  for (const key of keys) {
    const d = toDateSafe(order?.[key]);
    if (d) return d;
  }
  return null;
}

function normalizeStatus(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function isCompletedStatus(status: string): boolean {
  return ["completed", "done", "result_ready", "reported", "finalized"].includes(status);
}

function isPendingStatus(status: string): boolean {
  return ["pending", "new", "awaiting_confirmation", "awaiting_sample"].includes(status);
}

function isInProgressStatus(status: string): boolean {
  return [
    "in_progress",
    "processing",
    "under_review",
    "sample_collected",
    "analyzing",
    "testing",
    "in_lab",
    "received",
  ].includes(status);
}

function isReadyStatus(status: string): boolean {
  return ["result_ready", "completed", "reported", "finalized"].includes(status);
}

function getCreatedAt(order: AnyOrder): Date | null {
  return pickDate(order, ["created_at", "ordered_at", "requested_at", "scheduled_at"]);
}

function getOrderCategoryLabel(order: AnyOrder): string {
  const raw =
    order?.test_category ??
    order?.category ??
    order?.test_type ??
    order?.panel_name ??
    order?.test_name ??
    order?.exam_name ??
    order?.service_name ??
    order?.name;

  const value = String(raw || "").trim();
  if (!value) return "Other";
  return value.length > 32 ? `${value.slice(0, 32)}…` : value;
}

function buildPeriodMetrics(list: AnyOrder[], now: Date): PeriodMetrics {
  const isSameLocalDay = (value?: unknown) => {
    const d = toDateSafe(value);
    if (!d) return false;
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  const pending = list.filter((o) => isPendingStatus(normalizeStatus(o?.status))).length;
  const inProgress = list.filter((o) => isInProgressStatus(normalizeStatus(o?.status))).length;
  const completedTotal = list.filter((o) => isCompletedStatus(normalizeStatus(o?.status))).length;

  const completedToday = list.filter((o) => {
    const status = normalizeStatus(o?.status);
    if (!isCompletedStatus(status)) return false;
    const completedAt = pickDate(o, [
      "completed_at",
      "result_ready_at",
      "reported_at",
      "finalized_at",
      "updated_at",
      "created_at",
    ]);
    return isSameLocalDay(completedAt?.toISOString());
  }).length;

  const createdToday = list.filter((o) => isSameLocalDay(getCreatedAt(o)?.toISOString())).length;

  const overdue = list.filter((o) => {
    const status = normalizeStatus(o?.status);
    if (isCompletedStatus(status)) return false;

    const due = pickDate(o, [
      "due_at",
      "expected_completion_at",
      "promised_at",
      "target_at",
      "deadline_at",
      "scheduled_result_at",
    ]);
    if (!due) return false;
    return due.getTime() < now.getTime();
  }).length;

  const readyNotDelivered = list.filter((o) => {
    const status = normalizeStatus(o?.status);
    if (!isReadyStatus(status)) return false;

    const delivered = pickDate(o, ["result_delivered_at", "delivered_at", "shared_at", "patient_notified_at", "sent_at"]);
    return !delivered;
  }).length;

  const tatHoursValues = list
    .filter((o) => isCompletedStatus(normalizeStatus(o?.status)))
    .map((o) => {
      const startedAt = pickDate(o, ["sample_collected_at", "collected_at", "received_at", "scheduled_at", "created_at"]);
      const finishedAt = pickDate(o, ["completed_at", "result_ready_at", "reported_at", "finalized_at", "updated_at"]);
      if (!startedAt || !finishedAt) return null;

      const diffMs = finishedAt.getTime() - startedAt.getTime();
      if (diffMs <= 0) return null;

      const hours = diffMs / (1000 * 60 * 60);
      if (!Number.isFinite(hours) || hours > 24 * 30) return null;

      return hours;
    })
    .filter((v): v is number => v !== null);

  const avgTatHours =
    tatHoursValues.length > 0
      ? Math.round((tatHoursValues.reduce((sum, v) => sum + v, 0) / tatHoursValues.length) * 10) / 10
      : 0;

  const completionRatePct = list.length > 0 ? Math.round((completedTotal / list.length) * 100) : 0;

  const breakdownMap = new Map<string, number>();
  for (const order of list) {
    const label = getOrderCategoryLabel(order);
    breakdownMap.set(label, (breakdownMap.get(label) || 0) + 1);
  }

  const breakdown = [...breakdownMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    total: list.length,
    createdToday,
    pending,
    inProgress,
    completedTotal,
    completedToday,
    overdue,
    readyNotDelivered,
    avgTatHours,
    completionRatePct,
    breakdown,
  };
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

async function fetchMyLabCenter(userId: string): Promise<LabCenterRow | null> {
  const { data: adminRow, error: adminErr } = await supabase
    .from("lab_centers")
    .select("id,name,is_verified,status")
    .eq("admin_id", userId)
    .maybeSingle();

  if (adminErr) throw adminErr;
  if (adminRow?.id) return adminRow as LabCenterRow;

  const { data: staffRow, error: staffErr } = await supabase
    .from("lab_staff")
    .select("lab_center_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (staffErr) throw staffErr;
  if (!staffRow?.lab_center_id) return null;

  const { data: centerRow, error: cErr } = await supabase
    .from("lab_centers")
    .select("id,name,is_verified,status")
    .eq("id", staffRow.lab_center_id)
    .maybeSingle();

  if (cErr) throw cErr;
  return (centerRow as LabCenterRow) ?? null;
}

export default function LabDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, activeRole } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "home" | "samples" | "analytics" | "billing" | "finances" | "referrals" | "staff"
  >("overview");

  const [analyticsRange, setAnalyticsRange] = useState<RangeDays>(30);

  const [center, setCenter] = useState<LabCenterRow | null>(null);
  const [loadingCenter, setLoadingCenter] = useState(true);

  const [orders, setOrders] = useState<AnyOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!user) {
        setCenter(null);
        setLoadingCenter(false);
        return;
      }
      setLoadingCenter(true);
      try {
        const c = await fetchMyLabCenter(user.id);
        setCenter(c);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load lab center");
        setCenter(null);
      } finally {
        setLoadingCenter(false);
      }
    };
    run();
  }, [user]);

  const labCenterId = center?.id || "";

  const analyticsComputed = useMemo(() => {
    const now = new Date();

    const currentStart = new Date(now);
    currentStart.setHours(0, 0, 0, 0);
    currentStart.setDate(currentStart.getDate() - (analyticsRange - 1));

    const prevEnd = new Date(currentStart.getTime() - 1);
    const prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - analyticsRange);

    const currentOrders = orders.filter((o) => {
      const created = getCreatedAt(o);
      return !!created && created >= currentStart && created <= now;
    });

    const previousOrders = orders.filter((o) => {
      const created = getCreatedAt(o);
      return !!created && created >= prevStart && created <= prevEnd;
    });

    const currentMetrics = buildPeriodMetrics(currentOrders, now);
    const previousMetrics = buildPeriodMetrics(previousOrders, now);

    return {
      currentStart,
      prevStart,
      prevEnd,
      currentMetrics,
      previousMetrics,
      trends: {
        total: pctDelta(currentMetrics.total, previousMetrics.total),
        completed: pctDelta(currentMetrics.completedTotal, previousMetrics.completedTotal),
        tat: pctDelta(currentMetrics.avgTatHours, previousMetrics.avgTatHours),
        completionRate: pctDelta(currentMetrics.completionRatePct, previousMetrics.completionRatePct),
      },
    };
  }, [orders, analyticsRange]);

  const overviewStatCards = useMemo<StatCardProps[]>(() => {
    const m = analyticsComputed.currentMetrics;

    return [
      { label: `Orders (${analyticsRange}d)`, value: m.total, icon: <Calendar className="h-6 w-6" /> },
      { label: "Pending", value: m.pending, icon: <ClipboardList className="h-6 w-6" /> },
      { label: "In Progress", value: m.inProgress, icon: <Activity className="h-6 w-6" /> },
      { label: "Completed Today", value: m.completedToday, icon: <CheckCircle2 className="h-6 w-6" /> },

      { label: "Overdue Tests", value: m.overdue, icon: <AlertTriangle className="h-6 w-6" /> },
      { label: "Avg TAT (hrs)", value: m.avgTatHours, icon: <Clock3 className="h-6 w-6" /> },
      { label: "Ready, Not Delivered", value: m.readyNotDelivered, icon: <PackageCheck className="h-6 w-6" /> },
      { label: "Completion Rate (%)", value: m.completionRatePct, icon: <Percent className="h-6 w-6" /> },
    ];
  }, [analyticsComputed.currentMetrics, analyticsRange]);

  const fetchOrders = async () => {
    if (!labCenterId) return;
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from("test_orders")
        .select("*")
        .eq("lab_center_id", labCenterId)
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) throw error;
      setOrders((data || []) as AnyOrder[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load orders");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (labCenterId) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labCenterId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = (params.get("tab") || params.get("section") || "").trim();
    const hash = (location.hash || "").replace("#", "").trim();
    const desired = (raw || hash).toLowerCase();

    const rangeParam = (params.get("range") || "").trim();
    const parsedRange = Number(rangeParam);
    if ([7, 30, 90].includes(parsedRange)) {
      setAnalyticsRange(parsedRange as RangeDays);
    }

    if (!desired) return;

    const allowed = ["overview", "orders", "home", "samples", "analytics", "billing", "finances", "referrals", "staff"];
    if (!allowed.includes(desired)) return;

    if (activeTab !== (desired as any)) {
      setActiveTab(desired as any);
      if (desired === "orders" && labCenterId) fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash, location.search, labCenterId]);

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-5 w-5" /> },
      { id: "orders", label: "Orders", icon: <ClipboardList className="h-5 w-5" /> },
      { id: "home", label: "Home Collection", icon: <Home className="h-5 w-5" /> },
      { id: "samples", label: "Samples", icon: <TestTube2 className="h-5 w-5" /> },
      { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-5 w-5" /> },
      { id: "billing", label: "Billing / Insurance", icon: <CreditCard className="h-5 w-5" /> },
      { id: "finances", label: "Finances", icon: <DollarSign className="h-5 w-5" /> },
      { id: "referrals", label: "Referrals", icon: <ArrowRightLeft className="h-5 w-5" /> },
      { id: "staff", label: "Staff", icon: <Users className="h-5 w-5" /> },
      {
        id: "settings",
        label: "Settings",
        icon: <Settings className="h-5 w-5" />,
        onClick: () => navigate("/lab/settings"),
      },
    ],
    [navigate],
  );

  const isLoading = authLoading || loadingCenter || !user;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
          <EmptyState
            icon={<FlaskConical className="h-12 w-12" />}
            title="Sign in required"
            description="Please sign in to access the lab dashboard."
            action={
              <button onClick={() => navigate("/auth")} className="text-primary underline">
                Sign In
              </button>
            }
          />
        </div>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
          <EmptyState
            icon={<FlaskConical className="h-12 w-12" />}
            title="No Lab Center Found"
            description="You don't have a lab center associated with your account."
            action={
              <button onClick={() => navigate("/lab/register")} className="text-primary underline">
                Register Lab
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const trendCardData = [
    {
      label: `Orders (${analyticsRange}d)`,
      current: analyticsComputed.currentMetrics.total,
      previous: analyticsComputed.previousMetrics.total,
      delta: analyticsComputed.trends.total,
    },
    {
      label: `Completed (${analyticsRange}d)`,
      current: analyticsComputed.currentMetrics.completedTotal,
      previous: analyticsComputed.previousMetrics.completedTotal,
      delta: analyticsComputed.trends.completed,
    },
    {
      label: "Avg TAT (hrs)",
      current: analyticsComputed.currentMetrics.avgTatHours,
      previous: analyticsComputed.previousMetrics.avgTatHours,
      delta: analyticsComputed.trends.tat,
      lowerIsBetter: true,
    },
    {
      label: "Completion Rate (%)",
      current: analyticsComputed.currentMetrics.completionRatePct,
      previous: analyticsComputed.previousMetrics.completionRatePct,
      delta: analyticsComputed.trends.completionRate,
    },
  ];

  return (
    <DashboardShell
      role={activeRole as any}
      entityName={center.name}
      entityStatus={center.is_verified ? "verified" : "pending"}
      sidebarItems={sidebarItems}
      activeItem={activeTab}
      onItemChange={(id) => {
        const next = id as any;
        setActiveTab(next);

        const params = new URLSearchParams(location.search);
        params.set("tab", String(next));
        params.set("range", String(analyticsRange));
        navigate(
          {
            pathname: location.pathname,
            search: params.toString() ? `?${params.toString()}` : "",
          },
          { replace: true },
        );

        if (next === "orders" || next === "overview") fetchOrders();
      }}
    >
      {activeTab === "overview" && (
        <>
          <PageHeader
            title="Lab Command Center"
            description="Operations, analytics, billing, referrals, and finance visibility in one overview."
            actions={
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center rounded-md border bg-background p-1">
                  <span className="px-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5" />
                    Range
                  </span>
                  {[7, 30, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        const next = d as RangeDays;
                        setAnalyticsRange(next);

                        const params = new URLSearchParams(location.search);
                        params.set("tab", "overview");
                        params.set("range", String(next));
                        navigate(
                          {
                            pathname: location.pathname,
                            search: `?${params.toString()}`,
                          },
                          { replace: true },
                        );
                      }}
                      className={`h-8 px-3 rounded text-sm ${
                        analyticsRange === d
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>

                <button
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    void fetchOrders();
                  }}
                  disabled={ordersLoading}
                >
                  {ordersLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Refresh Overview
                </button>
              </div>
            }
          />

          <StatsGrid stats={overviewStatCards} className="mb-8" />

          <Card className="mb-6 overflow-hidden">
            <CardHeader>
              <CardTitle>Range Comparison ({analyticsRange} days vs previous {analyticsRange} days)</CardTitle>
              <CardDescription>
                Quick trend comparison to match practice-style analytics controls and performance tracking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {trendCardData.map((item) => {
                  const delta = item.delta;
                  const isPositive = (delta ?? 0) > 0;
                  const isNegative = (delta ?? 0) < 0;
                  const improved =
                    delta === null ? null : item.lowerIsBetter ? (delta < 0 ? true : delta > 0 ? false : null) : isPositive;

                  return (
                    <div key={item.label} className="rounded-lg border p-4 bg-card">
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                      <div className="mt-1 text-2xl font-semibold">{item.current}</div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Prev: {item.previous}</span>
                        <span
                          className={`inline-flex items-center gap-1 ${
                            delta === null
                              ? "text-muted-foreground"
                              : improved === true
                                ? "text-emerald-600"
                                : improved === false
                                  ? "text-rose-600"
                                  : "text-muted-foreground"
                          }`}
                        >
                          {delta === null ? (
                            <Minus className="h-3.5 w-3.5" />
                          ) : isPositive ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : isNegative ? (
                            <TrendingDown className="h-3.5 w-3.5" />
                          ) : (
                            <Minus className="h-3.5 w-3.5" />
                          )}
                          {delta === null ? "n/a" : `${delta > 0 ? "+" : ""}${delta}%`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="font-medium">Top Test Categories ({analyticsRange}d)</div>
                  <p className="text-sm text-muted-foreground mb-4">Category mix for the selected range.</p>

                  {analyticsComputed.currentMetrics.breakdown.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No orders found for the selected range.</div>
                  ) : (
                    <div className="space-y-3">
                      {analyticsComputed.currentMetrics.breakdown.map((item) => {
                        const max = analyticsComputed.currentMetrics.breakdown[0]?.count || 1;
                        const width = Math.max(8, Math.round((item.count / max) * 100));
                        return (
                          <div key={item.label}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="truncate pr-2">{item.label}</span>
                              <span className="text-muted-foreground">{item.count}</span>
                            </div>
                            <div className="h-2 rounded bg-muted overflow-hidden">
                              <div className="h-full rounded bg-primary" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-4">
                  <div className="font-medium">Operational Range Snapshot</div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Selected range: {analyticsRange} days • Compared with the previous {analyticsRange}-day period.
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded border p-3">
                      <div className="text-muted-foreground">Current Pending</div>
                      <div className="text-xl font-semibold">{analyticsComputed.currentMetrics.pending}</div>
                    </div>
                    <div className="rounded border p-3">
                      <div className="text-muted-foreground">Prev Pending</div>
                      <div className="text-xl font-semibold">{analyticsComputed.previousMetrics.pending}</div>
                    </div>
                    <div className="rounded border p-3">
                      <div className="text-muted-foreground">Current Overdue</div>
                      <div className="text-xl font-semibold">{analyticsComputed.currentMetrics.overdue}</div>
                    </div>
                    <div className="rounded border p-3">
                      <div className="text-muted-foreground">Prev Overdue</div>
                      <div className="text-xl font-semibold">{analyticsComputed.previousMetrics.overdue}</div>
                    </div>
                    <div className="rounded border p-3">
                      <div className="text-muted-foreground">Ready Not Delivered</div>
                      <div className="text-xl font-semibold">{analyticsComputed.currentMetrics.readyNotDelivered}</div>
                    </div>
                    <div className="rounded border p-3">
                      <div className="text-muted-foreground">Created Today</div>
                      <div className="text-xl font-semibold">{analyticsComputed.currentMetrics.createdToday}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <LabDashboardContent />

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Advanced Analytics Snapshot</CardTitle>
              <CardDescription>
                Referral volume, completion rates, and turnaround metrics available directly on the overview.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LabAnalytics labCenterId={labCenterId} />
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Orders Queue Snapshot</CardTitle>
                <CardDescription>Recent orders and workflow actions without switching tabs.</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[620px] overflow-auto pr-2">
                {ordersLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading queue…</span>
                  </div>
                ) : (
                  <LabOrderQueue orders={orders as any} labCenterId={labCenterId} onRefresh={fetchOrders} />
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Referrals Snapshot</CardTitle>
                <CardDescription>Track referred tests, statuses, and network activity from the main dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[620px] overflow-auto pr-2">
                <LabReferralsSection labCenterId={labCenterId} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Billing & Insurance Snapshot</CardTitle>
                <CardDescription>Claims and billing workflow preview.</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[620px] overflow-auto pr-2">
                <LabBillingInsurance labCenterId={labCenterId} />
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Finance Ledger Snapshot</CardTitle>
                <CardDescription>Revenue/expense visibility from the lab overview page.</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[620px] overflow-auto pr-2">
                <FinanceManagementSection entityType="lab" entityId={labCenterId} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === "orders" && (
        <>
          {ordersLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading orders…</span>
            </div>
          ) : (
            <LabOrderQueue orders={orders as any} labCenterId={labCenterId} onRefresh={fetchOrders} />
          )}
        </>
      )}

      {activeTab === "home" && <LabHomeCollection labCenterId={labCenterId} />}

      {activeTab === "samples" && <LabSampleManager labCenterId={labCenterId} />}

      {activeTab === "analytics" && <LabAnalytics labCenterId={labCenterId} />}

      {activeTab === "billing" && <LabBillingInsurance labCenterId={labCenterId} />}

      {activeTab === "finances" && <FinanceManagementSection entityType="lab" entityId={labCenterId} />}

      {activeTab === "referrals" && <LabReferralsSection labCenterId={labCenterId} />}

      {activeTab === "staff" && <LabStaffManager labCenterId={labCenterId} />}
    </DashboardShell>
  );
}
