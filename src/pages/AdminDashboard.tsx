// File: src/pages/AdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import ThemeToggle from "@/components/home/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import ProfileMenu from "@/components/dashboard/ProfileMenu";

import { InviteProviderModal } from "@/components/dashboard/InviteProviderModal";
import { AddServiceModal } from "@/components/dashboard/AddServiceModal";
import { InviteStaffModal } from "@/components/dashboard/InviteStaffModal";
import PendingInvitationsSection from "@/components/dashboard/PendingInvitationsSection";
import { AddLocationModal } from "@/components/dashboard/AddLocationModal";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { ComprehensiveRegistrationModal } from "@/components/dashboard/ComprehensiveRegistrationModal";
import { CreateClinicModal } from "@/components/dashboard/CreateClinicModal";
import { ViewRequirementsModal } from "@/components/dashboard/ViewRequirementsModal";
import VerificationSuccessModal from "@/components/dashboard/VerificationSuccessModal";

import { supabase } from "@/integrations/supabase/client";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { useAdvancedFinancialMetrics } from "@/hooks/useAdvancedFinancialMetrics";
import AdvancedFinancialMetrics from "@/components/financial/AdvancedFinancialMetrics";
import FinanceManagementSection from "@/components/financial/FinanceManagementSection";
import ClinicStaffManager from "@/components/clinic/ClinicStaffManager";
import BranchSelector from "@/components/shared/BranchSelector";
import { useVerificationStatus } from "@/hooks/useVerificationStatus";
import { usePracticeInsights, type DailyTrendPoint } from "@/hooks/usePracticeInsights";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  AlertCircle,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle,
  CreditCard,
  DollarSign,
  Eye,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Star,
  Settings,
  Stethoscope,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type AdminSection =
  | "overview"
  | "providers"
  | "services"
  | "staff"
  | "locations"
  | "patients"
  | "billing"
  | "finances"
  | "analytics"
  | "settings";

function LockedOverlay({ onRequestVerify, message }: { onRequestVerify: () => void; message: string }) {
  return (
    <div
      className="absolute inset-0 z-20 rounded-xl bg-background/70 backdrop-blur-sm border border-border flex items-center justify-center p-6"
      onClick={() => toast.warning(message)}
      role="button"
      aria-label="Locked until verification"
    >
      <div className="max-w-md w-full">
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Verification required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your clinic/practice/hospital dashboard is visible, but actions are disabled until your organization is verified.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestVerify();
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Start verification
              </Button>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.info("You can browse sections, but actions remain locked until verification.");
                }}
              >
                Okay
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SectionWrapper({ children, locked, onRequestVerify, message = "This feature is locked until your organization is verified." }: { children: React.ReactNode; locked: boolean; onRequestVerify?: () => void; message?: string }) {
  return (
    <div className="relative">
      {children}
      {locked && onRequestVerify && (
        <LockedOverlay onRequestVerify={onRequestVerify} message={message} />
      )}
    </div>
  );
}

