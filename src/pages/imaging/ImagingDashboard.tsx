// File: src/pages/imaging/ImagingDashboard.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

import { useImagingCenter } from "@/hooks/useImagingCenter";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardShell, SidebarItem } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatsGrid, StatItem } from "@/components/dashboard/StatsGrid";
import { ContentCard } from "@/components/dashboard/ContentCard";
import { EmptyState } from "@/components/dashboard/EmptyState";

import ImagingEquipmentManager from "@/components/imaging/ImagingEquipmentManager";
import ImagingScanWorkflow from "@/components/imaging/ImagingScanWorkflow";
import ImagingReportManager from "@/components/imaging/ImagingReportManager";
import ImagingAnalytics from "@/components/imaging/ImagingAnalytics";
import { ImagingReferralsSection } from "@/components/imaging/ImagingReferralsSection";
import ImagingSettings from "@/components/imaging/ImagingSettings";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type EquipmentStatus = "active" | "maintenance" | "offline" | "retired";

type DashboardQueueItem = {
  id: string;
  orderNumber: string;
  preferredDate: string | null;
  patientName: string;
  examName: string;
  modality: string;
  status: string;
};

type DashboardEquipmentItem = {
  id: string;
  name: string;
  modality: string;
  status: EquipmentStatus;
  utilization: number;
};

type DashboardResponse = {
  stats: {
    scheduledToday: number;
    inProgress: number;
    pendingReports: number;
    completedToday: number;
  };
  queue: DashboardQueueItem[];
  equipment: DashboardEquipmentItem[];
};

