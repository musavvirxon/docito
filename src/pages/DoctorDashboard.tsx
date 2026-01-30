// File: src/pages/DoctorDashboard.tsx
import { useState, useEffect } from "react";
import { Settings, User, Calendar, BarChart3, Search, Briefcase, MessageSquare, Users, Building2, LogOut, Home, Clock, FileText, AlertCircle, Loader2, Sparkles, TrendingUp, Star, Activity } from "lucide-react";
import { DoctorDataProvider, useDoctorData } from "@/contexts/DoctorDataContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { DashboardBranding } from "@/components/dashboard/DashboardBranding";
import { AcceptNewPatientsToggle } from "@/components/doctor/AcceptNewPatientsToggle";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type DoctorStatus = "independent" | "clinic-member";

const DoctorDashboardContent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const {
    doctorProfile,
    stats,
    upcomingAppointments,
    loading,
    refreshAll,
    scheduleSettings
  } = useDoctorData();
  const [activeSection, setActiveSection] = useState("dashboard");
  
  // Deep-link support
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
  
  const { t } = useTranslation("dashboard");
  const doctorStatus: DoctorStatus = doctorProfile?.practice_id ? "clinic-member" : "independent";

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

  const calculateProfileCompletion = () => {
    if (!doctorProfile) return 0;
    let completedCount = 0;
    let totalCount = 10;

    if (doctorProfile.bio) completedCount++;
    if (doctorProfile.license_number) completedCount++;
    if (doctorProfile.consultation_fee) completedCount++;
    if (profile?.avatar_url) completedCount++;
    if (profile?.date_of_birth) completedCount++;
    if (profile?.phone) completedCount++;
    if (doctorProfile.specialty && doctorProfile.specialty !== "General Practice") completedCount++;
    if (stats && (stats as any).totalServices && (stats as any).totalServices > 0) completedCount++;
    if (doctorProfile.verified || doctorProfile.practice_id) completedCount++;
    if (scheduleSettings && scheduleSettings.working_days) completedCount++;
    
    return Math.round(completedCount / totalCount * 100);
  };

  const profileCompletion = calculateProfileCompletion();
  const isProfileIncomplete = profileCompletion < 80;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto relative z-10" />
          </div>
          <p className="text-lg font-medium text-foreground">{t("doctor.loading")}</p>
          <p className="text-sm text-muted-foreground">{t("doctor.settingUp")}</p>
        </div>
      </div>
    );
  }

  if (!doctorProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md border-0 shadow-2xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">{t("doctor.profileSetup.settingUp")}</h2>
            <p className="text-muted-foreground">{t("doctor.profileSetup.unableToLoad")}</p>
            <div className="space-y-2 pt-4">
              <Button onClick={refreshAll} className="w-full">
                {t("doctor.profileSetup.retryLoading")}
              </Button>
              <Button variant="ghost" onClick={() => navigate("/")} className="w-full">
                {t("doctor.profileSetup.goHome")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sidebarItems = doctorStatus === "independent" ? [
    { id: "dashboard", label: t("doctor.navigation.dashboard"), icon: Home },
    { id: "profile", label: t("doctor.navigation.myProfile"), icon: User },
    { id: "services", label: t("doctor.navigation.diagnoses", "Diagnoses"), icon: FileText },
    { id: "schedule", label: t("doctor.navigation.scheduleSettings"), icon: Clock },
    { id: "procedure-library", label: t("doctor.navigation.procedureLibrary"), icon: FileText },
    { id: "treatment-planning", label: t("doctor.navigation.treatmentPlanning"), icon: Calendar },
    { id: "assigned-patients", label: t("doctor.navigation.myPatients"), icon: Users },
    { id: "calendar", label: t("doctor.navigation.calendar"), icon: Calendar },
    { id: "messages", label: t("doctor.navigation.messages"), icon: MessageSquare },
    { id: "performance", label: t("doctor.navigation.performance"), icon: BarChart3 },
    { id: "financial-stats", label: t("doctor.navigation.financialStats"), icon: BarChart3 },
    { id: "clinic-finder", label: t("doctor.navigation.clinicFinder"), icon: Search },
    { id: "settings", label: t("doctor.navigation.settings"), icon: Settings }
  ] : [
    { id: "dashboard", label: t("doctor.navigation.dashboard"), icon: Home },
    { id: "profile", label: t("doctor.navigation.myProfile"), icon: User },
    { id: "assigned-services", label: t("doctor.navigation.diagnoses", "Diagnoses"), icon: Briefcase },
    { id: "schedule", label: t("doctor.navigation.scheduleSettings"), icon: Clock },
    { id: "procedure-library", label: t("doctor.navigation.procedureLibrary"), icon: FileText },
    { id: "treatment-planning", label: t("doctor.navigation.treatmentPlanning"), icon: Calendar },
    { id: "assigned-patients", label: t("doctor.navigation.myPatients"), icon: Users },
    { id: "calendar", label: t("doctor.navigation.calendar"), icon: Calendar },
    { id: "messages", label: t("doctor.navigation.messages"), icon: MessageSquare },
    { id: "performance", label: t("doctor.navigation.performance"), icon: BarChart3 },
    { id: "financial-stats", label: t("doctor.navigation.financialStats"), icon: BarChart3 },
    { id: "settings", label: t("doctor.navigation.settings"), icon: Settings }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <DoctorProfileSection />;
      case "services":
      case "assigned-services":
        return <DoctorServicesSection />;
      case "schedule":
        return <DoctorScheduleSettingsSection />;
      case "calendar":
        return <DoctorCalendarSection />;
      case "performance":
        return (
          <DoctorPerformanceSection 
            doctorProfile={{
              id: doctorProfile.id,
              specialty: doctorProfile.specialty || '',
              verified: doctorProfile.verified || false,
              average_rating: doctorProfile.average_rating || 0,
              num_reviews: doctorProfile.num_reviews || 0,
              appointment_count: (stats as any)?.totalAppointments || 0,
            }} 
            stats={stats} 
          />
        );
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
        return (
          <div className="space-y-8">
            {/* Profile Completion Alert */}
            {isProfileIncomplete && (
              <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                        {t("doctor.profileCompletion.incomplete")}
                      </h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        {t("doctor.profileCompletion.completeProfile", { percent: profileCompletion })}
                      </p>
                      <div className="mt-4 flex items-center gap-4">
                        <Progress value={profileCompletion} className="h-2 flex-1" />
                        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">{profileCompletion}%</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="mt-4 bg-amber-600 hover:bg-amber-700"
                        onClick={() => setActiveSection("profile")}
                      >
                        {t("doctor.profileCompletion.updateProfile")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{t("doctor.stats.totalAppointments")}</p>
                      <p className="text-4xl font-bold tracking-tight">{(stats as any)?.totalAppointments || 0}</p>
                      <p className="text-xs text-muted-foreground">total visits</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-transparent" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{t("doctor.stats.totalPatients")}</p>
                      <p className="text-4xl font-bold tracking-tight">{(stats as any)?.totalPatients || 0}</p>
                      <p className="text-xs text-muted-foreground">active patients</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                      <Users className="h-7 w-7 text-emerald-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-transparent" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{t("doctor.stats.rating")}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-4xl font-bold tracking-tight">{doctorProfile.average_rating?.toFixed(1) || "0.0"}</p>
                        <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                      </div>
                      <p className="text-xs text-muted-foreground">{doctorProfile.num_reviews || 0} reviews</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                      <TrendingUp className="h-7 w-7 text-amber-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-transparent" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{t("doctor.stats.earnings")}</p>
                      <p className="text-4xl font-bold tracking-tight">${(stats as any)?.totalEarnings || 0}</p>
                      <p className="text-xs text-muted-foreground">this month</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                      <Building2 className="h-7 w-7 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Upcoming Appointments */}
              <Card className="xl:col-span-2 border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t("doctor.upcomingAppointments")}</CardTitle>
                      <p className="text-sm text-muted-foreground">Your next scheduled visits</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveSection("calendar")}>
                    View Calendar
                  </Button>
                </CardHeader>
                <CardContent className="pt-6">
                  {upcomingAppointments?.length ? (
                    <UpcomingAppointmentCard appointments={upcomingAppointments.slice(0, 4)} />
                  ) : (
                    <div className="text-center py-12">
                      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">{t("doctor.noUpcomingAppointments")}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Access Panel */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-lg">Quick Access</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-4 h-14 hover:bg-primary/5 hover:border-primary/30 border border-transparent transition-all" 
                    onClick={() => setActiveSection("procedure-library")}
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">My Procedures</p>
                      <p className="text-xs text-muted-foreground">Custom templates</p>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-4 h-14 hover:bg-emerald-500/5 hover:border-emerald-500/30 border border-transparent transition-all" 
                    onClick={() => setActiveSection("treatment-planning")}
                  >
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Treatment Plans</p>
                      <p className="text-xs text-muted-foreground">Active plans</p>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-4 h-14 hover:bg-blue-500/5 hover:border-blue-500/30 border border-transparent transition-all" 
                    onClick={() => setActiveSection("assigned-patients")}
                  >
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">My Patients</p>
                      <p className="text-xs text-muted-foreground">Patient records</p>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-4 h-14 hover:bg-amber-500/5 hover:border-amber-500/30 border border-transparent transition-all" 
                    onClick={() => setActiveSection("services")}
                  >
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Briefcase className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">My Services</p>
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
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-lg">{t("doctor.quickActions")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center gap-3 hover:bg-primary/5 hover:border-primary/30 transition-all group" 
                    onClick={() => setQuickActionModal({ isOpen: true, action: "schedule" })}
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{t("doctor.actions.updateSchedule")}</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center gap-3 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all group" 
                    onClick={() => setQuickActionModal({ isOpen: true, action: "procedures" })}
                  >
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="h-5 w-5 text-emerald-500" />
                    </div>
                    <span className="text-sm font-medium">{t("doctor.actions.manageProcedures")}</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center gap-3 hover:bg-blue-500/5 hover:border-blue-500/30 transition-all group" 
                    onClick={() => setQuickActionModal({ isOpen: true, action: "block-time" })}
                  >
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Calendar className="h-5 w-5 text-blue-500" />
                    </div>
                    <span className="text-sm font-medium">Block Time</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-24 flex flex-col items-center justify-center gap-3 hover:bg-amber-500/5 hover:border-amber-500/30 transition-all group" 
                    onClick={() => setQuickActionModal({ isOpen: true, action: "settings" })}
                  >
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Settings className="h-5 w-5 text-amber-500" />
                    </div>
                    <span className="text-sm font-medium">{t("doctor.actions.updateSettings")}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <ThemeProvider>
        <div className="flex min-h-screen w-full bg-background">
          {/* Premium Sidebar */}
          <Sidebar className="border-r border-border/50">
            <SidebarContent className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-border/50">
                <DashboardBranding />
                <div className="flex items-center gap-3 mt-4">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "D"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{profile?.full_name}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {doctorProfile.specialty || "Doctor"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <AcceptNewPatientsToggle doctorId={doctorProfile.id} />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <ThemeToggle />
                  <LanguageSwitcher />
                  <NotificationDropdown />
                </div>
              </div>

              {/* Navigation with ScrollArea */}
              <ScrollArea className="flex-1">
                <SidebarGroup className="py-2">
                  <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 px-4">
                    {t("doctor.navigation.main")}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {sidebarItems.map(item => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton 
                            onClick={() => setActiveSection(item.id)} 
                            isActive={activeSection === item.id}
                            className={cn(
                              "mx-2 rounded-lg transition-all",
                              activeSection === item.id && "bg-primary/10 text-primary font-medium"
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </ScrollArea>

              {/* Footer */}
              <div className="p-4 border-t border-border/50 mt-auto">
                <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  {t("auth.logout")}
                </Button>
              </div>
            </SidebarContent>
          </Sidebar>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-screen">
            <header className="h-16 border-b border-border/50 flex items-center px-6 gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold">
                  {sidebarItems.find(item => item.id === activeSection)?.label || t("doctor.navigation.dashboard")}
                </h1>
              </div>
            </header>

            <main className="flex-1 overflow-auto">
              <div className="container max-w-7xl py-8 px-6">
                <ErrorBoundary>
                  {renderContent()}
                </ErrorBoundary>
              </div>
            </main>
          </div>

          <QuickActionModals 
            isOpen={quickActionModal.isOpen} 
            action={quickActionModal.action} 
            onClose={() => setQuickActionModal({ isOpen: false, action: null })} 
            doctorProfile={doctorProfile} 
          />
        </div>
      </ThemeProvider>
    </SidebarProvider>
  );
};

const DoctorDashboard = () => {
  return (
    <DoctorDataProvider>
      <DoctorDashboardContent />
    </DoctorDataProvider>
  );
};

export default DoctorDashboard;
