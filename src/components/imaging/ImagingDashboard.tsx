// File: src/components/imaging/ImagingDashboard.tsx
// FULL FILE REPLACEMENT

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
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
  CreditCard,
  DollarSign,
  RefreshCw,
  Clock3,
  Activity,
  UserCheck,
  Radio,
} from "lucide-react";
import { useImagingCenter } from "@/hooks/useImagingCenter";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardShell, SidebarItem } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatsGrid, StatCardProps } from "@/components/dashboard/StatsGrid";
import { ContentCard } from "@/components/dashboard/ContentCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import ImagingEquipmentManager from "@/components/imaging/ImagingEquipmentManager";
import ImagingScanWorkflow from "@/components/imaging/ImagingScanWorkflow";
import ImagingReportManager from "@/components/imaging/ImagingReportManager";
import ImagingAnalytics from "@/components/imaging/ImagingAnalytics";
import { ImagingReferralsSection } from "@/components/imaging/ImagingReferralsSection";
import ImagingBillingSection from "@/components/imaging/ImagingBillingSection";
import ImagingStaffManager from "@/components/imaging/ImagingStaffManager";
import FinanceManagementSection from "@/components/financial/FinanceManagementSection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Header";

type ReferralRow = {
  id: string;
  referral_number: string | null;
  receiver_type?: string | null;
  receiver_entity_id?: string | null;
  patient_name: string | null;
  reason: string | null;
  attachments: any;
  result_attachments: any;
  priority: "routine" | "urgent" | "stat" | null;
  preferred_date: string | null;
  preferred_time_slot: string | null;
  created_at: string;
  updated_at: string;
};

type ImagingOrderStateRow = {
  referral_id: string;
  imaging_center_id: string;
  workflow_status:
    | "scheduled"
    | "checked_in"
    | "in_progress"
    | "images_ready"
    | "awaiting_report"
    | "completed"
    | "delivered"
    | "cancelled"
    | string;
  priority: "routine" | "urgent" | "stat" | null;
  updated_at: string | null;
};

type ImagingStaffRow = {
  id: string;
  imaging_center_id: string;
  user_id: string;
  staff_role: string | null;
  status: string | null;
  created_at: string;
};

type ImagingEquipmentRow = {
  id: string;
  imaging_center_id: string;
  name: string;
  modality: string | null;
  status: "active" | "maintenance" | "offline" | "retired" | string | null;
  capacity_per_day: number | null;
  created_at: string;
  updated_at: string;
};

type OverviewOrder = {
  id: string;
  orderNumber: string;
  patientName: string;
  examName: string;
  modality: string;
  status: string;
  priority: string;
  preferredDate: string | null;
  preferredTimeSlot: string | null;
  createdAt: string;
  updatedAt: string;
};

type DashboardData = {
  stats: {
    scheduledToday: number;
    inProgress: number;
    pendingReports: number;
    completedToday: number;
    deliveredToday: number;
    incoming7d: number;
    activeStaff: number;
    activeEquipment: number;
    completionRate7d: number;
    avgQueueAgeHours: number;
  };
  queue: OverviewOrder[];
  recentCompleted: OverviewOrder[];
  equipment: Array<{
    id: string;
    name: string;
    modality: string;
    status: "active" | "maintenance" | "offline" | "retired" | string;
    utilization: number;
    capacityPerDay: number;
  }>;
  workflowBreakdown: Array<{ name: string; value: number }>;
  modalityBacklog: Array<{ name: string; value: number }>;
  staffSnapshot: Array<{ role: string; total: number; active: number }>;
};

