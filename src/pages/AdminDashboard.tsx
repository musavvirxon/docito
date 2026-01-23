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
import { ComprehensiveRegistrationModal } from "@/components/dashboard/ComprehensiveRegistrationModal";
import { CreateClinicModal } from "@/components/dashboard/CreateClinicModal";
import { ViewRequirementsModal } from "@/components/dashboard/ViewRequirementsModal";
import VerificationSuccessModal from "@/components/dashboard/VerificationSuccessModal";
import EntitySettingsPage from "@/components/settings/EntitySettingsPage";

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
  Settings,
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
              Your clinic/practice/hospital dashboard is visible, but actions are disabled until your organization is
              verified.
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

  const { practice, stats, doctors, appointments, services, staff, locations, patients, messages, loading, error, refreshData } =
    useAdminDashboard();

  const verificationStatus = practice?.verification_status || "pending";
  const isVerified = verificationStatus === "verified";

  const { metrics: advancedMetrics, refreshData: refreshAdvancedMetrics } = useAdvancedFinancialMetrics(
    stats.totalRevenue,
    "practice",
    practice?.id,
  );

  const { shouldShowModal, markModalAsShown } = useVerificationStatus(practice?.id);

  const [activeSection, setActiveSection] = useState<AdminSection>("overview");

  // Modal states
  const [inviteProviderOpen, setInviteProviderOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [inviteStaffOpen, setInviteStaffOpen] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
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
    [stats, t],
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
    { id: "settings", label: t("admin.tabs.settings", { defaultValue: "Settings" }), icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top Navbar */}
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
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading dashboard…</span>
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
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Failed to load dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={refreshData}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top Navbar */}
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

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle>{t("admin.noPractice.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{t("admin.noPractice.description")}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => setCreateClinicOpen(true)}>
                  <Building2 className="h-4 w-4 mr-2" />
                  {t("admin.noPractice.createPractice")}
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  {t("admin.noPractice.backHome")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <CreateClinicModal open={createClinicOpen} onOpenChange={setCreateClinicOpen} onSuccess={handleVerificationSuccess} />
      </div>
    );
  }

  const allowModals = isVerified;

  const SectionWrapper = ({ children, locked }: { children: React.ReactNode; locked?: boolean }) => (
    <div className="relative">
      <div className={`${locked ? "pointer-events-none opacity-80" : ""} space-y-6`}>{children}</div>
      {locked && (
        <LockedOverlay
          message={lockMessage}
          onRequestVerify={() => {
            setRequirementsOpen(true);
          }}
        />
      )}
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <Card className="lg:col-span-2 rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span>{t("admin.overview.recentAppointments")}</span>
                    <Button variant="outline" size="sm" onClick={() => guard(() => toast.info("View all (coming soon)"))}>
                      View all
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {appointments.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No appointments yet</p>
                  ) : (
                    appointments.slice(0, 5).map((apt: any) => (
                      <div key={apt.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/40">
                        <div className="space-y-1">
                          <p className="font-medium">{apt.patient_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(apt.appointment_date), "MMM dd, yyyy")} • {apt.time_slot}
                          </p>
                        </div>
                        <Badge variant="outline">{apt.status}</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span>{t("admin.overview.quickActions")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" onClick={() => guard(() => setInviteProviderOpen(true))}>
                    <Stethoscope className="h-4 w-4 mr-2" />
                    {t("admin.actions.inviteProvider")}
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => guard(() => setInviteStaffOpen(true))}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t("admin.actions.inviteStaff")}
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => guard(() => setAddServiceOpen(true))}>
                    <Building2 className="h-4 w-4 mr-2" />
                    {t("admin.actions.addService")}
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => guard(() => setAddLocationOpen(true))}>
                    <MapPin className="h-4 w-4 mr-2" />
                    {t("admin.actions.addLocation")}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <PendingInvitationsSection practiceId={practice.id} locked={!isVerified} />
          </SectionWrapper>
        );

      case "providers":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold">Providers</h2>
              <Button onClick={() => guard(() => setInviteProviderOpen(true))}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Provider
              </Button>
            </div>

            {doctors.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No providers yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {doctors.map((doc: any) => (
                  <Card key={doc.id} className="rounded-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{doc.full_name}</span>
                        <Badge variant="outline">{doc.specialty}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {doc.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Rating: <span className="font-medium">{doc.average_rating?.toFixed?.(1) ?? "—"}</span>
                      </p>
                      <Button variant="outline" className="w-full" onClick={() => guard(() => toast.info("Provider details (coming soon)"))}>
                        View Details
                      </Button>
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
              <h2 className="text-xl font-semibold">Services</h2>
              <Button onClick={() => guard(() => setAddServiceOpen(true))}>
                <Building2 className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </div>

            {services.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No services added yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {services.map((svc: any) => (
                  <Card key={svc.id} className="rounded-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{svc.name}</span>
                        <Badge variant="outline">${svc.price}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">{svc.description}</p>
                      <Button variant="outline" className="w-full" onClick={() => guard(() => toast.info("Edit service (coming soon)"))}>
                        Edit
                      </Button>
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
              <h2 className="text-xl font-semibold">Staff Management</h2>
              <Button onClick={() => guard(() => setInviteStaffOpen(true))}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Staff
              </Button>
            </div>

            {staff.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No staff members yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-0">
                  <div className="border-b p-4 bg-muted/40">
                    <div className="grid grid-cols-4 gap-4 font-medium text-sm">
                      <div>Name</div>
                      <div>Role</div>
                      <div>Status</div>
                      <div>Actions</div>
                    </div>
                  </div>
                  {staff.map((member: any) => (
                    <div key={member.id} className="grid grid-cols-4 gap-4 p-4 border-b hover:bg-muted/30">
                      <div className="font-medium">{member.full_name}</div>
                      <div className="text-muted-foreground">{member.role}</div>
                      <div>
                        <Badge variant="outline">{member.status}</Badge>
                      </div>
                      <div>
                        <Button variant="outline" size="sm" onClick={() => guard(() => toast.info("Manage role (coming soon)"))}>
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </SectionWrapper>
        );

      case "locations":
        return (
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold">Locations</h2>
              <Button onClick={() => guard(() => setAddLocationOpen(true))}>
                <MapPin className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </div>

            {locations.length === 0 ? (
              <Card className="mt-6 rounded-xl">
                <CardContent className="p-12 text-center">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No locations added yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {locations.map((loc: any) => (
                  <Card key={loc.id} className="rounded-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {loc.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">{loc.address}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => guard(() => toast.info("Edit location (coming soon)"))}>
                          Edit
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => guard(() => toast.info("View map (coming soon)"))}>
                          View Map
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
          <SectionWrapper locked={!isVerified}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">Billing & Payments</h2>
              <div className="flex items-center gap-2">
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
                  ) : (
                    (() => {
                      const b = billing.data;
                      if (!b) return <p className="text-sm text-muted-foreground">No billing data.</p>;
                      const fmt = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
                      return (
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span>Total Revenue ({b.period.days} days)</span>
                            <span className="font-semibold">{fmt(b.summary.totalRevenueCents)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pending</span>
                            <span className="font-semibold text-yellow-600">{fmt(b.summary.pendingCents)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Refunds</span>
                            <span className="font-semibold text-red-600">{fmt(b.summary.refundCents)}</span>
                          </div>
                          <div className="pt-2 text-sm text-muted-foreground">
                            {b.summary.completedCount} completed • {b.summary.pendingCount} pending • {b.summary.transactionCount} total
                          </div>
                        </div>
                      );
                    })()
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
                  ) : !billing.data?.transactions?.length ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No transactions in this period</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {billing.data.transactions.map((tx) => {
                        const patientName = (tx.metadata as any)?.patient_name || (tx.metadata as any)?.customer_name || "—";
                        const fmt = `$${(Number(tx.amount_cents || 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
                        const status = String(tx.status || "");
                        const statusLower = status.toLowerCase();
                        const isPaid = statusLower === "completed" || statusLower === "paid";
                        const isPending = statusLower === "pending";
                        const badgeVariant = isPaid ? "default" : isPending ? "outline" : "secondary";

                        return (
                          <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{patientName}</p>
                              <p className="text-sm text-muted-foreground">{format(new Date(tx.created_at), "MMM dd, yyyy")}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{fmt}</p>
                              <Badge variant={badgeVariant}>{status}</Badge>
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
                      <p className="text-sm font-medium text-muted-foreground">Revenue ({analytics.data.period.days}d)</p>
                      <p className="text-2xl font-bold">
                        ${(analytics.data.kpis.totalRevenueCents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{analytics.data.kpis.revenueChangePct}% vs prev</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-muted-foreground">Appointments</p>
                      <p className="text-2xl font-bold">{analytics.data.kpis.totalAppointments}</p>
                      <p className="text-xs text-muted-foreground mt-1">{analytics.data.kpis.appointmentsChangePct}% vs prev</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-muted-foreground">Patients</p>
                      <p className="text-2xl font-bold">{analytics.data.kpis.uniquePatients}</p>
                      <p className="text-xs text-muted-foreground mt-1">{analytics.data.kpis.patientsChangePct}% vs prev</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-muted-foreground">Completion rate</p>
                      <p className="text-2xl font-bold">{analytics.data.kpis.completionRatePct}%</p>
                      <p className="text-xs text-muted-foreground mt-1">{analytics.data.kpis.completedAppointments} completed</p>
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
                          <AreaChart data={(analytics.data.dailyTrend || []) as DailyTrendPoint[]} margin={{ top: 8, left: 8, right: 8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
                            <YAxis tickLine={false} axisLine={false} />
                            <Tooltip
                              formatter={(value: any, name: any) => {
                                if (name === "revenue_cents") return [`$${(Number(value) / 100).toFixed(2)}`, "Revenue"];
                                if (name === "completed") return [value, "Completed"];
                                return [value, "Bookings"];
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
                            <span className="font-semibold">{analytics.data.kpis.averageRating.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Patient Retention (180d)</span>
                          <span className="font-semibold">{analytics.data.kpis.patientRetentionPct}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>No-show / Cancel rate</span>
                          <span className="font-semibold">{analytics.data.kpis.noShowRatePct}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Completed</span>
                          <span className="font-semibold">{analytics.data.kpis.completedAppointments}</span>
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
            <div className="-m-6">
              <EntitySettingsPage entityType="practice" entityId={practice?.id || ""} heading="Practice Settings" />
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
                    Status: <span className="font-medium">{t(`admin.verification.statuses.${verificationStatus}`)}</span>
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
                          {verificationStatus === "rejected" ? t("admin.verification.resubmit") : t("admin.verification.verifyPractice")}
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
        <InviteStaffModal open={allowModals && inviteStaffOpen} onOpenChange={setInviteStaffOpen} practiceId={practice?.id || ""} />
        <AddLocationModal open={allowModals && addLocationOpen} onOpenChange={setAddLocationOpen} />

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

        <VerificationSuccessModal open={verificationModalOpen} onOpenChange={handleVerificationModalClose} practiceName={practice?.name || "Your Practice"} />
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
