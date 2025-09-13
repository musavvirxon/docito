import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Calendar, MapPin, Clock, User, FileText, Mail, Phone, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AppointmentDetails {
  id: string;
  confirmationCode: string;
  date: string;
  startTime: string;
  endTime: string;
  doctorName: string;
  doctorSpecialty: string;
  procedure: string;
  fee: number;
  location: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  purposeOfVisit: string;
  notes?: string;
}

// Mock data - in real app this would come from Supabase
const mockAppointmentDetails: AppointmentDetails = {
  id: '1',
  confirmationCode: 'APT-2024-001234',
  date: '2024-01-25',
  startTime: '10:00',
  endTime: '10:30',
  doctorName: 'Dr. Sarah Johnson',
  doctorSpecialty: 'General Dentistry',
  procedure: 'Regular Cleaning',
  fee: 120,
  location: 'Downtown Dental Clinic, 123 Main St, Suite 200',
  patientName: 'John Doe',
  patientEmail: 'john.doe@email.com',
  patientPhone: '(555) 123-4567',
  purposeOfVisit: 'Routine dental cleaning and checkup',
  notes: 'No specific concerns'
};

const BookingConfirmation = () => {
  const { appointmentId } = useParams();
  const { toast } = useToast();
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call - in real app, fetch from Supabase
    setTimeout(() => {
      setAppointment(mockAppointmentDetails);
      setLoading(false);
    }, 500);
  }, [appointmentId]);

  const generateCalendarUrl = (type: 'google' | 'outlook' | 'apple') => {
    if (!appointment) return '';

    const startDateTime = new Date(`${appointment.date}T${appointment.startTime}`);
    const endDateTime = new Date(`${appointment.date}T${appointment.endTime}`);
    
    const title = `Dental Appointment - ${appointment.procedure}`;
    const details = `Appointment with ${appointment.doctorName}\nProcedure: ${appointment.procedure}\nLocation: ${appointment.location}\nConfirmation: ${appointment.confirmationCode}`;
    
    switch (type) {
      case 'google':
        const googleStart = startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const googleEnd = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${googleStart}/${googleEnd}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(appointment.location)}`;
      
      case 'outlook':
        return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${startDateTime.toISOString()}&enddt=${endDateTime.toISOString()}&body=${encodeURIComponent(details)}&location=${encodeURIComponent(appointment.location)}`;
      
      case 'apple':
        return `data:text/calendar;charset=utf8,BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${title}
DESCRIPTION:${details}
LOCATION:${appointment.location}
END:VEVENT
END:VCALENDAR`;
    }
  };

  const handleCalendarAdd = (type: 'google' | 'outlook' | 'apple') => {
    const url = generateCalendarUrl(type);
    if (type === 'apple') {
      const blob = new Blob([url.split(',')[1]], { type: 'text/calendar' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'appointment.ics';
      link.click();
    } else {
      window.open(url, '_blank');
    }
    
    toast({
      title: "Calendar Event",
      description: `${type === 'google' ? 'Google' : type === 'outlook' ? 'Outlook' : 'Apple'} Calendar opened`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Appointment Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find the appointment you're looking for.</p>
          <Link to="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="container mx-auto px-4 py-8 print:py-4">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8 print:mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Booking Confirmed!</h1>
            <p className="text-muted-foreground">Your appointment has been successfully scheduled</p>
          </div>

          {/* Appointment Details */}
          <Card className="mb-6 print:shadow-none print:border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Confirmation Code:</span>
                <Badge variant="secondary" className="text-sm font-mono">
                  {appointment.confirmationCode}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Date & Time</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(appointment.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.startTime} - {appointment.endTime}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{appointment.doctorName}</p>
                      <p className="text-sm text-muted-foreground">{appointment.doctorSpecialty}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Procedure</p>
                      <p className="text-sm text-muted-foreground">{appointment.procedure}</p>
                      <p className="text-sm font-medium text-primary">${appointment.fee}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{appointment.location}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="font-medium mb-2">Purpose of Visit</p>
                <p className="text-sm text-muted-foreground">{appointment.purposeOfVisit}</p>
                {appointment.notes && (
                  <>
                    <p className="font-medium mt-3 mb-2">Additional Notes</p>
                    <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add to Calendar */}
          <Card className="mb-6 print:hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Add to Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => handleCalendarAdd('google')}
                  className="w-full"
                >
                  Google Calendar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleCalendarAdd('outlook')}
                  className="w-full"
                >
                  Outlook
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleCalendarAdd('apple')}
                  className="w-full"
                >
                  Apple Calendar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Arrive 15 minutes early</p>
                  <p className="text-sm text-muted-foreground">Please bring a valid ID and your insurance card</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Complete intake forms</p>
                  <p className="text-sm text-muted-foreground">You can complete forms online or arrive early to fill them out</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Need to reschedule?</p>
                  <p className="text-sm text-muted-foreground">Call us at least 24 hours in advance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Phone:</span>
                <span className="text-muted-foreground">(555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Email:</span>
                <span className="text-muted-foreground">info@dentalclinic.com</span>
              </div>
              <p className="text-sm text-muted-foreground">
                For changes or cancellations, please contact us at least 24 hours before your appointment.
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 print:hidden">
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Print Confirmation
            </Button>
            <Link to="/patient-dashboard" className="flex-1">
              <Button variant="outline" className="w-full">
                View All Appointments
              </Button>
            </Link>
            <Link to="/search-results" className="flex-1">
              <Button className="w-full">
                Book Another Appointment
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;