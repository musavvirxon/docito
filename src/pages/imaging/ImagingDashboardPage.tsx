// File: src/pages/imaging/ImagingDashboardPage.tsx
// FULL FILE REPLACEMENT

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { DashboardShell, type SidebarItem } from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/dashboard/EmptyState";
import Header from "@/components/Header";

import ImagingDashboardContent from "@/components/staff/ImagingDashboardContent";
import ImagingScanWorkflow from "@/components/imaging/ImagingScanWorkflow";
import ImagingReportManager from "@/components/imaging/ImagingReportManager";
import ImagingEquipmentManager from "@/components/imaging/ImagingEquipmentManager";
import ImagingAnalytics from "@/components/imaging/ImagingAnalytics";
import ImagingBillingSection from "@/components/imaging/ImagingBillingSection";
import { ImagingReferralsSection } from "@/components/imaging/ImagingReferralsSection";
import ImagingStaffManager from "@/components/imaging/ImagingStaffManager";
import FinanceManagementSection from "@/components/financial/FinanceManagementSection";

import {
  LayoutDashboard,
  ClipboardList,
  FileImage,
  Wrench,
  BarChart3,
  CreditCard,
  DollarSign,
  ArrowRightLeft,
  Users,
  Settings,
  Loader2,
  ScanLine,
} from "lucide-react";

type ImagingCenterRow = {
  id: string;
  name: string;
  is_verified: boolean | null;
  status: string | null;
};

type ImagingTab =
  | "overview"
  | "workflow"
  | "reports"
  | "equipment"
  | "analytics"
  | "billing"
  | "finances"
  | "referrals"
  | "staff";

const ALLOWED_TABS: ImagingTab[] = [
  "overview",
  "workflow",
  "reports",
  "equipment",
  "analytics",
  "billing",
  "finances",
  "referrals",
  "staff",
];

function isImagingTab(value: string): value is ImagingTab {
  return (ALLOWED_TABS as string[]).includes(value);
}

async function fetchMyImagingCenter(userId: string): Promise<ImagingCenterRow | null> {
  const { data: adminRow, error: adminErr } = await supabase
    .from("imaging_centers")
    .select("id,name,is_verified,status")
    .eq("admin_id", userId)
    .maybeSingle();

  if (adminErr) throw adminErr;
  if (adminRow?.id) return adminRow as ImagingCenterRow;

  const { data: staffRow, error: staffErr } = await supabase
    .from("imaging_staff")
    .select("imaging_center_id,status")
    .eq("user_id", userId)
    .in("status", ["active", "approved"])
    .maybeSingle();

  if (staffErr) throw staffErr;
  if (!staffRow?.imaging_center_id) return null;

  const { data: centerRow, error: centerErr } = await supabase
    .from("imaging_centers")
    .select("id,name,is_verified,status")
    .eq("id", staffRow.imaging_center_id)
    .maybeSingle();

  if (centerErr) throw centerErr;
  return (centerRow as ImagingCenterRow) ?? null;
}

export default function ImagingDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, activeRole } = useAuth();

  const [activeTab, setActiveTab] = useState<ImagingTab>("overview");
  const [center, setCenter] = useState<ImagingCenterRow | null>(null);
  const [loadingCenter, setLoadingCenter] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!user) {
        setCenter(null);
        setLoadingCenter(false);
        return;
      }

      setLoadingCenter(true);
      try {
        const c = await fetchMyImagingCenter(user.id);
        setCenter(c);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load imaging center");
        setCenter(null);
      } finally {
        setLoadingCenter(false);
      }
    };

    void run();
  }, [user]);

  const centerId = center?.id || "";

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = (params.get("tab") || params.get("section") || "").trim();
    const hash = (location.hash || "").replace("#", "").trim();
    const desired = (raw || hash).toLowerCase();

    if (!desired || !isImagingTab(desired)) return;

    if (activeTab !== desired) {
      setActiveTab(desired);
    }
  }, [location.hash, location.search, activeTab]);

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-5 w-5" /> },
      { id: "workflow", label: "Scan Workflow", icon: <ClipboardList className="h-5 w-5" /> },
      { id: "reports", label: "Reports", icon: <FileImage className="h-5 w-5" /> },
      { id: "equipment", label: "Equipment", icon: <Wrench className="h-5 w-5" /> },
      { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-5 w-5" /> },
      { id: "billing", label: "Billing", icon: <CreditCard className="h-5 w-5" /> },
      { id: "finances", label: "Finances", icon: <DollarSign className="h-5 w-5" /> },
      { id: "referrals", label: "Referrals", icon: <ArrowRightLeft className="h-5 w-5" /> },
      { id: "staff", label: "Staff", icon: <Users className="h-5 w-5" /> },
      {
        id: "settings",
        label: "Settings",
        icon: <Settings className="h-5 w-5" />,
        onClick: () => navigate("/imaging/settings"),
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
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
          <EmptyState
            icon={<ScanLine className="h-12 w-12" />}
            title="Sign in required"
            description="Please sign in to access the imaging dashboard."
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
            icon={<ScanLine className="h-12 w-12" />}
            title="No Imaging Center Found"
            description="You don't have an imaging center associated with your account."
            action={
              <button onClick={() => navigate("/imaging/register")} className="text-primary underline">
                Register Imaging Center
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
        const next = String(id).toLowerCase();
        if (!isImagingTab(next)) return;

        setActiveTab(next);

        const params = new URLSearchParams(location.search);
        params.set("tab", next);

        navigate(
          {
            pathname: location.pathname,
            search: params.toString() ? `?${params.toString()}` : "",
          },
          { replace: true },
        );
      }}
    >
      {activeTab === "overview" && <ImagingDashboardContent activeSection="overview" />}

      {activeTab === "workflow" && <ImagingScanWorkflow centerId={centerId} />}

      {activeTab === "reports" && <ImagingReportManager centerId={centerId} />}

      {activeTab === "equipment" && <ImagingEquipmentManager centerId={centerId} />}

      {activeTab === "analytics" && <ImagingAnalytics centerId={centerId} />}

      {activeTab === "billing" && <ImagingBillingSection centerId={centerId} />}

      {activeTab === "finances" && <FinanceManagementSection entityType="imaging" entityId={centerId} />}

      {activeTab === "referrals" && <ImagingReferralsSection centerId={centerId} />}

      {activeTab === "staff" && <ImagingStaffManager imagingCenterId={centerId} />}
    </DashboardShell>
  );
}
