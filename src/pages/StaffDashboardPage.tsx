// File: src/pages/StaffDashboardPage.tsx

import { useMemo, useState } from "react";
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

type SectionId = "dashboard" | "today" | "patients" | "billing" | "analytics" | "settings" | "invites";

export default function StaffDashboardPage() {
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

  const handleStatusUpdate = async (appointmentId: string, status: string) => {
    if (!permissions?.practice_id) return false;

    try {
      const { error: upErr } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", appointmentId)
        .eq("practice_id", permissions.practice_id);

      if (upErr) throw upErr;
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
            <button
              type="button"
              className="text-sm text-primary underline"
              onClick={() => void refresh()}
            >
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
          <CardContent className="text-sm text-muted-foreground">
            No clinic practice is linked to this account.
          </CardContent>
        </Card>
      </div>
    );
  }

  const active = availableSections.find((s) => s.id === section)
    ? section
    : availableSections[0]?.id || "dashboard";

  return (
    <div className="p-6">
      <Tabs value={active} onValueChange={(v) => setSection(v as SectionId)}>
        <TabsList className="flex flex-wrap justify-start">
          {availableSections.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <StaffDashboardOverview
            practice={practice}
            permissions={permissions}
            todaysAppointments={todaysAppointments}
            upcomingAppointments={upcomingAppointments}
            recentPayments={recentPayments}
            onNavigate={(next) => setSection(next as SectionId)}
          />
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
          <BillingSection
            payments={recentPayments}
            onRefresh={() => void refresh()}
            canManageBilling={Boolean(permissions.can_manage_billing)}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsSection clinicId={practice.id} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsSection clinicId={practice.id} />
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
