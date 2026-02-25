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
} from "lucide-react";

type LabCenterRow = {
  id: string;
  name: string;
  is_verified: boolean | null;
  status: string | null;
};

type AnyOrder = Record<string, any>;

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

  const overviewStatCards = useMemo<StatCardProps[]>(() => {
    const list = orders || [];
    const now = new Date();

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

    const todayCreated = list.filter((o) => isSameLocalDay(o?.created_at)).length;

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

      const delivered = pickDate(o, [
        "result_delivered_at",
        "delivered_at",
        "shared_at",
        "patient_notified_at",
        "sent_at",
      ]);
      return !delivered;
    }).length;

    const tatHoursValues = list
      .filter((o) => isCompletedStatus(normalizeStatus(o?.status)))
      .map((o) => {
        const startedAt = pickDate(o, [
          "sample_collected_at",
          "collected_at",
          "received_at",
          "scheduled_at",
          "created_at",
        ]);
        const finishedAt = pickDate(o, [
          "completed_at",
          "result_ready_at",
          "reported_at",
          "finalized_at",
          "updated_at",
        ]);
        if (!startedAt || !finishedAt) return null;
        const diffMs = finishedAt.getTime() - startedAt.getTime();
        if (diffMs <= 0) return null;
        const hours = diffMs / (1000 * 60 * 60);
        if (!Number.isFinite(hours)) return null;
        if (hours > 24 * 30) return null;
        return hours;
      })
      .filter((v): v is number => v !== null);

    const avgTatHours =
      tatHoursValues.length > 0
        ? Math.round((tatHoursValues.reduce((sum, v) => sum + v, 0) / tatHoursValues.length) * 10) / 10
        : 0;

    const completionRatePct = list.length > 0 ? Math.round((completedTotal / list.length) * 100) : 0;

    return [
      { label: "Orders Today", value: todayCreated, icon: <Calendar className="h-6 w-6" /> },
      { label: "Pending", value: pending, icon: <ClipboardList className="h-6 w-6" /> },
      { label: "In Progress", value: inProgress, icon: <Activity className="h-6 w-6" /> },
      { label: "Completed Today", value: completedToday, icon: <CheckCircle2 className="h-6 w-6" /> },

      { label: "Overdue Tests", value: overdue, icon: <AlertTriangle className="h-6 w-6" /> },
      { label: "Avg TAT (hrs)", value: avgTatHours, icon: <Clock3 className="h-6 w-6" /> },
      { label: "Ready, Not Delivered", value: readyNotDelivered, icon: <PackageCheck className="h-6 w-6" /> },
      { label: "Completion Rate (%)", value: completionRatePct, icon: <Percent className="h-6 w-6" /> },
    ];
  }, [orders]);

  const fetchOrders = async () => {
    if (!labCenterId) return;
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from("test_orders")
        .select("*")
        .eq("lab_center_id", labCenterId)
        .order("created_at", { ascending: false })
        .limit(1000);

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
            }
          />

          <StatsGrid stats={overviewStatCards} className="mb-8" />

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