function safeObj(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sameLocalDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function hoursBetween(from?: string | null, to?: string | null) {
  const a = parseDate(from || undefined);
  const b = parseDate(to || undefined);
  if (!a || !b) return 0;
  const h = (b.getTime() - a.getTime()) / (1000 * 60 * 60);
  return Number.isFinite(h) && h > 0 ? h : 0;
}

function normalizeStatus(raw?: string | null) {
  return String(raw || "scheduled").trim().toLowerCase();
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function priorityLabel(priority: string) {
  const p = String(priority || "routine").toLowerCase();
  if (p === "stat") return "STAT";
  if (p === "urgent") return "Urgent";
  return "Routine";
}

function examFromReferral(r: ReferralRow) {
  const a = safeObj(r.attachments);
  const examName =
    (typeof a.exam_name === "string" && a.exam_name) ||
    (typeof r.reason === "string" && r.reason) ||
    "Imaging Exam";
  const modality = (typeof a.modality === "string" && a.modality) || "X-ray";
  return { examName, modality };
}

function statusBadge(status: string) {
  const s = normalizeStatus(status);
  if (s === "delivered") return <Badge>Delivered</Badge>;
  if (s === "completed") return <Badge variant="secondary">Completed</Badge>;
  if (s === "awaiting_report") return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Awaiting Report</Badge>;
  if (s === "images_ready") return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Images Ready</Badge>;
  if (s === "in_progress") return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">In Progress</Badge>;
  if (s === "checked_in") return <Badge className="bg-cyan-500/10 text-cyan-600 border-cyan-500/20">Checked In</Badge>;
  if (s === "cancelled") return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge variant="outline">{statusLabel(s)}</Badge>;
}

function priorityBadge(priority: string) {
  const p = String(priority || "routine").toLowerCase();
  if (p === "stat") return <Badge variant="destructive">STAT</Badge>;
  if (p === "urgent") return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Urgent</Badge>;
  return <Badge variant="outline">Routine</Badge>;
}

export default function ImagingDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation("imagingAdminDashboard");
  const { user, loading: authLoading, activeRole } = useAuth();
  const { myImagingCenter, fetchMyImagingCenter, loading: centerLoading } = useImagingCenter();

  const [activeTab, setActiveTab] = useState("overview");
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overview, setOverview] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchMyImagingCenter();
  }, [fetchMyImagingCenter]);

  const sidebarItems: SidebarItem[] = useMemo(() => [
    { id: "overview", label: t("imagingDashboard.menu.overview", "Overview"), icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: "workflow", label: t("imagingDashboard.menu.scanWorkflow", "Scan Workflow"), icon: <ClipboardList className="h-5 w-5" /> },
    { id: "reports", label: t("imagingDashboard.menu.reports", "Reports"), icon: <FileImage className="h-5 w-5" /> },
    { id: "equipment", label: t("imagingDashboard.menu.equipment", "Equipment"), icon: <Wrench className="h-5 w-5" /> },
    { id: "analytics", label: t("imagingDashboard.menu.analytics", "Analytics"), icon: <BarChart3 className="h-5 w-5" /> },
    { id: "billing", label: t("imagingDashboard.menu.billing", "Billing"), icon: <CreditCard className="h-5 w-5" /> },
    { id: "finances", label: t("imagingDashboard.menu.finances", "Finances"), icon: <DollarSign className="h-5 w-5" /> },
    { id: "staff", label: t("imagingDashboard.menu.staff", "Staff"), icon: <Users className="h-5 w-5" /> },
    { id: "referrals", label: t("imagingDashboard.menu.referrals", "Referrals"), icon: <ArrowRightLeft className="h-5 w-5" /> },
    {
      id: "settings",
      label: t("imagingDashboard.menu.settings", "Settings"),
      icon: <Settings className="h-5 w-5" />,
      onClick: () => navigate("/imaging/settings"),
    },
  ], [t, navigate]);

  const centerId = myImagingCenter?.id || "";

  const fetchOverview = async () => {
    if (!centerId) return;
    setOverviewLoading(true);

    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);

      const referralsP = (supabase.from as any)("referrals")
        .select(
          "id, referral_number, receiver_type, receiver_entity_id, patient_name, reason, attachments, result_attachments, priority, preferred_date, preferred_time_slot, created_at, updated_at",
        )
        .eq("receiver_type", "imaging_center")
        .eq("receiver_entity_id", centerId)
        .order("created_at", { ascending: false })
        .limit(1000);

      const statesP = (supabase.from as any)("imaging_order_state")
        .select("referral_id, imaging_center_id, workflow_status, priority, updated_at")
        .eq("imaging_center_id", centerId)
        .limit(1000);

      const staffP = (supabase.from as any)("imaging_staff")
        .select("id, imaging_center_id, user_id, staff_role, status, created_at")
        .eq("imaging_center_id", centerId)
        .limit(500);

      const equipmentP = (supabase.from as any)("imaging_equipment")
        .select("id, imaging_center_id, name, modality, status, capacity_per_day, created_at, updated_at")
        .eq("imaging_center_id", centerId)
        .limit(500);

      const [referralsRes, statesRes, staffRes, equipmentRes] = await Promise.allSettled([
        referralsP,
        statesP,
        staffP,
        equipmentP,
      ]);

      const referralsData =
        referralsRes.status === "fulfilled" && !referralsRes.value.error
          ? ((referralsRes.value.data || []) as ReferralRow[])
          : [];
      const statesData =
        statesRes.status === "fulfilled" && !statesRes.value.error
          ? ((statesRes.value.data || []) as ImagingOrderStateRow[])
          : [];
      const staffData =
        staffRes.status === "fulfilled" && !staffRes.value.error
          ? ((staffRes.value.data || []) as ImagingStaffRow[])
          : [];
      const equipmentData =
        equipmentRes.status === "fulfilled" && !equipmentRes.value.error
          ? ((equipmentRes.value.data || []) as ImagingEquipmentRow[])
          : [];

      const stateMap = new Map<string, ImagingOrderStateRow>();
      for (const s of statesData) stateMap.set(s.referral_id, s);

      const orders: OverviewOrder[] = referralsData.map((r) => {
        const state = stateMap.get(r.id);
        const { examName, modality } = examFromReferral(r);
        const status = normalizeStatus(state?.workflow_status || "scheduled");
        const priority = String(state?.priority || r.priority || "routine").toLowerCase();

        return {
          id: r.id,
          orderNumber: r.referral_number || `IMG-${r.id.slice(0, 8).toUpperCase()}`,
          patientName: r.patient_name || "Patient",
          examName,
          modality,
          status,
          priority,
          preferredDate: r.preferred_date,
          preferredTimeSlot: r.preferred_time_slot,
          createdAt: r.created_at,
          updatedAt: state?.updated_at || r.updated_at || r.created_at,
        };
      });

      const isTodayOrder = (o: OverviewOrder) => {
        const pd = o.preferredDate ? new Date(`${o.preferredDate}T00:00:00`) : null;
        if (pd && !Number.isNaN(pd.getTime())) return sameLocalDate(pd, now);
        const created = parseDate(o.createdAt);
        return created ? sameLocalDate(created, now) : false;
      };

      const todayQueue = orders
        .filter((o) => isTodayOrder(o))
        .sort((a, b) => {
          const aTime = `${a.preferredDate || ""} ${a.preferredTimeSlot || ""}`.trim();
          const bTime = `${b.preferredDate || ""} ${b.preferredTimeSlot || ""}`.trim();
          if (aTime && bTime) return aTime.localeCompare(bTime);
          return (parseDate(a.createdAt)?.getTime() || 0) - (parseDate(b.createdAt)?.getTime() || 0);
        })
        .slice(0, 12);

      const completedLike = new Set(["completed", "delivered"]);
      const activeWork = new Set(["checked_in", "in_progress", "images_ready", "awaiting_report"]);
      const pendingReports = new Set(["images_ready", "awaiting_report"]);
      const cancelledLike = new Set(["cancelled"]);

      const orders7d = orders.filter((o) => {
        const d = parseDate(o.createdAt);
        return d ? d >= sevenDaysAgo : false;
      });

      const completed7d = orders7d.filter((o) => completedLike.has(o.status)).length;
      const completionRate7d = orders7d.length ? Math.round((completed7d / orders7d.length) * 100) : 0;

      const queueAgeSamples = orders
        .filter((o) => !completedLike.has(o.status) && !cancelledLike.has(o.status))
        .map((o) => hoursBetween(o.createdAt, new Date().toISOString()))
        .filter((h) => h > 0 && h < 24 * 45);

      const avgQueueAgeHours = queueAgeSamples.length
        ? Math.round((queueAgeSamples.reduce((a, b) => a + b, 0) / queueAgeSamples.length) * 10) / 10
        : 0;

      const modalityBacklogMap = new Map<string, number>();
      for (const o of orders) {
        if (!completedLike.has(o.status) && !cancelledLike.has(o.status)) {
          modalityBacklogMap.set(o.modality, (modalityBacklogMap.get(o.modality) || 0) + 1);
        }
      }

      const modalityBacklog = [...modalityBacklogMap.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      const workflowMap = new Map<string, number>();
      for (const o of orders) {
        workflowMap.set(statusLabel(o.status), (workflowMap.get(statusLabel(o.status)) || 0) + 1);
      }

      const workflowBreakdown = [...workflowMap.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const activeStaff = staffData.filter((s) => String(s.status || "active").toLowerCase() === "active").length;
      const staffRoleMap = new Map<string, { role: string; total: number; active: number }>();
      for (const s of staffData) {
        const role = String(s.staff_role || "staff")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const row = staffRoleMap.get(role) || { role, total: 0, active: 0 };
        row.total += 1;
        if (String(s.status || "active").toLowerCase() === "active") row.active += 1;
        staffRoleMap.set(role, row);
      }

      const staffSnapshot = [...staffRoleMap.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, 6);

      const todayOrders = orders.filter(isTodayOrder);
      const todayByModality = new Map<string, number>();
      for (const o of todayOrders) {
        todayByModality.set(o.modality, (todayByModality.get(o.modality) || 0) + 1);
      }

      const equipment = equipmentData
        .map((eq) => {
          const capacity = Number(eq.capacity_per_day || 0);
          const assignedToday = todayByModality.get(String(eq.modality || "Other")) || 0;
          const utilization =
            capacity > 0 ? Math.min(100, Math.round((assignedToday / capacity) * 100)) : assignedToday > 0 ? 100 : 0;
          return {
            id: eq.id,
            name: eq.name,
            modality: String(eq.modality || "Other"),
            status: String(eq.status || "active"),
            utilization,
            capacityPerDay: capacity,
          };
        })
        .sort((a, b) => {
          const order = (s: string) =>
            s === "active" ? 0 : s === "maintenance" ? 1 : s === "offline" ? 2 : s === "retired" ? 3 : 4;
          return order(a.status) - order(b.status) || a.name.localeCompare(b.name);
        });

      const activeEquipment = equipment.filter((e) => e.status === "active").length;

      const recentCompleted = orders
        .filter((o) => completedLike.has(o.status))
        .sort((a, b) => (parseDate(b.updatedAt)?.getTime() || 0) - (parseDate(a.updatedAt)?.getTime() || 0))
        .slice(0, 8);

      const stats = {
        scheduledToday: todayOrders.filter((o) => o.status === "scheduled").length,
        inProgress: orders.filter((o) => activeWork.has(o.status)).length,
        pendingReports: orders.filter((o) => pendingReports.has(o.status)).length,
        completedToday: todayOrders.filter((o) => o.status === "completed").length,
        deliveredToday: todayOrders.filter((o) => o.status === "delivered").length,
        incoming7d: orders7d.length,
        activeStaff,
        activeEquipment,
        completionRate7d,
        avgQueueAgeHours,
      };

      setOverview({
        stats,
        queue: todayQueue,
        recentCompleted,
        equipment: equipment.slice(0, 10),
        workflowBreakdown,
        modalityBacklog,
        staffSnapshot,
      });

      if (
        referralsRes.status === "fulfilled" &&
        referralsRes.value.error &&
        String(referralsRes.value.error.message || "").length
      ) {
        throw referralsRes.value.error;
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load dashboard overview");
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    if (centerId) void fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = (params.get("tab") || params.get("section") || "").trim();
    const hash = (location.hash || "").replace("#", "").trim();
    const desired = (raw || hash).toLowerCase();

    if (!desired) return;

    const allowed = [
      "overview",
      "workflow",
      "reports",
      "equipment",
      "analytics",
      "billing",
      "finances",
      "staff",
      "referrals",
    ];

    if (!allowed.includes(desired)) return;

    if (activeTab !== desired) {
      setActiveTab(desired);
      if (desired === "overview" && centerId) void fetchOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash, location.search, centerId]);

  const stats: StatCardProps[] = useMemo(() => {
    const s = overview?.stats || {
      scheduledToday: 0,
      inProgress: 0,
      pendingReports: 0,
      completedToday: 0,
      deliveredToday: 0,
      incoming7d: 0,
      activeStaff: 0,
      activeEquipment: 0,
      completionRate7d: 0,
      avgQueueAgeHours: 0,
    };

    return [
      {
        label: t("imagingDashboard.overview.stats.scheduledToday", "Scheduled Today"),
        value: s.scheduledToday,
        icon: <Calendar className="h-6 w-6" />,
        description: t("imagingDashboard.overview.stats.scheduledTodayDesc", "Scans scheduled for today"),
        color: "info",
      },
      {
        label: t("imagingDashboard.overview.stats.inProgress", "In Progress Queue"),
        value: s.inProgress,
        icon: <Activity className="h-6 w-6" />,
        description: t("imagingDashboard.overview.stats.inProgressDesc", "Checked-in + active workflow"),
        color: "warning",
      },
      {
        label: t("imagingDashboard.overview.stats.pendingReports", "Pending Reports"),
        value: s.pendingReports,
        icon: <FileText className="h-6 w-6" />,
        description: t("imagingDashboard.overview.stats.pendingReportsDesc", "Images ready / awaiting report"),
        color: "danger",
      },
      {
        label: t("imagingDashboard.overview.stats.completed", "Completed Today"),
        value: s.completedToday,
        icon: <CheckCircle className="h-6 w-6" />,
        description: t("imagingDashboard.overview.stats.completedDesc", "Reports completed today"),
        color: "success",
      },
      {
        label: t("imagingDashboard.overview.stats.deliveredToday", "Delivered Today"),
        value: s.deliveredToday,
        icon: <Radio className="h-6 w-6" />,
        description: t("imagingDashboard.overview.stats.deliveredTodayDesc", "Results delivered today"),
        color: "primary",
      },
      {
        label: t("imagingDashboard.overview.stats.incoming7d", "Incoming (7d)"),
        value: s.incoming7d,
        icon: <ClipboardList className="h-6 w-6" />,
        description: t("imagingDashboard.overview.stats.incoming7dDesc", "New imaging referrals (7 days)"),
        color: "info",
      },
      {
        label: t("imagingDashboard.overview.stats.completionRate7d", "Completion Rate (7d)"),
        value: `${s.completionRate7d}%`,
        icon: <BarChart3 className="h-6 w-6" />,
        description: t("imagingDashboard.overview.stats.completionRate7dDesc", "Completed/delivered vs incoming"),
        color: "success",
      },
      {
        label: t("imagingDashboard.overview.stats.avgQueueAge", "Avg Queue Age"),
        value: `${s.avgQueueAgeHours}h`,
        icon: <Clock3 className="h-6 w-6" />,
        description: t("imagingDashboard.overview.stats.avgQueueAgeDesc", "Open order age average"),
        color: "warning",
      },
      {
        label: t("imagingDashboard.overview.stats.activeStaff", "Active Staff"),
        value: s.activeStaff,
        icon: <UserCheck className="h-6 w-6" />,
        description: t("imagingDashboard.overview.stats.activeStaffDesc", "Active imaging staff members"),
        color: "primary",
      },
      {
        label: t("imagingDashboard.overview.stats.activeEquipment", "Active Equipment"),
        value: s.activeEquipment,
        icon: <Wrench className="h-6 w-6" />,
        description: t("imagingDashboard.overview.stats.activeEquipmentDesc", "Operational modalities/devices"),
        color: "success",
      },
    ];
  }, [overview]);

  const isLoading = authLoading || centerLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">{t("imagingDashboard.common.loading", "Loading...")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">{t("imagingDashboard.common.signInRequired", "Sign In Required")}</CardTitle>
              <CardDescription className="mb-4">
                {t("imagingDashboard.common.signInDescription", "Please sign in to access the imaging center dashboard.")}
              </CardDescription>
              <Button onClick={() => navigate("/auth")}>{t("imagingDashboard.common.signIn", "Sign In")}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!myImagingCenter) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[calc(100vh-64px)] bg-background">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No Imaging Center Found</CardTitle>
              <CardDescription className="mb-4">
                You don't have an imaging center associated with your account.
              </CardDescription>
              <Button onClick={() => navigate("/imaging/register")}>Register Imaging Center</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      role={activeRole as any}
      entityName={myImagingCenter.name}
      entityStatus={myImagingCenter.is_verified ? "verified" : "pending"}
      sidebarItems={sidebarItems}
      activeItem={activeTab}
      onItemChange={(id) => {
        setActiveTab(id);

        const params = new URLSearchParams(location.search);
        params.set("tab", String(id));
        navigate(
          {
            pathname: location.pathname,
            search: params.toString() ? `?${params.toString()}` : "",
          },
          { replace: true },
        );

        if (id === "overview") void fetchOverview();
      }}
    >
      {activeTab === "overview" && (
        <>
          <PageHeader
            title="Dashboard Overview"
            description="Monitor imaging volume, workflow backlog, staff readiness, and equipment utilization."
            badges={[
              {
                label: myImagingCenter.is_verified ? "Verified" : "Pending Verification",
                variant: myImagingCenter.is_verified ? "default" : "secondary",
              },
              {
                label: myImagingCenter.city ? `${myImagingCenter.city}${myImagingCenter.country ? `, ${myImagingCenter.country}` : ""}` : "Imaging Center",
                variant: "outline",
              },
            ]}
            actions={
              <Button variant="outline" onClick={() => void fetchOverview()} disabled={overviewLoading}>
                {overviewLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Refresh
              </Button>
            }
          />

          <StatsGrid stats={stats} columns={4} className="mb-8" />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <ContentCard
              title="Today's Queue"
              description="Scheduled scans and same-day referrals"
              icon={<Calendar className="h-5 w-5" />}
              className="xl:col-span-2"
              loading={overviewLoading}
            >
              {(overview?.queue?.length || 0) === 0 ? (
                <EmptyState
                  icon={<Calendar className="h-12 w-12" />}
                  title="No scans queued today"
                  description="Today's scheduled scans and same-day imaging referrals will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {overview!.queue.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{item.patientName}</p>
                          {priorityBadge(item.priority)}
                          {statusBadge(item.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {item.examName} • {item.modality} • {item.orderNumber}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.preferredDate || "Today"} {item.preferredTimeSlot ? `• ${item.preferredTimeSlot}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ContentCard>

            <ContentCard
              title="Workflow Breakdown"
              description="Current imaging order status distribution"
              icon={<Activity className="h-5 w-5" />}
              loading={overviewLoading}
            >
              {(overview?.workflowBreakdown?.length || 0) === 0 ? (
                <EmptyState
                  icon={<Activity className="h-12 w-12" />}
                  title="No workflow data"
                  description="Orders will appear here once referrals are received."
                />
              ) : (
                <div className="space-y-3">
                  {overview!.workflowBreakdown.slice(0, 8).map((row) => (
                    <div key={row.name} className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                      <span className="text-sm">{row.name}</span>
                      <Badge variant="secondary">{row.value}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ContentCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
            <ContentCard
              title="Equipment Status"
              description="Operational state and estimated today utilization"
              icon={<Wrench className="h-5 w-5" />}
              className="xl:col-span-2"
              loading={overviewLoading}
            >
              {(overview?.equipment?.length || 0) === 0 ? (
                <EmptyState
                  icon={<Wrench className="h-12 w-12" />}
                  title="No equipment registered"
                  description="Add modalities and devices in the Equipment tab to track availability and utilization."
                  action={
                    <Button variant="outline" onClick={() => setActiveTab("equipment")}>
                      Open Equipment
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {overview!.equipment.map((eq) => (
                    <div key={eq.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{eq.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {eq.modality}
                            {eq.capacityPerDay > 0 ? ` • Capacity ${eq.capacityPerDay}/day` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {eq.status === "active" && <Badge>Active</Badge>}
                          {eq.status === "maintenance" && <Badge variant="secondary">Maintenance</Badge>}
                          {eq.status === "offline" && <Badge variant="destructive">Offline</Badge>}
                          {eq.status === "retired" && <Badge variant="outline">Retired</Badge>}
                          {!["active", "maintenance", "offline", "retired"].includes(eq.status) && (
                            <Badge variant="outline">{statusLabel(eq.status)}</Badge>
                          )}
                          <Badge variant="outline">{eq.utilization}% util</Badge>
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.max(0, Math.min(100, eq.utilization))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ContentCard>

            <ContentCard
              title="Team Snapshot"
              description="Staff coverage by role"
              icon={<Users className="h-5 w-5" />}
              loading={overviewLoading}
            >
              {(overview?.staffSnapshot?.length || 0) === 0 ? (
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title="No staff data yet"
                  description="Invite radiologists and technologists to manage imaging workflows collaboratively."
                />
              ) : (
                <div className="space-y-3">
                  {overview!.staffSnapshot.map((row) => (
                    <div key={row.role} className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                      <div>
                        <p className="text-sm font-medium">{row.role}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.active} active / {row.total} total
                        </p>
                      </div>
                      <Badge variant="secondary">{row.total}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ContentCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
            <ContentCard
              title="Backlog by Modality"
              description="Open orders not yet completed/delivered"
              icon={<ScanLine className="h-5 w-5" />}
              loading={overviewLoading}
            >
              {(overview?.modalityBacklog?.length || 0) === 0 ? (
                <EmptyState
                  icon={<ScanLine className="h-12 w-12" />}
                  title="No active backlog"
                  description="Great job — there are no open imaging orders in backlog."
                />
              ) : (
                <div className="space-y-3">
                  {overview!.modalityBacklog.map((row) => (
                    <div key={row.name} className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                      <span className="text-sm">{row.name}</span>
                      <Badge variant="secondary">{row.value}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ContentCard>

            <ContentCard
              title="Recent Completed / Delivered"
              description="Most recently finalized imaging cases"
              icon={<CheckCircle className="h-5 w-5" />}
              loading={overviewLoading}
            >
              {(overview?.recentCompleted?.length || 0) === 0 ? (
                <EmptyState
                  icon={<CheckCircle className="h-12 w-12" />}
                  title="No completed scans yet"
                  description="Completed imaging cases will appear here as your team progresses workflow."
                />
              ) : (
                <div className="space-y-3">
                  {overview!.recentCompleted.map((item) => (
                    <div key={item.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{item.patientName}</p>
                        {statusBadge(item.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {item.examName} • {item.modality} • {item.orderNumber}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ContentCard>
          </div>
        </>
      )}

      {activeTab === "workflow" && <ImagingScanWorkflow centerId={centerId} />}
      {activeTab === "reports" && <ImagingReportManager centerId={centerId} />}
      {activeTab === "equipment" && <ImagingEquipmentManager centerId={centerId} />}
      {activeTab === "analytics" && <ImagingAnalytics centerId={centerId} />}
      {activeTab === "billing" && <ImagingBillingSection centerId={centerId} />}
      {activeTab === "finances" && <FinanceManagementSection entityType="imaging" entityId={centerId} />}
      {activeTab === "staff" && <ImagingStaffManager imagingCenterId={centerId} />}
      {activeTab === "referrals" && <ImagingReferralsSection centerId={centerId} />}
    </DashboardShell>
  );
}
