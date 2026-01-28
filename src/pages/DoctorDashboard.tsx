// File: src/pages/DoctorDashboard.tsx
// src/pages/DoctorDashboard.tsx
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
import { ErrorBoundary } from "@/components/ErrorBoundary";

type DoctorStatus = "independent" | "clinic-member";
const DoctorDashboardContent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [activeSection, setActiveSection] = useState("dashboard");
  // Deep-link support (e.g. /doctor-dashboard?section=calendar&followupOf=...).
  useEffect(() => {
    const section = searchParams.get("section");
    if (!section) return;
    setActiveSection(section);
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
              {t("doctor.profileSetup.settingUp")}
            </h2>
            <p className="text-muted-foreground mb-4">{t("doctor.profileSetup.unableToLoad")}</p>
          </div>
          <div className="space-y-2">
            <Button onClick={refreshAll} className="w-full">
              {t("doctor.profileSetup.retryLoading")}
            </Button>
            
            <Button variant="ghost" onClick={() => navigate("/")} className="w-full">
              {t("doctor.profileSetup.goHome")}
            </Button>
          </div>
        </div>
      </div>;
  }

  // Independent doctors don't have "My Services" - moved to Clinic Admin
  // Messaging section added for all doctors, Referrals hidden (not available)
  const sidebarItems = doctorStatus === "independent" ? [{
    id: "dashboard",
    label: t("doctor.navigation.dashboard"),
    icon: Home
  }, {
    id: "profile",
    label: t("doctor.navigation.myProfile"),
    icon: User
  }, {
    id: "services",
    label: t("doctor.navigation.diagnoses", "Diagnoses"),
    icon: FileText
  }, {
    id: "schedule",
    label: t("doctor.navigation.scheduleSettings"),
    icon: Clock
  }, {
    id: "procedure-library",
    label: t("doctor.navigation.procedureLibrary"),
    icon: FileText
  }, {
    id: "treatment-planning",
    label: t("doctor.navigation.treatmentPlanning"),
    icon: Calendar
  }, {
    id: "assigned-patients",
    label: t("doctor.navigation.myPatients"),
    icon: Users
  }, {
    id: "calendar",
    label: t("doctor.navigation.calendar"),
    icon: Calendar
  }, {
    id: "messages",
    label: t("doctor.navigation.messages"),
    icon: MessageSquare
  }, {
    id: "performance",
    label: t("doctor.navigation.performance"),
    icon: BarChart3
  }, {
    id: "financial-stats",
    label: t("doctor.navigation.financialStats"),
    icon: BarChart3
  }, {
    id: "clinic-finder",
    label: t("doctor.navigation.clinicFinder"),
    icon: Search
  }, {
    id: "settings",
    label: t("doctor.navigation.settings"),
    icon: Settings
  }] : [{
    id: "dashboard",
    label: t("doctor.navigation.dashboard"),
    icon: Home
  }, {
    id: "profile",
    label: t("doctor.navigation.myProfile"),
    icon: User
  }, {
    id: "assigned-services",
    label: t("doctor.navigation.diagnoses", "Diagnoses"),
    icon: Briefcase
  }, {
    id: "schedule",
    label: t("doctor.navigation.scheduleSettings"),
    icon: Clock
  }, {
    id: "procedure-library",
    label: t("doctor.navigation.procedureLibrary"),
    icon: FileText
  }, {
    id: "treatment-planning",
    label: t("doctor.navigation.treatmentPlanning"),
    icon: Calendar
  }, {
    id: "assigned-patients",
    label: t("doctor.navigation.myPatients"),
    icon: Users
  }, {
    id: "calendar",
    label: t("doctor.navigation.calendar"),
    icon: Calendar
  }, {
    id: "messages",
    label: t("doctor.navigation.messages"),
    icon: MessageSquare
  }, {
    id: "performance",
    label: t("doctor.navigation.performance"),
    icon: BarChart3
  }, {
    id: "financial-stats",
    label: t("doctor.navigation.financialStats"),
    icon: BarChart3
  }, {
    id: "settings",
    label: t("doctor.navigation.settings"),
    icon: Settings
  }];
  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <DoctorProfileSection />;
      case "services":
        return <DoctorServicesSection />;
      case "assigned-services":
        return <DoctorServicesSection />;
      case "schedule":
        return <DoctorScheduleSettingsSection />;
      case "calendar":
        return <DoctorCalendarSection />;
      case "performance":
        return <DoctorPerformanceSection doctorProfile={{
          id: doctorProfile.id,
          specialty: doctorProfile.specialty || '',
          verified: doctorProfile.verified || false,
          average_rating: doctorProfile.average_rating || 0,
          num_reviews: doctorProfile.num_reviews || 0,
          appointment_count: (stats as any)?.totalAppointments || 0,
        }} stats={stats} />;
      case "financial-stats":
        return <DoctorFinancialStatsSection />;
      case "clinic-finder":
        return <ClinicFinderSection />;
      case "settings":
        return <DoctorSettingsSection />;
      case "assigned-patients":
        return <DoctorPatientsSection />;
      case "messages":
        return <DoctorMessagingSection />;
      case "treatment-planning":
        return <TreatmentPlanningSection />;
      case "procedure-library":
        return <DoctorProcedureLibrarySection />;
      default:
        return <div className="space-y-6">
            {/* Profile Completion Alert */}
            {isProfileIncomplete && <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                        {t("doctor.profileCompletion.incomplete")}
                      </h3>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                        {t("doctor.profileCompletion.completeProfile", {
                      percent: profileCompletion
                    })}
                      </p>
                      <div className="mt-3">
                        <Progress value={profileCompletion} className="h-2" />
                      </div>
                      <Button variant="outline" size="sm" className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900" onClick={() => setActiveSection("profile")}>
                        {t("doctor.profileCompletion.updateProfile")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>}

            {/* Modern Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/10 via-background to-background">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
                <CardContent className="p-5">
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("doctor.stats.totalAppointments")}</p>
                      <p className="text-3xl font-bold mt-1">{(stats as any)?.totalAppointments || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">total visits</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500/10 via-background to-background">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-8 translate-x-8" />
                <CardContent className="p-5">
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("doctor.stats.totalPatients")}</p>
                      <p className="text-3xl font-bold mt-1">{(stats as any)?.totalPatients || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">active patients</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                      <Users className="h-7 w-7 text-emerald-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500/10 via-background to-background">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8" />
                <CardContent className="p-5">
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("doctor.stats.rating")}</p>
                      <p className="text-3xl font-bold mt-1">{doctorProfile.average_rating?.toFixed(1) || "0.0"}</p>
                      <p className="text-xs text-muted-foreground mt-1">{doctorProfile.num_reviews || 0} reviews</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                      <BarChart3 className="h-7 w-7 text-amber-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500/10 via-background to-background">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-8 translate-x-8" />
                <CardContent className="p-5">
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("doctor.stats.earnings")}</p>
                      <p className="text-3xl font-bold mt-1">${(stats as any)?.totalEarnings || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">this month</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                      <Building2 className="h-7 w-7 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Two Column Layout: Appointments & Quick Access */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upcoming Appointments - 2 columns */}
              <Card className="lg:col-span-2 border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    {t("doctor.upcomingAppointments")}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveSection("calendar")}>
                    View Calendar
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingAppointments?.length ? <UpcomingAppointmentCard appointments={upcomingAppointments.slice(0, 3)} /> : <p className="text-muted-foreground text-center py-8">
                        {t("doctor.noUpcomingAppointments")}
                      </p>}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Access to Custom Procedures & Treatment Plans */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Quick Access</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 h-12 hover:bg-primary/5 hover:border-primary/30" 
                    onClick={() => setActiveSection("procedure-library")}
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">My Procedures</p>
                      <p className="text-xs text-muted-foreground">Custom templates</p>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 h-12 hover:bg-emerald-500/5 hover:border-emerald-500/30" 
                    onClick={() => setActiveSection("treatment-planning")}
                  >
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">Treatment Plans</p>
                      <p className="text-xs text-muted-foreground">Active plans</p>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 h-12 hover:bg-blue-500/5 hover:border-blue-500/30" 
                    onClick={() => setActiveSection("assigned-patients")}
                  >
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">My Patients</p>
                      <p className="text-xs text-muted-foreground">Patient records</p>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 h-12 hover:bg-amber-500/5 hover:border-amber-500/30" 
                    onClick={() => setActiveSection("services")}
                  >
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">My Services</p>
                      <p className="text-xs text-muted-foreground">Diagnoses & services</p>
                    </div>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Verification Status */}
            <DoctorVerificationStatusCard />

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>{t("doctor.quickActions")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30" onClick={() => setQuickActionModal({
                isOpen: true,
                action: "schedule"
              })}>
                    <Clock className="h-6 w-6 text-primary" />
                    {t("doctor.actions.updateSchedule")}
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-emerald-500/5 hover:border-emerald-500/30" onClick={() => setQuickActionModal({
                isOpen: true,
                action: "procedures"
              })}>
                    <FileText className="h-6 w-6 text-emerald-500" />
                    {t("doctor.actions.manageProcedures")}
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-blue-500/5 hover:border-blue-500/30" onClick={() => setQuickActionModal({
                isOpen: true,
                action: "block-time"
              })}>
                    <Calendar className="h-6 w-6 text-blue-500" />
                    Block Time
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-amber-500/5 hover:border-amber-500/30" onClick={() => setQuickActionModal({
                isOpen: true,
                action: "settings"
              })}>
                    <Settings className="h-6 w-6 text-amber-500" />
                    {t("doctor.actions.updateSettings")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>;
    }
  };
  return <SidebarProvider>
      <ThemeProvider>
        <div className="flex min-h-screen w-full bg-background">
          <Sidebar className="border-r border-border">
            <SidebarContent>
              {/* Header */}
              <div className="p-4 border-b border-border">
                <DashboardBranding />
                <div className="flex items-center gap-3 mt-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "D"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{profile?.full_name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {doctorProfile.specialty || "Doctor"}
                    </p>
                  </div>
                </div>

                {/* Accept New Patients Toggle */}
                <div className="mt-3">
                  <AcceptNewPatientsToggle doctorId={doctorProfile.id} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <ThemeToggle />
                  <LanguageSwitcher />
                  <NotificationDropdown />
                </div>
              </div>

              {/* Navigation */}
              <SidebarGroup>
                <SidebarGroupLabel>{t("doctor.navigation.main")}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {sidebarItems.map(item => <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton onClick={() => setActiveSection(item.id)} isActive={activeSection === item.id}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {/* Footer */}
              <div className="mt-auto p-4 border-t border-border">
                <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  {t("auth.logout")}
                </Button>
              </div>
            </SidebarContent>
          </Sidebar>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <header className="h-14 border-b border-border flex items-center px-4 gap-4">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">
                {sidebarItems.find(item => item.id === activeSection)?.label || t("doctor.navigation.dashboard")}
              </h1>
            </header>

            <main className="flex-1 p-6 overflow-auto">
              <ErrorBoundary>
                {renderContent()}
              </ErrorBoundary>
            </main>
          </div>

          {/* Quick Action Modals */}
          <QuickActionModals 
            isOpen={quickActionModal.isOpen} 
            action={quickActionModal.action} 
            onClose={() => setQuickActionModal({ isOpen: false, action: null })} 
            doctorProfile={doctorProfile} 
          />
        </div>
      </ThemeProvider>
    </SidebarProvider>;
};
const DoctorDashboard = () => {
  return <DoctorDataProvider>
      <DoctorDashboardContent />
    </DoctorDataProvider>;
};
export default DoctorDashboard;
