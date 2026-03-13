// File: src/pages/PatientDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isAfter, isEqual, startOfDay } from "date-fns";
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
  Stethoscope,
  TestTube2,
  User,
  X,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments } from "@/hooks/useAppointments";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { useMedicalRecords } from "@/hooks/useMedicalRecords";
import { DashboardBranding } from "@/components/dashboard/DashboardBranding";
import { PatientBilling } from "@/components/patient/PatientBilling";
import { PatientReferralsSection } from "@/components/patient/PatientReferralsSection";
import { PatientTreatmentPlans } from "@/components/patient/PatientTreatmentPlans";
import { PatientDiagnoses } from "@/components/patient/PatientDiagnoses";
import { PatientMedicalRecords } from "@/components/patient/PatientMedicalRecords";
import { useTimeZonesByUserIds } from "@/hooks/useTimeZonesByUserIds";
import { formatAppointmentForViewer } from "@/lib/appointmentTime";
import { getEffectiveTimeZone } from "@/lib/timezone";
import ProfileMenu from "@/components/dashboard/ProfileMenu";

type PatientDashboardSection =
  | "dashboard"
  | "appointments"
  | "prescriptions"
  | "records"
  | "treatment-plans"
  | "billing"
  | "referrals"
  | "settings";

export default function PatientDashboard() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation("dashboard");

  const [searchParams] = useSearchParams();

  const viewerTimeZone = useMemo(() => getEffectiveTimeZone((profile as any)?.timezone), [profile]);

  const doctorFallbackLabel = t("patient.appointments.doctor", { defaultValue: "Doctor" });

  const { appointments, loading: appointmentsLoading, error: appointmentsError, refetch: refetchAppointments } =
    useAppointments();
  const { prescriptions, loading: prescriptionsLoading } = usePrescriptions();
  const { records, loading: recordsLoading } = useMedicalRecords();

  const [activeSection, setActiveSection] = useState<PatientDashboardSection>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const deepLinkSection = searchParams.get("section");
  const deepLinkReferralId = searchParams.get("referral") || undefined;

  useEffect(() => {
    // Deep-link support: /patient-dashboard?section=referrals&referral=<id>
    if (deepLinkReferralId) {
      setActiveSection("referrals");
      return;
    }

    const section = deepLinkSection as PatientDashboardSection | null;
    const allowed: PatientDashboardSection[] = [
      "dashboard",
      "appointments",
      "prescriptions",
      "records",
      "treatment-plans",
      "billing",
      "referrals",
      "settings",
    ];
    if (section && allowed.includes(section)) {
      setActiveSection(section);
    }
  }, [deepLinkReferralId, deepLinkSection]);

  const doctorUserIds = useMemo(() => {
    const ids = new Set<string>();
    (appointments || []).forEach((a: any) => {
      const uid = a?.doctor?.user_id || a?.doctor_user_id;
      if (uid) ids.add(uid);
    });
    return Array.from(ids);
  }, [appointments]);

  const { byUserId: timeZonesByUserId } = useTimeZonesByUserIds({
    userIds: doctorUserIds,
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error: any) {
      toast({
        title: t("common.error", { defaultValue: "Error" }),
        description: error?.message || t("patient.signOut.error", { defaultValue: "Failed to sign out" }),
        variant: "destructive",
      });
    }
  };

  const sections = useMemo(
    () => [
      {
        id: "dashboard" as const,
        icon: Home,
        label: t("patient.menu.dashboard", { defaultValue: "Dashboard" }),
      },
      {
        id: "appointments" as const,
        icon: Calendar,
        label: t("patient.menu.appointments", { defaultValue: "Appointments" }),
      },
      {
        id: "prescriptions" as const,
        icon: Pill,
        label: t("patient.menu.prescriptions", { defaultValue: "Prescriptions" }),
      },
      {
        id: "records" as const,
        icon: FileText,
        label: t("patient.menu.records", { defaultValue: "Medical Records" }),
      },
      {
        id: "treatment-plans" as const,
        icon: ClipboardList,
        label: t("patient.menu.treatmentPlans", { defaultValue: "Treatment Plans" }),
      },
      {
        id: "billing" as const,
        icon: Receipt,
        label: t("patient.menu.billing", { defaultValue: "Billing" }),
      },
      {
        id: "referrals" as const,
        icon: ArrowRightLeft,
        label: t("patient.menu.referrals", { defaultValue: "Referrals" }),
      },
      {
        id: "settings" as const,
        icon: Settings,
        label: t("patient.menu.settings", { defaultValue: "Settings" }),
      },
    ],
    [t]
  );

  const renderSectionContent = () => {
    if (activeSection === "dashboard") {
      const today = startOfDay(new Date());
      const upcoming = (appointments || []).filter((a: any) => {
        const d = startOfDay(new Date(a.appointment_date));
        return isAfter(d, today) || isEqual(d, today);
      });

      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("patient.welcome.title", { defaultValue: "Welcome back" })}</CardTitle>
              <div className="mt-2">
                <TimezoneNotice timezone={viewerTimeZone} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="w-full sm:w-auto" onClick={() => setActiveSection("appointments")}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("patient.welcome.book", { defaultValue: "Book appointment" })}
                </Button>
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/find-doctors")}>
                  <Search className="h-4 w-4 mr-2" />
                  {t("patient.welcome.findDoctor", { defaultValue: "Find a doctor" })}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {t("patient.stats.upcoming", { defaultValue: "Upcoming" })}
                  </div>
                  <div className="text-2xl font-semibold mt-2">{upcoming.length}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Pill className="h-4 w-4" />
                    {t("patient.stats.prescriptions", { defaultValue: "Prescriptions" })}
                  </div>
                  <div className="text-2xl font-semibold mt-2">{(prescriptions || []).length}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {t("patient.stats.records", { defaultValue: "Records" })}
                  </div>
                  <div className="text-2xl font-semibold mt-2">{(records || []).length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("patient.dashboard.upcomingTitle", { defaultValue: "Upcoming appointments" })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointmentsLoading ? (
                <div className="text-sm text-muted-foreground">{t("patient.loading", { defaultValue: "Loading..." })}</div>
              ) : upcoming.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {t("patient.dashboard.upcomingEmpty", { defaultValue: "No upcoming appointments." })}
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.slice(0, 3).map((a: any) => {
                    const doctorTz = timeZonesByUserId[a?.doctor?.user_id || a?.doctor_user_id] || viewerTimeZone;
                    const formatted = formatAppointmentForViewer({
                      appt: { appointment_date: a.appointment_date, start_time: a.start_time, end_time: a.end_time },
                      sourceTimeZone: doctorTz,
                      viewerTimeZone,
                    });

                    return (
                      <div key={a.id} className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {a?.doctor?.profiles?.full_name || a?.doctor_name || doctorFallbackLabel}
                          </div>
                          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatted.dateLabel}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatted.timeLabel}
                            </span>
                            {a?.location ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {a.location}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/appointment-session/${a.id}`)}>
                            {t("patient.appointments.open", { defaultValue: "Open" })}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="pt-2">
                <Button variant="ghost" onClick={() => setActiveSection("appointments")} className="px-0">
                  {t("patient.dashboard.viewAll", { defaultValue: "View all appointments" })}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (activeSection === "appointments") {
      const today = startOfDay(new Date());
      const upcoming = (appointments || []).filter((a: any) => {
        const d = startOfDay(new Date(a.appointment_date));
        return isAfter(d, today) || isEqual(d, today);
      });
      const past = (appointments || []).filter((a: any) => {
        const d = startOfDay(new Date(a.appointment_date));
        return isAfter(today, d);
      });

      return (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>{t("patient.appointments.title", { defaultValue: "Appointments" })}</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => refetchAppointments()} disabled={appointmentsLoading}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t("patient.appointments.refresh", { defaultValue: "Refresh" })}
                </Button>
                <Button onClick={() => navigate("/find-doctors")}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("patient.appointments.book", { defaultValue: "Book" })}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mt-2">
                <TimezoneNotice timezone={viewerTimeZone} />
              </div>

              {appointmentsError ? (
                <div className="text-sm text-destructive">{appointmentsError}</div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {t("patient.appointments.upcoming", { defaultValue: "Upcoming" })} ({upcoming.length})
                </div>

                {appointmentsLoading ? (
                  <div className="text-sm text-muted-foreground">{t("patient.loading", { defaultValue: "Loading..." })}</div>
                ) : upcoming.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {t("patient.appointments.upcomingEmpty", { defaultValue: "No upcoming appointments." })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((a: any) => {
                      const doctorTz = timeZonesByUserId[a?.doctor?.user_id || a?.doctor_user_id] || viewerTimeZone;
                      const formatted = formatAppointmentForViewer({
                        appt: { appointment_date: a.appointment_date, start_time: a.start_time, end_time: a.end_time },
                        sourceTimeZone: doctorTz,
                        viewerTimeZone,
                      });

                      return (
                        <div
                          key={a.id}
                          className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="font-medium">
                              {a?.doctor?.profiles?.full_name || a?.doctor_name || doctorFallbackLabel}
                            </div>
                            <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatted.dateLabel}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {formatted.timeLabel}
                              </span>
                              {a?.location ? (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {a.location}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => navigate(`/appointment-session/${a.id}`)}>
                              {t("patient.appointments.open", { defaultValue: "Open" })}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  {t("patient.appointments.past", { defaultValue: "Past" })} ({past.length})
                </div>

                {appointmentsLoading ? (
                  <div className="text-sm text-muted-foreground">{t("patient.loading", { defaultValue: "Loading..." })}</div>
                ) : past.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {t("patient.appointments.pastEmpty", { defaultValue: "No past appointments." })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {past.map((a: any) => {
                      const doctorTz = timeZonesByUserId[a?.doctor?.user_id || a?.doctor_user_id] || viewerTimeZone;
                      const formatted = formatAppointmentForViewer({
                        appt: { appointment_date: a.appointment_date, start_time: a.start_time, end_time: a.end_time },
                        sourceTimeZone: doctorTz,
                        viewerTimeZone,
                      });

                      return (
                        <div key={a.id} className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 opacity-80">
                          <div className="space-y-1">
                            <div className="font-medium">
                              {a?.doctor?.profiles?.full_name || a?.doctor_name || doctorFallbackLabel}
                            </div>
                            <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatted.dateLabel}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {formatted.timeLabel}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => navigate(`/appointment-session/${a.id}`)}>
                              {t("patient.appointments.open", { defaultValue: "Open" })}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (activeSection === "prescriptions") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{t("patient.prescriptions.title", { defaultValue: "Prescriptions" })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mt-2">
              <TimezoneNotice timezone={viewerTimeZone} />
            </div>

            {prescriptionsLoading ? (
              <div className="text-sm text-muted-foreground">{t("patient.loading", { defaultValue: "Loading..." })}</div>
            ) : prescriptions && prescriptions.length > 0 ? (
              <div className="space-y-3">
                {prescriptions.map((rx: any) => (
                  <div key={rx.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{rx.medication_name || rx.title || "Prescription"}</div>
                      <div className="text-xs text-muted-foreground">{rx.status || ""}</div>
                    </div>
                    {rx.instructions ? <div className="text-sm text-muted-foreground">{rx.instructions}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  {t("patient.prescriptions.emptyTitle", { defaultValue: "No prescriptions" })}
                </p>
                <p className="text-muted-foreground">
                  {t("patient.prescriptions.emptyDesc", { defaultValue: "You don't have any prescriptions yet." })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    if (activeSection === "records") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{t("patient.records.title", { defaultValue: "Medical Records" })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mt-2">
              <TimezoneNotice timezone={viewerTimeZone} />
            </div>

            {recordsLoading ? (
              <div className="text-sm text-muted-foreground">{t("patient.loading", { defaultValue: "Loading..." })}</div>
            ) : records && records.length > 0 ? (
              <div className="space-y-3">
                {records.map((record: any) => (
                  <div key={record.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{record.title || "Record"}</div>
                      <div className="text-xs text-muted-foreground">{record.created_at ? new Date(record.created_at).toLocaleDateString() : ""}</div>
                    </div>
                    {record.description ? (
                      <p className="text-sm mt-3 text-muted-foreground">{record.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  {t("patient.records.emptyTitle", { defaultValue: "No medical records" })}
                </p>
                <p className="text-muted-foreground">
                  {t("patient.records.emptyDesc", { defaultValue: "No medical records are available at the moment." })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    if (activeSection === "treatment-plans") {
      return <PatientTreatmentPlans />;
    }

    if (activeSection === "billing") {
      return <PatientBilling />;
    }

    if (activeSection === "referrals") {
      return <PatientReferralsSection initialReferralId={deepLinkReferralId} />;
    }

    if (activeSection === "settings") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{t("patient.settings.title", { defaultValue: "Settings" })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/patient/profile")}>
              <User className="h-4 w-4 mr-2" />
              {t("patient.settings.profile", { defaultValue: "Edit Profile" })}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              {t("patient.settings.preferences", { defaultValue: "Preferences" })}
            </Button>
            <Button variant="destructive" className="w-full justify-start" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              {t("patient.settings.signOut", { defaultValue: "Sign Out" })}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t("patient.loading", { defaultValue: "Loading..." })}</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const SidebarContent = () => (
    <div className="space-y-4">
      <DashboardBranding />
      <div className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <Button
              key={section.id}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start ${isActive ? "" : "hover:bg-muted"}`}
              onClick={() => {
                setActiveSection(section.id);
                setMobileMenuOpen(false);
              }}
            >
              <Icon className="h-4 w-4 mr-2" />
              {section.label}
            </Button>
          );
        })}
      </div>
      <div className="pt-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t("patient.signOut.label", { defaultValue: "Sign Out" })}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <DashboardBranding size="sm" />
          <div className="flex items-center gap-2">
            <ProfileMenu compact />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 border-r min-h-screen p-6">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="hidden lg:flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">
                  {t("patient.title", { defaultValue: "Patient Dashboard" })}
                </h1>
                <p className="text-muted-foreground">
                  {t("patient.subtitle", { defaultValue: "Manage appointments, prescriptions, records and more." })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => navigate("/notifications")}>
                  <TestTube2 className="h-4 w-4 mr-2" />
                  {t("patient.nav.notifications", { defaultValue: "Notifications" })}
                </Button>
                <ProfileMenu />
              </div>
            </div>

            {renderSectionContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
