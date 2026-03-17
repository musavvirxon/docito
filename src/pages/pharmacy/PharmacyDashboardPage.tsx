// File: src/pages/pharmacy/PharmacyDashboardPage.tsx
// Path: src/pages/pharmacy/PharmacyDashboardPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { DashboardShell, type SidebarItem } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatsGrid, type StatCardProps } from "@/components/dashboard/StatsGrid";
import { EmptyState } from "@/components/dashboard/EmptyState";
import Header from "@/components/Header";

import PharmacyPrescriptionInbox from "@/components/pharmacy/PharmacyPrescriptionInbox";
import FulfillmentQueue from "@/components/pharmacy/FulfillmentQueue";
import PharmacyInventoryManager from "@/components/pharmacy/PharmacyInventoryManager";
import PharmacyDeliveryOrders from "@/components/pharmacy/PharmacyDeliveryOrders";
import PharmacyAnalytics from "@/components/pharmacy/PharmacyAnalytics";
import PharmacyInsuranceClaims from "@/components/pharmacy/PharmacyInsuranceClaims";
import PharmacyStaffManager from "@/components/pharmacy/PharmacyStaffManager";
import PharmacySettings from "@/components/pharmacy/PharmacySettings";
import { PharmacyReferralsSection } from "@/components/pharmacy/PharmacyReferralsSection";
import { DocumentVerifySection } from "@/components/verify/DocumentVerifySection";
import FinanceManagementSection from "@/components/financial/FinanceManagementSection";

import {
  LayoutDashboard,
  ClipboardList,
  Pill,
  Package,
  Truck,
  BarChart3,
  CreditCard,
  Users,
  Settings,
  Loader2,
  Calendar,
  Activity,
  CheckCircle,
  ShieldCheck,
  DollarSign,
  ScanLine,
} from "lucide-react";

type PharmacyRow = {
  id: string;
  name: string;
  verified: boolean | null;
  verification_status: string | null;
};

type OverviewStats = {
  prescriptionsToday: number;
  pendingFulfillment: number;
  deliveriesInProgress: number;
  completedToday: number;
};

