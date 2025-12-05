import { useState, useEffect } from "react";
import { Bell, Settings, User, Calendar, BarChart3, Search, Briefcase, MapPin, MessageSquare, Users, Building2, LogOut, Home, Clock, FileText, AlertCircle, Loader2 } from "lucide-react";
import { DoctorDataProvider, useDoctorData } from "@/contexts/DoctorDataContext";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
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
import InternalMessagingSection from "@/components/doctor/InternalMessagingSection";
import TreatmentPlanningSection from "@/components/doctor/TreatmentPlanningSection";
import DoctorScheduleSettingsSection from "@/components/doctor/DoctorScheduleSettingsSection";
import DoctorProcedureLibrarySection from "@/components/doctor/DoctorProcedureLibrarySection";
import { DoctorFinancialStatsSection } from "@/components/doctor/DoctorFinancialStatsSection";
import { UpcomingAppointmentCard } from "@/components/doctor/UpcomingAppointmentCard";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api/supabase-api";
import QuickActionModals from "@/components/doctor/QuickActionModals";
import ThemeToggle from "@/components/home/ThemeToggle";
import { DoctorVerificationStatusCard } from "@/components/doctor/DoctorVerificationStatusCard";
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
  const [activeSection, setActiveSection] = useState("dashboard");
  const [quickActionModal, setQuickActionModal] = useState<{
    isOpen: boolean;
    action: 'schedule' | 'procedures' | 'settings' | 'block-time' | 'add-service' | null;
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
    navigate('/');
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
    if (doctorProfile.specialty && doctorProfile.specialty !== 'General Practice') completedCount++;
    if (stats && (stats as any).totalServices && (stats as any).totalServices > 0) completedCount++; // Has added services

    // Verification & practice (2 fields)
    if (doctorProfile.verified || doctorProfile.practice_id) completedCount++;
    if (scheduleSettings && scheduleSettings.working_days) completedCount++; // Schedule configured

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
            <h2 className="text-xl font-semibold text-destructive mb-2">{t("doctor.profileSetup.settingUp")}</h2>
            <p className="text-muted-foreground mb-4">
              {t("doctor.profileSetup.unableToLoad")}
            </p>
          </div>
          <div className="space-y-2">
            <Button onClick={refreshAll} className="w-full">
              {t("doctor.profileSetup.retryLoading")}
            </Button>
            <Button variant="outline" onClick={() => navigate('/doctor-signup')} className="w-full">
              {t("doctor.profileSetup.completeSetup")}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/')} className="w-full">
              {t("doctor.profileSetup.goHome")}
            </Button>
          </div>
        </div>
      </div>;
  }

  // Add safety check for doctorProfile
  if (!loading && !doctorProfile) {
    return <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md p-6 bg-card border border-border rounded-lg">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-destructive mb-2">{t("doctor.profileSetup.required")}</h2>
            <p className="text-muted-foreground mb-4">
              {t("doctor.profileSetup.message")}
            </p>
          </div>
          <div className="space-y-2">
            <Button onClick={refreshAll} className="w-full">
              {t("doctor.profileSetup.tryAgain")}
            </Button>
            <Button variant="outline" onClick={() => navigate('/doctor-signup')} className="w-full">
              {t("doctor.profileSetup.completeSetup")}
            </Button>
          </div>
        </div>
      </div>;
  }
  // Independent doctors don't have "My Services" - moved to Clinic Admin
  const sidebarItems = doctorStatus === "independent" ? [{
    id: "dashboard",
    label: t("doctor.navigation.dashboard"),
    icon: Home
  }, {
    id: "profile",
    label: t("doctor.navigation.myProfile"),
    icon: User
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
    label: t("doctor.navigation.assignedServices"),
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
        return <DoctorProfileSection doctorProfile={doctorProfile} />;
      case "services":
        return <DoctorServicesSection />;
      case "assigned-services":
        return <DoctorServicesSection readOnly={true} assignedServices={doctorProfile?.practices?.name ? ["Clinic Services"] : []} />;
      case "schedule":
        return <DoctorScheduleSettingsSection />;
      case "calendar":
        return <DoctorCalendarSection doctorStatus={doctorStatus} todaysAppointments={todaysAppointments} upcomingAppointments={upcomingAppointments} />;
      case "performance":
        return <DoctorPerformanceSection doctorProfile={doctorProfile} stats={stats} />;
      case "financial-stats":
        return <DoctorFinancialStatsSection />;
      case "clinic-finder":
        return <ClinicFinderSection />;
      case "assigned-patients":
        return <DoctorPatientsSection />;
      case "messages":
        return <InternalMessagingSection />;
      case "procedure-library":
        return <DoctorProcedureLibrarySection />;
      case "treatment-planning":
        return <TreatmentPlanningSection />;
      case "settings":
        return <DoctorSettingsSection />;
      default:
        return <div className="space-y-6">
            {/* Clinic Profile Card (for clinic members) */}
            {doctorStatus === "clinic-member" && doctorProfile?.practices && <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {doctorProfile?.practices?.name}
                          {doctorProfile?.practices?.verified && <Badge variant="secondary" className="bg-green-100 text-green-700">
                              {t("doctor.clinic.verified")}
                            </Badge>}
                        </CardTitle>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {doctorProfile?.practices?.city}, {doctorProfile?.practices?.country}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Button variant="outline" size="sm">
                        {t("doctor.clinic.requestToLeave")}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>}

            {/* Verification Status */}
            {!doctorProfile.verified && <DoctorVerificationStatusCard />}

            {/* Current/Upcoming Appointment Card */}
            <UpcomingAppointmentCard appointments={upcomingAppointments.map(apt => ({
            ...apt,
            patient_name: apt.patient_name,
            patient_email: apt.patient_email,
            patient_phone: apt.patient_phone,
            patient_avatar: apt.patient_avatar
          }))} />

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("doctor.stats.totalAppointments")}</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalAppointments || 0}</div>
                  <p className="text-xs text-muted-foreground">{t("doctor.stats.allTimeBookings")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("doctor.stats.totalPatients")}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalPatients || 0}</div>
                  <p className="text-xs text-muted-foreground">{t("doctor.stats.uniquePatients")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("doctor.stats.averageRating")}</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(stats?.averageRating || 0).toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">{t("doctor.stats.basedOnReviews", {
                    count: stats?.numReviews || 0
                  })}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("doctor.stats.revenue")}</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(stats?.totalRevenue || 0).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{t("doctor.stats.totalEarnings")}</p>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("doctor.upcomingAppointments.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {upcomingAppointments.length > 0 ? upcomingAppointments.slice(0, 3).map(appointment => <div key={appointment.id} className="flex items-center space-x-4">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {appointment.patient_name?.charAt(0) || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{appointment.patient_name}</p>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(appointment.appointment_date).toLocaleDateString()} at {appointment.start_time}
                          </p>
                        </div>
                        <Badge variant="outline" className={appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}>
                          {t(`doctor.appointmentStatus.${appointment.status}`)}
                        </Badge>
                      </div>) : <div className="text-center py-8">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground text-sm">{t("doctor.upcomingAppointments.noAppointments")}</p>
                      <p className="text-xs text-muted-foreground">{t("doctor.upcomingAppointments.scheduleIsClear")}</p>
                    </div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("doctor.quickActions.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" onClick={() => setQuickActionModal({
                  isOpen: true,
                  action: 'schedule'
                })}>
                    <Calendar className="w-4 h-4 mr-2" />
                    {t("doctor.todaysSchedule.viewFull")} ({todaysAppointments.length})
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setActiveSection("calendar")}>
                    <Clock className="w-4 h-4 mr-2" />
                    {t("doctor.quickActions.updateSettings")}
                  </Button>
                  
                  {!doctorProfile?.practice_id && doctorStatus === "independent" ? <Button className="w-full justify-start" variant="outline" onClick={() => setActiveSection("clinic-finder")}>
                      <Search className="w-4 h-4 mr-2" />
                      {t("doctor.navigation.clinicFinder")}
                    </Button> : <Button className="w-full justify-start" variant="outline" onClick={() => setQuickActionModal({
                  isOpen: true,
                  action: 'block-time'
                })}>
                      <Clock className="w-4 h-4 mr-2" />
                      {t("doctor.quickActions.blockTime")}
                    </Button>}
                </CardContent>
              </Card>
            </div>
          </div>;
    }
  };
  return <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>{t("doctor.title")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map(item => <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton onClick={() => setActiveSection(item.id)} isActive={activeSection === item.id}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <div className="flex h-16 items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-lg font-semibold">{t("doctor.dashboardContent.welcomeBack")}, {doctorProfile?.profiles?.full_name || 'Doctor'}</h1>
                  <p className="text-sm text-muted-foreground">
                    {doctorProfile?.specialty && doctorProfile.specialty !== 'General Practice' ? doctorProfile.specialty : t("doctor.dashboardContent.specialtyNotProvided")}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <LanguageSwitcher />
                <Button variant="ghost" size="sm">
                  <Bell className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {/* Profile Completion Banner */}
            {isProfileIncomplete}
            
            {renderContent()}
          </main>
          
          <QuickActionModals isOpen={quickActionModal.isOpen} action={quickActionModal.action} onClose={() => setQuickActionModal({
          isOpen: false,
          action: null
        })} doctorProfile={doctorProfile} todaysAppointments={todaysAppointments} />
        </div>
      </div>
    </SidebarProvider>;
};
const DoctorDashboard = () => {
  return <DoctorDataProvider>
      <DoctorDashboardContent />
    </DoctorDataProvider>;
};
export default DoctorDashboard;