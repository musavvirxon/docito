// File: src/pages/PatientDashboard.tsx
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments } from "@/hooks/useAppointments";
import { usePatientDashboard } from "@/hooks/usePatientDashboard";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  Calendar,
  Settings,
  User,
  LogOut,
  FileText,
  Pill,
  Home,
  Search,
  Plus,
  Clock,
  MapPin,
  Menu,
  X,
  Receipt,
  ClipboardList,
  TestTube2,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { MedicationReminderDashboard } from "@/components/medication/MedicationReminderDashboard";
import { PatientSettingsPanel } from "@/components/patient/PatientSettingsPanel";
import { PatientMedicalRecords } from "@/components/patient/PatientMedicalRecords";
import { PatientTreatmentPlans } from "@/components/patient/PatientTreatmentPlans";
import { PatientBilling } from "@/components/patient/PatientBilling";
import { PatientTestResultsSection } from "@/components/patient/PatientTestResultsSection";
import ThemeToggle from "@/components/home/ThemeToggle";
import { PatientReferralsSection } from "@/components/patient/PatientReferralsSection";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DashboardBranding } from "@/components/dashboard/DashboardBranding";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function getDoctorNameFromAppointment(apt: any, fallback: string) {
  const doctor = Array.isArray(apt?.doctor) ? apt.doctor?.[0] : apt?.doctor;
  const profiles = Array.isArray(doctor?.profiles) ? doctor.profiles?.[0] : doctor?.profiles;
  const fullName =
    (profiles?.full_name && String(profiles.full_name).trim()) ||
    (doctor?.profiles?.full_name && String(doctor.profiles.full_name).trim()) ||
    (doctor?.full_name && String(doctor.full_name).trim()) ||
    "";
  return fullName || fallback;
}

function appointmentClickRoute(apt: any) {
  // Keep it simple: confirmation always exists and is safe to view
  const id = apt?.id ? String(apt.id) : "";
  return id ? `/booking-confirmation/${id}` : "";
}

