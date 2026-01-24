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
    { id: "analytics", label: t("admin.tabs.analytics"), icon: TrendingUp },
    { id: "settings", label: t("admin.tabs.settings", { defaultValue: "Settings" }), icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <img src="/logos/horizontal/docito-horizontal-sm.png" alt="Docito" className="h-7" />
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
              <img src="/logos/horizontal/docito-horizontal-sm.png" alt="Docito" className="h-7" />
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
                              {appointment.service_name} • {format(new Date(appointment.appointment_date), "MMM dd, yyyy")}
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
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    {t("admin.overview.recentMessages")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{t("admin.overview.noMessages")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.slice(0, 5).map((message: any) => (
                        <div
                          key={message.id}
                          className="p-3 bg-muted/40 rounded-xl border border-border cursor-pointer hover:bg-muted/60 transition"
                          onClick={() => guard(() => toast.info("Message thread (coming soon)"))}
                        >
                          <p className="font-medium truncate">{message.sender_name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{message.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(message.created_at), "MMM dd, yyyy")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <PendingInvitationsSection practiceId={practice?.id || ""} />
          </SectionWrapper>
        );

      case "providers":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.providers.title")}</h2>
              <Button onClick={() => guard(() => setInviteProviderOpen(true))}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("admin.providers.inviteProvider")}
              </Button>
            </div>

            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <Input placeholder={t("admin.providers.searchPlaceholder")} className="w-full sm:w-64" />
              <Button variant="outline" onClick={() => guard(() => toast.info("Filters (coming soon)"))}>
                {t("admin.providers.filter")}
              </Button>
            </div>

            {doctors.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">{t("admin.providers.noProviders")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                {doctors.map((doctor: any) => (
                  <Card key={doctor.id} className="rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{doctor.full_name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{doctor.specialty}</p>
                        </div>
                        <Badge variant="outline">{doctor.status || "active"}</Badge>
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{doctor.email || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Star className="h-4 w-4" />
                          <span>{Number(doctor.average_rating || 0).toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => guard(() => toast.info("Profile (coming soon)"))}>
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => guard(() => toast.info("Edit (coming soon)"))}>
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </SectionWrapper>
        );

      case "services":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.services.title")}</h2>
              <Button onClick={() => guard(() => setAddServiceOpen(true))}>
                <Building2 className="h-4 w-4 mr-2" />
                {t("admin.services.addService")}
              </Button>
            </div>

            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <Input placeholder={t("admin.services.searchPlaceholder")} className="w-full sm:w-64" />
              <Button variant="outline" onClick={() => guard(() => toast.info("Categories (coming soon)"))}>
                {t("admin.services.categories")}
              </Button>
            </div>

            {services.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">{t("admin.services.noServices")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                {services.map((service: any) => (
                  <Card key={service.id} className="rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{service.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{service.description || "—"}</p>
                        </div>
                        <Badge variant="outline">{service.status || "active"}</Badge>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                        <span>Duration</span>
                        <span className="font-medium text-foreground">{service.duration_minutes || 0} min</span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                        <span>Price</span>
                        <span className="font-medium text-foreground">${Number(service.price || 0).toFixed(2)}</span>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => guard(() => toast.info("Edit (coming soon)"))}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => guard(() => toast.info("Disable (coming soon)"))}>
                          Disable
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </SectionWrapper>
        );

      case "staff":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.staff.title")}</h2>
              <Button onClick={() => guard(() => setInviteStaffOpen(true))}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("admin.staff.inviteStaff")}
              </Button>
            </div>

            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <Input placeholder={t("admin.staff.searchPlaceholder")} className="w-full sm:w-64" />
              <Button variant="outline" onClick={() => guard(() => toast.info("Roles (coming soon)"))}>
                {t("admin.staff.roles")}
              </Button>
            </div>

            {staff.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">{t("admin.staff.noStaff")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                {staff.map((member: any) => (
                  <Card key={member.id} className="rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{member.full_name || member.email}</h3>
                          <p className="text-sm text-muted-foreground truncate">{member.role_name || "Staff"}</p>
                        </div>
                        <Badge variant="outline">{member.status || "active"}</Badge>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{member.email || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{member.permissions?.length ? `${member.permissions.length} permissions` : "—"}</span>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => guard(() => toast.info("Edit role (coming soon)"))}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => guard(() => toast.info("Deactivate (coming soon)"))}>
                          Deactivate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </SectionWrapper>
        );

      case "locations":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.locations.title")}</h2>
              <Button onClick={() => guard(() => setAddLocationOpen(true))}>
                <MapPin className="h-4 w-4 mr-2" />
                {t("admin.locations.addLocation")}
              </Button>
            </div>

            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <Input placeholder={t("admin.locations.searchPlaceholder")} className="w-full sm:w-64" />
              <Button variant="outline" onClick={() => guard(() => toast.info("Map view (coming soon)"))}>
                {t("admin.locations.mapView")}
              </Button>
            </div>

            {locations.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">{t("admin.locations.noLocations")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                {locations.map((loc: any) => (
                  <Card key={loc.id} className="rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{loc.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {[loc.address, loc.city].filter(Boolean).join(", ") || "—"}
                          </p>
                        </div>
                        <Badge variant="outline">{loc.is_primary ? "Primary" : "—"}</Badge>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{loc.email || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{loc.phone || "—"}</span>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => guard(() => toast.info("Edit (coming soon)"))}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => guard(() => toast.info("Delete (coming soon)"))}>
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </SectionWrapper>
        );

      case "patients":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold">Patients</h2>
              <div className="flex gap-2 flex-wrap">
                <Input placeholder="Search patients..." className="w-full sm:w-64" />
                <Button variant="outline" onClick={() => guard(() => toast.info("Export (coming soon)"))}>
                  Export
                </Button>
              </div>
            </div>

            {patients.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No patients yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-0">
                  <div className="border-b p-4 bg-muted/40">
                    <div className="grid grid-cols-4 gap-4 font-medium text-sm">
                      <div>Patient Name</div>
                      <div>Last Visit</div>
                      <div>Provider</div>
                      <div>Status</div>
                    </div>
                  </div>
                  {patients.map((patient: any) => (
                    <div
                      key={patient.id}
                      className="grid grid-cols-4 gap-4 p-4 border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => guard(() => toast.info("Patient details (coming soon)"))}
                    >
                      <div className="font-medium">{patient.full_name}</div>
                      <div className="text-muted-foreground">
                        {format(new Date(patient.last_visit), "MMM dd, yyyy")}
                      </div>
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
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">Billing & Payments</h2>
              <div className="flex items-center gap-2 flex-wrap">
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
                          tx?.metadata?.patient_name ||
                          tx?.metadata?.customer_name ||
                          tx?.metadata?.payer_name ||
                          "—";

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
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(tx.created_at), "MMM dd, yyyy")}
                              </p>
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

      case "analytics":
        return (
          <SectionWrapper locked={!isVerified}>
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

            {analytics.loading ? (
              <div className="mt-6 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading analytics…</span>
              </div>
            ) : analytics.error ? (
              <div className="mt-6 text-sm text-destructive">{analytics.error}</div>
            ) : !analytics.data ? (
              <div className="mt-6 text-sm text-muted-foreground">No analytics data.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mt-6">
                  <Card className="rounded-xl">
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-muted-foreground">
                        Revenue ({(analytics.data as any).period?.days ?? 0}d)
                      </p>
                      <p className="text-2xl font-bold">
                        $
                        {(((analytics.data as any).kpis?.totalRevenueCents ?? 0) / 100).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(analytics.data as any).kpis?.revenueChangePct ?? 0}% vs prev
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl">
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-muted-foreground">Appointments</p>
                      <p className="text-2xl font-bold">{(analytics.data as any).kpis?.totalAppointments ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(analytics.data as any).kpis?.appointmentsChangePct ?? 0}% vs prev
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl">
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-muted-foreground">Patients</p>
                      <p className="text-2xl font-bold">{(analytics.data as any).kpis?.uniquePatients ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(analytics.data as any).kpis?.patientsChangePct ?? 0}% vs prev
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl">
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-muted-foreground">Completion rate</p>
                      <p className="text-2xl font-bold">{(analytics.data as any).kpis?.completionRatePct ?? 0}%</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(analytics.data as any).kpis?.completedAppointments ?? 0} completed
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Booking Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={(((analytics.data as any).dailyTrend || []) as DailyTrendPoint[]) ?? []}
                            margin={{ top: 8, left: 8, right: 8, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
                            <YAxis tickLine={false} axisLine={false} />
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
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{m.label}</p>
                          <p className="text-2xl font-bold">{m.value}</p>
                        </div>
                        <Icon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {renderSection()}
          </main>
        </div>

        <InviteProviderModal open={allowModals && inviteProviderOpen} onOpenChange={setInviteProviderOpen} />
        <AddServiceModal open={allowModals && addServiceOpen} onOpenChange={setAddServiceOpen} />
        <InviteStaffModal open={allowModals && inviteStaffOpen} onOpenChange={setInviteStaffOpen} practiceId={practice?.id || ""} />
        <AddLocationModal open={allowModals && addLocationOpen} onOpenChange={setAddLocationOpen} />
        <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />

        {practice && (
          <>
            <ViewRequirementsModal open={requirementsOpen} onOpenChange={setRequirementsOpen} />
            <ComprehensiveRegistrationModal
              open={createClinicOpen}
              onOpenChange={setCreateClinicOpen}
              onSuccess={handleVerificationSuccess}
              practiceId={practice.id}
              existingPracticeData={practice}
            />
          </>
        )}

        <VerificationSuccessModal
          open={verificationModalOpen}
          onOpenChange={handleVerificationModalClose}
          practiceName={practice?.name || "Your Practice"}
        />
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
