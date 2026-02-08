// File: src/components/imaging/ImagingDashboard.tsx
// Path: src/components/imaging/ImagingDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  DollarSign,
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
import FinanceHub from "@/components/financial/FinanceHub";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Header";

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
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, activeRole } = useAuth();
  const { myImagingCenter, fetchMyImagingCenter, loading: centerLoading } = useImagingCenter();

  const [activeTab, setActiveTab] = useState("overview");
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overview, setOverview] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchMyImagingCenter();
  }, [fetchMyImagingCenter]);

  const sidebarItems: SidebarItem[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: "workflow", label: "Scan Workflow", icon: <ClipboardList className="h-5 w-5" /> },
    { id: "reports", label: "Reports", icon: <FileImage className="h-5 w-5" /> },
    { id: "equipment", label: "Equipment", icon: <Wrench className="h-5 w-5" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-5 w-5" /> },
    { id: "billing", label: "Billing", icon: <CreditCard className="h-5 w-5" /> },
    { id: "finance", label: "Finance", icon: <DollarSign className="h-5 w-5" /> },
    { id: "staff", label: "Staff", icon: <Users className="h-5 w-5" /> },
    { id: "referrals", label: "Referrals", icon: <ArrowRightLeft className="h-5 w-5" /> },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-5 w-5" />,
      onClick: () => navigate("/imaging/settings"),
    },
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
      setOverview(data as DashboardData);
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = (params.get("tab") || params.get("section") || "").trim();
    const hash = (location.hash || "").replace("#", "").trim();
    const desired = (raw || hash).toLowerCase();

    if (!desired) return;

    const allowed = ["overview", "workflow", "reports", "equipment", "analytics", "billing", "finance", "staff", "referrals"];
    if (!allowed.includes(desired)) return;

    if (activeTab !== desired) {
      setActiveTab(desired);
      if (desired === "overview") fetchOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash, location.search, centerId]);

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
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">Sign In Required</CardTitle>
              <CardDescription className="mb-4">Please sign in to access the imaging center dashboard.</CardDescription>
              <Button onClick={() => navigate("/auth")}>Sign In</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!myImagingCenter) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No Imaging Center Found</CardTitle>
              <CardDescription className="mb-4">You don't have an imaging center associated with your account.</CardDescription>
              <Button onClick={() => navigate("/imaging/register")}>Register Imaging Center</Button>
            </CardContent>
          </Card>
        </div>
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
                <EmptyState
                  icon={<Calendar className="h-12 w-12" />}
                  title="No scans scheduled today"
                  description="New referrals scheduled for today will appear here."
                />
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
                      <Badge variant={item.status === "in_progress" ? "default" : "outline"}>
                        {item.status.split("_").join(" ")}
                      </Badge>
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
                        <p className="text-sm text-muted-foreground">{eq.modality}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            eq.status === "active"
                              ? "default"
                              : eq.status === "maintenance"
                              ? "secondary"
                              : eq.status === "offline"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {eq.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{eq.utilization}% util</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ContentCard>
          </div>
        </>
      )}

      {activeTab === "workflow" && <ImagingScanWorkflow centerId={centerId} />}
      {activeTab === "reports" && <ImagingReportManager centerId={centerId} />}
      {activeTab === "equipment" && <ImagingEquipmentManager centerId={centerId} />}
      {activeTab === "analytics" && <ImagingAnalytics centerId={centerId} />}
      {activeTab === "billing" && <ImagingBillingSection centerId={centerId} />}
      {activeTab === "finance" && <FinanceHub entityType="imaging" entityId={centerId} />}
      {activeTab === "staff" && <div className="p-4 text-sm text-muted-foreground">Staff management is available in Settings.</div>}
      {activeTab === "referrals" && <ImagingReferralsSection centerId={centerId} />}
    </DashboardShell>
  );
}
