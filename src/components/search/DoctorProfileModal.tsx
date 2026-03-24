import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
  Star, MapPin, Video, Shield, Globe, Briefcase, Phone, Mail,
  Calendar, Clock, Users, Award, Building2, CheckCircle2, User,
  Stethoscope, BadgeCheck, FileText, MessageSquare, Heart, Link2, ExternalLink
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
  const navigate = useNavigate();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [verification, setVerification] = useState<any>(null);
  const [practice, setPractice] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [extraLoading, setExtraLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (open && doctor?.id) {
      loadAvailability(doctor.id);
      loadExtraData(doctor.id, doctor.practiceId);
    }
  }, [open, doctor?.id]);

  const loadExtraData = async (doctorId: string, practiceId?: string) => {
    setExtraLoading(true);
    try {
      const verRes = await supabase
        .from('doctor_verification')
        .select('specialty, license_number, years_of_experience, status, submitted_at, reviewed_at')
        .eq('doctor_id', doctorId)
        .maybeSingle();
      setVerification(verRes?.data || null);

      const { data: svcData } = await (supabase
        .from('procedures' as any)
        .select('id, name, description, cost, duration_minutes, category')
        .eq('doctor_id', doctorId)
        .eq('is_active', true)
        .limit(20) as any);
      setServices(svcData || []);

      if (practiceId) {
        const practiceRes = await supabase
          .from('practices')
          .select('name, address, city, country, phone, email, logo_url, practice_type, description, website')
          .eq('id', practiceId)
          .maybeSingle();
        setPractice(practiceRes?.data || null);
      } else {
        setPractice(null);
      }
    } catch (err) {
      console.error('Failed to load extra data:', err);
    } finally {
      setExtraLoading(false);
    }
  };

  const loadAvailability = async (doctorId: string) => {
    setLoadingAvailability(true);
    try {
      const today = new Date();
      const days: AvailabilitySlot[] = [];

      const { data: scheduleData } = await supabase
        .from('schedule_settings')
        .select('working_days')
        .eq('doctor_id', doctorId)
        .maybeSingle();

      const workingDays: Record<string, any> = (scheduleData?.working_days as Record<string, any>) || {};

      const startDate = format(today, 'yyyy-MM-dd');
      const endDate = format(addDays(today, 13), 'yyyy-MM-dd');

      const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_date, start_time, end_time')
        .eq('doctor_id', doctorId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .in('status', ['pending', 'confirmed']);

      // Also check blocked_times
      const { data: blockedTimes } = await supabase
        .from('blocked_times')
        .select('blocked_date, start_time, end_time')
        .eq('doctor_id', doctorId)
        .gte('blocked_date', startDate)
        .lte('blocked_date', endDate);

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

      for (let i = 0; i < 14; i++) {
        const date = addDays(today, i);
        const dayName = dayNames[date.getDay()];
        const dateStr = format(date, 'yyyy-MM-dd');

        const dayConfig = workingDays[dayName];
        const isActive = dayConfig?.enabled || dayConfig?.is_active || false;

        if (isActive && dayConfig) {
          const slots: { start_time: string; end_time: string }[] = [];
          const startTime = dayConfig.start || dayConfig.start_time || '09:00';
          const endTime = dayConfig.end || dayConfig.end_time || '17:00';
          const [startH, startM] = startTime.split(':').map(Number);
          const [endH, endM] = endTime.split(':').map(Number);
          const startMinutes = startH * 60 + (startM || 0);
          const endMinutes = endH * 60 + (endM || 0);

          const dayAppointments = (appointments || []).filter(
            (a: any) => a.appointment_date === dateStr
          );
          const dayBlocked = (blockedTimes || []).filter(
            (b: any) => b.blocked_date === dateStr
          );

          // Skip past slots for today
          const now = new Date();
          const isToday = dateStr === format(now, 'yyyy-MM-dd');
          const currentMinutes = now.getHours() * 60 + now.getMinutes();

          for (let m = startMinutes; m + 30 <= endMinutes; m += 30) {
            if (isToday && m < currentMinutes + 30) continue;

            const slotStart = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
            const slotEnd = `${String(Math.floor((m + 30) / 60)).padStart(2, '0')}:${String((m + 30) % 60).padStart(2, '0')}`;

            const isBooked = dayAppointments.some((a: any) =>
              a.start_time <= slotStart && a.end_time > slotStart
            );
            const isBlocked = dayBlocked.some((b: any) =>
              b.start_time <= slotStart && b.end_time > slotStart
            );

            if (!isBooked && !isBlocked) {
              slots.push({ start_time: slotStart, end_time: slotEnd });
            }
          }

          days.push({ day: format(date, 'EEE'), date: dateStr, slots });
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
  const isIndependent = !doctor.practiceId;
  const consultationTypes: string[] = doctor.consultationTypes || [];
  const profileLink = doctor.customProfileLink || doctor.id;
  const profileUrl = `/doctor/${profileLink}`;
  const genderLabel = doctor.gender ? doctor.gender.charAt(0).toUpperCase() + doctor.gender.slice(1) : null;

  // Calendar helpers
  const totalAvailableSlots = availability.reduce((sum, d) => sum + d.slots.length, 0);
  const daysWithAvailability = availability.filter(d => d.slots.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] p-0 overflow-hidden">
        <DialogDescription className="sr-only">Doctor profile details</DialogDescription>
        <ScrollArea className="max-h-[92vh]">
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl p-5">
              <div className="flex items-start gap-5">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={doctor.imageUrl} alt={doctor.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <DialogHeader className="text-left p-0">
                    <DialogTitle className="text-2xl text-foreground">{doctor.name}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground mt-0.5">{doctor.specialty}</p>

                  {/* Location & gender */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                    {locationStr && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {locationStr}
                      </span>
                    )}
                    {genderLabel && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" /> {genderLabel}
                      </span>
                    )}
                    {doctor.yearsExperience && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" /> {doctor.yearsExperience}+ yrs
                      </span>
                    )}
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {doctor.verified && (
                      <Badge className="bg-accent text-accent-foreground">
                        <BadgeCheck className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    )}
                    {doctor.acceptsNewPatients && (
                      <Badge variant="outline" className="text-primary border-primary/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Accepting Patients
                      </Badge>
                    )}
                    {isIndependent ? (
                      <Badge variant="outline" className="text-secondary-foreground border-secondary">
                        <User className="h-3 w-3 mr-1" /> Independent
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-secondary-foreground border-secondary">
                        <Building2 className="h-3 w-3 mr-1" /> {doctor.practiceName || 'Clinic-Based'}
                      </Badge>
                    )}
                  </div>

                  {/* Rating */}
                  {doctor.rating != null && doctor.rating > 0 && (
                    <div className="flex items-center gap-1.5 mt-2.5 text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="font-semibold text-foreground">{doctor.rating.toFixed(1)}</span>
                      <span>({doctor.reviewCount || 0} reviews)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile link */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-3 right-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onOpenChange(false);
                  navigate(profileUrl);
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Full Profile
              </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="p-3 text-center bg-muted/30">
                <p className="text-lg font-bold text-foreground">{doctor.rating?.toFixed(1) || '—'}</p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </Card>
              <Card className="p-3 text-center bg-muted/30">
                <p className="text-lg font-bold text-foreground">{doctor.reviewCount || 0}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </Card>
              <Card className="p-3 text-center bg-muted/30">
                <p className="text-lg font-bold text-foreground">{doctor.yearsExperience || '—'}</p>
                <p className="text-xs text-muted-foreground">Years Exp.</p>
              </Card>
              <Card className="p-3 text-center bg-muted/30">
                <p className="text-lg font-bold text-foreground">{totalAvailableSlots}</p>
                <p className="text-xs text-muted-foreground">Open Slots</p>
              </Card>
            </div>

            <Separator />

            {/* Tabs */}
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="practice">Practice</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="calendar">
                  Calendar
                  {totalAvailableSlots > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{totalAvailableSlots}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ─── About Tab ─── */}
              <TabsContent value="about" className="space-y-5 mt-4">
                {doctor.bio && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-primary" /> Biography
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{doctor.bio}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4 text-primary" /> Professional Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoRow icon={Briefcase} label="Specialty" value={doctor.specialty} />
                    <InfoRow icon={Award} label="Experience" value={doctor.yearsExperience ? `${doctor.yearsExperience} years` : undefined} />
                    <InfoRow icon={Award} label="License No." value={doctor.licenseNumber || verification?.license_number} />
                    <InfoRow icon={User} label="Gender" value={genderLabel} />
                    <InfoRow
                      icon={BadgeCheck}
                      label="Verification"
                      value={
                        verification?.status
                          ? verification.status.charAt(0).toUpperCase() + verification.status.slice(1)
                          : doctor.verified ? 'Verified' : 'Pending'
                      }
                    />
                    {doctor.created_at && (
                      <InfoRow icon={Calendar} label="Joined" value={format(parseISO(doctor.created_at), 'MMM yyyy')} />
                    )}
                  </div>
                </div>

                {/* Profile Link */}
                <div className="bg-muted/30 border border-border rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Link2 className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Profile:</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">
                      docito.app/doctor/{profileLink}
                    </code>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://docito.app/doctor/${profileLink}`);
                    }}
                  >
                    Copy
                  </Button>
                </div>

                {consultationTypes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-primary" /> Consultation Types
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {consultationTypes.map((ct: string) => (
                        <Badge key={ct} variant="secondary" className="capitalize">
                          {ct === 'video' && <Video className="h-3 w-3 mr-1" />}
                          {ct === 'in_person' && <Users className="h-3 w-3 mr-1" />}
                          {ct === 'phone' && <Phone className="h-3 w-3 mr-1" />}
                          {ct === 'messaging' && <MessageSquare className="h-3 w-3 mr-1" />}
                          {ct.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

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

                {doctor.consultationFee != null && (
                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Consultation Fee</span>
                    <span className="text-xl font-bold text-primary">${doctor.consultationFee}</span>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Contact Information</h4>
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
                    {locationStr && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">{locationStr}</span>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* ─── Practice Tab ─── */}
              <TabsContent value="practice" className="space-y-5 mt-4">
                {isIndependent ? (
                  <Card className="p-5 text-center space-y-2 bg-accent/50 border-accent">
                    <User className="h-10 w-10 mx-auto text-primary" />
                    <h4 className="font-semibold text-foreground">Independent Practitioner</h4>
                    <p className="text-sm text-muted-foreground">
                      This doctor operates independently and is not affiliated with a clinic.
                    </p>
                    <div className="flex justify-center gap-2 mt-3">
                      {consultationTypes.map((ct: string) => (
                        <Badge key={ct} variant="secondary" className="capitalize">{ct.replace(/_/g, ' ')}</Badge>
                      ))}
                    </div>
                  </Card>
                ) : (
                  <>
                    <div className="flex items-start gap-4">
                      {practice?.logo_url && (
                        <Avatar className="h-14 w-14 rounded-lg border">
                          <AvatarImage src={practice.logo_url} className="rounded-lg" />
                          <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                            <Building2 className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-lg">
                          {practice?.name || doctor.practiceName || 'Practice'}
                        </h4>
                        {practice?.practice_type && (
                          <Badge variant="outline" className="mt-1 capitalize">{practice.practice_type}</Badge>
                        )}
                      </div>
                    </div>

                    {practice?.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{practice.description}</p>
                    )}

                    <div className="grid grid-cols-1 gap-3">
                      {(practice?.address || doctor.practiceAddress) && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-primary mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">{practice?.address || doctor.practiceAddress}</p>
                            {(practice?.city || doctor.practiceCity) && (
                              <p className="text-muted-foreground">
                                {[practice?.city || doctor.practiceCity, practice?.country || doctor.practiceCountry].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {practice?.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-primary" />
                          <span className="text-muted-foreground">{practice.phone}</span>
                        </div>
                      )}
                      {practice?.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-primary" />
                          <span className="text-muted-foreground">{practice.email}</span>
                        </div>
                      )}
                      {practice?.website && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="h-4 w-4 text-primary" />
                          <a href={practice.website} target="_blank" rel="noopener noreferrer" className="text-primary underline">{practice.website}</a>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ─── Services Tab ─── */}
              <TabsContent value="services" className="space-y-4 mt-4">
                {services.length === 0 ? (
                  <div className="text-center py-8">
                    <Stethoscope className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No services listed yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {services.map((svc) => (
                      <Card key={svc.id} className="p-3 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{svc.name}</p>
                          {svc.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{svc.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            {svc.category && <Badge variant="outline" className="text-xs capitalize">{svc.category}</Badge>}
                            {svc.duration_minutes && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {svc.duration_minutes} min
                              </span>
                            )}
                          </div>
                        </div>
                        {svc.cost != null && (
                          <span className="text-sm font-semibold text-primary ml-3">${svc.cost}</span>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ─── Calendar Tab ─── */}
              <TabsContent value="calendar" className="space-y-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Next 14 Days</h4>
                  </div>
                  {totalAvailableSlots > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {totalAvailableSlots} slots available
                    </Badge>
                  )}
                </div>

                {loadingAvailability ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">Loading availability...</div>
                ) : (
                  <>
                    {/* Day selector strip */}
                    <div className="flex gap-1.5 overflow-x-auto pb-2">
                      {availability.map((day) => {
                        const hasSlots = day.slots.length > 0;
                        const isSelected = selectedDate === day.date;
                        return (
                          <button
                            key={day.date}
                            onClick={() => hasSlots && setSelectedDate(isSelected ? null : day.date)}
                            className={`
                              flex flex-col items-center min-w-[52px] px-2 py-2.5 rounded-xl border text-center transition-all
                              ${isSelected
                                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                : hasSlots
                                  ? 'bg-background border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                                  : 'bg-muted/20 border-transparent text-muted-foreground/50 cursor-not-allowed'
                              }
                            `}
                            disabled={!hasSlots}
                          >
                            <span className="text-[10px] font-medium uppercase">{day.day}</span>
                            <span className="text-base font-bold">{format(parseISO(day.date), 'd')}</span>
                            {hasSlots && (
                              <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-primary-foreground/80' : 'text-primary'}`}>
                                {day.slots.length}
                              </span>
                            )}
                            {!hasSlots && (
                              <span className="text-[9px] mt-0.5">—</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected day slots */}
                    {selectedDate && (() => {
                      const dayData = availability.find(d => d.date === selectedDate);
                      if (!dayData || dayData.slots.length === 0) return null;
                      return (
                        <div className="border border-border rounded-xl p-4 bg-muted/10">
                          <p className="text-sm font-medium text-foreground mb-3">
                            {format(parseISO(dayData.date), 'EEEE, MMMM d')}
                          </p>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {dayData.slots.map((slot) => (
                              <Button
                                key={slot.start_time}
                                variant="outline"
                                size="sm"
                                className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                                onClick={() => onBookAppointment()}
                              >
                                {slot.start_time}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* No selection prompt */}
                    {!selectedDate && daysWithAvailability.length > 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        Select a date above to view available time slots
                      </p>
                    )}

                    {daysWithAvailability.length === 0 && (
                      <div className="text-center py-8">
                        <Calendar className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No availability in the next 14 days</p>
                        <p className="text-xs text-muted-foreground mt-1">The doctor may not have set their schedule yet</p>
                      </div>
                    )}
                  </>
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

/* ─── Small helper component ─── */
function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-primary flex-shrink-0" />
      <span className="text-muted-foreground">
        <span className="font-medium text-foreground">{label}:</span> {value}
      </span>
    </div>
  );
}
