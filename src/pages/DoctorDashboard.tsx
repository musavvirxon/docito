import { useState } from "react";
import { Bell, Settings, User, Calendar, BarChart3, Search, Briefcase, MapPin, MessageSquare, Users, Building2, LogOut, Home, Clock, FileText, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import DoctorProfileSection from "@/components/doctor/DoctorProfileSection";
import DoctorServicesSection from "@/components/doctor/DoctorServicesSection";
import DoctorCalendarSection from "@/components/doctor/DoctorCalendarSection";
import DoctorPerformanceSection from "@/components/doctor/DoctorPerformanceSection";
import ClinicFinderSection from "@/components/doctor/ClinicFinderSection";
import DoctorSettingsSection from "@/components/doctor/DoctorSettingsSection";
import AssignedPatientsSection from "@/components/doctor/AssignedPatientsSection";
import InternalMessagingSection from "@/components/doctor/InternalMessagingSection";
import TreatmentPlanningSection from "@/components/doctor/TreatmentPlanningSection";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctorDashboard } from "@/hooks/useDoctorDashboard";
import { authApi } from "@/lib/api/supabase-api";

type DoctorStatus = "independent" | "clinic-member";

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { doctorProfile, stats, recentAppointments, todaysAppointments, loading, error, retryFetch } = useDoctorDashboard();
  const [activeSection, setActiveSection] = useState("dashboard");

  const doctorStatus: DoctorStatus = doctorProfile?.practice_id ? "clinic-member" : "independent";
  
  const handleLogout = async () => {
    await authApi.signOut();
    navigate('/');
  };

  // Calculate profile completion
  const calculateProfileCompletion = () => {
    if (!doctorProfile) return 0;
    
    const fields = [
      doctorProfile.bio,
      doctorProfile.license_number,
      doctorProfile.consultation_fee,
      profile?.avatar_url,
      profile?.date_of_birth,
      profile?.phone
    ];
    
    const completedFields = fields.filter(field => field && field !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  };

  const profileCompletion = calculateProfileCompletion();
  const isProfileIncomplete = profileCompletion < 80;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-foreground">Loading dashboard...</p>
          <p className="text-sm text-muted-foreground mt-2">Setting up your doctor profile...</p>
        </div>
      </div>
    );
  }

  // Show error state but allow partial dashboard access
  if (error && !doctorProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md p-6 bg-card border border-border rounded-lg">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-destructive mb-2">Dashboard Loading Issue</h2>
            <p className="text-muted-foreground mb-4">
              {error || 'Unable to load your doctor profile. Let us set up your account.'}
            </p>
          </div>
          <div className="space-y-2">
            <Button onClick={retryFetch} className="w-full">
              Retry Loading
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/doctor-signup')} 
              className="w-full"
            >
              Complete Profile Setup
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Add safety check for doctorProfile
  if (!loading && !doctorProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md p-6 bg-card border border-border rounded-lg">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-destructive mb-2">Profile Setup Required</h2>
            <p className="text-muted-foreground mb-4">
              Your doctor profile needs to be set up. Let's complete your profile.
            </p>
          </div>
          <div className="space-y-2">
            <Button onClick={retryFetch} className="w-full">
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/doctor-signup')} 
              className="w-full"
            >
              Complete Profile Setup
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const sidebarItems = doctorStatus === "independent" 
    ? [
        { id: "dashboard", label: "Dashboard", icon: Home },
        { id: "profile", label: "My Profile", icon: User },
        { id: "services", label: "My Services", icon: Briefcase },
        { id: "schedule", label: "Schedule Settings", icon: Clock },
        { id: "procedures", label: "Procedures", icon: FileText },
        { id: "procedure-library", label: "Procedure Library", icon: FileText },
        { id: "treatment-planning", label: "Treatment Planning", icon: Calendar },
        { id: "calendar", label: "Calendar", icon: Calendar },
        { id: "performance", label: "Performance", icon: BarChart3 },
        { id: "clinic-finder", label: "Clinic Finder", icon: Search },
        { id: "settings", label: "Settings", icon: Settings },
      ]
    : [
        { id: "dashboard", label: "Dashboard", icon: Home },
        { id: "profile", label: "My Profile", icon: User },
        { id: "assigned-services", label: "Assigned Services", icon: Briefcase },
        { id: "schedule", label: "Schedule Settings", icon: Clock },
        { id: "procedures", label: "Procedures", icon: FileText },
        { id: "procedure-library", label: "Procedure Library", icon: FileText },
        { id: "treatment-planning", label: "Treatment Planning", icon: Calendar },
        { id: "assigned-patients", label: "My Patients", icon: Users },
        { id: "calendar", label: "Calendar", icon: Calendar },
        { id: "messages", label: "Messages", icon: MessageSquare },
        { id: "performance", label: "Performance", icon: BarChart3 },
        { id: "settings", label: "Settings", icon: Settings },
      ];

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <DoctorProfileSection doctorProfile={doctorProfile} />;
      case "services":
        return <DoctorServicesSection />;
      case "assigned-services":
        return <DoctorServicesSection readOnly={true} assignedServices={doctorProfile?.practices?.name ? ["Clinic Services"] : []} />;
      case "schedule":
        navigate("/doctor-schedule-settings");
        return null;
      case "procedures":
        navigate("/doctor-procedures");
        return null;
      case "calendar":
        return <DoctorCalendarSection doctorStatus={doctorStatus} todaysAppointments={todaysAppointments} />;
      case "performance":
        return <DoctorPerformanceSection doctorProfile={doctorProfile} stats={stats} />;
      case "clinic-finder":
        return <ClinicFinderSection />;
      case "assigned-patients":
        return <AssignedPatientsSection />;
      case "messages":
        return <InternalMessagingSection />;
      case "procedure-library":
        navigate("/procedure-library");
        return null;
      case "treatment-planning":
        return <TreatmentPlanningSection />;
      case "settings":
        return <DoctorSettingsSection />;
      default:
        return (
          <div className="space-y-6">
            {/* Clinic Profile Card (for clinic members) */}
            {doctorStatus === "clinic-member" && doctorProfile?.practices && (
              <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {doctorProfile?.practices?.name}
                          {doctorProfile?.practices?.verified && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              Verified
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {doctorProfile?.practices?.city}, {doctorProfile?.practices?.country}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Button variant="outline" size="sm">
                        Request to Leave
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* Verification Status (for independent doctors) */}
            {doctorStatus === "independent" && doctorProfile && !doctorProfile.verified && (
              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <Badge variant="outline" className="bg-destructive/10 text-destructive">
                      Verification Pending
                    </Badge>
                  </CardTitle>
                  <p className="text-destructive/80">
                    To go public and appear in search results, your verification must be completed.
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="destructive" onClick={() => navigate('/doctor-signup')}>
                      Complete Profile
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveSection("profile")}>
                      View Profile
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* Profile Completion Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Completion</CardTitle>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Complete your profile to get more bookings</span>
                    <span className="font-medium">{profileCompletion}%</span>
                  </div>
                  <Progress value={profileCompletion} className="h-2" />
                </div>
              </CardHeader>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalAppointments || 0}</div>
                  <p className="text-xs text-muted-foreground">All time bookings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalPatients || 0}</div>
                  <p className="text-xs text-muted-foreground">Unique patients served</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(stats?.averageRating || 0).toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">Based on {stats?.numReviews || 0} reviews</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(stats?.totalRevenue || 0).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total earnings</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Appointments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentAppointments.length > 0 ? (
                    recentAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center space-x-4">
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
                        <Badge variant="outline" className={
                          appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                          appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                          appointment.status === 'canceled' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {appointment.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No recent appointments</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveSection("calendar")}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    View Today's Schedule ({todaysAppointments.length})
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => navigate("/doctor-schedule-settings")}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Manage Schedule
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => navigate("/doctor-procedures")}
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Update Procedures
                  </Button>
                  {doctorStatus === "independent" && (
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => setActiveSection("clinic-finder")}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Find Clinics
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Doctor Dashboard</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveSection(item.id)}
                        isActive={activeSection === item.id}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
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
                  <h1 className="text-lg font-semibold">Welcome back, {doctorProfile?.profiles?.full_name || 'Doctor'}</h1>
                  <p className="text-sm text-muted-foreground">{doctorProfile?.specialty || 'General Practice'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
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
            {isProfileIncomplete && (
              <div className="mb-6 p-4 bg-secondary border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium text-foreground">
                        Complete Your Profile ({profileCompletion}%)
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Complete your profile to verify your account and start accepting patients.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => navigate('/doctor-signup')}
                    variant="outline"
                    size="sm"
                  >
                    Complete Profile
                  </Button>
                </div>
              </div>
            )}
            
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DoctorDashboard;