async function fetchMyPharmacy(userId: string): Promise<PharmacyRow | null> {
  const { data: adminRow, error: adminErr } = await supabase
    .from("pharmacies")
    .select("id,name,verified,verification_status")
    .eq("admin_id", userId)
    .maybeSingle();

  if (adminErr) throw adminErr;
  if (adminRow?.id) return adminRow as PharmacyRow;

  const { data: staffRow, error: staffErr } = await supabase
    .from("pharmacy_staff")
    .select("pharmacy_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (staffErr) throw staffErr;
  if (!staffRow?.pharmacy_id) return null;

  const { data: pharmacyRow, error: pErr } = await supabase
    .from("pharmacies")
    .select("id,name,verified,verification_status")
    .eq("id", staffRow.pharmacy_id)
    .maybeSingle();

  if (pErr) throw pErr;
  return (pharmacyRow as PharmacyRow) ?? null;
}

export default function PharmacyDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation("pharmacyAdminDashboard");
  const { user, loading: authLoading, activeRole } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [pharmacy, setPharmacy] = useState<PharmacyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [stats, setStats] = useState<OverviewStats>({
    prescriptionsToday: 0,
    pendingFulfillment: 0,
    deliveriesInProgress: 0,
    completedToday: 0,
  });

  useEffect(() => {
    const run = async () => {
      if (!user) {
        setPharmacy(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const p = await fetchMyPharmacy(user.id);
        setPharmacy(p);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load pharmacy");
        setPharmacy(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user]);

  const pharmacyId = pharmacy?.id || "";

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { id: "overview", label: t("pharmacyDashboard.menu.overview", "Overview"), icon: <LayoutDashboard className="h-5 w-5" /> },
      { id: "prescriptions", label: t("pharmacyDashboard.menu.prescriptions", "Prescriptions"), icon: <ClipboardList className="h-5 w-5" /> },
      { id: "fulfillment", label: t("pharmacyDashboard.menu.fulfillment", "Fulfillment"), icon: <Pill className="h-5 w-5" /> },
      { id: "inventory", label: t("pharmacyDashboard.menu.inventory", "Inventory"), icon: <Package className="h-5 w-5" /> },
      { id: "deliveries", label: t("pharmacyDashboard.menu.deliveries", "Deliveries"), icon: <Truck className="h-5 w-5" /> },
      { id: "referrals", label: t("pharmacyDashboard.menu.referrals", "Referrals"), icon: <ShieldCheck className="h-5 w-5" /> },
      { id: "analytics", label: t("pharmacyDashboard.menu.analytics", "Analytics"), icon: <BarChart3 className="h-5 w-5" /> },
      { id: "claims", label: t("pharmacyDashboard.menu.billingClaims", "Billing / Claims"), icon: <CreditCard className="h-5 w-5" /> },
      { id: "finances", label: t("pharmacyDashboard.menu.finances", "Finances"), icon: <DollarSign className="h-5 w-5" /> },
      { id: "staff", label: t("pharmacyDashboard.menu.staff", "Staff"), icon: <Users className="h-5 w-5" /> },
      { id: "verify", label: t("pharmacyDashboard.menu.verifyDocuments", "Verify Documents"), icon: <ScanLine className="h-5 w-5" /> },
      {
        id: "settings",
        label: t("pharmacyDashboard.menu.settings", "Settings"),
        icon: <Settings className="h-5 w-5" />,
        onClick: () => navigate("/pharmacy/settings"),
      },
    ],
    [navigate, t],
  );

  const fetchOverview = async () => {
    if (!pharmacyId) return;
    setOverviewLoading(true);
    try {
      const today = new Date();
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59));

      const { count: rxToday, error: rxErr } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("receiver_type", "pharmacy")
        .eq("receiver_entity_id", pharmacyId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      if (rxErr) throw rxErr;

      const { count: pendingFulfillment, error: pfErr } = await (supabase as any)
        .from("pharmacy_orders")
        .select("id", { count: "exact", head: true })
        .eq("pharmacy_id", pharmacyId)
        .in("status", ["pending", "processing"]);
      if (pfErr) throw pfErr;

      const { count: deliveries, error: dErr } = await (supabase as any)
        .from("pharmacy_orders")
        .select("id", { count: "exact", head: true })
        .eq("pharmacy_id", pharmacyId)
        .in("status", ["out_for_delivery", "delivering"]);
      if (dErr) throw dErr;

      const { count: completedToday, error: cErr } = await (supabase as any)
        .from("pharmacy_orders")
        .select("id", { count: "exact", head: true })
        .eq("pharmacy_id", pharmacyId)
        .eq("status", "completed")
        .gte("updated_at", start.toISOString())
        .lte("updated_at", end.toISOString());
      if (cErr) throw cErr;

      setStats({
        prescriptionsToday: rxToday ?? 0,
        pendingFulfillment: pendingFulfillment ?? 0,
        deliveriesInProgress: deliveries ?? 0,
        completedToday: completedToday ?? 0,
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load pharmacy overview");
      setStats({ prescriptionsToday: 0, pendingFulfillment: 0, deliveriesInProgress: 0, completedToday: 0 });
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    if (pharmacyId) fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacyId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = (params.get("tab") || params.get("section") || "").trim();
    const hash = (location.hash || "").replace("#", "").trim();
    const desired = (raw || hash).toLowerCase();

    if (!desired) return;

    const allowed = [
      "overview",
      "prescriptions",
      "fulfillment",
      "inventory",
      "deliveries",
      "referrals",
      "analytics",
      "claims",
      "finances",
      "staff",
      "verify",
      "settings",
    ];
    if (!allowed.includes(desired)) return;

    if (activeTab !== desired) {
      setActiveTab(desired);
      if (desired === "overview") fetchOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash, location.search, pharmacyId]);

  const statCards: StatCardProps[] = useMemo(
    () => [
      { label: t("pharmacyDashboard.overview.prescriptionsToday", "Prescriptions Today"), value: stats.prescriptionsToday, icon: <Calendar className="h-6 w-6" /> },
      { label: t("pharmacyDashboard.overview.pendingFulfillment", "Pending Fulfillment"), value: stats.pendingFulfillment, icon: <Pill className="h-6 w-6" /> },
      { label: t("pharmacyDashboard.overview.deliveriesInProgress", "Deliveries In Progress"), value: stats.deliveriesInProgress, icon: <Activity className="h-6 w-6" /> },
      { label: t("pharmacyDashboard.overview.completedToday", "Completed Today"), value: stats.completedToday, icon: <CheckCircle className="h-6 w-6" /> },
    ],
    [stats, t],
  );

  const isLoading = authLoading || loading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">{t("pharmacyDashboard.header.loading", "Loading...")}</p>
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
            icon={<Pill className="h-12 w-12" />}
            title={t("pharmacyDashboard.header.signInRequired", "Sign in required")}
            description={t("pharmacyDashboard.header.signInDescription", "Please sign in to access the pharmacy dashboard.")}
            action={
              <button onClick={() => navigate("/auth")} className="text-primary underline">
                {t("pharmacyDashboard.header.signIn", "Sign In")}
              </button>
            }
          />
        </div>
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
          <EmptyState
            icon={<Pill className="h-12 w-12" />}
            title={t("pharmacyDashboard.header.noCenter", "No Pharmacy Found")}
            description={t("pharmacyDashboard.header.noCenterDescription", "You don't have a pharmacy associated with your account.")}
            action={
              <button onClick={() => navigate("/pharmacy/register")} className="text-primary underline">
                {t("pharmacyDashboard.header.registerPharmacy", "Register Pharmacy")}
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
      entityName={pharmacy.name}
      entityStatus={pharmacy.verified ? "verified" : "pending"}
      sidebarItems={sidebarItems}
      activeItem={activeTab}
      onItemChange={(id) => {
        setActiveTab(id);

        const params = new URLSearchParams(location.search);
        params.set("tab", String(id));
        navigate(
          {
            pathname: location.pathname,
            search: params.toString() ? `?${params.toString()}` : "",
          },
          { replace: true },
        );

        if (id === "overview") fetchOverview();
      }}
    >
      {activeTab === "overview" && (
        <>
          <PageHeader
            title="Pharmacy Dashboard"
            description="Prescriptions, fulfillment, analytics, and billing pulled from Supabase"
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

          <StatsGrid stats={statCards} className="mb-8" />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border bg-card text-card-foreground p-4">
              <h3 className="font-semibold mb-2">Prescription Inbox</h3>
              <p className="text-sm text-muted-foreground mb-4">New and pending prescriptions for your pharmacy.</p>
              <PharmacyPrescriptionInbox pharmacyId={pharmacyId} />
            </div>
            <div className="rounded-lg border bg-card text-card-foreground p-4">
              <h3 className="font-semibold mb-2">Fulfillment Queue</h3>
              <p className="text-sm text-muted-foreground mb-4">Process and dispatch orders efficiently.</p>
              <FulfillmentQueue pharmacyId={pharmacyId} />
            </div>
          </div>
        </>
      )}

      {activeTab === "prescriptions" && <PharmacyPrescriptionInbox pharmacyId={pharmacyId} />}
      {activeTab === "fulfillment" && <FulfillmentQueue pharmacyId={pharmacyId} />}
      {activeTab === "inventory" && <PharmacyInventoryManager pharmacyId={pharmacyId} />}
      {activeTab === "deliveries" && <PharmacyDeliveryOrders pharmacyId={pharmacyId} />}
      {activeTab === "referrals" && <PharmacyReferralsSection pharmacyId={pharmacyId} />}
      {activeTab === "analytics" && <PharmacyAnalytics pharmacyId={pharmacyId} />}
      {activeTab === "claims" && <PharmacyInsuranceClaims pharmacyId={pharmacyId} />}
      {activeTab === "finances" && <FinanceManagementSection entityType="pharmacy" entityId={pharmacyId} />}
      {activeTab === "staff" && <PharmacyStaffManager pharmacyId={pharmacyId} />}
      {activeTab === "verify" && <DocumentVerifySection />}
      {activeTab === "settings" && <PharmacySettings pharmacyId={pharmacyId} />}
    </DashboardShell>
  );
}
