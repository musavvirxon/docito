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
                  toast.info(
                    "You can browse sections, but actions remain locked until verification."
                  );
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
      { label: t("admin.metrics.revenueThisMonth"), value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign },
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">{t("admin.loading")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("admin.error.failed")}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refreshData}>{t("admin.error.tryAgain")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If practice not created yet
  if (!practice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
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

            <Button size="lg" onClick={() => setCreateClinicOpen(true)} className="w-full sm:w-auto">
              <Building2 className="w-4 h-4 mr-2" />
              {t("admin.welcome.createProfile")}
            </Button>
          </CardContent>
        </Card>

        <CreateClinicModal open={createClinicOpen} onOpenChange={setCreateClinicOpen} onSuccess={refreshData} />
      </div>
    );
  }

  const SectionWrapper = ({ children, locked }: { children: React.ReactNode; locked: boolean }) => {
    return (
      <div className="relative">
        <div className={locked ? "opacity-70 select-none" : ""}>{children}</div>
        {locked && (
          <LockedOverlay
            message={lockMessage}
            onRequestVerify={() => setCreateClinicOpen(true)}
          />
        )}
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
                  Your clinic dashboard is visible, but actions are locked until verification.
                  You can browse all sections now. Actions will unlock after approval.
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
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{location.name}</h3>
                            {location.is_primary && (
                              <Badge variant="default" className="text-xs">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mb-2">{location.address}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {location.phone && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {location.phone}
                              </div>
                            )}
                            {location.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {location.email}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => guard(() => toast.info("Edit location (coming soon)"))}
                        >
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("admin.services.title")}</h2>
              <Button onClick={() => guard(() => setAddServiceOpen(true))}>
                <Building2 className="h-4 w-4 mr-2" />
                {t("admin.services.addService")}
              </Button>
            </div>

            {services.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">{t("admin.services.noServices")}</h3>
                  <p className="text-muted-foreground mb-4">{t("admin.services.noServicesDesc")}</p>
                  <Button onClick={() => guard(() => setAddServiceOpen(true))}>
                    <Building2 className="h-4 w-4 mr-2" />
                    {t("admin.services.addFirst")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 mt-6">
                {services.map((service: any) => (
                  <Card key={service.id} className="rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="font-medium">${service.price}</span>
                            <span className="text-muted-foreground">{service.duration} mins</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => guard(() => toast.info("Edit service (coming soon)"))}
                        >
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

      case "staff":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("admin.staff.title")}</h2>
              <Button onClick={() => guard(() => setInviteStaffOpen(true))}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("admin.staff.inviteStaff")}
              </Button>
            </div>

            <PendingInvitationsSection practiceId={practice.id} />

            {staff.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">{t("admin.staff.noStaff")}</h3>
                  <p className="text-muted-foreground mb-4">{t("admin.staff.noStaffDesc")}</p>
                  <Button onClick={() => guard(() => setInviteStaffOpen(true))}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t("admin.staff.inviteFirst")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 mt-6">
                {staff.map((member: any) => (
                  <Card key={member.id} className="rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{member.name}</h3>
                            <p className="text-sm text-muted-foreground">{member.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap justify-end">
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("admin.patients.title")}</h2>
              <Button variant="outline" onClick={() => toast.info("Export (coming soon)")}>
                Export
              </Button>
            </div>

            {patients.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">{t("admin.patients.noPatients")}</h3>
                  <p className="text-muted-foreground">{t("admin.patients.noPatientsDesc")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 mt-6">
                {patients.map((p: any) => (
                  <Card key={p.id} className="rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="font-semibold">{p.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{p.email}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => toast.info("View patient (coming soon)")}>
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </SectionWrapper>
        );

      case "billing":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("admin.billing.title")}</h2>
              <Button variant="outline" onClick={() => refreshAdvancedMetrics()}>
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {t("admin.billing.recentPayments")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{t("admin.billing.noPayments")}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {payments.slice(0, 5).map((pay: any) => (
                        <div
                          key={pay.id}
                          className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border"
                        >
                          <div>
                            <p className="font-medium">{pay.patient_name}</p>
                            <p className="text-sm text-muted-foreground">{pay.service_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">${pay.amount}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(pay.created_at), "MMM dd")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <AdvancedFinancialMetrics metrics={advancedMetrics} />
            </div>
          </SectionWrapper>
        );

      case "analytics":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("admin.analytics.title")}</h2>
              <Button variant="outline" onClick={() => toast.info("Export analytics (coming soon)")}>
                Export
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {t("admin.analytics.performance")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("admin.analytics.averageRating")}</span>
                    <span className="font-semibold">{metrics.averageRating.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("admin.analytics.patientRetention")}</span>
                    <span className="font-semibold">{metrics.patientRetention}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("admin.analytics.avgWaitTime")}</span>
                    <span className="font-semibold">{metrics.avgWaitTime} mins</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("admin.analytics.noShowRate")}</span>
                    <span className="font-semibold">{metrics.noShowRate}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t("admin.analytics.insights")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/40 rounded-xl border border-border">
                    <p className="font-medium mb-1">{t("admin.analytics.topService")}</p>
                    <p className="text-sm text-muted-foreground">
                      {metrics.topService || t("admin.analytics.noData")}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/40 rounded-xl border border-border">
                    <p className="font-medium mb-1">{t("admin.analytics.peakHours")}</p>
                    <p className="text-sm text-muted-foreground">
                      {metrics.peakHours || t("admin.analytics.noData")}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/40 rounded-xl border border-border">
                    <p className="font-medium mb-1">{t("admin.analytics.recommendation")}</p>
                    <p className="text-sm text-muted-foreground">
                      {metrics.recommendation || t("admin.analytics.noData")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </SectionWrapper>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="truncate max-w-[160px]">{practice?.name || "Practice"}</span>
                </div>
                <SidebarTrigger />
              </SidebarGroupLabel>

              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveSection(item.id)}
                        isActive={activeSection === item.id}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>{t("admin.sidebar.account")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setSettingsOpen(true)}>
                      <Eye className="h-4 w-4" />
                      <span>{t("admin.sidebar.settings")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1">
          {/* Top bar */}
          <div className="border-b border-border bg-background">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-lg font-semibold">{t("admin.title")}</h1>
                  <p className="text-sm text-muted-foreground">
                    {t("admin.subtitle")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge className={`border ${getVerificationStatusColor(verificationStatus)}`}>
                  {getVerificationMessage(verificationStatus)}
                </Badge>

                {!isVerified && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRequirementsOpen(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Requirements
                  </Button>
                )}

                <LanguageSwitcher />
                <ThemeToggle />
                <ProfileMenu />
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="p-6 space-y-6">
            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardMetrics.map((m) => (
                <Card key={m.label} className="rounded-xl">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{m.label}</p>
                      <p className="text-2xl font-bold">{m.value}</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <m.icon className="h-6 w-6 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Content */}
            {renderSection()}
          </div>
        </div>

        {/* Modals */}
        {allowModals && (
          <>
            <InviteProviderModal
              open={inviteProviderOpen}
              onOpenChange={setInviteProviderOpen}
              practiceId={practice.id}
              onSuccess={refreshData}
            />

            <AddServiceModal
              open={addServiceOpen}
              onOpenChange={setAddServiceOpen}
              practiceId={practice.id}
              onSuccess={refreshData}
            />

            <InviteStaffModal
              open={inviteStaffOpen}
              onOpenChange={setInviteStaffOpen}
              practiceId={practice.id}
              onSuccess={refreshData}
            />

            <AddLocationModal
              open={addLocationOpen}
              onOpenChange={setAddLocationOpen}
              practiceId={practice.id}
              onSuccess={refreshData}
            />

            <SettingsPanel
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              practiceId={practice.id}
              onSuccess={refreshData}
            />

            <ViewRequirementsModal
              open={requirementsOpen}
              onOpenChange={setRequirementsOpen}
              entityType="practice"
              onStartVerification={() => setCreateClinicOpen(true)}
            />

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
