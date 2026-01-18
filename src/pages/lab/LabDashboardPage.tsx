// File: src/pages/lab/LabDashboardPage.tsx
// Phase 7 fix: wire real-data LabHomeCollection + LabSampleManager into the Lab dashboard UI,
// removing any remaining "not-mounted" real-data pages.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { DashboardShell, type SidebarItem } from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/dashboard/EmptyState";

import LabDashboardContent from "@/components/staff/LabDashboardContent";
import { LabOrderQueue } from "@/components/lab/LabOrderQueue";
import LabHomeCollection from "@/components/lab/LabHomeCollection";
import LabSampleManager from "@/components/lab/LabSampleManager";
import LabAnalytics from "@/components/lab/LabAnalytics";
import LabBillingInsurance from "@/components/lab/LabBillingInsurance";
import { LabReferralsSection } from "@/components/lab/LabReferralsSection";
import { LabStaffManager } from "@/components/lab/LabStaffManager";

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
} from "lucide-react";

type LabCenterRow = {
  id: string;
  name: string;
  is_verified: boolean | null;
  status: string | null;
};

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
  const navigate = useNavigate();
  const { user, loading: authLoading, activeRole } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "home" | "samples" | "analytics" | "billing" | "referrals" | "staff"
  >("overview");

  const [center, setCenter] = useState<LabCenterRow | null>(null);
  const [loadingCenter, setLoadingCenter] = useState(true);

  const [orders, setOrders] = useState<any[]>([]);
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

  const fetchOrders = async () => {
    if (!labCenterId) return;
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from("test_orders")
        .select("*")
        .eq("lab_center_id", labCenterId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setOrders((data || []) as any[]);
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

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-5 w-5" /> },
      { id: "orders", label: "Orders", icon: <ClipboardList className="h-5 w-5" /> },
      { id: "home", label: "Home Collection", icon: <Home className="h-5 w-5" /> },
      { id: "samples", label: "Samples", icon: <TestTube2 className="h-5 w-5" /> },
      { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-5 w-5" /> },
      { id: "billing", label: "Billing / Insurance", icon: <CreditCard className="h-5 w-5" /> },
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

  const isLoading = authLoading || loadingCenter;

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
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
        <EmptyState
          icon={<FlaskConical className="h-12 w-12" />}
          title="Sign in required"
          description="Please sign in to access the lab dashboard."
          action={<button onClick={() => navigate("/auth")} className="text-primary underline">Sign In</button>}
        />
      </div>
    );
  }

  if (!center) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
        <EmptyState
          icon={<FlaskConical className="h-12 w-12" />}
          title="No Lab Center Found"
          description="You don't have a lab center associated with your account."
          action={<button onClick={() => navigate("/lab/register")} className="text-primary underline">Register Lab</button>}
        />
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
        if (next === "orders") fetchOrders();
      }}
    >
      {activeTab === "overview" && <LabDashboardContent />}

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

      {activeTab === "referrals" && <LabReferralsSection labCenterId={labCenterId} />}

      {activeTab === "staff" && <LabStaffManager labCenterId={labCenterId} />}
    </DashboardShell>
  );
}
