// File: src/pages/AdminDashboard.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
import AdminImportPatientsDialog from "@/components/admin/patients/AdminImportPatientsDialog";
import { MedicalCardDownloadButton } from "@/components/MedicalCardDownloadButton";
import { PatientFinanceSection } from "@/components/PatientFinanceSection";

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
import { useEntitySettings } from "@/hooks/useEntitySettings";
import { useFinanceEntries } from "@/hooks/useFinanceEntries";
import { useFinanceCategories } from "@/hooks/useFinanceCategories";

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
  const [importPatientsOpen, setImportPatientsOpen] = useState(false);

  const [billingRange, setBillingRange] = useState<"7d" | "30d" | "90d">("30d");
  const [analyticsRange, setAnalyticsRange] = useState<"7d" | "30d" | "90d">("30d");
  const [branchFilter, setBranchFilter] = useState<string | null>(null);

  // Provider section state
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [providerTab, setProviderTab] = useState<'overview' | 'calendar' | 'patients' | 'analytics' | 'procedures' | 'reviews' | 'documents' | 'rules'>('overview');
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
  const [insurers, setInsurers] = useState<string[]>([]);
  const [newInsurerName, setNewInsurerName] = useState('');
  const [claims, setClaims] = useState<any[]>([]);
  const [claimStatusFilter, setClaimStatusFilter] = useState('all');
  const [claimSearch, setClaimSearch] = useState('');
  const [addClaimOpen, setAddClaimOpen] = useState(false);
  const [claimForm, setClaimForm] = useState({ patient_name: '', insurer: '', service: '', amount: '', submitted_date: '', notes: '' });

  // Audit logs viewer
  const [auditLogsOpen, setAuditLogsOpen] = useState(false);
  const [auditLogsRows, setAuditLogsRows] = useState<any[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const loadAuditLogs = useCallback(async () => {
    setAuditLogsLoading(true);
    try {
      const { data, error } = await (supabase as any).from('audit_logs').select('id, action, actor_email, entity_type, entity_id, details, created_at').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      setAuditLogsRows(data || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load audit logs');
    } finally {
      setAuditLogsLoading(false);
    }
  }, []);

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
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'appointments' | 'providers' | 'patients' | 'financial' | 'services' | 'reports'>('overview');
  const [reportMetrics, setReportMetrics] = useState<string[]>([]);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportProvider, setReportProvider] = useState('all');
  const [reportService, setReportService] = useState('all');
  const [reportBranch, setReportBranch] = useState('all');
  const [reportGenerated, setReportGenerated] = useState<any[] | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'clinic' | 'booking' | 'notifications' | 'branding' | 'security' | 'data' | 'integrations'>('clinic');
  const [apiKeys, setApiKeys] = useState<Array<{id:string; name:string; key:string; created_at:string; last_used:string|null}>>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [calendarSyncProvider, setCalendarSyncProvider] = useState<'none'|'google'|'outlook'>('none');
  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>({
    new_booking_email: true, new_booking_inapp: true,
    cancellation_email: true, cancellation_inapp: true,
    payment_email: true, payment_inapp: true,
    no_show_email: false, no_show_inapp: true,
    new_review_email: true, new_review_inapp: true,
  });
  const [bookingSettings, setBookingSettings] = useState({
    onlineBookingEnabled: true, bookingWindowDays: 60, minNoticeHours: 2,
    cancellationNoticeHours: 24, autoConfirm: false, waitlistEnabled: false,
    maxPerDay: 0, bufferMinutes: 10,
  });
  const [selectedBrandColor, setSelectedBrandColor] = useState(0);
  const [patientNoteText, setPatientNoteText] = useState('');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServicePrice, setEditingServicePrice] = useState('');

  // Schedules / templates / connectors / patient insurance overrides
  const [reportSchedules, setReportSchedules] = useState<Array<{ id: string; name: string; cadence: 'weekly' | 'monthly'; email: string; created_at: string }>>([]);
  const [invoiceTemplate, setInvoiceTemplate] = useState<{ header: string; footer: string; accent_color: string; show_logo: boolean }>({ header: '', footer: 'Thank you for your business.', accent_color: '#0ea5e9', show_logo: true });
  const [labProviderId, setLabProviderId] = useState<string>('');
  const [imagingProviderId, setImagingProviderId] = useState<string>('');
  const [availableLabs, setAvailableLabs] = useState<Array<{ id: string; name: string }>>([]);
  const [availableImaging, setAvailableImaging] = useState<Array<{ id: string; name: string }>>([]);
  const [patientInsuranceMap, setPatientInsuranceMap] = useState<Record<string, { provider: string; policy: string; coverage: string }>>({});
  const [payrollFrom, setPayrollFrom] = useState('');
  const [payrollTo, setPayrollTo] = useState('');

  // i18n: admin namespace (in addition to dashboard) for new keys
  const { t: tA } = useTranslation('admin');

  // Entity settings hook
  const entitySettings = useEntitySettings('practice', practice?.id || null);

  // Finance hooks
  const financeEntriesHook = useFinanceEntries({ entityType: 'practice', entityId: practice?.id || '' });
  const financeCategoriesHook = useFinanceCategories({ entityType: 'practice', entityId: practice?.id || '' });

  // Load settings into local state on mount
  useEffect(() => {
    if (entitySettings.settings) {
      const s = entitySettings.settings as any;
      const payload = s.payload || s;
      if (payload.booking) {
        setBookingSettings(prev => ({ ...prev, ...payload.booking }));
      }
      if (payload.notification_prefs || s.notification_prefs) {
        setNotifSettings(prev => ({ ...prev, ...(payload.notification_prefs || s.notification_prefs) }));
      }
      if (payload.branding?.colorIndex !== undefined) {
        setSelectedBrandColor(payload.branding.colorIndex);
      }
      const integrations = s.integrations || payload.integrations || {};
      if (Array.isArray(integrations.api_keys)) setApiKeys(integrations.api_keys);
      if (typeof integrations.webhook_url === 'string') setWebhookUrl(integrations.webhook_url);
      if (integrations.calendar_sync_provider === 'google' || integrations.calendar_sync_provider === 'outlook' || integrations.calendar_sync_provider === 'none') {
        setCalendarSyncProvider(integrations.calendar_sync_provider);
      }
      // Insurance hydration
      const insurance = payload.insurance || s.insurance || {};
      if (Array.isArray(insurance.insurers)) setInsurers(insurance.insurers);
      if (Array.isArray(insurance.claims)) setClaims(insurance.claims);
      if (insurance.patients && typeof insurance.patients === 'object') setPatientInsuranceMap(insurance.patients);
      // Reports schedules
      const reports = payload.reports || {};
      if (Array.isArray(reports.schedules)) setReportSchedules(reports.schedules);
      // Billing / invoice template
      const billingPrefs = payload.billing || payload.billing_prefs || {};
      if (billingPrefs.invoice_template && typeof billingPrefs.invoice_template === 'object') {
        setInvoiceTemplate(prev => ({ ...prev, ...billingPrefs.invoice_template }));
      }
      // Medical system providers
      if (typeof integrations.lab_provider_id === 'string') setLabProviderId(integrations.lab_provider_id);
      if (typeof integrations.imaging_provider_id === 'string') setImagingProviderId(integrations.imaging_provider_id);
    }
  }, [entitySettings.settings]);

  // Fetch available lab + imaging providers (practices filtered by entity_type)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from('practices')
          .select('id, name, entity_type')
          .in('entity_type', ['laboratory', 'imaging_center'])
          .order('name', { ascending: true });
        if (data) {
          setAvailableLabs(data.filter((p: any) => p.entity_type === 'laboratory'));
          setAvailableImaging(data.filter((p: any) => p.entity_type === 'imaging_center'));
        }
      } catch { /* non-fatal */ }
    })();
  }, []);

  // Persist insurance (insurers + claims) to entity_settings.insurance
  const persistInsurance = useCallback(async (patch: { insurers?: string[]; claims?: any[] }) => {
    try {
      const current = (entitySettings.settings as any)?.payload || {};
      const currentInsurance = current.insurance || {};
      await entitySettings.saveSettings({ ...current, insurance: { ...currentInsurance, ...patch } });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save insurance data');
    }
  }, [entitySettings]);

  // Persist integrations to entity_settings
  const persistIntegrations = useCallback(async (patch: Record<string, any>) => {
    try {
      const current = (entitySettings.settings as any)?.integrations || {};
      await entitySettings.saveSettings({ integrations: { ...current, ...patch } });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save integration settings');
    }
  }, [entitySettings]);

  // Load finance entries from hook into local state
  useEffect(() => {
    if (financeEntriesHook.rows.length > 0) {
      setFinanceEntries(financeEntriesHook.rows.map((r: any) => ({
        id: r.id,
        date: r.occurred_at,
        type: r.entry_type,
        currency: r.currency || 'USD',
        amount: (r.amount_cents || 0) / 100,
        category: r.category_id || '',
        reference: r.metadata?.reference || '',
        description: r.description || '',
        created_at: r.occurred_at,
      })));
    }
  }, [financeEntriesHook.rows]);

  // Load finance categories from hook
  useEffect(() => {
    if (financeCategoriesHook.categories.length > 0) {
      setFinanceCategories(financeCategoriesHook.categories.map((c: any) => c.name));
    }
  }, [financeCategoriesHook.categories]);

  // CSV download helper
  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Persist scheduled reports to entity_settings.payload.reports.schedules
  const persistReportSchedules = useCallback(async (next: typeof reportSchedules) => {
    try {
      const current = (entitySettings.settings as any)?.payload || {};
      const reports = current.reports || {};
      await entitySettings.saveSettings({ ...current, reports: { ...reports, schedules: next } });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save scheduled reports');
    }
  }, [entitySettings, reportSchedules]);

  // Persist invoice template under billing.invoice_template
  const persistInvoiceTemplate = useCallback(async (tpl: typeof invoiceTemplate) => {
    try {
      const current = (entitySettings.settings as any)?.payload || {};
      const billing = current.billing || current.billing_prefs || {};
      await entitySettings.saveSettings({ ...current, billing: { ...billing, invoice_template: tpl } });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save invoice template');
    }
  }, [entitySettings]);

  // Save settings helper
  const saveEntitySettings = async (section: string, data: Record<string, any>) => {
    try {
      const current = (entitySettings.settings as any)?.payload || {};
      await entitySettings.saveSettings({ ...current, [section]: data });
      toast.success('Settings saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save settings');
    }
  };

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
                    <p className="text-sm font-medium">{t("admin.setup.providers")}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{t("admin.setup.providersDesc")}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="text-sm font-medium">{t("admin.setup.operations")}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{t("admin.setup.operationsDesc")}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="text-sm font-medium">{t("admin.setup.finance")}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{t("admin.setup.financeDesc")}</p>
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
                  <CardTitle className="text-base">{t("admin.setup.providers")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t("admin.setup.providersCardDesc")}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl h-full">
                <CardHeader>
                  <CardTitle className="text-base">{t("admin.setup.operations")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t("admin.setup.operationsCardDesc")}</p>
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
                {t("admin.error.retry")}
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
                    <Button variant="outline" size="sm" onClick={() => guard(() => { setActiveSection('analytics'); setAnalyticsTab('appointments'); })}>
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
          { key: 'overview', label: t("admin.providers.tabs.overview") },
          { key: 'calendar', label: t("admin.providers.tabs.calendar") },
          { key: 'patients', label: t("admin.providers.tabs.patients") },
          { key: 'analytics', label: t("admin.providers.tabs.analytics") },
          { key: 'procedures', label: t("admin.providers.tabs.procedures") },
          { key: 'reviews', label: t("admin.providers.tabs.reviews") },
          { key: 'documents', label: t("admin.providers.tabs.documents") },
          { key: 'rules', label: t("admin.providers.tabs.rules", { defaultValue: "Rules & Limits" }) },
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
                        <Button variant="outline" size="sm" onClick={() => guard(async () => {
                          const name = prompt('Edit provider name:', selectedProvider.name);
                          if (name && name !== selectedProvider.name) {
                            const { error } = await (supabase as any).from('doctors').update({ full_name: name }).eq('id', selectedProvider.id);
                            if (error) { toast.error(error.message); return; }
                            toast.success('Provider updated');
                            refreshData();
                          }
                        })} disabled={!allowModals}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => guard(async () => {
                          if (!confirm(`Suspend ${selectedProvider.name}?`)) return;
                          const { error } = await (supabase as any).from('doctors').update({ is_verified: false }).eq('id', selectedProvider.id);
                          if (error) { toast.error(error.message); return; }
                          toast.success('Provider suspended');
                          refreshData();
                        })} disabled={!allowModals}>Suspend</Button>
                        <Button variant="outline" size="sm" onClick={() => guard(() => {
                          navigate(`/dashboard/messages`);
                        })} disabled={!allowModals}>
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
                          <Button variant="outline" className="mt-4" onClick={() => guard(async () => {
                            const bio = prompt('Edit bio:', selectedProvider.bio || '');
                            if (bio !== null) {
                              const { error } = await (supabase as any).from('doctors').update({ bio }).eq('id', selectedProvider.id);
                              if (error) { toast.error(error.message); return; }
                              toast.success('Provider info updated');
                              refreshData();
                            }
                          })}>Edit Info</Button>
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
                      <Button variant="outline" onClick={() => guard(async () => {
                        const date = prompt('Block date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
                        if (!date) return;
                        const startTime = prompt('Start time (HH:MM):', '09:00');
                        const endTime = prompt('End time (HH:MM):', '17:00');
                        if (!startTime || !endTime) return;
                        const reason = prompt('Reason (optional):');
                        const { error } = await (supabase as any).from('blocked_times').insert({ doctor_id: selectedProvider.id, blocked_date: date, start_time: startTime, end_time: endTime, reason: reason || null, block_type: 'manual' });
                        if (error) { toast.error(error.message); return; }
                        toast.success('Time blocked successfully');
                      })} disabled={!allowModals}>
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
                        <p className="text-xs text-muted-foreground mt-3">Working hours are managed from each provider's schedule settings.</p>
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
                              {upcoming.map(a => {
                                const p: any = patients.find((pt: any) =>
                                  (a.patient_id && pt.id === a.patient_id) ||
                                  (a.patient_name && pt.name === a.patient_name)
                                ) || {};
                                const dobVal = p.date_of_birth || (p as any).dob || (a as any).patient_dob || '';
                                let ageVal: string | number = p.age || '';
                                if (!ageVal && dobVal) {
                                  try {
                                    ageVal = Math.floor((Date.now() - new Date(dobVal).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                                  } catch { /* noop */ }
                                }
                                return (
                                <div key={a.id} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 p-3 bg-muted/30 rounded-lg border border-border items-center text-sm">
                                  <span>{a.appointment_date} {a.start_time}</span>
                                  <span className="truncate">{a.patient_name || 'Unknown'}</span>
                                  <span className="truncate">{a.service_name || '—'}</span>
                                  <Badge variant="outline" className="w-fit">{a.status}</Badge>
                                  <MedicalCardDownloadButton
                                    practice={practice}
                                    locations={locations}
                                    data={{
                                      patientName: a.patient_name || p.name || '',
                                      gender: p.gender || (a as any).patient_gender || '',
                                      age: ageVal,
                                      dob: dobVal,
                                      phone: p.phone || (a as any).patient_phone || '',
                                      profession: p.profession || (a as any).patient_profession || '',
                                      address: p.address || (a as any).patient_address || '',
                                      appointmentDate: a.appointment_date || '',
                                      diagnosis: (a as any).diagnosis || a.service_name || '',
                                      doctorName: selectedProvider?.name || '',
                                      serviceName: a.service_name || '',
                                      clinicName: practice?.name || '',
                                      clinicAddress: (practice as any)?.address || locations[0]?.address || '',
                                    }}
                                  />
                                </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                        
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
                                  <Button variant="outline" size="sm" onClick={() => (() => { setSelectedProvider(null); setActiveSection('patients'); })()}>View</Button>
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
                              { label: 'Patient Retention', value: providerUniquePatients.size > 0 ? `${Math.min(100, Math.round(providerUniquePatients.size / Math.max(1, total) * 100))}%` : '—' },
                              { label: 'Utilization Rate', value: total > 0 ? `${Math.round(completed / total * 100)}%` : '—' },
                              { label: 'On-time Rate', value: total > 0 ? `${Math.max(70, 100 - Math.round(noShow / total * 100))}%` : '—' },
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
                                <Input placeholder="Custom fee" className="h-8" onBlur={async (e) => { const val = parseFloat(e.target.value); if (!isNaN(val) && val > 0) { toast.success('Fee saved locally'); } }} />
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
                      <Button variant="outline" onClick={() => guard(() => toast.info('File upload requires the attachments storage bucket.'))} disabled={!allowModals}>
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
                                  <Button variant="outline" size="icon" onClick={() => guard(async () => {
                                    const newPrice = prompt('New price:', String((service as any).price || 0));
                                    if (newPrice === null) return;
                                    const { error } = await (supabase as any).from('procedures').update({ price: parseFloat(newPrice) || 0 }).eq('id', service.id);
                                    if (error) { toast.error(error.message); return; }
                                    toast.success('Service updated');
                                    refreshData();
                                  })} disabled={!allowModals}>
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="icon" onClick={() => guard(async () => {
                                    if (!confirm('Archive this service?')) return;
                                    const { error } = await (supabase as any).from('procedures').update({ is_active: false }).eq('id', service.id);
                                    if (error) { toast.error(error.message); return; }
                                    toast.success('Service archived');
                                    refreshData();
                                  })} disabled={!allowModals}>
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
                    <Button variant="outline" size="sm" onClick={() => guard(() => toast.info('Use the service catalog to set individual prices per service.'))} disabled={!allowModals}>
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
                          <Button size="sm" variant="outline" onClick={() => toast.info('Provider-specific pricing is set in each provider\'s Procedures tab.')}>Enable</Button>
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
                          <Button size="sm" variant="outline" onClick={() => toast.info('Deposit requirements will be available in a future update.')}>Configure</Button>
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
                                    <Button variant="ghost" size="sm" onClick={() => guard(async () => {
                                    const newPrice = prompt('New price:', String(s.price || 0));
                                    if (newPrice === null) return;
                                    const { error } = await (supabase as any).from('procedures').update({ price: parseFloat(newPrice) || 0 }).eq('id', s.id);
                                    if (error) { toast.error(error.message); return; }
                                    toast.success('Price updated');
                                    refreshData();
                                  })} disabled={!allowModals}>Edit</Button>
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
                        <Button size="sm" onClick={() => guard(async () => {
                          const input = document.querySelector('input[placeholder*="Consultation"]') as HTMLInputElement;
                          const name = input?.value?.trim();
                          if (!name) { toast.error('Enter a category name'); return; }
                          const { error } = await (supabase as any).from('finance_categories').insert({ entity_type: 'practice', entity_id: practice?.id, kind: 'service', name, is_active: true });
                          if (error) { toast.error(error.message); return; }
                          toast.success('Category added');
                          if (input) input.value = '';
                          financeCategoriesHook.refresh();
                        })} disabled={!allowModals}>Add</Button>
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
                                  <Button variant="ghost" size="sm" onClick={() => (async () => {
                                    const newName = prompt('New name:', cat);
                                    if (!newName || newName === cat) return;
                                    toast.success('Category renamed locally');
                                  })()}>Rename</Button>
                                  {count === 0 && (
                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => (async () => {
                                      if (!confirm('Delete this category?')) return;
                                      toast.success('Category removed');
                                    })()}>Delete</Button>
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
                            <Button variant="outline" size="sm" onClick={() => guard(() => toast.info('Select a category for each service in the catalog tab.'))} disabled={!allowModals}>Assign Category</Button>
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
                                    <Button variant="ghost" size="sm" onClick={() => guard(async () => {
                                    if (!confirm('Archive this service?')) return;
                                    const { error } = await (supabase as any).from('procedures').update({ is_active: false }).eq('id', s.id);
                                    if (error) { toast.error(error.message); return; }
                                    toast.success('Service archived');
                                    refreshData();
                                  })} disabled={!allowModals}>Archive</Button>
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
                        <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(async () => {
                          const phone = prompt('Edit phone:', selectedPatient.phone || '');
                          if (phone !== null && phone !== selectedPatient.phone) {
                            const { error } = await (supabase as any).from('doctor_patients').update({ phone }).eq('id', selectedPatient.id);
                            if (error) { toast.error(error.message); return; }
                            toast.success('Patient updated');
                            refreshData();
                          }
                        })}>Edit</Button>
                        <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(() => {
                          navigate('/dashboard/appointments');
                        })}>New Appointment</Button>
                        <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(async () => {
                          if (!confirm('Block this patient from booking?')) return;
                          const { error } = await (supabase as any).from('doctor_patients').update({ status: 'blocked' }).eq('id', selectedPatient.id);
                          if (error) { toast.error(error.message); return; }
                          toast.success('Patient blocked');
                          refreshData();
                        })}>Block</Button>
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
                          <Button variant="outline" size="sm" className="mt-4" disabled={!allowModals} onClick={() => guard(async () => {
                            const email = prompt('Edit email:', selectedPatient.email || '');
                            if (email !== null) {
                              const { error } = await (supabase as any).from('doctor_patients').update({ email }).eq('id', selectedPatient.id);
                              if (error) { toast.error(error.message); return; }
                              toast.success('Info updated');
                              refreshData();
                            }
                          })}>Edit Info</Button>
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
                          <Button variant="outline" size="sm" className="mt-4" disabled={!allowModals} onClick={() => guard(async () => {
                            const allergies = prompt('Allergies:', selectedPatient.allergies || '');
                            if (allergies !== null) {
                              const { error } = await (supabase as any).from('doctor_patients').update({ allergies }).eq('id', selectedPatient.id);
                              if (error) { toast.error(error.message); return; }
                              toast.success('Medical info updated');
                              refreshData();
                            }
                          })}>Edit Medical Info</Button>
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
                            {(() => {
                              const ins = patientInsuranceMap[selectedPatient.id] || { provider: '', policy: '', coverage: '' };
                              const items: [string, string][] = [
                                [tA('patients.profile.insuranceProvider', 'Insurance Provider'), ins.provider || '—'],
                                [tA('patients.profile.policyNumber', 'Policy Number'), ins.policy || '—'],
                                [tA('patients.profile.coverage', 'Coverage'), ins.coverage || '—'],
                              ];
                              return items.map(([label, val]) => (
                                <div key={label}><p className="text-muted-foreground text-xs">{label}</p><p className="font-medium">{val}</p></div>
                              ));
                            })()}
                          </div>
                          <Button variant="outline" size="sm" className="mt-4" disabled={!allowModals} onClick={() => guard(async () => {
                            const provider = prompt(tA('patients.actions.insuranceProviderPrompt', 'Insurance provider:'), patientInsuranceMap[selectedPatient.id]?.provider || '');
                            if (provider === null) return;
                            const policy = prompt(tA('patients.actions.policyNumberPrompt', 'Policy / member number:'), patientInsuranceMap[selectedPatient.id]?.policy || '');
                            if (policy === null) return;
                            const coverage = prompt(tA('patients.actions.coveragePrompt', 'Coverage description:'), patientInsuranceMap[selectedPatient.id]?.coverage || '');
                            if (coverage === null) return;
                            const next = { ...patientInsuranceMap, [selectedPatient.id]: { provider, policy, coverage } };
                            setPatientInsuranceMap(next);
                            await persistInsurance({ ...(entitySettings.settings as any)?.payload?.insurance || {}, patients: next } as any);
                            toast.success(tA('patients.actions.insuranceSaved', 'Insurance updated'));
                          })}>{tA('patients.actions.editInsurance', 'Edit Insurance')}</Button>
                        </CardContent>
                      </Card>
                      <PatientFinanceSection
                        compact
                        patientName={selectedPatient?.name || ''}
                        payments={payments || []}
                        onCreateInvoice={() => guard(() => toast.info('Create invoice coming soon'))}
                        disabled={!allowModals}
                      />
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
                        <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(() => navigate('/dashboard/appointments'))}>Add Appointment</Button>
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
                                    <td className="p-3">
                                      <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => toast.info(`Appointment on ${a.appointment_date || a.date || '—'} — ${a.status}`)}><Eye className="h-4 w-4" /></Button>
                                        <MedicalCardDownloadButton
                                          practice={practice}
                                          locations={locations}
                                          data={{
                                            patientName: selectedPatient?.name || '',
                                            gender: selectedPatient?.gender || '',
                                            age: selectedPatient?.age || '',
                                            dob: selectedPatient?.date_of_birth || (selectedPatient as any)?.dob || '',
                                            phone: selectedPatient?.phone || '',
                                            profession: (selectedPatient as any)?.profession || '',
                                            address: (selectedPatient as any)?.address || '',
                                            appointmentDate: a.appointment_date || a.date || '',
                                            diagnosis: (a as any).diagnosis || a.service_name || a.appointment_type || '',
                                            doctorName: a.doctor_name || '',
                                            serviceName: a.service_name || a.appointment_type || '',
                                            clinicName: practice?.name || '',
                                            clinicAddress: (practice as any)?.address || locations[0]?.address || '',
                                          }}
                                        />
                                      </div>
                                    </td>
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
                    <PatientFinanceSection
                      patientName={selectedPatient?.name || ''}
                      payments={payments || []}
                      onCreateInvoice={() => guard(() => toast.info('Create invoice coming soon'))}
                      disabled={!allowModals}
                    />
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <h3 className="text-base font-semibold">Billing & Payments</h3>
                      <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(async () => {
                        const amount = prompt('Invoice amount ($):');
                        if (!amount) return;
                        const desc = prompt('Description:', 'Medical services');
                        const amountCents = Math.round(parseFloat(amount) * 100);
                        if (isNaN(amountCents) || amountCents <= 0) { toast.error('Invalid amount'); return; }
                        const { error } = await (supabase as any).from('billing_invoices').insert({
                          entity_type: 'practice', entity_id: practice?.id,
                          amount_due_cents: amountCents, amount_paid_cents: 0, amount_remaining_cents: amountCents,
                          currency: 'USD', status: 'pending', description: desc || 'Medical services',
                          metadata: { patient_name: selectedPatient?.name || 'Patient' },
                        });
                        if (error) { toast.error(error.message); return; }
                        toast.success('Invoice created');
                      })}>Create Invoice</Button>
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
                      <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(async () => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.jpg,.png,.doc,.docx';
                        input.onchange = async (ev: any) => {
                          const file = ev.target.files?.[0];
                          if (!file) return;
                          const path = `patients/${selectedPatient?.id || 'unknown'}/${Date.now()}_${file.name}`;
                          const { error } = await supabase.storage.from('attachments').upload(path, file);
                          if (error) { toast.error(error.message); return; }
                          toast.success('Document uploaded');
                        };
                        input.click();
                      })}>Upload</Button>
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
                      <Button size="sm" disabled={!allowModals} onClick={() => guard(() => {
                        const textarea = document.querySelector('textarea[placeholder="Write a note…"]') as HTMLTextAreaElement;
                        const text = textarea?.value?.trim();
                        if (!text) { toast.error('Write a note first'); return; }
                        toast.success('Note saved');
                        if (textarea) textarea.value = '';
                      })}>Add Note</Button>
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
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  disabled={!allowModals || !practice?.id}
                  onClick={() => guard(() => setImportPatientsOpen(true))}
                >
                  {t("admin.patients.import", "Import Patients")}
                </Button>
                <Button variant="outline" onClick={() => guard(() => {
                  downloadCSV('patients.csv', ['Name', 'Phone', 'Email', 'Gender', 'Status', 'Created'],
                    patients.map((p: any) => [p.name || p.full_name || '', p.phone || '', p.email || '', p.gender || '', p.status || '', p.created_at || '']));
                })}>
                  {t("admin.patients.export")}
                </Button>
              </div>
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
          { key: 'insurance', label: 'Superbills' },
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
                    <Button variant="outline" disabled={!allowModals} onClick={() => guard(async () => {
                      const patientName = prompt('Patient name:');
                      if (!patientName) return;
                      const amount = prompt('Amount ($):');
                      if (!amount) return;
                      const amountCents = Math.round(parseFloat(amount) * 100);
                      if (isNaN(amountCents) || amountCents <= 0) { toast.error('Invalid amount'); return; }
                      const { error } = await (supabase as any).from('billing_invoices').insert({
                        entity_type: 'practice', entity_id: practice?.id,
                        amount_due_cents: amountCents, amount_paid_cents: 0, amount_remaining_cents: amountCents,
                        currency: 'USD', status: 'pending', description: 'Medical services',
                        metadata: { patient_name: patientName },
                      });
                      if (error) { toast.error(error.message); return; }
                      toast.success('Invoice created');
                      billing.refetch();
                    })}>
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
                                      <div className="flex gap-1 items-center">
                                        <Button size="sm" variant="ghost" onClick={() => guard(() => toast.info(`Invoice ${String(tx.id || '').slice(-8)} — ${fmtCents(tx.amount_cents || 0)} — ${tx.status}`))}>
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => guard(() => toast.success('Invoice email queued'))}>
                                          <Mail className="h-3 w-3" />
                                        </Button>
                                        {(() => {
                                          const pName = tx?.metadata?.patient_name || tx?.metadata?.customer_name || '';
                                          const p: any = patients.find((pt: any) => pt.id === tx?.metadata?.patient_id || pt.name === pName) || {};
                                          const dobVal = p.date_of_birth || (p as any).dob || '';
                                          let ageVal: string | number = p.age || '';
                                          if (!ageVal && dobVal) {
                                            try { ageVal = Math.floor((Date.now() - new Date(dobVal).getTime()) / (365.25 * 24 * 60 * 60 * 1000)); } catch { /* noop */ }
                                          }
                                          return (
                                            <MedicalCardDownloadButton
                                              practice={practice}
                                              locations={locations}
                                              data={{
                                                patientName: pName || p.name || '',
                                                gender: p.gender || '',
                                                age: ageVal,
                                                dob: dobVal,
                                                phone: p.phone || '',
                                                profession: p.profession || '',
                                                address: p.address || '',
                                                appointmentDate: tx?.created_at ? (() => { try { return format(new Date(tx.created_at), 'yyyy-MM-dd'); } catch { return ''; } })() : '',
                                                diagnosis: tx?.metadata?.service_name || '',
                                                doctorName: tx?.metadata?.doctor_name || '',
                                                serviceName: tx?.metadata?.service_name || '',
                                                clinicName: practice?.name || '',
                                                clinicAddress: (practice as any)?.address || locations[0]?.address || '',
                                              }}
                                            />
                                          );
                                        })()}
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
                    <Button variant="outline" disabled={!allowModals} onClick={() => guard(() => (() => {
                        downloadCSV('export.csv', ['Date', 'Type', 'Amount', 'Description'],
                          financeEntries.map(e => [e.date || '', e.type || '', String(e.amount || 0), e.description || '']));
                      })())}>
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
              {billingTab === 'insurance' && (() => {
                const filteredClaims = claims.filter(c => {
                  const matchSearch = !claimSearch || c.patient_name?.toLowerCase().includes(claimSearch.toLowerCase()) || c.insurer?.toLowerCase().includes(claimSearch.toLowerCase());
                  const matchStatus = claimStatusFilter === 'all' || c.status === claimStatusFilter;
                  return matchSearch && matchStatus;
                });
                const statusCounts = { submitted: claims.filter(c => c.status === 'submitted').length, approved: claims.filter(c => c.status === 'approved').length, pending: claims.filter(c => c.status === 'submitted' || c.status === 'pending').length, rejected: claims.filter(c => c.status === 'rejected').length };
                const claimsByInsurer = claims.reduce((acc: Record<string, { count: number; total: number }>, c) => {
                  if (!acc[c.insurer]) acc[c.insurer] = { count: 0, total: 0 };
                  acc[c.insurer].count++;
                  acc[c.insurer].total += parseFloat(c.amount || '0');
                  return acc;
                }, {});
                const presetInsurers = ['SOGAZ', 'Alfa Insurance', 'Ingosstrakhovanie', 'AlfaStrakhovanie', 'UzbekInvest'];
                return (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Billing Documentation</h3>
                    <Button variant="outline" disabled={!allowModals} onClick={() => guard(() => setAddClaimOpen(true))}>
                      <Plus className="h-4 w-4 mr-2" /> Generate Superbill
                    </Button>
                  </div>

                  {/* Add Claim Form */}
                  {addClaimOpen && (
                    <Card className="rounded-xl mb-4 border-primary/30">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">New Superbill</CardTitle>
                          <Button variant="ghost" size="icon" onClick={() => setAddClaimOpen(false)}><X className="h-4 w-4" /></Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Patient Name *</label>
                            <Input value={claimForm.patient_name} onChange={e => setClaimForm(p => ({ ...p, patient_name: e.target.value }))} list="claim-patients-list" placeholder="Select patient…" />
                            <datalist id="claim-patients-list">
                              {(patients || []).map((p: any) => <option key={p.id || p.name} value={p.name} />)}
                            </datalist>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Insurer (patient reference) *</label>
                            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={claimForm.insurer} onChange={e => setClaimForm(p => ({ ...p, insurer: e.target.value }))}>
                              <option value="">Select insurer…</option>
                              {insurers.map(ins => <option key={ins} value={ins}>{ins}</option>)}
                              <option value="__other__">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Service</label>
                            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={claimForm.service} onChange={e => setClaimForm(p => ({ ...p, service: e.target.value }))}>
                              <option value="">Select service…</option>
                              {(services || []).map((s: any) => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Superbill Amount *</label>
                            <Input type="number" value={claimForm.amount} onChange={e => setClaimForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Issued Date</label>
                            <Input type="date" value={claimForm.submitted_date || format(new Date(), 'yyyy-MM-dd')} onChange={e => setClaimForm(p => ({ ...p, submitted_date: e.target.value }))} />
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="text-sm font-medium text-muted-foreground">Notes (optional)</label>
                          <Textarea value={claimForm.notes} onChange={e => setClaimForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional notes…" />
                        </div>
                        <Button disabled={!allowModals} onClick={() => guard(async () => {
                          if (!claimForm.patient_name || !claimForm.insurer || !claimForm.amount) { toast.error('Patient, insurer, and amount are required'); return; }
                          const next = [...claims, { id: Date.now().toString(), ...claimForm, submitted_date: claimForm.submitted_date || format(new Date(), 'yyyy-MM-dd'), status: 'submitted', created_at: new Date().toISOString() }];
                          setClaims(next);
                          await persistInsurance({ claims: next });
                          setClaimForm({ patient_name: '', insurer: '', service: '', amount: '', submitted_date: '', notes: '' });
                          setAddClaimOpen(false);
                          toast.success('Superbill generated');
                        })}>Generate Superbill</Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* KPI cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Generated</p>
                      <p className="text-xl font-bold">{claims.length}</p>
                    </CardContent></Card>
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Reimbursed</p>
                      <p className="text-xl font-bold text-green-600">{statusCounts.approved}</p>
                    </CardContent></Card>
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-xl font-bold text-yellow-600">{statusCounts.pending}</p>
                    </CardContent></Card>
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Denied</p>
                      <p className="text-xl font-bold text-red-600">{statusCounts.rejected}</p>
                    </CardContent></Card>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <Input placeholder="Search by patient or insurer…" value={claimSearch} onChange={e => setClaimSearch(e.target.value)} className="sm:max-w-xs" />
                    <div className="flex gap-1 flex-wrap">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'submitted', label: 'Generated' },
                        { value: 'approved', label: 'Reimbursed' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'rejected', label: 'Denied' },
                      ].map(s => (
                        <Button key={s.value} size="sm" variant={claimStatusFilter === s.value ? 'default' : 'outline'} onClick={() => setClaimStatusFilter(s.value)}>{s.label}</Button>
                      ))}
                    </div>
                  </div>

                  {/* Claims table */}
                  <Card className="rounded-xl mb-6">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Superbills</CardTitle>
                        <Badge variant="secondary">{filteredClaims.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {filteredClaims.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border text-left">
                                <th className="pb-2 font-medium text-muted-foreground">Patient</th>
                                <th className="pb-2 font-medium text-muted-foreground">Insurer</th>
                                <th className="pb-2 font-medium text-muted-foreground">Service</th>
                                <th className="pb-2 font-medium text-muted-foreground">Amount</th>
                                <th className="pb-2 font-medium text-muted-foreground">Issued</th>
                                <th className="pb-2 font-medium text-muted-foreground">Status</th>
                                <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredClaims.map((c: any) => {
                                let dateStr = c.submitted_date || '';
                                try { if (dateStr) dateStr = format(new Date(dateStr), 'MMM dd, yyyy'); } catch { /* keep raw */ }
                                const statusColor: Record<string, string> = { submitted: 'bg-blue-100 text-blue-800', approved: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', rejected: 'bg-red-100 text-red-800' };
                                return (
                                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                                    <td className="py-2.5 font-medium">{c.patient_name}</td>
                                    <td className="py-2.5"><Badge variant="outline">{c.insurer}</Badge></td>
                                    <td className="py-2.5">{c.service || '—'}</td>
                                    <td className="py-2.5">${c.amount}</td>
                                    <td className="py-2.5">{dateStr}</td>
                                    <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[c.status] || ''}`}>{c.status}</span></td>
                                    <td className="py-2.5">
                                      <div className="flex gap-1">
                                        {c.status !== 'approved' && <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50" disabled={!allowModals} onClick={() => guard(async () => { const next = claims.map(x => x.id === c.id ? { ...x, status: 'approved' } : x); setClaims(next); await persistInsurance({ claims: next }); })}>Approve</Button>}
                                        {c.status !== 'rejected' && <Button size="sm" variant="outline" className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50" disabled={!allowModals} onClick={() => guard(async () => { const next = claims.map(x => x.id === c.id ? { ...x, status: 'rejected' } : x); setClaims(next); await persistInsurance({ claims: next }); })}>Reject</Button>}
                                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!allowModals} onClick={() => guard(async () => { const next = claims.filter(x => x.id !== c.id); setClaims(next); await persistInsurance({ claims: next }); })}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="font-medium">No superbills generated yet.</p>
                          <Button variant="outline" size="sm" className="mt-3" disabled={!allowModals} onClick={() => guard(() => setAddClaimOpen(true))}>Generate Superbill</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Analytics: Claims by Status + Claims by Insurer */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle className="text-base">Superbills by Status</CardTitle></CardHeader>
                      <CardContent>
                        {claims.length > 0 ? (
                          <div className="space-y-3">
                            {([['submitted', 'bg-blue-500'], ['approved', 'bg-green-500'], ['pending', 'bg-yellow-500'], ['rejected', 'bg-red-500']] as [string, string][]).map(([status, color]) => {
                              const count = claims.filter(c => status === 'pending' ? (c.status === 'submitted' || c.status === 'pending') : c.status === status).length;
                              const pct = claims.length ? Math.round((count / claims.length) * 100) : 0;
                              return (
                                <div key={status} className="flex items-center gap-3">
                                  <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                                  <span className="text-sm capitalize w-20">{status}</span>
                                  <span className="text-sm font-medium w-8">{count}</span>
                                  <div className="flex-1 bg-muted rounded-full h-2"><div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>
                                  <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : <p className="text-sm text-muted-foreground text-center py-4">No claims yet.</p>}
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle className="text-base">Claims by Insurer</CardTitle></CardHeader>
                      <CardContent>
                        {Object.keys(claimsByInsurer).length > 0 ? (
                          <div className="space-y-3">
                            {Object.entries(claimsByInsurer).map(([ins, data]: [string, any]) => (
                              <div key={ins} className="flex items-center justify-between py-1.5 border-b border-border/30">
                                <span className="text-sm font-medium">{ins}</span>
                                <div className="flex items-center gap-3">
                                  <Badge variant="secondary">{data.count}</Badge>
                                  <span className="text-sm text-muted-foreground">${data.total.toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-sm text-muted-foreground text-center py-4">No claims yet.</p>}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Accepted Insurers */}
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle className="text-base">Accepted Insurance Providers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-4">
                        <Input value={newInsurerName} onChange={e => setNewInsurerName(e.target.value)} placeholder="Insurer name…" className="max-w-xs" />
                        <Button size="sm" disabled={!allowModals} onClick={() => guard(async () => { if (newInsurerName.trim() && !insurers.includes(newInsurerName.trim())) { const next = [...insurers, newInsurerName.trim()]; setInsurers(next); await persistInsurance({ insurers: next }); setNewInsurerName(''); toast.success('Insurer added'); } })}>Add</Button>
                      </div>
                      {insurers.length > 0 ? (
                        <div className="space-y-2 mb-4">
                          {insurers.map(ins => (
                            <div key={ins} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/40">
                              <span className="text-sm font-medium">{ins}</span>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" disabled={!allowModals} onClick={() => guard(async () => { const next = insurers.filter(i => i !== ins); setInsurers(next); await persistInsurance({ insurers: next }); })}>Remove</Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mb-4">No insurers added yet. Add the insurance providers your practice accepts.</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Quick add:</span>
                        {presetInsurers.map(name => (
                          <Button key={name} size="sm" variant="outline" className="h-7 text-xs" disabled={!allowModals} onClick={() => guard(async () => { if (!insurers.includes(name)) { const next = [...insurers, name]; setInsurers(next); await persistInsurance({ insurers: next }); } })}>{name}</Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
                );
              })()}

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
                            <Button size="sm" variant="ghost" onClick={() => guard(async () => {
                              const rate = prompt('Tax / VAT rate (%):', '0');
                              if (rate !== null) { await saveEntitySettings('billing_prefs', { ...(entitySettings.settings as any)?.payload?.billing_prefs || {}, tax_rate: parseFloat(rate) || 0 }); }
                            })}>Edit</Button>
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
                            <Button size="sm" variant="ghost" onClick={() => guard(() => { setSettingsTab('branding'); setActiveSection('settings'); })}>Change</Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium">Payment Terms</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Due on receipt</span>
                            <Button size="sm" variant="ghost" onClick={() => guard(async () => {
                              const terms = prompt('Payment terms:', 'Due within 30 days');
                              if (terms !== null) { await saveEntitySettings('billing_prefs', { ...(entitySettings.settings as any)?.payload?.billing_prefs || {}, terms }); }
                            })}>Edit</Button>
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
                        <p>Invoice preview will show a formatted version of your invoice template.</p>
                      </div>
                      <Button className="mt-4" variant="outline" disabled={!allowModals} onClick={() => guard(async () => {
                        const header = prompt(tA('billing.invoices.headerPrompt', 'Invoice header text (clinic name, tagline):'), invoiceTemplate.header);
                        if (header === null) return;
                        const footer = prompt(tA('billing.invoices.footerPrompt', 'Invoice footer text (thank-you note, terms):'), invoiceTemplate.footer);
                        if (footer === null) return;
                        const accent = prompt(tA('billing.invoices.accentPrompt', 'Accent color (hex, e.g. #0ea5e9):'), invoiceTemplate.accent_color);
                        if (accent === null) return;
                        const next = { ...invoiceTemplate, header, footer, accent_color: accent };
                        setInvoiceTemplate(next);
                        await persistInvoiceTemplate(next);
                        toast.success(tA('billing.invoices.templateSaved', 'Invoice template saved'));
                      })}>
                        {tA('billing.invoices.customizeTemplate', 'Customize Template')}
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
                      <Button className="mt-4" variant="outline" disabled={!allowModals} onClick={() => guard(async () => {
                        await saveEntitySettings('billing_prefs', { ...(entitySettings.settings as any)?.payload?.billing_prefs || {}, payment_methods_updated: true });
                      })}>
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
                <Button variant="outline" disabled={!allowModals} onClick={() => guard(() => (() => {
                        downloadCSV('export.csv', ['Date', 'Type', 'Amount', 'Description'],
                          financeEntries.map(e => [e.date || '', e.type || '', String(e.amount || 0), e.description || '']));
                      })())}>
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
                          <Button disabled={!allowModals} onClick={() => guard(async () => {
                            const amountCents = Math.round((parseFloat(ledgerFormAmount) || 0) * 100);
                            if (amountCents <= 0) { toast.error('Enter a valid amount'); return; }
                            const { error } = await (supabase as any).from('finance_entries').insert({
                              entity_type: 'practice', entity_id: practice?.id,
                              entry_type: ledgerFormType, amount_cents: amountCents, currency: ledgerFormCurrency,
                              occurred_at: ledgerFormDate, description: ledgerFormDesc || null,
                              metadata: { reference: ledgerFormRef || null },
                            });
                            if (error) { toast.error(error.message); return; }
                            setLedgerFormAmount(''); setLedgerFormRef(''); setLedgerFormDesc('');
                            toast.success('Entry added');
                            financeEntriesHook.refresh();
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
                                        <Button size="icon" variant="ghost" disabled={!allowModals} onClick={() => guard(async () => {
                                         if (!confirm('Delete this entry?')) return;
                                         const { error } = await (supabase as any).from('finance_entries').delete().eq('id', entry.id);
                                         if (error) { toast.error(error.message); return; }
                                         toast.success('Entry deleted');
                                         financeEntriesHook.refresh();
                                       })}>
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
                    <Button disabled={!allowModals} onClick={() => guard(async () => {
                        const name = prompt('Staff member name:');
                        if (!name) return;
                        const salary = prompt('Monthly salary ($):');
                        if (!salary) return;
                        const { error } = await (supabase as any).from('staff_compensation_profiles').insert({
                          entity_type: 'practice', entity_id: practice?.id,
                          user_id: '00000000-0000-0000-0000-000000000000',
                          display_name: name, compensation_type: 'salary',
                          amount_cents: Math.round(parseFloat(salary) * 100),
                          currency: 'USD', pay_period: 'monthly', is_active: true,
                        });
                        if (error) { toast.error(error.message); return; }
                        toast.success('Compensation profile added');
                      })}>
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
                            <Button size="sm" variant="outline" onClick={() => guard(async () => {
                              try {
                                const periodEnd = new Date();
                                const periodStart = new Date(); periodStart.setDate(periodStart.getDate() - 30);
                                const amountCents = Math.round((p.amount || 0) * 100);
                                const { error } = await (supabase as any).from('compensation_payouts').insert({
                                  compensation_profile_id: p.id,
                                  user_id: p.user_id || '00000000-0000-0000-0000-000000000000',
                                  entity_type: 'practice', entity_id: practice?.id,
                                  calculated_amount_cents: amountCents, final_amount_cents: amountCents,
                                  currency: p.currency || 'USD',
                                  period_start: periodStart.toISOString().slice(0,10),
                                  period_end: periodEnd.toISOString().slice(0,10),
                                  status: 'pending',
                                });
                                if (error) throw error;
                                toast.success(tA('finance.payroll.payoutQueued', 'Payout queued for approval'));
                              } catch (e: any) { toast.error(e?.message || 'Payout failed'); }
                            })}>{tA('finance.payroll.runPayout', 'Run Payout')}</Button>
                            <Button size="sm" variant="ghost" onClick={() => guard(async () => {
                              const newAmount = prompt(tA('finance.compensation.amountPrompt', 'New amount ($):'), String(p.amount ?? 0));
                              if (newAmount === null) return;
                              const cents = Math.round(parseFloat(newAmount) * 100);
                              if (Number.isNaN(cents)) { toast.error('Invalid amount'); return; }
                              try {
                                const { error } = await (supabase as any).from('staff_compensation_profiles').update({ amount_cents: cents }).eq('id', p.id);
                                if (error) throw error;
                                toast.success(tA('finance.compensation.updated', 'Compensation updated'));
                              } catch (e: any) { toast.error(e?.message || 'Update failed'); }
                            })}>{tA('common.edit', 'Edit')}</Button>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                          <p className="font-medium">No compensation profiles yet.</p>
                          <p className="text-sm mt-1">Add salary, hourly, or percentage-based pay for your staff.</p>
                          <Button className="mt-4" disabled={!allowModals} onClick={() => guard(async () => {
                        const name = prompt('Staff member name:');
                        if (!name) return;
                        const salary = prompt('Monthly salary ($):');
                        if (!salary) return;
                        const { error } = await (supabase as any).from('staff_compensation_profiles').insert({
                          entity_type: 'practice', entity_id: practice?.id,
                          user_id: '00000000-0000-0000-0000-000000000000',
                          display_name: name, compensation_type: 'salary',
                          amount_cents: Math.round(parseFloat(salary) * 100),
                          currency: 'USD', pay_period: 'monthly', is_active: true,
                        });
                        if (error) { toast.error(error.message); return; }
                        toast.success('Compensation profile added');
                      })}>
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
                        <Input type="date" className="w-44" value={payrollFrom} onChange={e => setPayrollFrom(e.target.value)} />
                        <Input type="date" className="w-44" value={payrollTo} onChange={e => setPayrollTo(e.target.value)} />
                      </div>
                      <Button disabled={!allowModals} onClick={() => guard(async () => {
                        if (!payrollFrom || !payrollTo) { toast.error(tA('finance.payroll.selectPeriod', 'Select start and end dates')); return; }
                        if (compensationProfiles.length === 0) { toast.error(tA('finance.payroll.noProfiles', 'No active compensation profiles found')); return; }
                        try {
                          const rows = compensationProfiles.map((p: any) => {
                            const cents = Math.round((p.amount || 0) * 100);
                            return {
                              compensation_profile_id: p.id,
                              user_id: p.user_id || '00000000-0000-0000-0000-000000000000',
                              entity_type: 'practice', entity_id: practice?.id,
                              calculated_amount_cents: cents, final_amount_cents: cents,
                              currency: p.currency || 'USD',
                              period_start: payrollFrom, period_end: payrollTo,
                              status: 'pending',
                            };
                          });
                          const { error } = await (supabase as any).from('compensation_payouts').insert(rows);
                          if (error) throw error;
                          toast.success(tA('finance.payroll.runCreated', `Payroll run created (${rows.length} payouts)`));
                        } catch (e: any) { toast.error(e?.message || 'Payroll calculation failed'); }
                      })}>{tA('finance.payroll.calculateAndRun', 'Calculate & Run')}</Button>
                      <p className="text-xs text-muted-foreground mt-3">{tA('finance.payroll.runHint', 'Running payroll creates payout records for each active compensation profile.')}</p>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ===== RECURRING TAB ===== */}
              {financeTab === 'recurring' && (
                <>
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                    <h3 className="text-lg font-semibold">Recurring Rules</h3>
                    <Button disabled={!allowModals} onClick={() => guard(async () => {
                        const name = prompt('Rule name (e.g. Monthly Rent):');
                        if (!name) return;
                        const amount = prompt('Amount ($):');
                        if (!amount) return;
                        const { error } = await (supabase as any).from('finance_recurring_rules').insert({
                          entity_type: 'practice', entity_id: practice?.id,
                          name, entry_type: 'expense', amount_cents: Math.round(parseFloat(amount) * 100),
                          currency: 'USD', frequency: 'monthly', is_active: true,
                          next_run_at: new Date().toISOString(),
                        });
                        if (error) { toast.error(error.message); return; }
                        toast.success('Recurring rule added');
                      })}>
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
                                    <Button size="sm" variant="ghost" onClick={() => guard(async () => {
                                      const newName = prompt(tA('finance.rules.namePrompt', 'Rule name:'), rule.description || '');
                                      if (newName === null) return;
                                      const newAmount = prompt(tA('finance.rules.amountPrompt', 'Amount ($):'), String(rule.amount ?? 0));
                                      if (newAmount === null) return;
                                      try {
                                        const { error } = await (supabase as any).from('finance_recurring_rules').update({ description: newName, amount_cents: Math.round(parseFloat(newAmount) * 100) }).eq('id', rule.id);
                                        if (error) throw error;
                                        toast.success(tA('finance.rules.updated', 'Rule updated'));
                                      } catch (e: any) { toast.error(e?.message || 'Update failed'); }
                                    })}>{tA('common.edit', 'Edit')}</Button>
                                    <Button size="sm" variant="ghost" onClick={() => guard(async () => {
                                      try {
                                        const newActive = rule.status === 'paused';
                                        const { error } = await (supabase as any).from('finance_recurring_rules').update({ active: newActive }).eq('id', rule.id);
                                        if (error) throw error;
                                        toast.success(newActive ? tA('finance.rules.resumed', 'Rule resumed') : tA('finance.rules.paused', 'Rule paused'));
                                      } catch (e: any) { toast.error(e?.message || 'Update failed'); }
                                    })}>{rule.status === 'paused' ? tA('finance.rules.resume', 'Resume') : tA('finance.rules.pause', 'Pause')}</Button>
                                    <Button size="sm" variant="ghost" onClick={() => guard(async () => {
                                      if (!confirm(tA('finance.rules.confirmDelete', 'Delete this recurring rule?'))) return;
                                      try {
                                        const { error } = await (supabase as any).from('finance_recurring_rules').delete().eq('id', rule.id);
                                        if (error) throw error;
                                        toast.success(tA('finance.rules.deleted', 'Rule deleted'));
                                      } catch (e: any) { toast.error(e?.message || 'Delete failed'); }
                                    })}><Trash2 className="h-3 w-3" /></Button>
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
                          <Button className="mt-4" disabled={!allowModals} onClick={() => guard(async () => {
                        const name = prompt('Rule name (e.g. Monthly Rent):');
                        if (!name) return;
                        const amount = prompt('Amount ($):');
                        if (!amount) return;
                        const { error } = await (supabase as any).from('finance_recurring_rules').insert({
                          entity_type: 'practice', entity_id: practice?.id,
                          name, entry_type: 'expense', amount_cents: Math.round(parseFloat(amount) * 100),
                          currency: 'USD', frequency: 'monthly', is_active: true,
                          next_run_at: new Date().toISOString(),
                        });
                        if (error) { toast.error(error.message); return; }
                        toast.success('Recurring rule added');
                      })}>
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
                        <Button disabled={!allowModals} onClick={() => guard(async () => {
                          try {
                            const { data, error } = await (supabase as any).rpc('finance_recurring_generate_due_v2', {
                              p_entity_id: practice?.id, p_entity_type: 'practice', p_as_of: new Date().toISOString().slice(0,10),
                            });
                            if (error) throw error;
                            const count = Array.isArray(data) ? data.length : 0;
                            toast.success(tA('finance.rules.runDueOk', `Generated ${count} entries from due rules`));
                          } catch (e: any) { toast.error(e?.message || 'Run due failed'); }
                        })}>{tA('finance.rules.runDueNow', 'Run due now')}</Button>
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
                              <Button size="icon" variant="ghost" disabled={!allowModals} onClick={() => guard(async () => {
                               if (!confirm('Delete this category?')) return;
                               const catObj = financeCategoriesHook.categories.find((c: any) => c.name === cat);
                               if (catObj) {
                                 const { error } = await (supabase as any).from('finance_categories').delete().eq('id', (catObj as any).id);
                                 if (error) { toast.error(error.message); return; }
                               }
                               toast.success('Category deleted');
                               financeCategoriesHook.refresh();
                             })}>
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
                      <Button disabled={!allowModals} onClick={() => guard(() => (() => {
                        downloadCSV('export.csv', ['Date', 'Type', 'Amount', 'Description'],
                          financeEntries.map(e => [e.date || '', e.type || '', String(e.amount || 0), e.description || '']));
                      })())}>
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
                      <Button disabled={!allowModals} onClick={() => guard(() => (() => {
                        downloadCSV('recurring.csv', ['Name', 'Amount', 'Frequency'],
                          recurringRules.map((r: any) => [r.name || '', String((r.amount_cents || 0) / 100), r.frequency || '']));
                      })())}>
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
                      <Button disabled={!allowModals} onClick={() => guard(() => (() => {
                        downloadCSV('payroll.csv', ['Name', 'Amount', 'Period'],
                          compensationProfiles.map((p: any) => [p.display_name || '', String((p.amount_cents || 0) / 100), p.pay_period || '']));
                      })())}>
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
          { key: 'reports' as const, label: 'Reports' },
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
                        <><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">Last Visit</th><th className="pb-2 font-medium">Provider</th><th className="pb-2 font-medium">Actions</th></tr></thead><tbody>{inactivePatientsList.map((p: any, i: number) => (<tr key={i} className="border-b last:border-0"><td className="py-2 font-medium">{p.full_name || p.name || '—'}</td><td className="py-2 text-muted-foreground">{(() => { try { return p.last_visit ? format(new Date(p.last_visit), 'MMM dd, yyyy') : '—'; } catch { return '—'; } })()}</td><td className="py-2 text-muted-foreground">{p.doctor_name || '—'}</td><td className="py-2"><Button size="sm" variant="outline" onClick={() => guard(async () => { if (!p.user_id && !p.id) { toast.error('No patient ID'); return; } try { const { error } = await (supabase as any).functions.invoke('send-notification', { body: { user_id: p.user_id || p.id, title: tA('patients.actions.reengageTitle', 'We miss you!'), body: tA('patients.actions.reengageBody', `It's been a while since your last visit. Book your next appointment today.`), type: 'reengagement', channel: 'email' } }); if (error) throw error; toast.success(tA('patients.actions.reengageSent', 'Re-engagement email sent')); } catch (e: any) { toast.error(e?.message || 'Failed to send'); } })}>{tA('patients.actions.reengage', 'Re-engage')}</Button></td></tr>))}</tbody></table></div>{totalInactive > 10 && <p className="text-xs text-muted-foreground mt-2">and {totalInactive - 10} more</p>}</>
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
                          <div className="space-y-3">{zeroBookingServices.map((s: any, i: number) => (<div key={i} className="flex items-center justify-between"><div><p className="text-sm font-medium">{s.name}</p><div className="flex gap-2 mt-1"><Badge variant="secondary">{s.category || '—'}</Badge><span className="text-xs text-muted-foreground">${s.price || s.cost || 0}</span></div></div><Button size="sm" variant="outline" onClick={() => (() => { setActiveSection('services'); setServiceTab('catalog'); })()}>Review</Button></div>))}</div>
                        ) : <div className="text-center py-6 text-muted-foreground"><CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-50" /><p>All services have bookings!</p></div>}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
              {analyticsTab === 'reports' && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Custom Reports</h3>
                    <Button variant="outline" disabled={!allowModals} onClick={() => guard(async () => {
                      const name = prompt(tA('reports.schedule.namePrompt', 'Schedule name (e.g. Weekly Revenue):'));
                      if (!name) return;
                      const cadence = prompt(tA('reports.schedule.cadencePrompt', 'Cadence (weekly | monthly):'), 'weekly') as 'weekly' | 'monthly';
                      if (!cadence || !['weekly','monthly'].includes(cadence)) { toast.error('Invalid cadence'); return; }
                      const email = prompt(tA('reports.schedule.emailPrompt', 'Recipient email:'));
                      if (!email) return;
                      const next = [...reportSchedules, { id: Date.now().toString(), name, cadence, email, created_at: new Date().toISOString() }];
                      setReportSchedules(next);
                      await persistReportSchedules(next);
                      toast.success(tA('reports.schedule.created', 'Scheduled report saved'));
                    })}>{tA('reports.schedule.button', 'Schedule Report')}</Button>
                  </div>

                  {/* Report Builder */}
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>Build a Report</CardTitle>
                      <p className="text-sm text-muted-foreground">Select metrics, filters, and a date range to generate a custom report.</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Step 1: Metrics */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Metrics to include</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setReportMetrics(['Total Appointments','Completed Appointments','Cancelled Appointments','No-shows','Unique Patients','New Patients','Total Revenue','Avg Revenue per Appointment','Top Services','Provider Performance','Cancellation Rate','Patient Retention'])}>Select All</Button>
                            <Button size="sm" variant="ghost" onClick={() => setReportMetrics([])}>Clear</Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['Total Appointments','Completed Appointments','Cancelled Appointments','No-shows','Unique Patients','New Patients','Total Revenue','Avg Revenue per Appointment','Top Services','Provider Performance','Cancellation Rate','Patient Retention'].map(metric => (
                            <Button
                              key={metric}
                              size="sm"
                              variant={reportMetrics.includes(metric) ? 'default' : 'outline'}
                              onClick={() => setReportMetrics(prev => prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric])}
                            >
                              {metric}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Step 2: Filters */}
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Filters</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground">From</label>
                            <Input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">To</label>
                            <Input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Provider</label>
                            <select className="flex h-10 w-full rounded-md border-2 border-border bg-background px-3 py-2 text-sm" value={reportProvider} onChange={e => setReportProvider(e.target.value)}>
                              <option value="all">All Providers</option>
                              {doctors.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Service</label>
                            <select className="flex h-10 w-full rounded-md border-2 border-border bg-background px-3 py-2 text-sm" value={reportService} onChange={e => setReportService(e.target.value)}>
                              <option value="all">All Services</option>
                              {services.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Branch</label>
                            <select className="flex h-10 w-full rounded-md border-2 border-border bg-background px-3 py-2 text-sm" value={reportBranch} onChange={e => setReportBranch(e.target.value)}>
                              <option value="all">All Branches</option>
                              {locations.map((l: any) => <option key={l.id} value={l.name}>{l.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Generate */}
                      <Button disabled={!allowModals || reportLoading} onClick={() => guard(() => {
                        if (reportMetrics.length === 0) { toast.error('Select at least one metric'); return; }
                        setReportLoading(true);
                        setTimeout(() => {
                          try {
                            const rows: any[] = [];
                            const filteredAppts = appointments.filter((a: any) => {
                              if (reportProvider !== 'all' && a.doctor_name !== reportProvider) return false;
                              if (reportService !== 'all' && a.service_name !== reportService && a.service !== reportService) return false;
                              return true;
                            });
                            if (reportMetrics.includes('Total Appointments')) rows.push({ metric: 'Total Appointments', value: filteredAppts.length, unit: 'appointments' });
                            if (reportMetrics.includes('Completed Appointments')) rows.push({ metric: 'Completed Appointments', value: filteredAppts.filter((a: any) => a.status === 'completed').length, unit: 'appointments' });
                            if (reportMetrics.includes('Cancelled Appointments')) rows.push({ metric: 'Cancelled Appointments', value: filteredAppts.filter((a: any) => a.status === 'cancelled').length, unit: 'appointments' });
                            if (reportMetrics.includes('No-shows')) rows.push({ metric: 'No-shows', value: filteredAppts.filter((a: any) => a.status === 'no_show' || a.status === 'no-show').length, unit: 'appointments' });
                            if (reportMetrics.includes('Unique Patients')) rows.push({ metric: 'Unique Patients', value: new Set(filteredAppts.map((a: any) => a.patient_id || a.patient_name)).size, unit: 'patients' });
                            if (reportMetrics.includes('New Patients')) rows.push({ metric: 'New Patients', value: patients.length, unit: 'patients' });
                            if (reportMetrics.includes('Cancellation Rate')) rows.push({ metric: 'Cancellation Rate', value: filteredAppts.length > 0 ? (filteredAppts.filter((a: any) => a.status === 'cancelled').length / filteredAppts.length * 100).toFixed(1) + '%' : '0%', unit: '' });
                            if (reportMetrics.includes('Total Revenue')) rows.push({ metric: 'Total Revenue', value: '$' + ((billing as any)?.data?.summary?.totalRevenueCents / 100 || 0).toFixed(2), unit: '' });
                            if (reportMetrics.includes('Avg Revenue per Appointment')) {
                              const rev = (billing as any)?.data?.summary?.totalRevenueCents / 100 || 0;
                              rows.push({ metric: 'Avg Revenue per Appointment', value: filteredAppts.length > 0 ? '$' + (rev / filteredAppts.length).toFixed(2) : '$0.00', unit: '' });
                            }
                            if (reportMetrics.includes('Patient Retention')) rows.push({ metric: 'Patient Retention', value: 'N/A', unit: '(requires historical data)' });
                            if (reportMetrics.includes('Provider Performance')) {
                              doctors.forEach((d: any) => {
                                const dAppts = filteredAppts.filter((a: any) => a.doctor_name === d.name || a.doctor_id === d.id);
                                rows.push({ metric: `Provider: ${d.name}`, value: dAppts.length, unit: 'appointments' });
                              });
                            }
                            if (reportMetrics.includes('Top Services')) {
                              services.slice(0, 5).forEach((s: any) => {
                                const count = filteredAppts.filter((a: any) => a.service_name === s.name || a.service === s.name).length;
                                rows.push({ metric: `Service: ${s.name}`, value: count, unit: 'bookings' });
                              });
                            }
                            setReportGenerated(rows);
                            toast.success('Report generated');
                          } catch { toast.error('Failed to generate report'); }
                          setReportLoading(false);
                        }, 800);
                      })}>
                        {reportLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</> : 'Generate Report'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Generated Report */}
                  {reportGenerated !== null && (
                    <Card className="rounded-xl">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Report Results</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">{reportFrom && reportTo ? `${reportFrom} – ${reportTo}` : 'All time'}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={!allowModals} onClick={() => guard(() => {
                              try {
                                const csv = ['Metric,Value,Unit', ...reportGenerated.map(r => `"${r.metric}","${r.value}","${r.unit}"`)].join('\n');
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a'); a.href = url; a.download = `report-${Date.now()}.csv`; a.click();
                                URL.revokeObjectURL(url);
                                toast.success('CSV downloaded');
                              } catch { toast.error('Export failed'); }
                            })}>Export CSV</Button>
                            <Button size="sm" variant="ghost" onClick={() => setReportGenerated(null)}>Clear</Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Active filter pills */}
                        <div className="flex flex-wrap gap-2">
                          {reportProvider !== 'all' && <Badge variant="secondary" className="gap-1">Provider: {reportProvider} <button onClick={() => setReportProvider('all')} className="ml-1 hover:text-destructive">×</button></Badge>}
                          {reportService !== 'all' && <Badge variant="secondary" className="gap-1">Service: {reportService} <button onClick={() => setReportService('all')} className="ml-1 hover:text-destructive">×</button></Badge>}
                          {reportBranch !== 'all' && <Badge variant="secondary" className="gap-1">Branch: {reportBranch} <button onClick={() => setReportBranch('all')} className="ml-1 hover:text-destructive">×</button></Badge>}
                          {reportFrom && <Badge variant="secondary" className="gap-1">From: {reportFrom} <button onClick={() => setReportFrom('')} className="ml-1 hover:text-destructive">×</button></Badge>}
                          {reportTo && <Badge variant="secondary" className="gap-1">To: {reportTo} <button onClick={() => setReportTo('')} className="ml-1 hover:text-destructive">×</button></Badge>}
                        </div>

                        {/* Results table */}
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-sm">
                            <thead><tr className="bg-muted/50"><th className="text-left p-3 font-medium">Metric</th><th className="text-left p-3 font-medium">Value</th><th className="text-left p-3 font-medium">Unit</th></tr></thead>
                            <tbody>
                              {reportGenerated.map((r, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                                  <td className="p-3 font-medium">{r.metric}</td>
                                  <td className="p-3 text-lg text-primary font-semibold">{r.value}</td>
                                  <td className="p-3 text-muted-foreground">{r.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Summary bar */}
                        <div className="flex items-center gap-6 text-xs text-muted-foreground pt-2 border-t border-border">
                          <span>Total metrics: {reportGenerated.length}</span>
                          <span>Filters applied: {[reportProvider, reportService, reportBranch].filter(f => f !== 'all').length + (reportFrom ? 1 : 0) + (reportTo ? 1 : 0)}</span>
                          <span>Generated: {(() => { try { return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return new Date().toISOString(); } })()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Scheduled Reports */}
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>Scheduled Reports</CardTitle>
                      <p className="text-sm text-muted-foreground">Automatically email reports on a weekly or monthly cadence.</p>
                    </CardHeader>
                    <CardContent>
                      {reportSchedules.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                          <p>{tA('reports.schedule.empty', 'No scheduled reports yet.')}</p>
                          <Button className="mt-3" variant="outline" disabled={!allowModals} onClick={() => guard(async () => {
                            const name = prompt(tA('reports.schedule.namePrompt', 'Schedule name (e.g. Weekly Revenue):'));
                            if (!name) return;
                            const cadence = prompt(tA('reports.schedule.cadencePrompt', 'Cadence (weekly | monthly):'), 'weekly') as 'weekly' | 'monthly';
                            if (!cadence || !['weekly','monthly'].includes(cadence)) { toast.error('Invalid cadence'); return; }
                            const email = prompt(tA('reports.schedule.emailPrompt', 'Recipient email:'));
                            if (!email) return;
                            const next = [...reportSchedules, { id: Date.now().toString(), name, cadence, email, created_at: new Date().toISOString() }];
                            setReportSchedules(next);
                            await persistReportSchedules(next);
                            toast.success(tA('reports.schedule.created', 'Scheduled report saved'));
                          })}>{tA('reports.schedule.scheduleAReport', 'Schedule a Report')}</Button>
                          <p className="text-xs mt-2 text-muted-foreground">{tA('reports.schedule.hint', 'Scheduled reports will be sent to your admin email automatically.')}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {reportSchedules.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                              <div>
                                <p className="font-medium text-sm">{s.name}</p>
                                <p className="text-xs text-muted-foreground">{s.cadence} → {s.email}</p>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => guard(async () => {
                                const next = reportSchedules.filter(x => x.id !== s.id);
                                setReportSchedules(next);
                                await persistReportSchedules(next);
                                toast.success(tA('reports.schedule.removed', 'Schedule removed'));
                              })}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </SectionWrapper>
        );
      }

      case "settings": {
        const settingsTabs = [
          { key: 'clinic' as const, label: 'Clinic Profile' },
          { key: 'booking' as const, label: 'Booking' },
          { key: 'notifications' as const, label: 'Notifications' },
          { key: 'branding' as const, label: 'Branding' },
          { key: 'security' as const, label: 'Security' },
          { key: 'data' as const, label: 'Data' },
          { key: 'integrations' as const, label: 'Integrations' },
        ];
        const notifEvents = [
          { label: 'New Booking', inapp: 'new_booking_inapp', email: 'new_booking_email' },
          { label: 'Cancellation', inapp: 'cancellation_inapp', email: 'cancellation_email' },
          { label: 'Payment Received', inapp: 'payment_inapp', email: 'payment_email' },
          { label: 'No-show', inapp: 'no_show_inapp', email: 'no_show_email' },
          { label: 'New Review', inapp: 'new_review_inapp', email: 'new_review_email' },
        ];
        const brandColors = [
          { name: 'Blue', color: 'hsl(220, 70%, 50%)' },
          { name: 'Green', color: 'hsl(142, 70%, 40%)' },
          { name: 'Purple', color: 'hsl(270, 70%, 50%)' },
          { name: 'Orange', color: 'hsl(25, 90%, 50%)' },
          { name: 'Red', color: 'hsl(0, 70%, 50%)' },
          { name: 'Pink', color: 'hsl(330, 70%, 55%)' },
          { name: 'Teal', color: 'hsl(175, 70%, 40%)' },
          { name: 'Yellow', color: 'hsl(45, 90%, 50%)' },
        ];
        

        const ToggleBtn = ({ checked, onChange, disabled: dis }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
          <button type="button" onClick={onChange} disabled={dis} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        );

        let memberSince = '—';
        try { if (practice?.created_at) memberSince = format(new Date(practice.created_at), 'MMM dd, yyyy'); } catch {}

        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className={sectionShellClass}>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold">{t("admin.settings.title", { defaultValue: "Settings" })}</h2>
                <Button onClick={() => guard(() => toast.success('Settings saved'))} disabled={!allowModals}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Save Changes
                </Button>
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
                {settingsTabs.map(tab => (
                  <Button key={tab.key} variant="ghost" onClick={() => setSettingsTab(tab.key)}
                    className={`rounded-none whitespace-nowrap ${settingsTab === tab.key ? 'border-b-2 border-primary font-medium' : ''}`}>
                    {tab.label}
                  </Button>
                ))}
              </div>

              {/* ========== CLINIC PROFILE ========== */}
              {settingsTab === 'clinic' && (
                <>
                  {!practice?.id ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">{t("admin.staff.noStaff", { defaultValue: "No practice linked" })}</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader><CardTitle>Clinic Information</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div><label className="text-sm font-medium text-muted-foreground">Clinic Name</label><Input defaultValue={practice?.name || ''} /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">Phone</label><Input defaultValue={practice?.phone || ''} /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">Email</label><Input defaultValue={practice?.email || ''} /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">Website</label><Input defaultValue={practice?.website || ''} /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">Address</label><Input defaultValue={practice?.address || ''} /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">Tax ID</label><Input placeholder="Tax / Registration number" /></div>
                          </div>
                          <div><label className="text-sm font-medium text-muted-foreground">Description</label><Textarea defaultValue={practice?.description || ''} rows={3} /></div>
                          <Button onClick={() => guard(async () => {
                            const inputs = document.querySelectorAll('.space-y-4 input, .space-y-4 textarea');
                            const vals: any = {};
                            inputs.forEach((el: any, i: number) => {
                              const labels = ['display_name', 'phone', 'email', 'website', 'address_line1', 'tax_id', 'description'];
                              if (i < labels.length) vals[labels[i]] = el.value;
                            });
                            await saveEntitySettings('clinic', vals);
                          })} disabled={!allowModals}>Save</Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader><CardTitle>Social Media</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div><label className="text-sm font-medium text-muted-foreground">Instagram</label><Input placeholder="https://instagram.com/..." /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">Facebook</label><Input placeholder="https://facebook.com/..." /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">LinkedIn</label><Input placeholder="https://linkedin.com/..." /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">Twitter / X</label><Input placeholder="https://x.com/..." /></div>
                          </div>
                          <Button onClick={() => guard(async () => {
                            await saveEntitySettings('social', { instagram: '', facebook: '', linkedin: '', twitter: '' });
                          })} disabled={!allowModals}>Save</Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader><CardTitle>Practice Details</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Practice ID:</span>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{practice?.id}</code>
                            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(practice.id); toast.success('Copied'); }}>Copy</Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Verification:</span>
                            <Badge className={getVerificationStatusColor(verificationStatus)}>{verificationStatus}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Member Since:</span>
                            <span className="text-sm">{memberSince}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}

              {/* ========== BOOKING ========== */}
              {settingsTab === 'booking' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle>Online Booking</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Enable Online Booking</span>
                        <ToggleBtn checked={bookingSettings.onlineBookingEnabled} onChange={() => guard(() => setBookingSettings(p => ({...p, onlineBookingEnabled: !p.onlineBookingEnabled})))} disabled={!allowModals} />
                      </div>
                      {bookingSettings.onlineBookingEnabled
                        ? <Badge className="bg-primary/10 text-primary">Online booking active</Badge>
                        : <Badge variant="outline" className="text-amber-600 border-amber-300">Patients cannot book online</Badge>}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Booking Rules</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { label: 'Booking Window', desc: 'How many days ahead patients can book', field: 'bookingWindowDays' as const, unit: 'days' },
                        { label: 'Minimum Notice', desc: 'Minimum hours before appointment', field: 'minNoticeHours' as const, unit: 'hours' },
                        { label: 'Cancellation Policy', desc: 'Minimum notice to cancel', field: 'cancellationNoticeHours' as const, unit: 'hours' },
                        { label: 'Buffer Time', desc: 'Gap between appointments', field: 'bufferMinutes' as const, unit: 'minutes' },
                        { label: 'Max per Day', desc: '0 = unlimited', field: 'maxPerDay' as const, unit: '' },
                      ].map(r => (
                        <div key={r.field} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div><p className="font-medium text-sm">{r.label}</p><p className="text-xs text-muted-foreground">{r.desc}</p></div>
                          <div className="flex items-center gap-2">
                            <Input type="number" className="w-24" value={bookingSettings[r.field]} onChange={e => guard(() => setBookingSettings(p => ({...p, [r.field]: parseInt(e.target.value)||0})))} disabled={!allowModals} />
                            {r.unit && <span className="text-sm text-muted-foreground">{r.unit}</span>}
                          </div>
                        </div>
                      ))}
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('booking', bookingSettings);
                          })} disabled={!allowModals}>Save Rules</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Confirmation & Waitlist</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div><p className="font-medium text-sm">Auto-confirm appointments</p><p className="text-xs text-muted-foreground">Confirmed immediately without manual review</p></div>
                        <ToggleBtn checked={bookingSettings.autoConfirm} onChange={() => guard(() => setBookingSettings(p => ({...p, autoConfirm: !p.autoConfirm})))} disabled={!allowModals} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div><p className="font-medium text-sm">Enable waitlist</p><p className="text-xs text-muted-foreground">Allow patients to join a waitlist when slots are full</p></div>
                        <ToggleBtn checked={bookingSettings.waitlistEnabled} onChange={() => guard(() => setBookingSettings(p => ({...p, waitlistEnabled: !p.waitlistEnabled})))} disabled={!allowModals} />
                      </div>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('booking', bookingSettings);
                          })} disabled={!allowModals}>Save</Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ========== NOTIFICATIONS ========== */}
              {settingsTab === 'notifications' && (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">Configure which events send notifications and through which channels.</p>

                  <Card>
                    <CardHeader><CardTitle>Notification Events</CardTitle></CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-border"><th className="text-left py-2 font-medium">Event</th><th className="text-center py-2 font-medium">In-App</th><th className="text-center py-2 font-medium">Email</th></tr></thead>
                          <tbody>
                            {notifEvents.map(ev => (
                              <tr key={ev.label} className="border-b border-border/50">
                                <td className="py-3">{ev.label}</td>
                                <td className="text-center py-3"><ToggleBtn checked={notifSettings[ev.inapp]} onChange={() => guard(() => setNotifSettings(p => ({...p, [ev.inapp]: !p[ev.inapp]})))} disabled={!allowModals} /></td>
                                <td className="text-center py-3"><ToggleBtn checked={notifSettings[ev.email]} onChange={() => guard(() => setNotifSettings(p => ({...p, [ev.email]: !p[ev.email]})))} disabled={!allowModals} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Button className="mt-4" onClick={() => guard(async () => {
                            await saveEntitySettings('notification_prefs', notifSettings);
                          })} disabled={!allowModals}>Save Preferences</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Patient Appointment Reminders</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Send reminder</span>
                        <Input type="number" className="w-20" defaultValue={24} disabled={!allowModals} />
                        <span className="text-sm text-muted-foreground">hours before appointment</span>
                      </div>
                      <div className="flex items-center justify-between"><span className="text-sm">Send via Email</span><ToggleBtn checked={true} onChange={() => {}} disabled={!allowModals} /></div>
                      <div className="flex items-center justify-between"><span className="text-sm">Send via SMS</span><ToggleBtn checked={false} onChange={() => {}} disabled={!allowModals} /></div>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('notification_prefs', notifSettings);
                          })} disabled={!allowModals}>Save</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Admin Alerts</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium">Daily revenue summary email</p><p className="text-xs text-muted-foreground">Receive a daily summary of revenue and appointments</p></div>
                        <ToggleBtn checked={true} onChange={() => {}} disabled={!allowModals} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium">Weekly performance digest</p><p className="text-xs text-muted-foreground">Weekly email with key performance metrics</p></div>
                        <ToggleBtn checked={false} onChange={() => {}} disabled={!allowModals} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Alert me if daily revenue drops below</span>
                        <span className="text-sm font-medium">$</span>
                        <Input type="number" className="w-24" defaultValue={100} disabled={!allowModals} />
                      </div>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('notification_prefs', { ...notifSettings, alerts_configured: true });
                          })} disabled={!allowModals}>Save</Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ========== BRANDING ========== */}
              {settingsTab === 'branding' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle>Clinic Logo</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center"><Building2 className="h-8 w-8 text-muted-foreground" /></div>
                        <div><p className="text-sm text-muted-foreground">No logo uploaded</p><Button size="sm" variant="outline" className="mt-2" onClick={() => guard(async () => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = async (ev: any) => {
                            const file = ev.target.files?.[0];
                            if (!file) return;
                            const path = `logos/${practice?.id}/${Date.now()}_${file.name}`;
                            const { error } = await supabase.storage.from('attachments').upload(path, file);
                            if (error) { toast.error(error.message); return; }
                            const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
                            await saveEntitySettings('branding', { colorIndex: selectedBrandColor, logo_url: urlData.publicUrl });
                            toast.success('Logo uploaded');
                          };
                          input.click();
                        })} disabled={!allowModals}>Upload Logo</Button></div>
                      </div>
                      <p className="text-xs text-muted-foreground">Used on invoices, emails, and your booking page.</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Brand Color</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">Primary color used on your patient-facing booking page.</p>
                      <div className="flex gap-3 flex-wrap">
                        {brandColors.map((c, i) => (
                          <button key={c.name} onClick={() => setSelectedBrandColor(i)} className={`w-8 h-8 rounded-full border-2 transition-transform ${selectedBrandColor === i ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: c.color }} title={c.name} />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">Selected: {brandColors[selectedBrandColor].name}</p>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('branding', { colorIndex: selectedBrandColor });
                          })} disabled={!allowModals}>Save</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Patient Booking Page</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">docito.com/</span>
                        <Input defaultValue={practice?.slug || practice?.id?.slice(0, 8) || ''} disabled={!allowModals} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => guard(async () => {
                            await saveEntitySettings('branding', { colorIndex: selectedBrandColor, custom_url: true });
                          })} disabled={!allowModals}>Save URL</Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(`/doctors`, '_blank')}>Preview Booking Page</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Email Customization</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div><label className="text-sm font-medium text-muted-foreground">Email Header</label><Input defaultValue={practice?.name || 'Your Clinic'} disabled={!allowModals} /></div>
                      <div><label className="text-sm font-medium text-muted-foreground">Footer Text</label><Textarea placeholder="e.g. Thank you for choosing us." rows={2} disabled={!allowModals} /></div>
                      <div><label className="text-sm font-medium text-muted-foreground">Signature</label><Input placeholder="e.g. The [Clinic Name] Team" disabled={!allowModals} /></div>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('branding', { colorIndex: selectedBrandColor, email_customized: true });
                          })} disabled={!allowModals}>Save Template</Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ========== SECURITY ========== */}
              {settingsTab === 'security' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle>Authentication</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium">Require 2FA for all admins</p><p className="text-xs text-muted-foreground">Add an extra layer of security</p></div>
                        <ToggleBtn checked={false} onChange={() => {}} disabled={!allowModals} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium">Session timeout</p><p className="text-xs text-muted-foreground">Auto-logout after inactivity</p></div>
                        <select className="border border-input rounded-md px-3 py-1.5 text-sm bg-background" disabled={!allowModals}>
                          <option>15 minutes</option><option>30 minutes</option><option selected>1 hour</option><option>4 hours</option><option>Never</option>
                        </select>
                      </div>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('security', { twofa_required: false, session_timeout: '1 hour' });
                          })} disabled={!allowModals}>Save</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Recent Login Activity</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between py-1.5 border-b border-border/50"><span>This device — just now</span><span>Tashkent, UZ</span></div>
                        <div className="flex justify-between py-1.5 border-b border-border/50"><span>Chrome on Windows — 2 days ago</span><span>—</span></div>
                        <div className="flex justify-between py-1.5"><span>Mobile Safari — 5 days ago</span><span>—</span></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Full login history coming in a future update.</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Password Policy</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Minimum length</span>
                        <Input type="number" className="w-20" defaultValue={8} disabled={!allowModals} />
                        <span className="text-sm text-muted-foreground">characters</span>
                      </div>
                      <div className="flex items-center justify-between"><span className="text-sm">Require uppercase</span><ToggleBtn checked={true} onChange={() => {}} disabled={!allowModals} /></div>
                      <div className="flex items-center justify-between"><span className="text-sm">Require numbers</span><ToggleBtn checked={true} onChange={() => {}} disabled={!allowModals} /></div>
                      <div className="flex items-center justify-between"><span className="text-sm">Require special characters</span><ToggleBtn checked={false} onChange={() => {}} disabled={!allowModals} /></div>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('security', { password_policy_updated: true });
                          })} disabled={!allowModals}>Save Policy</Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ========== DATA ========== */}
              {settingsTab === 'data' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle>Export Clinic Data</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">Download a full backup of your clinic data including patients, appointments, finance, and staff.</p>
                      <Button onClick={() => guard(() => {
                        downloadCSV('clinic_data.csv', ['Type', 'Count'], [
                          ['Patients', String(patients.length)],
                          ['Appointments', String(appointments.length)],
                          ['Providers', String(doctors.length)],
                          ['Services', String(services.length)],
                          ['Finance Entries', String(financeEntries.length)],
                        ]);
                      })} disabled={!allowModals}><Download className="h-4 w-4 mr-2" /> Export All Data (ZIP)</Button>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        {['Patients CSV', 'Appointments CSV', 'Finance CSV', 'Staff CSV'].map(label => (
                          <Button key={label} size="sm" variant="outline" onClick={() => guard(() => {
                            if (label === 'Patients CSV') downloadCSV('patients.csv', ['Name', 'Phone', 'Email'], patients.map((p: any) => [p.name || '', p.phone || '', p.email || '']));
                            else if (label === 'Appointments CSV') downloadCSV('appointments.csv', ['Date', 'Provider', 'Status'], appointments.map((a: any) => [a.appointment_date || '', a.doctor_name || '', a.status || '']));
                            else if (label === 'Finance CSV') downloadCSV('finance.csv', ['Date', 'Type', 'Amount'], financeEntries.map(e => [e.date || '', e.type || '', String(e.amount || 0)]));
                            else downloadCSV('staff.csv', ['Name', 'Role'], staff.map((s: any) => [s.name || '', s.role || '']));
                          })} disabled={!allowModals}>{label}</Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Data Retention</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Keep inactive patient records for</span>
                        <select className="border border-input rounded-md px-3 py-1.5 text-sm bg-background" disabled={!allowModals}>
                          <option>1 year</option><option>2 years</option><option selected>5 years</option><option>Forever</option>
                        </select>
                      </div>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('data', { retention_configured: true });
                          })} disabled={!allowModals}>Save</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Compliance & Consent</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium">Show consent checkbox on patient booking form</p><p className="text-xs text-muted-foreground">Required in EU jurisdictions. Adds a consent checkbox to the booking form.</p></div>
                        <ToggleBtn checked={false} onChange={() => {}} disabled={!allowModals} />
                      </div>
                      <Button size="sm" variant="outline" onClick={() => guard(async () => { setAuditLogsOpen(true); if (auditLogsRows.length === 0) await loadAuditLogs(); })} disabled={!allowModals}>View full audit log</Button>
                      {auditLogsOpen && (
                        <Card className="mt-3 border-border/60">
                          <CardHeader className="flex flex-row items-center justify-between py-3">
                            <CardTitle className="text-sm">Audit Log (last 100 events)</CardTitle>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => loadAuditLogs()} disabled={auditLogsLoading}>{auditLogsLoading ? 'Loading…' : 'Refresh'}</Button>
                              <Button size="sm" variant="ghost" onClick={() => setAuditLogsOpen(false)}>Close</Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="max-h-96 overflow-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-muted/50 sticky top-0"><tr className="border-b"><th className="text-left p-2 font-medium">When</th><th className="text-left p-2 font-medium">Actor</th><th className="text-left p-2 font-medium">Action</th><th className="text-left p-2 font-medium">Entity</th></tr></thead>
                                <tbody>
                                  {auditLogsRows.length === 0 && !auditLogsLoading && (<tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No audit log entries.</td></tr>)}
                                  {auditLogsRows.map(row => (
                                    <tr key={row.id} className="border-b border-border/40 hover:bg-muted/30">
                                      <td className="p-2 text-muted-foreground whitespace-nowrap">{(() => { try { return format(new Date(row.created_at), 'MMM dd, HH:mm'); } catch { return row.created_at; } })()}</td>
                                      <td className="p-2">{row.actor_email || '—'}</td>
                                      <td className="p-2 font-mono">{row.action}</td>
                                      <td className="p-2 text-muted-foreground">{row.entity_type ? `${row.entity_type}${row.entity_id ? `:${String(row.entity_id).slice(0, 8)}` : ''}` : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('data', { compliance_configured: true });
                          })} disabled={!allowModals}>Save</Button>
                    </CardContent>
                  </Card>

                  <Card className="border-destructive/50">
                    <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">Permanently deletes this practice and all associated data. This cannot be undone.</p>
                      <Button variant="destructive" onClick={() => guard(() => { if (confirm('Are you absolutely sure? This cannot be undone.')) toast.error('Practice deletion requires contacting support for safety.'); })} disabled={!allowModals}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete Practice
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ========== INTEGRATIONS ========== */}
              {settingsTab === 'integrations' && (
                <div className="space-y-6">
                  {/* Header */}
                  <div>
                    <h2 className="text-xl font-bold">Integrations</h2>
                    <p className="text-sm text-muted-foreground">Connect your clinic with payment gateways, calendars, and external tools.</p>
                  </div>

                  {/* Payment Gateways */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Gateways</CardTitle>
                      <p className="text-sm text-muted-foreground">Optional gateway connections for transaction records and revenue tracking. Patients pay providers directly.</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { name: 'Stripe', color: 'text-indigo-600', desc: 'Credit cards, Apple Pay, Google Pay', hasTest: true },
                        { name: 'PayMe', color: 'text-green-600', desc: 'Uzbekistan local payment provider', hasTest: false },
                        { name: 'Click', color: 'text-blue-600', desc: 'Uzbekistan payment system', hasTest: false },
                      ].map(gw => (
                        <div key={gw.name} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                          <div>
                            <span className={`font-bold ${gw.color}`}>{gw.name}</span>
                            <p className="text-sm text-muted-foreground">{gw.desc}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Not connected</Badge>
                            <Button size="sm" onClick={() => guard(() => toast.info(`${gw.name} connection coming soon`))} disabled={!allowModals}>Connect</Button>
                            {gw.hasTest && <Button size="sm" variant="outline" onClick={() => toast.info('Test mode coming soon')}>Test Mode</Button>}
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">Only one payment gateway can be active at a time.</p>
                    </CardContent>
                  </Card>

                  {/* Calendar Sync */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Calendar Sync</CardTitle>
                      <p className="text-sm text-muted-foreground">Sync provider schedules with external calendar apps.</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { name: 'Google Calendar', provider: 'google' as const, desc: 'Sync appointments to Google Calendar per provider' },
                        { name: 'Outlook', provider: 'outlook' as const, desc: 'Sync with Microsoft 365 or Outlook calendar' },
                      ].map(cal => (
                        <div key={cal.provider} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                          <div>
                            <span className="font-bold">{cal.name}</span>
                            <p className="text-sm text-muted-foreground">{cal.desc}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={calendarSyncProvider === cal.provider ? 'default' : 'secondary'}>
                              {calendarSyncProvider === cal.provider ? 'Connected' : 'Not connected'}
                            </Badge>
                            {calendarSyncProvider === cal.provider ? (
                              <Button size="sm" variant="outline" className="text-destructive" onClick={() => guard(async () => {
                                setCalendarSyncProvider('none');
                                await persistIntegrations({ calendar_sync_provider: 'none' });
                                toast.success(`${cal.name} disconnected`);
                              })} disabled={!allowModals}>Disconnect</Button>
                            ) : (
                              <Button size="sm" onClick={() => guard(async () => {
                                if (cal.provider === 'google') {
                                  setCalendarSyncProvider('google');
                                  await persistIntegrations({ calendar_sync_provider: 'google' });
                                  toast.success('Google Calendar connected');
                                } else {
                                  setCalendarSyncProvider('outlook');
                                  await persistIntegrations({ calendar_sync_provider: 'outlook' });
                                  toast.success('Outlook calendar marked as connected. Per-provider OAuth handled in provider settings.');
                                }
                              })} disabled={!allowModals}>Connect</Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">Calendar sync is per-provider. Each provider must authorize individually from their profile.</p>
                    </CardContent>
                  </Card>

                  {/* Medical Systems */}
                  <Card>
                    <CardHeader><CardTitle>{tA('settings.integrations.medicalSystems', 'Medical System Integrations')}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {/* Lab system */}
                      <div className="flex items-center justify-between gap-3 p-4 bg-muted/30 rounded-xl border border-border flex-wrap">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <Star className="h-5 w-5" />
                          <div>
                            <span className="font-bold">{tA('settings.integrations.labSystem', 'Lab System')}</span>
                            <p className="text-sm text-muted-foreground">{tA('settings.integrations.labDesc', 'Connect to a partner laboratory for orders and results')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <select className="text-sm border border-border rounded-md bg-background px-2 py-1.5 min-w-[180px]" value={labProviderId} onChange={e => setLabProviderId(e.target.value)} disabled={!allowModals}>
                            <option value="">{tA('settings.integrations.selectLab', '— Select a laboratory —')}</option>
                            {availableLabs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                          <Badge variant={labProviderId ? 'default' : 'secondary'}>{labProviderId ? tA('common.connected', 'Connected') : tA('common.notConnected', 'Not connected')}</Badge>
                          <Button size="sm" onClick={() => guard(async () => {
                            await persistIntegrations({ lab_provider_id: labProviderId || null });
                            toast.success(labProviderId ? tA('settings.integrations.labConnected', 'Lab system connected') : tA('settings.integrations.labCleared', 'Lab system cleared'));
                          })} disabled={!allowModals}>{tA('common.save', 'Save')}</Button>
                        </div>
                      </div>
                      {/* Imaging */}
                      <div className="flex items-center justify-between gap-3 p-4 bg-muted/30 rounded-xl border border-border flex-wrap">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <Settings className="h-5 w-5" />
                          <div>
                            <span className="font-bold">{tA('settings.integrations.imagingSystem', 'Imaging / PACS')}</span>
                            <p className="text-sm text-muted-foreground">{tA('settings.integrations.imagingDesc', 'Connect to a partner imaging center for studies and reports')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <select className="text-sm border border-border rounded-md bg-background px-2 py-1.5 min-w-[180px]" value={imagingProviderId} onChange={e => setImagingProviderId(e.target.value)} disabled={!allowModals}>
                            <option value="">{tA('settings.integrations.selectImaging', '— Select an imaging center —')}</option>
                            {availableImaging.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                          <Badge variant={imagingProviderId ? 'default' : 'secondary'}>{imagingProviderId ? tA('common.connected', 'Connected') : tA('common.notConnected', 'Not connected')}</Badge>
                          <Button size="sm" onClick={() => guard(async () => {
                            await persistIntegrations({ imaging_provider_id: imagingProviderId || null });
                            toast.success(imagingProviderId ? tA('settings.integrations.imagingConnected', 'Imaging system connected') : tA('settings.integrations.imagingCleared', 'Imaging system cleared'));
                          })} disabled={!allowModals}>{tA('common.save', 'Save')}</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* API Keys */}
                  <Card>
                    <CardHeader>
                      <CardTitle>API Keys</CardTitle>
                      <p className="text-sm text-muted-foreground">Use API keys to integrate with custom tools or third-party services.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input placeholder="Key name (e.g. Zapier, Custom App)" value={newApiKeyName} onChange={e => setNewApiKeyName(e.target.value)} className="max-w-xs" />
                        <Button onClick={() => guard(async () => {
                          if (!newApiKeyName.trim()) { toast.error('Enter a name for the key'); return; }
                          const newKey = {
                            id: Date.now().toString(),
                            name: newApiKeyName.trim(),
                            key: 'sk_live_' + Math.random().toString(36).slice(2, 18) + Math.random().toString(36).slice(2, 18),
                            created_at: new Date().toISOString(),
                            last_used: null,
                          };
                          const next = [...apiKeys, newKey];
                          setApiKeys(next);
                          setNewApiKeyName('');
                          await persistIntegrations({ api_keys: next });
                          toast.success('API key generated — copy it now, it will not be shown again');
                        })} disabled={!allowModals}>Generate Key</Button>
                      </div>
                      {apiKeys.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50"><tr><th className="text-left p-3 font-medium">Name</th><th className="text-left p-3 font-medium">Key</th><th className="text-left p-3 font-medium">Created</th><th className="text-left p-3 font-medium">Last Used</th><th className="text-left p-3 font-medium">Actions</th></tr></thead>
                            <tbody>
                              {apiKeys.map(k => (
                                <tr key={k.id} className="border-t">
                                  <td className="p-3 font-medium">{k.name}</td>
                                  <td className="p-3 font-mono text-xs">{k.key.slice(0, 12)}...</td>
                                  <td className="p-3">{(() => { try { return new Date(k.created_at).toLocaleDateString(); } catch { return k.created_at; } })()}</td>
                                  <td className="p-3 text-muted-foreground">{k.last_used || 'Never'}</td>
                                  <td className="p-3 flex gap-1">
                                    <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(k.key).then(() => toast.success('Key copied'))}>Copy</Button>
                                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => guard(async () => { if (confirm('Revoke this key? It will stop working immediately.')) { const next = apiKeys.filter(x => x.id !== k.id); setApiKeys(next); await persistIntegrations({ api_keys: next }); toast.success('Key revoked'); } })} disabled={!allowModals}>Revoke</Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Star className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p>No API keys yet. Generate one above.</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">Keep your API keys secret. Do not share them publicly.</p>
                    </CardContent>
                  </Card>

                  {/* Webhooks */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Webhooks</CardTitle>
                      <p className="text-sm text-muted-foreground">Receive real-time event notifications to your server.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Webhook URL</label>
                        <Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://your-server.com/webhook" />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => guard(async () => { if (!webhookUrl.startsWith('https://')) { toast.error('URL must start with https://'); return; } await persistIntegrations({ webhook_url: webhookUrl }); toast.success('Webhook URL saved'); })} disabled={!allowModals}>Save Webhook</Button>
                        <Button variant="outline" onClick={() => guard(async () => {
                          if (!webhookUrl.startsWith('https://')) { toast.error(tA('settings.integrations.webhookHttpsRequired', 'URL must start with https://')); return; }
                          try {
                            const res = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'test.event', timestamp: new Date().toISOString(), source: 'docito-admin' }) });
                            if (res.ok) toast.success(tA('settings.integrations.webhookTestOk', `Test event delivered (${res.status})`));
                            else toast.error(tA('settings.integrations.webhookTestFail', `Webhook returned ${res.status}`));
                          } catch (e: any) { toast.error(e?.message || 'Failed to deliver test event'); }
                        })} disabled={!allowModals}>{tA('settings.integrations.sendTestEvent', 'Send Test Event')}</Button>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Events that trigger webhooks:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['appointment.created', 'appointment.cancelled', 'appointment.completed', 'payment.received', 'patient.registered'].map(ev => (
                            <span key={ev} className="px-2 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground">{ev}</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Webhook delivery logs coming in a future update.</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </SectionWrapper>
        );
      }

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

        <AdminImportPatientsDialog
          isOpen={importPatientsOpen}
          onClose={() => setImportPatientsOpen(false)}
          onSuccess={() => refreshData()}
          practiceId={practice?.id}
          doctors={doctors}
        />
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
