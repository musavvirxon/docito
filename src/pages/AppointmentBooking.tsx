import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, Star, User, Phone, Mail, FileText, ArrowLeft, AlertCircle, Loader2, HelpCircle, Wifi, WifiOff } from "lucide-react";
import { format, addDays, isSameDay, setHours, setMinutes } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { TimeSlotCalculator, TimeSlot, BookedAppointment } from "@/utils/TimeSlotCalculator";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  profile_photo?: string;
  practice_location: string;
  bio?: string;
}

interface Procedure {
  id: string;
  name: string;
  duration_minutes: number;
  fee_amount: number;
  description?: string;
}

interface BookingForm {
  procedureId: string;
  appointmentDate: Date | null;
  timeSlot: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  purposeOfVisit: string;
  notes: string;
}

const AppointmentBooking = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [bookedAppointments, setBookedAppointments] = useState<BookedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [timeSlotCalculator] = useState(new TimeSlotCalculator());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loadingStates, setLoadingStates] = useState({
    doctor: false,
    procedures: false,
    timeSlots: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showHelp, setShowHelp] = useState(false);

  const [bookingForm, setBookingForm] = useState<BookingForm>({
    procedureId: "",
    appointmentDate: null,
    timeSlot: "",
    patientName: "",
    patientPhone: "",
    patientEmail: "",
    purposeOfVisit: "",
    notes: ""
  });


  useEffect(() => {
    checkUserAuth();
    if (doctorId) {
      fetchDoctorInfo();
      fetchDoctorProcedures();
      fetchBookedAppointments();
    }

    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [doctorId]);

  useEffect(() => {
    if (selectedDate && selectedProcedure) {
      generateTimeSlots();
    }
  }, [selectedDate, selectedProcedure]);

  useEffect(() => {
    // Auto-advance to next available day if current day has no slots
    if (selectedDate && selectedProcedure && availableSlots.length === 0) {
      const nextAvailableDay = timeSlotCalculator.findNextAvailableDay(
        selectedDate,
        selectedProcedure.duration_minutes,
        undefined,
        bookedAppointments
      );
      
      if (nextAvailableDay && !isSameDay(nextAvailableDay, selectedDate)) {
        setSelectedDate(nextAvailableDay);
        handleFormChange('appointmentDate', nextAvailableDay);
        toast.info(`No slots available on selected date. Moved to next available day: ${format(nextAvailableDay, 'PPP')}`);
      }
    }
  }, [selectedDate, selectedProcedure, availableSlots, bookedAppointments]);

  const fetchBookedAppointments = async () => {
    // In a real app, this would fetch from the database
    // For now, use mock data
    const mockAppointments = timeSlotCalculator.getMockBookedAppointments();
    setBookedAppointments(mockAppointments);
  };

  const generateTimeSlots = async () => {
    if (!selectedDate || !selectedProcedure) return;
    
    setLoadingStates(prev => ({ ...prev, timeSlots: true }));
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const slots = timeSlotCalculator.generateTimeSlots(
        selectedDate,
        selectedProcedure.duration_minutes,
        undefined,
        bookedAppointments
      );
      
      setAvailableSlots(slots);
    } catch (error) {
      console.error("Error generating time slots:", error);
      toast.error("Failed to load time slots");
    } finally {
      setLoadingStates(prev => ({ ...prev, timeSlots: false }));
    }
  };

  const checkUserAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      // Auto-fill form with user data if available
      setBookingForm(prev => ({
        ...prev,
        patientEmail: user.email || "",
        patientName: user.user_metadata?.full_name || ""
      }));
    }
  };

  const fetchDoctorInfo = async () => {
    setLoadingStates(prev => ({ ...prev, doctor: true }));
    try {
      // Simulate network delay for loading state
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock doctor data (replace with real Supabase query)
      const mockDoctor: Doctor = {
        id: doctorId!,
        name: "Dr. Sarah Johnson",
        specialty: "Cardiologist",
        rating: 4.8,
        practice_location: "Metro Medical Center, Downtown",
        bio: "Board-certified cardiologist with 15+ years of experience specializing in preventive cardiology and heart disease management."
      };
      setDoctor(mockDoctor);
    } catch (error) {
      console.error("Error fetching doctor info:", error);
      if (!isOnline) {
        toast.error("Unable to load doctor information. Please check your connection.");
      } else {
        toast.error("Failed to load doctor information");
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, doctor: false }));
    }
  };

  const fetchDoctorProcedures = async () => {
    setLoadingStates(prev => ({ ...prev, procedures: true }));
    try {
      // Simulate network delay for loading state
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Mock procedures data with varying durations (replace with real Supabase query)
      const mockProcedures: Procedure[] = [
        {
          id: "1",
          name: "Quick Consultation",
          duration_minutes: 15,
          fee_amount: 100,
          description: "Brief consultation and basic examination"
        },
        {
          id: "2",
          name: "Standard Consultation",
          duration_minutes: 30,
          fee_amount: 200,
          description: "Comprehensive cardiac evaluation and consultation"
        },
        {
          id: "3", 
          name: "Detailed Assessment",
          duration_minutes: 45,
          fee_amount: 300,
          description: "In-depth consultation with detailed analysis"
        },
        {
          id: "4",
          name: "Comprehensive Exam",
          duration_minutes: 60,
          fee_amount: 400,
          description: "Complete cardiac examination and testing"
        }
      ];
      setProcedures(mockProcedures);
    } catch (error) {
      console.error("Error fetching procedures:", error);
      if (!isOnline) {
        toast.error("Unable to load procedures. Please check your connection.");
      } else {
        toast.error("Failed to load available procedures");
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, procedures: false }));
      setLoading(false);
    }
  };

  const handleFormChange = (field: keyof BookingForm, value: any) => {
    setBookingForm(prev => ({
      ...prev,
      [field]: value
    }));

    // Handle procedure selection
    if (field === 'procedureId') {
      const procedure = procedures.find(p => p.id === value);
      setSelectedProcedure(procedure || null);
      handleFormChange('timeSlot', ''); // Reset time slot when procedure changes
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      handleFormChange('appointmentDate', date);
      handleFormChange('timeSlot', ''); // Reset time slot when date changes
    }
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    if (slot.status === 'available') {
      handleFormChange('timeSlot', slot.time);
    }
  };

  const getSlotButtonClass = (slot: TimeSlot, isSelected: boolean) => {
    const baseClass = "text-sm transition-all duration-200";
    
    if (isSelected) {
      return `${baseClass} bg-primary text-primary-foreground hover:bg-primary/90`;
    }
    
    switch (slot.color) {
      case 'green':
        return `${baseClass} bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300`;
      case 'gray':
        return `${baseClass} bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed`;
      case 'red':
        return `${baseClass} bg-red-50 text-red-600 border-red-200 cursor-not-allowed`;
      default:
        return `${baseClass} variant-outline`;
    }
  };

  const getSlotTooltip = (slot: TimeSlot) => {
    switch (slot.status) {
      case 'available':
        return `Available: ${slot.time} - ${slot.endTime}`;
      case 'booked':
        return `Already booked: ${slot.time} - ${slot.endTime}`;
      case 'break':
        return `Break time: ${slot.time} - ${slot.endTime}`;
      default:
        return slot.time;
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!bookingForm.procedureId) {
      newErrors.procedureId = "Please select a procedure";
    }
    if (!bookingForm.appointmentDate) {
      newErrors.appointmentDate = "Please select an appointment date";
    }
    if (!bookingForm.timeSlot) {
      newErrors.timeSlot = "Please select a time slot";
    }
    if (!bookingForm.patientName.trim()) {
      newErrors.patientName = "Please enter your name";
    }
    if (!bookingForm.patientPhone.trim()) {
      newErrors.patientPhone = "Please enter your phone number";
    } else if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(bookingForm.patientPhone)) {
      newErrors.patientPhone = "Please enter a valid phone number";
    }
    if (!bookingForm.patientEmail.trim()) {
      newErrors.patientEmail = "Please enter your email address";
    } else if (!/\S+@\S+\.\S+/.test(bookingForm.patientEmail)) {
      newErrors.patientEmail = "Please enter a valid email address";
    }
    if (!bookingForm.purposeOfVisit.trim()) {
      newErrors.purposeOfVisit = "Please describe the purpose of your visit";
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return false;
    }
    
    return true;
  };

  const generateConfirmationCode = () => {
    return `APT-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOnline) {
      toast.error("No internet connection. Please check your connection and try again.");
      return;
    }
    
    if (!currentUser) {
      // Redirect to sign up and return to this page
      navigate(`/signup?returnTo=/book-appointment/${doctorId}`);
      return;
    }

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const selectedProcedure = procedures.find(p => p.id === bookingForm.procedureId);
      const confirmationCode = generateConfirmationCode();
      
      // Create appointment record
      const appointmentData = {
        patient_id: currentUser.id,
        doctor_id: doctorId,
        appointment_date: format(bookingForm.appointmentDate!, 'yyyy-MM-dd'),
        start_time: bookingForm.timeSlot,
        end_time: format(
          setMinutes(
            setHours(new Date(), parseInt(bookingForm.timeSlot.split(':')[0])),
            parseInt(bookingForm.timeSlot.split(':')[1]) + (selectedProcedure?.duration_minutes || 30)
          ),
          'HH:mm'
        ),
        procedure_name: selectedProcedure?.name,
        duration_minutes: selectedProcedure?.duration_minutes || 30,
        fee_amount: selectedProcedure?.fee_amount || 0,
        status: 'confirmed',
        purpose_of_visit: bookingForm.purposeOfVisit,
        patient_notes: bookingForm.notes,
        confirmation_code: confirmationCode,
        payment_status: 'none'
      };

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate sending confirmation email
      console.log(`Confirmation email sent to ${bookingForm.patientEmail}:`);
      console.log(`Subject: Appointment Confirmation - ${confirmationCode}`);
      console.log(`Dear ${bookingForm.patientName}, your appointment with ${doctor.name} on ${format(bookingForm.appointmentDate!, 'PPP')} at ${bookingForm.timeSlot} has been confirmed.`);

      // For now, just simulate the booking since appointments table may not exist yet
      console.log("Appointment data (would be saved to appointments table):", appointmentData);
      
      toast.success(`Appointment booked! Confirmation: ${confirmationCode}`);
      
      // Redirect to confirmation page
      navigate(`/booking-confirmation/${confirmationCode}`);
    } catch (error: any) {
      console.error("Error booking appointment:", error);
      toast.error("Failed to book appointment: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading appointment booking...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Doctor Not Found</h1>
            <p className="text-muted-foreground mb-4">The requested doctor could not be found.</p>
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Header />
        
        {/* Connection Status Bar */}
        {!isOnline && (
          <div className="bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            You're offline. Some features may not work properly.
          </div>
        )}
        
        <main className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
          {/* Header with Back Button and Help */}
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
              aria-label="Go back to previous page"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHelp(!showHelp)}
                    aria-label="Show booking help"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Get help with booking</p>
                </TooltipContent>
              </Tooltip>
              
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600" aria-label="Connected" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" aria-label="Disconnected" />
              )}
            </div>
          </div>
          
          {/* Help Panel */}
          {showHelp && (
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <HelpCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Booking Help:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Select a procedure that matches your needs</li>
                    <li>Choose an available date and time slot</li>
                    <li>Fill in your contact information accurately</li>
                    <li>Describe your symptoms or reason for visit</li>
                    <li>You'll receive a confirmation email after booking</li>
                  </ul>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-blue-600"
                    onClick={() => setShowHelp(false)}
                  >
                    Got it, close help
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Doctor Summary Panel */}
          <Card className="mb-6 md:mb-8">
            <CardContent className="p-4 md:p-6">
              {loadingStates.doctor ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading doctor information...</span>
                </div>
              ) : doctor ? (
                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                  <Avatar className="w-20 h-20 md:w-24 md:h-24 mx-auto md:mx-0 ring-2 ring-primary/10">
                    <AvatarImage 
                      src={doctor.profile_photo} 
                      alt={`Profile photo of ${doctor.name}`}
                      loading="lazy"
                    />
                    <AvatarFallback className="text-lg">
                      {doctor.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 text-center md:text-left">
                    <h1 className="text-xl md:text-2xl font-bold mb-2">{doctor.name}</h1>
                    <p className="text-base md:text-lg text-primary mb-2">{doctor.specialty}</p>
                    
                    <div className="flex items-center justify-center md:justify-start gap-3 md:gap-4 mb-3 text-sm md:text-base">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                        <span className="font-medium">{doctor.rating}</span>
                        <span className="sr-only">out of 5 stars</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-4 h-4" aria-hidden="true" />
                        <span className="text-xs md:text-sm">{doctor.practice_location}</span>
                      </div>
                    </div>
                    
                    {doctor.bio && (
                      <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">{doctor.bio}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p>Unable to load doctor information</p>
                </div>
              )}
            </CardContent>
          </Card>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Procedure Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Select Procedure
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStates.procedures ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm">Loading procedures...</span>
                </div>
              ) : (
                <Select 
                  value={bookingForm.procedureId} 
                  onValueChange={(value) => handleFormChange('procedureId', value)}
                  disabled={procedures.length === 0}
                >
                  <SelectTrigger 
                    className={cn(
                      "min-h-[3rem] touch-manipulation",
                      errors.procedureId && "border-destructive"
                    )}
                    aria-describedby={errors.procedureId ? "procedure-error" : undefined}
                  >
                    <SelectValue placeholder="Choose a procedure" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg">
                    {procedures.map((procedure) => (
                      <SelectItem 
                        key={procedure.id} 
                        value={procedure.id}
                        className="touch-manipulation min-h-[3rem] focus:bg-muted"
                      >
                        <div className="flex justify-between items-center w-full">
                          <div>
                            <div className="font-medium">{procedure.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {procedure.duration_minutes} minutes
                            </div>
                          </div>
                          <Badge variant="secondary">${procedure.fee_amount}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {errors.procedureId && (
                <p id="procedure-error" className="text-sm text-destructive mt-1" role="alert">
                  {errors.procedureId}
                </p>
              )}
              
              {selectedProcedure && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{selectedProcedure.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Duration: {selectedProcedure.duration_minutes} minutes
                      </p>
                      {selectedProcedure.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedProcedure.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-primary">
                        ${selectedProcedure.fee_amount}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal min-h-[3rem] touch-manipulation",
                      !selectedDate && "text-muted-foreground",
                      errors.appointmentDate && "border-destructive"
                    )}
                    aria-describedby={errors.appointmentDate ? "date-error" : undefined}
                  >
                    <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border shadow-lg" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => 
                      date < new Date() || date > addDays(new Date(), 30)
                    }
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    aria-label="Select appointment date"
                  />
                </PopoverContent>
              </Popover>
              
              {errors.appointmentDate && (
                <p id="date-error" className="text-sm text-destructive mt-1" role="alert">
                  {errors.appointmentDate}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Time Slot Selection */}
          {selectedDate && selectedProcedure && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Select Time ({selectedProcedure.duration_minutes} min slots)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStates.timeSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading available time slots...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No available slots for this date. Please select another date or we'll automatically find the next available day.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-100 border border-green-200 rounded" aria-hidden="true"></div>
                        <span className="text-xs text-muted-foreground">Available</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded" aria-hidden="true"></div>
                        <span className="text-xs text-muted-foreground">Booked</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-50 border border-red-200 rounded" aria-hidden="true"></div>
                        <span className="text-xs text-muted-foreground">Break</span>
                      </div>
                    </div>

                    {/* Time Slots Grid */}
                    <div 
                      className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3"
                      role="radiogroup"
                      aria-label="Select appointment time"
                    >
                      {availableSlots.map((slot) => {
                        const isSelected = bookingForm.timeSlot === slot.time;
                        const isDisabled = slot.status !== 'available';
                        
                        return (
                          <Button
                            key={slot.time}
                            type="button"
                            variant="outline"
                            disabled={isDisabled}
                            onClick={() => handleTimeSlotSelect(slot)}
                            className={cn(
                              getSlotButtonClass(slot, isSelected),
                              "min-h-[3rem] touch-manipulation transition-all duration-200",
                              "focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            )}
                            title={getSlotTooltip(slot)}
                            aria-pressed={isSelected}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${slot.time} to ${slot.endTime}, ${slot.status}`}
                          >
                            <div className="text-center">
                              <div className="font-medium text-sm">{slot.time}</div>
                              {slot.endTime && (
                                <div className="text-xs opacity-75">to {slot.endTime}</div>
                              )}
                            </div>
                          </Button>
                        );
                      })}
                    </div>

                    {errors.timeSlot && (
                      <p className="text-sm text-destructive mt-2" role="alert">
                        {errors.timeSlot}
                      </p>
                    )}

                    {/* Available slots summary */}
                    <div className="mt-4 text-sm text-muted-foreground" aria-live="polite">
                      {availableSlots.filter(slot => slot.status === 'available').length} of {availableSlots.length} slots available
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patientName" className="text-sm font-medium">
                    Full Name *
                  </Label>
                  <Input
                    id="patientName"
                    type="text"
                    autoComplete="name"
                    value={bookingForm.patientName}
                    onChange={(e) => handleFormChange('patientName', e.target.value)}
                    placeholder="Enter your full name"
                    className={cn(
                      "min-h-[3rem] touch-manipulation",
                      errors.patientName && "border-destructive"
                    )}
                    aria-describedby={errors.patientName ? "name-error" : undefined}
                    required
                  />
                  {errors.patientName && (
                    <p id="name-error" className="text-sm text-destructive mt-1" role="alert">
                      {errors.patientName}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="patientPhone" className="text-sm font-medium">
                    Phone Number *
                  </Label>
                  <Input
                    id="patientPhone"
                    type="tel"
                    autoComplete="tel"
                    value={bookingForm.patientPhone}
                    onChange={(e) => handleFormChange('patientPhone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className={cn(
                      "min-h-[3rem] touch-manipulation",
                      errors.patientPhone && "border-destructive"
                    )}
                    aria-describedby={errors.patientPhone ? "phone-error" : undefined}
                    required
                  />
                  {errors.patientPhone && (
                    <p id="phone-error" className="text-sm text-destructive mt-1" role="alert">
                      {errors.patientPhone}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="patientEmail" className="text-sm font-medium">
                  Email Address *
                </Label>
                <Input
                  id="patientEmail"
                  type="email"
                  autoComplete="email"
                  value={bookingForm.patientEmail}
                  onChange={(e) => handleFormChange('patientEmail', e.target.value)}
                  placeholder="your.email@example.com"
                  className={cn(
                    "min-h-[3rem] touch-manipulation",
                    errors.patientEmail && "border-destructive"
                  )}
                  aria-describedby={errors.patientEmail ? "email-error" : undefined}
                  required
                />
                {errors.patientEmail && (
                  <p id="email-error" className="text-sm text-destructive mt-1" role="alert">
                    {errors.patientEmail}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="purposeOfVisit" className="text-sm font-medium">
                  Purpose of Visit *
                </Label>
                <Textarea
                  id="purposeOfVisit"
                  value={bookingForm.purposeOfVisit}
                  onChange={(e) => handleFormChange('purposeOfVisit', e.target.value)}
                  placeholder="Please describe the reason for your visit..."
                  rows={3}
                  className={cn(
                    "min-h-[4rem] touch-manipulation resize-none",
                    errors.purposeOfVisit && "border-destructive"
                  )}
                  aria-describedby={errors.purposeOfVisit ? "purpose-error" : undefined}
                  required
                />
                {errors.purposeOfVisit && (
                  <p id="purpose-error" className="text-sm text-destructive mt-1" role="alert">
                    {errors.purposeOfVisit}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm font-medium">
                  Additional Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  value={bookingForm.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  placeholder="Any additional information you'd like to share..."
                  rows={2}
                  className="min-h-[3rem] touch-manipulation resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                type="submit" 
                className="w-full h-12 md:h-14 text-base md:text-lg font-medium touch-manipulation"
                disabled={submitting || !isOnline}
                aria-describedby="submit-help"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Booking Appointment...
                  </>
                ) : (
                  "Book Appointment"
                )}
              </Button>
              
              {!currentUser && (
                <p id="submit-help" className="text-center text-sm text-muted-foreground mt-4">
                  You'll be redirected to sign up before completing your booking
                </p>
              )}
              
              {!isOnline && (
                <p className="text-center text-sm text-destructive mt-2" role="alert">
                  Cannot book appointment while offline
                </p>
              )}
            </CardContent>
          </Card>
        </form>
      </main>

        <Footer />
      </div>
    </TooltipProvider>
  );
};

export default AppointmentBooking;