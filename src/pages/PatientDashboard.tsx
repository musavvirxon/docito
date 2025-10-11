import { useState } from "react";
import { Bell, Settings, User, Calendar, FileText, Search, Plus, Clock, MapPin, Phone, Download, Eye, X, RotateCcw, AlertCircle, CheckCircle, Star, Pill, Activity } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments } from "@/hooks/useAppointments";
import { useMedicalRecords } from "@/hooks/useMedicalRecords";
import { useMedicationReminders } from "@/hooks/useMedicationReminders";
import { usePatientDashboard } from "@/hooks/usePatientDashboard";
import { RealTimeProcedureNotification } from "@/components/appointment/RealTimeProcedureNotification";
import { MedicationReminderDashboard } from "@/components/medication/MedicationReminderDashboard";
import { PatientSettingsPanel } from "@/components/patient/PatientSettingsPanel";
import SearchBar from "@/components/patient/SearchBar";
import SearchResults from "@/components/patient/SearchResults";
import { useDoctors } from "@/hooks/useDoctors";
import { usePractices } from "@/hooks/usePractices";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { user, profile } = useAuth();
  const { 
    getPendingRemindersCount, 
    getOverdueRemindersCount 
  } = useMedicationReminders();
  
  const { stats, loading: dashboardLoading } = usePatientDashboard();
  const { appointments, loading: appointmentsLoading, cancelAppointment } = useAppointments();
  const { records, loading: recordsLoading, addMedicalRecord } = useMedicalRecords();

  // Transform appointments from backend to component format
  const transformedAppointments: Appointment[] = (appointments || []).map((apt: any) => ({
    id: apt.id,
    doctorName: apt.doctor?.profiles?.full_name || 'Doctor',
    doctorSpecialty: apt.doctor?.specialty || '',
    doctorImage: apt.doctor?.profiles?.avatar_url,
    procedure: apt.notes || 'Consultation',
    date: new Date(apt.appointment_date),
    time: apt.start_time,
    duration: 30,
    status: apt.status,
    confirmationCode: `APT-${apt.id.slice(0, 8)}`,
    location: apt.practice?.name || 'Medical Center',
    fee: 200,
    canCancel: apt.status === 'pending' || apt.status === 'confirmed',
    canReschedule: apt.status === 'pending',
  }));

  const upcomingAppointments = transformedAppointments.filter(apt => 
    isFuture(apt.date) || isToday(apt.date)
  ).sort((a, b) => a.date.getTime() - b.date.getTime());

  const pastAppointments = transformedAppointments.filter(apt => 
    isPast(apt.date) && !isToday(apt.date)
  ).sort((a, b) => b.date.getTime() - a.date.getTime());

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: User },
    { id: "appointments", label: "My Appointments", icon: Calendar },
    { id: "medications", label: "Medications", icon: Pill, badge: getPendingRemindersCount() },
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

  const handleCancelAppointment = async (appointmentId: string) => {
    const result = await cancelAppointment(appointmentId);
    if (result.success) {
      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been cancelled successfully.",
      });
    }
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

  // Patient Search Section Component
  const PatientSearchSection = () => {
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { searchDoctors } = useDoctors();
    const { searchPractices } = usePractices();

    const handleSearch = async (results: any[]) => {
      setIsLoading(true);
      
      try {
        if (results && results.length > 0) {
          // Transform results to match the SearchResult interface from patient/SearchResults
          const transformedResults = results.map(result => ({
            id: result.id,
            type: result.type,
            name: result.name,
            specialty: result.specialty,
            location: result.location,
            rating: result.rating,
            reviewCount: result.reviewCount,
            availability: result.availability,
            acceptsInsurance: result.acceptsInsurance,
            acceptsNewPatients: result.acceptsNewPatients,
            distance: result.distance,
            image: result.image,
            bio: result.bio,
            experience: result.experience,
            languages: result.languages,
            practiceName: result.practiceName,
            degree: result.degree,
            consultationFee: result.consultationFee,
            practiceType: result.practiceType,
            description: result.description,
            specialties: result.specialties,
            doctorCount: result.doctorCount,
            logoUrl: result.logoUrl,
            affiliatedPractice: result.affiliatedPractice
          }));
          setSearchResults(transformedResults);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const handleBookAppointment = (result: any) => {
      navigate('/appointment-booking', { 
        state: { 
          doctorId: result.id, 
          doctorName: result.name,
          specialty: result.specialty 
        } 
      });
    };

    const handleViewPractice = (result: any) => {
      navigate(`/practices/${result.id}`);
    };

    const handleFavorite = (result: any) => {
      toast({
        title: "Added to Favorites",
        description: `${result.name} has been added to your favorites.`,
      });
    };

    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Find Healthcare Providers</h2>
        
        <SearchBar 
          onSearch={handleSearch}
          showResultsInline={true}
          className="max-w-4xl"
        />

        {searchResults.length > 0 && (
          <SearchResults
            results={searchResults}
            isLoading={isLoading}
            onBookAppointment={handleBookAppointment}
            onViewPractice={handleViewPractice}
            onFavorite={handleFavorite}
          />
        )}
      </div>
    );
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
                      <Button onClick={() => navigate('/find-doctors')}>
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

      case "medications":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold">Medication Reminders</h2>
              <div className="flex items-center gap-2">
                {getOverdueRemindersCount() > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {getOverdueRemindersCount()} Overdue
                  </Badge>
                )}
                {getPendingRemindersCount() > 0 && (
                  <Badge variant="outline" className="border-blue-200 text-blue-600">
                    {getPendingRemindersCount()} Pending
                  </Badge>
                )}
              </div>
            </div>

            {/* Real-time Procedure Notifications */}
            <RealTimeProcedureNotification />

            {/* Medication Reminder Dashboard */}
            <MedicationReminderDashboard />
          </div>
        );

      case "medical-records":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Medical Records</h2>
              <Button onClick={() => navigate('/upload-record')}>
                <Plus className="w-4 h-4 mr-2" />
                Upload Record
              </Button>
            </div>
            
            {recordsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[180px]" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No medical records yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Upload your first medical record to get started</p>
                  <Button onClick={() => navigate('/upload-record')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Record
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {records.map((record: any) => (
                  <Card key={record.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{record.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(record.record_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {record.description || 'No description available'}
                      </p>
                      <div className="flex justify-between items-center">
                        <Badge variant="outline">{record.record_type}</Badge>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case "search":
        return <PatientSearchSection />;

      case "settings":
        return <PatientSettingsPanel />;

      default:
        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            {dashboardLoading ? (
              <Skeleton className="h-[100px] w-full" />
            ) : (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
                <h2 className="text-2xl font-bold mb-2">Welcome back, {profile?.full_name || 'Patient'}!</h2>
                <p className="text-muted-foreground">Here's your health overview for today.</p>
              </div>
            )}

            {/* Upcoming Appointments Alert */}
            {stats.nextAppointment && (
              <Alert className="border-green-200 bg-green-50">
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">Next appointment:</span> {stats.nextAppointment.doctor?.profiles?.full_name} on {format(new Date(stats.nextAppointment.appointment_date), 'MMMM d')} at {stats.nextAppointment.start_time}
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
            {dashboardLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[120px]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.upcomingAppointmentsCount}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.nextAppointment 
                        ? `Next: ${format(new Date(stats.nextAppointment.appointment_date), 'MMM d')}`
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
                    <div className="text-2xl font-bold">{stats.medicalRecordsCount}</div>
                    <p className="text-xs text-muted-foreground">Total documents</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Medication Reminders</CardTitle>
                    <Pill className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.pendingReminders}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.pendingReminders === 1 ? 'Pending reminder' : 'Pending reminders'}
                    </p>
                    {getOverdueRemindersCount() > 0 && (
                      <Badge variant="destructive" className="text-xs mt-1">
                        {getOverdueRemindersCount()} overdue
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Real-time Notifications */}
            <RealTimeProcedureNotification />

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
                  {dashboardLoading ? (
                    <>
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </>
                  ) : stats.recentAppointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent appointments</p>
                  ) : (
                    stats.recentAppointments.map((appointment: any) => (
                      <div key={appointment.id} className="flex items-center space-x-4">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={appointment.doctor?.profiles?.avatar_url} />
                          <AvatarFallback>{appointment.doctor?.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'D'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{appointment.doctor?.profiles?.full_name || 'Doctor'}</p>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge variant="outline" className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </div>
                    ))
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
                      onClick={() => navigate('/find-doctors')}
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
                        {item.badge && item.badge > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="ml-auto text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5"
                          >
                            {item.badge}
                          </Badge>
                        )}
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