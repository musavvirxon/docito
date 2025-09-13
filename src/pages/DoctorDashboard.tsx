import { useState } from "react";
import { Bell, Settings, User, Calendar, BarChart3, Search, Briefcase, MapPin, MessageSquare, Users, Building2, LogOut, Home, Clock, FileText } from "lucide-react";
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
import { useNavigate } from "react-router-dom";

type DoctorStatus = "independent" | "clinic-member";

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [doctorStatus] = useState<DoctorStatus>("independent"); // This would come from user state
  
  // Mock data - would come from API/database
  const doctorData = {
    name: "Dr. Sarah Johnson",
    specialty: "Cardiologist",
    verified: true,
    profileCompletion: 85,
    clinic: doctorStatus === "clinic-member" ? {
      name: "Metro Medical Center",
      location: "Downtown, NY",
      verified: true,
      assignedServices: ["Cardiology Consultation", "ECG", "Stress Test"]
    } : null
  };

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
        return <DoctorProfileSection doctorData={doctorData} />;
      case "services":
        return <DoctorServicesSection />;
      case "assigned-services":
        return <DoctorServicesSection readOnly={true} assignedServices={doctorData.clinic?.assignedServices} />;
      case "schedule":
        navigate("/dashboard/schedule");
        return null;
      case "procedures":
        navigate("/dashboard/procedures");
        return null;
      case "calendar":
        return <DoctorCalendarSection doctorStatus={doctorStatus} />;
      case "performance":
        return <DoctorPerformanceSection />;
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
        navigate("/treatment-planning");
        return null;
      case "settings":
        return <DoctorSettingsSection />;
      default:
        return (
          <div className="space-y-6">
            {/* Clinic Profile Card (for clinic members) */}
            {doctorStatus === "clinic-member" && doctorData.clinic && (
              <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {doctorData.clinic.name}
                          {doctorData.clinic.verified && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              Verified
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {doctorData.clinic.location}
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
            {doctorStatus === "independent" && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    <Badge variant="outline" className="bg-amber-100 text-amber-700">
                      Verification Pending
                    </Badge>
                  </CardTitle>
                  <p className="text-amber-700">
                    To go public and appear in search results, your verification must be completed.
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                      Upload Documents
                    </Button>
                    <Button variant="outline" size="sm">
                      Submit for Verification
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
                    <span className="font-medium">{doctorData.profileCompletion}%</span>
                  </div>
                  <Progress value={doctorData.profileCompletion} className="h-2" />
                </div>
              </CardHeader>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">124</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">89</div>
                  <p className="text-xs text-muted-foreground">+8 new this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4.8</div>
                  <p className="text-xs text-muted-foreground">Based on 67 reviews</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$12,450</div>
                  <p className="text-xs text-muted-foreground">This month</p>
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
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center space-x-4">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`/api/placeholder/32/32?text=P${item}`} />
                        <AvatarFallback>P{item}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">Patient {item}</p>
                        <p className="text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Today at {10 + item}:00 AM
                        </p>
                      </div>
                      <Badge variant="outline">Scheduled</Badge>
                    </div>
                  ))}
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
                    View Today's Schedule
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveSection("schedule")}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Manage Schedule
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveSection("procedures")}
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
                  <h1 className="text-lg font-semibold">Welcome back, {doctorData.name}</h1>
                  <p className="text-sm text-muted-foreground">{doctorData.specialty}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm">
                  <Bell className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DoctorDashboard;