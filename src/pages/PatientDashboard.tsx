// File: src/pages/PatientDashboard.tsx
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format, isAfter, isEqual, startOfDay } from "date-fns";
import {
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Home,
  LogOut,
  MapPin,
  Menu,
  Pill,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  TestTube2,
  User,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useAppointments } from "@/hooks/useAppointments";
import { usePatientDashboard } from "@/hooks/usePatientDashboard";
import { supabase } from "@/integrations/supabase/client";

import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/home/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { DashboardBranding } from "@/components/dashboard/DashboardBranding";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { MedicationReminderDashboard } from "@/components/medication/MedicationReminderDashboard";
import { PatientBilling } from "@/components/patient/PatientBilling";
import { PatientMedicalRecords } from "@/components/patient/PatientMedicalRecords";
import { PatientReferralsSection } from "@/components/patient/PatientReferralsSection";
import { PatientSettingsPanel } from "@/components/patient/PatientSettingsPanel";
import { PatientTestResultsSection } from "@/components/patient/PatientTestResultsSection";
import { PatientTreatmentPlans } from "@/components/patient/PatientTreatmentPlans";

function asOne<T = any>(v: any): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return v as T;
}

function getDoctorName(apt: any, fallback: string) {
  const doctor = asOne(apt?.doctor);
  const profiles = asOne(doctor?.profiles);

  const fullName =
    (profiles?.full_name && String(profiles.full_name).trim()) ||
    (doctor?.full_name && String(doctor.full_name).trim()) ||
    (apt?.doctor_full_name && String(apt.doctor_full_name).trim()) ||
    (apt?.doctor_name && String(apt.doctor_name).trim());

  if (fullName) return String(fullName).trim();
  return fallback;
}

function appointmentRoute(apt: any) {
  const id = apt?.id ? String(apt.id) : "";
  return id ? `/booking-confirmation/${id}` : "";
}

