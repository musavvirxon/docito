// File: src/pages/imaging/ImagingDashboard.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ScanLine,
  ClipboardList,
  Users,
  FileImage,
  Settings,
  CheckCircle,
  Loader2,
  Calendar,
  Wrench,
  BarChart3,
  FileText,
  ArrowRightLeft,
  LayoutDashboard,
  CreditCard,
  ListChecks,
} from "lucide-react";
import { useImagingCenter } from "@/hooks/useImagingCenter";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardShell, SidebarItem } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatsGrid, StatCardProps } from "@/components/dashboard/StatsGrid";
import { ContentCard } from "@/components/dashboard/ContentCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import ImagingEquipmentManager from "@/components/imaging/ImagingEquipmentManager";
import ImagingScanWorkflow from "@/components/imaging/ImagingScanWorkflow";
import ImagingReportManager from "@/components/imaging/ImagingReportManager";
import ImagingAnalytics from "@/components/imaging/ImagingAnalytics";
import { ImagingReferralsSection } from "@/components/imaging/ImagingReferralsSection";
import ImagingBillingSection from "@/components/imaging/ImagingBillingSection";
import ImagingOrdersManager from "@/components/imaging/ImagingOrdersManager";
import ImagingStaffManager from "@/components/imaging/ImagingStaffManager";
import ImagingSettingsSection from "@/components/imaging/ImagingSettingsSection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DashboardData = {
  stats: {
    scheduledToday: number;
    inProgress: number;
    pendingReports: number;
    completedToday: number;
  };
  queue: Array<{
    id: string;
    orderNumber: string;
    preferredDate: string | null;
    patientName: string;
    examName: string;
    modality: string;
    status: string;
  }>;
  equipment: Array<{
    id: string;
    name: string;
    modality: string;
    status: "active" | "maintenance" | "offline" | "retired";
    utilization: number;
  }>;
};

