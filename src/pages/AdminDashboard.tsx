// File: src/pages/AdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import JoinRequestsSection from "@/components/dashboard/JoinRequestsSection";

import { supabase } from "@/integrations/supabase/client";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { useAdvancedFinancialMetrics } from "@/hooks/useAdvancedFinancialMetrics";
import AdvancedFinancialMetrics from "@/components/financial/AdvancedFinancialMetrics";
import EntitySettingsPage from "@/components/settings/EntitySettingsPage";
import FinanceManagementSection from "@/components/financial/FinanceManagementSection";
import ClinicStaffManager from "@/components/clinic/ClinicStaffManager";
import BranchSelector from "@/components/shared/BranchSelector";
import { useVerificationStatus } from "@/hooks/useVerificationStatus";
import { usePracticeInsights, type DailyTrendPoint } from "@/hooks/usePracticeInsights";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Percent,
  Phone,
  Plus,
  Sliders,
  Star,
  Settings,
  Stethoscope,
  Trash2,
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
  const { t } = useTranslation("dashboard");
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
              {t("lockedOverlay.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("lockedOverlay.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestVerify();
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {t("lockedOverlay.startVerification")}
              </Button>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.info(t("lockedOverlay.browseInfo"));
                }}
              >
                {t("lockedOverlay.okay")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SectionWrapper({ children, locked, onRequestVerify, message }: { children: React.ReactNode; locked: boolean; onRequestVerify?: () => void; message?: string }) {
  const { t } = useTranslation("dashboard");
  const defaultMessage = t("lockedOverlay.featureLocked");
  return (
    <div className="relative">
      {children}
      {locked && onRequestVerify && (
        <LockedOverlay onRequestVerify={onRequestVerify} message={message || defaultMessage} />
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

  // Provider section state
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [providerTab, setProviderTab] = useState<'overview' | 'calendar' | 'patients' | 'analytics' | 'procedures' | 'reviews' | 'documents'>('overview');
  const [providerSearch, setProviderSearch] = useState('');
  const [providerStatusFilter, setProviderStatusFilter] = useState('all');
  const [providerSpecialtyFilter, setProviderSpecialtyFilter] = useState('all');

  // Patient section state
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientTab, setPatientTab] = useState<'overview' | 'appointments' | 'billing' | 'documents' | 'notes' | 'activity'>('overview');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientStatusFilter, setPatientStatusFilter] = useState('all');
  const [patientProviderFilter, setPatientProviderFilter] = useState('all');
  const [patientApptFilter, setPatientApptFilter] = useState('all');

  // Billing section state
  const [billingTab, setBillingTab] = useState<'overview' | 'invoices' | 'transactions' | 'insurance' | 'settings'>('overview');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');

  // Services section state
  const [serviceTab, setServiceTab] = useState<'catalog' | 'pricing' | 'categories' | 'analytics'>('catalog');
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('all');
  const [selectedServiceId, setSelectedServiceId] = useState<any>(null);

  // Finance section state
  const [financeTab, setFinanceTab] = useState<'overview' | 'ledger' | 'compensation' | 'recurring' | 'categories' | 'export'>('overview');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'income' | 'expense' | 'payroll'>('all');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState('all');
  const [ledgerFrom, setLedgerFrom] = useState('');
  const [ledgerTo, setLedgerTo] = useState('');
  const [financeEntries, setFinanceEntries] = useState<any[]>([]);
  const [financeCategories, setFinanceCategories] = useState<string[]>([]);
  const [compensationProfiles, setCompensationProfiles] = useState<any[]>([]);
  const [recurringRules, setRecurringRules] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('blue');
  const [ledgerAddOpen, setLedgerAddOpen] = useState(false);
  const [ledgerFormDate, setLedgerFormDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [ledgerFormType, setLedgerFormType] = useState<'expense' | 'income' | 'payroll'>('expense');
  const [ledgerFormCurrency, setLedgerFormCurrency] = useState('USD');
  const [ledgerFormAmount, setLedgerFormAmount] = useState('');
  const [ledgerFormCategory, setLedgerFormCategory] = useState('');
  const [ledgerFormRef, setLedgerFormRef] = useState('');
  const [ledgerFormDesc, setLedgerFormDesc] = useState('');
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'appointments' | 'providers' | 'patients' | 'financial' | 'services'>('overview');

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

  const lockMessage = t("lockedOverlay.featureLocked");

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
           <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6">
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
          <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6">
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
        <main className="flex-1 p-4 sm:p-6">
          <div className="grid min-h-[calc(100vh-7rem)] grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="rounded-2xl lg:col-span-8">
              <CardContent className="flex h-full min-h-[420px] flex-col justify-between p-6 sm:p-8 lg:p-10">
                <div className="space-y-5">
                  <div className="inline-flex w-fit items-center rounded-full border border-border bg-muted px-3 py-1 text-sm text-muted-foreground">
                    {t("setupScreen.title")}
                  </div>
                  <div className="space-y-3">
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{t("setupScreen.title")}</h1>
                    <p className="max-w-3xl text-base text-muted-foreground sm:text-lg lg:text-xl">
                      {t("setupScreen.description")}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="text-sm font-medium">Providers</p>
                    <p className="mt-2 text-sm text-muted-foreground">Invite doctors and review incoming applications.</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="text-sm font-medium">Operations</p>
                    <p className="mt-2 text-sm text-muted-foreground">Run staff, services, locations, appointments, and patients.</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="text-sm font-medium">Finance</p>
                    <p className="mt-2 text-sm text-muted-foreground">Track billing, revenue, and settings once your practice is active.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button onClick={() => setCreateClinicOpen(true)} className="sm:w-auto">
                    <Building2 className="h-4 w-4 mr-2" />
                    {t("setupScreen.createPractice")}
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/register-practice")} className="sm:w-auto">
                    {t("setupScreen.registerPractice")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:col-span-4 lg:grid-rows-2">
              <Card className="rounded-2xl h-full">
                <CardHeader>
                  <CardTitle className="text-base">Providers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Invite doctors and review incoming applications from professionals who want to join your practice.</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl h-full">
                <CardHeader>
                  <CardTitle className="text-base">Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Manage staff, services, locations, appointments, patients, billing, and settings from one workspace.</p>
                </CardContent>
              </Card>
            </div>
          </div>
          <CreateClinicModal open={createClinicOpen} onOpenChange={setCreateClinicOpen} onSuccess={() => refreshData()} />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6">
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
  const sectionShellClass = "w-full min-w-0";
  const sectionMainGridClass = "grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start";
  const sectionInsightGridClass = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 mt-6 items-start";

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <Card className="rounded-xl lg:col-span-8 min-w-0">
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

              <Card className="rounded-xl lg:col-span-4 min-w-0">
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

            <div className={sectionInsightGridClass}>
              <Card className="rounded-xl lg:col-span-4 min-w-0">
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

              <Card className="rounded-xl lg:col-span-4 min-w-0">
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

              <Card className="rounded-xl lg:col-span-4 min-w-0">
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

            <div className={sectionMainGridClass}>
              <Card className="rounded-xl lg:col-span-8 min-w-0">
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

              <Card className="rounded-xl lg:col-span-4 min-w-0">
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
                      {t("adminBilling.refresh")}
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

      case "providers": {
        const avatarColors = [
          'bg-primary', 'bg-accent', 'bg-secondary',
          'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
        ];
        const avatarBgClasses = ['bg-primary', 'bg-accent', 'bg-destructive', 'bg-secondary'];
        const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

        const uniqueSpecialties = Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean)));

        const filteredDoctors = doctors.filter(d => {
          const matchSearch = providerSearch === '' ||
            d.name?.toLowerCase().includes(providerSearch.toLowerCase()) ||
            d.specialty?.toLowerCase().includes(providerSearch.toLowerCase()) ||
            d.email?.toLowerCase().includes(providerSearch.toLowerCase());
          const matchStatus = providerStatusFilter === 'all' || d.status === providerStatusFilter;
          const matchSpecialty = providerSpecialtyFilter === 'all' || d.specialty === providerSpecialtyFilter;
          return matchSearch && matchStatus && matchSpecialty;
        });

        const statusColor = (status: string) => {
          if (status === 'active') return 'bg-green-500/10 text-green-700 border-green-200';
          if (status === 'pending') return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
          return 'bg-red-500/10 text-red-700 border-red-200';
        };

        // Provider profile helpers
        const providerAppointments = selectedProvider
          ? appointments.filter(a => a.doctor_id === selectedProvider.id || a.doctor_name === selectedProvider.name)
          : [];
        const providerUniquePatients = selectedProvider
          ? new Set(providerAppointments.map(a => a.patient_id).filter(Boolean))
          : new Set();

        const providerTabs: Array<{ key: typeof providerTab; label: string }> = [
          { key: 'overview', label: 'Overview' },
          { key: 'calendar', label: 'Calendar' },
          { key: 'patients', label: 'Patients' },
          { key: 'analytics', label: 'Analytics' },
          { key: 'procedures', label: 'Procedures' },
          { key: 'reviews', label: 'Reviews' },
          { key: 'documents', label: 'Documents' },
        ];

        // PROFILE VIEW
        if (selectedProvider) {
          const completed = providerAppointments.filter(a => a.status === 'completed').length;
          const pending = providerAppointments.filter(a => a.status === 'pending').length;
          const cancelled = providerAppointments.filter(a => a.status === 'cancelled').length;
          const noShow = providerAppointments.filter(a => a.status === 'no_show').length;
          const total = providerAppointments.length;

          return (
            <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
              <div className={sectionShellClass}>
                {/* Back button */}
                <Button variant="ghost" className="mb-4 -ml-2" onClick={() => setSelectedProvider(null)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("admin.providers.title")}
                </Button>

                {/* Profile header */}
                <Card className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-start gap-6">
                      <div className={`h-20 w-20 rounded-full ${avatarBgClasses[0]} text-primary-foreground flex items-center justify-center text-2xl font-bold shrink-0`}>
                        {getInitials(selectedProvider.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold">{selectedProvider.name}</h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary">{selectedProvider.specialty || 'General'}</Badge>
                          <Badge className={statusColor(selectedProvider.status || 'pending')} variant="outline">
                            {selectedProvider.status || 'pending'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          {selectedProvider.email && (
                            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selectedProvider.email}</span>
                          )}
                          {selectedProvider.phone && (
                            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selectedProvider.phone}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap shrink-0">
                        <Button variant="outline" size="sm" onClick={() => guard(() => toast.info('Edit provider coming soon'))} disabled={!allowModals}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => guard(() => toast.info('Suspend coming soon'))} disabled={!allowModals}>Suspend</Button>
                        <Button variant="outline" size="sm" onClick={() => guard(() => toast.info('Message coming soon'))} disabled={!allowModals}>
                          <MessageCircle className="h-4 w-4 mr-1" /> Message
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tab bar */}
                <div className="flex gap-1 border-b border-border mb-6 mt-6 overflow-x-auto">
                  {providerTabs.map(tab => (
                    <Button
                      key={tab.key}
                      variant="ghost"
                      className={`rounded-none ${providerTab === tab.key ? 'border-b-2 border-primary font-medium' : ''}`}
                      onClick={() => setProviderTab(tab.key)}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>

                {/* Tab content */}
                {providerTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Personal Info */}
                      <Card className="rounded-xl lg:col-span-8">
                        <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                              ['Full Name', selectedProvider.name],
                              ['Specialty', selectedProvider.specialty],
                              ['Email', selectedProvider.email],
                              ['Phone', selectedProvider.phone],
                              ['License Number', selectedProvider.license_number],
                              ['Languages', Array.isArray(selectedProvider.languages) ? selectedProvider.languages.join(', ') : selectedProvider.languages],
                            ].map(([label, value]) => (
                              <div key={label as string}>
                                <p className="text-sm text-muted-foreground">{label}</p>
                                <p className="font-medium">{value || '—'}</p>
                              </div>
                            ))}
                          </div>
                          <Button variant="outline" className="mt-4" onClick={() => toast.info('Edit coming soon')}>Edit Info</Button>
                        </CardContent>
                      </Card>
                      {/* Quick Stats */}
                      <Card className="rounded-xl lg:col-span-4">
                        <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total Appointments</span><span className="font-bold">{total}</span></div>
                          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Patients Seen</span><span className="font-bold">{providerUniquePatients.size}</span></div>
                          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Rating</span><span className="font-bold flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" />{selectedProvider.rating || '—'}</span></div>
                          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Member Since</span><span className="font-bold">{selectedProvider.created_at ? format(new Date(selectedProvider.created_at), 'MMM yyyy') : '—'}</span></div>
                        </CardContent>
                      </Card>
                    </div>
                    {/* Activity Summary */}
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>Activity Summary</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[
                            { label: 'Pending', count: pending, color: 'text-yellow-600' },
                            { label: 'Completed', count: completed, color: 'text-green-600' },
                            { label: 'Cancelled', count: cancelled, color: 'text-red-600' },
                            { label: 'No-show', count: noShow, color: 'text-orange-600' },
                          ].map(s => (
                            <div key={s.label} className="text-center p-4 bg-muted/30 rounded-lg border border-border">
                              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                              <p className="text-sm text-muted-foreground">{s.label}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {providerTab === 'calendar' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Schedule & Availability</h3>
                      <Button variant="outline" onClick={() => guard(() => toast.info('Block time coming soon'))} disabled={!allowModals}>
                        <Clock className="h-4 w-4 mr-2" /> Block Time
                      </Button>
                    </div>
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle className="text-base">Working Hours</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                            <div key={day} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                              <span className="text-sm font-medium w-24">{day}</span>
                              <Badge variant="secondary">Open</Badge>
                              <span className="text-sm text-muted-foreground">09:00 – 17:00</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">Edit working hours coming soon</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle className="text-base">Upcoming Appointments</CardTitle></CardHeader>
                      <CardContent>
                        {(() => {
                          const today = new Date().toISOString().split('T')[0];
                          const upcoming = providerAppointments
                            .filter(a => a.status !== 'cancelled' && a.appointment_date >= today)
                            .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))
                            .slice(0, 10);
                          if (upcoming.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No upcoming appointments</p>;
                          return (
                            <div className="space-y-2">
                              {upcoming.map(a => (
                                <div key={a.id} className="grid grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg border border-border items-center text-sm">
                                  <span>{a.appointment_date} {a.start_time}</span>
                                  <span className="truncate">{a.patient_name || 'Unknown'}</span>
                                  <span className="truncate">{a.service_name || '—'}</span>
                                  <Badge variant="outline" className="w-fit">{a.status}</Badge>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        <p className="text-xs text-muted-foreground mt-3">Full calendar view coming soon</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {providerTab === 'patients' && (() => {
                  const patientMap = new Map<string, { name: string; lastVisit: string; totalVisits: number; lastService: string }>();
                  providerAppointments.forEach(a => {
                    const pid = a.patient_id || a.patient_name || 'unknown';
                    const existing = patientMap.get(pid);
                    if (!existing || a.appointment_date > existing.lastVisit) {
                      patientMap.set(pid, {
                        name: a.patient_name || 'Unknown',
                        lastVisit: a.appointment_date,
                        totalVisits: (existing?.totalVisits || 0) + 1,
                        lastService: a.service_name || '—',
                      });
                    } else {
                      existing.totalVisits += 1;
                    }
                  });
                  const patientList = Array.from(patientMap.values());
                  const filteredPatients = providerSearch
                    ? patientList.filter(p => p.name.toLowerCase().includes(providerSearch.toLowerCase()))
                    : patientList;
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{t("admin.providers.listTitle")}</h3>
                          <Badge variant="secondary">{patientList.length}</Badge>
                        </div>
                      </div>
                      <Input placeholder="Search patients…" value={providerSearch} onChange={e => setProviderSearch(e.target.value)} className="max-w-sm" />
                      <Card className="rounded-xl">
                        <CardContent className="pt-6">
                          {filteredPatients.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">No patients found</p>
                          ) : (
                            <div className="space-y-2">
                              <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground px-3 pb-2 border-b border-border">
                                <span>Patient Name</span><span>Last Visit</span><span>Total Visits</span><span>Last Service</span><span></span>
                              </div>
                              {filteredPatients.map((p, i) => (
                                <div key={i} className="grid grid-cols-5 gap-2 p-3 bg-muted/30 rounded-lg border border-border items-center text-sm">
                                  <span className="font-medium truncate">{p.name}</span>
                                  <span>{p.lastVisit}</span>
                                  <span>{p.totalVisits}</span>
                                  <span className="truncate">{p.lastService}</span>
                                  <Button variant="outline" size="sm" onClick={() => toast.info('Full patient profile coming soon')}>View</Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}

                {providerTab === 'analytics' && (() => {
                  const total2 = providerAppointments.length;
                  const completed2 = providerAppointments.filter(a => a.status === 'completed').length;
                  const cancelled2 = providerAppointments.filter(a => a.status === 'cancelled').length;
                  const completionRate = total2 > 0 ? (completed2 / total2 * 100).toFixed(0) : '0';
                  const cancellationRate = total2 > 0 ? (cancelled2 / total2 * 100).toFixed(0) : '0';

                  // Group by month
                  const monthMap: Record<string, number> = {};
                  providerAppointments.forEach(a => {
                    const m = a.appointment_date?.slice(0, 7);
                    if (m) monthMap[m] = (monthMap[m] || 0) + 1;
                  });
                  const chartData = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));

                  const statusBreakdown = [
                    { label: 'Completed', count: completed2, color: 'bg-green-500', pct: total2 > 0 ? (completed2 / total2 * 100) : 0 },
                    { label: 'Pending', count: pending, color: 'bg-yellow-500', pct: total2 > 0 ? (pending / total2 * 100) : 0 },
                    { label: 'Cancelled', count: cancelled2, color: 'bg-red-500', pct: total2 > 0 ? (cancelled2 / total2 * 100) : 0 },
                    { label: 'No-show', count: noShow, color: 'bg-orange-500', pct: total2 > 0 ? (noShow / total2 * 100) : 0 },
                  ];

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { label: 'Total Appointments', value: total2 },
                          { label: 'Unique Patients', value: providerUniquePatients.size },
                          { label: 'Completion Rate', value: `${completionRate}%` },
                          { label: 'Cancellation Rate', value: `${cancellationRate}%` },
                        ].map(k => (
                          <Card key={k.label} className="rounded-xl">
                            <CardContent className="pt-6">
                              <p className="text-2xl font-bold">{k.value}</p>
                              <p className="text-sm text-muted-foreground">{k.label}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <Card className="rounded-xl">
                        <CardHeader><CardTitle className="text-base">Appointments Over Time</CardTitle></CardHeader>
                        <CardContent>
                          {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                              <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-6">No appointment data</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="rounded-xl">
                        <CardHeader><CardTitle className="text-base">Status Breakdown</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          {statusBreakdown.map(s => (
                            <div key={s.label}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{s.label}</span>
                                <span className="font-medium">{s.count}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card className="rounded-xl">
                        <CardHeader><CardTitle className="text-base">Performance Indicators</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              { label: 'Average Rating', value: selectedProvider.rating ? `${selectedProvider.rating} ★` : 'No ratings yet' },
                              { label: 'Patient Retention', value: 'Coming soon' },
                              { label: 'Utilization Rate', value: 'Coming soon' },
                              { label: 'On-time Rate', value: 'Coming soon' },
                            ].map(p => (
                              <div key={p.label} className="p-3 bg-muted/30 rounded-lg border border-border">
                                <p className="text-sm text-muted-foreground">{p.label}</p>
                                <p className="font-medium">{p.value}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}

                {providerTab === 'procedures' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Services & Procedures</h3>
                      <p className="text-sm text-muted-foreground">Services this provider performs. Set individual fees and toggle availability.</p>
                    </div>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        {services.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">No services configured</p>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground px-3 pb-2 border-b border-border">
                              <span>Service Name</span><span>Category</span><span>Base Price</span><span>Provider Fee</span><span>Offered</span>
                            </div>
                            {services.map((svc: any) => (
                              <div key={svc.id} className="grid grid-cols-5 gap-2 p-3 bg-muted/30 rounded-lg border border-border items-center text-sm">
                                <span className="font-medium truncate">{svc.name}</span>
                                <Badge variant="outline">{svc.category || '—'}</Badge>
                                <span>{svc.price ? `$${svc.price}` : '—'}</span>
                                <Input placeholder="Custom fee" className="h-8" onBlur={() => toast.info('Save fee coming soon')} />
                                <Badge variant="secondary">Active</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-3">Pricing overrides will be saved in a future update</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {providerTab === 'reviews' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Patient Reviews</h3>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        <span className="text-lg font-bold">{selectedProvider.rating || '—'}</span>
                      </div>
                    </div>
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle className="text-base">Rating Breakdown</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {[5, 4, 3, 2, 1].map(stars => (
                          <div key={stars} className="flex items-center gap-3">
                            <span className="text-sm w-8">{stars}★</span>
                            <div className="flex-1 h-2 bg-muted rounded-full" />
                            <span className="text-sm text-muted-foreground w-6 text-right">0</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <div className="text-center py-8 text-muted-foreground">
                          <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="font-medium">No reviews yet for this provider</p>
                          <p className="text-sm mt-1">Patient reviews will appear here</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {providerTab === 'documents' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Documents & Credentials</h3>
                      <Button variant="outline" onClick={() => guard(() => toast.info('Upload coming soon'))} disabled={!allowModals}>
                        <FileText className="h-4 w-4 mr-2" /> Upload Document
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['License & Certifications', 'Contracts', 'Other'].map(cat => (
                        <Card key={cat} className="rounded-xl">
                          <CardHeader><CardTitle className="text-base">{cat}</CardTitle></CardHeader>
                          <CardContent>
                            <div className="text-center py-6 text-muted-foreground">
                              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No documents yet</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Document upload and management coming in a future update.</p>
                  </div>
                )}
              </div>
            </SectionWrapper>
          );
        }

        // DIRECTORY VIEW
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className={sectionShellClass}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-xl font-semibold">{t("admin.providers.title")}</h2>
                <Button onClick={() => guard(() => setInviteProviderOpen(true))} disabled={!allowModals}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t("admin.providers.invite")}
                </Button>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <Card className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{doctors.length}</div>
                    <p className="text-sm text-muted-foreground">{t("admin.providers.listTitle")}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{doctors.filter(d => d.status === "active").length}</div>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{doctors.filter(d => d.status !== "active").length}</div>
                    <p className="text-sm text-muted-foreground">Pending / Inactive</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{new Set(doctors.map(d => d.specialty).filter(Boolean)).size}</div>
                    <p className="text-sm text-muted-foreground">Specialties</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-6">
                <Input
                  placeholder="Search by name, specialty or email…"
                  value={providerSearch}
                  onChange={e => setProviderSearch(e.target.value)}
                  className="max-w-xs"
                />
                <div className="flex gap-1 flex-wrap">
                  {['all', 'active', 'pending', 'inactive'].map(s => (
                    <Button
                      key={s}
                      variant={providerStatusFilter === s ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setProviderStatusFilter(s)}
                    >
                      {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </Button>
                  ))}
                </div>
                <select
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                  value={providerSpecialtyFilter}
                  onChange={e => setProviderSpecialtyFilter(e.target.value)}
                >
                  <option value="all">All Specialties</option>
                  {uniqueSpecialties.map(sp => (
                    <option key={sp} value={sp}>{sp}</option>
                  ))}
                </select>
              </div>

              {/* Provider grid */}
              {filteredDoctors.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground mt-6">
                  <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">{t("admin.providers.emptyTitle")}</p>
                  <p className="text-sm mt-1">{t("admin.providers.emptyDescription")}</p>
                  <Button className="mt-4" onClick={() => guard(() => setInviteProviderOpen(true))} disabled={!allowModals}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t("admin.providers.invite")}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {filteredDoctors.map((doctor, idx) => (
                    <Card key={doctor.id} className="rounded-xl">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className={`h-12 w-12 rounded-full ${avatarBgClasses[idx % avatarBgClasses.length]} text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0`}>
                            {getInitials(doctor.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{doctor.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{doctor.specialty || 'General'}</p>
                            <p className="text-xs text-muted-foreground truncate">{doctor.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <Badge className={statusColor(doctor.status || 'pending')} variant="outline">
                            {doctor.status || 'pending'}
                          </Badge>
                          <span className="flex items-center gap-1 text-sm">
                            <Star className="h-3.5 w-3.5 text-yellow-500" />
                            {doctor.rating || '—'}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full mt-4"
                          onClick={() => { setSelectedProvider(doctor); setProviderTab('overview'); }}
                        >
                          View Profile
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Pending join requests */}
              {practice?.id && (
                <div className="mt-6">
                  <JoinRequestsSection practiceId={practice.id} />
                </div>
              )}

              {/* Pending invitations */}
              {practice?.id && (
                <div className="mt-6">
                  <PendingInvitationsSection practiceId={practice.id} />
                </div>
              )}
            </div>
          </SectionWrapper>
        );
      }

      case "services": {
        const svcTabs = [
          { key: 'catalog' as const, label: 'Catalog' },
          { key: 'pricing' as const, label: 'Pricing Rules' },
          { key: 'categories' as const, label: 'Categories' },
          { key: 'analytics' as const, label: 'Analytics' },
        ];
        const uniqueCategories = Array.from(new Set(services.map(s => s.category).filter(Boolean)));
        const filteredServices = services.filter(s => {
          const matchSearch = !serviceSearch || s.name?.toLowerCase().includes(serviceSearch.toLowerCase()) || s.category?.toLowerCase().includes(serviceSearch.toLowerCase());
          const matchCat = serviceCategoryFilter === 'all' || s.category === serviceCategoryFilter;
          return matchSearch && matchCat;
        });
        const catColors = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(38 92% 50%)', 'hsl(280 68% 60%)', 'hsl(0 84% 60%)'];
        const catColorsTW = ['bg-primary', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-red-500'];

        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className={sectionShellClass}>
              {/* Header */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-xl font-semibold">{t("admin.services.title")}</h2>
                <Button onClick={() => guard(() => setAddServiceOpen(true))} disabled={!allowModals}>
                  <Building2 className="h-4 w-4 mr-2" />
                  {t("admin.services.add")}
                </Button>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <Card className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{services.length}</div>
                    <p className="text-sm text-muted-foreground">Total Services</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {services.length > 0
                        ? `$${Math.round(services.reduce((sum, s) => sum + (s.price || 0), 0) / services.length)}`
                        : "$0"}
                    </div>
                    <p className="text-sm text-muted-foreground">Avg. Price</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {new Set(services.map(s => s.category)).size}
                    </div>
                    <p className="text-sm text-muted-foreground">Categories</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      ${services.reduce((sum, s) => sum + (s.price || 0), 0).toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">Revenue Potential</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 border-b border-border mb-6 mt-6 overflow-x-auto">
                {svcTabs.map(tab => (
                  <Button
                    key={tab.key}
                    variant="ghost"
                    size="sm"
                    className={`rounded-none border-b-2 ${serviceTab === tab.key ? 'border-primary font-medium' : 'border-transparent text-muted-foreground'}`}
                    onClick={() => setServiceTab(tab.key)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              {/* ============ TAB: CATALOG ============ */}
              {serviceTab === 'catalog' && (
                <>
                  {/* Filters */}
                  <div className="flex gap-3 flex-wrap mb-4">
                    <input
                      type="text"
                      placeholder="Search services…"
                      value={serviceSearch}
                      onChange={e => setServiceSearch(e.target.value)}
                      className="px-3 py-2 border border-border rounded-lg bg-background text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <select
                      value={serviceCategoryFilter}
                      onChange={e => setServiceCategoryFilter(e.target.value)}
                      className="px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="all">All Categories</option>
                      {uniqueCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className={sectionMainGridClass}>
                    <Card className="rounded-xl lg:col-span-8 min-w-0">
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
                        ) : filteredServices.length === 0 ? (
                          <div className="text-center py-10 text-muted-foreground">
                            <Filter className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No services match your search.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {filteredServices.map((service) => (
                              <div
                                key={service.id}
                                className="grid grid-cols-1 sm:grid-cols-6 gap-2 p-4 bg-muted/30 rounded-xl border border-border items-center"
                              >
                                <div className="font-medium truncate sm:col-span-1">{service.name}</div>
                                <div className="sm:col-span-1">
                                  <Badge variant="secondary" className="text-xs">{service.category || 'Uncategorized'}</Badge>
                                </div>
                                <div className="text-sm text-muted-foreground sm:col-span-1">
                                  {service.duration ? `${service.duration} min` : '—'}
                                </div>
                                <div className="font-semibold sm:col-span-1">${service.price}</div>
                                <div className="sm:col-span-1">
                                  {(service as any).is_online !== false ? (
                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">Online</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">Offline</Badge>
                                  )}
                                </div>
                                <div className="flex items-center justify-end gap-2 sm:col-span-1">
                                  <Button variant="outline" size="icon" onClick={() => guard(() => toast.info('Edit service coming soon'))} disabled={!allowModals}>
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="icon" onClick={() => guard(() => toast.info('Archive service coming soon'))} disabled={!allowModals}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Category Breakdown sidebar */}
                    <Card className="rounded-xl lg:col-span-4 min-w-0">
                      <CardHeader>
                        <CardTitle>Category Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {services.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No services yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(
                              services.reduce((acc, s) => {
                                const cat = s.category || "Uncategorized";
                                acc[cat] = (acc[cat] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>)
                            ).map(([category, count]) => (
                              <div key={category} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                <span className="text-sm font-medium">{category}</span>
                                <Badge variant="secondary">{count as number} service{(count as number) !== 1 ? "s" : ""}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Insight cards */}
                  <div className={sectionInsightGridClass}>
                    <Card className="rounded-xl lg:col-span-4 min-w-0">
                      <CardHeader>
                        <CardTitle className="text-base">Pricing Overview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-sm font-medium">Lowest Price</span>
                            <span className="text-lg font-bold">
                              {services.length > 0 ? `$${Math.min(...services.map(s => s.price || 0))}` : "$0"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-sm font-medium">Highest Price</span>
                            <span className="text-lg font-bold">
                              {services.length > 0 ? `$${Math.max(...services.map(s => s.price || 0))}` : "$0"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-sm font-medium">Average Price</span>
                            <span className="text-lg font-bold">
                              {services.length > 0 ? `$${Math.round(services.reduce((sum, s) => sum + (s.price || 0), 0) / services.length)}` : "$0"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-sm font-medium">Total Revenue Potential</span>
                            <span className="text-lg font-bold">
                              ${services.reduce((sum, s) => sum + (s.price || 0), 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl lg:col-span-4 min-w-0">
                      <CardHeader>
                        <CardTitle className="text-base">Top Categories</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {(() => {
                            const catCounts = services.reduce((acc, s) => {
                              const cat = s.category || "Uncategorized";
                              acc[cat] = (acc[cat] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>);
                            const sorted = Object.entries(catCounts).sort(([, a], [, b]) => (b as number) - (a as number));
                            return sorted.length > 0 ? sorted.slice(0, 5).map(([cat, count], i) => (
                              <div key={cat} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                                  <span className="text-sm font-medium">{cat}</span>
                                </div>
                                <Badge variant="outline">{count as number}</Badge>
                              </div>
                            )) : (
                              <p className="text-sm text-muted-foreground">No categories yet</p>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl lg:col-span-4 min-w-0">
                      <CardHeader>
                        <CardTitle className="text-base">Service Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-sm font-medium">Total Services</span>
                            <span className="text-lg font-bold">{services.length}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-sm font-medium">Categories</span>
                            <span className="text-lg font-bold">{new Set(services.map(s => s.category)).size}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-sm font-medium">Avg. per Category</span>
                            <span className="text-lg font-bold">
                              {(() => {
                                const catCount = new Set(services.map(s => s.category)).size;
                                return catCount > 0 ? (services.length / catCount).toFixed(1) : "0";
                              })()}
                            </span>
                          </div>
                          {services.length > 0 && (
                            <div className="pt-2">
                              <h4 className="text-xs font-medium text-muted-foreground mb-2">Recently Added</h4>
                              {services.slice(0, 3).map(s => (
                                <div key={s.id} className="text-sm p-2 bg-muted/20 rounded-md border border-border mb-1">
                                  <span className="font-medium">{s.name}</span>
                                  <span className="text-muted-foreground ml-2">${s.price}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* ============ TAB: PRICING RULES ============ */}
              {serviceTab === 'pricing' && (
                <>
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                    <h3 className="text-lg font-semibold">Pricing Rules</h3>
                    <Button variant="outline" size="sm" onClick={() => guard(() => toast.info('Add pricing rule coming soon'))} disabled={!allowModals}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Add Rule
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">Fixed Price</h4>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">One set price applies to all providers for this service.</p>
                        <Badge variant="secondary">{services.length} services</Badge>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Settings className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">Provider Pricing</h4>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">Each provider sets their own fee for the service.</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">0 services</Badge>
                          <Button size="sm" variant="outline" onClick={() => toast.info('Variable pricing coming soon')}>Enable</Button>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">Deposit Requirements</h4>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">Require a deposit % or fixed amount upfront for specific services.</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">0 rules active</Badge>
                          <Button size="sm" variant="outline" onClick={() => toast.info('Deposit rules coming soon')}>Configure</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>Service Price List</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {services.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No services yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border text-left">
                                <th className="pb-2 font-medium text-muted-foreground">Service</th>
                                <th className="pb-2 font-medium text-muted-foreground">Category</th>
                                <th className="pb-2 font-medium text-muted-foreground">Duration</th>
                                <th className="pb-2 font-medium text-muted-foreground">Price</th>
                                <th className="pb-2 font-medium text-muted-foreground">Type</th>
                                <th className="pb-2 font-medium text-muted-foreground">Deposit</th>
                                <th className="pb-2 font-medium text-muted-foreground"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {services.map(s => (
                                <tr key={s.id} className="border-b border-border/50">
                                  <td className="py-3 font-medium">{s.name}</td>
                                  <td className="py-3"><Badge variant="secondary" className="text-xs">{s.category || 'Uncategorized'}</Badge></td>
                                  <td className="py-3 text-muted-foreground">{s.duration ? `${s.duration} min` : '—'}</td>
                                  <td className="py-3 font-semibold">${s.price}</td>
                                  <td className="py-3"><Badge variant="outline" className="text-xs">Fixed</Badge></td>
                                  <td className="py-3"><Badge variant="secondary" className="text-xs">None</Badge></td>
                                  <td className="py-3 text-right">
                                    <Button variant="ghost" size="sm" onClick={() => guard(() => toast.info('Edit price coming soon'))} disabled={!allowModals}>Edit</Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-4">To set provider-specific fees, go to the Providers section → select a provider → Procedures tab.</p>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ============ TAB: CATEGORIES ============ */}
              {serviceTab === 'categories' && (
                <>
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                    <h3 className="text-lg font-semibold">Service Categories</h3>
                  </div>

                  <Card className="rounded-xl mb-6">
                    <CardHeader>
                      <CardTitle className="text-base">Create Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3 items-center flex-wrap">
                        <input
                          type="text"
                          placeholder="e.g. Consultation, Diagnostics…"
                          className="px-3 py-2 border border-border rounded-lg bg-background text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <div className="flex gap-2">
                          {catColorsTW.map((c, i) => (
                            <button key={i} className={`h-7 w-7 rounded-full ${c} border-2 border-background ring-1 ring-border hover:ring-primary transition-all`} />
                          ))}
                        </div>
                        <Button size="sm" onClick={() => guard(() => toast.info('Save category coming soon'))} disabled={!allowModals}>Add</Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">Set a consistent naming convention so reports are clean (e.g. "Diagnostics: Blood Work", "Diagnostics: Imaging").</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl mb-6">
                    <CardHeader>
                      <CardTitle className="text-base">Your Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {uniqueCategories.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No categories yet. Add one above.</p>
                      ) : (
                        <div className="space-y-2">
                          {uniqueCategories.map((cat, i) => {
                            const count = services.filter(s => s.category === cat).length;
                            return (
                              <div key={cat} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                  <div className={`h-3 w-3 rounded-full ${catColorsTW[i % catColorsTW.length]}`} />
                                  <span className="text-sm font-medium">{cat}</span>
                                  <Badge variant="secondary" className="text-xs">{count} service{count !== 1 ? 's' : ''}</Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => toast.info('Rename coming soon')}>Rename</Button>
                                  {count === 0 && (
                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => toast.info('Delete coming soon')}>Delete</Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle className="text-base">Uncategorized Services</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const uncatCount = services.filter(s => !s.category || s.category === '').length;
                        return uncatCount > 0 ? (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">{uncatCount} service{uncatCount !== 1 ? 's' : ''} without a category.</p>
                            <Button variant="outline" size="sm" onClick={() => guard(() => toast.info('Bulk assign coming soon'))} disabled={!allowModals}>Assign Category</Button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">All services are categorized.</p>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ============ TAB: ANALYTICS ============ */}
              {serviceTab === 'analytics' && (
                <>
                  {/* KPI */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{services.length}</div>
                        <p className="text-sm text-muted-foreground">Total Services</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{services.filter(s => (s as any).is_online !== false).length}</div>
                        <p className="text-sm text-muted-foreground">Active (Online)</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{new Set(services.map(s => s.category)).size}</div>
                        <p className="text-sm text-muted-foreground">Categories</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {services.length > 0 ? `$${Math.round(services.reduce((s, v) => s + (v.price || 0), 0) / services.length)}` : '$0'}
                        </div>
                        <p className="text-sm text-muted-foreground">Avg Price</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <Card className="rounded-xl">
                      <CardHeader>
                        <CardTitle className="text-base">Services by Category</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {services.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">No services yet.</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={Object.entries(services.reduce((acc, s) => { acc[s.category || 'Other'] = (acc[s.category || 'Other'] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([name, count]) => ({ name, count }))}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                              <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                              <Tooltip />
                              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl">
                      <CardHeader>
                        <CardTitle className="text-base">Price Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {services.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">No services yet.</p>
                        ) : (
                          <div className="space-y-4">
                            {[
                              { label: '$0–50', min: 0, max: 50 },
                              { label: '$51–100', min: 51, max: 100 },
                              { label: '$101–200', min: 101, max: 200 },
                              { label: '$200+', min: 201, max: Infinity },
                            ].map(bucket => {
                              const count = services.filter(s => (s.price || 0) >= bucket.min && (s.price || 0) <= bucket.max).length;
                              const pct = services.length > 0 ? (count / services.length) * 100 : 0;
                              return (
                                <div key={bucket.label}>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium">{bucket.label}</span>
                                    <span className="text-muted-foreground">{count} service{count !== 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Most Booked Services */}
                  <Card className="rounded-xl mb-6">
                    <CardHeader>
                      <CardTitle className="text-base">Most Booked Services (by Appointment Data)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const appts = appointments || [];
                        const bookingMap: Record<string, number> = {};
                        appts.forEach((a: any) => {
                          const svcName = a.service_name || a.service || a.appointment_type || '';
                          if (svcName) bookingMap[svcName] = (bookingMap[svcName] || 0) + 1;
                        });
                        const ranked = services
                          .map(s => ({ ...s, bookings: bookingMap[s.name] || 0 }))
                          .sort((a, b) => b.bookings - a.bookings)
                          .slice(0, 10);
                        if (ranked.length === 0 || ranked.every(r => r.bookings === 0)) {
                          return <p className="text-sm text-muted-foreground text-center py-4">No appointment data available yet.</p>;
                        }
                        return (
                          <div className="space-y-2">
                            {ranked.filter(r => r.bookings > 0).map((r, i) => (
                              <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-muted-foreground w-6">#{i + 1}</span>
                                  <span className="text-sm font-medium">{r.name}</span>
                                  <Badge variant="secondary" className="text-xs">{r.category || 'Other'}</Badge>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm text-muted-foreground">{r.bookings} bookings</span>
                                  <span className="text-sm font-semibold">${(r.bookings * (r.price || 0)).toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* Zero-booking services */}
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle className="text-base">Services with No Recent Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const appts = appointments || [];
                        const bookedNames = new Set<string>();
                        appts.forEach((a: any) => {
                          const svcName = a.service_name || a.service || a.appointment_type || '';
                          if (svcName) bookedNames.add(svcName);
                        });
                        const zeroBooking = services.filter(s => !bookedNames.has(s.name));
                        if (zeroBooking.length === 0) {
                          return <p className="text-sm text-muted-foreground text-center py-4">All services have recent bookings. Great!</p>;
                        }
                        return (
                          <>
                            <div className="space-y-2">
                              {zeroBooking.map(s => (
                                <div key={s.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium">{s.name}</span>
                                    <Badge variant="secondary" className="text-xs">{s.category || 'Other'}</Badge>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold">${s.price}</span>
                                    <Button variant="ghost" size="sm" onClick={() => guard(() => toast.info('Archive coming soon'))} disabled={!allowModals}>Archive</Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">Consider archiving services with no bookings to keep your catalog clean.</p>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </SectionWrapper>
        );
      }

      case "staff":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className={sectionShellClass}>
              {practice?.id ? (
                <ClinicStaffManager practiceId={practice.id} />
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">{t("admin.staff.noStaff", { defaultValue: "No practice linked" })}</p>
                </div>
              )}
            </div>
          </SectionWrapper>
        );

      case "locations":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className={sectionShellClass}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.locations.title")}</h2>
              <Button onClick={() => guard(() => setAddLocationOpen(true))} disabled={!allowModals}>
                <MapPin className="h-4 w-4 mr-2" />
                {t("admin.locations.add")}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{locations.length}</div>
                  <p className="text-sm text-muted-foreground">Total Locations</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{locations.filter(l => l.status === "active").length}</div>
                  <p className="text-sm text-muted-foreground">Active</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{locations.filter(l => l.status !== "active").length}</div>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {locations.length > 0 ? (doctors.length / locations.length).toFixed(1) : "0"}
                  </div>
                  <p className="text-sm text-muted-foreground">Providers / Location</p>
                </CardContent>
              </Card>
            </div>

            <div className={sectionMainGridClass}>
              <Card className="rounded-xl lg:col-span-8 min-w-0">
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
                          className="flex flex-col gap-2 p-4 bg-muted/30 rounded-xl border border-border"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium truncate">{location.name}</div>
                            <Badge variant="outline">{location.status}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground truncate">{location.address}</div>
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => guard(() => {
                                setEditingLocation(location);
                                setAddLocationOpen(true);
                              })}
                              disabled={!allowModals}
                            >
                              <Settings className="h-4 w-4 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
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
                              <X className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl lg:col-span-4 min-w-0">
                <CardHeader>
                  <CardTitle>Location Status Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">Active Locations</span>
                      <Badge variant="secondary">{locations.filter(l => l.status === "active").length}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">Inactive Locations</span>
                      <Badge variant="secondary">{locations.filter(l => l.status !== "active").length}</Badge>
                    </div>
                    {locations.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">All Addresses</h4>
                        <div className="space-y-2">
                          {locations.map(l => (
                            <div key={l.id} className="text-sm p-2 bg-muted/20 rounded-md border border-border">
                              <span className="font-medium">{l.name}</span>
                              <p className="text-muted-foreground text-xs mt-0.5">{l.address}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Second row: Location insights */}
            <div className={sectionInsightGridClass}>
              <Card className="rounded-xl lg:col-span-4 min-w-0">
                <CardHeader>
                  <CardTitle className="text-base">Coverage Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">Total Branches</span>
                      <span className="text-lg font-bold">{locations.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">Active Rate</span>
                      <span className="text-lg font-bold">
                        {locations.length > 0 ? Math.round((locations.filter(l => l.status === "active").length / locations.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">Unique Cities</span>
                      <span className="text-lg font-bold">
                        {new Set(locations.map(l => {
                          const parts = (l.address || "").split(",");
                          return parts.length > 1 ? parts[parts.length - 2]?.trim() : "Unknown";
                        })).size}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl lg:col-span-4 min-w-0">
                <CardHeader>
                  <CardTitle className="text-base">Branch Directory</CardTitle>
                </CardHeader>
                <CardContent>
                  {locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No branches added yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {locations.map((l, i) => (
                        <div key={l.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                            {i + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{l.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{l.address}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl lg:col-span-4 min-w-0">
                <CardHeader>
                  <CardTitle className="text-base">Operational Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const statusCounts = locations.reduce((acc, l) => {
                        const s = l.status || "unknown";
                        acc[s] = (acc[s] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      return Object.entries(statusCounts).length > 0 ? Object.entries(statusCounts).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                          <div className="flex items-center gap-2">
                            <div className={`h-2.5 w-2.5 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                            <span className="text-sm font-medium capitalize">{status}</span>
                          </div>
                          <Badge variant="secondary">{count as number}</Badge>
                        </div>
                      )) : (
                        <p className="text-sm text-muted-foreground">No location data</p>
                      );
                    })()}
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="text-sm font-medium">Providers per Location</span>
                        <span className="text-lg font-bold">
                          {locations.length > 0 ? (doctors.length / locations.length).toFixed(1) : "0"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
          </SectionWrapper>
        );

      case "patients": {
        const patientAvatarColors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'];
        const getPatientInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

        const filteredPatients = patients.filter(p => {
          if (patientStatusFilter !== 'all' && p.status !== patientStatusFilter) return false;
          if (patientProviderFilter !== 'all' && p.doctor_name !== patientProviderFilter) return false;
          if (patientSearch) {
            const q = patientSearch.toLowerCase();
            const matchName = p.name?.toLowerCase().includes(q);
            const matchPhone = p.phone?.toLowerCase().includes(q);
            const matchEmail = p.email?.toLowerCase().includes(q);
            if (!matchName && !matchPhone && !matchEmail) return false;
          }
          return true;
        });

        const formatPatientDate = (dateStr: string | null | undefined, fmt = "MMM dd, yyyy") => {
          if (!dateStr) return "—";
          try { return format(new Date(dateStr), fmt); } catch { return "—"; }
        };

        // Profile view
        if (selectedPatient) {
          const patientAppts = appointments.filter(a => a.patient_id === selectedPatient.id || a.patient_name === selectedPatient.name);
          const patientPayments = payments.filter((p: any) => p.patient_id === selectedPatient.id);
          const sortedAppts = [...patientAppts].sort((a, b) => new Date(b.date || b.appointment_date || 0).getTime() - new Date(a.date || a.appointment_date || 0).getTime());
          const lastVisitDate = sortedAppts.length > 0 ? formatPatientDate(sortedAppts[0].date || sortedAppts[0].appointment_date) : "—";
          const totalInvoiced = patientPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
          const totalPaid = patientPayments.filter((p: any) => p.status === 'completed' || p.status === 'paid').reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

          const patientTabs: { key: typeof patientTab; label: string }[] = [
            { key: 'overview', label: 'Overview' },
            { key: 'appointments', label: 'Appointments' },
            { key: 'billing', label: 'Billing' },
            { key: 'documents', label: 'Documents' },
            { key: 'notes', label: 'Notes' },
            { key: 'activity', label: 'Activity' },
          ];

          return (
            <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
              <div className={sectionShellClass}>
                {/* Back button */}
                <Button variant="ghost" className="gap-2 mb-4 -ml-2" onClick={() => setSelectedPatient(null)}>
                  <ArrowLeft className="h-4 w-4" /> {t("admin.patients.title")}
                </Button>

                {/* Profile header */}
                <Card className="rounded-xl mb-6">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <div className={`h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${patientAvatarColors[0]}`}>
                        {getPatientInitials(selectedPatient.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-xl font-bold">{selectedPatient.name}</h2>
                          <Badge className={selectedPatient.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-muted text-muted-foreground'}>{selectedPatient.status || 'unknown'}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                          {selectedPatient.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selectedPatient.phone}</span>}
                          {selectedPatient.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selectedPatient.email}</span>}
                          {selectedPatient.gender && <span className="capitalize">{selectedPatient.gender}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(() => toast.info('Edit patient coming soon'))}>Edit</Button>
                        <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(() => toast.info('New appointment coming soon'))}>New Appointment</Button>
                        <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(() => toast.info('Block patient coming soon'))}>Block</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tab bar */}
                <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
                  {patientTabs.map(tab => (
                    <Button key={tab.key} variant="ghost" size="sm"
                      className={`rounded-none ${patientTab === tab.key ? 'border-b-2 border-primary font-medium' : ''}`}
                      onClick={() => setPatientTab(tab.key)}
                    >{tab.label}</Button>
                  ))}
                </div>

                {/* Tab content */}
                {patientTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                      <Card className="rounded-xl">
                        <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            {[
                              ['Full Name', selectedPatient.name],
                              ['Date of Birth', formatPatientDate(selectedPatient.date_of_birth)],
                              ['Gender', selectedPatient.gender || '—'],
                              ['Phone', selectedPatient.phone || '—'],
                              ['Email', selectedPatient.email || '—'],
                              ['Address', selectedPatient.address || '—'],
                              ['Emergency Contact', selectedPatient.emergency_contact || '—'],
                            ].map(([label, val]) => (
                              <div key={label as string}><p className="text-muted-foreground text-xs">{label}</p><p className="font-medium">{val || '—'}</p></div>
                            ))}
                          </div>
                          <Button variant="outline" size="sm" className="mt-4" disabled={!allowModals} onClick={() => guard(() => toast.info('Edit coming soon'))}>Edit Info</Button>
                        </CardContent>
                      </Card>
                      <Card className="rounded-xl">
                        <CardHeader><CardTitle className="text-base">Medical Summary</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            {['Blood Type', 'Allergies', 'Chronic Conditions', 'Current Medications'].map(label => (
                              <div key={label}><p className="text-muted-foreground text-xs">{label}</p><p className="font-medium">—</p></div>
                            ))}
                          </div>
                          <Button variant="outline" size="sm" className="mt-4" disabled={!allowModals} onClick={() => guard(() => toast.info('Edit medical info coming soon'))}>Edit Medical Info</Button>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="lg:col-span-4 space-y-6">
                      <Card className="rounded-xl">
                        <CardHeader><CardTitle className="text-base">Quick Stats</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          {[
                            ['Total Visits', patientAppts.length.toString()],
                            ['Last Visit', lastVisitDate],
                            ['Assigned Provider', selectedPatient.doctor_name || '—'],
                            ['Member Since', formatPatientDate(selectedPatient.created_at, 'MMM yyyy')],
                          ].map(([label, val]) => (
                            <div key={label as string} className="flex justify-between text-sm p-2 bg-muted/30 rounded-lg border border-border">
                              <span className="text-muted-foreground">{label}</span><span className="font-medium">{val}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                      <Card className="rounded-xl">
                        <CardHeader><CardTitle className="text-base">Insurance</CardTitle></CardHeader>
                        <CardContent>
                          <div className="space-y-3 text-sm">
                            {['Insurance Provider', 'Policy Number', 'Coverage'].map(label => (
                              <div key={label}><p className="text-muted-foreground text-xs">{label}</p><p className="font-medium">—</p></div>
                            ))}
                          </div>
                          <Button variant="outline" size="sm" className="mt-4" disabled={!allowModals} onClick={() => guard(() => toast.info('Edit insurance coming soon'))}>Edit Insurance</Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {patientTab === 'appointments' && (() => {
                  const filtered = sortedAppts.filter(a => {
                    if (patientApptFilter === 'upcoming') return a.status === 'scheduled' || a.status === 'confirmed';
                    if (patientApptFilter === 'completed') return a.status === 'completed';
                    if (patientApptFilter === 'cancelled') return a.status === 'cancelled';
                    return true;
                  });
                  const completed = patientAppts.filter(a => a.status === 'completed').length;
                  const cancelled = patientAppts.filter(a => a.status === 'cancelled').length;
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <h3 className="text-base font-semibold">Appointment History</h3>
                        <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(() => toast.info('Add appointment coming soon'))}>Add Appointment</Button>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {['all', 'upcoming', 'completed', 'cancelled'].map(f => (
                          <Button key={f} variant={patientApptFilter === f ? 'default' : 'outline'} size="sm" onClick={() => setPatientApptFilter(f)} className="capitalize">{f}</Button>
                        ))}
                      </div>
                      {filtered.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="font-medium">No appointments found</p>
                        </div>
                      ) : (
                        <Card className="rounded-xl overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead><tr className="border-b border-border bg-muted/30">
                                <th className="text-left p-3 font-medium">Date & Time</th>
                                <th className="text-left p-3 font-medium">Provider</th>
                                <th className="text-left p-3 font-medium">Service</th>
                                <th className="text-left p-3 font-medium">Status</th>
                                <th className="text-left p-3 font-medium">Actions</th>
                              </tr></thead>
                              <tbody>
                                {filtered.map(a => (
                                  <tr key={a.id} className="border-b border-border last:border-0">
                                    <td className="p-3">{formatPatientDate(a.date || a.appointment_date)} {a.start_time || ''}</td>
                                    <td className="p-3">{a.doctor_name || '—'}</td>
                                    <td className="p-3">{a.service_name || a.appointment_type || '—'}</td>
                                    <td className="p-3"><Badge variant="outline" className="capitalize">{a.status}</Badge></td>
                                    <td className="p-3"><Button variant="ghost" size="sm" onClick={() => toast.info('View appointment coming soon')}><Eye className="h-4 w-4" /></Button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[['Total', patientAppts.length], ['Completed', completed], ['Cancelled', cancelled]].map(([label, count]) => (
                          <Card key={label as string} className="rounded-xl"><CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold">{count}</div><p className="text-sm text-muted-foreground">{label}</p>
                          </CardContent></Card>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {patientTab === 'billing' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <h3 className="text-base font-semibold">Billing & Payments</h3>
                      <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(() => toast.info('Create invoice coming soon'))}>Create Invoice</Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[['Total Invoiced', `$${totalInvoiced.toLocaleString()}`], ['Paid', `$${totalPaid.toLocaleString()}`], ['Outstanding', `$${(totalInvoiced - totalPaid).toLocaleString()}`]].map(([label, val]) => (
                        <Card key={label as string} className="rounded-xl"><CardContent className="pt-6 text-center">
                          <div className="text-2xl font-bold">{val}</div><p className="text-sm text-muted-foreground">{label}</p>
                        </CardContent></Card>
                      ))}
                    </div>
                    {patientPayments.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No billing records found</p>
                      </div>
                    ) : (
                      <Card className="rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b border-border bg-muted/30">
                              <th className="text-left p-3 font-medium">Date</th>
                              <th className="text-left p-3 font-medium">Description</th>
                              <th className="text-left p-3 font-medium">Amount</th>
                              <th className="text-left p-3 font-medium">Status</th>
                            </tr></thead>
                            <tbody>
                              {patientPayments.map((p: any) => (
                                <tr key={p.id} className="border-b border-border last:border-0">
                                  <td className="p-3">{formatPatientDate(p.created_at || p.date)}</td>
                                  <td className="p-3">{p.description || p.service_name || '—'}</td>
                                  <td className="p-3">${(p.amount || 0).toLocaleString()}</td>
                                  <td className="p-3"><Badge variant="outline" className="capitalize">{p.status}</Badge></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {patientTab === 'documents' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <h3 className="text-base font-semibold">Documents</h3>
                      <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(() => toast.info('Upload coming soon'))}>Upload</Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {['Prescriptions', 'Test Results', 'Other'].map(cat => (
                        <Card key={cat} className="rounded-xl"><CardContent className="pt-6 text-center py-10">
                          <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-sm font-medium">{cat}</p>
                          <p className="text-xs text-muted-foreground mt-1">No documents yet</p>
                        </CardContent></Card>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Document upload coming in a future update.</p>
                  </div>
                )}

                {patientTab === 'notes' && (
                  <div className="space-y-6">
                    <h3 className="text-base font-semibold">Internal Notes</h3>
                    <p className="text-sm text-muted-foreground">Notes are internal only and not visible to the patient.</p>
                    <div className="space-y-3">
                      <textarea className="w-full border border-border rounded-lg p-3 text-sm bg-background resize-none" rows={4} placeholder="Write a note…" />
                      <Button size="sm" disabled={!allowModals} onClick={() => guard(() => toast.info('Save note coming soon'))}>Add Note</Button>
                    </div>
                    <div className="text-center py-10 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No notes yet</p>
                      <p className="text-sm mt-1">Notes will appear here once added.</p>
                    </div>
                  </div>
                )}

                {patientTab === 'activity' && (
                  <div className="space-y-6">
                    <h3 className="text-base font-semibold">Activity Timeline</h3>
                    {sortedAppts.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No activity recorded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sortedAppts.slice(0, 20).map((a, i) => (
                          <div key={a.id} className="flex gap-3 items-start">
                            <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${a.status === 'completed' ? 'bg-green-500' : a.status === 'cancelled' ? 'bg-red-400' : 'bg-blue-500'}`} />
                            <div className="min-w-0">
                              <p className="text-sm">Appointment with <span className="font-medium">{a.doctor_name || 'Provider'}</span> — <span className="capitalize">{a.status}</span></p>
                              <p className="text-xs text-muted-foreground">{formatPatientDate(a.date || a.appointment_date)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SectionWrapper>
          );
        }

        // Directory view
        const uniqueProviderNames = [...new Set(patients.map(p => p.doctor_name).filter(Boolean))];

        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className={sectionShellClass}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{t("admin.patients.title")}</h2>
              <Button variant="outline" onClick={() => guard(() => toast.info("Export patients (coming soon)"))}>
                {t("admin.patients.export")}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{patients.length}</div>
                  <p className="text-sm text-muted-foreground">Total Patients</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{patients.filter(p => p.status === "active").length}</div>
                  <p className="text-sm text-muted-foreground">Active</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{new Set(patients.map(p => p.doctor_name)).size}</div>
                  <p className="text-sm text-muted-foreground">Assigned Providers</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {doctors.length > 0 ? (patients.length / doctors.length).toFixed(1) : "0"}
                  </div>
                  <p className="text-sm text-muted-foreground">Avg. per Provider</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters row */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <div className="relative flex-1">
                <Input
                  placeholder="Search by name, phone or email…"
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  className="pl-9"
                />
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex gap-2">
                {['all', 'active', 'inactive'].map(s => (
                  <Button key={s} variant={patientStatusFilter === s ? 'default' : 'outline'} size="sm"
                    onClick={() => setPatientStatusFilter(s)} className="capitalize">{s === 'all' ? 'All' : s}</Button>
                ))}
              </div>
              <select
                className="border border-border rounded-md px-3 py-1.5 text-sm bg-background"
                value={patientProviderFilter}
                onChange={e => setPatientProviderFilter(e.target.value)}
              >
                <option value="all">All Providers</option>
                {uniqueProviderNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            <div className={sectionMainGridClass}>
              <Card className="rounded-xl lg:col-span-8 min-w-0">
                <CardHeader>
                  <CardTitle>{t("admin.patients.listTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">{t("admin.patients.emptyTitle")}</p>
                      <p className="text-sm mt-1">{t("admin.patients.emptyDescription")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPatients.map((patient, idx) => (
                        <div
                          key={patient.id}
                          className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${patientAvatarColors[idx % patientAvatarColors.length]}`}>
                            {getPatientInitials(patient.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{patient.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{patient.doctor_name}</p>
                          </div>
                          <div className="hidden sm:block text-sm text-muted-foreground whitespace-nowrap">
                            {formatPatientDate(patient.last_visit)}
                          </div>
                          <Badge className={patient.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-muted text-muted-foreground'}>
                            {patient.status || 'unknown'}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedPatient(patient); setPatientTab('overview'); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl lg:col-span-4 min-w-0">
                <CardHeader>
                  <CardTitle>Patient Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">Active Patients</span>
                      <Badge variant="secondary">{patients.filter(p => p.status === "active").length}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">Inactive Patients</span>
                      <Badge variant="secondary">{patients.filter(p => p.status !== "active").length}</Badge>
                    </div>
                    {patients.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">By Provider</h4>
                        <div className="space-y-2">
                          {Object.entries(
                            patients.reduce((acc, p) => {
                              const doc = p.doctor_name || "Unassigned";
                              acc[doc] = (acc[doc] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([doctor, count]) => (
                            <div key={doctor} className="flex items-center justify-between p-2 bg-muted/20 rounded-md border border-border">
                              <span className="text-sm">{doctor}</span>
                              <Badge variant="outline">{count as number}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Second row: Patient insights */}
            <div className={sectionInsightGridClass}>
              <Card className="rounded-xl lg:col-span-4 min-w-0">
                <CardHeader>
                  <CardTitle className="text-base">Provider Assignment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const providerCounts = patients.reduce((acc, p) => {
                        const doc = p.doctor_name || "Unassigned";
                        acc[doc] = (acc[doc] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      const sorted = Object.entries(providerCounts).sort(([, a], [, b]) => (b as number) - (a as number));
                      return sorted.length > 0 ? sorted.map(([doc, count]) => (
                        <div key={doc} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{doc}</span>
                          </div>
                          <Badge variant="outline">{count as number} patient{(count as number) !== 1 ? "s" : ""}</Badge>
                        </div>
                      )) : (
                        <p className="text-sm text-muted-foreground">No patients yet</p>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl lg:col-span-4 min-w-0">
                <CardHeader>
                  <CardTitle className="text-base">Recent Visits</CardTitle>
                </CardHeader>
                <CardContent>
                  {patients.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No visit data available.</p>
                  ) : (
                    <div className="space-y-3">
                      {[...patients]
                        .sort((a, b) => new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime())
                        .slice(0, 5)
                        .map(p => (
                          <div key={p.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.doctor_name}</p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {formatPatientDate(p.last_visit)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl lg:col-span-4 min-w-0">
                <CardHeader>
                  <CardTitle className="text-base">Status Segmentation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const statusCounts = patients.reduce((acc, p) => {
                        const s = p.status || "unknown";
                        acc[s] = (acc[s] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      return Object.entries(statusCounts).length > 0 ? Object.entries(statusCounts).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                          <div className="flex items-center gap-2">
                            <div className={`h-2.5 w-2.5 rounded-full ${status === 'active' ? 'bg-green-500' : status === 'inactive' ? 'bg-muted-foreground' : 'bg-yellow-500'}`} />
                            <span className="text-sm font-medium capitalize">{status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{count as number}</Badge>
                            <span className="text-xs text-muted-foreground">
                              ({patients.length > 0 ? Math.round(((count as number) / patients.length) * 100) : 0}%)
                            </span>
                          </div>
                        </div>
                      )) : (
                        <p className="text-sm text-muted-foreground">No patient data</p>
                      );
                    })()}
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="text-sm font-medium">Patients per Provider</span>
                        <span className="text-lg font-bold">
                          {(() => {
                            const provCount = new Set(patients.map(p => p.doctor_name)).size;
                            return provCount > 0 ? (patients.length / provCount).toFixed(1) : "0";
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
          </SectionWrapper>
        );
      }

      case "billing": {
        const bData: any = billing.data;
        const bTxs: any[] = bData?.transactions || [];
        const fmtCents = (cents: number) =>
          `$${(Number(cents || 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

        const billingTabs: { key: typeof billingTab; label: string }[] = [
          { key: 'overview', label: t("adminBilling.paymentSummary").split(' ')[0] || 'Overview' },
          { key: 'invoices', label: 'Invoices' },
          { key: 'transactions', label: t("adminBilling.recentTransactions").split(' ').slice(-1)[0] || 'Transactions' },
          { key: 'insurance', label: 'Insurance' },
          { key: 'settings', label: 'Settings' },
        ];

        // Filtered invoices
        const filteredInvoices = bTxs.filter((tx: any) => {
          const name = (tx?.metadata?.patient_name || tx?.metadata?.customer_name || '').toLowerCase();
          if (invoiceSearch && !name.includes(invoiceSearch.toLowerCase())) return false;
          if (invoiceStatusFilter !== 'all') {
            const s = String(tx.status || '').toLowerCase();
            if (invoiceStatusFilter === 'paid' && s !== 'completed' && s !== 'paid') return false;
            if (invoiceStatusFilter === 'pending' && s !== 'pending') return false;
            if (invoiceStatusFilter === 'overdue' && s !== 'overdue') return false;
            if (invoiceStatusFilter === 'refunded' && s !== 'refunded') return false;
          }
          return true;
        });

        // Group by payment method
        const byMethod: Record<string, { count: number; total: number }> = {};
        bTxs.forEach((tx: any) => {
          const m = tx.payment_method || 'Unknown';
          if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
          byMethod[m].count++;
          byMethod[m].total += Number(tx.amount_cents || 0);
        });

        // Group by status
        const byStatus: Record<string, number> = {};
        bTxs.forEach((tx: any) => {
          const s = String(tx.status || 'unknown').toLowerCase();
          byStatus[s] = (byStatus[s] || 0) + 1;
        });

        const completedSum = bTxs.filter((tx: any) => {
          const s = String(tx.status || '').toLowerCase();
          return s === 'completed' || s === 'paid';
        }).reduce((sum: number, tx: any) => sum + Number(tx.amount_cents || 0), 0);

        const refundedSum = bTxs.filter((tx: any) =>
          String(tx.status || '').toLowerCase() === 'refunded'
        ).reduce((sum: number, tx: any) => sum + Number(tx.amount_cents || 0), 0);

        const statusColors: Record<string, string> = {
          completed: 'bg-green-500', paid: 'bg-green-500',
          pending: 'bg-yellow-500',
          refunded: 'bg-red-500', failed: 'bg-red-500',
        };

        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className={sectionShellClass}>
              {/* Header row — preserved exactly */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-xl font-semibold">{t("adminBilling.title")}</h2>
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
                    {t("adminBilling.refresh")}
                  </Button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 border-b border-border mb-6 mt-4 overflow-x-auto">
                {billingTabs.map(tab => (
                  <Button
                    key={tab.key}
                    variant="ghost"
                    className={`rounded-none px-4 py-2 text-sm font-medium ${billingTab === tab.key ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}
                    onClick={() => setBillingTab(tab.key)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              {/* ========== TAB: OVERVIEW ========== */}
              {billingTab === 'overview' && (
                <>
                  {/* KPI cards row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">{t("adminBilling.totalRevenue")}</p>
                        <p className="text-2xl font-bold">{billing.loading ? '…' : fmtCents(bData?.summary?.totalRevenueCents ?? 0)}</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">{t("adminBilling.pending")}</p>
                        <p className="text-2xl font-bold text-yellow-600">{billing.loading ? '…' : fmtCents(bData?.summary?.pendingCents ?? 0)}</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">{t("adminBilling.refunds")}</p>
                        <p className="text-2xl font-bold text-red-600">{billing.loading ? '…' : fmtCents(bData?.summary?.refundCents ?? 0)}</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Transactions</p>
                        <p className="text-2xl font-bold">{billing.loading ? '…' : (bData?.summary?.transactionCount ?? 0)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Main grid — existing Payment Summary + Recent Transactions */}
                  <div className={sectionMainGridClass}>
                    <Card className="rounded-xl lg:col-span-5 min-w-0">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          {t("adminBilling.paymentSummary")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {billing.loading ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>{t("adminBilling.loading")}</span>
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
                                  <span>{t("adminBilling.totalRevenue")} ({b.period?.days ?? 0} {t("adminBilling.days")})</span>
                                  <span className="font-semibold">{fmt(b.summary?.totalRevenueCents ?? 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{t("adminBilling.pending")}</span>
                                  <span className="font-semibold text-yellow-600">{fmt(b.summary?.pendingCents ?? 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{t("adminBilling.refunds")}</span>
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
                          <p className="text-sm text-muted-foreground">{t("adminBilling.noBillingData")}</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl lg:col-span-7 min-w-0">
                      <CardHeader>
                        <CardTitle>{t("adminBilling.recentTransactions")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {billing.loading ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>{t("adminBilling.loading")}</span>
                          </div>
                        ) : billing.error ? (
                          <p className="text-sm text-destructive">{billing.error}</p>
                        ) : !billing.data || !(billing.data as any).transactions?.length ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>{t("adminBilling.noTransactions")}</p>
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
                                    <p className="text-sm text-muted-foreground">
                                      {(() => { try { return format(new Date(tx.created_at), "MMM dd, yyyy"); } catch { return '—'; } })()}
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

                  {/* Insight cards */}
                  <div className={sectionInsightGridClass}>
                    {/* By Payment Method */}
                    <Card className="rounded-xl lg:col-span-4 min-w-0">
                      <CardHeader><CardTitle className="text-base">By Payment Method</CardTitle></CardHeader>
                      <CardContent>
                        {Object.keys(byMethod).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No data available</p>
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(byMethod).map(([method, data]) => (
                              <div key={method} className="flex items-center justify-between">
                                <span className="text-sm font-medium">{method}</span>
                                <div className="text-right">
                                  <span className="text-sm text-muted-foreground">{data.count} tx</span>
                                  <span className="ml-2 font-semibold text-sm">{fmtCents(data.total)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* By Status */}
                    <Card className="rounded-xl lg:col-span-4 min-w-0">
                      <CardHeader><CardTitle className="text-base">By Status</CardTitle></CardHeader>
                      <CardContent>
                        {Object.keys(byStatus).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No data available</p>
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(byStatus).map(([status, count]) => {
                              const pct = bTxs.length > 0 ? (count / bTxs.length) * 100 : 0;
                              return (
                                <div key={status}>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${statusColors[status] || 'bg-muted-foreground'}`} />
                                      <span className="text-sm capitalize">{status}</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">{count}</span>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div className={`h-2 rounded-full ${statusColors[status] || 'bg-muted-foreground'}`} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Period Summary */}
                    <Card className="rounded-xl lg:col-span-4 min-w-0">
                      <CardHeader><CardTitle className="text-base">Period Summary</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Avg Transaction</span>
                            <span className="font-semibold text-sm">
                              {bTxs.length > 0 ? fmtCents((bData?.summary?.totalRevenueCents ?? 0) / (bData?.summary?.transactionCount || 1)) : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Highest Tx</span>
                            <span className="font-semibold text-sm">
                              {bTxs.length > 0 ? fmtCents(Math.max(...bTxs.map((tx: any) => Number(tx.amount_cents || 0)))) : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Period</span>
                            <span className="text-sm">
                              {(() => { try { return `${format(new Date(bData?.period?.from), 'MMM dd')} → ${format(new Date(bData?.period?.to), 'MMM dd')}`; } catch { return '—'; } })()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Completion Rate</span>
                            <span className="font-semibold text-sm">
                              {(bData?.summary?.transactionCount ?? 0) > 0
                                ? `${((bData?.summary?.completedCount ?? 0) / (bData?.summary?.transactionCount ?? 1) * 100).toFixed(0)}%`
                                : '—'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* ========== TAB: INVOICES ========== */}
              {billingTab === 'invoices' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Invoices</h3>
                    <Button variant="outline" disabled={!allowModals} onClick={() => guard(() => toast.info('Create invoice coming soon'))}>
                      <FileText className="h-4 w-4 mr-2" />Create Invoice
                    </Button>
                  </div>

                  {/* Filters */}
                  <div className="flex items-center gap-3 flex-wrap mb-4">
                    <Input
                      placeholder="Search by patient name…"
                      value={invoiceSearch}
                      onChange={e => setInvoiceSearch(e.target.value)}
                      className="max-w-xs"
                    />
                    {['all', 'paid', 'pending', 'overdue', 'refunded'].map(s => (
                      <Button
                        key={s}
                        variant={invoiceStatusFilter === s ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInvoiceStatusFilter(s)}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Button>
                    ))}
                  </div>

                  {/* Invoices table */}
                  <Card className="rounded-xl">
                    <CardContent className="pt-4">
                      {billing.loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                          <Loader2 className="h-4 w-4 animate-spin" /><span>{t("adminBilling.loading")}</span>
                        </div>
                      ) : billing.error ? (
                        <p className="text-sm text-destructive py-4">{billing.error}</p>
                      ) : filteredInvoices.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>{t("adminBilling.noTransactions")}</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border text-left">
                                <th className="pb-2 font-medium text-muted-foreground">Invoice #</th>
                                <th className="pb-2 font-medium text-muted-foreground">Patient</th>
                                <th className="pb-2 font-medium text-muted-foreground">Date</th>
                                <th className="pb-2 font-medium text-muted-foreground">Amount</th>
                                <th className="pb-2 font-medium text-muted-foreground">Status</th>
                                <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredInvoices.map((tx: any) => {
                                const pName = tx?.metadata?.patient_name || tx?.metadata?.customer_name || '—';
                                const sLow = String(tx.status || '').toLowerCase();
                                const isPaid = sLow === 'completed' || sLow === 'paid';
                                const isPend = sLow === 'pending';
                                return (
                                  <tr key={tx.id} className="border-b border-border/50">
                                    <td className="py-3 font-mono text-xs">{String(tx.id || '').slice(-8)}</td>
                                    <td className="py-3">{pName}</td>
                                    <td className="py-3 text-muted-foreground">
                                      {(() => { try { return format(new Date(tx.created_at), 'MMM dd, yyyy'); } catch { return '—'; } })()}
                                    </td>
                                    <td className="py-3 font-semibold">{fmtCents(tx.amount_cents || 0)}</td>
                                    <td className="py-3">
                                      <Badge variant={isPaid ? 'default' : isPend ? 'outline' : 'secondary'}>{tx.status}</Badge>
                                    </td>
                                    <td className="py-3">
                                      <div className="flex gap-1">
                                        <Button size="sm" variant="ghost" onClick={() => guard(() => toast.info('View invoice coming soon'))}>
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => guard(() => toast.info('Send invoice coming soon'))}>
                                          <Mail className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Summary stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Invoices</p>
                      <p className="text-xl font-bold">{filteredInvoices.length}</p>
                    </CardContent></Card>
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-xl font-bold">{fmtCents(filteredInvoices.reduce((s: number, tx: any) => s + Number(tx.amount_cents || 0), 0))}</p>
                    </CardContent></Card>
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className="text-xl font-bold text-yellow-600">
                        {fmtCents(filteredInvoices.filter((tx: any) => String(tx.status || '').toLowerCase() === 'pending').reduce((s: number, tx: any) => s + Number(tx.amount_cents || 0), 0))}
                      </p>
                    </CardContent></Card>
                  </div>
                </>
              )}

              {/* ========== TAB: TRANSACTIONS ========== */}
              {billingTab === 'transactions' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">All Transactions</h3>
                    <Button variant="outline" disabled={!allowModals} onClick={() => guard(() => toast.info('Export coming soon'))}>
                      Export CSV
                    </Button>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Income</p>
                      <p className="text-xl font-bold text-green-600">{fmtCents(completedSum)}</p>
                    </CardContent></Card>
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Refunds</p>
                      <p className="text-xl font-bold text-red-600">{fmtCents(refundedSum)}</p>
                    </CardContent></Card>
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Net Revenue</p>
                      <p className="text-xl font-bold">{fmtCents(completedSum - refundedSum)}</p>
                    </CardContent></Card>
                  </div>

                  {/* Full transaction log */}
                  <Card className="rounded-xl">
                    <CardContent className="pt-4">
                      {billing.loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                          <Loader2 className="h-4 w-4 animate-spin" /><span>{t("adminBilling.loading")}</span>
                        </div>
                      ) : billing.error ? (
                        <p className="text-sm text-destructive py-4">{billing.error}</p>
                      ) : bTxs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>{t("adminBilling.noTransactions")}</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border text-left">
                                <th className="pb-2 font-medium text-muted-foreground">Date</th>
                                <th className="pb-2 font-medium text-muted-foreground">Patient</th>
                                <th className="pb-2 font-medium text-muted-foreground">Amount</th>
                                <th className="pb-2 font-medium text-muted-foreground">Method</th>
                                <th className="pb-2 font-medium text-muted-foreground">Status</th>
                                <th className="pb-2 font-medium text-muted-foreground">Reference</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...bTxs].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((tx: any) => {
                                const pName = tx?.metadata?.patient_name || tx?.metadata?.customer_name || '—';
                                const sLow = String(tx.status || '').toLowerCase();
                                const isPaid = sLow === 'completed' || sLow === 'paid';
                                const isPend = sLow === 'pending';
                                return (
                                  <tr key={tx.id} className="border-b border-border/50">
                                    <td className="py-3 text-muted-foreground">
                                      {(() => { try { return format(new Date(tx.created_at), 'MMM dd, yyyy'); } catch { return '—'; } })()}
                                    </td>
                                    <td className="py-3">{pName}</td>
                                    <td className="py-3 font-semibold">{fmtCents(tx.amount_cents || 0)}</td>
                                    <td className="py-3 text-muted-foreground">{tx.payment_method || '—'}</td>
                                    <td className="py-3">
                                      <Badge variant={isPaid ? 'default' : isPend ? 'outline' : 'secondary'}>{tx.status}</Badge>
                                    </td>
                                    <td className="py-3 font-mono text-xs text-muted-foreground">{String(tx.id || '').slice(-8)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ========== TAB: INSURANCE ========== */}
              {billingTab === 'insurance' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Insurance Claims</h3>
                    <Button variant="outline" disabled={!allowModals} onClick={() => guard(() => toast.info('Submit claim coming soon'))}>
                      Submit Claim
                    </Button>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Submitted</p>
                      <p className="text-xl font-bold">0</p>
                    </CardContent></Card>
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Approved</p>
                      <p className="text-xl font-bold text-green-600">0</p>
                    </CardContent></Card>
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Rejected</p>
                      <p className="text-xl font-bold text-red-600">0</p>
                    </CardContent></Card>
                  </div>

                  {/* Empty claims table */}
                  <Card className="rounded-xl mb-6">
                    <CardContent className="pt-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left">
                              <th className="pb-2 font-medium text-muted-foreground">Patient</th>
                              <th className="pb-2 font-medium text-muted-foreground">Insurer</th>
                              <th className="pb-2 font-medium text-muted-foreground">Service</th>
                              <th className="pb-2 font-medium text-muted-foreground">Amount</th>
                              <th className="pb-2 font-medium text-muted-foreground">Submitted</th>
                              <th className="pb-2 font-medium text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                        </table>
                      </div>
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="font-medium">No insurance claims yet</p>
                        <p className="text-sm mt-1">Insurance claim tracking coming in a future update.</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Accepted insurers */}
                  <Card className="rounded-xl">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Accepted Insurance Providers</CardTitle>
                        <Button size="sm" variant="outline" disabled={!allowModals} onClick={() => guard(() => toast.info('Add insurer coming soon'))}>
                          Add Insurer
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-6 text-muted-foreground">
                        <p>No insurers added yet</p>
                        <p className="text-sm mt-1">Add the insurance providers your practice accepts.</p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ========== TAB: SETTINGS ========== */}
              {billingTab === 'settings' && (
                <>
                  {/* Billing Settings */}
                  <Card className="rounded-xl mb-6">
                    <CardHeader><CardTitle className="text-base">Billing Settings</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2 border-b border-border/50">
                          <span className="text-sm font-medium">Default Currency</span>
                          <Badge variant="outline">USD</Badge>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-border/50">
                          <span className="text-sm font-medium">Tax / VAT</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">0%</span>
                            <Button size="sm" variant="ghost" onClick={() => guard(() => toast.info('Edit tax coming soon'))}>Edit</Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-border/50">
                          <span className="text-sm font-medium">Auto-send Receipt</span>
                          <div className="w-10 h-5 rounded-full bg-muted relative cursor-pointer">
                            <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-muted-foreground transition-all" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-border/50">
                          <span className="text-sm font-medium">Invoice Logo</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Use clinic logo</span>
                            <Button size="sm" variant="ghost" onClick={() => guard(() => toast.info('Change logo coming soon'))}>Change</Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium">Payment Terms</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Due on receipt</span>
                            <Button size="sm" variant="ghost" onClick={() => guard(() => toast.info('Edit terms coming soon'))}>Edit</Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Invoice Template */}
                  <Card className="rounded-xl mb-6">
                    <CardHeader><CardTitle className="text-base">Invoice Template</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">Customize how invoices look when sent to patients.</p>
                      <div className="border-2 border-dashed border-border rounded-xl h-[200px] flex items-center justify-center text-muted-foreground">
                        <p>Invoice preview coming soon</p>
                      </div>
                      <Button className="mt-4" variant="outline" disabled={!allowModals} onClick={() => guard(() => toast.info('Template editor coming soon'))}>
                        Customize Template
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Accepted Payment Methods */}
                  <Card className="rounded-xl">
                    <CardHeader><CardTitle className="text-base">Accepted Payment Methods</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { name: 'Cash', icon: DollarSign },
                          { name: 'Credit Card', icon: CreditCard },
                          { name: 'Debit Card', icon: CreditCard },
                          { name: 'Insurance', icon: FileText },
                          { name: 'Bank Transfer', icon: Building2 },
                          { name: 'Online Payment', icon: CreditCard },
                        ].map(({ name, icon: Icon }) => (
                          <div key={name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{name}</span>
                            </div>
                            <div className="w-10 h-5 rounded-full bg-muted relative cursor-pointer">
                              <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-muted-foreground transition-all" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button className="mt-4" variant="outline" disabled={!allowModals} onClick={() => guard(() => toast.info('Save payment methods coming soon'))}>
                        Save
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </SectionWrapper>
        );
      }

      case "finances": {
        const finIncome = financeEntries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
        const finExpenses = financeEntries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
        const finNet = finIncome - finExpenses;

        const filteredLedger = financeEntries.filter(e => {
          if (ledgerTypeFilter !== 'all' && e.type !== ledgerTypeFilter) return false;
          if (ledgerCategoryFilter !== 'all' && e.category !== ledgerCategoryFilter) return false;
          if (ledgerSearch && !(e.description || '').toLowerCase().includes(ledgerSearch.toLowerCase()) && !(e.reference || '').toLowerCase().includes(ledgerSearch.toLowerCase())) return false;
          try {
            if (ledgerFrom && new Date(e.date || e.created_at) < new Date(ledgerFrom)) return false;
            if (ledgerTo && new Date(e.date || e.created_at) > new Date(ledgerTo)) return false;
          } catch {}
          return true;
        });

        const filteredIncome = filteredLedger.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
        const filteredExpenses = filteredLedger.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);

        const monthlyData = (() => {
          const map: Record<string, { month: string; income: number; expense: number }> = {};
          financeEntries.forEach(e => {
            try {
              const d = new Date(e.date || e.created_at);
              const key = format(d, 'yyyy-MM');
              const label = format(d, 'MMM yyyy');
              if (!map[key]) map[key] = { month: label, income: 0, expense: 0 };
              if (e.type === 'income') map[key].income += e.amount || 0;
              if (e.type === 'expense') map[key].expense += e.amount || 0;
            } catch {}
          });
          return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
        })();

        const expenseByCategory = (() => {
          const map: Record<string, number> = {};
          financeEntries.filter(e => e.type === 'expense').forEach(e => {
            const cat = e.category || 'Uncategorized';
            map[cat] = (map[cat] || 0) + (e.amount || 0);
          });
          return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
        })();

        const recentEntries = [...financeEntries].sort((a, b) => {
          try { return new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime(); } catch { return 0; }
        }).slice(0, 8);

        const finTabs = [
          { key: 'overview' as const, label: 'Overview' },
          { key: 'ledger' as const, label: 'Ledger' },
          { key: 'compensation' as const, label: 'Compensation' },
          { key: 'recurring' as const, label: 'Recurring' },
          { key: 'categories' as const, label: 'Categories' },
          { key: 'export' as const, label: 'Export' },
        ];

        const catColors = ['hsl(var(--primary))', 'hsl(142 71% 45%)', 'hsl(38 92% 50%)', 'hsl(280 68% 60%)', 'hsl(0 84% 60%)'];

        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className={sectionShellClass}>
              {/* Header */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-xl font-semibold">Finance</h2>
                <Button variant="outline" disabled={!allowModals} onClick={() => guard(() => toast.info('Export coming soon'))}>
                  <Download className="h-4 w-4 mr-2" /> Export CSV
                </Button>
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
                {finTabs.map(tab => (
                  <Button
                    key={tab.key}
                    variant="ghost"
                    size="sm"
                    className={financeTab === tab.key ? 'border-b-2 border-primary rounded-none font-medium' : 'rounded-none'}
                    onClick={() => setFinanceTab(tab.key)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              {/* ===== OVERVIEW TAB ===== */}
              {financeTab === 'overview' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Income</p><p className="text-2xl font-bold text-foreground">${finIncome.toFixed(2)}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Expenses</p><p className="text-2xl font-bold text-destructive">${finExpenses.toFixed(2)}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Net</p><p className={`text-2xl font-bold ${finNet >= 0 ? 'text-foreground' : 'text-destructive'}`}>${finNet.toFixed(2)}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Entries</p><p className="text-2xl font-bold text-foreground">{financeEntries.length}</p></CardContent></Card>
                  </div>

                  {/* Chart */}
                  <Card className="mb-6">
                    <CardHeader><CardTitle>Income vs Expenses</CardTitle></CardHeader>
                    <CardContent>
                      {monthlyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                          <AreaChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="income" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.2} name="Income" />
                            <Area type="monotone" dataKey="expense" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.2} name="Expenses" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
                          <p>No entries yet. Add your first entry in the Ledger tab.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Two-column row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader><CardTitle>Expense Breakdown by Category</CardTitle></CardHeader>
                      <CardContent>
                        {expenseByCategory.length > 0 ? expenseByCategory.map((cat, i) => (
                          <div key={cat.name} className="flex items-center gap-3 mb-3">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: catColors[i % catColors.length] }} />
                            <span className="text-sm flex-1">{cat.name}</span>
                            <span className="text-sm font-medium">${cat.total.toFixed(2)}</span>
                            <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${finExpenses > 0 ? (cat.total / finExpenses * 100) : 0}%`, backgroundColor: catColors[i % catColors.length] }} />
                            </div>
                          </div>
                        )) : (
                          <p className="text-sm text-muted-foreground text-center py-6">No expense entries yet.</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
                      <CardContent>
                        {recentEntries.length > 0 ? recentEntries.map(e => {
                          let dateStr = '';
                          try { dateStr = format(new Date(e.date || e.created_at), 'MMM dd'); } catch { dateStr = '—'; }
                          return (
                            <div key={e.id} className="flex items-center gap-2 mb-2 text-sm">
                              <span className="text-muted-foreground w-14 flex-shrink-0">{dateStr}</span>
                              <Badge variant={e.type === 'income' ? 'default' : e.type === 'payroll' ? 'secondary' : 'destructive'} className="text-xs">{e.type}</Badge>
                              <span className="flex-1 truncate">{e.category || '—'}</span>
                              <span className="font-medium">${(e.amount || 0).toFixed(2)}</span>
                            </div>
                          );
                        }) : (
                          <p className="text-sm text-muted-foreground text-center py-6">No entries yet.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* ===== LEDGER TAB ===== */}
              {financeTab === 'ledger' && (
                  <>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      <Input type="date" className="w-36" value={ledgerFrom} onChange={e => setLedgerFrom(e.target.value)} />
                      <Input type="date" className="w-36" value={ledgerTo} onChange={e => setLedgerTo(e.target.value)} />
                      <div className="flex gap-1">
                        {(['all', 'income', 'expense', 'payroll'] as const).map(tp => (
                          <Button key={tp} size="sm" variant={ledgerTypeFilter === tp ? 'default' : 'outline'} onClick={() => setLedgerTypeFilter(tp)}>{tp.charAt(0).toUpperCase() + tp.slice(1)}</Button>
                        ))}
                      </div>
                      <select className="border border-border rounded-md px-3 py-1 text-sm bg-background" value={ledgerCategoryFilter} onChange={e => setLedgerCategoryFilter(e.target.value)}>
                        <option value="all">All categories</option>
                        {financeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <Input placeholder="Search entries…" className="w-48" value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)} />
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Entries</p><p className="text-lg font-bold">{filteredLedger.length}</p></CardContent></Card>
                      <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Income</p><p className="text-lg font-bold">${filteredIncome.toFixed(2)}</p></CardContent></Card>
                      <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Expenses</p><p className="text-lg font-bold text-destructive">${filteredExpenses.toFixed(2)}</p></CardContent></Card>
                      <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Net</p><p className={`text-lg font-bold ${(filteredIncome - filteredExpenses) >= 0 ? '' : 'text-destructive'}`}>${(filteredIncome - filteredExpenses).toFixed(2)}</p></CardContent></Card>
                    </div>

                    {/* Add Entry */}
                    <Card className="mb-6">
                      <CardHeader className="cursor-pointer" onClick={() => setLedgerAddOpen(!ledgerAddOpen)}>
                        <CardTitle className="flex items-center justify-between text-base">
                          <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Entry</span>
                          <span className="text-xs text-muted-foreground">{ledgerAddOpen ? 'Collapse' : 'Expand'}</span>
                        </CardTitle>
                      </CardHeader>
                      {ledgerAddOpen && (
                        <CardContent>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                            <Input type="date" value={ledgerFormDate} onChange={e => setLedgerFormDate(e.target.value)} />
                            <select className="border border-border rounded-md px-3 py-1 text-sm bg-background" value={ledgerFormType} onChange={e => setLedgerFormType(e.target.value as any)}>
                              <option value="expense">Expense</option>
                              <option value="income">Income</option>
                              <option value="payroll">Payroll</option>
                            </select>
                            <select className="border border-border rounded-md px-3 py-1 text-sm bg-background" value={ledgerFormCurrency} onChange={e => setLedgerFormCurrency(e.target.value)}>
                              <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="UZS">UZS</option>
                            </select>
                            <Input type="number" placeholder="Amount" value={ledgerFormAmount} onChange={e => setLedgerFormAmount(e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                            <select className="border border-border rounded-md px-3 py-1 text-sm bg-background" value={ledgerFormCategory} onChange={e => setLedgerFormCategory(e.target.value)}>
                              <option value="">Select category</option>
                              {financeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <Input placeholder="Reference (optional)" value={ledgerFormRef} onChange={e => setLedgerFormRef(e.target.value)} />
                            <Input placeholder="Description (optional)" value={ledgerFormDesc} onChange={e => setLedgerFormDesc(e.target.value)} />
                          </div>
                          <Button disabled={!allowModals} onClick={() => guard(() => {
                            setFinanceEntries(prev => [...prev, { id: Date.now().toString(), date: ledgerFormDate, type: ledgerFormType, currency: ledgerFormCurrency, amount: parseFloat(ledgerFormAmount) || 0, category: ledgerFormCategory, reference: ledgerFormRef, description: ledgerFormDesc, created_at: new Date().toISOString() }]);
                            setLedgerFormAmount(''); setLedgerFormRef(''); setLedgerFormDesc('');
                            toast.success('Entry added');
                          })}>Add entry</Button>
                        </CardContent>
                      )}
                    </Card>

                    {/* Entries table */}
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2">Entries <Badge variant="secondary">{filteredLedger.length}</Badge></CardTitle></CardHeader>
                      <CardContent>
                        {filteredLedger.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead><tr className="border-b border-border text-left text-muted-foreground">
                                <th className="pb-2">Date</th><th className="pb-2">Type</th><th className="pb-2">Category</th><th className="pb-2">Amount</th><th className="pb-2">Currency</th><th className="pb-2">Reference</th><th className="pb-2">Description</th><th className="pb-2"></th>
                              </tr></thead>
                              <tbody>
                                {filteredLedger.slice(0, 200).map(entry => {
                                  let ds = ''; try { ds = format(new Date(entry.date || entry.created_at), 'MMM dd, yyyy'); } catch { ds = '—'; }
                                  return (
                                    <tr key={entry.id} className="border-b border-border/50">
                                      <td className="py-2">{ds}</td>
                                      <td className="py-2"><Badge variant={entry.type === 'income' ? 'default' : entry.type === 'payroll' ? 'secondary' : 'destructive'} className="text-xs">{entry.type}</Badge></td>
                                      <td className="py-2">{entry.category || '—'}</td>
                                      <td className="py-2 font-medium">${(entry.amount || 0).toFixed(2)}</td>
                                      <td className="py-2">{entry.currency || 'USD'}</td>
                                      <td className="py-2 truncate max-w-[120px]">{entry.reference || '—'}</td>
                                      <td className="py-2 truncate max-w-[150px]">{entry.description || '—'}</td>
                                      <td className="py-2">
                                        <Button size="icon" variant="ghost" disabled={!allowModals} onClick={() => guard(() => setFinanceEntries(prev => prev.filter(x => x.id !== entry.id)))}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-8">No entries found for this filter.</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-3">Shows up to 200 entries per filter. For full exports use the Export tab.</p>
                      </CardContent>
                    </Card>
                  </>
              )}

              {/* ===== COMPENSATION TAB ===== */}
              {financeTab === 'compensation' && (
                <>
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                    <h3 className="text-lg font-semibold">Staff Compensation</h3>
                    <Button disabled={!allowModals} onClick={() => guard(() => toast.info('Add compensation profile coming soon'))}>
                      <Plus className="h-4 w-4 mr-2" /> Add Profile
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card><CardContent className="pt-6 flex items-start gap-3"><Lock className="h-5 w-5 text-muted-foreground mt-0.5" /><div><p className="font-medium">Fixed Salary</p><p className="text-xs text-muted-foreground">Fixed monthly or weekly salary</p><Badge variant="secondary" className="mt-1">0 profiles</Badge></div></CardContent></Card>
                    <Card><CardContent className="pt-6 flex items-start gap-3"><Clock className="h-5 w-5 text-muted-foreground mt-0.5" /><div><p className="font-medium">Hourly</p><p className="text-xs text-muted-foreground">Rate × hours logged</p><Badge variant="secondary" className="mt-1">0 profiles</Badge></div></CardContent></Card>
                    <Card><CardContent className="pt-6 flex items-start gap-3"><Percent className="h-5 w-5 text-muted-foreground mt-0.5" /><div><p className="font-medium">Percentage</p><p className="text-xs text-muted-foreground">% of revenue they generate</p><Badge variant="secondary" className="mt-1">0 profiles</Badge></div></CardContent></Card>
                  </div>

                  <Card className="mb-6">
                    <CardHeader><CardTitle>Compensation Profiles</CardTitle></CardHeader>
                    <CardContent>
                      {compensationProfiles.length > 0 ? compensationProfiles.map(p => (
                        <div key={p.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{p.name || 'Staff'}</span>
                            <Badge variant="secondary">{p.pay_type || 'salary'}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">${(p.amount || 0).toFixed(2)}</span>
                            <Button size="sm" variant="outline" onClick={() => toast.info('Run payout coming soon')}>Run Payout</Button>
                            <Button size="sm" variant="ghost" onClick={() => toast.info('Edit coming soon')}>Edit</Button>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                          <p className="font-medium">No compensation profiles yet.</p>
                          <p className="text-sm mt-1">Add salary, hourly, or percentage-based pay for your staff.</p>
                          <Button className="mt-4" disabled={!allowModals} onClick={() => guard(() => toast.info('Add compensation profile coming soon'))}>
                            <Plus className="h-4 w-4 mr-2" /> Add Profile
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Run Payroll</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">Calculate owed amounts for all active profiles for a selected period.</p>
                      <div className="flex flex-wrap gap-3 mb-4">
                        <Input type="date" className="w-44" />
                        <Input type="date" className="w-44" />
                      </div>
                      <Button disabled={!allowModals} onClick={() => guard(() => toast.info('Payroll run coming soon'))}>Calculate & Run</Button>
                      <p className="text-xs text-muted-foreground mt-3">Running payroll creates ledger entries automatically for each active compensation profile.</p>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ===== RECURRING TAB ===== */}
              {financeTab === 'recurring' && (
                <>
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                    <h3 className="text-lg font-semibold">Recurring Rules</h3>
                    <Button disabled={!allowModals} onClick={() => guard(() => toast.info('Add rule coming soon'))}>
                      <Plus className="h-4 w-4 mr-2" /> Add Rule
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Due Rules</p><p className="text-2xl font-bold">{recurringRules.filter(r => r.status === 'due').length}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Active Rules</p><p className="text-2xl font-bold">{recurringRules.filter(r => r.status !== 'paused').length}</p></CardContent></Card>
                  </div>

                  <Card className="mb-6">
                    <CardHeader><CardTitle>Rules</CardTitle></CardHeader>
                    <CardContent>
                      {recurringRules.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b border-border text-left text-muted-foreground">
                              <th className="pb-2">Description</th><th className="pb-2">Category</th><th className="pb-2">Schedule</th><th className="pb-2">Next Run</th><th className="pb-2">Amount</th><th className="pb-2">Status</th><th className="pb-2">Actions</th>
                            </tr></thead>
                            <tbody>
                              {recurringRules.map(rule => (
                                <tr key={rule.id} className="border-b border-border/50">
                                  <td className="py-2">{rule.description}</td>
                                  <td className="py-2">{rule.category || '—'}</td>
                                  <td className="py-2"><Badge variant="secondary">{rule.schedule || 'monthly'}</Badge></td>
                                  <td className="py-2">{rule.next_run || '—'}</td>
                                  <td className="py-2 font-medium">${(rule.amount || 0).toFixed(2)}</td>
                                  <td className="py-2"><Badge variant={rule.status === 'active' ? 'default' : 'secondary'}>{rule.status}</Badge></td>
                                  <td className="py-2 flex gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => toast.info('Edit coming soon')}>Edit</Button>
                                    <Button size="sm" variant="ghost" onClick={() => toast.info('Pause coming soon')}>Pause</Button>
                                    <Button size="sm" variant="ghost" onClick={() => toast.info('Delete coming soon')}><Trash2 className="h-3 w-3" /></Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
                          <p className="font-medium">No recurring rules yet.</p>
                          <p className="text-sm mt-1">Automate repeating finance entries (utilities, rent, taxes, subscriptions).</p>
                          <Button className="mt-4" disabled={!allowModals} onClick={() => guard(() => toast.info('Add rule coming soon'))}>
                            <Plus className="h-4 w-4 mr-2" /> Add Rule
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="mb-6">
                    <CardHeader><CardTitle>Run Due Rules</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">Creates finance entries for all rules with next_run_date ≤ selected date. Catch-up supported.</p>
                      <div className="flex gap-3 items-end mb-3">
                        <div>
                          <label className="text-xs text-muted-foreground">As of</label>
                          <Input type="date" className="w-44" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
                        </div>
                        <Button disabled={!allowModals} onClick={() => guard(() => toast.info('Run due rules coming soon'))}>Run due now</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Recent Runs</span>
                        <Button size="sm" variant="ghost" onClick={() => toast.info('Refreshed')}>Refresh</Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground text-center py-8">No automation runs yet.</p>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ===== CATEGORIES TAB ===== */}
              {financeTab === 'categories' && (
                <>
                  <Card className="mb-6">
                    <CardHeader><CardTitle>Create Category</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3 items-end mb-3">
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-xs text-muted-foreground">Name</label>
                          <Input placeholder="e.g. Utilities: Electricity" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Color</label>
                          <div className="flex gap-2">
                            {['blue', 'green', 'orange', 'purple', 'red'].map(c => (
                              <button
                                key={c}
                                className={`w-6 h-6 rounded-full transition-all ${newCategoryColor === c ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                style={{ backgroundColor: c === 'blue' ? 'hsl(221, 83%, 53%)' : c === 'green' ? 'hsl(142, 71%, 45%)' : c === 'orange' ? 'hsl(38, 92%, 50%)' : c === 'purple' ? 'hsl(280, 68%, 60%)' : 'hsl(0, 84%, 60%)' }}
                                onClick={() => setNewCategoryColor(c)}
                              />
                            ))}
                          </div>
                        </div>
                        <Button disabled={!allowModals} onClick={() => guard(() => {
                          if (newCategoryName.trim()) {
                            setFinanceCategories(prev => [...prev, newCategoryName.trim()]);
                            setNewCategoryName('');
                            toast.success('Category added');
                          }
                        })}>Add</Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Tip: Set a consistent naming convention so reports are clean (e.g. "Utilities: Electricity", "Utilities: Water").</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Your Categories</span>
                        <Button size="sm" variant="ghost" onClick={() => toast.info('Refreshed')}>Refresh</Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {financeCategories.length > 0 ? financeCategories.map((cat, i) => {
                        const count = financeEntries.filter(e => e.category === cat).length;
                        return (
                          <div key={cat} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: catColors[i % catColors.length] }} />
                            <span className="flex-1 text-sm font-medium">{cat}</span>
                            <Badge variant="secondary">{count} entries</Badge>
                            {count === 0 && (
                              <Button size="icon" variant="ghost" disabled={!allowModals} onClick={() => guard(() => setFinanceCategories(prev => prev.filter(c => c !== cat)))}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      }) : (
                        <p className="text-sm text-muted-foreground text-center py-8">No categories yet. Add one above.</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ===== EXPORT TAB ===== */}
              {financeTab === 'export' && (
                <>
                  <Card className="mb-6">
                    <CardHeader><CardTitle>Export Finance Entries</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <Input type="date" />
                        <Input type="date" />
                        <select className="border border-border rounded-md px-3 py-1 text-sm bg-background">
                          <option>All</option><option>Income</option><option>Expense</option><option>Payroll</option>
                        </select>
                        <select className="border border-border rounded-md px-3 py-1 text-sm bg-background">
                          <option>All categories</option>
                          {financeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <Button disabled={!allowModals} onClick={() => guard(() => toast.info('Export coming soon'))}>
                        <Download className="h-4 w-4 mr-2" /> Export CSV
                      </Button>
                      <p className="text-xs text-muted-foreground mt-3">Export monthly ranges and share with your accountant. Filters help isolate payroll vs supplies vs utilities.</p>
                    </CardContent>
                  </Card>

                  <Card className="mb-6">
                    <CardHeader><CardTitle>Export Recurring Runs</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3 mb-4">
                        <Input type="date" className="w-44" />
                        <Input type="date" className="w-44" />
                      </div>
                      <Button disabled={!allowModals} onClick={() => guard(() => toast.info('Export recurring runs coming soon'))}>
                        <Download className="h-4 w-4 mr-2" /> Export CSV
                      </Button>
                      <p className="text-xs text-muted-foreground mt-3">Exports rule runs + linked created entries for auditing and analytics.</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Export Payroll</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3 mb-4">
                        <select className="border border-border rounded-md px-3 py-1 text-sm bg-background">
                          <option>This Month</option><option>Last Month</option><option>Custom</option>
                        </select>
                      </div>
                      <Button disabled={!allowModals} onClick={() => guard(() => toast.info('Export payroll coming soon'))}>
                        <Download className="h-4 w-4 mr-2" /> Export CSV
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </SectionWrapper>
        );
      }

      case "analytics": {
        const analyticsTabs = [
          { key: 'overview' as const, label: 'Overview' },
          { key: 'appointments' as const, label: 'Appointments' },
          { key: 'providers' as const, label: 'Providers' },
          { key: 'patients' as const, label: 'Patients' },
          { key: 'financial' as const, label: 'Financial' },
          { key: 'services' as const, label: 'Services' },
        ];

        const completedAppts = appointments.filter((a: any) => a.status === 'completed').length;
        const cancelledAppts = appointments.filter((a: any) => a.status === 'cancelled').length;
        const noShowAppts = appointments.filter((a: any) => a.status === 'no_show' || a.status === 'no-show').length;

        const apptsByMonth: Record<string, number> = {};
        try { appointments.forEach((a: any) => { const m = (a.appointment_date || a.created_at || '').slice(0, 7); if (m) apptsByMonth[m] = (apptsByMonth[m] || 0) + 1; }); } catch {}
        const apptMonthData = Object.entries(apptsByMonth).sort(([a],[b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));

        const statusBreakdown: Record<string, number> = {};
        appointments.forEach((a: any) => { const s = a.status || 'unknown'; statusBreakdown[s] = (statusBreakdown[s] || 0) + 1; });
        const statusColors: Record<string, string> = { completed: 'bg-green-500', pending: 'bg-yellow-500', confirmed: 'bg-blue-500', cancelled: 'bg-destructive', 'no_show': 'bg-orange-500', 'no-show': 'bg-orange-500' };

        const hourBuckets: number[] = new Array(24).fill(0);
        try { appointments.forEach((a: any) => { if (a.start_time) { const h = parseInt(a.start_time.split(':')[0], 10); if (!isNaN(h) && h >= 0 && h < 24) hourBuckets[h]++; } }); } catch {}

        const cancellationByMonth: Record<string, { total: number; cancelled: number }> = {};
        try { appointments.forEach((a: any) => { const m = (a.appointment_date || a.created_at || '').slice(0, 7); if (m) { if (!cancellationByMonth[m]) cancellationByMonth[m] = { total: 0, cancelled: 0 }; cancellationByMonth[m].total++; if (a.status === 'cancelled' || a.status === 'no_show' || a.status === 'no-show') cancellationByMonth[m].cancelled++; } }); } catch {}
        const cancellationRateData = Object.entries(cancellationByMonth).sort(([a],[b]) => a.localeCompare(b)).map(([date, d]) => ({ date, rate: d.total > 0 ? Math.round(d.cancelled / d.total * 100) : 0 }));

        const bookingSources: Record<string, number> = {};
        appointments.forEach((a: any) => { const src = (a as any).source || (a as any).booking_source || 'Unknown'; bookingSources[src] = (bookingSources[src] || 0) + 1; });

        const providerStats = doctors.map((d: any) => {
          const pAppts = appointments.filter((a: any) => a.doctor_name === d.name || a.doctor_id === d.id);
          const comp = pAppts.filter((a: any) => a.status === 'completed').length;
          const canc = pAppts.filter((a: any) => a.status === 'cancelled').length;
          const uPatients = new Set(pAppts.map((a: any) => a.patient_id || a.patient_name)).size;
          return { name: d.name || d.full_name || 'Unknown', specialty: d.specialty || '—', total: pAppts.length, completed: comp, cancelled: canc, completionRate: pAppts.length > 0 ? Math.round(comp / pAppts.length * 100) : 0, cancellationRate: pAppts.length > 0 ? Math.round(canc / pAppts.length * 100) : 0, uniquePatients: uPatients, rating: d.rating || d.average_rating || '—' };
        }).sort((a, b) => b.total - a.total);
        const maxProvAppts = Math.max(...providerStats.map(p => p.total), 1);

        const now90 = new Date(); now90.setDate(now90.getDate() - 90);
        let activePatients = 0; let inactivePatientsCount = 0;
        try { patients.forEach((p: any) => { const lv = p.last_visit || p.updated_at; if (lv && new Date(lv) >= now90) activePatients++; else inactivePatientsCount++; }); } catch { inactivePatientsCount = patients.length; }
        const avgVisits = appointments.length > 0 && patients.length > 0 ? (appointments.length / patients.length).toFixed(1) : '0';

        const patientsByMonth: Record<string, number> = {};
        try { patients.forEach((p: any) => { const m = (p.created_at || '').slice(0, 7); if (m) patientsByMonth[m] = (patientsByMonth[m] || 0) + 1; }); } catch {}
        const patientMonthsSorted = Object.entries(patientsByMonth).sort(([a],[b]) => a.localeCompare(b));
        let runningTotal = 0;
        const patientGrowthData = patientMonthsSorted.map(([date, count]) => { runningTotal += count; return { date, count: runningTotal }; });

        const genderBreakdown: Record<string, number> = {};
        patients.forEach((p: any) => { const g = p.gender || 'Unknown'; genderBreakdown[g] = (genderBreakdown[g] || 0) + 1; });

        const ageBuckets: Record<string, number> = { '0–17': 0, '18–35': 0, '36–50': 0, '51–65': 0, '65+': 0 };
        try { const nowDate = new Date(); patients.forEach((p: any) => { const dob = p.date_of_birth || p.dob; if (dob) { const age = Math.floor((nowDate.getTime() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)); if (age <= 17) ageBuckets['0–17']++; else if (age <= 35) ageBuckets['18–35']++; else if (age <= 50) ageBuckets['36–50']++; else if (age <= 65) ageBuckets['51–65']++; else ageBuckets['65+']++; } }); } catch {}

        const inactivePatientsList = (() => { try { return patients.filter((p: any) => { const lv = p.last_visit || p.updated_at; return !lv || new Date(lv) < now90; }).slice(0, 10); } catch { return []; } })();
        const totalInactive = (() => { try { return patients.filter((p: any) => { const lv = p.last_visit || p.updated_at; return !lv || new Date(lv) < now90; }).length; } catch { return 0; } })();

        const patientVisitCounts: Record<string, { name: string; provider: string; count: number; lastVisit: string }> = {};
        appointments.forEach((a: any) => { const key = a.patient_id || a.patient_name || 'Unknown'; if (!patientVisitCounts[key]) patientVisitCounts[key] = { name: a.patient_name || key, provider: a.doctor_name || '—', count: 0, lastVisit: '' }; patientVisitCounts[key].count++; const d = a.appointment_date || a.created_at || ''; if (d > patientVisitCounts[key].lastVisit) patientVisitCounts[key].lastVisit = d; });
        const topPatients = Object.values(patientVisitCounts).sort((a, b) => b.count - a.count).slice(0, 10);

        const billingData: any = billing.data || {};
        const totalRevCents = billingData?.summary?.totalRevenueCents ?? 0;
        const pendingCents = billingData?.summary?.pendingCents ?? 0;
        const refundCents = billingData?.summary?.refundCents ?? 0;
        const txCount = billingData?.summary?.transactionCount ?? 0;
        const txList: any[] = billingData?.transactions || [];

        const revByMonth: Record<string, number> = {};
        try { txList.forEach((tx: any) => { const m = (tx.created_at || '').slice(0, 7); if (m) revByMonth[m] = (revByMonth[m] || 0) + ((tx.amount_cents || tx.amount || 0) / 100); }); } catch {}
        const revTrendData = Object.entries(revByMonth).sort(([a],[b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }));

        const payMethodBreakdown: Record<string, { count: number; total: number }> = {};
        txList.forEach((tx: any) => { const m = tx.payment_method || 'Unknown'; if (!payMethodBreakdown[m]) payMethodBreakdown[m] = { count: 0, total: 0 }; payMethodBreakdown[m].count++; payMethodBreakdown[m].total += (tx.amount_cents || tx.amount || 0) / 100; });

        const serviceBookings: Record<string, number> = {};
        services.forEach((s: any) => { const count = appointments.filter((a: any) => a.service_name === s.name || a.service === s.name || (a as any).procedure_name === s.name).length; serviceBookings[s.name || s.id] = count; });
        const mostBooked = Object.entries(serviceBookings).sort(([,a],[,b]) => b - a);
        const serviceCats = new Set(services.map((s: any) => s.category).filter(Boolean));
        const zeroBookingServices = services.filter((s: any) => (serviceBookings[s.name || s.id] || 0) === 0);
        const catServiceCounts: Record<string, number> = {};
        services.forEach((s: any) => { const c = s.category || 'Uncategorized'; catServiceCounts[c] = (catServiceCounts[c] || 0) + 1; });
        const catChartData = Object.entries(catServiceCounts).map(([category, count]) => ({ category, count }));

        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className={sectionShellClass}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-xl font-semibold">{t("adminAnalytics.title")}</h2>
                <div className="flex gap-2 flex-wrap">
                  {practice?.id && <BranchSelector practiceId={practice.id} value={branchFilter} onChange={setBranchFilter} />}
                  <Button variant={analyticsRange === "7d" ? "default" : "outline"} onClick={() => guard(() => setAnalyticsRange("7d"))}>7D</Button>
                  <Button variant={analyticsRange === "30d" ? "default" : "outline"} onClick={() => guard(() => setAnalyticsRange("30d"))}>30D</Button>
                  <Button variant={analyticsRange === "90d" ? "default" : "outline"} onClick={() => guard(() => setAnalyticsRange("90d"))}>90D</Button>
                  <Button variant="outline" onClick={() => guard(() => analytics.refetch())}>{t("adminAnalytics.refresh")}</Button>
                </div>
              </div>

              <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
                {analyticsTabs.map(tab => (
                  <Button key={tab.key} variant="ghost" size="sm" className={`rounded-none ${analyticsTab === tab.key ? 'border-b-2 border-primary font-medium' : ''}`} onClick={() => setAnalyticsTab(tab.key)}>{tab.label}</Button>
                ))}
              </div>

              {analyticsTab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: t("adminAnalytics.appointments"), value: (analytics.data as any)?.summary?.appointments ?? appointments.length },
                      { label: t("adminAnalytics.uniquePatients"), value: (analytics.data as any)?.summary?.patients ?? patients.length },
                      { label: t("adminAnalytics.providers"), value: (analytics.data as any)?.summary?.providers ?? doctors.filter((d: any) => d.status === 'active').length },
                      { label: t("adminAnalytics.locations"), value: (analytics.data as any)?.summary?.locations ?? locations.length },
                    ].map((kpi, i) => (
                      <Card key={i} className="rounded-xl"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">{kpi.label}</p>{analytics.loading ? <Loader2 className="h-4 w-4 animate-spin mt-1" /> : <p className="text-2xl font-bold">{kpi.value}</p>}</CardContent></Card>
                    ))}
                  </div>
                  <div className={sectionMainGridClass}>
                    <Card className="rounded-xl lg:col-span-8 min-w-0">
                      <CardHeader><CardTitle>{t("adminAnalytics.dailyTrend")}</CardTitle></CardHeader>
                      <CardContent>
                        {analytics.loading ? (
                          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>{t("adminAnalytics.loading")}</span></div>
                        ) : analytics.error ? (
                          <p className="text-sm text-destructive">{analytics.error}</p>
                        ) : !(analytics.data as any)?.trend?.length ? (
                          <div className="text-center py-8 text-muted-foreground"><TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>{t("adminAnalytics.noData")}</p></div>
                        ) : (
                          <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={(analytics.data as any).trend as DailyTrendPoint[]}>
                                <defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="currentColor" stopOpacity={0.25} /><stop offset="95%" stopColor="currentColor" stopOpacity={0} /></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip />
                                <Area type="monotone" dataKey="value" stroke="currentColor" fillOpacity={1} fill="url(#colorValue)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl lg:col-span-4 min-w-0">
                      <CardHeader><CardTitle>{t("adminAnalytics.summary")}</CardTitle></CardHeader>
                      <CardContent>
                        {analytics.loading ? (
                          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>{t("adminAnalytics.loading")}</span></div>
                        ) : analytics.error ? (
                          <p className="text-sm text-destructive">{analytics.error}</p>
                        ) : analytics.data ? (() => { const a: any = analytics.data; return (
                          <div className="space-y-3">
                            <div className="flex justify-between"><span>{t("adminAnalytics.appointments")}</span><span className="font-semibold">{a.summary?.appointments ?? 0}</span></div>
                            <div className="flex justify-between"><span>{t("adminAnalytics.uniquePatients")}</span><span className="font-semibold">{a.summary?.patients ?? 0}</span></div>
                            <div className="flex justify-between"><span>{t("adminAnalytics.providers")}</span><span className="font-semibold">{a.summary?.providers ?? 0}</span></div>
                            <div className="flex justify-between"><span>{t("adminAnalytics.locations")}</span><span className="font-semibold">{a.summary?.locations ?? 0}</span></div>
                            <div className="pt-2 text-xs text-muted-foreground">{t("adminAnalytics.range")}: {a.period?.from ?? "—"} → {a.period?.to ?? "—"}</div>
                            <div className="pt-2 text-xs text-muted-foreground">Range: {a.period?.from ?? "—"} → {a.period?.to ?? "—"}</div>
                          </div>
                        ); })() : <p className="text-sm text-muted-foreground">{t("adminAnalytics.noData")}</p>}
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="rounded-xl mt-6">
                    <CardHeader><CardTitle className="flex items-center justify-between"><span>{t("admin.overview.advancedFinancialMetrics")}</span><Button variant="outline" size="sm" onClick={() => guard(() => refreshAdvancedMetrics())}>{t("adminBilling.refresh")}</Button></CardTitle></CardHeader>
                    <CardContent><AdvancedFinancialMetrics metrics={advancedMetrics} revenue={0} onUpdateInputs={() => {}} /></CardContent>
                  </Card>
                </>
              )}

              {analyticsTab === 'appointments' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[{ label: 'Total', value: appointments.length }, { label: 'Completed', value: completedAppts }, { label: 'Cancelled', value: cancelledAppts }, { label: 'No-show', value: noShowAppts }].map((kpi, i) => (
                      <Card key={i} className="rounded-xl"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">{kpi.label}</p><p className="text-2xl font-bold">{kpi.value}</p></CardContent></Card>
                    ))}
                  </div>
                  <div className={sectionMainGridClass}>
                    <Card className="rounded-xl lg:col-span-8 min-w-0">
                      <CardHeader><CardTitle>{t("adminAnalytics.dailyTrend")}</CardTitle></CardHeader>
                      <CardContent>
                        {(analytics.data as any)?.trend?.length ? (
                          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={(analytics.data as any).trend as DailyTrendPoint[]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} /></AreaChart></ResponsiveContainer></div>
                        ) : apptMonthData.length > 0 ? (
                          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={apptMonthData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} /></AreaChart></ResponsiveContainer></div>
                        ) : <div className="text-center py-8 text-muted-foreground"><TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>{t("adminAnalytics.noData")}</p></div>}
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl lg:col-span-4 min-w-0">
                      <CardHeader><CardTitle>Booking Source</CardTitle></CardHeader>
                      <CardContent>
                        {Object.keys(bookingSources).length > 0 ? (
                          <div className="space-y-3">{Object.entries(bookingSources).sort(([,a],[,b]) => b - a).map(([src, count]) => (<div key={src}><div className="flex justify-between text-sm mb-1"><span>{src}</span><span className="font-medium">{count}</span></div><Progress value={appointments.length > 0 ? (count / appointments.length) * 100 : 0} className="h-2" /></div>))}</div>
                        ) : <p className="text-sm text-muted-foreground">No booking source data.</p>}
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="rounded-xl mt-4">
                    <CardHeader><CardTitle>Appointment Status Breakdown</CardTitle></CardHeader>
                    <CardContent>
                      {Object.keys(statusBreakdown).length > 0 ? (
                        <div className="space-y-3">{Object.entries(statusBreakdown).sort(([,a],[,b]) => b - a).map(([status, count]) => (<div key={status}><div className="flex justify-between text-sm mb-1"><span className="capitalize">{status.replace('_', ' ')}</span><span className="font-medium">{count} ({appointments.length > 0 ? Math.round(count / appointments.length * 100) : 0}%)</span></div><div className="h-2 rounded-full bg-secondary overflow-hidden"><div className={`h-full rounded-full ${statusColors[status] || 'bg-primary'}`} style={{ width: `${appointments.length > 0 ? (count / appointments.length) * 100 : 0}%` }} /></div></div>))}</div>
                      ) : <p className="text-sm text-muted-foreground">No appointment data.</p>}
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl mt-4">
                    <CardHeader><CardTitle>Busiest Hours</CardTitle></CardHeader>
                    <CardContent>
                      {hourBuckets.some(v => v > 0) ? (
                        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">{hourBuckets.map((count, h) => { const bg = count === 0 ? 'bg-muted/20' : count <= 2 ? 'bg-primary/20' : count <= 5 ? 'bg-primary/40' : 'bg-primary/70'; const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`; return <div key={h} className={`${bg} rounded-md p-2 text-center text-xs`}><div className="font-medium">{label}</div><div>{count}</div></div>; })}</div>
                      ) : <p className="text-sm text-muted-foreground">No appointment time data available.</p>}
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl mt-4">
                    <CardHeader><CardTitle>Cancellation & No-show Rate</CardTitle></CardHeader>
                    <CardContent>
                      {cancellationRateData.length > 1 ? (
                        <div className="h-52"><ResponsiveContainer width="100%" height="100%"><AreaChart data={cancellationRateData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis unit="%" /><Tooltip /><Area type="monotone" dataKey="rate" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} /></AreaChart></ResponsiveContainer></div>
                      ) : <p className="text-sm text-muted-foreground">Insufficient data to show cancellation trends.</p>}
                    </CardContent>
                  </Card>
                </>
              )}

              {analyticsTab === 'providers' && (
                <>
                  <Card className="rounded-xl mb-4">
                    <CardHeader><CardTitle>Provider Performance</CardTitle></CardHeader>
                    <CardContent>
                      {providerStats.length > 0 ? (
                        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2 font-medium">Provider</th><th className="pb-2 font-medium">Specialty</th><th className="pb-2 font-medium">Total</th><th className="pb-2 font-medium">Completed</th><th className="pb-2 font-medium">Patients</th><th className="pb-2 font-medium">Completion</th><th className="pb-2 font-medium">Cancel %</th><th className="pb-2 font-medium">Rating</th></tr></thead><tbody>{providerStats.map((p, i) => (<tr key={i} className="border-b last:border-0"><td className="py-2 font-medium">{p.name}</td><td className="py-2 text-muted-foreground">{p.specialty}</td><td className="py-2">{p.total}</td><td className="py-2">{p.completed}</td><td className="py-2">{p.uniquePatients}</td><td className="py-2"><Badge variant="secondary" className="bg-green-100 text-green-800">{p.completionRate}%</Badge></td><td className="py-2"><Badge variant="secondary" className="bg-red-100 text-red-800">{p.cancellationRate}%</Badge></td><td className="py-2">{p.rating}</td></tr>))}</tbody></table></div>
                      ) : <div className="text-center py-8 text-muted-foreground"><Stethoscope className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>No provider data yet.</p></div>}
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>Provider Utilization</CardTitle></CardHeader>
                      <CardContent>
                        {providerStats.length > 0 ? (
                          <div className="space-y-3">{providerStats.map((p, i) => { const util = Math.round((p.total / maxProvAppts) * 100); const barColor = util < 30 ? 'bg-destructive' : util < 70 ? 'bg-yellow-500' : 'bg-green-500'; return (<div key={i}><div className="flex justify-between text-sm mb-1"><span>{p.name}</span><span className="font-medium">{util}%</span></div><div className="h-2 rounded-full bg-secondary overflow-hidden"><div className={`h-full rounded-full ${barColor}`} style={{ width: `${util}%` }} /></div></div>); })}</div>
                        ) : <p className="text-sm text-muted-foreground">No data.</p>}
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>Top Providers by Volume</CardTitle></CardHeader>
                      <CardContent>
                        {providerStats.length > 0 ? (
                          <div className="space-y-3">{providerStats.slice(0, 5).map((p, i) => (<div key={i} className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div><div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{p.name}</p><p className="text-xs text-muted-foreground">{p.specialty}</p></div><Badge variant="secondary">{p.total}</Badge></div>))}</div>
                        ) : <p className="text-sm text-muted-foreground">No providers yet.</p>}
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="rounded-xl">
                    <CardHeader><CardTitle>Provider Comparison</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">Select two providers to compare side-by-side.</p>
                      <div className="flex gap-4 flex-wrap mb-4">
                        <select className="border rounded-md px-3 py-2 text-sm bg-background" defaultValue=""><option value="" disabled>Select Provider A</option>{doctors.map((d: any, i: number) => <option key={i} value={d.name || d.full_name}>{d.name || d.full_name}</option>)}</select>
                        <select className="border rounded-md px-3 py-2 text-sm bg-background" defaultValue=""><option value="" disabled>Select Provider B</option>{doctors.map((d: any, i: number) => <option key={i} value={d.name || d.full_name}>{d.name || d.full_name}</option>)}</select>
                      </div>
                      <p className="text-sm text-muted-foreground">Select two providers to compare.</p>
                    </CardContent>
                  </Card>
                </>
              )}

              {analyticsTab === 'patients' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[{ label: 'Total Patients', value: patients.length }, { label: 'Active (90d)', value: activePatients }, { label: 'Inactive (90d+)', value: inactivePatientsCount }, { label: 'Avg Visits', value: avgVisits }].map((kpi, i) => (
                      <Card key={i} className="rounded-xl"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">{kpi.label}</p><p className="text-2xl font-bold">{kpi.value}</p></CardContent></Card>
                    ))}
                  </div>
                  <Card className="rounded-xl mb-4">
                    <CardHeader><CardTitle>Patient Growth</CardTitle></CardHeader>
                    <CardContent>
                      {patientGrowthData.length > 0 ? (
                        <div className="h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={patientGrowthData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} /></AreaChart></ResponsiveContainer></div>
                      ) : <div className="text-center py-8 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>No patient data yet.</p></div>}
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>Gender Breakdown</CardTitle></CardHeader>
                      <CardContent>
                        {Object.keys(genderBreakdown).length > 0 ? (
                          <div className="space-y-3">{Object.entries(genderBreakdown).sort(([,a],[,b]) => b - a).map(([g, count]) => (<div key={g}><div className="flex justify-between text-sm mb-1"><span className="capitalize">{g}</span><span className="font-medium">{count}</span></div><Progress value={patients.length > 0 ? (count / patients.length) * 100 : 0} className="h-2" /></div>))}</div>
                        ) : <p className="text-sm text-muted-foreground">No gender data available.</p>}
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>Age Distribution</CardTitle></CardHeader>
                      <CardContent>
                        {Object.values(ageBuckets).some(v => v > 0) ? (
                          <div className="space-y-3">{Object.entries(ageBuckets).map(([bucket, count]) => (<div key={bucket}><div className="flex justify-between text-sm mb-1"><span>{bucket}</span><span className="font-medium">{count}</span></div><Progress value={patients.length > 0 ? (count / patients.length) * 100 : 0} className="h-2" /></div>))}</div>
                        ) : <p className="text-sm text-muted-foreground">No DOB data available.</p>}
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="rounded-xl mb-4">
                    <CardHeader><CardTitle>Inactive Patients (90+ days)</CardTitle></CardHeader>
                    <CardContent>
                      {inactivePatientsList.length > 0 ? (
                        <><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">Last Visit</th><th className="pb-2 font-medium">Provider</th><th className="pb-2 font-medium">Actions</th></tr></thead><tbody>{inactivePatientsList.map((p: any, i: number) => (<tr key={i} className="border-b last:border-0"><td className="py-2 font-medium">{p.full_name || p.name || '—'}</td><td className="py-2 text-muted-foreground">{(() => { try { return p.last_visit ? format(new Date(p.last_visit), 'MMM dd, yyyy') : '—'; } catch { return '—'; } })()}</td><td className="py-2 text-muted-foreground">{p.doctor_name || '—'}</td><td className="py-2"><Button size="sm" variant="outline" onClick={() => toast.info('Re-engage coming soon')}>Re-engage</Button></td></tr>))}</tbody></table></div>{totalInactive > 10 && <p className="text-xs text-muted-foreground mt-2">and {totalInactive - 10} more</p>}</>
                      ) : <div className="text-center py-6 text-muted-foreground"><CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-50" /><p>No inactive patients. Great retention!</p></div>}
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardHeader><CardTitle>Top Patients by Visits</CardTitle></CardHeader>
                    <CardContent>
                      {topPatients.length > 0 ? (
                        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2 font-medium">#</th><th className="pb-2 font-medium">Patient</th><th className="pb-2 font-medium">Provider</th><th className="pb-2 font-medium">Visits</th><th className="pb-2 font-medium">Last Visit</th></tr></thead><tbody>{topPatients.map((p, i) => (<tr key={i} className="border-b last:border-0"><td className="py-2 font-medium">{i + 1}</td><td className="py-2">{p.name}</td><td className="py-2 text-muted-foreground">{p.provider}</td><td className="py-2"><Badge variant="secondary">{p.count}</Badge></td><td className="py-2 text-muted-foreground">{(() => { try { return p.lastVisit ? format(new Date(p.lastVisit), 'MMM dd, yyyy') : '—'; } catch { return '—'; } })()}</td></tr>))}</tbody></table></div>
                      ) : <p className="text-sm text-muted-foreground">No appointment data yet.</p>}
                    </CardContent>
                  </Card>
                </>
              )}

              {analyticsTab === 'financial' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[{ label: 'Total Revenue', value: `$${(totalRevCents / 100).toFixed(2)}` }, { label: 'Pending', value: `$${(pendingCents / 100).toFixed(2)}`, color: 'text-yellow-600' }, { label: 'Refunds', value: `$${(refundCents / 100).toFixed(2)}`, color: 'text-destructive' }, { label: 'Transactions', value: txCount }].map((kpi, i) => (
                      <Card key={i} className="rounded-xl"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">{kpi.label}</p>{billing.loading ? <Loader2 className="h-4 w-4 animate-spin mt-1" /> : <p className={`text-2xl font-bold ${(kpi as any).color || ''}`}>{kpi.value}</p>}</CardContent></Card>
                    ))}
                  </div>
                  <Card className="rounded-xl mb-4">
                    <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
                    <CardContent>
                      {revTrendData.length > 0 ? (
                        <div className="h-60"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revTrendData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Area type="monotone" dataKey="amount" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%)" fillOpacity={0.15} /></AreaChart></ResponsiveContainer></div>
                      ) : <div className="text-center py-8 text-muted-foreground"><DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>No revenue data yet.</p></div>}
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>Revenue by Provider</CardTitle></CardHeader>
                      <CardContent>
                        {doctors.length > 0 ? (
                          <div className="space-y-3">{doctors.map((d: any, i: number) => (<div key={i}><div className="flex justify-between text-sm mb-1"><span>{d.name || d.full_name || 'Unknown'}</span><span className="font-medium">$0.00</span></div><Progress value={0} className="h-2" /></div>))}<p className="text-xs text-muted-foreground mt-2">Revenue per provider breakdown will populate with billing data.</p></div>
                        ) : <p className="text-sm text-muted-foreground">No providers.</p>}
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>Payment Method Breakdown</CardTitle></CardHeader>
                      <CardContent>
                        {Object.keys(payMethodBreakdown).length > 0 ? (
                          <div className="space-y-3">{Object.entries(payMethodBreakdown).sort(([,a],[,b]) => b.total - a.total).map(([method, data]) => (<div key={method}><div className="flex justify-between text-sm mb-1"><span className="capitalize">{method}</span><span className="font-medium">{data.count} · ${data.total.toFixed(2)}</span></div><Progress value={txList.length > 0 ? (data.count / txList.length) * 100 : 0} className="h-2" /></div>))}</div>
                        ) : <p className="text-sm text-muted-foreground">No transaction data.</p>}
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="rounded-xl">
                    <CardHeader><CardTitle>Average Revenue per Appointment</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-center py-4"><p className="text-4xl font-bold">${appointments.length > 0 ? ((totalRevCents / 100) / appointments.length).toFixed(2) : '0.00'}</p><p className="text-sm text-muted-foreground mt-1">per appointment</p></div>
                      {appointments.length === 0 && <p className="text-sm text-muted-foreground text-center">Insufficient data to calculate.</p>}
                    </CardContent>
                  </Card>
                </>
              )}

              {analyticsTab === 'services' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[{ label: 'Total Services', value: services.length }, { label: 'Most Booked', value: mostBooked.length > 0 ? mostBooked[0][0] : '—' }, { label: 'Categories', value: serviceCats.size }, { label: 'Zero Bookings', value: zeroBookingServices.length }].map((kpi, i) => (
                      <Card key={i} className="rounded-xl"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">{kpi.label}</p><p className="text-2xl font-bold truncate">{kpi.value}</p></CardContent></Card>
                    ))}
                  </div>
                  <Card className="rounded-xl mb-4">
                    <CardHeader><CardTitle>Most Booked Services</CardTitle></CardHeader>
                    <CardContent>
                      {mostBooked.length > 0 ? (
                        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2 font-medium">#</th><th className="pb-2 font-medium">Service</th><th className="pb-2 font-medium">Category</th><th className="pb-2 font-medium">Bookings</th><th className="pb-2 font-medium">Est. Revenue</th></tr></thead><tbody>{mostBooked.slice(0, 10).map(([name, count], i) => { const svc = services.find((s: any) => s.name === name); return (<tr key={i} className="border-b last:border-0"><td className="py-2 font-medium">{i + 1}</td><td className="py-2">{name}</td><td className="py-2"><Badge variant="secondary">{(svc as any)?.category || '—'}</Badge></td><td className="py-2">{count}</td><td className="py-2">${((svc as any)?.price || (svc as any)?.cost || 0) * count}</td></tr>); })}</tbody></table></div>
                      ) : <p className="text-sm text-muted-foreground">No booking data available yet.</p>}
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>Services by Category</CardTitle></CardHeader>
                      <CardContent>
                        {catChartData.length > 0 ? (
                          <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={catChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="category" /><YAxis /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
                        ) : <p className="text-sm text-muted-foreground">No services data.</p>}
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>No Recent Bookings</CardTitle></CardHeader>
                      <CardContent>
                        {zeroBookingServices.length > 0 ? (
                          <div className="space-y-3">{zeroBookingServices.map((s: any, i: number) => (<div key={i} className="flex items-center justify-between"><div><p className="text-sm font-medium">{s.name}</p><div className="flex gap-2 mt-1"><Badge variant="secondary">{s.category || '—'}</Badge><span className="text-xs text-muted-foreground">${s.price || s.cost || 0}</span></div></div><Button size="sm" variant="outline" onClick={() => toast.info('Review service coming soon')}>Review</Button></div>))}</div>
                        ) : <div className="text-center py-6 text-muted-foreground"><CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-50" /><p>All services have bookings!</p></div>}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          </SectionWrapper>
        );
      }

      case "settings":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className={sectionShellClass}>
              {practice?.id ? (
                <EntitySettingsPage entityType="clinic" entityId={practice.id} heading={t("admin.settings.title", { defaultValue: "Clinic Settings" })} />
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">{t("admin.staff.noStaff", { defaultValue: "No practice linked" })}</p>
                </div>
              )}
            </div>
          </SectionWrapper>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
          <Sidebar>
            <SidebarContent className="pt-16">
              <SidebarGroup>
                <SidebarGroupLabel className="flex items-center justify-between">
                  <span>{t("adminSidebar.title")}</span>
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

                if (isVerified && seenAt && now - Number(seenAt) > ONE_DAY) {
                  return null;
                }

                if (isVerified && !seenAt && practice?.id) {
                  localStorage.setItem(STORAGE_KEY, String(now));
                }

                return (
                  <SidebarGroup>
                    <SidebarGroupLabel className="flex items-center justify-between">
                      <span>{t("adminSidebar.status")}</span>
                      <Badge className={getVerificationStatusColor(verificationStatus)}>{verificationStatus}</Badge>
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <div className="p-3 space-y-3">
                        <div className="text-xs text-muted-foreground">{getVerificationMessage(verificationStatus)}</div>
                        {!isVerified ? (
                          <Button onClick={() => setCreateClinicOpen(true)} className="w-full">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t("adminSidebar.verify")}
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={() => toast.success("You're verified!")} className="w-full">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t("adminSidebar.verified")}
                          </Button>
                        )}
                      </div>
                    </SidebarGroupContent>
                  </SidebarGroup>
                );
              })()}
            </SidebarContent>
          </Sidebar>

      <div className="min-h-screen bg-background flex flex-col pt-16 flex-1">
        <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6">
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

          <main className="flex-1 overflow-auto w-full min-w-0 px-4 py-6 sm:px-6">
            <div className="w-full min-w-0 space-y-6">{renderSection()}</div>
          </main>

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
