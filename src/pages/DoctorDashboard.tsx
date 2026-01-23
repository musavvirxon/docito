import { useState, useEffect } from "react";
import { Settings, User, Calendar, BarChart3, Search, Briefcase, MapPin, MessageSquare, Users, Building2, LogOut, Home, Clock, FileText, AlertCircle, Loader2 } from "lucide-react";
import { DoctorDataProvider, useDoctorData } from "@/contexts/DoctorDataContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DoctorProfileSection from "@/components/doctor/DoctorProfileSection";
import DoctorServicesSection from "@/components/doctor/DoctorServicesSection";
import DoctorCalendarSection from "@/components/doctor/DoctorCalendarSection";
import DoctorPerformanceSection from "@/components/doctor/DoctorPerformanceSection";
import ClinicFinderSection from "@/components/doctor/ClinicFinderSection";
import DoctorSettingsSection from "@/components/doctor/DoctorSettingsSection";
import DoctorPatientsSection from "@/components/doctor/patients/DoctorPatientsSection";
import DoctorMessagingSection from "@/components/doctor/DoctorMessagingSection";
import TreatmentPlanningSection from "@/components/doctor/TreatmentPlanningSection";
import DoctorScheduleSettingsSection from "@/components/doctor/DoctorScheduleSettingsSection";
import DoctorProcedureLibrarySection from "@/components/doctor/DoctorProcedureLibrarySection";
import { DoctorFinancialStatsSection } from "@/components/doctor/DoctorFinancialStatsSection";
import { UpcomingAppointmentCard } from "@/components/doctor/UpcomingAppointmentCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api/supabase-api";
import QuickActionModals from "@/components/doctor/QuickActionModals";
import ThemeToggle from "@/components/home/ThemeToggle";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { DoctorVerificationStatusCard } from "@/components/doctor/DoctorVerificationStatusCard";
import { DoctorReferralsSection } from "@/components/doctor/DoctorReferralsSection";
import { DashboardBranding } from "@/components/dashboard/DashboardBranding";
import { AcceptNewPatientsToggle } from "@/components/doctor/AcceptNewPatientsToggle";

