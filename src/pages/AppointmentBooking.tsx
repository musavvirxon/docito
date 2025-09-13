import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, Star, User, Phone, Mail, FileText, ArrowLeft } from "lucide-react";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
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
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

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

  // Generate time slots from 9 AM to 5 PM in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  useEffect(() => {
    checkUserAuth();
    if (doctorId) {
      fetchDoctorInfo();
      fetchDoctorProcedures();
    }
  }, [doctorId]);

  useEffect(() => {
    if (selectedDate) {
      // For now, show all slots as available (in real app, check against appointments)
      setAvailableSlots(generateTimeSlots());
    }
  }, [selectedDate]);

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
      // Mock procedures data (replace with real Supabase query)
      const mockProcedures: Procedure[] = [
        {
          id: "1",
          name: "Initial Consultation",
          duration_minutes: 60,
          fee_amount: 200,
          description: "Comprehensive cardiac evaluation and consultation"
        },
        {
          id: "2", 
          name: "Follow-up Visit",
          duration_minutes: 30,
          fee_amount: 150,
          description: "Regular follow-up appointment"
        },
        {
          id: "3",
          name: "ECG Test",
          duration_minutes: 30,
          fee_amount: 100,
          description: "Electrocardiogram test and analysis"
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
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      handleFormChange('appointmentDate', date);
      handleFormChange('timeSlot', ''); // Reset time slot when date changes
    }
  };

  const handleTimeSlotSelect = (slot: string) => {
    handleFormChange('timeSlot', slot);
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
        status: 'pending',
        purpose_of_visit: bookingForm.purposeOfVisit,
        patient_notes: bookingForm.notes,
        confirmation_code: `APPT-${Date.now()}`,
        payment_status: 'none'
      };

      // For now, just simulate the booking since appointments table may not exist yet
      console.log("Appointment data (would be saved to appointments table):", appointmentData);
      toast.success("Appointment booked successfully! (Demo mode - database table needed)");
      navigate('/patient-dashboard');
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
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Select Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot}
                      type="button"
                      variant={bookingForm.timeSlot === slot ? "default" : "outline"}
                      onClick={() => handleTimeSlotSelect(slot)}
                      className="text-sm"
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
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