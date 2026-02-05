// File: src/pages/PatientDashboard.tsx
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
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
import DashboardBranding from "@/components/dashboard/DashboardBranding";
import { PatientBilling } from "@/components/patient/PatientBilling";
import { PatientPharmaciesSection } from "@/components/patient/PatientPharmaciesSection";
import { PatientLabsSection } from "@/components/patient/PatientLabsSection";
import { PatientImagingSection } from "@/components/patient/PatientImagingSection";
import { PatientReferralsSection } from "@/components/patient/PatientReferralsSection";
import { PatientTreatmentPlans } from "@/components/patient/PatientTreatmentPlans";
import { TimezoneNotice } from "@/components/time/TimezoneNotice";
import { useTimeZonesByUserIds } from "@/hooks/useTimeZonesByUserIds";
import { formatAppointmentForViewer } from "@/lib/appointmentTime";
import { getEffectiveTimeZone } from "@/lib/timezone";

type PatientDashboardSection =
  | "dashboard"
  | "appointments"
  | "prescriptions"
  | "records"
  | "treatment-plans"
  | "billing"
  | "referrals"
  | "pharmacies"
  | "labs"
  | "imaging"
  | "settings";

export default function PatientDashboard() {
  const { user, profile, signOut, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation("dashboard");

  const viewerTimeZone = useMemo(() => getEffectiveTimeZone((profile as any)?.timezone), [profile]);

  const doctorFallbackLabel = t("patient.appointments.doctor", { defaultValue: "Doctor" });

  const { appointments, isLoading: appointmentsLoading, error: appointmentsError, refetch: refetchAppointments } =
    useAppointments("patient");
  const { prescriptions, isLoading: prescriptionsLoading, error: prescriptionsError, refetch: refetchPrescriptions } =
    usePrescriptions();
  const { records, isLoading: recordsLoading, error: recordsError, refetch: refetchRecords } = useMedicalRecords();

  const [activeSection, setActiveSection] = useState<PatientDashboardSection>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const doctorUserIds = useMemo(() => {
    const list = Array.isArray(appointments) ? (appointments as any[]) : [];
    const ids = list
      .map((apt: any) => apt?.doctor?.user_id)
      .filter(Boolean)
      .map((id: any) => String(id));
    return Array.from(new Set(ids));
  }, [appointments]);

  const { map: doctorTimeZonesByUserId } = useTimeZonesByUserIds(doctorUserIds);

  // ✅ No hooks below this line (prevents hook-order runtime errors)
  const upcomingAppointments = (() => {
    const list = Array.isArray(appointments) ? appointments : [];
    const today = startOfDay(new Date());

    const upcoming = list.filter((apt: any) => {
      if (!apt?.appointment_date) return false;
      const date = startOfDay(new Date(apt.appointment_date));
      return isAfter(date, today) || isEqual(date, today);
    });

    return upcoming
      .sort((a: any, b: any) => {
        if (a.appointment_date !== b.appointment_date) {
          return new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
        }
        return (a.start_time || "").localeCompare(b.start_time || "");
      })
      .slice(0, 3);
  })();

  const appointmentRoute = (apt: any) => {
    if (apt?.appointment_type === "lab") return `/patient/appointments/lab/${apt.id}`;
    if (apt?.appointment_type === "imaging") return `/patient/appointments/imaging/${apt.id}`;
    if (apt?.appointment_type === "pharmacy") return `/patient/appointments/pharmacy/${apt.id}`;
    if (apt?.appointment_type === "clinic") return `/patient/appointments/clinic/${apt.id}`;
    return `/patient/appointments/${apt.id}`;
  };

  const sections: Array<{
    id: PatientDashboardSection;
    label: string;
    icon: any;
  }> = [
    { id: "dashboard", label: t("patient.nav.dashboard", { defaultValue: "Dashboard" }), icon: Home },
    { id: "appointments", label: t("patient.nav.appointments", { defaultValue: "Appointments" }), icon: Calendar },
    { id: "prescriptions", label: t("patient.nav.prescriptions", { defaultValue: "Prescriptions" }), icon: Pill },
    { id: "records", label: t("patient.nav.records", { defaultValue: "Medical Records" }), icon: FileText },
    {
      id: "treatment-plans",
      label: t("patient.nav.treatmentPlans", { defaultValue: "Treatment Plans" }),
      icon: ClipboardList,
    },
    { id: "billing", label: t("patient.nav.billing", { defaultValue: "Billing" }), icon: Receipt },
    { id: "referrals", label: t("patient.nav.referrals", { defaultValue: "Referrals" }), icon: ArrowRightLeft },
    { id: "pharmacies", label: t("patient.nav.pharmacies", { defaultValue: "Pharmacies" }), icon: Pill },
    { id: "labs", label: t("patient.nav.labs", { defaultValue: "Labs" }), icon: TestTube2 },
    { id: "imaging", label: t("patient.nav.imaging", { defaultValue: "Imaging" }), icon: Calendar },
    { id: "settings", label: t("patient.nav.settings", { defaultValue: "Settings" }), icon: Settings },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: t("patient.signOut.successTitle", { defaultValue: "Signed out" }),
        description: t("patient.signOut.successDesc", { defaultValue: "You have been signed out successfully." }),
      });
      navigate("/");
    } catch (error) {
      toast({
        title: t("patient.signOut.errorTitle", { defaultValue: "Error" }),
        description: t("patient.signOut.errorDesc", { defaultValue: "Failed to sign out. Please try again." }),
        variant: "destructive",
      });
    }
  };

  const renderSectionContent = () => {
    if (activeSection === "dashboard") {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("patient.dashboard.upcomingTitle", { defaultValue: "Upcoming Appointments" })}
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {appointmentsLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                  </div>
                ) : upcomingAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingAppointments.map((apt: any) => {
                      const doctorName = apt?.doctor?.profiles?.full_name || doctorFallbackLabel;
                      const address = apt?.practice?.address || apt?.doctor?.practices?.address;
                      const city = apt?.practice?.city || apt?.doctor?.practices?.city;
                      const location = [address, city].filter(Boolean).join(", ");

                      const route = appointmentRoute(apt);

                      const doctorUserId = String((apt as any)?.doctor?.user_id ?? "");
                      const sourceTimeZone = getEffectiveTimeZone(
                        doctorTimeZonesByUserId?.[doctorUserId] || viewerTimeZone,
                      );
                      const { combinedLabel: timeLabel } = formatAppointmentForViewer({
                        appt: apt as any,
                        sourceTimeZone,
                        viewerTimeZone,
                        includeEnd: false,
                      });

                      return (
                        <button
                          key={apt.id}
                          type="button"
                          onClick={() => navigate(route)}
                          className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/30 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                                {doctorName}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>{timeLabel}</span>
                              </div>
                              {location && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{location}</span>
                                </div>
                              )}
                            </div>
                            <div className="shrink-0">
                              <div
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  apt.status === "confirmed"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                    : apt.status === "cancelled"
                                      ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                }`}
                              >
                                {apt.status}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setActiveSection("appointments")}
                    >
                      {t("patient.dashboard.viewAllAppointments", { defaultValue: "View All Appointments" })}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      {t("patient.dashboard.noUpcoming", { defaultValue: "No upcoming appointments" })}
                    </p>
                    <Button size="sm" onClick={() => navigate("/find-doctors")}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("patient.dashboard.bookAppointment", { defaultValue: "Book Appointment" })}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("patient.dashboard.prescriptionsTitle", { defaultValue: "Active Prescriptions" })}
                </CardTitle>
                <Pill className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {prescriptionsLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  </div>
                ) : prescriptions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">{prescriptions.length}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("patient.dashboard.prescriptionsDesc", { defaultValue: "Medications currently prescribed" })}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setActiveSection("prescriptions")}
                    >
                      {t("patient.dashboard.viewPrescriptions", { defaultValue: "View Prescriptions" })}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      {t("patient.dashboard.noPrescriptions", { defaultValue: "No active prescriptions" })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("patient.dashboard.recordsTitle", { defaultValue: "Medical Records" })}
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {recordsLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                  </div>
                ) : records.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">{records.length}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("patient.dashboard.recordsDesc", { defaultValue: "Documents and test results available" })}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setActiveSection("records")}
                    >
                      {t("patient.dashboard.viewRecords", { defaultValue: "View Records" })}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      {t("patient.dashboard.noRecords", { defaultValue: "No medical records available" })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("patient.dashboard.quickActionsTitle", { defaultValue: "Quick Actions" })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" className="justify-start h-auto p-4" onClick={() => navigate("/find-doctors")}>
                  <Plus className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">{t("patient.actions.bookAppointment", { defaultValue: "Book Appointment" })}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("patient.actions.bookAppointmentDesc", { defaultValue: "Find and schedule with doctors" })}
                    </p>
                  </div>
                </Button>

                <Button variant="outline" className="justify-start h-auto p-4" onClick={() => setActiveSection("records")}>
                  <FileText className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">{t("patient.actions.viewRecords", { defaultValue: "View Records" })}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("patient.actions.viewRecordsDesc", { defaultValue: "Access your medical history" })}
                    </p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="justify-start h-auto p-4"
                  onClick={() => setActiveSection("prescriptions")}
                >
                  <Pill className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">
                      {t("patient.actions.prescriptions", { defaultValue: "Prescriptions" })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("patient.actions.prescriptionsDesc", { defaultValue: "Manage your medications" })}
                    </p>
                  </div>
                </Button>

                <Button variant="outline" className="justify-start h-auto p-4" onClick={() => setActiveSection("settings")}>
                  <Settings className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">{t("patient.actions.settings", { defaultValue: "Settings" })}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("patient.actions.settingsDesc", { defaultValue: "Update your preferences" })}
                    </p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (activeSection === "appointments") {
      return (
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>{t("patient.appointments.title", { defaultValue: "My Appointments" })}</CardTitle>
            <TimezoneNotice timeZone={viewerTimeZone} />
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="space-y-4">
                <div className="h-20 bg-muted rounded animate-pulse" />
                <div className="h-20 bg-muted rounded animate-pulse" />
                <div className="h-20 bg-muted rounded animate-pulse" />
              </div>
            ) : appointmentsError ? (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  {t("patient.appointments.loadErrorTitle", { defaultValue: "Failed to load appointments" })}
                </p>
                <p className="text-muted-foreground mb-4">{appointmentsError.message}</p>
                <Button onClick={refetchAppointments}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t("patient.appointments.retry", { defaultValue: "Try Again" })}
                </Button>
              </div>
            ) : appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((apt: any) => {
                  const doctorName = apt?.doctor?.profiles?.full_name || doctorFallbackLabel;
                  const address = apt?.practice?.address || apt?.doctor?.practices?.address;
                  const city = apt?.practice?.city || apt?.doctor?.practices?.city;
                  const location = [address, city].filter(Boolean).join(", ");

                  const route = appointmentRoute(apt);

                  const doctorUserId = String((apt as any)?.doctor?.user_id ?? "");
                  const sourceTimeZone = getEffectiveTimeZone(
                    doctorTimeZonesByUserId?.[doctorUserId] || viewerTimeZone,
                  );
                  const { combinedLabel: timeLabel } = formatAppointmentForViewer({
                    appt: apt as any,
                    sourceTimeZone,
                    viewerTimeZone,
                    includeEnd: false,
                  });

                  return (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => navigate(route)}
                      className="w-full text-left p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium group-hover:text-primary transition-colors truncate">
                              {doctorName}
                            </p>
                            <div
                              className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
                                apt.status === "confirmed"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  : apt.status === "cancelled"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                              }`}
                            >
                              {apt.status}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span>{timeLabel}</span>
                          </div>

                          {location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span className="truncate">{location}</span>
                            </div>
                          )}

                          {apt.notes && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {apt.notes}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center text-muted-foreground group-hover:text-primary transition-colors">
                          <ArrowRightLeft className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}

                <div className="pt-4 border-t">
                  <Button className="w-full" onClick={() => navigate("/find-doctors")}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("patient.appointments.bookNew", { defaultValue: "Book New Appointment" })}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  {t("patient.appointments.emptyTitle", { defaultValue: "No appointments yet" })}
                </p>
                <p className="text-muted-foreground mb-6">
                  {t("patient.appointments.emptyDesc", { defaultValue: "Book your first appointment with a doctor." })}
                </p>
                <Button onClick={() => navigate("/find-doctors")}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("patient.appointments.bookFirst", { defaultValue: "Book Appointment" })}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    if (activeSection === "prescriptions") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{t("patient.prescriptions.title", { defaultValue: "My Prescriptions" })}</CardTitle>
          </CardHeader>
          <CardContent>
            {prescriptionsLoading ? (
              <div className="space-y-4">
                <div className="h-16 bg-muted rounded animate-pulse" />
                <div className="h-16 bg-muted rounded animate-pulse" />
                <div className="h-16 bg-muted rounded animate-pulse" />
              </div>
            ) : prescriptionsError ? (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  {t("patient.prescriptions.loadErrorTitle", { defaultValue: "Failed to load prescriptions" })}
                </p>
                <p className="text-muted-foreground mb-4">{prescriptionsError.message}</p>
                <Button onClick={refetchPrescriptions}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t("patient.prescriptions.retry", { defaultValue: "Try Again" })}
                </Button>
              </div>
            ) : prescriptions.length > 0 ? (
              <div className="space-y-4">
                {prescriptions.map((rx: any) => (
                  <div key={rx.id} className="p-4 rounded-lg border border-border">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-medium">{rx.medication_name}</p>
                        <p className="text-sm text-muted-foreground">{rx.dosage}</p>
                        <p className="text-sm text-muted-foreground">{rx.frequency}</p>
                      </div>
                      <div className="shrink-0">
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rx.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                          }`}
                        >
                          {rx.status}
                        </div>
                      </div>
                    </div>
                    {rx.instructions && <p className="text-sm mt-3 text-muted-foreground">{rx.instructions}</p>}
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
                  {t("patient.prescriptions.emptyDesc", {
                    defaultValue: "You don't have any active prescriptions at the moment.",
                  })}
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
          <CardContent>
            {recordsLoading ? (
              <div className="space-y-4">
                <div className="h-16 bg-muted rounded animate-pulse" />
                <div className="h-16 bg-muted rounded animate-pulse" />
                <div className="h-16 bg-muted rounded animate-pulse" />
              </div>
            ) : recordsError ? (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  {t("patient.records.loadErrorTitle", { defaultValue: "Failed to load records" })}
                </p>
                <p className="text-muted-foreground mb-4">{recordsError.message}</p>
                <Button onClick={refetchRecords}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t("patient.records.retry", { defaultValue: "Try Again" })}
                </Button>
              </div>
            ) : records.length > 0 ? (
              <div className="space-y-4">
                {records.map((record: any) => (
                  <div key={record.id} className="p-4 rounded-lg border border-border">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-medium">{record.title}</p>
                        <p className="text-sm text-muted-foreground">{record.record_type}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => window.open(record.file_url, "_blank")}>
                        {t("patient.records.view", { defaultValue: "View" })}
                      </Button>
                    </div>
                    {record.description && (
                      <p className="text-sm mt-3 text-muted-foreground">{record.description}</p>
                    )}
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
      return <PatientReferralsSection />;
    }

    if (activeSection === "pharmacies") {
      return <PatientPharmaciesSection />;
    }

    if (activeSection === "labs") {
      return <PatientLabsSection />;
    }

    if (activeSection === "imaging") {
      return <PatientImagingSection />;
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
        <div className="animate-pulse text-muted-foreground">
          {t("patient.loading", { defaultValue: "Loading..." })}
        </div>
      </div>
    );
  }

  if (!user || profile?.role !== "patient") {
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
        <Button variant="ghost" className="w-full justify-start hover:bg-destructive/10 hover:text-destructive" onClick={handleSignOut}>
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
          <DashboardBranding compact />
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
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-80 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 min-h-screen p-6">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Welcome Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold">
                {t("patient.welcome", {
                  defaultValue: "Welcome back, {{name}}",
                  name: profile?.full_name?.split(" ")[0] || "Patient",
                })}
              </h1>
              <p className="text-muted-foreground">
                {t("patient.subtitle", { defaultValue: "Manage your healthcare in one place" })}
              </p>
            </div>

            {renderSectionContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
