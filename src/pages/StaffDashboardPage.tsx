// File: src/pages/StaffDashboardPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStaffDashboard } from "@/hooks/useStaffDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import { StaffDashboardOverview } from "@/components/staff/StaffDashboardOverview";
import { TodayScheduleSection } from "@/components/staff/TodayScheduleSection";
import { PatientListSection } from "@/components/staff/PatientListSection";
import BillingSection from "@/components/staff/BillingSection";
import { InvitationsList } from "@/components/staff/InvitationsList";
import AnalyticsSection from "@/components/staff/AnalyticsSection";
import SettingsSection from "@/components/staff/SettingsSection";

import TimeClockCard from "@/components/staff/TimeClockCard";
import AttendanceAdminPanel from "@/components/staff/AttendanceAdminPanel";
import { useTranslation } from "react-i18next";

type SectionId =
  | "dashboard"
  | "today"
  | "patients"
  | "billing"
  | "analytics"
  | "settings"
  | "attendance"
  | "invites";

function toNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, ".").trim());
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function toCentsFromMajor(v: unknown): number {
  const n = toNumber(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export default function StaffDashboardPage() {
  const { t } = useTranslation('dashboard');
  const location = useLocation();
  const navigate = useNavigate();

  const {
    permissions,
    practice,
    todaysAppointments,
    upcomingAppointments,
    recentPatients,
    recentPayments,
    loading,
    error,
    refresh,
  } = useStaffDashboard();

  const [section, setSection] = useState<SectionId>("dashboard");

  const isAdminLike = useMemo(() => {
    const r = (permissions?.staff_role || "").toLowerCase();
    return r.includes("admin") || r.includes("manager");
  }, [permissions?.staff_role]);

  const availableSections = useMemo(() => {
    const s: { id: SectionId; label: string; visible: boolean }[] = [
      { id: "dashboard", label: "Dashboard", visible: true },
      { id: "today", label: "Today", visible: Boolean(permissions?.can_view_schedule) },
      { id: "patients", label: "Patients", visible: Boolean(permissions?.can_manage_patients) },
      { id: "billing", label: "Billing", visible: Boolean(permissions?.can_manage_billing) },
      { id: "analytics", label: "Analytics", visible: Boolean(practice?.id) },
      { id: "settings", label: "Settings", visible: Boolean(isAdminLike && practice?.id) },
      { id: "attendance", label: "Attendance", visible: Boolean(isAdminLike && practice?.id) },
      { id: "invites", label: "Invites", visible: Boolean(isAdminLike && practice?.id) },
    ];

    return s.filter((x) => x.visible);
  }, [
    isAdminLike,
    permissions?.can_manage_billing,
    permissions?.can_manage_patients,
    permissions?.can_view_schedule,
    practice?.id,
  ]);

  const setSectionAndUrl = (next: SectionId) => {
    setSection(next);
    const params = new URLSearchParams(location.search);
    params.set("section", next);
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true },
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = (params.get("section") || params.get("tab") || "").trim();
    const hash = (location.hash || "").replace("#", "").trim();
    const desired = (raw || hash).toLowerCase();

    if (!desired) return;

    const isVisible = availableSections.some((s) => s.id === (desired as SectionId));
    if (!isVisible) return;

    if (section !== (desired as SectionId)) {
      setSection(desired as SectionId);
    }
  }, [availableSections, location.hash, location.search, section]);

  const postFinanceForCompletedAppointment = async (appointmentId: string) => {
    if (!practice?.id) return;
    if (!permissions?.practice_id) return;

    try {
      // 1) Check invoices for this appointment
      const { data: inv, error: invErr } = await (supabase as any)
        .from("invoices")
        .select("id,status,total_amount,currency,patient_id,practice_id,created_at")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (invErr) throw invErr;

      const invoiceId = inv?.id ? String(inv.id) : null;
      const invoiceStatus = String(inv?.status || "").toLowerCase();
      const invoiceCurrency = String(inv?.currency || "USD").toUpperCase();
      const invoiceAmountCents = toCentsFromMajor(inv?.total_amount);

      // If invoice is already paid, do NOT create another income entry.
      if (invoiceId && invoiceStatus === "paid") {
        return;
      }

      // If invoice isn't marked paid but there exists a paid payment for that invoice, also skip.
      if (invoiceId) {
        const { data: paidPayment, error: payErr } = await (supabase as any)
          .from("payments")
          .select("id,status")
          .eq("invoice_id", invoiceId)
          .in("status", ["paid"])
          .limit(1);

        if (payErr) throw payErr;

        if (paidPayment && paidPayment.length > 0) {
          return;
        }
      }

      // 2) Determine amount
      let amountCents = invoiceAmountCents;
      let currency = invoiceCurrency || "USD";

      if (!amountCents || amountCents <= 0) {
        // Sum costs from appointment procedures (fallback if invoice not present/empty)
        const { data: apRows, error: apErr } = await (supabase as any)
          .from("appointment_procedures")
          .select(
            `
              id,
              status,
              estimated_cost,
              procedures:procedure_id(price, name)
            `,
          )
          .eq("appointment_id", appointmentId);

        if (apErr) throw apErr;

        const active = (apRows || []).filter((r: any) => {
          const s = String(r?.status || "").toLowerCase();
          return s !== "cancelled" && s !== "canceled";
        });

        const totalMajor = active.reduce((sum: number, r: any) => {
          const est = toNumber(r?.estimated_cost);
          if (est > 0) return sum + est;
          const p = toNumber(r?.procedures?.price);
          if (p > 0) return sum + p;
          return sum;
        }, 0);

        amountCents = Math.round(totalMajor * 100);
        currency = "USD";
      }

      if (!amountCents || amountCents <= 0) {
        return;
      }

      // 3) Post ledger entry (idempotent via source link table)
      const { data: resp, error: fnErr } = await supabase.functions.invoke("finance-post-entry", {
        body: {
          entityType: "clinic",
          entityId: practice.id,
          entryType: "income",
          amountCents,
          currency,
          occurredAt: new Date().toISOString(),
          categoryName: "Services",
          description: "Appointment completed",
          source: { table: "appointments", id: appointmentId },
          metadata: {
            appointment_id: appointmentId,
            practice_id: practice.id,
            invoice_id: invoiceId,
            invoice_status: invoiceStatus || null,
          },
        },
      });

      if (fnErr) throw fnErr;
      if (resp && (resp as any).ok === false) {
        throw new Error((resp as any).error || "Failed to post finance entry");
      }
    } catch (e: any) {
      console.error("finance-post-entry failed for appointment completion:", e);
      toast.error(e?.message || "Finance ledger update failed");
    }
  };

  const handleStatusUpdate = async (appointmentId: string, status: string) => {
    if (!permissions?.practice_id) return false;

    try {
      const { error: upErr } = await supabase
        .from("appointments")
        .update({ status: status as "canceled" | "completed" | "confirmed" | "no_show" | "pending" })
        .eq("id", appointmentId)
        .eq("practice_id", permissions.practice_id);

      if (upErr) throw upErr;

      if (String(status).toLowerCase() === "completed") {
        await postFinanceForCompletedAppointment(appointmentId);
      }

      toast.success("Appointment updated");
      await refresh();
      return true;
    } catch (e: any) {
      toast.error(e?.message || "Failed to update appointment");
      return false;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading dashboard…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Staff Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">{error}</div>
            <button type="button" className="text-sm text-primary underline" onClick={() => void refresh()}>
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!practice || !permissions) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Staff Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">No clinic practice is linked to this account.</CardContent>
        </Card>
      </div>
    );
  }

  const active = availableSections.find((s) => s.id === section) ? section : availableSections[0]?.id || "dashboard";

  return (
    <div className="p-6">
      <Tabs value={active} onValueChange={(v) => setSectionAndUrl(v as SectionId)}>
        <TabsList className="flex flex-wrap justify-start">
          {availableSections.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard" className="mt-6 space-y-4">
          {/* Step 34: Time Clock for staff */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <TimeClockCard entityType="clinic" entityId={practice.id} />
            </div>
            <div className="md:col-span-2">
              <StaffDashboardOverview
                practice={practice}
                permissions={permissions}
                todaysAppointments={todaysAppointments}
                upcomingAppointments={upcomingAppointments}
                recentPayments={recentPayments}
                onNavigate={(next) => setSectionAndUrl(next as SectionId)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="today" className="mt-6">
          <TodayScheduleSection
            appointments={todaysAppointments}
            onStatusUpdate={handleStatusUpdate}
            onRefresh={() => void refresh()}
            canUpdateAppointments={Boolean(permissions.can_view_schedule)}
          />
        </TabsContent>

        <TabsContent value="patients" className="mt-6">
          <PatientListSection
            patients={recentPatients}
            onRefresh={() => void refresh()}
            canManagePatients={Boolean(permissions.can_manage_patients)}
          />
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <BillingSection payments={recentPayments} onRefresh={() => void refresh()} canManageBilling={Boolean(permissions.can_manage_billing)} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsSection clinicId={practice.id} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsSection clinicId={practice.id} />
        </TabsContent>

        {/* Step 34: Admin attendance approval view */}
        <TabsContent value="attendance" className="mt-6">
          <AttendanceAdminPanel entityType="clinic" entityId={practice.id} />
        </TabsContent>

        <TabsContent value="invites" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <InvitationsList practiceId={practice.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
