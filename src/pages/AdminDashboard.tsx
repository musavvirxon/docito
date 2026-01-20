// src/pages/AdminDashboard.tsx
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
  | "analytics";

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

  // ✅ NEW: guard helper that also opens requirements modal
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
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <img
                src="/logos/horizontal/docito-horizontal-sm.png"
                alt="Docito"
                className="h-7"
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
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <img
                src="/logos/horizontal/docito-horizontal-sm.png"
                alt="Docito"
                className="h-7"
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
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("admin.error.failed")}</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={refreshData}>{t("admin.error.tryAgain")}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If practice not created yet
  if (!practice) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <img
                src="/logos/horizontal/docito-horizontal-sm.png"
                alt="Docito"
                className="h-7"
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
          <Card className="max-w-2xl w-full">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{t("admin.welcome.title")}</h3>
              <p className="text-muted-foreground mb-6 text-base">{t("admin.welcome.description")}</p>

              <div className="bg-muted/40 rounded-xl p-6 mb-6 text-left border border-border">
                <p className="text-sm font-medium mb-4">{t("admin.welcome.needProvide")}</p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    {t("admin.welcome.requirements.clinicName")}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    {t("admin.welcome.requirements.location")}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    {t("admin.welcome.requirements.operating")}
                  </li>
                </ul>
              </div>

              <Button size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto">
                <Building2 className="w-4 h-4 mr-2" />
                {t("admin.welcome.createProfile")}
              </Button>
            </CardContent>
          </Card>
        </div>

        <CreateClinicModal open={createClinicOpen} onOpenChange={setCreateClinicOpen} onSuccess={refreshData} />
      </div>
    );
  }

  const SectionWrapper = ({ children, locked }: { children: React.ReactNode; locked: boolean }) => {
    return (
      <div className="relative">
        <div className={locked ? "opacity-70 select-none" : ""}>{children}</div>
        {locked && <LockedOverlay message={lockMessage} onRequestVerify={() => setCreateClinicOpen(true)} />}
      </div>
    );
  };

  const allowModals = isVerified; // ✅ safety-net

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* ✅ NEW: always-visible warning text on main dashboard */}
            {!isVerified && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <div className="font-semibold">Verification required</div>
                <div className="text-sm mt-1">
                  Your clinic dashboard is visible, but actions are locked until verification. You can browse all sections
                  now. Actions will unlock after approval.
                </div>
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => setRequirementsOpen(true)}>
                    View verification requirements
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t("admin.overview.recentAppointments")}
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
                      {appointments.slice(0, 3).map((apt: any) => (
                        <div
                          key={apt.id}
                          className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border"
                        >
                          <div>
                            <p className="font-medium">{apt.patient_name}</p>
                            <p className="text-sm text-muted-foreground">{apt.doctor_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {format(new Date(apt.appointment_date), "MMM dd")}, {apt.start_time}
                            </p>
                            <Badge variant="outline" className="capitalize">
                              {apt.status}
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
                    <div className="space-y-4">
                      {messages.map((msg: any) => (
                        <div
                          key={msg.id}
                          className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl border border-border"
                        >
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{msg.sender_name}</p>
                            <p className="text-sm text-muted-foreground">{msg.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(msg.created_at), "MMM dd, h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "providers":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("admin.providers.title")}</h2>
              <Button onClick={() => guard(() => setInviteProviderOpen(true))}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("admin.providers.inviteProvider")}
              </Button>
            </div>

            {doctors.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">{t("admin.providers.noProviders")}</h3>
                  <p className="text-muted-foreground mb-4">{t("admin.providers.noProvidersDesc")}</p>
                  <Button onClick={() => guard(() => setInviteProviderOpen(true))}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t("admin.providers.inviteFirst")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 mt-6">
                {doctors.map((provider: any) => (
                  <Card key={provider.id} className="rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <Stethoscope className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{provider.profiles?.full_name || "Unknown"}</h3>
                            <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap justify-end">
                          <Badge variant={provider.verified ? "default" : "secondary"}>
                            {provider.verified ? t("admin.providers.verified") : t("admin.providers.pending")}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => guard(() => toast.info("Edit provider (coming soon)"))}
                          >
                            {t("admin.providers.edit")}
                          </Button>
                        </div>
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Practice Locations</h2>
              <Button onClick={() => guard(() => setAddLocationOpen(true))}>
                <MapPin className="h-4 w-4 mr-2" />
                Add New Location
              </Button>
            </div>

            {locations.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Locations Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your practice locations to help patients find you
                  </p>
                  <Button onClick={() => guard(() => setAddLocationOpen(true))}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Add First Location
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 mt-6">
                {locations.map((location: any) => (
                  <Card key={location.id} className="rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-[240px]">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{location.name}</h3>
                            {location.is_primary && <Badge variant="outline">Primary</Badge>}
                          </div>
                          <p className="text-muted-foreground mb-2">{location.address}</p>
                          <p className="text-muted-foreground mb-4">{location.phone}</p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => guard(() => toast.info("Edit location (coming soon)"))}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => guard(() => toast.info("Photos (coming soon)"))}
                          >
                            Upload Photos
                          </Button>
                        </div>
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Services & Treatments</h2>
              <Button onClick={() => guard(() => setAddServiceOpen(true))}>Add New Service</Button>
            </div>

            {services.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Services Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add services and treatments offered at your practice
                  </p>
                  <Button onClick={() => guard(() => setAddServiceOpen(true))}>Add First Service</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 mt-6">
                {services.map((service: any) => (
                  <Card key={service.id} className="rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">Available with: {service.doctor_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => guard(() => toast.info("Edit service (coming soon)"))}
                          >
                            Edit
                          </Button>
                        </div>
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Staff Management</h2>
              <Button onClick={() => guard(() => setInviteStaffOpen(true))}>
                <Mail className="h-4 w-4 mr-2" />
                Invite Staff Member
              </Button>
            </div>

            {practice && (
              <div className="mt-6">
                <PendingInvitationsSection practiceId={practice.id} />
              </div>
            )}

            {staff.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Staff Members Yet</h3>
                  <p className="text-muted-foreground mb-4">Add staff members to help manage your practice</p>
                  <Button onClick={() => guard(() => setInviteStaffOpen(true))}>
                    <Mail className="h-4 w-4 mr-2" />
                    Invite First Staff Member
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="mt-6 rounded-xl">
                <CardHeader>
                  <CardTitle>Active Staff Members ({staff.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {staff.map((member: any) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border rounded-xl gap-4 flex-wrap"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-muted/60 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{member.full_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {member.role} • {member.department}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.status === "active" ? "default" : "secondary"}>
                            {member.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => guard(() => toast.info("Edit staff (coming soon)"))}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </SectionWrapper>
        );

      case "patients":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold">Patient Management</h2>
              <div className="flex gap-2 w-full sm:w-auto">
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Billing & Payments</h2>
              <Button onClick={() => guard(() => toast.info("Generate report (coming soon)"))}>
                Generate Report
              </Button>
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
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Revenue (This Month)</span>
                      <span className="font-semibold">${stats.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Payments</span>
                      <span className="font-semibold text-yellow-600">
                        $
                        {payments
                          .filter((p: any) => p.status === "pending")
                          .reduce((sum: number, p: any) => sum + p.amount, 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Payments</span>
                      <span className="font-semibold text-green-600">
                        $
                        {payments
                          .filter((p: any) => p.status === "paid")
                          .reduce((sum: number, p: any) => sum + p.amount, 0)
                          .toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {payments.slice(0, 3).map((payment: any) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border"
                        >
                          <div>
                            <p className="font-medium">{payment.patient_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(payment.created_at), "MMM dd, yyyy")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${payment.amount.toFixed(2)}</p>
                            <Badge variant={payment.status === "paid" ? "default" : "outline"}>
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => guard(() => toast.info("Date range (coming soon)"))}>
                  Last 30 Days
                </Button>
                <Button variant="outline" onClick={() => guard(() => toast.info("Export report (coming soon)"))}>
                  Export Report
                </Button>
              </div>
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
                  <div className="h-64 bg-muted/20 rounded-xl border border-border flex items-center justify-center">
                    <p className="text-muted-foreground">Chart visualization would go here</p>
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
                        <span className="font-semibold">{metrics.averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Patient Retention</span>
                      <span className="font-semibold">{metrics.patientRetention}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Avg. Wait Time</span>
                      <span className="font-semibold">{metrics.avgWaitTime} min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>No-show Rate</span>
                      <span className="font-semibold">{metrics.noShowRate}%</span>
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
                  });
                }}
              />
            </div>
          </SectionWrapper>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Left Sidebar (Imaging-like layout) */}
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

        {/* Main */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
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
            {/* Verification banner */}
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

            {/* Metrics */}
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

        {/* Modals: safety-net prevents opening when unverified */}
        <InviteProviderModal open={allowModals && inviteProviderOpen} onOpenChange={setInviteProviderOpen} />
        <AddServiceModal open={allowModals && addServiceOpen} onOpenChange={setAddServiceOpen} />
        <InviteStaffModal
          open={allowModals && inviteStaffOpen}
          onOpenChange={setInviteStaffOpen}
          practiceId={practice?.id || ""}
        />
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
