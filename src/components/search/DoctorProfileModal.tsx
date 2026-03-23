import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Star, MapPin, Video, Shield, Globe, Briefcase, Phone, Mail,
  Calendar, Clock, Users, Award, Building2, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, parseISO } from 'date-fns';

interface DoctorProfileModalProps {
  doctor: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookAppointment: () => void;
  isLoggedIn: boolean;
}

interface AvailabilitySlot {
  day: string;
  date: string;
  slots: { start_time: string; end_time: string }[];
}

export function DoctorProfileModal({ doctor, open, onOpenChange, onBookAppointment, isLoggedIn }: DoctorProfileModalProps) {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  useEffect(() => {
    if (open && doctor?.id) {
      loadAvailability(doctor.id);
    }
  }, [open, doctor?.id]);

  const loadAvailability = async (doctorId: string) => {
    setLoadingAvailability(true);
    try {
      const today = new Date();
      const days: AvailabilitySlot[] = [];

      // Fetch schedule settings
      const { data: schedule } = await supabase
        .from('schedule_settings')
        .select('day_of_week, start_time, end_time, is_active')
        .eq('doctor_id', doctorId);

      // Fetch existing appointments for the next 7 days
      const startDate = format(today, 'yyyy-MM-dd');
      const endDate = format(addDays(today, 6), 'yyyy-MM-dd');

      const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_date, start_time, end_time')
        .eq('doctor_id', doctorId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .in('status', ['pending', 'confirmed']);

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

      for (let i = 0; i < 7; i++) {
        const date = addDays(today, i);
        const dayName = dayNames[date.getDay()];
        const dateStr = format(date, 'yyyy-MM-dd');

        const daySchedule = (schedule || []).find(
          (s: any) => s.day_of_week?.toLowerCase() === dayName && s.is_active
        );

        if (daySchedule) {
          // Generate 30-min slots
          const slots: { start_time: string; end_time: string }[] = [];
          const [startH, startM] = daySchedule.start_time.split(':').map(Number);
          const [endH, endM] = daySchedule.end_time.split(':').map(Number);
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;

          const dayAppointments = (appointments || []).filter(
            (a: any) => a.appointment_date === dateStr
          );

          for (let m = startMinutes; m + 30 <= endMinutes; m += 30) {
            const slotStart = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
            const slotEnd = `${String(Math.floor((m + 30) / 60)).padStart(2, '0')}:${String((m + 30) % 60).padStart(2, '0')}`;

            const isBooked = dayAppointments.some((a: any) => {
              return a.start_time <= slotStart && a.end_time > slotStart;
            });

            if (!isBooked) {
              slots.push({ start_time: slotStart, end_time: slotEnd });
            }
          }

          days.push({
            day: format(date, 'EEE'),
            date: dateStr,
            slots,
          });
        } else {
          days.push({ day: format(date, 'EEE'), date: dateStr, slots: [] });
        }
      }

      setAvailability(days);
    } catch (err) {
      console.error('Failed to load availability:', err);
    } finally {
      setLoadingAvailability(false);
    }
  };

  if (!doctor) return null;

  const initials = (doctor.name || 'D')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const locationParts = [doctor.practiceCity, doctor.practiceCountry].filter(Boolean);
  const locationStr = doctor.location || locationParts.join(', ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-5">
            {/* Header - Avatar + Name */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                <AvatarImage src={doctor.imageUrl} alt={doctor.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <DialogHeader className="text-left p-0">
                  <DialogTitle className="text-xl text-foreground">{doctor.name}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {doctor.specialty && (
                    <Badge variant="secondary">{doctor.specialty}</Badge>
                  )}
                  {doctor.acceptsNewPatients && (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Accepting Patients
                    </Badge>
                  )}
                </div>
                {doctor.rating != null && doctor.rating > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-foreground">{doctor.rating.toFixed(1)}</span>
                    <span>({doctor.reviewCount || 0} reviews)</span>
                    {doctor.appointmentCount != null && doctor.appointmentCount > 0 && (
                      <span className="ml-2">• {doctor.appointmentCount} appointments</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Tabs */}
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="calendar">Availability</TabsTrigger>
              </TabsList>

              {/* About Tab */}
              <TabsContent value="about" className="space-y-4 mt-4">
                {/* Bio */}
                {doctor.bio && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">About</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{doctor.bio}</p>
                  </div>
                )}

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {doctor.yearsExperience != null && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">{doctor.yearsExperience} years experience</span>
                    </div>
                  )}
                  {locationStr && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">{locationStr}</span>
                    </div>
                  )}
                  {doctor.videoConsultation && (
                    <div className="flex items-center gap-2 text-sm">
                      <Video className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Video consultation</span>
                    </div>
                  )}
                  {doctor.acceptsInsurance && (
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Accepts insurance</span>
                    </div>
                  )}
                </div>

                {/* Languages */}
                {doctor.languages && doctor.languages.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-primary" /> Languages
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {doctor.languages.map((lang: string) => (
                        <Badge key={lang} variant="outline" className="text-xs">{lang}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consultation Fee */}
                {doctor.consultationFee != null && (
                  <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Consultation fee</span>
                    <span className="text-lg font-semibold text-foreground">${doctor.consultationFee}</span>
                  </div>
                )}
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-4">
                {/* Practice Info */}
                {doctor.practiceName && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-primary" /> Practice
                    </h4>
                    <p className="text-sm text-muted-foreground">{doctor.practiceName}</p>
                    {doctor.practiceAddress && (
                      <p className="text-sm text-muted-foreground mt-0.5">{doctor.practiceAddress}</p>
                    )}
                    {locationStr && (
                      <p className="text-sm text-muted-foreground mt-0.5">{locationStr}</p>
                    )}
                  </div>
                )}

                {/* License */}
                {doctor.licenseNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">License: {doctor.licenseNumber}</span>
                  </div>
                )}

                {/* Contact */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Contact</h4>
                  <div className="space-y-2">
                    {doctor.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">{doctor.email}</span>
                      </div>
                    )}
                    {doctor.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">{doctor.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 bg-muted/50 rounded-lg p-3">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">{doctor.rating?.toFixed(1) || '—'}</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">{doctor.reviewCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">{doctor.yearsExperience || '—'}</p>
                    <p className="text-xs text-muted-foreground">Years Exp.</p>
                  </div>
                </div>
              </TabsContent>

              {/* Calendar/Availability Tab */}
              <TabsContent value="calendar" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Next 7 Days Availability</h4>
                </div>

                {loadingAvailability ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">Loading availability...</div>
                ) : (
                  <div className="space-y-3">
                    {availability.map((day) => (
                      <div key={day.date} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">
                            {day.day} — {format(parseISO(day.date), 'MMM d')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {day.slots.length > 0 ? `${day.slots.length} slots` : 'No availability'}
                          </span>
                        </div>
                        {day.slots.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {day.slots.slice(0, 12).map((slot) => (
                              <Badge
                                key={slot.start_time}
                                variant="outline"
                                className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                onClick={() => onBookAppointment()}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {slot.start_time}
                              </Badge>
                            ))}
                            {day.slots.length > 12 && (
                              <Badge variant="secondary" className="text-xs">
                                +{day.slots.length - 12} more
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Not available</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Book Button */}
            <Button onClick={onBookAppointment} className="w-full" size="lg">
              <Calendar className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
