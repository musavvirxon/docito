// src/pages/lab/LabDashboardPage.tsx
// File: src/pages/lab/LabDashboardPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLabCenter } from "@/hooks/useLabCenter";

import { DashboardShell, type SidebarItem } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatsGrid, type StatCardProps } from "@/components/dashboard/StatsGrid";
import { EmptyState } from "@/components/dashboard/EmptyState";

import LabOrderQueue from "@/components/lab/LabOrderQueue";
import LabSampleManager from "@/components/lab/LabSampleManager";
import LabHomeCollection from "@/components/lab/LabHomeCollection";
import LabAnalytics from "@/components/lab/LabAnalytics";
import LabBillingInsurance from "@/components/lab/LabBillingInsurance";
import LabStaffManager from "@/components/lab/LabStaffManager";
import LabSettingsSection from "@/components/lab/LabSettingsSection";
import TestCatalogManager from "@/components/lab/TestCatalogManager";
import { supabase } from "@/integrations/supabase/client";

import {
  LayoutDashboard,
  ClipboardList,
  TestTube,
  Truck,
  BarChart3,
  CreditCard,
  Users,
  Settings,
  BookOpen,
  Loader2,
  Calendar,
  Activity,
  CheckCircle,
} from "lucide-react";

type OverviewStats = {
  todayOrders: number;
  pendingSamples: number;
  processing: number;
  completedToday: number;
};

export default function LabDashboardPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, activeRole } = useAuth();
  const { myLabCenter, fetchMyLabCenter, loading: centerLoading } = useLabCenter();

  const [activeTab, setActiveTab] = useState("overview");
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [stats, setStats] = useState<OverviewStats>({
    todayOrders: 0,
    pendingSamples: 0,
    processing: 0,
    completedToday: 0,
  });

  useEffect(() => {
    fetchMyLabCenter();
  }, [fetchMyLabCenter]);

  const labCenterId = myLabCenter?.id || "";

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-5 w-5" /> },
      { id: "orders", label: "Orders", icon: <ClipboardList className="h-5 w-5" /> },
      { id: "samples", label: "Samples", icon: <TestTube className="h-5 w-5" /> },
      { id: "home", label: "Home Collections", icon: <Truck className="h-5 w-5" /> },
      { id: "catalog", label: "Test Catalog", icon: <BookOpen className="h-5 w-5" /> },
      { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-5 w-5" /> },
      { id: "billing", label: "Billing", icon: <CreditCard className="h-5 w-5" /> },
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

  const fetchOverview = async () => {
    if (!labCenterId) return;
    setOverviewLoading(true);
    try {
      const today = new Date();
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59));

      const { count: todayOrdersCount, error: ordersErr } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("receiver_type", "lab_center")
        .eq("receiver_entity_id", labCenterId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      if (ordersErr) throw ordersErr;

      const { count: pendingSamplesCount } = await supabase
        .from("lab_samples" as any)
        .select("id", { count: "exact", head: true })
        .eq("lab_center_id", labCenterId)
        .eq("status", "pending");

      const { count: processingCount } = await supabase
        .from("lab_samples" as any)
        .select("id", { count: "exact", head: true })
        .eq("lab_center_id", labCenterId)
        .eq("status", "processing");

      const { count: completedTodayCount } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("receiver_type", "lab_center")
        .eq("receiver_entity_id", labCenterId)
        .eq("status", "completed")
        .gte("completed_at", start.toISOString())
        .lte("completed_at", end.toISOString());

      setStats({
        todayOrders: todayOrdersCount ?? 0,
        pendingSamples: pendingSamplesCount ?? 0,
        processing: processingCount ?? 0,
        completedToday: completedTodayCount ?? 0,
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load lab overview");
      setStats({ todayOrders: 0, pendingSamples: 0, processing: 0, completedToday: 0 });
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    if (labCenterId) fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labCenterId]);

  const statsCards: StatCardProps[] = useMemo(
    () => [
      { label: "Orders Today", value: stats.todayOrders, icon: <Calendar className="h-6 w-6" /> },
      { label: "Pending Samples", value: stats.pendingSamples, icon: <TestTube className="h-6 w-6" /> },
      { label: "Processing", value: stats.processing, icon: <Activity className="h-6 w-6" /> },
      { label: "Completed Today", value: stats.completedToday, icon: <CheckCircle className="h-6 w-6" /> },
    ],
    [stats],
  );

  const isLoading = authLoading || centerLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="Sign in required"
          description="Please sign in to access the lab dashboard."
          action={{ label: "Sign In", onClick: () => navigate("/auth") }}
        />
      </div>
    );
  }

  if (!myLabCenter) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="No Lab Center Found"
          description="You don't have a lab center associated with your account."
          action={{ label: "Register Lab Center", onClick: () => navigate("/lab/register") }}
        />
      </div>
    );
  }

  return (
    <DashboardShell
      role={activeRole as any}
      entityName={myLabCenter.name}
      entityStatus={myLabCenter.is_verified ? "verified" : "pending"}
      sidebarItems={sidebarItems}
      activeItem={activeTab}
      onItemChange={(id) => {
        setActiveTab(id);
        if (id === "overview") fetchOverview();
      }}
    >
      {activeTab === "overview" && (
        <>
          <PageHeader
            title="Lab Dashboard"
            description="Orders, samples, analytics, and billing pulled from Supabase"
            actions={
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                onClick={fetchOverview}
                disabled={overviewLoading}
              >
                {overviewLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Refresh
              </button>
            }
          />

          <StatsGrid stats={statsCards} className="mb-8" />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border bg-card text-card-foreground p-4">
              <h3 className="font-semibold mb-2">Orders</h3>
              <p className="text-sm text-muted-foreground mb-4">Latest lab referrals assigned to your center.</p>
              <LabOrderQueue labCenterId={labCenterId} />
            </div>
            <div className="rounded-lg border bg-card text-card-foreground p-4">
              <h3 className="font-semibold mb-2">Samples</h3>
              <p className="text-sm text-muted-foreground mb-4">Track collection and processing status.</p>
              <LabSampleManager labCenterId={labCenterId} />
            </div>
          </div>
        </>
      )}

      {activeTab === "orders" && <LabOrderQueue labCenterId={labCenterId} />}
      {activeTab === "samples" && <LabSampleManager labCenterId={labCenterId} />}
      {activeTab === "home" && <LabHomeCollection labCenterId={labCenterId} />}
      {activeTab === "catalog" && <TestCatalogManager labCenterId={labCenterId} />}
      {activeTab === "analytics" && <LabAnalytics labCenterId={labCenterId} />}
      {activeTab === "billing" && <LabBillingInsurance labCenterId={labCenterId} />}
      {activeTab === "staff" && <LabStaffManager labCenterId={labCenterId} />}
      {activeTab === "settings" && <LabSettingsSection labCenterId={labCenterId} />}
    </DashboardShell>
  );
}