export default function PatientDashboard() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const { stats, loading: statsLoading, refetch: refetchStats } = usePatientDashboard();
  const {
    appointments,
    loading: appointmentsLoading,
    error: appointmentsError,
    refetch: refetchAppointments,
  } = useAppointments();

  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation("dashboard");

  const doctorFallbackLabel = t("patient.appointments.doctor", { defaultValue: "Doctor" });

  // ✅ IMPORTANT: no hooks after this point (prevents "Rendered more hooks..." error)
  const upcomingAppointments = (() => {
    const list = Array.isArray(appointments) ? appointments : [];
    const today = startOfDay(new Date());

    const upcoming = list
      .filter((apt: any) => {
        const d = apt?.appointment_date ? new Date(apt.appointment_date) : null;
        if (!d || Number.isNaN(d.getTime())) return false;

        const day = startOfDay(d);
        const isUpcomingDay = isEqual(day, today) || isAfter(day, today);

        const status = String(apt?.status || "").toLowerCase();
        const okStatus = status !== "canceled" && status !== "cancelled" && status !== "completed";

        return isUpcomingDay && okStatus;
      })
      .sort((a: any, b: any) => {
        const ad = a?.appointment_date ? new Date(a.appointment_date).getTime() : 0;
        const bd = b?.appointment_date ? new Date(b.appointment_date).getTime() : 0;
        if (ad !== bd) return ad - bd;

        const at = String(a?.start_time || "");
        const bt = String(b?.start_time || "");
        return at.localeCompare(bt);
      });

    return upcoming.slice(0, 5);
  })();

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (!authLoading && user && !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!authLoading && profile && profile.role !== "patient") {
    return <Navigate to="/doctor-dashboard" replace />;
  }

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">
            {t("patient.loading", { defaultValue: "Loading dashboard..." })}
          </p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "dashboard", label: t("patient.navigation.dashboard", { defaultValue: "Dashboard" }), icon: Home },
    {
      id: "appointments",
      label: t("patient.navigation.myAppointments", { defaultValue: "My Appointments" }),
      icon: Calendar,
    },
    { id: "referrals", label: t("patient.navigation.referrals", { defaultValue: "My Referrals" }), icon: ArrowRightLeft },
    {
      id: "medications",
      label: t("patient.navigation.medications", { defaultValue: "Medications" }),
      icon: Pill,
    },
    {
      id: "records",
      label: t("patient.navigation.medicalRecords", { defaultValue: "Medical Records" }),
      icon: FileText,
    },
    { id: "test-results", label: t("patient.navigation.testResults", { defaultValue: "Test Results" }), icon: TestTube2 },
    {
      id: "treatment-plans",
      label: t("patient.navigation.treatmentPlans", { defaultValue: "Treatment Plans" }),
      icon: ClipboardList,
    },
    { id: "billing", label: t("patient.navigation.billing", { defaultValue: "Billing" }), icon: Receipt },
    { id: "settings", label: t("patient.navigation.settings", { defaultValue: "Settings" }), icon: Settings },
  ];

  const handleNavClick = (itemId: string) => {
    setActiveSection(itemId);
    setSidebarOpen(false);
  };

  async function acceptAppointment(appointmentId: string) {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "confirmed" as any })
        .eq("id", appointmentId);

      if (error) throw error;
      toast.success("Appointment accepted.");
      await Promise.allSettled([refetchAppointments?.(), refetchStats?.()]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to accept appointment");
    }
  }

  async function requestStartAppointment(appointmentId: string) {
    try {
      const { error } = await (supabase as any)
        .from("appointments")
        .update({
          start_requested_by_patient: true,
          patient_confirmation_status: "confirmed",
        })
        .eq("id", appointmentId);

      if (error) throw error;
      toast.success("Start request sent to doctor.");
      await Promise.allSettled([refetchAppointments?.(), refetchStats?.()]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to request start");
    }
  }

  async function rescheduleAppointment(apt: any) {
    const doctorId = asOne(apt?.doctor)?.id || apt?.doctor_id;
    if (doctorId) {
      navigate(`/book/${doctorId}?reschedule=${apt.id}`);
    } else {
      toast.error("Unable to reschedule - doctor information not available");
    }
  }

  async function declineAppointment(appointmentId: string) {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "canceled" as any })
        .eq("id", appointmentId);

      if (error) throw error;
      toast.success("Appointment declined.");
      await Promise.allSettled([refetchAppointments?.(), refetchStats?.()]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to decline appointment");
    }
  }

  async function cancelAppointment(appointmentId: string) {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "canceled" as any })
        .eq("id", appointmentId);

      if (error) throw error;
      toast.success("Appointment canceled.");
      await Promise.allSettled([refetchAppointments?.(), refetchStats?.()]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to cancel appointment");
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-sidebar-border">
            <DashboardBranding size="md" />
          </div>

          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sidebar-foreground truncate">{profile?.full_name || "Patient"}</p>
                <p className="text-sm text-sidebar-foreground/60 truncate">{profile?.email}</p>
              </div>

              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-sidebar-border space-y-2">
            <div className="flex items-center justify-between gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={async () => {
                try {
                  await signOut();
                } catch {
                  // ignore
                }
              }}
            >
              <LogOut className="h-4 w-4" />
              {t("patient.navigation.logout", { defaultValue: "Log Out" })}
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-semibold">MedicalBook</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationDropdown />
              <Button variant="outline" className="gap-2" onClick={() => navigate("/find-doctors")}>
                <Search className="h-4 w-4" />
                {t("patient.navigation.findDoctors", { defaultValue: "Find Doctors" })}
              </Button>
              <Button className="gap-2" onClick={() => navigate("/booking")}>
                <Plus className="h-4 w-4" />
                {t("patient.quickActions.bookAppointment", { defaultValue: "Book Appointment" })}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-6">
          {activeSection === "dashboard" && (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold">
                  {t("patient.welcome", { defaultValue: "Welcome" })}
                </h1>
                <p className="text-muted-foreground">
                  {t("patient.subtitle", { defaultValue: "Manage your health information and appointments." })}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t("patient.stats.upcomingAppointments", { defaultValue: "Upcoming Appointments" })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.upcomingAppointmentsCount ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {t("patient.stats.upcomingAppointmentsDesc", {
                        defaultValue: "Appointments scheduled in the future.",
                      })}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t("patient.stats.activeMedications", { defaultValue: "Active Medications" })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.pendingReminders ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {t("patient.stats.activeMedicationsDesc", {
                        defaultValue: "Medication reminders that are currently pending.",
                      })}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t("patient.stats.medicalRecords", { defaultValue: "Medical Records" })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.medicalRecordsCount ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {t("patient.stats.medicalRecordsDesc", {
                        defaultValue: "Records available in your profile.",
                      })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* ✅ Replaces Quick Actions: Upcoming Appointments */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle>{t("patient.dashboard.upcoming.title", { defaultValue: "Upcoming appointments" })}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t("patient.dashboard.upcoming.subtitle", { defaultValue: "Your next scheduled visits." })}
                    </p>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={() => setActiveSection("appointments")}>
                    <Calendar className="h-4 w-4" />
                    {t("patient.dashboard.upcoming.viewAll", { defaultValue: "View all" })}
                  </Button>
                </CardHeader>

                <CardContent className="space-y-3">
                  {appointmentsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : appointmentsError ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>{t("patient.appointments.loadError", { defaultValue: "Failed to load appointments." })}</p>
                      <Button variant="outline" className="mt-3" onClick={() => refetchAppointments?.()}>
                        {t("common.tryAgain", { defaultValue: "Try Again" })}
                      </Button>
                    </div>
                  ) : upcomingAppointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>{t("patient.dashboard.upcoming.none", { defaultValue: "No upcoming appointments." })}</p>
                      <Button variant="link" className="mt-1" onClick={() => navigate("/find-doctors")}>
                        {t("patient.appointments.bookFirst", { defaultValue: "Book your first appointment" })}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {upcomingAppointments.map((apt: any) => {
                        const doctorName = getDoctorName(apt, doctorFallbackLabel);
                        const route = appointmentRoute(apt);

                        return (
                          <div
                            key={apt.id}
                            className={cn(
                              "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4",
                              "hover:bg-accent/30 hover:border-accent-foreground/20 transition-colors",
                              route ? "cursor-pointer" : "cursor-default",
                            )}
                            role={route ? "button" : undefined}
                            tabIndex={route ? 0 : -1}
                            onClick={() => route && navigate(route)}
                            onKeyDown={(e) => {
                              if (!route) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                navigate(route);
                              }
                            }}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{doctorName}</p>
                                <Badge variant="secondary">{String(apt.status || "")}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {apt.appointment_date ? format(new Date(apt.appointment_date), "MMM dd, yyyy") : ""}{" "}
                                {apt.start_time ? `• ${apt.start_time}` : ""}
                              </p>
                            </div>

                            {String(apt.status || "").toLowerCase() === "confirmed" ? (
                              <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  className="gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    requestStartAppointment(String(apt.id));
                                  }}
                                  disabled={apt.start_requested_by_patient}
                                >
                                  <Clock className="h-4 w-4" />
                                  {apt.start_requested_by_patient
                                    ? t("patient.appointments.startRequested", { defaultValue: "Start Requested" })
                                    : t("patient.appointments.requestStart", { defaultValue: "Request Start" })}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    rescheduleAppointment(apt);
                                  }}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  {t("patient.appointments.reschedule", { defaultValue: "Reschedule" })}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelAppointment(String(apt.id));
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                  {t("patient.appointments.cancel", { defaultValue: "Cancel" })}
                                </Button>
                              </div>
                            ) : String(apt.status || "").toLowerCase() === "pending" ? (
                              <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  className="gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    acceptAppointment(String(apt.id));
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  {t("patient.appointments.accept", { defaultValue: "Accept" })}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    declineAppointment(String(apt.id));
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                  {t("patient.appointments.decline", { defaultValue: "Decline" })}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeSection === "appointments" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("patient.appointments.title", { defaultValue: "My Appointments" })}</CardTitle>
              </CardHeader>
              <CardContent>
                {appointmentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : appointmentsError ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t("patient.appointments.loadError", { defaultValue: "Failed to load appointments." })}</p>
                    <Button variant="outline" className="mt-4" onClick={() => refetchAppointments?.()}>
                      {t("common.tryAgain", { defaultValue: "Try Again" })}
                    </Button>
                  </div>
                ) : appointments && appointments.length > 0 ? (
                  <div className="space-y-3">
                    {appointments.map((apt: any) => {
                      const doctorName = getDoctorName(apt, doctorFallbackLabel);
                      const route = appointmentRoute(apt);

                      return (
                        <div
                          key={apt.id}
                          className={cn(
                            "flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 rounded-lg border",
                            "cursor-pointer hover:bg-accent/30 hover:border-accent-foreground/20 transition-colors",
                          )}
                          role="button"
                          tabIndex={0}
                          onClick={() => route && navigate(route)}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === " ") && route) {
                              e.preventDefault();
                              navigate(route);
                            }
                          }}
                        >
                          <div className="space-y-1">
                            <p className="font-medium">{doctorName}</p>
                            <p className="text-sm text-muted-foreground">
                              {apt.appointment_date ? format(new Date(apt.appointment_date), "MMM dd, yyyy") : ""}{" "}
                              {apt.start_time ? `at ${apt.start_time}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {t("patient.appointments.type", { defaultValue: "Type" })}:{" "}
                              {apt.appointment_type || "in_person"}
                            </p>
                          </div>

                          <div className="flex flex-col md:items-end gap-2">
                            <Badge>{apt.status}</Badge>

                            {apt.status === "pending" ? (
                              <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  className="gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    acceptAppointment(String(apt.id));
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  {t("patient.appointments.accept", { defaultValue: "Accept" })}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    declineAppointment(String(apt.id));
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                  {t("patient.appointments.decline", { defaultValue: "Decline" })}
                                </Button>
                              </div>
                            ) : apt.status === "confirmed" ? (
                              <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  className="gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    requestStartAppointment(String(apt.id));
                                  }}
                                  disabled={apt.start_requested_by_patient}
                                >
                                  <Clock className="h-4 w-4" />
                                  {apt.start_requested_by_patient
                                    ? t("patient.appointments.startRequested", { defaultValue: "Start Requested" })
                                    : t("patient.appointments.requestStart", { defaultValue: "Request Start" })}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    rescheduleAppointment(apt);
                                  }}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  {t("patient.appointments.reschedule", { defaultValue: "Reschedule" })}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelAppointment(String(apt.id));
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                  {t("patient.appointments.cancel", { defaultValue: "Cancel" })}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t("patient.appointments.noAppointments", { defaultValue: "No appointments scheduled" })}</p>
                    <Button variant="link" className="mt-2" onClick={() => navigate("/find-doctors")}>
                      {t("patient.appointments.bookFirst", { defaultValue: "Book your first appointment" })}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeSection === "medications" && <MedicationReminderDashboard />}
          {activeSection === "records" && <PatientMedicalRecords />}
          {activeSection === "test-results" && <PatientTestResultsSection />}
          {activeSection === "treatment-plans" && <PatientTreatmentPlans />}
          {activeSection === "billing" && <PatientBilling />}
          {activeSection === "referrals" && <PatientReferralsSection />}
          {activeSection === "settings" && <PatientSettingsPanel />}
        </main>
      </div>
    </div>
  );
}