const PatientDashboard = () => {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const { stats, loading: statsLoading } = usePatientDashboard();
  const { appointments, loading: appointmentsLoading, refetch: refetchAppointments } = useAppointments();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation("dashboard");

  // Redirect if not authenticated or not a patient
  if (!authLoading && (!user || profile?.role !== "patient")) {
    return <Navigate to="/auth" replace />;
  }

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">{t("patient.loading")}</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "dashboard", label: t("patient.navigation.dashboard"), icon: Home },
    { id: "appointments", label: t("patient.navigation.myAppointments"), icon: Calendar },
    { id: "referrals", label: "My Referrals", icon: ArrowRightLeft },
    { id: "medications", label: t("patient.navigation.medications"), icon: Pill },
    { id: "records", label: t("patient.navigation.medicalRecords"), icon: FileText },
    { id: "test-results", label: "Test Results", icon: TestTube2 },
    { id: "treatment-plans", label: "Treatment Plans", icon: ClipboardList },
    { id: "billing", label: "Billing", icon: Receipt },
    { id: "settings", label: t("patient.navigation.settings"), icon: Settings },
  ];

  const handleNavClick = (itemId: string) => {
    if (itemId === "find-doctors") {
      navigate("/find-doctors");
    } else {
      setActiveSection(itemId);
    }
    setSidebarOpen(false);
  };

  async function acceptAppointment(appointmentId: string) {
    try {
      const { error } = await supabase.from("appointments").update({ status: "confirmed" as any }).eq("id", appointmentId);

      if (error) throw error;
      toast.success("Appointment accepted.");
      refetchAppointments?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to accept appointment");
    }
  }

  async function declineAppointment(appointmentId: string) {
    try {
      const { error } = await supabase.from("appointments").update({ status: "canceled" as any }).eq("id", appointmentId);

      if (error) throw error;
      toast.success("Appointment declined.");
      refetchAppointments?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to decline appointment");
    }
  }

  const doctorFallbackLabel = useMemo(() => t("patient.appointments.doctor"), [t]);

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
          {/* Branding */}
          <div className="p-4 border-b border-sidebar-border">
            <DashboardBranding size="md" />
          </div>

          {/* User Profile Section */}
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

          {/* Navigation Items */}
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
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => navigate("/find-doctors")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <Search className="h-5 w-5 flex-shrink-0" />
              <span>{t("patient.navigation.findDoctors")}</span>
            </button>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={signOut}
            >
              <LogOut className="mr-3 h-5 w-5" />
              {t("patient.navigation.logout")}
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            <h1 className="text-xl font-semibold flex-1">
              {navItems.find((item) => item.id === activeSection)?.label || t("patient.title")}
            </h1>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
              <NotificationDropdown />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{t("patient.stats.upcomingAppointments")}</p>
                        <p className="text-3xl font-bold">{stats?.upcomingAppointmentsCount || 0}</p>
                      </div>
                      <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-950/30">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{t("patient.stats.medicalRecords")}</p>
                        <p className="text-3xl font-bold">{stats?.medicalRecordsCount || 0}</p>
                      </div>
                      <div className="p-3 rounded-full bg-green-50 dark:bg-green-950/30">
                        <FileText className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{t("patient.stats.pendingReminders")}</p>
                        <p className="text-3xl font-bold">{stats?.pendingReminders || 0}</p>
                      </div>
                      <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-950/30">
                        <Pill className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{t("patient.stats.nextAppointment")}</p>
                        <p className="text-lg font-bold">
                          {stats?.nextAppointment ? format(new Date(stats.nextAppointment.appointment_date), "MMM dd") : t("patient.stats.none")}
                        </p>
                      </div>
                      <div className="p-3 rounded-full bg-yellow-50 dark:bg-yellow-950/30">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t("patient.quickActions.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Button variant="outline" className="justify-start" onClick={() => navigate("/find-doctors")}>
                      <Search className="mr-2 h-4 w-4" />
                      {t("patient.quickActions.findDoctors")}
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={() => navigate("/find-doctors")}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("patient.quickActions.bookAppointment")}
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={() => setActiveSection("appointments")}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {t("patient.quickActions.viewAppointments")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {stats?.nextAppointment && (
                <Card
                  className="cursor-pointer hover:bg-accent/30 transition-colors"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const route = appointmentClickRoute(stats.nextAppointment);
                    if (route) navigate(route);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      const route = appointmentClickRoute(stats.nextAppointment);
                      if (route) navigate(route);
                    }
                  }}
                >
                  <CardHeader>
                    <CardTitle>{t("patient.nextAppointment.title")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <p className="font-medium">
                          {format(new Date(stats.nextAppointment.appointment_date), "EEEE, MMMM dd, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {stats.nextAppointment.start_time} - {stats.nextAppointment.end_time}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{t("patient.nextAppointment.location")}</span>
                        </div>
                      </div>
                      <Badge>{stats.nextAppointment.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeSection === "appointments" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("patient.appointments.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                {appointmentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : appointments && appointments.length > 0 ? (
                  <div className="space-y-3">
                    {appointments.map((apt: any) => {
                      const doctorName = getDoctorNameFromAppointment(apt, doctorFallbackLabel);
                      const route = appointmentClickRoute(apt);

                      return (
                        <div
                          key={apt.id}
                          className={cn(
                            "flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 rounded-lg border",
                            "cursor-pointer hover:bg-accent/30 hover:border-accent-foreground/20 transition-colors",
                          )}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (route) navigate(route);
                          }}
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
                              {format(new Date(apt.appointment_date), "MMM dd, yyyy")} at {apt.start_time}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">Type: {apt.appointment_type || "in_person"}</p>
                          </div>

                          <div className="flex flex-col md:items-end gap-2">
                            <Badge>{apt.status}</Badge>

                            {apt.status === "pending" ? (
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  className="gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    acceptAppointment(apt.id);
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    declineAppointment(apt.id);
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                  Decline
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
                    <p>{t("patient.appointments.noAppointments")}</p>
                    <Button variant="link" className="mt-2" onClick={() => navigate("/find-doctors")}>
                      {t("patient.appointments.bookFirst")}
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
};

export default PatientDashboard;