export default function ImagingDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, activeRole } = useAuth();
  const { myImagingCenter, fetchMyImagingCenter, loading: centerLoading } = useImagingCenter();

  const [activeTab, setActiveTab] = useState<
    "overview" | "workflow" | "reports" | "equipment" | "analytics" | "staff" | "referrals" | "settings"
  >("overview");

  const [dashLoading, setDashLoading] = useState(false);
  const [dash, setDash] = useState<DashboardResponse>({
    stats: { scheduledToday: 0, inProgress: 0, pendingReports: 0, completedToday: 0 },
    queue: [],
    equipment: [],
  });

  useEffect(() => {
    fetchMyImagingCenter();
  }, [fetchMyImagingCenter]);

  const centerId = myImagingCenter?.id || "";

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-5 w-5" /> },
      { id: "workflow", label: "Scan Workflow", icon: <ClipboardList className="h-5 w-5" /> },
      { id: "reports", label: "Reports", icon: <FileImage className="h-5 w-5" /> },
      { id: "equipment", label: "Equipment", icon: <Wrench className="h-5 w-5" /> },
      { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-5 w-5" /> },
      { id: "staff", label: "Staff", icon: <Users className="h-5 w-5" /> },
      { id: "referrals", label: "Referrals", icon: <ArrowRightLeft className="h-5 w-5" /> },
      { id: "settings", label: "Settings", icon: <Settings className="h-5 w-5" /> },
    ],
    []
  );

  const refreshDashboard = async () => {
    if (!centerId) return;
    setDashLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("imaging-dashboard", {
        body: { centerId },
      });

      if (error) throw error;

      const parsed = data as DashboardResponse;
      setDash({
        stats: parsed?.stats || { scheduledToday: 0, inProgress: 0, pendingReports: 0, completedToday: 0 },
        queue: Array.isArray(parsed?.queue) ? parsed.queue : [],
        equipment: Array.isArray(parsed?.equipment) ? parsed.equipment : [],
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load dashboard data");
      setDash({
        stats: { scheduledToday: 0, inProgress: 0, pendingReports: 0, completedToday: 0 },
        queue: [],
        equipment: [],
      });
    } finally {
      setDashLoading(false);
    }
  };

  useEffect(() => {
    if (centerId) refreshDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  const stats: StatItem[] = useMemo(
    () => [
      { label: "Scheduled Today", value: dash.stats.scheduledToday, icon: <Calendar className="h-6 w-6" /> },
      { label: "In Progress", value: dash.stats.inProgress, icon: <ScanLine className="h-6 w-6" /> },
      { label: "Pending Reports", value: dash.stats.pendingReports, icon: <FileText className="h-6 w-6" /> },
      { label: "Completed Today", value: dash.stats.completedToday, icon: <CheckCircle className="h-6 w-6" /> },
    ],
    [dash.stats]
  );

  if (authLoading || centerLoading) {
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
            <CardDescription className="mb-4">Your account is not linked to an imaging center.</CardDescription>
            <Button onClick={() => navigate("/imaging-center")}>Go to Imaging Center</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLabel = myImagingCenter.is_verified ? "Verified" : "Pending Verification";

  return (
    <DashboardShell
      role={activeRole as any}
      entityName={myImagingCenter.name}
      entityStatus={myImagingCenter.is_verified ? "verified" : "pending"}
      sidebarItems={sidebarItems}
      activeItem={activeTab}
      onItemChange={(id) => setActiveTab(id as any)}
    >
      {activeTab === "overview" && (
        <>
          <PageHeader
            title="Dashboard Overview"
            description="Monitor your imaging center's performance"
            badges={[
              { label: statusLabel, variant: myImagingCenter.is_verified ? "default" : "secondary" },
              { label: dashLoading ? "Refreshing..." : "Live Data", variant: "outline" },
            ]}
            actions={
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={refreshDashboard} disabled={dashLoading}>
                  {dashLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Refresh
                </Button>
              </div>
            }
          />

          <StatsGrid stats={stats} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ContentCard title="Today's Queue" description="Scheduled referrals for today" icon={<ClipboardList className="h-5 w-5" />}>
              {dashLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : dash.queue.length === 0 ? (
                <EmptyState icon={<ClipboardList className="h-12 w-12" />} title="No scheduled referrals" description="No imaging referrals scheduled for today." />
              ) : (
                <div className="space-y-3">
                  {dash.queue.slice(0, 8).map((q) => (
                    <div key={q.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{q.patientName}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {q.examName} • {q.modality} • {q.orderNumber}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-3 shrink-0">
                        {q.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ContentCard>

            <ContentCard title="Equipment Status" description="Current equipment availability" icon={<Wrench className="h-5 w-5" />}>
              {dashLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : dash.equipment.length === 0 ? (
                <EmptyState
                  icon={<Wrench className="h-12 w-12" />}
                  title="No equipment configured"
                  description="Add equipment in the Equipment tab to track utilization."
                />
              ) : (
                <div className="space-y-3">
                  {dash.equipment.slice(0, 6).map((eq) => (
                    <div key={eq.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{eq.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{eq.modality}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-3 shrink-0">
                        <Badge
                          variant={eq.status === "active" ? "default" : "secondary"}
                          className={eq.status === "maintenance" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : ""}
                        >
                          {eq.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground w-16 text-right">{eq.utilization}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ContentCard>
          </div>
        </>
      )}

      {activeTab === "workflow" && (
        <>
          <PageHeader title="Scan Workflow" description="Manage imaging scan scheduling and execution" />
          <ImagingScanWorkflow centerId={centerId} />
        </>
      )}

      {activeTab === "reports" && (
        <>
          <PageHeader title="Reports" description="Generate and manage imaging reports" />
          <ImagingReportManager centerId={centerId} />
        </>
      )}

      {activeTab === "equipment" && (
        <>
          <PageHeader title="Equipment" description="Register and manage imaging equipment" />
          <ImagingEquipmentManager centerId={centerId} />
        </>
      )}

      {activeTab === "analytics" && (
        <>
          <PageHeader title="Analytics" description="Performance metrics and insights" />
          <ImagingAnalytics centerId={centerId} />
        </>
      )}

      {activeTab === "staff" && (
        <>
          <PageHeader title="Staff Management" description="Manage radiologists and technicians" />
          <ContentCard title="Staff Directory" icon={<Users className="h-5 w-5" />}>
            <EmptyState icon={<Users className="h-12 w-12" />} title="Staff Management" description="Staff management module coming soon" />
          </ContentCard>
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
          <PageHeader title="Settings" description="Configure your imaging center profile and preferences" />
          <ImagingSettings embedded />
        </>
      )}
    </DashboardShell>
  );
}