const AdminDashboard = () => {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();

  const {
    practice,
    stats,
    doctors,
    appointments,
    services,
    staff,
    locations,
    patients,
    payments,
    messages,
    metrics,
    loading,
    error,
    refreshData,
  } = useAdminDashboard();

  const verificationStatus = practice?.verification_status || "pending";
  const isVerified = verificationStatus === "verified" || verificationStatus === "approved";

  const { metrics: advancedMetrics, refreshData: refreshAdvancedMetrics } = useAdvancedFinancialMetrics(
    stats.totalRevenue,
    "practice",
    practice?.id
  );

  const { shouldShowModal, markModalAsShown } = useVerificationStatus(practice?.id);

  const [activeSection, setActiveSection] = useState<AdminSection>("overview");

  // Modal states
  const [inviteProviderOpen, setInviteProviderOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [inviteStaffOpen, setInviteStaffOpen] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createClinicOpen, setCreateClinicOpen] = useState(false);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  const [billingRange, setBillingRange] = useState<"7d" | "30d" | "90d">("30d");
  const [analyticsRange, setAnalyticsRange] = useState<"7d" | "30d" | "90d">("30d");
  const [branchFilter, setBranchFilter] = useState<string | null>(null);

  const billing = usePracticeInsights({
    action: "billing",
    practiceId: practice?.id || "",
    timeRange: billingRange,
    limit: 10,
  });

  const analytics = usePracticeInsights({
    action: "analytics",
    practiceId: practice?.id || "",
    timeRange: analyticsRange,
  });

  useEffect(() => {
    if (shouldShowModal()) setVerificationModalOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practice?.id, verificationStatus]);

  const handleVerificationModalClose = () => {
    markModalAsShown();
    setVerificationModalOpen(false);
  };

  const handleVerificationSuccess = async () => {
    await refreshData();
    navigate("/dashboard/verify");
  };

  const dashboardMetrics = useMemo(
    () => [
      { label: t("admin.metrics.totalBookings"), value: stats.totalBookings.toString(), icon: Calendar },
      { label: t("admin.metrics.totalPatients"), value: stats.totalPatients.toString(), icon: Users },
      {
        label: t("admin.metrics.revenueThisMonth"),
        value: `$${stats.totalRevenue.toLocaleString()}`,
        icon: DollarSign,
      },
      { label: t("admin.metrics.clinicRating"), value: stats.clinicRating.toFixed(1), icon: Star },
      { label: t("admin.metrics.pendingInvites"), value: stats.pendingInvites.toString(), icon: UserPlus },
      { label: t("admin.metrics.locations"), value: stats.locations.toString(), icon: MapPin },
    ],
    [stats, t]
  );

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case "verified":
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "under_review":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getVerificationMessage = (status: string) => {
    switch (status) {
      case "verified":
        return t("admin.verification.verified");
      case "rejected":
        return t("admin.verification.rejected");
      case "under_review":
        return t("admin.verification.underReview");
      default:
        return t("admin.verification.pending");
    }
  };

  const lockMessage = "This feature is locked until your organization is verified.";

  const guard = (fn: () => void) => {
    if (!isVerified) {
      toast.warning(lockMessage);
      setRequirementsOpen(true);
      return;
    }
    fn();
  };

  const menuItems: Array<{ id: AdminSection; label: string; icon: any }> = [
    { id: "overview", label: t("admin.tabs.overview"), icon: BarChart3 },
    { id: "providers", label: t("admin.tabs.providers"), icon: Stethoscope },
    { id: "services", label: t("admin.tabs.services"), icon: Building2 },
    { id: "staff", label: t("admin.tabs.staff"), icon: Users },
    { id: "locations", label: t("admin.tabs.locations"), icon: MapPin },
    { id: "patients", label: t("admin.tabs.patients"), icon: Users },
    { id: "billing", label: t("admin.tabs.billing"), icon: CreditCard },
    { id: "finances", label: t("admin.tabs.finances", { defaultValue: "Finances" }), icon: DollarSign },
    { id: "analytics", label: t("admin.tabs.analytics"), icon: TrendingUp },
    { id: "settings", label: t("admin.tabs.settings", { defaultValue: "Settings" }), icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <img src="/logos/horizontal/docito-horizontal-sm.png" alt="Docito" className="h-7" width={93} height={28} />
            </a>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <ProfileMenu />
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-muted-foreground">{t("admin.loading")}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!practice?.id && !error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <img src="/logos/horizontal/docito-horizontal-sm.png" alt="Docito" className="h-7" width={93} height={28} />
            </a>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <ProfileMenu />
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-lg w-full rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Welcome! Set up your practice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You don't have a clinic or practice linked to your account yet.
                Create one to start managing doctors, staff, appointments, and finances.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setCreateClinicOpen(true)} className="flex-1">
                  <Building2 className="h-4 w-4 mr-2" />
                  Create Practice
                </Button>
                <Button variant="outline" onClick={() => navigate("/register-practice")} className="flex-1">
                  Register Practice
                </Button>
              </div>
            </CardContent>
          </Card>
          <CreateClinicModal open={createClinicOpen} onOpenChange={setCreateClinicOpen} onSuccess={() => refreshData()} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <img src="/logos/horizontal/docito-horizontal-sm.png" alt="Docito" className="h-7" width={93} height={28} />
            </a>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <ProfileMenu />
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                {t("admin.error.failed", { defaultValue: "Error" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={refreshData} className="w-full">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const allowModals = isVerified;

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{t("admin.overview.recentAppointments")}</span>
                    <Button variant="outline" size="sm" onClick={() => guard(() => toast.info("View all (coming soon)"))}>
                      {t("admin.overview.viewAll")}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{t("admin.overview.noAppointments")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {appointments.slice(0, 5).map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{appointment.patient_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(appointment.appointment_date), "MMM dd, yyyy")} • {appointment.doctor_name}
                            </p>
                          </div>
                          <Badge variant="outline">{appointment.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>{t("admin.overview.practiceStatus")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("admin.overview.verificationStatus")}</span>
                    <Badge className={getVerificationStatusColor(verificationStatus)}>{verificationStatus}</Badge>
                  </div>

                  <div className="text-sm text-muted-foreground">{getVerificationMessage(verificationStatus)}</div>

                  {!isVerified && (
                    <Button onClick={() => setCreateClinicOpen(true)} className="w-full">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t("admin.overview.startVerification")}
                    </Button>
                  )}

                  <div className="pt-2 border-t border-border">
                    <div className="text-sm font-medium mb-2">{t("admin.overview.quickActions")}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => guard(() => setInviteProviderOpen(true))}
                        disabled={!allowModals}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        {t("admin.actions.inviteDoctor")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => guard(() => setAddServiceOpen(true))} disabled={!allowModals}>
                        <Building2 className="h-4 w-4 mr-1" />
                        {t("admin.actions.addService")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => guard(() => setInviteStaffOpen(true))}
                        disabled={!allowModals}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        {t("admin.actions.inviteStaff")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => guard(() => setAddLocationOpen(true))}
                        disabled={!allowModals}
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        {t("admin.actions.addLocation")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t("admin.overview.doctors")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {doctors.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Stethoscope className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t("admin.overview.noDoctors")}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {doctors.slice(0, 5).map((doctor) => (
                        <div key={doctor.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{doctor.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{doctor.specialty}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {doctor.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {t("admin.overview.services")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {services.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Building2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t("admin.overview.noServices")}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {services.slice(0, 5).map((service) => (
                        <div key={service.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{service.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{service.category}</p>
                          </div>
                          <span className="text-sm font-medium">${service.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    {t("admin.overview.messages")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {messages.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t("admin.overview.noMessages")}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.slice(0, 5).map((msg) => (
                        <div key={msg.id} className="p-2 rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium truncate">{msg.from_name}</p>
                            <span className="text-xs text-muted-foreground">{format(new Date(msg.created_at), "MMM dd")}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {t("admin.overview.performance")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {dashboardMetrics.map((metric, idx) => {
                      const Icon = metric.icon;
                      return (
                        <div key={idx} className="p-4 rounded-xl bg-muted/30 border border-border">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Icon className="h-4 w-4" />
                            <span className="text-xs">{metric.label}</span>
                          </div>
                          <div className="text-lg font-semibold">{metric.value}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{t("admin.overview.pendingInvitations")}</span>
                    <Button variant="outline" size="sm" onClick={() => setActiveSection("staff")}>
                      {t("admin.overview.manage")}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PendingInvitationsSection practiceId={practice?.id} />
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{t("admin.overview.advancedFinancialMetrics")}</span>
                    <Button variant="outline" size="sm" onClick={() => guard(() => refreshAdvancedMetrics())}>
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AdvancedFinancialMetrics metrics={advancedMetrics} revenue={0} onUpdateInputs={() => {}} />
                </CardContent>
              </Card>
            </div>
          </SectionWrapper>
        );

      case "providers":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.providers.title")}</h2>
              <Button onClick={() => guard(() => setInviteProviderOpen(true))} disabled={!allowModals}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("admin.providers.invite")}
              </Button>
            </div>

            <Card className="rounded-xl mt-6">
              <CardHeader>
                <CardTitle>{t("admin.providers.listTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                {doctors.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">{t("admin.providers.emptyTitle")}</p>
                    <p className="text-sm mt-1">{t("admin.providers.emptyDescription")}</p>
                    <Button className="mt-4" onClick={() => guard(() => setInviteProviderOpen(true))} disabled={!allowModals}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t("admin.providers.invite")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {doctors.map((doctor) => (
                      <div
                        key={doctor.id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{doctor.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {doctor.specialty} • {doctor.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{doctor.status}</Badge>
                          <Button variant="outline" size="icon" onClick={() => toast.info("View profile (coming soon)")}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => guard(() => toast.info("Remove provider (coming soon)"))}
                            disabled={!allowModals}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </SectionWrapper>
        );

      case "services":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.services.title")}</h2>
              <Button onClick={() => guard(() => setAddServiceOpen(true))} disabled={!allowModals}>
                <Building2 className="h-4 w-4 mr-2" />
                {t("admin.services.add")}
              </Button>
            </div>

            <Card className="rounded-xl mt-6">
              <CardHeader>
                <CardTitle>{t("admin.services.listTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">{t("admin.services.emptyTitle")}</p>
                    <p className="text-sm mt-1">{t("admin.services.emptyDescription")}</p>
                    <Button className="mt-4" onClick={() => guard(() => setAddServiceOpen(true))} disabled={!allowModals}>
                      <Building2 className="h-4 w-4 mr-2" />
                      {t("admin.services.add")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{service.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{service.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">${service.price}</span>
                          <Button variant="outline" size="icon" onClick={() => guard(() => toast.info("Edit service (coming soon)"))}>
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => guard(() => toast.info("Delete service (coming soon)"))}
                            disabled={!allowModals}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </SectionWrapper>
        );

      case "staff":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            {practice?.id ? (
              <ClinicStaffManager practiceId={practice.id} />
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No practice linked</p>
              </div>
            )}
          </SectionWrapper>
        );

      case "locations":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.locations.title")}</h2>
              <Button onClick={() => guard(() => setAddLocationOpen(true))} disabled={!allowModals}>
                <MapPin className="h-4 w-4 mr-2" />
                {t("admin.locations.add")}
              </Button>
            </div>

            <Card className="rounded-xl mt-6">
              <CardHeader>
                <CardTitle>{t("admin.locations.listTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                {locations.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">{t("admin.locations.emptyTitle")}</p>
                    <p className="text-sm mt-1">{t("admin.locations.emptyDescription")}</p>
                    <Button className="mt-4" onClick={() => guard(() => setAddLocationOpen(true))} disabled={!allowModals}>
                      <MapPin className="h-4 w-4 mr-2" />
                      {t("admin.locations.add")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {locations.map((location) => (
                      <div
                        key={location.id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{location.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{location.address}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{location.status}</Badge>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => guard(() => {
                              setEditingLocation(location);
                              setAddLocationOpen(true);
                            })}
                            disabled={!allowModals}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => guard(async () => {
                              if (!confirm("Are you sure you want to delete this location?")) return;
                              try {
                                const { error } = await supabase
                                  .from("practice_locations")
                                  .delete()
                                  .eq("id", location.id);
                                if (error) throw error;
                                toast.success("Location deleted");
                                refreshData();
                              } catch (err: any) {
                                toast.error(err?.message || "Failed to delete location");
                              }
                            })}
                            disabled={!allowModals}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </SectionWrapper>
        );

      case "patients":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.patients.title")}</h2>
              <Button variant="outline" onClick={() => guard(() => toast.info("Export patients (coming soon)"))}>
                {t("admin.patients.export")}
              </Button>
            </div>

            {patients.length === 0 ? (
              <Card className="rounded-xl mt-6">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">{t("admin.patients.emptyTitle")}</p>
                  <p className="text-sm mt-1">{t("admin.patients.emptyDescription")}</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-xl mt-6">
                <CardHeader>
                  <CardTitle>{t("admin.patients.listTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {patients.map((patient) => (
                    <div
                      key={patient.id}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-4 rounded-xl bg-muted/30 border border-border"
                    >
                      <div className="font-medium truncate">{patient.name}</div>
                      <div className="text-muted-foreground">{format(new Date(patient.last_visit), "MMM dd, yyyy")}</div>
                      <div className="text-muted-foreground">{patient.doctor_name}</div>
                      <div>
                        <Badge variant="outline">{patient.status}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </SectionWrapper>
        );

      case "billing":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">Billing & Payments</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {practice?.id && (
                  <BranchSelector practiceId={practice.id} value={branchFilter} onChange={setBranchFilter} />
                )}
                <Button variant={billingRange === "7d" ? "default" : "outline"} onClick={() => guard(() => setBillingRange("7d"))}>
                  7D
                </Button>
                <Button variant={billingRange === "30d" ? "default" : "outline"} onClick={() => guard(() => setBillingRange("30d"))}>
                  30D
                </Button>
                <Button variant={billingRange === "90d" ? "default" : "outline"} onClick={() => guard(() => setBillingRange("90d"))}>
                  90D
                </Button>
                <Button variant="outline" onClick={() => guard(() => billing.refetch())}>
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {billing.loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading…</span>
                    </div>
                  ) : billing.error ? (
                    <p className="text-sm text-destructive">{billing.error}</p>
                  ) : billing.data ? (
                    (() => {
                      const b: any = billing.data;
                      const fmt = (cents: number) =>
                        `$${(Number(cents || 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

                      return (
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span>Total Revenue ({b.period?.days ?? 0} days)</span>
                            <span className="font-semibold">{fmt(b.summary?.totalRevenueCents ?? 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pending</span>
                            <span className="font-semibold text-yellow-600">{fmt(b.summary?.pendingCents ?? 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Refunds</span>
                            <span className="font-semibold text-red-600">{fmt(b.summary?.refundCents ?? 0)}</span>
                          </div>
                          <div className="pt-2 text-sm text-muted-foreground">
                            {b.summary?.completedCount ?? 0} completed • {b.summary?.pendingCount ?? 0} pending •{" "}
                            {b.summary?.transactionCount ?? 0} total
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-sm text-muted-foreground">No billing data.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {billing.loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading…</span>
                    </div>
                  ) : billing.error ? (
                    <p className="text-sm text-destructive">{billing.error}</p>
                  ) : !billing.data || !(billing.data as any).transactions?.length ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No transactions in this period</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(billing.data as any).transactions.map((tx: any) => {
                        const patientName =
                          tx?.metadata?.patient_name || tx?.metadata?.customer_name || tx?.metadata?.payer_name || "—";

                        const fmt = `$${(Number(tx.amount_cents || 0) / 100).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}`;

                        const statusLower = String(tx.status || "").toLowerCase();
                        const isPaid = statusLower === "completed" || statusLower === "paid";
                        const isPending = statusLower === "pending";
                        const badgeVariant = isPaid ? "default" : isPending ? "outline" : "secondary";

                        return (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border"
                          >
                            <div className="min-w-0">
                              <p className="font-medium truncate">{patientName}</p>
                              <p className="text-sm text-muted-foreground">{format(new Date(tx.created_at), "MMM dd, yyyy")}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{fmt}</p>
                              <Badge variant={badgeVariant}>{tx.status}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </SectionWrapper>
        );

      case "finances":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <FinanceManagementSection entityType="practice" entityId={practice?.id || ""} />
          </SectionWrapper>
        );

      case "analytics":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold">Practice Analytics</h2>
              <div className="flex gap-2 flex-wrap">
                <Button variant={analyticsRange === "7d" ? "default" : "outline"} onClick={() => guard(() => setAnalyticsRange("7d"))}>
                  7D
                </Button>
                <Button
                  variant={analyticsRange === "30d" ? "default" : "outline"}
                  onClick={() => guard(() => setAnalyticsRange("30d"))}
                >
                  30D
                </Button>
                <Button
                  variant={analyticsRange === "90d" ? "default" : "outline"}
                  onClick={() => guard(() => setAnalyticsRange("90d"))}
                >
                  90D
                </Button>
                <Button variant="outline" onClick={() => guard(() => analytics.refetch())}>
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Daily Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading…</span>
                    </div>
                  ) : analytics.error ? (
                    <p className="text-sm text-destructive">{analytics.error}</p>
                  ) : !(analytics.data as any)?.trend?.length ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No analytics data.</p>
                    </div>
                  ) : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={(analytics.data as any).trend as DailyTrendPoint[]}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="currentColor" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Area type="monotone" dataKey="value" stroke="currentColor" fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading…</span>
                    </div>
                  ) : analytics.error ? (
                    <p className="text-sm text-destructive">{analytics.error}</p>
                  ) : analytics.data ? (
                    (() => {
                      const a: any = analytics.data;
                      return (
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>Appointments</span>
                            <span className="font-semibold">{a.summary?.appointments ?? 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Unique Patients</span>
                            <span className="font-semibold">{a.summary?.patients ?? 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Providers</span>
                            <span className="font-semibold">{a.summary?.providers ?? 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Locations</span>
                            <span className="font-semibold">{a.summary?.locations ?? 0}</span>
                          </div>
                          <div className="pt-2 text-xs text-muted-foreground">
                            Range: {a.period?.from ?? "—"} → {a.period?.to ?? "—"}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-sm text-muted-foreground">No analytics data.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </SectionWrapper>
        );

      case "settings":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.settings.title", { defaultValue: "Settings" })}</h2>
              <Button variant="outline" onClick={() => guard(() => setSettingsOpen(true))} disabled={!allowModals}>
                <Settings className="h-4 w-4 mr-2" />
                {t("admin.settings.open", { defaultValue: "Open settings" })}
              </Button>
            </div>

            <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
          </SectionWrapper>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <a href="/" className="flex items-center gap-2 font-bold text-lg">
                <img src="/logos/horizontal/docito-horizontal-sm.png" alt="Docito" className="h-7" width={93} height={28} />
              </a>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <ProfileMenu />
            </div>
          </div>
        </header>

        <div className="flex-1 flex min-h-0 [&_[data-sidebar=sidebar]]:!h-[calc(100vh-4rem)] [&_[data-sidebar=sidebar]]:!top-16 [&>div>[data-sidebar=sidebar]~div]:!h-[calc(100vh-4rem)]">
          <Sidebar>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel className="flex items-center justify-between">
                  <span>{t("admin.sidebar.title")}</span>
                  {practice?.name ? (
                    <Badge variant="outline" className="text-xs">
                      {practice.name}
                    </Badge>
                  ) : null}
                </SidebarGroupLabel>

                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={activeSection === item.id}
                          onClick={() => setActiveSection(item.id)}
                          tooltip={item.label}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {(() => {
                const STORAGE_KEY = `verification_seen_${practice?.id}`;
                const seenAt = localStorage.getItem(STORAGE_KEY);
                const now = Date.now();
                const ONE_DAY = 24 * 60 * 60 * 1000;

                // If verified and seen more than 1 day ago, hide the bar
                if (isVerified && seenAt && now - Number(seenAt) > ONE_DAY) {
                  return null;
                }

                // If verified and not yet marked as seen, mark it now
                if (isVerified && !seenAt && practice?.id) {
                  localStorage.setItem(STORAGE_KEY, String(now));
                }

                return (
                  <SidebarGroup>
                    <SidebarGroupLabel className="flex items-center justify-between">
                      <span>{t("admin.sidebar.status")}</span>
                      <Badge className={getVerificationStatusColor(verificationStatus)}>{verificationStatus}</Badge>
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <div className="p-3 space-y-3">
                        <div className="text-xs text-muted-foreground">{getVerificationMessage(verificationStatus)}</div>
                        {!isVerified ? (
                          <Button onClick={() => setCreateClinicOpen(true)} className="w-full">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t("admin.sidebar.verify")}
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={() => toast.success("You're verified!")} className="w-full">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Verified
                          </Button>
                        )}
                      </div>
                    </SidebarGroupContent>
                  </SidebarGroup>
                );
              })()}
            </SidebarContent>
          </Sidebar>

          <main className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-6">{renderSection()}</div>
          </main>
        </div>

        <InviteProviderModal open={inviteProviderOpen} onOpenChange={setInviteProviderOpen} />

        <AddServiceModal open={addServiceOpen} onOpenChange={setAddServiceOpen} />

        <InviteStaffModal open={inviteStaffOpen} onOpenChange={setInviteStaffOpen} practiceId={practice?.id} />

        <AddLocationModal
          open={addLocationOpen}
          onOpenChange={(open) => {
            setAddLocationOpen(open);
            if (!open) setEditingLocation(null);
          }}
          editingLocation={editingLocation}
          onSaved={() => refreshData()}
        />

        <ComprehensiveRegistrationModal open={settingsOpen} onOpenChange={setSettingsOpen} practiceId={practice?.id} onSuccess={() => {}} />

        <CreateClinicModal open={createClinicOpen} onOpenChange={setCreateClinicOpen} onSuccess={() => {}} />

        <ViewRequirementsModal open={requirementsOpen} onOpenChange={setRequirementsOpen} />

        <VerificationSuccessModal open={verificationModalOpen} onOpenChange={setVerificationModalOpen} practiceName={practice?.name || ""} />
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
