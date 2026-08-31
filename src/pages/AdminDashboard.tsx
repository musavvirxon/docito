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
import CurrencySwitcher from "@/components/common/CurrencySwitcher";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import ProfileMenu from "@/components/dashboard/ProfileMenu";

import { InviteProviderModal } from "@/components/dashboard/InviteProviderModal";
import { AddServiceModal } from "@/components/dashboard/AddServiceModal";
import { InviteStaffModal } from "@/components/dashboard/InviteStaffModal";
import PendingInvitationsSection from "@/components/dashboard/PendingInvitationsSection";
import { AddLocationModal } from "@/components/dashboard/AddLocationModal";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import DoctorRulesCard from "@/components/dashboard/DoctorRulesCard";
import ProviderFinancialTab from "@/components/admin/ProviderFinancialTab";
import { ComprehensiveRegistrationModal } from "@/components/dashboard/ComprehensiveRegistrationModal";
import { CreateClinicModal } from "@/components/dashboard/CreateClinicModal";
import { ViewRequirementsModal } from "@/components/dashboard/ViewRequirementsModal";
import VerificationSuccessModal from "@/components/dashboard/VerificationSuccessModal";
import JoinRequestsSection from "@/components/dashboard/JoinRequestsSection";
import AdminImportPatientsDialog from "@/components/admin/patients/AdminImportPatientsDialog";
import { MedicalCardDownloadButton } from "@/components/MedicalCardDownloadButton";
import { RoomBedManager } from "@/components/rooms/RoomBedManager";
import { QueueDisplaySettings } from "@/components/rooms/QueueDisplaySettings";
import { useAuth } from "@/contexts/AuthContext";
import { PatientFinanceSection } from "@/components/PatientFinanceSection";
import { ClinicInventoryManager } from "@/components/inventory/ClinicInventoryManager";

