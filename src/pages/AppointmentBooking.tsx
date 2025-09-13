import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, Star, User, Phone, Mail, FileText, ArrowLeft, AlertCircle } from "lucide-react";
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

  const generateTimeSlots = () => {
    if (!selectedDate || !selectedProcedure) return;
    
    const slots = timeSlotCalculator.generateTimeSlots(
      selectedDate,
      selectedProcedure.duration_minutes,
      undefined,
      bookedAppointments
    );
    
    setAvailableSlots(slots);
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
    try {
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
      toast.error("Failed to load doctor information");
    }
  };

  const fetchDoctorProcedures = async () => {
    try {
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
      toast.error("Failed to load available procedures");
    } finally {
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
    if (!bookingForm.procedureId) {
      toast.error("Please select a procedure");
      return false;
    }
    if (!bookingForm.appointmentDate) {
      toast.error("Please select an appointment date");
      return false;
    }
    if (!bookingForm.timeSlot) {
      toast.error("Please select a time slot");
      return false;
    }
    if (!bookingForm.patientName.trim()) {
      toast.error("Please enter your name");
      return false;
    }
    if (!bookingForm.patientPhone.trim()) {
      toast.error("Please enter your phone number");
      return false;
    }
    if (!bookingForm.patientEmail.trim()) {
      toast.error("Please enter your email address");
      return false;
    }
    if (!bookingForm.purposeOfVisit.trim()) {
      toast.error("Please describe the purpose of your visit");
      return false;
    }
    return true;
  };

  const generateConfirmationCode = () => {
    return `APT-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Doctor Summary Panel */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="w-24 h-24 mx-auto md:mx-0">
                <AvatarImage src={doctor.profile_photo} alt={doctor.name} />
                <AvatarFallback className="text-lg">
                  {doctor.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold mb-2">{doctor.name}</h1>
                <p className="text-lg text-primary mb-2">{doctor.specialty}</p>
                
                <div className="flex items-center justify-center md:justify-start gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{doctor.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{doctor.practice_location}</span>
                  </div>
                </div>
                
                {doctor.bio && (
                  <p className="text-muted-foreground text-sm">{doctor.bio}</p>
                )}
              </div>
            </div>
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
              <Select 
                value={bookingForm.procedureId} 
                onValueChange={(value) => handleFormChange('procedureId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a procedure" />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((procedure) => (
                    <SelectItem key={procedure.id} value={procedure.id}>
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
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => 
                      date < new Date() || date > addDays(new Date(), 30)
                    }
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
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
                {availableSlots.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No available slots for this date. Please select another date or we'll automatically find the next available day.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                        <span className="text-xs text-muted-foreground">Available</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                        <span className="text-xs text-muted-foreground">Booked</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
                        <span className="text-xs text-muted-foreground">Break</span>
                      </div>
                    </div>

                    {/* Time Slots Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                            className={getSlotButtonClass(slot, isSelected)}
                            title={getSlotTooltip(slot)}
                          >
                            <div className="text-center">
                              <div className="font-medium">{slot.time}</div>
                              {slot.endTime && (
                                <div className="text-xs opacity-75">to {slot.endTime}</div>
                              )}
                            </div>
                          </Button>
                        );
                      })}
                    </div>

                    {/* Available slots summary */}
                    <div className="mt-4 text-sm text-muted-foreground">
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
                  <Label htmlFor="patientName">Full Name *</Label>
                  <Input
                    id="patientName"
                    value={bookingForm.patientName}
                    onChange={(e) => handleFormChange('patientName', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="patientPhone">Phone Number *</Label>
                  <Input
                    id="patientPhone"
                    value={bookingForm.patientPhone}
                    onChange={(e) => handleFormChange('patientPhone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="patientEmail">Email Address *</Label>
                <Input
                  id="patientEmail"
                  type="email"
                  value={bookingForm.patientEmail}
                  onChange={(e) => handleFormChange('patientEmail', e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <Label htmlFor="purposeOfVisit">Purpose of Visit *</Label>
                <Textarea
                  id="purposeOfVisit"
                  value={bookingForm.purposeOfVisit}
                  onChange={(e) => handleFormChange('purposeOfVisit', e.target.value)}
                  placeholder="Please describe the reason for your visit..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={bookingForm.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  placeholder="Any additional information you'd like to share..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={submitting}
              >
                {submitting ? "Booking Appointment..." : "Book Appointment"}
              </Button>
              
              {!currentUser && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  You'll be redirected to sign up before completing your booking
                </p>
              )}
            </CardContent>
          </Card>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default AppointmentBooking;