type DoctorStatus = "independent" | "clinic-member";
const DoctorDashboardContent = () => {
  const navigate = useNavigate();
  const {
    user,
    profile
  } = useAuth();
  const {
    doctorProfile,
    stats,
    upcomingAppointments,
    recentAppointments,
    todaysAppointments,
    loading,
    refreshAll,
    scheduleSettings
  } = useDoctorData();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState("dashboard");

  useEffect(() => {
    const section = searchParams.get("section");
    if (section) setActiveSection(section);
  }, [searchParams]);
  const [quickActionModal, setQuickActionModal] = useState<{
    isOpen: boolean;
    action: "schedule" | "procedures" | "settings" | "block-time" | "add-service" | null;
  }>({
    isOpen: false,
    action: null
  });
  const {
    t
  } = useTranslation("dashboard");
  const doctorStatus: DoctorStatus = doctorProfile?.practice_id ? "clinic-member" : "independent";

  // Expose refresh function globally for child components
  useEffect(() => {
    (window as any).refreshDoctorProfile = refreshAll;
    return () => {
      delete (window as any).refreshDoctorProfile;
    };
  }, [refreshAll]);
  const handleLogout = async () => {
    await authApi.signOut();
    navigate("/");
  };

  // Calculate profile completion dynamically
  const calculateProfileCompletion = () => {
    if (!doctorProfile) return 0;
    let completedCount = 0;
    let totalCount = 10; // Total fields to check

    // Basic profile fields (6 fields)
    if (doctorProfile.bio) completedCount++;
    if (doctorProfile.license_number) completedCount++;
    if (doctorProfile.consultation_fee) completedCount++;
    if (profile?.avatar_url) completedCount++;
    if (profile?.date_of_birth) completedCount++;
    if (profile?.phone) completedCount++;

    // Professional fields (2 fields)
    if (doctorProfile.specialty && doctorProfile.specialty !== "General Practice") completedCount++;
    if (stats && (stats as any).totalServices && (stats as any).totalServices > 0) completedCount++;

    // Verification & practice (2 fields)
    if (doctorProfile.verified || doctorProfile.practice_id) completedCount++;
    if (scheduleSettings && scheduleSettings.working_days) completedCount++;
    return Math.round(completedCount / totalCount * 100);
  };
  const profileCompletion = calculateProfileCompletion();
  const isProfileIncomplete = profileCompletion < 80;
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-foreground">{t("doctor.loading")}</p>
          <p className="text-sm text-muted-foreground mt-2">{t("doctor.settingUp")}</p>
        </div>
      </div>;
  }

  // Show minimal interface for partial access
  if (!doctorProfile) {
    return <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md p-6 bg-card border border-border rounded-lg">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-destructive mb-2">
              {t("doctor.profileNotFound", "Doctor profile not found")}
            </h2>
            <p className="text-muted-foreground">
              {t("doctor.profileSetupRequired", "Your doctor profile needs to be set up. Please contact support if this continues.")}
            </p>
          </div>
          <Button onClick={refreshAll} className="w-full">
            {t("doctor.retry", "Retry")}
          </Button>
        </div>
      </div>;
  }
  const handleQuickAction = (action: "schedule" | "procedures" | "settings" | "block-time" | "add-service") => {
    setQuickActionModal({
      isOpen: true,
      action
    });
  };
  const closeQuickActionModal = () => {
    setQuickActionModal({
      isOpen: false,
      action: null
    });
  };
  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <div className="space-y-6">
            {/* Profile Completion Alert */}
            {isProfileIncomplete && <Card className="border-warning bg-warning/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-warning mb-1">
                        {t("doctor.completeProfile", "Complete your profile")}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {t("doctor.profileCompletion", "Your profile is {{percent}}% complete. Complete it to attract more patients.", {
                      percent: profileCompletion
                    })}
                      </p>
                      <Progress value={profileCompletion} className="mb-3" />
                      <Button size="sm" onClick={() => setActiveSection("profile")}>
                        {t("doctor.completeNow", "Complete Now")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("doctor.stats.patients", "Patients")}</p>
                      <p className="text-2xl font-bold">{stats?.totalPatients || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("doctor.stats.appointments", "Appointments")}</p>
                      <p className="text-2xl font-bold">{stats?.totalAppointments || 0}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("doctor.stats.revenue", "Revenue")}</p>
                      <p className="text-2xl font-bold">${stats?.totalRevenue || 0}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("doctor.stats.rating", "Rating")}</p>
                      <p className="text-2xl font-bold">{stats?.averageRating?.toFixed(1) || "0.0"}</p>
                    </div>
                    <User className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Verification Status */}
            <DoctorVerificationStatusCard />

            {/* Upcoming Appointment */}
            <UpcomingAppointmentCard />

            {/* Today's Appointments */}
            {todaysAppointments && todaysAppointments.length > 0 && <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {t("doctor.todaysAppointments", "Today's Appointments")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {todaysAppointments.map(appointment => <div key={appointment.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div>
                          <p className="font-medium">{appointment.patient_name || "Patient"}</p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.start_time} - {appointment.end_time}
                          </p>
                        </div>
                        <Badge variant={appointment.status === "confirmed" ? "default" : "secondary"}>
                          {appointment.status}
                        </Badge>
                      </div>)}
                  </div>
                </CardContent>
              </Card>}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>{t("doctor.quickActions", "Quick Actions")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" onClick={() => handleQuickAction("schedule")}>
                    <Calendar className="h-6 w-6" />
                    <span className="text-sm">{t("doctor.actions.schedule", "Schedule")}</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" onClick={() => handleQuickAction("procedures")}>
                    <FileText className="h-6 w-6" />
                    <span className="text-sm">{t("doctor.actions.procedures", "Procedures")}</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" onClick={() => handleQuickAction("add-service")}>
                    <Briefcase className="h-6 w-6" />
                    <span className="text-sm">{t("doctor.actions.addService", "Add Service")}</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" onClick={() => handleQuickAction("block-time")}>
                    <Clock className="h-6 w-6" />
                    <span className="text-sm">{t("doctor.actions.blockTime", "Block Time")}</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" onClick={() => handleQuickAction("settings")}>
                    <Settings className="h-6 w-6" />
                    <span className="text-sm">{t("doctor.actions.settings", "Settings")}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>;
      case "profile":
        return <DoctorProfileSection />;
      case "services":
        return <DoctorServicesSection />;
      case "calendar":
        return <DoctorCalendarSection />;
      case "performance":
        return <DoctorPerformanceSection />;
      case "clinic-finder":
        return <ClinicFinderSection />;
      case "settings":
        return <DoctorSettingsSection />;
      case "patients":
        return <DoctorPatientsSection />;
      case "messages":
        return <DoctorMessagingSection />;
      case "treatment":
        return <TreatmentPlanningSection />;
      case "schedule":
        return <DoctorScheduleSettingsSection />;
      case "procedures":
        return <DoctorProcedureLibrarySection />;
      case "financial":
        return <DoctorFinancialStatsSection />;
      case "referrals":
        return <DoctorReferralsSection />;
      default:
        return <div className="p-8 text-center text-muted-foreground">
            {t("doctor.sectionNotFound", "Section not found")}
          </div>;
    }
  };
  return <ThemeProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <Sidebar className="border-r border-border">
            <SidebarContent>
              {/* Branding */}
              <div className="p-4 border-b border-border">
                <DashboardBranding />
              </div>

              {/* Doctor Info */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {profile?.full_name?.split(" ").map(n => n[0]).join("") || "D"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{profile?.full_name || "Doctor"}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {doctorProfile.specialty}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <AcceptNewPatientsToggle />
                </div>
              </div>

              {/* Navigation */}
              <SidebarGroup>
                <SidebarGroupLabel>{t("doctor.navigation", "Navigation")}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveSection("dashboard")} isActive={activeSection === "dashboard"}>
                        <Home className="h-4 w-4" />
                        <span>{t("doctor.sections.dashboard", "Dashboard")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveSection("profile")} isActive={activeSection === "profile"}>
                        <User className="h-4 w-4" />
                        <span>{t("doctor.sections.profile", "Profile")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveSection("services")} isActive={activeSection === "services"}>
                        <Briefcase className="h-4 w-4" />
                        <span>{t("doctor.sections.services", "Services")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveSection("calendar")} isActive={activeSection === "calendar"}>
                        <Calendar className="h-4 w-4" />
                        <span>{t("doctor.sections.calendar", "Calendar")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveSection("patients")} isActive={activeSection === "patients"}>
                        <Users className="h-4 w-4" />
                        <span>{t("doctor.sections.patients", "Patients")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveSection("messages")} isActive={activeSection === "messages"}>
                        <MessageSquare className="h-4 w-4" />
                        <span>{t("doctor.sections.messages", "Messages")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveSection("treatment")} isActive={activeSection === "treatment"}>
                        <FileText className="h-4 w-4" />
                        <span>{t("doctor.sections.treatment", "Treatment")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveSection("performance")} isActive={activeSection === "performance"}>
                        <BarChart3 className="h-4 w-4" />
                        <span>{t("doctor.sections.performance", "Performance")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveSection("financial")} isActive={activeSection === "financial"}>
                        <BarChart3 className="h-4 w-4" />
                        <span>{t("doctor.sections.financial", "Financial")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveSection("referrals")} isActive={activeSection === "referrals"}>
                        <Users className="h-4 w-4" />
                        <span>{t("doctor.sections.referrals", "Referrals")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveSection("procedures")} isActive={activeSection === "procedures"}>
                        <FileText className="h-4 w-4" />
                        <span>{t("doctor.sections.procedures", "Procedures")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveSection("schedule")} isActive={activeSection === "schedule"}>
                        <Clock className="h-4 w-4" />
                        <span>{t("doctor.sections.schedule", "Schedule")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveSection("clinic-finder")} isActive={activeSection === "clinic-finder"}>
                        <MapPin className="h-4 w-4" />
                        <span>{t("doctor.sections.clinicFinder", "Clinic Finder")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveSection("settings")} isActive={activeSection === "settings"}>
                        <Settings className="h-4 w-4" />
                        <span>{t("doctor.sections.settings", "Settings")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {/* Bottom Actions */}
              <div className="mt-auto p-4 border-t border-border">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                      <span>{t("doctor.logout", "Logout")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </div>
            </SidebarContent>
          </Sidebar>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-xl font-semibold">
                  {t(`doctor.sections.${activeSection}`, activeSection)}
                </h1>
              </div>

              <div className="flex items-center gap-4">
                <ThemeToggle />
                <LanguageSwitcher />
                <NotificationDropdown />
              </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-auto p-6">
              {renderSection()}
            </main>
          </div>
        </div>

        {/* Quick Action Modals */}
        <QuickActionModals isOpen={quickActionModal.isOpen} action={quickActionModal.action} onClose={closeQuickActionModal} />
      </SidebarProvider>
    </ThemeProvider>;
};
const DoctorDashboard = () => {
  return <DoctorDataProvider>
      <DoctorDashboardContent />
    </DoctorDataProvider>;
};
export default DoctorDashboard;