export default function ImagingDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, activeRole } = useAuth();
  const { myImagingCenter, fetchMyImagingCenter, loading: centerLoading } = useImagingCenter();

  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "workflow" | "reports" | "equipment" | "analytics" | "billing" | "staff" | "referrals" | "settings"
  >("overview");

  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overview, setOverview] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchMyImagingCenter();
  }, [fetchMyImagingCenter]);

  const sidebarItems: SidebarItem[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: "orders", label: "Orders", icon: <ListChecks className="h-5 w-5" /> },
    { id: "workflow", label: "Scan Workflow", icon: <ClipboardList className="h-5 w-5" /> },
    { id: "reports", label: "Reports", icon: <FileImage className="h-5 w-5" /> },
    { id: "equipment", label: "Equipment", icon: <Wrench className="h-5 w-5" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-5 w-5" /> },
    { id: "billing", label: "Billing", icon: <CreditCard className="h-5 w-5" /> },
    { id: "staff", label: "Staff", icon: <Users className="h-5 w-5" /> },
    { id: "referrals", label: "Referrals", icon: <ArrowRightLeft className="h-5 w-5" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-5 w-5" /> },
  ];

  const centerId = myImagingCenter?.id || "";

  const fetchOverview = async () => {
    if (!centerId) return;
    setOverviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("imaging-dashboard", {
        body: { centerId },
      });
      if (error) throw error;
      setOverview((data || null) as DashboardData | null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load dashboard overview");
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    if (centerId) fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  const stats: StatCardProps[] = useMemo(() => {
    const s = overview?.stats || { scheduledToday: 0, inProgress: 0, pendingReports: 0, completedToday: 0 };
    return [
      { label: "Scheduled Today", value: s.scheduledToday, icon: <Calendar className="h-6 w-6" /> },
      { label: "In Progress", value: s.inProgress, icon: <ScanLine className="h-6 w-6" /> },
      { label: "Pending Reports", value: s.pendingReports, icon: <FileText className="h-6 w-6" /> },
      { label: "Completed Today", value: s.completedToday, icon: <CheckCircle className="h-6 w-6" /> },
    ];
  }, [overview]);

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
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">Sign In Required</CardTitle>
            <CardDescription className="mb-4">Please sign in to access the imaging center dashboard.</CardDescription>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!myImagingCenter) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No Imaging Center Found</CardTitle>
            <CardDescription className="mb-4">You don't have an imaging center associated with your account.</CardDescription>
            <Button onClick={() => navigate("/imaging/register")}>Register Imaging Center</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardShell
      role={activeRole as any}
      entityName={myImagingCenter.name}
      entityStatus={myImagingCenter.is_verified ? "verified" : "pending"}
      sidebarItems={sidebarItems}
      activeItem={activeTab}
      onItemChange={(id) => {
        setActiveTab(id as any);
        if (id === "overview") fetchOverview();
      }}
    >
      {activeTab === "overview" && (
        <>
          <PageHeader
            title="Dashboard Overview"
            description="Monitor your imaging center's performance"
            badges={[
              {
                label: myImagingCenter.is_verified ? "Verified" : "Pending Verification",
                variant: myImagingCenter.is_verified ? "default" : "secondary",
              },
            ]}
            actions={
              <Button variant="outline" onClick={fetchOverview} disabled={overviewLoading}>
                {overviewLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Refresh
              </Button>
            }
          />

          <StatsGrid stats={stats} className="mb-8" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ContentCard title="Today's Queue" description="Upcoming scans for today" icon={<Calendar className="h-5 w-5" />}>
              {overviewLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (overview?.queue?.length || 0) === 0 ? (
                <EmptyState icon={<Calendar className="h-12 w-12" />} title="No scans scheduled today" description="New referrals scheduled for today will appear here." />
              ) : (
                <div className="space-y-3">
                  {overview!.queue.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.patientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.examName} • {item.modality} • {item.preferredDate || "—"} • {item.orderNumber}
                        </p>
                      </div>
                      <Badge variant={item.status === "in_progress" ? "default" : "outline"}>{String(item.status).replaceAll("_", " ")}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ContentCard>

            <ContentCard title="Equipment Status" description="Current equipment availability" icon={<Wrench className="h-5 w-5" />}>
              {overviewLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (overview?.equipment?.length || 0) === 0 ? (
                <EmptyState
                  icon={<Wrench className="h-12 w-12" />}
                  title="No equipment registered"
                  description="Add your modalities and devices in the Equipment section to see live status here."
                />
              ) : (
                <div className="space-y-3">
                  {overview!.equipment.map((eq) => (
                    <div key={eq.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{eq.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {eq.modality} • {eq.utilization}% utilized
                        </p>
                      </div>
                      <Badge variant={eq.status === "active" ? "default" : "secondary"}>{eq.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ContentCard>
          </div>
        </>
      )}

      {activeTab === "orders" && (
        <>
          <PageHeader title="Orders" description="Control incoming imaging orders: assign staff, update workflow, manage statuses" />
          <ImagingOrdersManager centerId={centerId} />
        </>
      )}

      {activeTab === "workflow" && (
        <>
          <PageHeader title="Scan Workflow" description="Manage imaging procedures and patient flow" />
          <ImagingScanWorkflow centerId={centerId} />
        </>
      )}

      {activeTab === "reports" && (
        <>
          <PageHeader title="Reports" description="View and manage imaging reports" />
          <ImagingReportManager centerId={centerId} />
        </>
      )}

      {activeTab === "equipment" && (
        <>
          <PageHeader title="Equipment Management" description="Monitor and manage imaging equipment" />
          <ImagingEquipmentManager centerId={centerId} />
        </>
      )}

      {activeTab === "analytics" && (
        <>
          <PageHeader title="Analytics" description="Full operational analytics for your imaging center" />
          <ImagingAnalytics centerId={centerId} />
        </>
      )}

      {activeTab === "billing" && (
        <>
          <PageHeader title="Billing" description="Revenue and transaction history for this imaging center" />
          <ImagingBillingSection centerId={centerId} />
        </>
      )}

      {activeTab === "staff" && (
        <>
          <PageHeader title="Staff Management" description="Invite and manage radiologists and technicians" />
          <ImagingStaffManager centerId={centerId} />
        </>
      )}

      {activeTab === "referrals" && (
        <>
          <PageHeader title="Referrals" description="Manage incoming referrals for imaging procedures" />
          <ImagingReferralsSection centerId={centerId} />
        </>
      )}

      {activeTab === "settings" && (
        <>
          <PageHeader title="Settings" description="Center profile, notifications, report defaults, and billing preferences" />
          <ImagingSettingsSection centerId={centerId} />
        </>
      )}
    </DashboardShell>
  );
}
