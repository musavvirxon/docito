import { useState } from "react";
import { Bell, Settings, User, Calendar, FileText, Search, Plus, Clock, MapPin, Phone, Download, Eye, X, RotateCcw, AlertCircle, CheckCircle, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format, addDays, isPast, isFuture, isToday } from "date-fns";

interface Appointment {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorImage?: string;
  procedure: string;
  date: Date;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  confirmationCode: string;
  location: string;
  fee: number;
  notes?: string;
  treatmentPlanId?: string;
  canCancel: boolean;
  canReschedule: boolean;
}

const PatientDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Mock appointment data - would come from API
  const mockAppointments: Appointment[] = [
    {
      id: '1',
      doctorName: 'Dr. Sarah Johnson',
      doctorSpecialty: 'Cardiologist',
      doctorImage: '/placeholder.svg',
      procedure: 'Consultation',
      date: addDays(new Date(), 2),
      time: '10:00 AM',
      duration: 30,
      status: 'confirmed',
      confirmationCode: 'APT-2024-001234',
      location: 'Downtown Medical Center',
      fee: 200,
      canCancel: true,
      canReschedule: true
    },
    {
      id: '2',
      doctorName: 'Dr. Michael Chen',
      doctorSpecialty: 'Neurologist',
      doctorImage: '/placeholder.svg',
      procedure: 'Follow-up Visit',
      date: addDays(new Date(), 7),
      time: '2:30 PM',
      duration: 45,
      status: 'pending',
      confirmationCode: 'APT-2024-001235',
      location: 'Metro Health Clinic',
      fee: 300,
      canCancel: true,
      canReschedule: false
    },
    {
      id: '3',
      doctorName: 'Dr. Emily Rodriguez',
      doctorSpecialty: 'Dermatologist',
      doctorImage: '/placeholder.svg',
      procedure: 'Skin Examination',
      date: addDays(new Date(), -5),
      time: '11:00 AM',
      duration: 30,
      status: 'completed',
      confirmationCode: 'APT-2024-001230',
      location: 'Skin Care Specialists',
      fee: 150,
      treatmentPlanId: 'tp-123',
      canCancel: false,
      canReschedule: false
    },
    {
      id: '4',
      doctorName: 'Dr. James Wilson',
      doctorSpecialty: 'Family Medicine',
      doctorImage: '/placeholder.svg',
      procedure: 'Annual Checkup',
      date: addDays(new Date(), -15),
      time: '9:00 AM',
      duration: 60,
      status: 'completed',
      confirmationCode: 'APT-2024-001225',
      location: 'Family Health Center',
      fee: 250,
      canCancel: false,
      canReschedule: false
    }
  ];

  const upcomingAppointments = mockAppointments.filter(apt => 
    isFuture(apt.date) || isToday(apt.date)
  ).sort((a, b) => a.date.getTime() - b.date.getTime());

  const pastAppointments = mockAppointments.filter(apt => 
    isPast(apt.date) && !isToday(apt.date)
  ).sort((a, b) => b.date.getTime() - a.date.getTime());

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: User },
    { id: "appointments", label: "My Appointments", icon: Calendar },
    { id: "medical-records", label: "Medical Records", icon: FileText },
    { id: "search", label: "Find Doctors", icon: Search },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: Appointment['status']) => {
    switch (status) {
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleCancelAppointment = (appointmentId: string) => {
    toast({
      title: "Appointment Cancelled",
      description: "Your appointment has been cancelled successfully.",
    });
  };

  const handleRescheduleAppointment = (appointmentId: string) => {
    toast({
      title: "Reschedule Request",
      description: "You will be redirected to reschedule your appointment.",
    });
  };

  const handleViewDetails = (appointmentId: string) => {
    navigate(`/booking-confirmation/${appointmentId}`);
  };

  const handleBookFollowUp = (doctorName: string) => {
    navigate('/search-results');
    toast({
      title: "Book Follow-up",
      description: `Searching for available appointments with ${doctorName}`,
    });
  };

  const AppointmentCard = ({ appointment, isPast = false }: { appointment: Appointment; isPast?: boolean }) => (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={appointment.doctorImage} alt={appointment.doctorName} />
              <AvatarFallback>{appointment.doctorName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-foreground">{appointment.doctorName}</h3>
              <p className="text-sm text-muted-foreground">{appointment.doctorSpecialty}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor(appointment.status)} border`}>
            {getStatusIcon(appointment.status)}
            <span className="ml-1 capitalize">{appointment.status}</span>
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{format(appointment.date, 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{appointment.time} ({appointment.duration} min)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{appointment.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span>{appointment.procedure}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Confirmation:</span> {appointment.confirmationCode}
          </div>
          <div className="text-sm font-medium">
            ${appointment.fee}
          </div>
        </div>

        <Separator className="my-3" />

        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewDetails(appointment.id)}
          >
            <Eye className="w-3 h-3 mr-1" />
            Details
          </Button>

          {!isPast && (
            <>
              {appointment.canReschedule && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRescheduleAppointment(appointment.id)}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reschedule
                </Button>
              )}

              {appointment.canCancel && appointment.status !== 'cancelled' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel your appointment with {appointment.doctorName} on {format(appointment.date, 'MMMM d, yyyy')} at {appointment.time}?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleCancelAppointment(appointment.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Cancel Appointment
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}

          {isPast && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBookFollowUp(appointment.doctorName)}
              >
                <Calendar className="w-3 h-3 mr-1" />
                Book Follow-up
              </Button>

              {appointment.treatmentPlanId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/treatment-plan/${appointment.treatmentPlanId}`)}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Treatment Plan
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Download Started",
                    description: "Appointment summary is being prepared for download.",
                  });
                }}
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "appointments":
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold">My Appointments</h2>
              <Button onClick={() => navigate('/search-results')} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Book New Appointment
              </Button>
            </div>

            {/* Appointment Reminders */}
            {upcomingAppointments.filter(apt => apt.status === 'confirmed' && 
              apt.date.getTime() - new Date().getTime() <= 24 * 60 * 60 * 1000).length > 0 && (
              <Alert className="border-blue-200 bg-blue-50">
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">Upcoming appointments:</span> You have appointments in the next 24 hours. 
                  Please arrive 15 minutes early and bring your insurance card.
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="upcoming" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming">
                  Upcoming ({upcomingAppointments.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past ({pastAppointments.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4">
                {upcomingAppointments.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">No upcoming appointments</h3>
                      <p className="text-sm text-muted-foreground mb-4">Book your next appointment to get started</p>
                      <Button onClick={() => navigate('/search-results')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Book Appointment
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {upcomingAppointments.map((appointment) => (
                      <AppointmentCard key={appointment.id} appointment={appointment} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-4">
                {pastAppointments.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">No appointment history</h3>
                      <p className="text-sm text-muted-foreground">Your completed appointments will appear here</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {pastAppointments.map((appointment) => (
                      <AppointmentCard key={appointment.id} appointment={appointment} isPast />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        );

      case "medical-records":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Medical Records</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Upload Record
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <Card key={item} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">Lab Report {item}</h3>
                        <p className="text-sm text-muted-foreground">Dec {item}, 2023</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Blood work results from recent checkup
                    </p>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">Lab Result</Badge>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "search":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Find Doctors</h2>
            <p className="text-muted-foreground">Search will be implemented here</p>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Settings</h2>
            <p className="text-muted-foreground">Settings will be implemented here</p>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
              <h2 className="text-2xl font-bold mb-2">Welcome back, John!</h2>
              <p className="text-muted-foreground">Here's your health overview for today.</p>
            </div>

            {/* Upcoming Appointments Alert */}
            {upcomingAppointments.length > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">Next appointment:</span> {upcomingAppointments[0].doctorName} on {format(upcomingAppointments[0].date, 'MMMM d')} at {upcomingAppointments[0].time}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="ml-2"
                    onClick={() => setActiveSection("appointments")}
                  >
                    View Details
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {upcomingAppointments.length > 0 
                      ? `Next: ${format(upcomingAppointments[0].date, 'MMM d')}`
                      : 'No upcoming appointments'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Medical Records</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">Total documents</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Health Score</CardTitle>
                  <div className="h-4 w-4 bg-green-500 rounded-full" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Good</div>
                  <p className="text-xs text-muted-foreground">Based on recent visits</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Appointments</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveSection("appointments")}
                  >
                    View All
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pastAppointments.slice(0, 3).map((appointment) => (
                    <div key={appointment.id} className="flex items-center space-x-4">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={appointment.doctorImage} />
                        <AvatarFallback>{appointment.doctorName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{appointment.doctorName}</p>
                        <p className="text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {format(appointment.date, 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge variant="outline" className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>
                  ))}
                  {pastAppointments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No appointment history yet
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => navigate('/search-results')}
                    >
                      <Calendar className="w-6 h-6 mb-2" />
                      Book Appointment
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => setActiveSection("appointments")}
                    >
                      <Clock className="w-6 h-6 mb-2" />
                      My Appointments
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => setActiveSection("medical-records")}
                    >
                      <FileText className="w-6 h-6 mb-2" />
                      View Records
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => setActiveSection("search")}
                    >
                      <Search className="w-6 h-6 mb-2" />
                      Find Doctors
                    </Button>
                  </div>
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
              <SidebarGroupLabel>Patient Dashboard</SidebarGroupLabel>
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
                  <h1 className="text-lg font-semibold">Welcome back, John!</h1>
                  <p className="text-sm text-muted-foreground">Patient Dashboard</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm">
                  <Bell className="w-4 h-4" />
                </Button>
                <Avatar>
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
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

export default PatientDashboard;