import { supabase } from "@/integrations/supabase/client";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { useAdvancedFinancialMetrics } from "@/hooks/useAdvancedFinancialMetrics";
import AdvancedFinancialMetrics from "@/components/financial/AdvancedFinancialMetrics";
import EntitySettingsPage from "@/components/settings/EntitySettingsPage";
import FinanceManagementSection from "@/components/financial/FinanceManagementSection";
import { SuperbillsManager } from "@/components/billing/SuperbillsManager";
import { AppointmentFinancePanel } from "@/components/appointments/AppointmentFinancePanel";
import { PracticePatientBalances } from "@/components/billing/PracticePatientBalances";
import { usePracticeBillingAggregate } from "@/hooks/usePracticeBillingAggregate";
import FinanceLedgerPanel from "@/components/financial/FinanceLedgerPanel";
import CompensationProfilesPanel from "@/components/financial/CompensationProfilesPanel";
import RecurringRulesPanel from "@/components/financial/RecurringRulesPanel";
import ClinicStaffManager from "@/components/clinic/ClinicStaffManager";
import BranchSelector from "@/components/shared/BranchSelector";
import { useVerificationStatus } from "@/hooks/useVerificationStatus";
import { usePracticeInsights, type DailyTrendPoint } from "@/hooks/usePracticeInsights";
import { useEntitySettings } from "@/hooks/useEntitySettings";
import { useFinanceEntries } from "@/hooks/useFinanceEntries";
import { useFinanceCategories } from "@/hooks/useFinanceCategories";
import { useCurrency } from "@/hooks/useCurrency";

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
  Package,
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
  BedDouble,
  Monitor,
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
  | "inventory"
  | "rooms"
  | "queueDisplays"
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
  const { format: money, formatCents: moneyCents } = useCurrency();

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

  const { user } = useAuth();
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
  const [providerTab, setProviderTab] = useState<'overview' | 'calendar' | 'patients' | 'analytics' | 'financial' | 'procedures' | 'reviews' | 'documents' | 'rules'>('overview');
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
  const [billingTab, setBillingTab] = useState<'overview' | 'invoices' | 'transactions' | 'insurance' | 'doctorPayments' | 'settings'>('overview');
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
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');
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

  const billingRangeDays = billingRange === "7d" ? 7 : billingRange === "30d" ? 30 : 90;
  const practiceBilling = usePracticeBillingAggregate(
    practice?.id || null,
    useMemo(() => new Date(Date.now() - billingRangeDays * 86400000), [billingRangeDays]),
    undefined,
  );

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
        value: money(stats.totalRevenue, ((practice as any)?.currency || 'USD').toUpperCase()),
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
    { id: "inventory", label: t("admin.tabs.inventory", { defaultValue: "Inventory" }), icon: Package },
    { id: "rooms", label: t("admin.tabs.rooms", { defaultValue: "Rooms & Beds" }), icon: BedDouble },
    { id: "queueDisplays", label: "Queue displays", icon: Monitor },
    { id: "analytics", label: t("admin.tabs.analytics"), icon: TrendingUp },
    { id: "settings", label: t("admin.tabs.settings", { defaultValue: "Settings" }), icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
           <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <img src="/logos/horizontal/docito-horizontal-sm.png" alt="Docito healthcare platform logo" className="h-7" width={93} height={28} />
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
              <img src="/logos/horizontal/docito-horizontal-sm.png" alt="Docito healthcare platform logo" className="h-7" width={93} height={28} />
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
              <img src="/logos/horizontal/docito-horizontal-sm.png" alt="Docito healthcare platform logo" className="h-7" width={93} height={28} />
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
                          <span className="text-sm font-medium">{money(Number(service.price || 0), 'USD')}</span>
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
          { key: 'financial', label: t("admin.providers.tabs.financial", { defaultValue: "Financial" }) },
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
                          const name = prompt(t('admin.pd.editNamePrompt'), selectedProvider.name);
                          if (name && name !== selectedProvider.name) {
                            const { error } = await (supabase as any).from('doctors').update({ full_name: name }).eq('id', selectedProvider.id);
                            if (error) { toast.error(error.message); return; }
                            toast.success(t("admin.pd.updated"));
                            refreshData();
                          }
                        })} disabled={!allowModals}>{t("admin.pd.edit")}</Button>
                        <Button variant="outline" size="sm" onClick={() => guard(async () => {
                          if (!confirm(t('admin.pd.suspendConfirm', { name: selectedProvider.name }))) return;
                          const { error } = await (supabase as any).from('doctors').update({ is_verified: false }).eq('id', selectedProvider.id);
                          if (error) { toast.error(error.message); return; }
                          toast.success(t("admin.pd.suspended"));
                          refreshData();
                        })} disabled={!allowModals}>{t("admin.pd.suspend")}</Button>
                        <Button variant="outline" size="sm" onClick={() => guard(() => {
                          navigate(`/dashboard/messages`);
                        })} disabled={!allowModals}>
                          <MessageCircle className="h-4 w-4 mr-1" /> {t("admin.pd.message")}
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
                        <CardHeader><CardTitle>{t("admin.pd.personalInfo")}</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                              [t('admin.pd.fields.fullName'), selectedProvider.name],
                              [t('admin.pd.fields.specialty'), selectedProvider.specialty],
                              [t('admin.pd.fields.email'), selectedProvider.email],
                              [t('admin.pd.fields.phone'), selectedProvider.phone],
                              [t('admin.pd.fields.license'), selectedProvider.license_number],
                              [t('admin.pd.fields.languages'), Array.isArray(selectedProvider.languages) ? selectedProvider.languages.join(', ') : selectedProvider.languages],
                              [t('admin.pd.fields.experience'), selectedProvider.years_experience ? `${selectedProvider.years_experience} ${t('admin.pd.years')}` : '—'],
                              [t('admin.pd.fields.fee'), selectedProvider.consultation_fee != null ? money(Number(selectedProvider.consultation_fee), 'USD') : '—'],
                              [t('admin.pd.fields.consultTypes'), Array.isArray(selectedProvider.consultation_types) ? selectedProvider.consultation_types.join(', ') : '—'],
                              [t('admin.pd.fields.acceptsNew'), selectedProvider.accepts_new_patients ? t('admin.pd.yesNo.yes') : t('admin.pd.yesNo.no')],
                              [t('admin.pd.fields.verified'), selectedProvider.verified ? t('admin.pd.yesNo.yes') : t('admin.pd.yesNo.no')],
                              [t('admin.pd.fields.reviews'), selectedProvider.num_reviews ?? 0],
                            ].map(([label, value]) => (
                              <div key={label as string}>
                                <p className="text-sm text-muted-foreground">{label}</p>
                                <p className="font-medium">{value || '—'}</p>
                              </div>
                            ))}
                          </div>
                          {selectedProvider.bio && (
                            <div className="mt-4">
                              <p className="text-sm text-muted-foreground">{t("admin.pd.fields.bio")}</p>
                              <p className="text-sm leading-relaxed mt-1">{selectedProvider.bio}</p>
                            </div>
                          )}
                          <Button variant="outline" className="mt-4" onClick={() => guard(async () => {
                            const bio = prompt(t('admin.pd.editBioPrompt'), selectedProvider.bio || '');
                            if (bio !== null) {
                              const { error } = await (supabase as any).from('doctors').update({ bio }).eq('id', selectedProvider.id);
                              if (error) { toast.error(error.message); return; }
                              toast.success(t("admin.pd.infoUpdated"));
                              refreshData();
                            }
                          })}>{t("admin.pd.editInfo")}</Button>
                        </CardContent>
                      </Card>
                      {/* Quick Stats */}
                      <Card className="rounded-xl lg:col-span-4">
                        <CardHeader><CardTitle>{t("admin.pd.quickStats")}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-between"><span className="text-sm text-muted-foreground">{t("admin.pd.stats.total")}</span><span className="font-bold">{total}</span></div>
                          <div className="flex justify-between"><span className="text-sm text-muted-foreground">{t("admin.pd.stats.patients")}</span><span className="font-bold">{providerUniquePatients.size}</span></div>
                          <div className="flex justify-between"><span className="text-sm text-muted-foreground">{t("admin.pd.stats.rating")}</span><span className="font-bold flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" />{selectedProvider.rating || '—'}</span></div>
                          <div className="flex justify-between"><span className="text-sm text-muted-foreground">{t("admin.pd.stats.member")}</span><span className="font-bold">{selectedProvider.created_at ? format(new Date(selectedProvider.created_at), 'MMM yyyy') : '—'}</span></div>
                        </CardContent>
                      </Card>
                    </div>
                    {/* Activity Summary */}
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>{t("admin.pd.activity")}</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[
                            { label: t('admin.pd.status.pending'), count: pending, color: 'text-yellow-600' },
                            { label: t('admin.pd.status.completed'), count: completed, color: 'text-green-600' },
                            { label: t('admin.pd.status.cancelled'), count: cancelled, color: 'text-red-600' },
                            { label: t('admin.pd.status.noshow'), count: noShow, color: 'text-orange-600' },
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
                      <h3 className="text-lg font-semibold">{t("admin.pd.schedule.title")}</h3>
                      <Button variant="outline" onClick={() => guard(async () => {
                        const date = prompt(t('admin.pd.schedule.blockDatePrompt'), new Date().toISOString().split('T')[0]);
                        if (!date) return;
                        const startTime = prompt(t('admin.pd.schedule.startTimePrompt'), '09:00');
                        const endTime = prompt(t('admin.pd.schedule.endTimePrompt'), '17:00');
                        if (!startTime || !endTime) return;
                        const reason = prompt(t('admin.pd.schedule.reasonPrompt'));
                        const { error } = await (supabase as any).from('blocked_times').insert({ doctor_id: selectedProvider.id, blocked_date: date, start_time: startTime, end_time: endTime, reason: reason || null, block_type: 'manual' });
                        if (error) { toast.error(error.message); return; }
                        toast.success(t('admin.pd.schedule.blocked'));
                      })} disabled={!allowModals}>
                        <Clock className="h-4 w-4 mr-2" /> {t("admin.pd.schedule.block")}
                      </Button>
                    </div>
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle className="text-base">{t("admin.pd.schedule.workingHours")}</CardTitle></CardHeader>
                      <CardContent>
                        {(() => {
                          const dayKeys = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
                          const dayLabels: Record<string, string> = {
                            monday: t('admin.pd.days.monday'), tuesday: t('admin.pd.days.tuesday'), wednesday: t('admin.pd.days.wednesday'),
                            thursday: t('admin.pd.days.thursday'), friday: t('admin.pd.days.friday'), saturday: t('admin.pd.days.saturday'), sunday: t('admin.pd.days.sunday'),
                          };
                          const wd = (selectedProvider.schedule?.working_days || {}) as Record<string, any>;
                          const hasAny = dayKeys.some(k => wd[k]);
                          if (!hasAny) {
                            return <p className="text-sm text-muted-foreground py-4 text-center">{t("admin.pd.schedule.noHours")}</p>;
                          }
                          return (
                            <div className="space-y-2">
                              {dayKeys.map(k => {
                                const row = wd[k] || {};
                                const enabled = !!row.enabled;
                                const breaks: any[] = Array.isArray(row.breaks) ? row.breaks : [];
                                return (
                                  <div key={k} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg border border-border flex-wrap">
                                    <span className="text-sm font-medium w-24">{dayLabels[k]}</span>
                                    <Badge variant={enabled ? 'secondary' : 'outline'}>{enabled ? t('admin.pd.schedule.open') : t('admin.pd.schedule.closed')}</Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {enabled ? `${row.start_time}–${row.end_time}` : '—'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {enabled && breaks.length
                                        ? breaks.map(b => `${b.name || t('admin.pd.schedule.break')} ${b.start_time}–${b.end_time}`).join(', ')
                                        : ''}
                                    </span>
                                  </div>
                                );
                              })}
                              {selectedProvider.schedule?.buffer_time != null && (
                                <p className="text-xs text-muted-foreground mt-2">{t("admin.pd.schedule.buffer", { n: selectedProvider.schedule.buffer_time })}</p>
                              )}
                            </div>
                          );
                        })()}
                        <p className="text-xs text-muted-foreground mt-3">{t("admin.pd.schedule.footer")}</p>
                      </CardContent>
                    </Card>
                    {Array.isArray(selectedProvider.schedule?.holidays) && selectedProvider.schedule.holidays.length > 0 && (
                      <Card className="rounded-xl">
                        <CardHeader><CardTitle className="text-base">{t("admin.pd.schedule.holidays")}</CardTitle></CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {selectedProvider.schedule.holidays.map((h: string) => (
                              <Badge key={h} variant="outline">{h}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle className="text-base">{t("admin.pd.upcoming")}</CardTitle></CardHeader>
                      <CardContent>
                        {(() => {
                          const today = new Date().toISOString().split('T')[0];
                          const upcoming = providerAppointments
                            .filter(a => a.status !== 'cancelled' && a.appointment_date >= today)
                            .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))
                            .slice(0, 10);
                          if (upcoming.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">{t("admin.pd.noUpcoming")}</p>;
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
                                  <span className="truncate">{a.patient_name || t('admin.pd.unknown')}</span>
                                  <span className="truncate">{a.service_name || '—'}</span>
                                  <Badge variant="outline" className="w-fit">{a.status}</Badge>
                                  <MedicalCardDownloadButton
                                    practice={practice}
                                    locations={locations}
                                    appointmentId={a.id}
                                    patientId={a.patient_id || p.id || null}
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
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle className="text-base">{t("admin.pd.past")}</CardTitle></CardHeader>
                      <CardContent>
                        {(() => {
                          const today = new Date().toISOString().split('T')[0];
                          const past = providerAppointments
                            .filter(a => a.appointment_date < today)
                            .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))
                            .slice(0, 25);
                          if (past.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">{t("admin.pd.noPast")}</p>;
                          return (
                            <div className="space-y-2">
                              {past.map(a => (
                                <div key={a.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 p-3 bg-muted/30 rounded-lg border border-border items-center text-sm">
                                  <span>{a.appointment_date} {a.start_time || ''}</span>
                                  <span className="truncate">{a.patient_name || t('admin.pd.unknown')}</span>
                                  <span className="truncate">{a.service_name || '—'}</span>
                                  <Badge variant="outline" className="w-fit capitalize">{a.status}</Badge>
                                </div>
                              ))}
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
                        name: a.patient_name || t('admin.pd.unknown'),
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
                      <Input placeholder={t("admin.pd.patients.search")} value={providerSearch} onChange={e => setProviderSearch(e.target.value)} className="max-w-sm" />
                      <Card className="rounded-xl">
                        <CardContent className="pt-6">
                          {filteredPatients.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">{t("admin.pd.patients.none")}</p>
                          ) : (
                            <div className="space-y-2">
                              <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground px-3 pb-2 border-b border-border">
                                <span>{t("admin.pd.patients.name")}</span><span>{t("admin.pd.patients.lastVisit")}</span><span>{t("admin.pd.patients.totalVisits")}</span><span>{t("admin.pd.patients.lastService")}</span><span></span>
                              </div>
                              {filteredPatients.map((p, i) => (
                                <div key={i} className="grid grid-cols-5 gap-2 p-3 bg-muted/30 rounded-lg border border-border items-center text-sm">
                                  <span className="font-medium truncate">{p.name}</span>
                                  <span>{p.lastVisit}</span>
                                  <span>{p.totalVisits}</span>
                                  <span className="truncate">{p.lastService}</span>
                                  <Button variant="outline" size="sm" onClick={() => (() => { setSelectedProvider(null); setActiveSection('patients'); })()}>{t("admin.pd.patients.view")}</Button>
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
                    { label: t('admin.pd.status.completed'), count: completed2, color: 'bg-green-500', pct: total2 > 0 ? (completed2 / total2 * 100) : 0 },
                    { label: t('admin.pd.status.pending'), count: pending, color: 'bg-yellow-500', pct: total2 > 0 ? (pending / total2 * 100) : 0 },
                    { label: t('admin.pd.status.cancelled'), count: cancelled2, color: 'bg-red-500', pct: total2 > 0 ? (cancelled2 / total2 * 100) : 0 },
                    { label: t('admin.pd.status.noshow'), count: noShow, color: 'bg-orange-500', pct: total2 > 0 ? (noShow / total2 * 100) : 0 },
                  ];

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { label: t('admin.pd.analytics.total'), value: total2 },
                          { label: t('admin.pd.analytics.unique'), value: providerUniquePatients.size },
                          { label: t('admin.pd.analytics.completion'), value: `${completionRate}%` },
                          { label: t('admin.pd.analytics.cancellation'), value: `${cancellationRate}%` },
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
                        <CardHeader><CardTitle className="text-base">{t("admin.pd.analytics.overTime")}</CardTitle></CardHeader>
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
                            <p className="text-sm text-muted-foreground text-center py-6">{t("admin.pd.analytics.noData")}</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="rounded-xl">
                        <CardHeader><CardTitle className="text-base">{t("admin.pd.analytics.statusBreakdown")}</CardTitle></CardHeader>
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
                        <CardHeader><CardTitle className="text-base">{t("admin.pd.analytics.performance")}</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              { label: t('admin.pd.analytics.avgRating'), value: selectedProvider.rating ? `${selectedProvider.rating} ★` : t('admin.pd.analytics.noRatings') },
                              { label: t('admin.pd.analytics.retention'), value: providerUniquePatients.size > 0 ? `${Math.min(100, Math.round(providerUniquePatients.size / Math.max(1, total) * 100))}%` : '—' },
                              { label: t('admin.pd.analytics.utilization'), value: total > 0 ? `${Math.round(completed / total * 100)}%` : '—' },
                              { label: t('admin.pd.analytics.onTime'), value: total > 0 ? `${Math.max(70, 100 - Math.round(noShow / total * 100))}%` : '—' },
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

                {providerTab === 'financial' && selectedProvider?.id && (
                  <ProviderFinancialTab doctorId={selectedProvider.id} doctorName={selectedProvider.name} />
                )}

                {providerTab === 'procedures' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">{t("admin.pd.procedures.title")}</h3>
                      <p className="text-sm text-muted-foreground">{t("admin.pd.procedures.subtitle")}</p>
                    </div>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        {(() => {
                          const docProcs: any[] = selectedProvider.procedures || [];
                          const rows = docProcs.length ? docProcs : services;
                          if (rows.length === 0) {
                            return <p className="text-sm text-muted-foreground text-center py-6">{t("admin.pd.procedures.none")}</p>;
                          }
                          return (
                            <div className="space-y-2">
                              <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground px-3 pb-2 border-b border-border">
                                <span>{t("admin.pd.procedures.colName")}</span><span>{t("admin.pd.procedures.colCategory")}</span><span>{t("admin.pd.procedures.colPrice")}</span><span>{t("admin.pd.procedures.colDuration")}</span><span>{t("admin.pd.procedures.colStatus")}</span>
                              </div>
                              {rows.map((svc: any) => (
                                <div key={svc.id} className="grid grid-cols-5 gap-2 p-3 bg-muted/30 rounded-lg border border-border items-center text-sm">
                                  <span className="font-medium truncate">{svc.name}</span>
                                  <Badge variant="outline">{svc.category || '—'}</Badge>
                                  <span>{svc.price != null ? money(Number(svc.price), 'USD') : '—'}</span>
                                  <span>{svc.duration ? `${svc.duration} min` : '—'}</span>
                                  <Badge variant="secondary">{svc.is_active === false ? t('admin.pd.procedures.inactive') : t('admin.pd.procedures.active')}</Badge>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        <p className="text-xs text-muted-foreground mt-3">{(selectedProvider.procedures || []).length ? t('admin.pd.procedures.footerDoc') : t('admin.pd.procedures.footerClinic')}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {providerTab === 'reviews' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{t("admin.pd.reviews.title")}</h3>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        <span className="text-lg font-bold">{selectedProvider.rating || '—'}</span>
                      </div>
                    </div>
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle className="text-base">{t("admin.pd.reviews.breakdown")}</CardTitle></CardHeader>
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
                          <p className="font-medium">{t("admin.pd.reviews.none")}</p>
                          <p className="text-sm mt-1">{t("admin.pd.reviews.willAppear")}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {providerTab === 'documents' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{t("admin.pd.docs.title")}</h3>
                      <Button variant="outline" onClick={() => guard(() => toast.info(t('admin.pd.docs.uploadNotice')))} disabled={!allowModals}>
                        <FileText className="h-4 w-4 mr-2" /> {t('admin.pd.docs.upload')}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[t('admin.pd.docs.cat.license'), t('admin.pd.docs.cat.contracts'), t('admin.pd.docs.cat.other')].map(cat => (
                        <Card key={cat} className="rounded-xl">
                          <CardHeader><CardTitle className="text-base">{cat}</CardTitle></CardHeader>
                          <CardContent>
                            <div className="text-center py-6 text-muted-foreground">
                              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">{t("admin.pd.docs.none")}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("admin.pd.docs.comingSoon")}</p>
                  </div>
                )}

                {providerTab === 'rules' && practice?.id && selectedProvider?.id && (
                  <DoctorRulesCard
                    practiceId={practice.id}
                    doctorId={selectedProvider.id}
                    doctorName={selectedProvider.name}
                  />
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
                    <p className="text-sm text-muted-foreground">{t("admin.pd.dir.active")}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{doctors.filter(d => d.status !== "active").length}</div>
                    <p className="text-sm text-muted-foreground">{t("admin.pd.dir.pendingInactive")}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{new Set(doctors.map(d => d.specialty).filter(Boolean)).size}</div>
                    <p className="text-sm text-muted-foreground">{t("admin.pd.dir.specialties")}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-6">
                <Input
                  placeholder={t("admin.pd.dir.search")}
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
                      {s === 'all' ? t('admin.pd.dir.all') : t(`admin.pd.status.${s === 'inactive' ? 'cancelled' : s}`, { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) })}
                    </Button>
                  ))}
                </div>
                <select
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                  value={providerSpecialtyFilter}
                  onChange={e => setProviderSpecialtyFilter(e.target.value)}
                >
                  <option value="all">{t("admin.pd.dir.allSpecialties")}</option>
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
                            <p className="text-sm text-muted-foreground truncate">{doctor.specialty || t('admin.pd.dir.general')}</p>
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
                          {t("admin.pd.dir.viewProfile")}
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
          { key: 'catalog' as const, label: t('admin.sv.tab.catalog') },
          { key: 'pricing' as const, label: t('admin.sv.tab.pricing') },
          { key: 'categories' as const, label: t('admin.sv.tab.categories') },
          { key: 'analytics' as const, label: t('admin.sv.tab.analytics') },
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
                    <p className="text-sm text-muted-foreground">{t("admin.sv.kpi.total")}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {services.length > 0
                        ? money(Math.round(services.reduce((sum, s) => sum + (s.price || 0), 0) / services.length), 'USD')
                        : money(0, 'USD')}
                    </div>
                    <p className="text-sm text-muted-foreground">{t("admin.sv.kpi.avg")}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {new Set(services.map(s => s.category)).size}
                    </div>
                    <p className="text-sm text-muted-foreground">{t("admin.sv.kpi.categories")}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {money(services.reduce((sum, s) => sum + (s.price || 0), 0), 'USD')}
                    </div>
                    <p className="text-sm text-muted-foreground">{t("admin.sv.kpi.revenue")}</p>
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
                      placeholder={t("admin.sv.search")}
                      value={serviceSearch}
                      onChange={e => setServiceSearch(e.target.value)}
                      className="px-3 py-2 border border-border rounded-lg bg-background text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <select
                      value={serviceCategoryFilter}
                      onChange={e => setServiceCategoryFilter(e.target.value)}
                      className="px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="all">{t("admin.sv.allCategories")}</option>
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
                            <p className="text-sm">{t("admin.sv.noMatch")}</p>
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
                                  <Badge variant="secondary" className="text-xs">{service.category || t('admin.sv.uncategorized')}</Badge>
                                </div>
                                <div className="text-sm text-muted-foreground sm:col-span-1">
                                  {service.duration ? `${service.duration} min` : '—'}
                                </div>
                                <div className="font-semibold sm:col-span-1">{money(Number(service.price || 0), 'USD')}</div>
                                <div className="sm:col-span-1">
                                  {(service as any).is_online !== false ? (
                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">{t("admin.sv.online")}</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">{t("admin.sv.offline")}</Badge>
                                  )}
                                </div>
                                <div className="flex items-center justify-end gap-2 sm:col-span-1">
                                  <Button variant="outline" size="icon" onClick={() => guard(async () => {
                                    const newPrice = prompt(t('admin.sv.newPricePrompt'), String((service as any).price || 0));
                                    if (newPrice === null) return;
                                    const { error } = await (supabase as any).from('procedures').update({ price: parseFloat(newPrice) || 0 }).eq('id', service.id);
                                    if (error) { toast.error(error.message); return; }
                                    toast.success(t('admin.sv.updated'));
                                    refreshData();
                                  })} disabled={!allowModals}>
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="icon" onClick={() => guard(async () => {
                                    if (!confirm(t('admin.sv.archiveConfirm'))) return;
                                    const { error } = await (supabase as any).from('procedures').update({ is_active: false }).eq('id', service.id);
                                    if (error) { toast.error(error.message); return; }
                                    toast.success(t('admin.sv.archived'));
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
                        <CardTitle>{t("admin.sv.categoryBreakdown")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {services.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t("admin.sv.noServices")}</p>
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
                                <Badge variant="secondary">{count as number} {(count as number) !== 1 ? t("admin.sv.servicesPlural") : t("admin.sv.services")}</Badge>
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
                        <CardTitle className="text-base">{t("admin.sv.pricing.overview")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-sm font-medium">{t("admin.sv.pricing.lowest")}</span>
                            <span className="text-lg font-bold">
                              {money(services.length > 0 ? Math.min(...services.map(s => s.price || 0)) : 0, 'USD')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-sm font-medium">{t("admin.sv.pricing.highest")}</span>
                            <span className="text-lg font-bold">
                              {money(services.length > 0 ? Math.max(...services.map(s => s.price || 0)) : 0, 'USD')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-sm font-medium">{t("admin.sv.pricing.average")}</span>
                            <span className="text-lg font-bold">
                              {services.length > 0 ? money(Math.round(services.reduce((sum, s) => sum + (s.price || 0), 0) / services.length), 'USD') : money(0, 'USD')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-sm font-medium">{t("admin.sv.pricing.totalRevenue")}</span>
                            <span className="text-lg font-bold">
                              {money(services.reduce((sum, s) => sum + (s.price || 0), 0), 'USD')}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl lg:col-span-4 min-w-0">
                      <CardHeader>
                        <CardTitle className="text-base">{t("admin.sv.topCategories")}</CardTitle>
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
                              <p className="text-sm text-muted-foreground">{t("admin.sv.noCats")}</p>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl lg:col-span-4 min-w-0">
                      <CardHeader>
                        <CardTitle className="text-base">{t("admin.sv.summary.title")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-sm font-medium">{t("admin.sv.kpi.total")}</span>
                            <span className="text-lg font-bold">{services.length}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-sm font-medium">{t("admin.sv.kpi.categories")}</span>
                            <span className="text-lg font-bold">{new Set(services.map(s => s.category)).size}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <span className="text-sm font-medium">{t("admin.sv.summary.avgPerCat")}</span>
                            <span className="text-lg font-bold">
                              {(() => {
                                const catCount = new Set(services.map(s => s.category)).size;
                                return catCount > 0 ? (services.length / catCount).toFixed(1) : "0";
                              })()}
                            </span>
                          </div>
                          {services.length > 0 && (
                            <div className="pt-2">
                              <h4 className="text-xs font-medium text-muted-foreground mb-2">{t("admin.sv.recentlyAdded")}</h4>
                              {services.slice(0, 3).map(s => (
                                <div key={s.id} className="text-sm p-2 bg-muted/20 rounded-md border border-border mb-1">
                                  <span className="font-medium">{s.name}</span>
                                  <span className="text-muted-foreground ml-2">{money(Number(s.price || 0), 'USD')}</span>
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
                    <h3 className="text-lg font-semibold">{t("admin.sv.rules.title")}</h3>
                    <Button variant="outline" size="sm" onClick={() => guard(() => toast.info(t('admin.sv.rules.useCatalog')))} disabled={!allowModals}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      {t('admin.sv.rules.addRule')}
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
                            <h4 className="font-semibold text-sm">{t("admin.sv.rules.fixed")}</h4>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{t("admin.sv.rules.fixedDesc")}</p>
                        <Badge variant="secondary">{services.length} {t("admin.sv.servicesPlural")}</Badge>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Settings className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{t("admin.sv.rules.provider")}</h4>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{t("admin.sv.rules.providerDesc")}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">0 {t("admin.sv.servicesPlural")}</Badge>
                          <Button size="sm" variant="outline" onClick={() => toast.info(t('admin.sv.rules.providerNotice'))}>{t('admin.sv.rules.enable')}</Button>
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
                            <h4 className="font-semibold text-sm">{t("admin.sv.rules.deposit")}</h4>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{t("admin.sv.rules.depositDesc")}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">0 {t("admin.sv.rules.rulesActive")}</Badge>
                          <Button size="sm" variant="outline" onClick={() => toast.info(t('admin.sv.rules.depositNotice'))}>{t('admin.sv.rules.configure')}</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>{t("admin.sv.priceList")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {services.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">{t("admin.sv.noServices")}</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border text-left">
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.sv.col.service")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.pd.procedures.colCategory")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.pd.procedures.colDuration")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.pd.procedures.colPrice")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.sv.col.type")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.sv.col.deposit")}</th>
                                <th className="pb-2 font-medium text-muted-foreground"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {services.map(s => (
                                <tr key={s.id} className="border-b border-border/50">
                                  <td className="py-3 font-medium">{s.name}</td>
                                  <td className="py-3"><Badge variant="secondary" className="text-xs">{s.category || t('admin.sv.uncategorized')}</Badge></td>
                                  <td className="py-3 text-muted-foreground">{s.duration ? `${s.duration} min` : '—'}</td>
                                  <td className="py-3 font-semibold">{money(Number(s.price || 0), 'USD')}</td>
                                  <td className="py-3"><Badge variant="outline" className="text-xs">{t("admin.sv.type.fixed")}</Badge></td>
                                  <td className="py-3"><Badge variant="secondary" className="text-xs">{t("admin.sv.type.none")}</Badge></td>
                                  <td className="py-3 text-right">
                                    <Button variant="ghost" size="sm" onClick={() => guard(async () => {
                                    const newPrice = prompt(t('admin.sv.newPricePrompt'), String(s.price || 0));
                                    if (newPrice === null) return;
                                    const { error } = await (supabase as any).from('procedures').update({ price: parseFloat(newPrice) || 0 }).eq('id', s.id);
                                    if (error) { toast.error(error.message); return; }
                                    toast.success(t('admin.sv.priceUpdated'));
                                    refreshData();
                                  })} disabled={!allowModals}>{t('admin.pd.edit')}</Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-4">{t("admin.sv.priceListFooter")}</p>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ============ TAB: CATEGORIES ============ */}
              {serviceTab === 'categories' && (
                <>
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                    <h3 className="text-lg font-semibold">{t("admin.sv.categories.title")}</h3>
                  </div>

                  <Card className="rounded-xl mb-6">
                    <CardHeader>
                      <CardTitle className="text-base">{t("admin.sv.categories.create")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3 items-center flex-wrap">
                        <input
                          type="text"
                          placeholder={t("admin.sv.categories.placeholder")}
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
                          if (!name) { toast.error(t('admin.sv.categories.enterName')); return; }
                          const { error } = await (supabase as any).from('finance_categories').insert({ entity_type: 'practice', entity_id: practice?.id, kind: 'service', name, is_active: true });
                          if (error) { toast.error(error.message); return; }
                          toast.success(t('admin.sv.categories.added'));
                          if (input) input.value = '';
                          financeCategoriesHook.refresh();
                        })} disabled={!allowModals}>{t('admin.sv.categories.add')}</Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">{t("admin.sv.categories.hint")}</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl mb-6">
                    <CardHeader>
                      <CardTitle className="text-base">{t("admin.sv.categories.your")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {uniqueCategories.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">{t("admin.sv.categories.noneAddOne")}</p>
                      ) : (
                        <div className="space-y-2">
                          {uniqueCategories.map((cat, i) => {
                            const count = services.filter(s => s.category === cat).length;
                            return (
                              <div key={cat} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                  <div className={`h-3 w-3 rounded-full ${catColorsTW[i % catColorsTW.length]}`} />
                                  <span className="text-sm font-medium">{cat}</span>
                                  <Badge variant="secondary" className="text-xs">{count} {count !== 1 ? t('admin.sv.servicesPlural') : t('admin.sv.services')}</Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => (async () => {
                                    const newName = prompt(t('admin.sv.categories.renamePrompt'), cat);
                                    if (!newName || newName === cat) return;
                                    toast.success(t('admin.sv.categories.renamed'));
                                  })()}>{t('admin.sv.categories.rename')}</Button>
                                  {count === 0 && (
                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => (async () => {
                                      if (!confirm(t('admin.sv.categories.deleteConfirm'))) return;
                                      toast.success(t('admin.sv.categories.removed'));
                                    })()}>{t('admin.sv.categories.delete')}</Button>
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
                      <CardTitle className="text-base">{t("admin.sv.categories.uncat")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const uncatCount = services.filter(s => !s.category || s.category === '').length;
                        return uncatCount > 0 ? (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">{t('admin.sv.categories.noCat', { n: uncatCount, s: uncatCount !== 1 ? 's' : '' })}</p>
                            <Button variant="outline" size="sm" onClick={() => guard(() => toast.info(t('admin.sv.categories.assignNotice')))} disabled={!allowModals}>{t('admin.sv.categories.assign')}</Button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">{t("admin.sv.categories.allSet")}</p>
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
                        <p className="text-sm text-muted-foreground">{t("admin.sv.kpi.total")}</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{services.filter(s => (s as any).is_online !== false).length}</div>
                        <p className="text-sm text-muted-foreground">{t("admin.sv.analytics.activeOnline")}</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{new Set(services.map(s => s.category)).size}</div>
                        <p className="text-sm text-muted-foreground">{t("admin.sv.kpi.categories")}</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {money(services.length > 0 ? Math.round(services.reduce((s, v) => s + (v.price || 0), 0) / services.length) : 0, 'USD')}
                        </div>
                        <p className="text-sm text-muted-foreground">{t("admin.sv.kpi.avg")}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <Card className="rounded-xl">
                      <CardHeader>
                        <CardTitle className="text-base">{t("admin.sv.analytics.byCat")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {services.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">{t("admin.sv.noServices")}</p>
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
                        <CardTitle className="text-base">{t("admin.sv.analytics.priceDist")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {services.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">{t("admin.sv.noServices")}</p>
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
                      <CardTitle className="text-base">{t("admin.sv.analytics.mostBooked")}</CardTitle>
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
                          return <p className="text-sm text-muted-foreground text-center py-4">{t("admin.sv.analytics.noAppts")}</p>;
                        }
                        return (
                          <div className="space-y-2">
                            {ranked.filter(r => r.bookings > 0).map((r, i) => (
                              <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-muted-foreground w-6">#{i + 1}</span>
                                  <span className="text-sm font-medium">{r.name}</span>
                                  <Badge variant="secondary" className="text-xs">{r.category || t('admin.sv.analytics.other')}</Badge>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm text-muted-foreground">{t('admin.sv.analytics.bookings', { n: r.bookings })}</span>
                                  <span className="text-sm font-semibold">{money(r.bookings * (r.price || 0), 'USD')}</span>
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
                      <CardTitle className="text-base">{t("admin.sv.analytics.noRecent")}</CardTitle>
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
                          return <p className="text-sm text-muted-foreground text-center py-4">{t("admin.sv.analytics.allBooked")}</p>;
                        }
                        return (
                          <>
                            <div className="space-y-2">
                              {zeroBooking.map(s => (
                                <div key={s.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium">{s.name}</span>
                                    <Badge variant="secondary" className="text-xs">{s.category || t('admin.sv.analytics.other')}</Badge>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold">{money(Number(s.price || 0), 'USD')}</span>
                                    <Button variant="ghost" size="sm" onClick={() => guard(async () => {
                                    if (!confirm(t('admin.sv.archiveConfirm'))) return;
                                    const { error } = await (supabase as any).from('procedures').update({ is_active: false }).eq('id', s.id);
                                    if (error) { toast.error(error.message); return; }
                                    toast.success(t('admin.sv.archived'));
                                    refreshData();
                                  })} disabled={!allowModals}>{t('admin.sv.analytics.archive')}</Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">{t("admin.sv.analytics.considerArchive")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("admin.lo.totalLocations")}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{locations.filter(l => l.status === "active").length}</div>
                  <p className="text-sm text-muted-foreground">{t("admin.lo.active")}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{locations.filter(l => l.status !== "active").length}</div>
                  <p className="text-sm text-muted-foreground">{t("admin.lo.inactive")}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {locations.length > 0 ? (doctors.length / locations.length).toFixed(1) : "0"}
                  </div>
                  <p className="text-sm text-muted-foreground">{t("admin.lo.providersPerLoc")}</p>
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
                              <Settings className="h-4 w-4 mr-1" /> {t("admin.lo.edit")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => guard(async () => {
                                if (!confirm(t("admin.lo.confirmDelete"))) return;
                                try {
                                  const { error } = await supabase
                                    .from("practice_locations")
                                    .delete()
                                    .eq("id", location.id);
                                  if (error) throw error;
                                  toast.success(t("admin.lo.locationDeleted"));
                                  refreshData();
                                } catch (err: any) {
                                  toast.error(err?.message || t("admin.lo.deleteFailed"));
                                }
                              })}
                              disabled={!allowModals}
                            >
                              <X className="h-4 w-4 mr-1" /> {t("admin.lo.delete")}
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
                  <CardTitle>{t("admin.lo.statusOverview")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">{t("admin.lo.activeLocations")}</span>
                      <Badge variant="secondary">{locations.filter(l => l.status === "active").length}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">{t("admin.lo.inactiveLocations")}</span>
                      <Badge variant="secondary">{locations.filter(l => l.status !== "active").length}</Badge>
                    </div>
                    {locations.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">{t("admin.lo.allAddresses")}</h4>
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
                  <CardTitle className="text-base">{t("admin.lo.coverageSummary")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">{t("admin.lo.totalBranches")}</span>
                      <span className="text-lg font-bold">{locations.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">{t("admin.lo.activeRate")}</span>
                      <span className="text-lg font-bold">
                        {locations.length > 0 ? Math.round((locations.filter(l => l.status === "active").length / locations.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">{t("admin.lo.uniqueCities")}</span>
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
                  <CardTitle className="text-base">{t("admin.lo.branchDirectory")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("admin.lo.noBranches")}</p>
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
                  <CardTitle className="text-base">{t("admin.lo.operationalHealth")}</CardTitle>
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
                        <p className="text-sm text-muted-foreground">{t("admin.lo.noLocationData")}</p>
                      );
                    })()}
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="text-sm font-medium">{t("admin.lo.providersPerLoc")}</span>
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
            { key: 'overview', label: t('admin.pt.overview') },
            { key: 'appointments', label: t('admin.pt.appointments') },
            { key: 'billing', label: t('admin.pt.billing') },
            { key: 'documents', label: t('admin.pt.documents') },
            { key: 'notes', label: t('admin.pt.notes') },
            { key: 'activity', label: t('admin.pt.activity') },
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
                          const phone = prompt(t('admin.pt.editPhone'), selectedPatient.phone || '');
                          if (phone !== null && phone !== selectedPatient.phone) {
                            const { error } = await (supabase as any).from('doctor_patients').update({ phone }).eq('id', selectedPatient.id);
                            if (error) { toast.error(error.message); return; }
                            toast.success(t('admin.pt.patientUpdated'));
                            refreshData();
                          }
                        })}>{t('admin.pt.edit')}</Button>
                        <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(() => {
                          navigate('/dashboard/appointments');
                        })}>{t('admin.pt.newAppointment')}</Button>
                        <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(async () => {
                          if (!confirm(t('admin.pt.confirmBlock'))) return;
                          const { error } = await (supabase as any).from('doctor_patients').update({ status: 'blocked' }).eq('id', selectedPatient.id);
                          if (error) { toast.error(error.message); return; }
                          toast.success(t('admin.pt.patientBlocked'));
                          refreshData();
                        })}>{t('admin.pt.block')}</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tab bar */}
                <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
                  {patientTabs.map(tab => (
                    <Button key={tab.key} variant="ghost" size="sm"
                      className={`rounded-none ${patientTab === tab.key ? 'border-b-2 border-primary font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setPatientTab(tab.key)}
                    >{tab.label}</Button>
                  ))}

                </div>

                {/* Tab content */}
                {patientTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                      <Card className="rounded-xl">
                        <CardHeader><CardTitle className="text-base">{t("admin.pt.personalInfo")}</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            {[
                              [t('admin.pt.fullName'), selectedPatient.name],
                              [t('admin.pt.dob'), formatPatientDate(selectedPatient.date_of_birth)],
                              [t('admin.pt.gender'), selectedPatient.gender || '—'],
                              [t('admin.pt.phone'), selectedPatient.phone || '—'],
                              [t('admin.pt.email'), selectedPatient.email || '—'],
                              [t('admin.pt.address'), selectedPatient.address || '—'],
                              [t('admin.pt.emergencyContact'), selectedPatient.emergency_contact || '—'],
                            ].map(([label, val]) => (
                              <div key={label as string}><p className="text-muted-foreground text-xs">{label}</p><p className="font-medium">{val || '—'}</p></div>
                            ))}
                          </div>
                          <Button variant="outline" size="sm" className="mt-4" disabled={!allowModals} onClick={() => guard(async () => {
                            const email = prompt(t('admin.pt.editEmail'), selectedPatient.email || '');
                            if (email !== null) {
                              const { error } = await (supabase as any).from('doctor_patients').update({ email }).eq('id', selectedPatient.id);
                              if (error) { toast.error(error.message); return; }
                              toast.success(t('admin.pt.infoUpdated'));
                              refreshData();
                            }
                          })}>{t('admin.pt.editInfo')}</Button>
                        </CardContent>
                      </Card>
                      <Card className="rounded-xl">
                        <CardHeader><CardTitle className="text-base">{t("admin.pt.medicalSummary")}</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            {[t('admin.pt.bloodType'), t('admin.pt.allergies'), t('admin.pt.chronic'), t('admin.pt.medications')].map(label => (
                              <div key={label}><p className="text-muted-foreground text-xs">{label}</p><p className="font-medium">—</p></div>
                            ))}
                          </div>
                          <Button variant="outline" size="sm" className="mt-4" disabled={!allowModals} onClick={() => guard(async () => {
                            const allergies = prompt(t('admin.pt.allergiesPrompt'), selectedPatient.allergies || '');
                            if (allergies !== null) {
                              const { error } = await (supabase as any).from('doctor_patients').update({ allergies }).eq('id', selectedPatient.id);
                              if (error) { toast.error(error.message); return; }
                              toast.success(t('admin.pt.medicalUpdated'));
                              refreshData();
                            }
                          })}>{t('admin.pt.editMedical')}</Button>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="lg:col-span-4 space-y-6">
                      <Card className="rounded-xl">
                        <CardHeader><CardTitle className="text-base">{t("admin.pt.quickStats")}</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          {[
                            [t('admin.pt.totalVisits'), patientAppts.length.toString()],
                            [t('admin.pt.lastVisit'), lastVisitDate],
                            [t('admin.pt.assignedProvider'), selectedPatient.doctor_name || '—'],
                            [t('admin.pt.memberSince'), formatPatientDate(selectedPatient.created_at, 'MMM yyyy')],
                          ].map(([label, val]) => (
                            <div key={label as string} className="flex justify-between text-sm p-2 bg-muted/30 rounded-lg border border-border">
                              <span className="text-muted-foreground">{label}</span><span className="font-medium">{val}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                      <Card className="rounded-xl">
                        <CardHeader><CardTitle className="text-base">{t("admin.pt.insurance")}</CardTitle></CardHeader>
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
                        onCreateInvoice={() => guard(() => toast.info(t('admin.pt.createInvoiceSoon')))}
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
                        <h3 className="text-base font-semibold">{t("admin.pt.appointmentHistory")}</h3>
                        <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(() => navigate('/dashboard/appointments'))}>{t('admin.pt.addAppointment')}</Button>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {['all', 'upcoming', 'completed', 'cancelled'].map(f => (
                          <Button key={f} variant={patientApptFilter === f ? 'default' : 'outline'} size="sm" onClick={() => setPatientApptFilter(f)} className="capitalize">{f}</Button>
                        ))}
                      </div>
                      {filtered.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="font-medium">{t("admin.pt.noAppointments")}</p>
                        </div>
                      ) : (
                        <Card className="rounded-xl overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead><tr className="border-b border-border bg-muted/30">
                                <th className="text-left p-3 font-medium">{t("admin.pt.dateTime")}</th>
                                <th className="text-left p-3 font-medium">{t("admin.pt.provider")}</th>
                                <th className="text-left p-3 font-medium">{t("admin.pt.service")}</th>
                                <th className="text-left p-3 font-medium">{t("admin.pt.status")}</th>
                                <th className="text-left p-3 font-medium">{t("admin.pt.actions")}</th>
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
                                          appointmentId={a.id}
                                          patientId={selectedPatient?.id || null}
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
                        {[[t('admin.pt.total'), patientAppts.length], [t('admin.pt.completed'), completed], [t('admin.pt.cancelled'), cancelled]].map(([label, count]) => (
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
                      <h3 className="text-base font-semibold">{t("admin.pt.billingPayments")}</h3>
                      <Button variant="outline" size="sm" disabled={!allowModals} onClick={() => guard(async () => {
                        const amount = prompt(t('admin.pt.invoiceAmount'));
                        if (!amount) return;
                        const desc = prompt(t('admin.pt.invoiceDesc'), t('admin.pt.medicalServices')) || t('admin.pt.medicalServices');
                        const amountCents = Math.round(parseFloat(amount) * 100);
                        if (isNaN(amountCents) || amountCents <= 0) { toast.error(t('admin.pt.invalidAmount')); return; }
                        const invNum = `INV-${Date.now().toString().slice(-8)}`;
                        const { data: u } = await supabase.auth.getUser();
                        const { error } = await (supabase as any).from('billing_invoices').insert({
                          entity_type: 'practice', entity_id: practice?.id,
                          patient_id: selectedPatient?.user_id || selectedPatient?.id || null,
                          invoice_number: invNum,
                          amount_due_cents: amountCents, amount_paid_cents: 0, amount_remaining_cents: amountCents,
                          currency: 'usd', status: 'pending', description: desc,
                          line_items: [{ description: desc, quantity: 1, unit_amount: amountCents, amount: amountCents }],
                          metadata: { patient_name: selectedPatient?.name || 'Patient', invoice_number: invNum },
                          created_by: u?.user?.id ?? null,
                        });
                        if (error) { toast.error(error.message); return; }
                        toast.success(t('admin.pt.invoiceCreated'));
                      })}>{t('admin.pt.createInvoice')}</Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[[t('admin.pt.totalInvoiced'), money(totalInvoiced, 'USD')], [t('admin.pt.paid'), money(totalPaid, 'USD')], [t('admin.pt.outstanding'), money(totalInvoiced - totalPaid, 'USD')]].map(([label, val]) => (
                        <Card key={label as string} className="rounded-xl"><CardContent className="pt-6 text-center">
                          <div className="text-2xl font-bold">{val}</div><p className="text-sm text-muted-foreground">{label}</p>
                        </CardContent></Card>
                      ))}
                    </div>
                    {patientPayments.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">{t("admin.pt.noBilling")}</p>
                      </div>
                    ) : (
                      <Card className="rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b border-border bg-muted/30">
                              <th className="text-left p-3 font-medium">{t("admin.pt.date")}</th>
                              <th className="text-left p-3 font-medium">{t("admin.pt.description")}</th>
                              <th className="text-left p-3 font-medium">{t("admin.pt.amount")}</th>
                              <th className="text-left p-3 font-medium">Status</th>
                            </tr></thead>
                            <tbody>
                              {patientPayments.map((p: any) => (
                                <tr key={p.id} className="border-b border-border last:border-0">
                                  <td className="p-3">{formatPatientDate(p.created_at || p.date)}</td>
                                  <td className="p-3">{p.description || p.service_name || '—'}</td>
                                  <td className="p-3">{money(Number(p.amount || 0), 'USD')}</td>
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
                      <h3 className="text-base font-semibold">{t("admin.pt.documents")}</h3>
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
                          toast.success(t('admin.pt.documentUploaded'));
                        };
                        input.click();
                      })}>{t('admin.pt.upload')}</Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[t('admin.pt.prescriptions'), t('admin.pt.testResults'), t('admin.pt.other')].map(cat => (
                        <Card key={cat} className="rounded-xl"><CardContent className="pt-6 text-center py-10">
                          <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-sm font-medium">{cat}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t("admin.pt.noDocuments")}</p>
                        </CardContent></Card>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">{t("admin.pt.uploadSoon")}</p>
                  </div>
                )}

                {patientTab === 'notes' && (
                  <div className="space-y-6">
                    <h3 className="text-base font-semibold">{t("admin.pt.internalNotes")}</h3>
                    <p className="text-sm text-muted-foreground">{t("admin.pt.notesPrivate")}</p>
                    <div className="space-y-3">
                      <textarea className="w-full border border-border rounded-lg p-3 text-sm bg-background resize-none" rows={4} placeholder={t("admin.pt.writeNote")} />
                      <Button size="sm" disabled={!allowModals} onClick={() => guard(() => {
                        const textarea = document.querySelector('textarea[placeholder="Write a note…"]') as HTMLTextAreaElement;
                        const text = textarea?.value?.trim();
                        if (!text) { toast.error(t('admin.pt.writeNoteFirst')); return; }
                        toast.success(t('admin.pt.noteSaved'));
                        if (textarea) textarea.value = '';
                      })}>{t('admin.pt.addNote')}</Button>
                    </div>
                    <div className="text-center py-10 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">{t("admin.pt.noNotes")}</p>
                      <p className="text-sm mt-1">{t("admin.pt.notesAppear")}</p>
                    </div>
                  </div>
                )}

                {patientTab === 'activity' && (
                  <div className="space-y-6">
                    <h3 className="text-base font-semibold">{t("admin.pt.activityTimeline")}</h3>
                    {sortedAppts.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">{t("admin.pt.noActivity")}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sortedAppts.slice(0, 20).map((a, i) => (
                          <div key={a.id} className="flex gap-3 items-start">
                            <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${a.status === 'completed' ? 'bg-green-500' : a.status === 'cancelled' ? 'bg-red-400' : 'bg-blue-500'}`} />
                            <div className="min-w-0">
                              <p className="text-sm">{t('admin.pt.appointmentWith')} <span className="font-medium">{a.doctor_name || 'Provider'}</span> — <span className="capitalize">{a.status}</span></p>
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
                  <p className="text-sm text-muted-foreground">{t("admin.pt.totalPatients")}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{patients.filter(p => p.status === "active").length}</div>
                  <p className="text-sm text-muted-foreground">{t("admin.pt.active")}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{new Set(patients.map(p => p.doctor_name)).size}</div>
                  <p className="text-sm text-muted-foreground">{t("admin.pt.assignedProviders")}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {doctors.length > 0 ? (patients.length / doctors.length).toFixed(1) : "0"}
                  </div>
                  <p className="text-sm text-muted-foreground">{t("admin.pt.avgPerProvider")}</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters row */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <div className="relative flex-1">
                <Input
                  placeholder={t("admin.pt.searchPatients")}
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
                <option value="all">{t("admin.pt.allProviders")}</option>
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
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{patient.name}</p>
                              {patient.source === 'facility' && <Badge variant="outline" className="text-[10px]">{t("admin.pt.inClinic")}</Badge>}
                              {patient.source === 'doctor' && <Badge variant="outline" className="text-[10px]">{t("admin.pt.doctorPatient")}</Badge>}
                              {patient.source === 'appointments-only' && <Badge variant="outline" className="text-[10px]">{t("admin.pt.fromBooking")}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{patient.doctor_name || patient.phone || patient.email || '—'}</p>
                          </div>
                          <div className="hidden sm:block text-sm text-muted-foreground whitespace-nowrap">
                            {formatPatientDate(patient.last_visit)}
                          </div>
                          <div className="hidden md:flex flex-col items-end text-xs whitespace-nowrap">
                            <span className="text-green-600 font-semibold">{money(patient.total_paid || 0, ((practice as any)?.currency || 'USD').toUpperCase())}</span>
                            {patient.total_outstanding > 0 && (
                              <span className="text-orange-600">{money(patient.total_outstanding, ((practice as any)?.currency || 'USD').toUpperCase())} {t('admin.pt.due')}</span>
                            )}
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
                  <CardTitle>{t("admin.pt.patientStatistics")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">{t("admin.pt.activePatients")}</span>
                      <Badge variant="secondary">{patients.filter(p => p.status === "active").length}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">{t("admin.pt.inactivePatients")}</span>
                      <Badge variant="secondary">{patients.filter(p => p.status !== "active").length}</Badge>
                    </div>
                    {patients.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">{t("admin.pt.byProvider")}</h4>
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
                  <CardTitle className="text-base">{t("admin.pt.providerAssignment")}</CardTitle>
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
                          <Badge variant="outline">{count as number} {(count as number) !== 1 ? t("admin.pt.patients") : t("admin.pt.patient")}</Badge>
                        </div>
                      )) : (
                        <p className="text-sm text-muted-foreground">{t("admin.pt.noPatientsYet")}</p>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl lg:col-span-4 min-w-0">
                <CardHeader>
                  <CardTitle className="text-base">{t("admin.pt.recentVisits")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {patients.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("admin.pt.noVisitData")}</p>
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
                  <CardTitle className="text-base">{t("admin.pt.statusSegmentation")}</CardTitle>
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
                        <p className="text-sm text-muted-foreground">{t("admin.pt.noPatientData")}</p>
                      );
                    })()}
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="text-sm font-medium">{t("admin.pt.patientsPerProvider")}</span>
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
        const practiceCurrency = (practice as any)?.currency || 'USD';
        const fmtCents = (cents: number, srcCurrency?: string) =>
          moneyCents(Number(cents || 0), (srcCurrency || practiceCurrency).toUpperCase());

        const billingTabs: { key: typeof billingTab; label: string }[] = [
          { key: 'overview', label: t("admin.bl.overview") },
          { key: 'invoices', label: t("admin.bl.invoices") },
          { key: 'transactions', label: t("admin.bl.transactions") },
          { key: 'insurance', label: t("admin.bl.superbills") },
          { key: 'doctorPayments', label: t("admin.bl.doctorPayments") },
          { key: 'settings', label: t("admin.bl.settings") },
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
                  {/* Practice-wide billing bar (same as doctor dashboard) */}
                  <div className="mb-6">
                    <AppointmentFinancePanel
                      appointmentId=""
                      patientName=""
                      showActions={false}
                      allowPayments
                      onPaymentRecorded={() => { void practiceBilling.refresh(); }}
                      overrideData={practiceBilling.financeData}
                      chargesLabel={t("admin.bl.transactions")}
                      emptyChargesLabel={t("admin.bl.noTransactions")}
                      nameMap={practiceBilling.nameMap}



                    />
                  </div>

                  <PracticePatientBalances
                    rows={practiceBilling.rows}
                    doctors={practiceBilling.doctors}
                    loading={practiceBilling.loading}
                  />

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
                        <p className="text-sm text-muted-foreground">{t("admin.bl.transactions")}</p>
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
                            const fmt = (cents: number) => fmtCents(cents);
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
                              const fmt = fmtCents(tx.amount_cents || 0, tx.currency);
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
                      <CardHeader><CardTitle className="text-base">{t("admin.bl.byPaymentMethod")}</CardTitle></CardHeader>
                      <CardContent>
                        {Object.keys(byMethod).length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t("admin.bl.noDataAvailable")}</p>
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(byMethod).map(([method, data]) => (
                              <div key={method} className="flex items-center justify-between">
                                <span className="text-sm font-medium">{method}</span>
                                <div className="text-right">
                                  <span className="text-sm text-muted-foreground">{data.count} {t("admin.bl.tx")}</span>
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
                      <CardHeader><CardTitle className="text-base">{t("admin.bl.byStatus")}</CardTitle></CardHeader>
                      <CardContent>
                        {Object.keys(byStatus).length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t("admin.bl.noDataAvailable")}</p>
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
                      <CardHeader><CardTitle className="text-base">{t("admin.bl.periodSummary")}</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">{t("admin.bl.avgTransaction")}</span>
                            <span className="font-semibold text-sm">
                              {bTxs.length > 0 ? fmtCents((bData?.summary?.totalRevenueCents ?? 0) / (bData?.summary?.transactionCount || 1)) : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">{t("admin.bl.highestTx")}</span>
                            <span className="font-semibold text-sm">
                              {bTxs.length > 0 ? fmtCents(Math.max(...bTxs.map((tx: any) => Number(tx.amount_cents || 0)))) : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">{t("admin.bl.period")}</span>
                            <span className="text-sm">
                              {(() => { try { return `${format(new Date(bData?.period?.from), 'MMM dd')} → ${format(new Date(bData?.period?.to), 'MMM dd')}`; } catch { return '—'; } })()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">{t("admin.bl.completionRate")}</span>
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
                    <h3 className="text-lg font-semibold">{t("admin.bl.invoices")}</h3>
                    <Button variant="outline" disabled={!allowModals} onClick={() => guard(async () => {
                      const patientName = prompt(t("admin.bl.patientNamePrompt"));
                      if (!patientName) return;
                      const amount = prompt(t("admin.bl.amountPrompt"));
                      if (!amount) return;
                      const desc = prompt(t("admin.bl.descPrompt"), t("admin.bl.medicalServices")) || t("admin.bl.medicalServices");
                      const amountCents = Math.round(parseFloat(amount) * 100);
                      if (isNaN(amountCents) || amountCents <= 0) { toast.error(t("admin.bl.invalidAmount")); return; }
                      const matched: any = patients.find((p: any) => (p.name || '').toLowerCase() === patientName.toLowerCase());
                      const invNum = `INV-${Date.now().toString().slice(-8)}`;
                      const { data: u } = await supabase.auth.getUser();
                      const { error } = await (supabase as any).from('billing_invoices').insert({
                        entity_type: 'practice', entity_id: practice?.id,
                        patient_id: matched?.user_id || matched?.id || null,
                        invoice_number: invNum,
                        amount_due_cents: amountCents, amount_paid_cents: 0, amount_remaining_cents: amountCents,
                        currency: 'usd', status: 'pending', description: desc,
                        line_items: [{ description: desc, quantity: 1, unit_amount: amountCents, amount: amountCents }],
                        metadata: { patient_name: patientName, invoice_number: invNum },
                        created_by: u?.user?.id ?? null,
                      });
                      if (error) { toast.error(error.message); return; }
                      toast.success(t("admin.bl.invoiceCreated"));
                      billing.refetch();
                    })}>
                      <FileText className="h-4 w-4 mr-2" />{t("admin.bl.createInvoice")}
                    </Button>
                  </div>

                  {/* Filters */}
                  <div className="flex items-center gap-3 flex-wrap mb-4">
                    <Input
                      placeholder={t("admin.bl.searchByPatient")}
                      value={invoiceSearch}
                      onChange={e => setInvoiceSearch(e.target.value)}
                      className="max-w-xs"
                    />
                    {(['all', 'paid', 'pending', 'overdue', 'refunded'] as const).map(s => (
                      <Button
                        key={s}
                        variant={invoiceStatusFilter === s ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInvoiceStatusFilter(s)}
                      >
                        {t(`admin.bl.status.${s}`)}
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
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.bl.invoiceNumber")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.bl.patient")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.bl.date")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.bl.amount")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.bl.statusCol")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.bl.actionsCol")}</th>
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
                                        <Button size="sm" variant="ghost" onClick={() => guard(() => toast.success(t("admin.bl.invoiceEmailQueued")))}>
                                          <Mail className="h-3 w-3" />
                                        </Button>
                                        {(() => {
                                          const invId = tx?.invoice_id || tx?.metadata?.invoice_id || (tx?.source === 'billing_invoices' ? tx.id : null);
                                          if (!invId) return null;
                                          return (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              title="Download invoice PDF"
                                              onClick={() => guard(async () => {
                                                try {
                                                  const { downloadInvoicePdf } = await import('@/lib/api/invoice-api');
                                                  await downloadInvoicePdf(invId, `invoice-${String(invId).slice(0, 8)}`);
                                                } catch (e: any) {
                                                  toast.error(e?.message || 'Failed to download invoice');
                                                }
                                              })}
                                            >
                                              <FileText className="h-3 w-3" />
                                            </Button>
                                          );
                                        })()}
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
                                              appointmentId={(tx as any)?.appointment_id || null}
                                              patientId={p?.id || (tx as any)?.patient_id || null}
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
                      <p className="text-sm text-muted-foreground">{t("admin.bl.totalInvoices")}</p>
                      <p className="text-xl font-bold">{filteredInvoices.length}</p>
                    </CardContent></Card>
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">{t("admin.bl.totalAmount")}</p>
                      <p className="text-xl font-bold">{fmtCents(filteredInvoices.reduce((s: number, tx: any) => s + Number(tx.amount_cents || 0), 0))}</p>
                    </CardContent></Card>
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">{t("admin.bl.outstanding")}</p>
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
                    <h3 className="text-lg font-semibold">{t("admin.bl.allTransactions")}</h3>
                    <Button variant="outline" disabled={!allowModals} onClick={() => guard(() => (() => {
                        downloadCSV('export.csv', ['Date', 'Type', 'Amount', 'Description'],
                          financeEntries.map(e => [e.date || '', e.type || '', String(e.amount || 0), e.description || '']));
                      })())}>
                      {t("admin.bl.exportCsv")}
                    </Button>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">{t("admin.bl.totalIncome")}</p>
                      <p className="text-xl font-bold text-green-600">{fmtCents(completedSum)}</p>
                    </CardContent></Card>
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">{t("admin.bl.totalRefunds")}</p>
                      <p className="text-xl font-bold text-red-600">{fmtCents(refundedSum)}</p>
                    </CardContent></Card>
                    <Card className="rounded-xl"><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">{t("admin.bl.netRevenue")}</p>
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
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.bl.date")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.bl.patient")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.bl.amount")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.bl.method")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.bl.statusCol")}</th>
                                <th className="pb-2 font-medium text-muted-foreground">{t("admin.bl.reference")}</th>
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{t("admin.bl.billingDocumentation")}</h3>
                  </div>
                  <SuperbillsManager
                    practiceId={practice?.id || null}
                    patients={(patients || []).map((p: any) => ({ id: p.id || p.user_id, name: p.name || p.full_name }))}
                  />
                </>
                );
              })()}

              {/* ========== TAB: DOCTOR PAYMENTS ========== */}
              {billingTab === 'doctorPayments' && practice?.id && (
                <DoctorSettlementsPanel entityType={'practice' as any} entityId={practice.id} />
              )}

              {/* ========== TAB: SETTINGS ========== */}
              {billingTab === 'settings' && (
                <>
                  {/* Billing Settings */}
                  <Card className="rounded-xl mb-6">
                    <CardHeader><CardTitle className="text-base">{t("admin.bl.billingSettings")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2 border-b border-border/50">
                          <span className="text-sm font-medium">{t("admin.bl.defaultCurrency")}</span>
                          <Badge variant="outline">USD</Badge>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-border/50">
                          <span className="text-sm font-medium">{t("admin.bl.taxVat")}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">0%</span>
                            <Button size="sm" variant="ghost" onClick={() => guard(async () => {
                              const rate = prompt(t("admin.bl.taxRatePrompt"), '0');
                              if (rate !== null) { await saveEntitySettings('billing_prefs', { ...(entitySettings.settings as any)?.payload?.billing_prefs || {}, tax_rate: parseFloat(rate) || 0 }); }
                            })}>{t("admin.bl.edit")}</Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-border/50">
                          <span className="text-sm font-medium">{t("admin.bl.autoSendReceipt")}</span>
                          <div className="w-10 h-5 rounded-full bg-muted relative cursor-pointer">
                            <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-muted-foreground transition-all" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-border/50">
                          <span className="text-sm font-medium">{t("admin.bl.invoiceLogo")}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{t("admin.bl.useClinicLogo")}</span>
                            <Button size="sm" variant="ghost" onClick={() => guard(() => { setSettingsTab('branding'); setActiveSection('settings'); })}>{t("admin.bl.change")}</Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium">{t("admin.bl.paymentTerms")}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{t("admin.bl.dueOnReceipt")}</span>
                            <Button size="sm" variant="ghost" onClick={() => guard(async () => {
                              const terms = prompt(t("admin.bl.paymentTermsPrompt"), t("admin.bl.dueWithin30"));
                              if (terms !== null) { await saveEntitySettings('billing_prefs', { ...(entitySettings.settings as any)?.payload?.billing_prefs || {}, terms }); }
                            })}>{t("admin.bl.edit")}</Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Invoice Template */}
                  <Card className="rounded-xl mb-6">
                    <CardHeader><CardTitle className="text-base">{t("admin.bl.invoiceTemplate")}</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{t("admin.bl.invoiceTemplateDesc")}</p>
                      <div className="border-2 border-dashed border-border rounded-xl h-[200px] flex items-center justify-center text-muted-foreground">
                        <p>{t("admin.bl.invoicePreview")}</p>
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
                        {t("admin.bl.customizeTemplate")}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Accepted Payment Methods */}
                  <Card className="rounded-xl">
                    <CardHeader><CardTitle className="text-base">{t("admin.bl.acceptedPaymentMethods")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { key: 'cash', icon: DollarSign },
                          { key: 'credit', icon: CreditCard },
                          { key: 'debit', icon: CreditCard },
                          { key: 'insurance', icon: FileText },
                          { key: 'bank', icon: Building2 },
                          { key: 'online', icon: CreditCard },
                        ].map(({ key, icon: Icon }) => (
                          <div key={key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{t(`admin.bl.payMethod.${key}`)}</span>
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
                        {t("admin.bl.save")}
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
          { key: 'overview' as const, label: t('admin.fi.overview') },
          { key: 'ledger' as const, label: t('admin.fi.ledger') },
          { key: 'compensation' as const, label: t('admin.fi.compensation') },
          { key: 'recurring' as const, label: t('admin.fi.recurring') },
          { key: 'categories' as const, label: t('admin.fi.categories') },
          { key: 'export' as const, label: t('admin.fi.export') },
        ];

        const catColors = ['hsl(var(--primary))', 'hsl(142 71% 45%)', 'hsl(38 92% 50%)', 'hsl(280 68% 60%)', 'hsl(0 84% 60%)'];

        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className={sectionShellClass}>
              {/* Header */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-xl font-semibold">{t("admin.fi.title")}</h2>
                <Button variant="outline" disabled={!allowModals} onClick={() => guard(() => (() => {
                        downloadCSV('export.csv', ['Date', 'Type', 'Amount', 'Description'],
                          financeEntries.map(e => [e.date || '', e.type || '', String(e.amount || 0), e.description || '']));
                      })())}>
                  <Download className="h-4 w-4 mr-2" /> {t("admin.fi.exportCsv")}
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
                    <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{t("admin.fi.income")}</p><p className="text-2xl font-bold text-foreground">{money(finIncome, ((practice as any)?.currency || 'USD').toUpperCase())}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{t("admin.fi.expenses")}</p><p className="text-2xl font-bold text-destructive">{money(finExpenses, ((practice as any)?.currency || 'USD').toUpperCase())}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{t("admin.fi.net")}</p><p className={`text-2xl font-bold ${finNet >= 0 ? 'text-foreground' : 'text-destructive'}`}>{money(finNet, ((practice as any)?.currency || 'USD').toUpperCase())}</p></CardContent></Card>
                    <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{t("admin.fi.entries")}</p><p className="text-2xl font-bold text-foreground">{financeEntries.length}</p></CardContent></Card>
                  </div>

                  {/* Chart */}
                  <Card className="mb-6">
                    <CardHeader><CardTitle>{t("admin.fi.incomeVsExpenses")}</CardTitle></CardHeader>
                    <CardContent>
                      {monthlyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                          <AreaChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="income" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.2} name={t("admin.fi.income")} />
                            <Area type="monotone" dataKey="expense" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.2} name={t("admin.fi.expenses")} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
                          <p>{t("admin.fi.noEntriesChart")}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Two-column row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader><CardTitle>{t("admin.fi.expenseByCategory")}</CardTitle></CardHeader>
                      <CardContent>
                        {expenseByCategory.length > 0 ? expenseByCategory.map((cat, i) => (
                          <div key={cat.name} className="flex items-center gap-3 mb-3">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: catColors[i % catColors.length] }} />
                            <span className="text-sm flex-1">{cat.name}</span>
                            <span className="text-sm font-medium">{money(cat.total, ((practice as any)?.currency || 'USD').toUpperCase())}</span>
                            <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${finExpenses > 0 ? (cat.total / finExpenses * 100) : 0}%`, backgroundColor: catColors[i % catColors.length] }} />
                            </div>
                          </div>
                        )) : (
                          <p className="text-sm text-muted-foreground text-center py-6">{t("admin.fi.noExpenseEntries")}</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardTitle>{t("admin.fi.recentEntries")}</CardTitle></CardHeader>
                      <CardContent>
                        {recentEntries.length > 0 ? recentEntries.map(e => {
                          let dateStr = '';
                          try { dateStr = format(new Date(e.date || e.created_at), 'MMM dd'); } catch { dateStr = '—'; }
                          return (
                            <div key={e.id} className="flex items-center gap-2 mb-2 text-sm">
                              <span className="text-muted-foreground w-14 flex-shrink-0">{dateStr}</span>
                              <Badge variant={e.type === 'income' ? 'default' : e.type === 'payroll' ? 'secondary' : 'destructive'} className="text-xs">{e.type}</Badge>
                              <span className="flex-1 truncate">{e.category || '—'}</span>
                              <span className="font-medium">{money(e.amount || 0, (e.currency || (practice as any)?.currency || 'USD').toUpperCase())}</span>
                            </div>
                          );
                        }) : (
                          <p className="text-sm text-muted-foreground text-center py-6">{t("admin.fi.noEntries")}</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* ===== LEDGER TAB ===== */}
              {financeTab === 'ledger' && practice?.id && (
                <FinanceLedgerPanel entityType="practice" entityId={practice.id} />
              )}

              {/* ===== COMPENSATION TAB ===== */}
              {financeTab === 'compensation' && practice?.id && (
                <CompensationProfilesPanel entityType="practice" entityId={practice.id} />
              )}

              {/* ===== RECURRING TAB ===== */}
              {financeTab === 'recurring' && practice?.id && (
                <RecurringRulesPanel entityType="practice" entityId={practice.id} />
              )}


              {/* ===== CATEGORIES TAB ===== */}
              {financeTab === 'categories' && (
                <>
                  <Card className="mb-6">
                    <CardHeader><CardTitle>{t("admin.fi.createCategory")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3 items-end mb-3">
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-xs text-muted-foreground">{t("admin.fi.name")}</label>
                          <Input placeholder={t("admin.fi.categoryPlaceholder")} value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">{t("admin.fi.color")}</label>
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
                            toast.success(t('admin.fi.categoryAdded'));
                          }
                        })}>{t('admin.fi.add')}</Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{t("admin.fi.categoryTip")}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{t("admin.fi.yourCategories")}</span>
                        <Button size="sm" variant="ghost" onClick={() => toast.info(t('admin.fi.refreshed'))}>{t('admin.fi.refresh')}</Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {financeCategories.length > 0 ? financeCategories.map((cat, i) => {
                        const count = financeEntries.filter(e => e.category === cat).length;
                        return (
                          <div key={cat} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: catColors[i % catColors.length] }} />
                            <span className="flex-1 text-sm font-medium">{cat}</span>
                            <Badge variant="secondary">{count} {t("admin.fi.entriesCount")}</Badge>
                            {count === 0 && (
                              <Button size="icon" variant="ghost" disabled={!allowModals} onClick={() => guard(async () => {
                               if (!confirm(t('admin.fi.confirmDeleteCat'))) return;
                               const catObj = financeCategoriesHook.categories.find((c: any) => c.name === cat);
                               if (catObj) {
                                 const { error } = await (supabase as any).from('finance_categories').delete().eq('id', (catObj as any).id);
                                 if (error) { toast.error(error.message); return; }
                               }
                               toast.success(t('admin.fi.categoryDeleted'));
                               financeCategoriesHook.refresh();
                             })}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      }) : (
                        <p className="text-sm text-muted-foreground text-center py-8">{t("admin.fi.noCategoriesYet")}</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ===== EXPORT TAB ===== */}
              {financeTab === 'export' && (
                <>
                  <Card className="mb-6">
                    <CardHeader><CardTitle>{t("admin.fi.exportEntries")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <Input type="date" />
                        <Input type="date" />
                        <select className="border border-border rounded-md px-3 py-1 text-sm bg-background">
                          <option>All</option><option>Income</option><option>Expense</option><option>Payroll</option>
                        </select>
                        <select className="border border-border rounded-md px-3 py-1 text-sm bg-background">
                          <option>{t("admin.fi.allCategories")}</option>
                          {financeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <Button disabled={!allowModals} onClick={() => guard(() => (() => {
                        downloadCSV('export.csv', ['Date', 'Type', 'Amount', 'Description'],
                          financeEntries.map(e => [e.date || '', e.type || '', String(e.amount || 0), e.description || '']));
                      })())}>
                        <Download className="h-4 w-4 mr-2" /> Export CSV
                      </Button>
                      <p className="text-xs text-muted-foreground mt-3">{t("admin.fi.exportTip")}</p>
                    </CardContent>
                  </Card>

                  <Card className="mb-6">
                    <CardHeader><CardTitle>{t("admin.fi.exportRecurring")}</CardTitle></CardHeader>
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
                      <p className="text-xs text-muted-foreground mt-3">{t("admin.fi.exportRecurringTip")}</p>
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

      case "inventory":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <div className={sectionShellClass}>
              {practice?.id ? (
                <ClinicInventoryManager
                  entityId={practice.id}
                  canCreate
                  canDelete
                />
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">{t("admin.inventory.noPractice", { defaultValue: "No practice linked" })}</p>
                </div>
              )}
            </div>
          </SectionWrapper>
        );

      case "rooms":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <RoomBedManager
              practiceId={practice?.id ?? ""}
              userId={user?.id ?? ""}
              role="admin"
            />
          </SectionWrapper>
        );

      case "queueDisplays":
        return (
          <SectionWrapper locked={!isVerified} onRequestVerify={() => setCreateClinicOpen(true)}>
            <QueueDisplaySettings practiceId={practice?.id ?? ""} userId={user?.id ?? ""} />
          </SectionWrapper>
        );

      case "analytics": {
        const analyticsTabs = [
          { key: 'overview' as const, label: t("admin.an.tabs.overview") },
          { key: 'appointments' as const, label: t("admin.an.tabs.appointments") },
          { key: 'providers' as const, label: t("admin.an.tabs.providers") },
          { key: 'patients' as const, label: t("admin.an.tabs.patients") },
          { key: 'financial' as const, label: t("admin.an.tabs.financial") },
          { key: 'services' as const, label: t("admin.an.tabs.services") },
          { key: 'reports' as const, label: t("admin.an.tabs.reports") },
        ];

        const normStatus = (s: any) => {
          const v = String(s || '').toLowerCase();
          if (v === 'cancelled' || v === 'canceled') return 'cancelled';
          if (v === 'no_show' || v === 'no-show' || v === 'noshow') return 'no_show';
          return v;
        };
        const completedAppts = appointments.filter((a: any) => normStatus(a.status) === 'completed').length;
        const cancelledAppts = appointments.filter((a: any) => normStatus(a.status) === 'cancelled').length;
        const noShowAppts = appointments.filter((a: any) => normStatus(a.status) === 'no_show').length;

        const apptsByMonth: Record<string, number> = {};
        try { appointments.forEach((a: any) => { const m = (a.appointment_date || a.created_at || '').slice(0, 7); if (m) apptsByMonth[m] = (apptsByMonth[m] || 0) + 1; }); } catch {}
        const apptMonthData = Object.entries(apptsByMonth).sort(([a],[b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));

        const statusBreakdown: Record<string, number> = {};
        appointments.forEach((a: any) => { const s = normStatus(a.status) || 'unknown'; statusBreakdown[s] = (statusBreakdown[s] || 0) + 1; });
        const statusColors: Record<string, string> = { completed: 'bg-green-500', pending: 'bg-yellow-500', confirmed: 'bg-blue-500', cancelled: 'bg-destructive', no_show: 'bg-orange-500' };

        const hourBuckets: number[] = new Array(24).fill(0);
        try { appointments.forEach((a: any) => { if (a.start_time) { const h = parseInt(a.start_time.split(':')[0], 10); if (!isNaN(h) && h >= 0 && h < 24) hourBuckets[h]++; } }); } catch {}

        const cancellationByMonth: Record<string, { total: number; cancelled: number }> = {};
        try { appointments.forEach((a: any) => { const m = (a.appointment_date || a.created_at || '').slice(0, 7); if (m) { if (!cancellationByMonth[m]) cancellationByMonth[m] = { total: 0, cancelled: 0 }; cancellationByMonth[m].total++; const ns = normStatus(a.status); if (ns === 'cancelled' || ns === 'no_show') cancellationByMonth[m].cancelled++; } }); } catch {}
        const cancellationRateData = Object.entries(cancellationByMonth).sort(([a],[b]) => a.localeCompare(b)).map(([date, d]) => ({ date, rate: d.total > 0 ? Math.round(d.cancelled / d.total * 100) : 0 }));

        const bookingSources: Record<string, number> = {};
        appointments.forEach((a: any) => { const src = String(a.appointment_type || 'unspecified').replace(/_/g, ' '); bookingSources[src] = (bookingSources[src] || 0) + 1; });

        const providerStats = doctors.map((d: any) => {
          const pAppts = appointments.filter((a: any) => a.doctor_id === d.id || a.doctor_name === d.name);
          const comp = pAppts.filter((a: any) => normStatus(a.status) === 'completed').length;
          const canc = pAppts.filter((a: any) => normStatus(a.status) === 'cancelled').length;
          const uPatients = new Set(pAppts.map((a: any) => a.patient_id || a.patient_name)).size;
          return { name: d.name || d.full_name || 'Unknown', specialty: d.specialty || '—', total: pAppts.length, completed: comp, cancelled: canc, completionRate: pAppts.length > 0 ? Math.round(comp / pAppts.length * 100) : 0, cancellationRate: pAppts.length > 0 ? Math.round(canc / pAppts.length * 100) : 0, uniquePatients: uPatients, rating: d.rating || d.average_rating || '—' };
        }).sort((a, b) => b.total - a.total);
        const maxProvAppts = Math.max(...providerStats.map(p => p.total), 1);

        // Build real last-visit map from appointments (most accurate source).
        const lastVisitByPatient: Record<string, string> = {};
        appointments.forEach((a: any) => {
          const key = a.patient_id || a.patient_name;
          if (!key) return;
          const d = a.appointment_date || a.created_at || '';
          if (d && (!lastVisitByPatient[key] || d > lastVisitByPatient[key])) lastVisitByPatient[key] = d;
        });
        const patientLastVisit = (p: any): string => {
          const byId = p.id && lastVisitByPatient[p.id];
          const byUserId = p.user_id && lastVisitByPatient[p.user_id];
          const byName = (p.full_name || p.name) && lastVisitByPatient[p.full_name || p.name];
          return byId || byUserId || byName || p.last_visit || '';
        };

        const now90 = new Date(); now90.setDate(now90.getDate() - 90);
        let activePatients = 0; let inactivePatientsCount = 0;
        try { patients.forEach((p: any) => { const lv = patientLastVisit(p); if (lv && new Date(lv) >= now90) activePatients++; else inactivePatientsCount++; }); } catch { inactivePatientsCount = patients.length; }
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

        const inactivePatientsList = (() => { try { return patients.filter((p: any) => { const lv = patientLastVisit(p); return !lv || new Date(lv) < now90; }).map((p: any) => ({ ...p, last_visit: patientLastVisit(p) || p.last_visit })).slice(0, 10); } catch { return []; } })();
        const totalInactive = (() => { try { return patients.filter((p: any) => { const lv = patientLastVisit(p); return !lv || new Date(lv) < now90; }).length; } catch { return 0; } })();

        const patientVisitCounts: Record<string, { name: string; provider: string; count: number; lastVisit: string }> = {};
        appointments.forEach((a: any) => { const key = a.patient_id || a.patient_name || 'Unknown'; if (!patientVisitCounts[key]) patientVisitCounts[key] = { name: a.patient_name || key, provider: a.doctor_name || '—', count: 0, lastVisit: '' }; patientVisitCounts[key].count++; const d = a.appointment_date || a.created_at || ''; if (d > patientVisitCounts[key].lastVisit) patientVisitCounts[key].lastVisit = d; });
        const topPatients = Object.values(patientVisitCounts).sort((a, b) => b.count - a.count).slice(0, 10);

        const billingData: any = billing.data || {};
        const billingTxList: any[] = billingData?.transactions || [];
        const paymentsList: any[] = (payments as any[]) || [];
        const isPaid = (s: any) => { const v = String(s || '').toLowerCase(); return v === 'paid' || v === 'succeeded' || v === 'completed'; };
        const isPending = (s: any) => { const v = String(s || '').toLowerCase(); return v === 'pending' || v === 'unpaid' || v === 'processing'; };
        const isRefund = (s: any) => { const v = String(s || '').toLowerCase(); return v === 'refunded' || v === 'refund'; };
        const txCents = (t: any) => {
          const c = Number(t.amount_cents ?? Math.round(Number(t.amount || 0) * 100));
          return Number.isFinite(c) ? c : 0;
        };

        // Unified source: prefer payments rows, fall back to billing edge function summary.
        const useLivePayments = paymentsList.length > 0;
        const totalRevCents = useLivePayments
          ? paymentsList.filter(p => isPaid(p.status)).reduce((s, p) => s + txCents(p), 0)
          : (billingData?.summary?.totalRevenueCents ?? 0);
        const pendingCents = useLivePayments
          ? paymentsList.filter(p => isPending(p.status)).reduce((s, p) => s + txCents(p), 0)
          : (billingData?.summary?.pendingCents ?? 0);
        const refundCents = useLivePayments
          ? paymentsList.filter(p => isRefund(p.status)).reduce((s, p) => s + txCents(p), 0)
          : (billingData?.summary?.refundCents ?? 0);
        const txCount = useLivePayments
          ? paymentsList.filter(p => isPaid(p.status)).length
          : (billingData?.summary?.transactionCount ?? 0);
        const txList: any[] = useLivePayments ? paymentsList : billingTxList;

        const revByMonth: Record<string, number> = {};
        try { txList.forEach((tx: any) => { if (!isPaid(tx.status)) return; const m = (tx.created_at || '').slice(0, 7); if (m) revByMonth[m] = (revByMonth[m] || 0) + (txCents(tx) / 100); }); } catch {}
        const revTrendData = Object.entries(revByMonth).sort(([a],[b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }));

        const payMethodBreakdown: Record<string, { count: number; total: number }> = {};
        txList.forEach((tx: any) => { const m = String(tx.payment_method || tx.provider || tx.method || 'Unknown'); if (!payMethodBreakdown[m]) payMethodBreakdown[m] = { count: 0, total: 0 }; payMethodBreakdown[m].count++; payMethodBreakdown[m].total += txCents(tx) / 100; });

        // Revenue by provider: join paid txs → appointment → doctor.
        const apptById: Record<string, any> = {};
        appointments.forEach((a: any) => { if (a.id) apptById[a.id] = a; });
        const revByDoctor: Record<string, { name: string; total: number; count: number }> = {};
        txList.forEach((tx: any) => {
          if (!isPaid(tx.status)) return;
          const appt = tx.appointment_id ? apptById[tx.appointment_id] : null;
          if (!appt) return;
          const key = appt.doctor_id || appt.doctor_name || 'unknown';
          const name = appt.doctor_name || (doctors.find((d: any) => d.id === appt.doctor_id) as any)?.name || 'Unknown';
          if (!revByDoctor[key]) revByDoctor[key] = { name, total: 0, count: 0 };
          revByDoctor[key].total += txCents(tx) / 100;
          revByDoctor[key].count++;
        });
        const revByDoctorList = Object.values(revByDoctor).sort((a, b) => b.total - a.total);
        const maxDoctorRev = Math.max(...revByDoctorList.map(d => d.total), 1);

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
                          </div>
                        ); })() : <p className="text-sm text-muted-foreground">{t("adminAnalytics.noData")}</p>}
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="rounded-xl mt-6">
                    <CardHeader><CardTitle className="flex items-center justify-between"><span>{t("admin.an.advancedFinancialMetrics")}</span><Button variant="outline" size="sm" onClick={() => guard(() => refreshAdvancedMetrics())}>{t("adminBilling.refresh")}</Button></CardTitle></CardHeader>
                    <CardContent><AdvancedFinancialMetrics metrics={advancedMetrics} revenue={0} onUpdateInputs={() => {}} /></CardContent>
                  </Card>
                </>
              )}

              {analyticsTab === 'appointments' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[{ label: t("admin.an.total"), value: appointments.length }, { label: t("admin.an.completed"), value: completedAppts }, { label: t("admin.an.cancelled"), value: cancelledAppts }, { label: t("admin.an.noShow"), value: noShowAppts }].map((kpi, i) => (
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
                      <CardHeader><CardTitle>{t("admin.an.appointmentType")}</CardTitle></CardHeader>
                      <CardContent>
                        {Object.keys(bookingSources).length > 0 ? (
                          <div className="space-y-3">{Object.entries(bookingSources).sort(([,a],[,b]) => b - a).map(([src, count]) => (<div key={src}><div className="flex justify-between text-sm mb-1"><span className="capitalize">{src}</span><span className="font-medium">{count}</span></div><Progress value={appointments.length > 0 ? (count / appointments.length) * 100 : 0} className="h-2" /></div>))}</div>
                        ) : <p className="text-sm text-muted-foreground">{t("admin.an.noAppointmentData")}</p>}
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="rounded-xl mt-4">
                    <CardHeader><CardTitle>{t("admin.an.statusBreakdown")}</CardTitle></CardHeader>
                    <CardContent>
                      {Object.keys(statusBreakdown).length > 0 ? (
                        <div className="space-y-3">{Object.entries(statusBreakdown).sort(([,a],[,b]) => b - a).map(([status, count]) => (<div key={status}><div className="flex justify-between text-sm mb-1"><span className="capitalize">{status.replace('_', ' ')}</span><span className="font-medium">{count} ({appointments.length > 0 ? Math.round(count / appointments.length * 100) : 0}%)</span></div><div className="h-2 rounded-full bg-secondary overflow-hidden"><div className={`h-full rounded-full ${statusColors[status] || 'bg-primary'}`} style={{ width: `${appointments.length > 0 ? (count / appointments.length) * 100 : 0}%` }} /></div></div>))}</div>
                      ) : <p className="text-sm text-muted-foreground">{t("admin.an.noAppointmentData")}</p>}
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl mt-4">
                    <CardHeader><CardTitle>{t("admin.an.busiestHours")}</CardTitle></CardHeader>
                    <CardContent>
                      {hourBuckets.some(v => v > 0) ? (
                        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">{hourBuckets.map((count, h) => { const bg = count === 0 ? 'bg-muted/20' : count <= 2 ? 'bg-primary/20' : count <= 5 ? 'bg-primary/40' : 'bg-primary/70'; const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`; return <div key={h} className={`${bg} rounded-md p-2 text-center text-xs`}><div className="font-medium">{label}</div><div>{count}</div></div>; })}</div>
                      ) : <p className="text-sm text-muted-foreground">{t("admin.an.noHourData")}</p>}
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl mt-4">
                    <CardHeader><CardTitle>{t("admin.an.cancelNoShowRate")}</CardTitle></CardHeader>
                    <CardContent>
                      {cancellationRateData.length > 1 ? (
                        <div className="h-52"><ResponsiveContainer width="100%" height="100%"><AreaChart data={cancellationRateData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis unit="%" /><Tooltip /><Area type="monotone" dataKey="rate" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} /></AreaChart></ResponsiveContainer></div>
                      ) : <p className="text-sm text-muted-foreground">{t("admin.an.insufficientData")}</p>}
                    </CardContent>
                  </Card>
                </>
              )}

              {analyticsTab === 'providers' && (
                <>
                  <Card className="rounded-xl mb-4">
                    <CardHeader><CardTitle>{t("admin.an.providerPerformance")}</CardTitle></CardHeader>
                    <CardContent>
                      {providerStats.length > 0 ? (
                        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2 font-medium">{t("admin.an.provider")}</th><th className="pb-2 font-medium">{t("admin.an.specialty")}</th><th className="pb-2 font-medium">{t("admin.an.total")}</th><th className="pb-2 font-medium">{t("admin.an.completedCol")}</th><th className="pb-2 font-medium">{t("admin.an.patientsCol")}</th><th className="pb-2 font-medium">{t("admin.an.completion")}</th><th className="pb-2 font-medium">{t("admin.an.cancelPct")}</th><th className="pb-2 font-medium">{t("admin.an.rating")}</th></tr></thead><tbody>{providerStats.map((p, i) => (<tr key={i} className="border-b last:border-0"><td className="py-2 font-medium">{p.name}</td><td className="py-2 text-muted-foreground">{p.specialty}</td><td className="py-2">{p.total}</td><td className="py-2">{p.completed}</td><td className="py-2">{p.uniquePatients}</td><td className="py-2"><Badge variant="secondary" className="bg-green-100 text-green-800">{p.completionRate}%</Badge></td><td className="py-2"><Badge variant="secondary" className="bg-red-100 text-red-800">{p.cancellationRate}%</Badge></td><td className="py-2">{p.rating}</td></tr>))}</tbody></table></div>
                      ) : <div className="text-center py-8 text-muted-foreground"><Stethoscope className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>{t("admin.an.noProviderData")}</p></div>}
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>{t("admin.an.utilization")}</CardTitle></CardHeader>
                      <CardContent>
                        {providerStats.length > 0 ? (
                          <div className="space-y-3">{providerStats.map((p, i) => { const util = Math.round((p.total / maxProvAppts) * 100); const barColor = util < 30 ? 'bg-destructive' : util < 70 ? 'bg-yellow-500' : 'bg-green-500'; return (<div key={i}><div className="flex justify-between text-sm mb-1"><span>{p.name}</span><span className="font-medium">{util}%</span></div><div className="h-2 rounded-full bg-secondary overflow-hidden"><div className={`h-full rounded-full ${barColor}`} style={{ width: `${util}%` }} /></div></div>); })}</div>
                        ) : <p className="text-sm text-muted-foreground">{t("admin.an.noData")}</p>}
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>{t("admin.an.topByVolume")}</CardTitle></CardHeader>
                      <CardContent>
                        {providerStats.length > 0 ? (
                          <div className="space-y-3">{providerStats.slice(0, 5).map((p, i) => (<div key={i} className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div><div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{p.name}</p><p className="text-xs text-muted-foreground">{p.specialty}</p></div><Badge variant="secondary">{p.total}</Badge></div>))}</div>
                        ) : <p className="text-sm text-muted-foreground">{t("admin.an.noProviders")}</p>}
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="rounded-xl">
                    <CardHeader><CardTitle>{t("admin.an.comparison")}</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{t("admin.an.comparisonDesc")}</p>
                      <div className="flex gap-4 flex-wrap mb-4 items-end">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Provider A</label>
                          <select className="border rounded-md px-3 py-2 text-sm bg-background" value={compareA} onChange={(e) => setCompareA(e.target.value)}>
                            <option value="">Select Provider A</option>
                            {providerStats.map((p, i) => <option key={`a-${i}`} value={p.name}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Provider B</label>
                          <select className="border rounded-md px-3 py-2 text-sm bg-background" value={compareB} onChange={(e) => setCompareB(e.target.value)}>
                            <option value="">Select Provider B</option>
                            {providerStats.map((p, i) => <option key={`b-${i}`} value={p.name}>{p.name}</option>)}
                          </select>
                        </div>
                        {(compareA || compareB) && (
                          <Button size="sm" variant="ghost" onClick={() => { setCompareA(''); setCompareB(''); }}>Clear</Button>
                        )}
                      </div>
                      {(() => {
                        const pa = providerStats.find(p => p.name === compareA);
                        const pb = providerStats.find(p => p.name === compareB);
                        if (!pa || !pb) return <p className="text-sm text-muted-foreground">{t("admin.an.selectTwo")}</p>;
                        const rows: Array<{ label: string; a: any; b: any }> = [
                          { label: t("admin.an.specialty"), a: pa.specialty, b: pb.specialty },
                          { label: t("admin.an.totalAppointments"), a: pa.total, b: pb.total },
                          { label: t("admin.an.completedCol"), a: pa.completed, b: pb.completed },
                          { label: t("admin.an.cancelled"), a: pa.cancelled, b: pb.cancelled },
                          { label: t("admin.an.uniquePatients"), a: pa.uniquePatients, b: pb.uniquePatients },
                          { label: t("admin.an.completion"), a: `${pa.completionRate}%`, b: `${pb.completionRate}%` },
                          { label: t("admin.an.cancellationRate"), a: `${pa.cancellationRate}%`, b: `${pb.cancellationRate}%` },
                          { label: t("admin.an.rating"), a: pa.rating, b: pb.rating },
                        ];
                        return (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead><tr className="border-b text-left"><th className="pb-2 font-medium">{t("admin.an.metric")}</th><th className="pb-2 font-medium">{pa.name}</th><th className="pb-2 font-medium">{pb.name}</th></tr></thead>
                              <tbody>{rows.map((r, i) => (<tr key={i} className="border-b last:border-0"><td className="py-2 text-muted-foreground">{r.label}</td><td className="py-2 font-medium">{r.a}</td><td className="py-2 font-medium">{r.b}</td></tr>))}</tbody>
                            </table>
                          </div>
                        );
                      })()}
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
                      <CardHeader><CardTitle>{t("admin.an.genderBreakdown")}</CardTitle></CardHeader>
                      <CardContent>
                        {Object.keys(genderBreakdown).length > 0 ? (
                          <div className="space-y-3">{Object.entries(genderBreakdown).sort(([,a],[,b]) => b - a).map(([g, count]) => (<div key={g}><div className="flex justify-between text-sm mb-1"><span className="capitalize">{g}</span><span className="font-medium">{count}</span></div><Progress value={patients.length > 0 ? (count / patients.length) * 100 : 0} className="h-2" /></div>))}</div>
                        ) : <p className="text-sm text-muted-foreground">{t("admin.an.noGender")}</p>}
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>{t("admin.an.ageDistribution")}</CardTitle></CardHeader>
                      <CardContent>
                        {Object.values(ageBuckets).some(v => v > 0) ? (
                          <div className="space-y-3">{Object.entries(ageBuckets).map(([bucket, count]) => (<div key={bucket}><div className="flex justify-between text-sm mb-1"><span>{bucket}</span><span className="font-medium">{count}</span></div><Progress value={patients.length > 0 ? (count / patients.length) * 100 : 0} className="h-2" /></div>))}</div>
                        ) : <p className="text-sm text-muted-foreground">{t("admin.an.noDob")}</p>}
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="rounded-xl mb-4">
                    <CardHeader><CardTitle>{t("admin.an.inactivePatients")}</CardTitle></CardHeader>
                    <CardContent>
                      {inactivePatientsList.length > 0 ? (
                        <><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2 font-medium">{t("admin.an.name")}</th><th className="pb-2 font-medium">{t("admin.an.lastVisit")}</th><th className="pb-2 font-medium">{t("admin.an.provider")}</th><th className="pb-2 font-medium">{t("admin.an.actions")}</th></tr></thead><tbody>{inactivePatientsList.map((p: any, i: number) => (<tr key={i} className="border-b last:border-0"><td className="py-2 font-medium">{p.full_name || p.name || '—'}</td><td className="py-2 text-muted-foreground">{(() => { try { return p.last_visit ? format(new Date(p.last_visit), 'MMM dd, yyyy') : '—'; } catch { return '—'; } })()}</td><td className="py-2 text-muted-foreground">{p.doctor_name || '—'}</td><td className="py-2"><Button size="sm" variant="outline" onClick={() => guard(async () => { if (!p.user_id && !p.id) { toast.error('No patient ID'); return; } try { const { error } = await (supabase as any).functions.invoke('send-notification', { body: { user_id: p.user_id || p.id, title: tA('patients.actions.reengageTitle', 'We miss you!'), body: tA('patients.actions.reengageBody', `It's been a while since your last visit. Book your next appointment today.`), type: 'reengagement', channel: 'email' } }); if (error) throw error; toast.success(tA('patients.actions.reengageSent', 'Re-engagement email sent')); } catch (e: any) { toast.error(e?.message || 'Failed to send'); } })}>{t("admin.an.reengage")}</Button></td></tr>))}</tbody></table></div>{totalInactive > 10 && <p className="text-xs text-muted-foreground mt-2">and {totalInactive - 10} more</p>}</>
                      ) : <div className="text-center py-6 text-muted-foreground"><CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-50" /><p>{t("admin.an.greatRetention")}</p></div>}
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl">
                    <CardHeader><CardTitle>{t("admin.an.topPatients")}</CardTitle></CardHeader>
                    <CardContent>
                      {topPatients.length > 0 ? (
                        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2 font-medium">#</th><th className="pb-2 font-medium">{t("admin.bl.patient")}</th><th className="pb-2 font-medium">{t("admin.an.provider")}</th><th className="pb-2 font-medium">{t("admin.an.visits")}</th><th className="pb-2 font-medium">{t("admin.an.lastVisit")}</th></tr></thead><tbody>{topPatients.map((p, i) => (<tr key={i} className="border-b last:border-0"><td className="py-2 font-medium">{i + 1}</td><td className="py-2">{p.name}</td><td className="py-2 text-muted-foreground">{p.provider}</td><td className="py-2"><Badge variant="secondary">{p.count}</Badge></td><td className="py-2 text-muted-foreground">{(() => { try { return p.lastVisit ? format(new Date(p.lastVisit), 'MMM dd, yyyy') : '—'; } catch { return '—'; } })()}</td></tr>))}</tbody></table></div>
                      ) : <p className="text-sm text-muted-foreground">{t("admin.an.noApptData")}</p>}
                    </CardContent>
                  </Card>
                </>
              )}

              {analyticsTab === 'financial' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[{ label: t("admin.an.totalRevenue"), value: moneyCents(totalRevCents, ((practice as any)?.currency || 'USD').toUpperCase()) }, { label: t("admin.an.pending"), value: moneyCents(pendingCents, ((practice as any)?.currency || 'USD').toUpperCase()), color: 'text-yellow-600' }, { label: t("admin.an.refunds"), value: moneyCents(refundCents, ((practice as any)?.currency || 'USD').toUpperCase()), color: 'text-destructive' }, { label: t("admin.bl.transactions"), value: txCount }].map((kpi, i) => (
                      <Card key={i} className="rounded-xl"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">{kpi.label}</p>{billing.loading ? <Loader2 className="h-4 w-4 animate-spin mt-1" /> : <p className={`text-2xl font-bold ${(kpi as any).color || ''}`}>{kpi.value}</p>}</CardContent></Card>
                    ))}
                  </div>
                  <Card className="rounded-xl mb-4">
                    <CardHeader><CardTitle>{t("admin.an.revenueTrend")}</CardTitle></CardHeader>
                    <CardContent>
                      {revTrendData.length > 0 ? (
                        <div className="h-60"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revTrendData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Area type="monotone" dataKey="amount" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%)" fillOpacity={0.15} /></AreaChart></ResponsiveContainer></div>
                      ) : <div className="text-center py-8 text-muted-foreground"><DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>{t("admin.an.noRevenue")}</p></div>}
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>{t("admin.an.revenueByProvider")}</CardTitle></CardHeader>
                      <CardContent>
                        {revByDoctorList.length > 0 ? (
                          <div className="space-y-3">{revByDoctorList.map((d, i) => (<div key={i}><div className="flex justify-between text-sm mb-1"><span>{d.name}</span><span className="font-medium">{money(d.total, ((practice as any)?.currency || 'USD').toUpperCase())} <span className="text-xs text-muted-foreground">· {d.count}</span></span></div><Progress value={(d.total / maxDoctorRev) * 100} className="h-2" /></div>))}</div>
                        ) : <p className="text-sm text-muted-foreground">{t("admin.an.noPaidTx")}</p>}
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>{t("admin.an.payMethodBreakdown")}</CardTitle></CardHeader>
                      <CardContent>
                        {Object.keys(payMethodBreakdown).length > 0 ? (
                          <div className="space-y-3">{Object.entries(payMethodBreakdown).sort(([,a],[,b]) => b.total - a.total).map(([method, data]) => (<div key={method}><div className="flex justify-between text-sm mb-1"><span className="capitalize">{method}</span><span className="font-medium">{data.count} · {money(data.total, ((practice as any)?.currency || 'USD').toUpperCase())}</span></div><Progress value={txList.length > 0 ? (data.count / txList.length) * 100 : 0} className="h-2" /></div>))}</div>
                        ) : <p className="text-sm text-muted-foreground">{t("admin.an.noTx")}</p>}
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="rounded-xl">
                    <CardHeader><CardTitle>{t("admin.an.avgRevPerAppt")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-center py-4"><p className="text-4xl font-bold">{appointments.length > 0 ? moneyCents(totalRevCents / appointments.length, ((practice as any)?.currency || 'USD').toUpperCase()) : moneyCents(0, ((practice as any)?.currency || 'USD').toUpperCase())}</p><p className="text-sm text-muted-foreground mt-1">{t("admin.an.perAppointment")}</p></div>
                      {appointments.length === 0 && <p className="text-sm text-muted-foreground text-center">{t("admin.an.insufficientCalc")}</p>}
                    </CardContent>
                  </Card>
                </>
              )}

              {analyticsTab === 'services' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[{ label: t("admin.an.totalServices"), value: services.length }, { label: t("admin.an.mostBooked"), value: mostBooked.length > 0 ? mostBooked[0][0] : '—' }, { label: t("admin.an.categories"), value: serviceCats.size }, { label: t("admin.an.zeroBookings"), value: zeroBookingServices.length }].map((kpi, i) => (
                      <Card key={i} className="rounded-xl"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">{kpi.label}</p><p className="text-2xl font-bold truncate">{kpi.value}</p></CardContent></Card>
                    ))}
                  </div>
                  <Card className="rounded-xl mb-4">
                    <CardHeader><CardTitle>{t("admin.an.mostBookedServices")}</CardTitle></CardHeader>
                    <CardContent>
                      {mostBooked.length > 0 ? (
                        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2 font-medium">#</th><th className="pb-2 font-medium">{t("admin.an.service")}</th><th className="pb-2 font-medium">{t("admin.an.category")}</th><th className="pb-2 font-medium">{t("admin.an.bookings")}</th><th className="pb-2 font-medium">{t("admin.an.estRevenue")}</th></tr></thead><tbody>{mostBooked.slice(0, 10).map(([name, count], i) => { const svc = services.find((s: any) => s.name === name); return (<tr key={i} className="border-b last:border-0"><td className="py-2 font-medium">{i + 1}</td><td className="py-2">{name}</td><td className="py-2"><Badge variant="secondary">{(svc as any)?.category || '—'}</Badge></td><td className="py-2">{count}</td><td className="py-2">{money((Number((svc as any)?.price || (svc as any)?.cost || 0)) * count, 'USD')}</td></tr>); })}</tbody></table></div>
                      ) : <p className="text-sm text-muted-foreground">{t("admin.an.noBooking")}</p>}
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>{t("admin.an.servicesByCategory")}</CardTitle></CardHeader>
                      <CardContent>
                        {catChartData.length > 0 ? (
                          <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={catChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="category" /><YAxis /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
                        ) : <p className="text-sm text-muted-foreground">{t("admin.an.noServices")}</p>}
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                      <CardHeader><CardTitle>{t("admin.an.noRecentBookings")}</CardTitle></CardHeader>
                      <CardContent>
                        {zeroBookingServices.length > 0 ? (
                          <div className="space-y-3">{zeroBookingServices.map((s: any, i: number) => (<div key={i} className="flex items-center justify-between"><div><p className="text-sm font-medium">{s.name}</p><div className="flex gap-2 mt-1"><Badge variant="secondary">{s.category || '—'}</Badge><span className="text-xs text-muted-foreground">{money(Number(s.price || s.cost || 0), 'USD')}</span></div></div><Button size="sm" variant="outline" onClick={() => (() => { setActiveSection('services'); setServiceTab('catalog'); })()}>{t("admin.an.review")}</Button></div>))}</div>
                        ) : <div className="text-center py-6 text-muted-foreground"><CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-50" /><p>{t("admin.an.allHaveBookings")}</p></div>}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
              {analyticsTab === 'reports' && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t("admin.an.customReports")}</h3>
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
                    })}>{t("admin.an.scheduleReport")}</Button>
                  </div>

                  {/* Report Builder */}
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>{t("admin.an.buildReport")}</CardTitle>
                      <p className="text-sm text-muted-foreground">{t("admin.an.buildDesc")}</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Step 1: Metrics */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{t("admin.an.metricsInclude")}</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setReportMetrics(['Total Appointments','Completed Appointments','Cancelled Appointments','No-shows','Unique Patients','New Patients','Total Revenue','Avg Revenue per Appointment','Top Services','Provider Performance','Cancellation Rate','Patient Retention'])}>{t("admin.an.selectAll")}</Button>
                            <Button size="sm" variant="ghost" onClick={() => setReportMetrics([])}>{t("admin.an.clear")}</Button>
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
                        <p className="text-sm font-medium">{t("admin.an.filters")}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground">{t("admin.an.from")}</label>
                            <Input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">{t("admin.an.to")}</label>
                            <Input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">{t("admin.an.provider")}</label>
                            <select className="flex h-10 w-full rounded-md border-2 border-border bg-background px-3 py-2 text-sm" value={reportProvider} onChange={e => setReportProvider(e.target.value)}>
                              <option value="all">{t("admin.an.allProviders")}</option>
                              {doctors.map((d: any) => <option key={d.id} value={d.id}>{d.name || d.full_name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">{t("admin.an.service")}</label>
                            <select className="flex h-10 w-full rounded-md border-2 border-border bg-background px-3 py-2 text-sm" value={reportService} onChange={e => setReportService(e.target.value)}>
                              <option value="all">{t("admin.an.allServices")}</option>
                              {services.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">{t("admin.an.branch")}</label>
                            <select className="flex h-10 w-full rounded-md border-2 border-border bg-background px-3 py-2 text-sm" value={reportBranch} onChange={e => setReportBranch(e.target.value)}>
                              <option value="all">{t("admin.an.allBranches")}</option>
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
                            const fromDate = reportFrom ? new Date(reportFrom) : null;
                            const toDate = reportTo ? new Date(reportTo) : null;
                            const filteredAppts = appointments.filter((a: any) => {
                              if (reportProvider !== 'all' && a.doctor_id !== reportProvider && a.doctor_name !== reportProvider) return false;
                              if (reportService !== 'all' && a.service_name !== reportService && a.service !== reportService && a.procedure_id !== reportService) return false;
                              if (fromDate || toDate) {
                                const ad = a.appointment_date ? new Date(a.appointment_date) : null;
                                if (!ad) return false;
                                if (fromDate && ad < fromDate) return false;
                                if (toDate && ad > toDate) return false;
                              }
                              return true;
                            });
                            const apptIds = new Set(filteredAppts.map((a: any) => a.id));
                            const filteredPayments = (payments || []).filter((p: any) => {
                              if (reportProvider !== 'all' && p.doctor_id && p.doctor_id !== reportProvider) {
                                if (!p.appointment_id || !apptIds.has(p.appointment_id)) return false;
                              }
                              if (apptIds.size && p.appointment_id && !apptIds.has(p.appointment_id)) return false;
                              if (fromDate || toDate) {
                                const pd = p.created_at ? new Date(p.created_at) : null;
                                if (!pd) return false;
                                if (fromDate && pd < fromDate) return false;
                                if (toDate && pd > toDate) return false;
                              }
                              return true;
                            });
                            const isPaidStatus = (s: any) => { const v = String(s || '').toLowerCase(); return v === 'paid' || v === 'succeeded' || v === 'completed'; };
                            const revenueCents = filteredPayments.reduce((sum: number, p: any) => {
                              if (!isPaidStatus(p.status)) return sum;
                              const cents = Number(p.amount_cents ?? Math.round(Number(p.amount || 0) * 100));
                              return sum + (Number.isFinite(cents) ? cents : 0);
                            }, 0);
                            const revenue = revenueCents / 100;
                            const norm = (s: any) => { const v = String(s || '').toLowerCase(); if (v === 'cancelled' || v === 'canceled') return 'cancelled'; if (v === 'no_show' || v === 'no-show') return 'no_show'; return v; };
                            if (reportMetrics.includes('Total Appointments')) rows.push({ metric: 'Total Appointments', value: filteredAppts.length, unit: 'appointments' });
                            if (reportMetrics.includes('Completed Appointments')) rows.push({ metric: 'Completed Appointments', value: filteredAppts.filter((a: any) => norm(a.status) === 'completed').length, unit: 'appointments' });
                            if (reportMetrics.includes('Cancelled Appointments')) rows.push({ metric: 'Cancelled Appointments', value: filteredAppts.filter((a: any) => norm(a.status) === 'cancelled').length, unit: 'appointments' });
                            if (reportMetrics.includes('No-shows')) rows.push({ metric: 'No-shows', value: filteredAppts.filter((a: any) => norm(a.status) === 'no_show').length, unit: 'appointments' });
                            if (reportMetrics.includes('Unique Patients')) rows.push({ metric: 'Unique Patients', value: new Set(filteredAppts.map((a: any) => a.patient_id || a.patient_name)).size, unit: 'patients' });
                            if (reportMetrics.includes('New Patients')) rows.push({ metric: 'New Patients', value: patients.length, unit: 'patients' });
                            if (reportMetrics.includes('Cancellation Rate')) rows.push({ metric: 'Cancellation Rate', value: filteredAppts.length > 0 ? (filteredAppts.filter((a: any) => norm(a.status) === 'cancelled').length / filteredAppts.length * 100).toFixed(1) + '%' : '0%', unit: '' });
                            if (reportMetrics.includes('Total Revenue')) rows.push({ metric: 'Total Revenue', value: '$' + revenue.toFixed(2), unit: '' });
                            if (reportMetrics.includes('Avg Revenue per Appointment')) {
                              rows.push({ metric: 'Avg Revenue per Appointment', value: filteredAppts.length > 0 ? '$' + (revenue / filteredAppts.length).toFixed(2) : '$0.00', unit: '' });
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
                        {reportLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("admin.an.generating")}</> : t("admin.an.generate")}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Generated Report */}
                  {reportGenerated !== null && (
                    <Card className="rounded-xl">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{t("admin.an.reportResults")}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">{reportFrom && reportTo ? `${reportFrom} – ${reportTo}` : t("admin.an.allTime")}</p>
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
                            })}>{t("admin.bl.exportCsv")}</Button>
                            <Button size="sm" variant="ghost" onClick={() => setReportGenerated(null)}>{t("admin.an.clearBtn")}</Button>
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
                            <thead><tr className="bg-muted/50"><th className="text-left p-3 font-medium">{t("admin.an.metric")}</th><th className="text-left p-3 font-medium">{t("adminFin.actual")}</th><th className="text-left p-3 font-medium">{t("admin.an.filters")}</th></tr></thead>
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
                          <span>{t("admin.an.totalMetrics")}: {reportGenerated.length}</span>
                          <span>{t("admin.an.filtersApplied")}: {[reportProvider, reportService, reportBranch].filter(f => f !== 'all').length + (reportFrom ? 1 : 0) + (reportTo ? 1 : 0)}</span>
                          <span>{t("admin.an.generated")}: {(() => { try { return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return new Date().toISOString(); } })()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Scheduled Reports */}
                  <Card className="rounded-xl">
                    <CardHeader>
                      <CardTitle>{t("admin.an.scheduled")}</CardTitle>
                      <p className="text-sm text-muted-foreground">{t("admin.an.scheduledDesc")}</p>
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
          { key: 'clinic' as const, label: t("admin.st.tabs.clinic") },
          { key: 'booking' as const, label: t("admin.st.tabs.booking") },
          { key: 'notifications' as const, label: t("admin.st.tabs.notifications") },
          { key: 'branding' as const, label: t("admin.st.tabs.branding") },
          { key: 'security' as const, label: t("admin.st.tabs.security") },
          { key: 'data' as const, label: t("admin.st.tabs.data") },
          { key: 'integrations' as const, label: t("admin.st.tabs.integrations") },
        ];
        const notifEvents = [
          { label: t("admin.st.eventLabels.newBooking"), inapp: 'new_booking_inapp', email: 'new_booking_email' },
          { label: t("admin.st.eventLabels.cancellation"), inapp: 'cancellation_inapp', email: 'cancellation_email' },
          { label: t("admin.st.eventLabels.payment"), inapp: 'payment_inapp', email: 'payment_email' },
          { label: t("admin.st.eventLabels.noShow"), inapp: 'no_show_inapp', email: 'no_show_email' },
          { label: t("admin.st.eventLabels.newReview"), inapp: 'new_review_inapp', email: 'new_review_email' },
        ];
        const brandColors = [
          { name: t("admin.st.colors.blue"), color: 'hsl(220, 70%, 50%)' },
          { name: t("admin.st.colors.green"), color: 'hsl(142, 70%, 40%)' },
          { name: t("admin.st.colors.purple"), color: 'hsl(270, 70%, 50%)' },
          { name: t("admin.st.colors.orange"), color: 'hsl(25, 90%, 50%)' },
          { name: t("admin.st.colors.red"), color: 'hsl(0, 70%, 50%)' },
          { name: t("admin.st.colors.pink"), color: 'hsl(330, 70%, 55%)' },
          { name: t("admin.st.colors.teal"), color: 'hsl(175, 70%, 40%)' },
          { name: t("admin.st.colors.yellow"), color: 'hsl(45, 90%, 50%)' },
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
                <h2 className="text-2xl font-bold">{t("admin.st.title")}</h2>
                <Button onClick={() => guard(() => toast.success(t("admin.st.settingsSaved")))} disabled={!allowModals}>
                  <CheckCircle className="h-4 w-4 mr-2" /> {t("admin.st.saveChanges")}
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
                      <p className="font-medium">{t("admin.st.noPractice")}</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader><CardTitle>{t("admin.st.clinicInfo")}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div><label className="text-sm font-medium text-muted-foreground">{t("admin.st.clinicName")}</label><Input defaultValue={practice?.name || ''} /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">{t("admin.st.phone")}</label><Input defaultValue={practice?.phone || ''} /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">{t("admin.st.email")}</label><Input defaultValue={practice?.email || ''} /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">{t("admin.st.website")}</label><Input defaultValue={practice?.website || ''} /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">{t("admin.st.address")}</label><Input defaultValue={practice?.address || ''} /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">{t("admin.st.taxId")}</label><Input placeholder={t("admin.st.taxPlaceholder")} /></div>
                          </div>
                          <div><label className="text-sm font-medium text-muted-foreground">{t("admin.st.description")}</label><Textarea defaultValue={practice?.description || ''} rows={3} /></div>
                          <Button onClick={() => guard(async () => {
                            const inputs = document.querySelectorAll('.space-y-4 input, .space-y-4 textarea');
                            const vals: any = {};
                            inputs.forEach((el: any, i: number) => {
                              const labels = ['display_name', 'phone', 'email', 'website', 'address_line1', 'tax_id', 'description'];
                              if (i < labels.length) vals[labels[i]] = el.value;
                            });
                            await saveEntitySettings('clinic', vals);
                          })} disabled={!allowModals}>{t("admin.st.save")}</Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader><CardTitle>{t("admin.st.socialMedia")}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div><label className="text-sm font-medium text-muted-foreground">{t("admin.st.instagram")}</label><Input placeholder="https://instagram.com/..." /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">{t("admin.st.facebook")}</label><Input placeholder="https://facebook.com/..." /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">{t("admin.st.linkedin")}</label><Input placeholder="https://linkedin.com/..." /></div>
                            <div><label className="text-sm font-medium text-muted-foreground">{t("admin.st.twitter")}</label><Input placeholder="https://x.com/..." /></div>
                          </div>
                          <Button onClick={() => guard(async () => {
                            await saveEntitySettings('social', { instagram: '', facebook: '', linkedin: '', twitter: '' });
                          })} disabled={!allowModals}>{t("admin.st.save")}</Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader><CardTitle>{t("admin.st.practiceDetails")}</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">{t("admin.st.practiceId")}:</span>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{practice?.id}</code>
                            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(practice.id); toast.success(t("admin.st.copied")); }}>{t("admin.st.copy")}</Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">{t("admin.st.verification")}:</span>
                            <Badge className={getVerificationStatusColor(verificationStatus)}>{verificationStatus}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">{t("admin.st.memberSince")}:</span>
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
                    <CardHeader><CardTitle>{t("admin.st.onlineBooking")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{t("admin.st.enableOnline")}</span>
                        <ToggleBtn checked={bookingSettings.onlineBookingEnabled} onChange={() => guard(() => setBookingSettings(p => ({...p, onlineBookingEnabled: !p.onlineBookingEnabled})))} disabled={!allowModals} />
                      </div>
                      {bookingSettings.onlineBookingEnabled
                        ? <Badge className="bg-primary/10 text-primary">{t("admin.st.active")}</Badge>
                        : <Badge variant="outline" className="text-amber-600 border-amber-300">{t("admin.st.inactive")}</Badge>}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>{t("admin.st.bookingRules")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { label: t("admin.st.bookingWindow"), desc: t("admin.st.bookingWindowDesc"), field: 'bookingWindowDays' as const, unit: t("admin.st.days") },
                        { label: t("admin.st.minNotice"), desc: t("admin.st.minNoticeDesc"), field: 'minNoticeHours' as const, unit: t("admin.st.hours") },
                        { label: t("admin.st.cancelPolicy"), desc: t("admin.st.cancelPolicyDesc"), field: 'cancellationNoticeHours' as const, unit: t("admin.st.hours") },
                        { label: t("admin.st.buffer"), desc: t("admin.st.bufferDesc"), field: 'bufferMinutes' as const, unit: t("admin.st.minutes") },
                        { label: t("admin.st.maxPerDay"), desc: t("admin.st.maxPerDayDesc"), field: 'maxPerDay' as const, unit: '' },
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
                          })} disabled={!allowModals}>{t("admin.st.saveRules")}</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>{t("admin.st.confirmWaitlist")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div><p className="font-medium text-sm">{t("admin.st.autoConfirm")}</p><p className="text-xs text-muted-foreground">{t("admin.st.autoConfirmDesc")}</p></div>
                        <ToggleBtn checked={bookingSettings.autoConfirm} onChange={() => guard(() => setBookingSettings(p => ({...p, autoConfirm: !p.autoConfirm})))} disabled={!allowModals} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div><p className="font-medium text-sm">{t("admin.st.enableWaitlist")}</p><p className="text-xs text-muted-foreground">{t("admin.st.enableWaitlistDesc")}</p></div>
                        <ToggleBtn checked={bookingSettings.waitlistEnabled} onChange={() => guard(() => setBookingSettings(p => ({...p, waitlistEnabled: !p.waitlistEnabled})))} disabled={!allowModals} />
                      </div>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('booking', bookingSettings);
                          })} disabled={!allowModals}>{t("admin.st.save")}</Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ========== NOTIFICATIONS ========== */}
              {settingsTab === 'notifications' && (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">{t("admin.st.notifDesc")}</p>

                  <Card>
                    <CardHeader><CardTitle>{t("admin.st.notifEvents")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-border"><th className="text-left py-2 font-medium">{t("admin.st.event")}</th><th className="text-center py-2 font-medium">{t("admin.st.inApp")}</th><th className="text-center py-2 font-medium">{t("admin.st.email")}</th></tr></thead>
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
                          })} disabled={!allowModals}>{t("admin.st.savePrefs")}</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>{t("admin.st.patientReminders")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{t("admin.st.sendReminder")}</span>
                        <Input type="number" className="w-20" defaultValue={24} disabled={!allowModals} />
                        <span className="text-sm text-muted-foreground">{t("admin.st.hoursBefore")}</span>
                      </div>
                      <div className="flex items-center justify-between"><span className="text-sm">{t("admin.st.sendViaEmail")}</span><ToggleBtn checked={true} onChange={() => {}} disabled={!allowModals} /></div>
                      <div className="flex items-center justify-between"><span className="text-sm">{t("admin.st.sendViaSms")}</span><ToggleBtn checked={false} onChange={() => {}} disabled={!allowModals} /></div>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('notification_prefs', notifSettings);
                          })} disabled={!allowModals}>{t("admin.st.save")}</Button>
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
                    <CardHeader><CardTitle>{t("admin.st.clinicLogo")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center"><Building2 className="h-8 w-8 text-muted-foreground" /></div>
                        <div><p className="text-sm text-muted-foreground">{t("admin.st.noLogo")}</p><Button size="sm" variant="outline" className="mt-2" onClick={() => guard(async () => {
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
                            toast.success(t("admin.st.logoUploaded"));
                          };
                          input.click();
                        })} disabled={!allowModals}>{t("admin.st.uploadLogo")}</Button></div>
                      </div>
                      <p className="text-xs text-muted-foreground">{t("admin.st.logoDesc")}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>{t("admin.st.brandColor")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{t("admin.st.brandColorDesc")}</p>
                      <div className="flex gap-3 flex-wrap">
                        {brandColors.map((c, i) => (
                          <button key={c.name} onClick={() => setSelectedBrandColor(i)} className={`w-8 h-8 rounded-full border-2 transition-transform ${selectedBrandColor === i ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: c.color }} title={c.name} />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{t("admin.st.selected")}: {brandColors[selectedBrandColor].name}</p>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('branding', { colorIndex: selectedBrandColor });
                          })} disabled={!allowModals}>{t("admin.st.save")}</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>{t("admin.st.bookingPage")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">docito.com/</span>
                        <Input defaultValue={practice?.slug || practice?.id?.slice(0, 8) || ''} disabled={!allowModals} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => guard(async () => {
                            await saveEntitySettings('branding', { colorIndex: selectedBrandColor, custom_url: true });
                          })} disabled={!allowModals}>{t("admin.st.saveUrl")}</Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(`/doctors`, '_blank')}>{t("admin.st.preview")}</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>{t("admin.st.emailCustomization")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div><label className="text-sm font-medium text-muted-foreground">{t("admin.st.emailHeader")}</label><Input defaultValue={practice?.name || t("admin.st.yourClinic")} disabled={!allowModals} /></div>
                      <div><label className="text-sm font-medium text-muted-foreground">{t("admin.st.footerText")}</label><Textarea placeholder={t("admin.st.footerPlaceholder")} rows={2} disabled={!allowModals} /></div>
                      <div><label className="text-sm font-medium text-muted-foreground">{t("admin.st.signature")}</label><Input placeholder={t("admin.st.signaturePlaceholder")} disabled={!allowModals} /></div>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('branding', { colorIndex: selectedBrandColor, email_customized: true });
                          })} disabled={!allowModals}>{t("admin.st.saveTemplate")}</Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ========== SECURITY ========== */}
              {settingsTab === 'security' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle>{t("admin.st.authentication")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium">{t("admin.st.require2fa")}</p><p className="text-xs text-muted-foreground">{t("admin.st.require2faDesc")}</p></div>
                        <ToggleBtn checked={false} onChange={() => {}} disabled={!allowModals} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium">{t("admin.st.sessionTimeout")}</p><p className="text-xs text-muted-foreground">{t("admin.st.sessionTimeoutDesc")}</p></div>
                        <select className="border border-input rounded-md px-3 py-1.5 text-sm bg-background" disabled={!allowModals}>
                          <option>{t("admin.st.timeout.15m")}</option><option>{t("admin.st.timeout.30m")}</option><option selected>{t("admin.st.timeout.1h")}</option><option>{t("admin.st.timeout.4h")}</option><option>{t("admin.st.timeout.never")}</option>
                        </select>
                      </div>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('security', { twofa_required: false, session_timeout: '1 hour' });
                          })} disabled={!allowModals}>{t("admin.st.save")}</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>{t("admin.st.recentLogin")}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between py-1.5 border-b border-border/50"><span>This device — just now</span><span>Tashkent, UZ</span></div>
                        <div className="flex justify-between py-1.5 border-b border-border/50"><span>Chrome on Windows — 2 days ago</span><span>—</span></div>
                        <div className="flex justify-between py-1.5"><span>Mobile Safari — 5 days ago</span><span>—</span></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{t("admin.st.loginHistoryHint")}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>{t("admin.st.passwordPolicy")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{t("admin.st.minLength")}</span>
                        <Input type="number" className="w-20" defaultValue={8} disabled={!allowModals} />
                        <span className="text-sm text-muted-foreground">{t("admin.st.chars")}</span>
                      </div>
                      <div className="flex items-center justify-between"><span className="text-sm">{t("admin.st.reqUpper")}</span><ToggleBtn checked={true} onChange={() => {}} disabled={!allowModals} /></div>
                      <div className="flex items-center justify-between"><span className="text-sm">{t("admin.st.reqNum")}</span><ToggleBtn checked={true} onChange={() => {}} disabled={!allowModals} /></div>
                      <div className="flex items-center justify-between"><span className="text-sm">{t("admin.st.reqSpecial")}</span><ToggleBtn checked={false} onChange={() => {}} disabled={!allowModals} /></div>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('security', { password_policy_updated: true });
                          })} disabled={!allowModals}>{t("admin.st.savePolicy")}</Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ========== DATA ========== */}
              {settingsTab === 'data' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle>{t("admin.st.exportData")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{t("admin.st.exportDataDesc")}</p>
                      <Button onClick={() => guard(() => {
                        downloadCSV('clinic_data.csv', ['Type', 'Count'], [
                          ['Patients', String(patients.length)],
                          ['Appointments', String(appointments.length)],
                          ['Providers', String(doctors.length)],
                          ['Services', String(services.length)],
                          ['Finance Entries', String(financeEntries.length)],
                        ]);
                      })} disabled={!allowModals}><Download className="h-4 w-4 mr-2" /> {t("admin.st.exportAll")}</Button>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        {(['patients','appointments','finance','staff'] as const).map(key => (
                          <Button key={key} size="sm" variant="outline" onClick={() => guard(() => {
                            if (key === 'patients') downloadCSV('patients.csv', ['Name', 'Phone', 'Email'], patients.map((p: any) => [p.name || '', p.phone || '', p.email || '']));
                            else if (key === 'appointments') downloadCSV('appointments.csv', ['Date', 'Provider', 'Status'], appointments.map((a: any) => [a.appointment_date || '', a.doctor_name || '', a.status || '']));
                            else if (key === 'finance') downloadCSV('finance.csv', ['Date', 'Type', 'Amount'], financeEntries.map(e => [e.date || '', e.type || '', String(e.amount || 0)]));
                            else downloadCSV('staff.csv', ['Name', 'Role'], staff.map((s: any) => [s.name || '', s.role || '']));
                          })} disabled={!allowModals}>{t(`admin.st.export.${key}`)}</Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>{t("admin.st.retention")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{t("admin.st.keepInactive")}</span>
                        <select className="border border-input rounded-md px-3 py-1.5 text-sm bg-background" disabled={!allowModals}>
                          <option>{t("admin.st.years1")}</option><option>{t("admin.st.years2")}</option><option selected>{t("admin.st.years5")}</option><option>{t("admin.st.forever")}</option>
                        </select>
                      </div>
                      <Button onClick={() => guard(async () => {
                            await saveEntitySettings('data', { retention_configured: true });
                          })} disabled={!allowModals}>{t("admin.st.save")}</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>{t("admin.st.compliance")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium">{t("admin.st.showConsent")}</p><p className="text-xs text-muted-foreground">{t("admin.st.showConsentDesc")}</p></div>
                        <ToggleBtn checked={false} onChange={() => {}} disabled={!allowModals} />
                      </div>
                      <Button size="sm" variant="outline" onClick={() => guard(async () => { setAuditLogsOpen(true); if (auditLogsRows.length === 0) await loadAuditLogs(); })} disabled={!allowModals}>{t("admin.st.viewAuditLog")}</Button>
                      {auditLogsOpen && (
                        <Card className="mt-3 border-border/60">
                          <CardHeader className="flex flex-row items-center justify-between py-3">
                            <CardTitle className="text-sm">{t("admin.st.auditTitle")}</CardTitle>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => loadAuditLogs()} disabled={auditLogsLoading}>{auditLogsLoading ? t("admin.st.loading") : t("admin.st.refresh")}</Button>
                              <Button size="sm" variant="ghost" onClick={() => setAuditLogsOpen(false)}>{t("admin.st.close")}</Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="max-h-96 overflow-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-muted/50 sticky top-0"><tr className="border-b"><th className="text-left p-2 font-medium">{t("admin.st.when")}</th><th className="text-left p-2 font-medium">{t("admin.st.actor")}</th><th className="text-left p-2 font-medium">{t("admin.st.action")}</th><th className="text-left p-2 font-medium">{t("admin.st.entity")}</th></tr></thead>
                                <tbody>
                                  {auditLogsRows.length === 0 && !auditLogsLoading && (<tr><td colSpan={4} className="p-4 text-center text-muted-foreground">{t("admin.st.noAudit")}</td></tr>)}
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
                          })} disabled={!allowModals}>{t("admin.st.save")}</Button>
                    </CardContent>
                  </Card>

                  <Card className="border-destructive/50">
                    <CardHeader><CardTitle className="text-destructive">{t("admin.st.dangerZone")}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{t("admin.st.dangerDesc")}</p>
                      <Button variant="destructive" onClick={() => guard(() => { if (confirm(t("admin.st.confirmDelete"))) toast.error(t("admin.st.deletionRequiresSupport")); })} disabled={!allowModals}>
                        <Trash2 className="h-4 w-4 mr-2" /> {t("admin.st.deletePractice")}
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
                      <CardTitle>{t("admin.st.calendarSync")}</CardTitle>
                      <p className="text-sm text-muted-foreground">{t("admin.st.calendarSyncDesc")}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { name: t("admin.st.googleCalendar"), provider: 'google' as const, desc: t("admin.st.googleCalendarDesc") },
                        { name: t("admin.st.outlook"), provider: 'outlook' as const, desc: t("admin.st.outlookDesc") },
                      ].map(cal => (
                        <div key={cal.provider} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                          <div>
                            <span className="font-bold">{cal.name}</span>
                            <p className="text-sm text-muted-foreground">{cal.desc}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={calendarSyncProvider === cal.provider ? 'default' : 'secondary'}>
                              {calendarSyncProvider === cal.provider ? t("admin.st.connected") : t("admin.st.notConnected")}
                            </Badge>
                            {calendarSyncProvider === cal.provider ? (
                              <Button size="sm" variant="outline" className="text-destructive" onClick={() => guard(async () => {
                                setCalendarSyncProvider('none');
                                await persistIntegrations({ calendar_sync_provider: 'none' });
                                toast.success(`${cal.name} ${t("admin.st.disconnected")}`);
                              })} disabled={!allowModals}>{t("admin.st.disconnect")}</Button>
                            ) : (
                              <Button size="sm" onClick={() => guard(async () => {
                                if (cal.provider === 'google') {
                                  setCalendarSyncProvider('google');
                                  await persistIntegrations({ calendar_sync_provider: 'google' });
                                  toast.success(t("admin.st.googleConnected"));
                                } else {
                                  setCalendarSyncProvider('outlook');
                                  await persistIntegrations({ calendar_sync_provider: 'outlook' });
                                  toast.success(t("admin.st.outlookConnected"));
                                }
                              })} disabled={!allowModals}>{t("admin.st.connect")}</Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">{t("admin.st.calendarPerProvider")}</p>
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
                      <CardTitle>{t("admin.st.apiKeys")}</CardTitle>
                      <p className="text-sm text-muted-foreground">{t("admin.st.apiKeysDesc")}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input placeholder={t("admin.st.keyName")} value={newApiKeyName} onChange={e => setNewApiKeyName(e.target.value)} className="max-w-xs" />
                        <Button onClick={() => guard(async () => {
                          if (!newApiKeyName.trim()) { toast.error(t("admin.st.enterKeyName")); return; }
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
                          toast.success(t("admin.st.keyGenerated"));
                        })} disabled={!allowModals}>{t("admin.st.generateKey")}</Button>
                      </div>
                      {apiKeys.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50"><tr><th className="text-left p-3 font-medium">{t("admin.st.keyName2")}</th><th className="text-left p-3 font-medium">{t("admin.st.key")}</th><th className="text-left p-3 font-medium">{t("admin.st.created")}</th><th className="text-left p-3 font-medium">{t("admin.st.lastUsed")}</th><th className="text-left p-3 font-medium">{t("admin.an.actions")}</th></tr></thead>
                            <tbody>
                              {apiKeys.map(k => (
                                <tr key={k.id} className="border-t">
                                  <td className="p-3 font-medium">{k.name}</td>
                                  <td className="p-3 font-mono text-xs">{k.key.slice(0, 12)}...</td>
                                  <td className="p-3">{(() => { try { return new Date(k.created_at).toLocaleDateString(); } catch { return k.created_at; } })()}</td>
                                  <td className="p-3 text-muted-foreground">{k.last_used || t("admin.st.never")}</td>
                                  <td className="p-3 flex gap-1">
                                    <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(k.key).then(() => toast.success(t("admin.st.keyCopied")))}>{t("admin.st.copy")}</Button>
                                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => guard(async () => { if (confirm(t("admin.st.confirmRevoke"))) { const next = apiKeys.filter(x => x.id !== k.id); setApiKeys(next); await persistIntegrations({ api_keys: next }); toast.success(t("admin.st.keyRevoked")); } })} disabled={!allowModals}>{t("admin.st.revoke")}</Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Star className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p>{t("admin.st.noKeys")}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">{t("admin.st.keepSecret")}</p>
                    </CardContent>
                  </Card>

                  {/* Webhooks */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("admin.st.webhooks")}</CardTitle>
                      <p className="text-sm text-muted-foreground">{t("admin.st.webhooksDesc")}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t("admin.st.webhookUrl")}</label>
                        <Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://your-server.com/webhook" />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => guard(async () => { if (!webhookUrl.startsWith('https://')) { toast.error(t("admin.st.httpsRequired")); return; } await persistIntegrations({ webhook_url: webhookUrl }); toast.success(t("admin.st.webhookSaved")); })} disabled={!allowModals}>{t("admin.st.saveWebhook")}</Button>
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
                        <p className="text-sm font-medium mb-2">{t("admin.st.triggerEvents")}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['appointment.created', 'appointment.cancelled', 'appointment.completed', 'payment.received', 'patient.registered'].map(ev => (
                            <span key={ev} className="px-2 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground">{ev}</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{t("admin.st.deliveryLogs")}</p>
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
                          <Button variant="outline" onClick={() => toast.success(t("adminSidebar.verifiedToast"))} className="w-full">
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
                <img src="/logos/horizontal/docito-horizontal-sm.png" alt="Docito healthcare platform logo" className="h-7" width={93} height={28} />
              </a>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <CurrencySwitcher className="hidden sm:flex" />
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
