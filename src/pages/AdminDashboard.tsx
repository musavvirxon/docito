// PATH: src/pages/AdminDashboard.tsx
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

import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { useAdvancedFinancialMetrics } from "@/hooks/useAdvancedFinancialMetrics";
import AdvancedFinancialMetrics from "@/components/financial/AdvancedFinancialMetrics";
import FinanceHub from "@/components/financial/FinanceHub";
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
  | "analytics"
  | "finance"
  | "settings";

function LockedOverlay({
  onRequestVerify,
  message,
}: {
  onRequestVerify: () => void;
  message: string;
}) {
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
              Your clinic/practice/hospital dashboard is visible, but actions are disabled until your
              organization is verified.
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
  const isVerified = verificationStatus === "verified";

  const { metrics: advancedMetrics, refreshData: refreshAdvancedMetrics } =
    useAdvancedFinancialMetrics(stats.totalRevenue, "practice", practice?.id);

  const { shouldShowModal, markModalAsShown } = useVerificationStatus(practice?.id);

  const [activeSection, setActiveSection] = useState<AdminSection>("overview");

  // Modal states
  const [inviteProviderOpen, setInviteProviderOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [inviteStaffOpen, setInviteStaffOpen] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createClinicOpen, setCreateClinicOpen] = useState(false);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  const [billingRange, setBillingRange] = useState<"7d" | "30d" | "90d">("30d");
  const [analyticsRange, setAnalyticsRange] = useState<"7d" | "30d" | "90d">("30d");

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
        return "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
      case "rejected":
        return "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
      case "under_review":
        return "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400";
      default:
        return "border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
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
    { id: "finance", label: t("admin.tabs.finance", { defaultValue: "Finance" }), icon: DollarSign },
    { id: "analytics", label: t("admin.tabs.analytics"), icon: TrendingUp },
    { id: "settings", label: t("admin.tabs.settings", { defaultValue: "Settings" }), icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <img
                src="/logos/horizontal/docito-horizontal-sm.png"
                alt="Docito"
                className="h-7"
                width={93}
                height={28}
              />
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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <img
                src="/logos/horizontal/docito-horizontal-sm.png"
                alt="Docito"
                className="h-7"
                width={93}
                height={28}
              />
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
                {t("admin.error")}
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

  const SectionWrapper = ({ children, locked }: { children: React.ReactNode; locked: boolean }) => {
    return (
      <div className="relative">
        {children}
        {locked && (
          <LockedOverlay
            onRequestVerify={() => setCreateClinicOpen(true)}
            message="This feature is locked until your organization is verified."
          />
        )}
      </div>
    );
  };

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <SectionWrapper locked={!isVerified}>
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
                    <div className="space-y-4">
                      {appointments.slice(0, 5).map((appointment: any) => (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border cursor-pointer hover:bg-muted/60 transition"
                          onClick={() => guard(() => toast.info("Appointment details (coming soon)"))}
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{appointment.patient_name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {appointment.doctor_name} • {format(new Date(appointment.date), "MMM d, yyyy")} •{" "}
                              {appointment.time}
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
                  <CardTitle>{t("admin.overview.quickActions")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" onClick={() => guard(() => setInviteProviderOpen(true))}>
                    <Stethoscope className="h-4 w-4 mr-2" />
                    {t("admin.overview.inviteProvider")}
                  </Button>
                  <Button className="w-full justify-start" onClick={() => guard(() => setAddServiceOpen(true))} variant="outline">
                    <Building2 className="h-4 w-4 mr-2" />
                    {t("admin.overview.addService")}
                  </Button>
                  <Button className="w-full justify-start" onClick={() => guard(() => setInviteStaffOpen(true))} variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    {t("admin.overview.inviteStaff")}
                  </Button>
                  <Button className="w-full justify-start" onClick={() => guard(() => setAddLocationOpen(true))} variant="outline">
                    <MapPin className="h-4 w-4 mr-2" />
                    {t("admin.overview.addLocation")}
                  </Button>

                  <div className="pt-2 border-t border-border">
                    <PendingInvitationsSection practiceId={practice?.id} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </SectionWrapper>
        );

      case "providers":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.providers.title")}</h2>
              <Button onClick={() => guard(() => setInviteProviderOpen(true))}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("admin.providers.inviteProvider")}
              </Button>
            </div>

            <Card className="mt-6 rounded-xl">
              <CardHeader>
                <CardTitle>{t("admin.providers.activeProviders")}</CardTitle>
              </CardHeader>
              <CardContent>
                {doctors.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t("admin.providers.noProviders")}</p>
                    <Button className="mt-4" onClick={() => guard(() => setInviteProviderOpen(true))}>
                      {t("admin.providers.inviteFirst")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {doctors.map((doc: any) => (
                      <Card key={doc.id} className="rounded-xl border border-border/60">
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{doc.name}</p>
                              <p className="text-sm text-muted-foreground truncate">{doc.specialty || "Provider"}</p>
                            </div>
                            <Badge variant="outline">{doc.status || "active"}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p className="flex items-center gap-2">
                              <Mail className="h-4 w-4 opacity-70" />
                              <span className="truncate">{doc.email || "—"}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 opacity-70" />
                              <span className="truncate">{doc.phone || "—"}</span>
                            </p>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" className="w-full" onClick={() => guard(() => toast.info("Edit provider (coming soon)"))}>
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" className="w-full" onClick={() => guard(() => toast.info("View schedule (coming soon)"))}>
                              Schedule
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </SectionWrapper>
        );

      case "services":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.services.title")}</h2>
              <Button onClick={() => guard(() => setAddServiceOpen(true))}>
                <Building2 className="h-4 w-4 mr-2" />
                {t("admin.services.addService")}
              </Button>
            </div>

            <Card className="mt-6 rounded-xl">
              <CardHeader>
                <CardTitle>{t("admin.services.list")}</CardTitle>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t("admin.services.noServices")}</p>
                    <Button className="mt-4" onClick={() => guard(() => setAddServiceOpen(true))}>
                      {t("admin.services.addFirst")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {services.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{s.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{s.description || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${Number(s.price || 0).toFixed(2)}</p>
                          <Button size="sm" variant="outline" className="mt-2" onClick={() => guard(() => toast.info("Edit service (coming soon)"))}>
                            Edit
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
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.staff.title")}</h2>
              <Button onClick={() => guard(() => setInviteStaffOpen(true))}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("admin.staff.invite")}
              </Button>
            </div>

            <Card className="mt-6 rounded-xl">
              <CardHeader>
                <CardTitle>{t("admin.staff.members")}</CardTitle>
              </CardHeader>
              <CardContent>
                {staff.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t("admin.staff.noStaff")}</p>
                    <Button className="mt-4" onClick={() => guard(() => setInviteStaffOpen(true))}>
                      {t("admin.staff.inviteFirst")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {staff.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{m.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{m.email || "—"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{m.role || "staff"}</Badge>
                          <Button size="sm" variant="outline" onClick={() => guard(() => toast.info("Manage staff (coming soon)"))}>
                            Manage
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

      case "locations":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.locations.title")}</h2>
              <Button onClick={() => guard(() => setAddLocationOpen(true))}>
                <MapPin className="h-4 w-4 mr-2" />
                {t("admin.locations.addLocation")}
              </Button>
            </div>

            <Card className="mt-6 rounded-xl">
              <CardHeader>
                <CardTitle>{t("admin.locations.list")}</CardTitle>
              </CardHeader>
              <CardContent>
                {locations.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t("admin.locations.noLocations")}</p>
                    <Button className="mt-4" onClick={() => guard(() => setAddLocationOpen(true))}>
                      {t("admin.locations.addFirst")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {locations.map((loc: any) => (
                      <Card key={loc.id} className="rounded-xl border border-border/60">
                        <CardContent className="p-5 space-y-2">
                          <p className="font-semibold truncate">{loc.name || "Location"}</p>
                          <p className="text-sm text-muted-foreground">
                            {loc.address || loc.city ? `${loc.address || ""} ${loc.city || ""}` : "—"}
                          </p>
                          <Button size="sm" variant="outline" className="mt-2" onClick={() => guard(() => toast.info("Edit location (coming soon)"))}>
                            Edit
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </SectionWrapper>
        );

      case "patients":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.patients.title")}</h2>
              <div className="flex items-center gap-2">
                <Input placeholder={t("admin.patients.searchPlaceholder")} className="w-56" />
                <Button variant="outline" onClick={() => guard(() => toast.info("Search (coming soon)"))}>
                  Search
                </Button>
              </div>
            </div>

            <Card className="mt-6 rounded-xl">
              <CardHeader>
                <CardTitle>{t("admin.patients.list")}</CardTitle>
              </CardHeader>
              <CardContent>
                {patients.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t("admin.patients.noPatients")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patients.slice(0, 25).map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{p.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{p.email || "—"}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => guard(() => toast.info("View patient profile (coming soon)"))}>
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </SectionWrapper>
        );

      case "billing":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.billing.title")}</h2>
              <div className="flex items-center gap-2">
                <Button variant={billingRange === "7d" ? "default" : "outline"} size="sm" onClick={() => setBillingRange("7d")}>
                  7d
                </Button>
                <Button variant={billingRange === "30d" ? "default" : "outline"} size="sm" onClick={() => setBillingRange("30d")}>
                  30d
                </Button>
                <Button variant={billingRange === "90d" ? "default" : "outline"} size="sm" onClick={() => setBillingRange("90d")}>
                  90d
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>{t("admin.billing.recentPayments")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {billing.loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : (billing.data as any)?.payments?.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>{t("admin.billing.noPayments")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(billing.data as any)?.payments?.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{p.patient_name || "Patient"}</p>
                            <p className="text-sm text-muted-foreground truncate">{format(new Date(p.created_at), "MMM d, yyyy")}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${(Number(p.amount_cents || 0) / 100).toFixed(2)}</p>
                            <Badge variant="outline" className="mt-1">
                              {p.status || "paid"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>{t("admin.billing.summary")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {billing.loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>{t("admin.billing.totalRevenue")}</span>
                        <span className="font-semibold">
                          ${(((billing.data as any)?.kpis?.totalRevenueCents ?? 0) / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("admin.billing.paidInvoices")}</span>
                        <span className="font-semibold">{(billing.data as any)?.kpis?.paidInvoices ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("admin.billing.pendingInvoices")}</span>
                        <span className="font-semibold">{(billing.data as any)?.kpis?.pendingInvoices ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("admin.billing.refunds")}</span>
                        <span className="font-semibold">
                          ${(((billing.data as any)?.kpis?.refundsCents ?? 0) / 100).toFixed(2)}
                        </span>
                      </div>

                      <Button variant="outline" className="w-full" onClick={() => guard(() => toast.info("Export billing (coming soon)"))}>
                        Export
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </SectionWrapper>
        );

      case "analytics":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.analytics.title")}</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant={analyticsRange === "7d" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsRange("7d")}
                >
                  7d
                </Button>
                <Button
                  variant={analyticsRange === "30d" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsRange("30d")}
                >
                  30d
                </Button>
                <Button
                  variant={analyticsRange === "90d" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsRange("90d")}
                >
                  90d
                </Button>
              </div>
            </div>

            {analytics.loading ? (
              <div className="mt-6 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading analytics…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>Daily Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={((analytics.data as any)?.trend || []) as DailyTrendPoint[]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), "MMM d")} />
                            <YAxis />
                            <Tooltip
                              formatter={(value: any, name: any) => {
                                if (name === "revenue_cents") return [`$${(Number(value) / 100).toFixed(2)}`, "Revenue"];
                                if (name === "completed") return [value, "Completed"];
                                if (name === "bookings") return [value, "Bookings"];
                                return [value, name];
                              }}
                            />
                            <Area type="monotone" dataKey="bookings" fillOpacity={0.2} strokeWidth={2} />
                            <Area type="monotone" dataKey="completed" fillOpacity={0.15} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Average Rating</span>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            <span className="font-semibold">
                              {Number((analytics.data as any).kpis?.averageRating || 0).toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Patient Retention (180d)</span>
                          <span className="font-semibold">{(analytics.data as any).kpis?.patientRetentionPct ?? 0}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>No-show / Cancel rate</span>
                          <span className="font-semibold">{(analytics.data as any).kpis?.noShowRatePct ?? 0}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Completed</span>
                          <span className="font-semibold">{(analytics.data as any).kpis?.completedAppointments ?? 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6">
                  <AdvancedFinancialMetrics
                    metrics={advancedMetrics}
                    revenue={stats.totalRevenue}
                    onUpdateInputs={() => {
                      guard(() => {
                        refreshData();
                        refreshAdvancedMetrics();
                        analytics.refetch();
                      });
                    }}
                  />
                </div>
              </>
            )}
          </SectionWrapper>
        );

      case "finance":
        return (
          <SectionWrapper locked={!isVerified}>
            {!practice?.id ? (
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Finance</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  No clinic/practice found for this account.
                </CardContent>
              </Card>
            ) : (
              <FinanceHub entityType="clinic" entityId={practice.id} />
            )}
          </SectionWrapper>
        );

      case "settings":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">Settings</h2>
              <Button onClick={() => guard(() => setSettingsOpen(true))}>
                <Settings className="h-4 w-4 mr-2" />
                Open Settings
              </Button>
            </div>

            <Card className="mt-6 rounded-xl">
              <CardHeader>
                <CardTitle>Practice Settings</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Manage practice profile, booking rules, payments, notifications, staff roles, and more.</p>
                <p>Use the button above to open the settings panel.</p>
              </CardContent>
            </Card>
          </SectionWrapper>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t("admin.title")}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton onClick={() => setActiveSection(item.id)} isActive={activeSection === item.id}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-4 min-w-0">
                <SidebarTrigger />
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold truncate">{practice?.name || t("admin.unverifiedPractice")}</h1>
                  <p className="text-sm text-muted-foreground truncate">
                    Status:{" "}
                    <span className="font-medium">{t(`admin.verification.statuses.${verificationStatus}`)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <ThemeToggle />
                <LanguageSwitcher />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => guard(() => toast.info("Profile preview (coming soon)"))}
                  className="hidden sm:inline-flex"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {t("admin.header.previewProfile")}
                </Button>

                <ProfileMenu />
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 space-y-6">
            <Card className={`border-2 ${getVerificationStatusColor(verificationStatus)}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    {verificationStatus === "verified" ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : verificationStatus === "rejected" ? (
                      <X className="h-6 w-6 text-red-600" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-yellow-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold">{t("admin.verification.status")}</h3>
                      <Badge variant="outline" className={getVerificationStatusColor(verificationStatus)}>
                        {t(`admin.verification.statuses.${verificationStatus}`)}
                      </Badge>
                    </div>

                    <p className="text-sm mb-3">{getVerificationMessage(verificationStatus)}</p>

                    {!isVerified && (
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" onClick={() => setCreateClinicOpen(true)}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {verificationStatus === "rejected"
                            ? t("admin.verification.resubmit")
                            : t("admin.verification.verifyPractice")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRequirementsOpen(true)}>
                          {t("admin.verification.viewRequirements")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {dashboardMetrics.map((m, idx) => {
                const Icon = m.icon;
                return (
                  <Card key={idx} className="rounded-xl">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">{m.label}</p>
                          <p className="text-2xl font-semibold">{m.value}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {renderSection()}
          </main>
        </div>

        <InviteProviderModal
          open={inviteProviderOpen}
          onOpenChange={setInviteProviderOpen}
          practiceId={practice?.id}
          disabled={!allowModals}
        />

        <AddServiceModal
          open={addServiceOpen}
          onOpenChange={setAddServiceOpen}
          practiceId={practice?.id}
          disabled={!allowModals}
        />

        <InviteStaffModal
          open={inviteStaffOpen}
          onOpenChange={setInviteStaffOpen}
          practiceId={practice?.id}
          disabled={!allowModals}
        />

        <AddLocationModal
          open={addLocationOpen}
          onOpenChange={setAddLocationOpen}
          practiceId={practice?.id}
          disabled={!allowModals}
        />

        <SettingsPanel
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          practiceId={practice?.id}
          disabled={!allowModals}
        />

        <ComprehensiveRegistrationModal
          open={createClinicOpen}
          onOpenChange={setCreateClinicOpen}
          practiceId={practice?.id}
        />

        <CreateClinicModal
          open={createClinicOpen}
          onOpenChange={setCreateClinicOpen}
          practiceId={practice?.id}
        />

        <ViewRequirementsModal
          open={requirementsOpen}
          onOpenChange={setRequirementsOpen}
        />

        <VerificationSuccessModal
          open={verificationModalOpen}
          onOpenChange={setVerificationModalOpen}
          onClose={handleVerificationModalClose}
          onSuccess={handleVerificationSuccess}
          practiceId={practice?.id}
        />
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
