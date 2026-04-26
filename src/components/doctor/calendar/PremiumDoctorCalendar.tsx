// Path: src/components/doctor/calendar/PremiumDoctorCalendar.tsx
// File: src/components/doctor/calendar/PremiumDoctorCalendar.tsx
// FILE: src/components/doctor/calendar/PremiumDoctorCalendar.tsx
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import CalendarHeader from './CalendarHeader';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import AppointmentModal from './AppointmentModal';
import AppointmentQuickPreview from './AppointmentQuickPreview';
import { useCalendarData } from './useCalendarData';
import ManualBookAppointmentModal from '../ManualBookAppointmentModal';
import type { Patient } from '@/components/patient/PatientSelector';
import BlockTimeModal from '../BlockTimeModal';
import SetAvailabilityModal from '../SetAvailabilityModal';
import type { CalendarView, CalendarFilters, CalendarAppointment } from './types';
import { defaultFilters } from './types';

interface PremiumDoctorCalendarProps {
  doctorId?: string;
  practiceId?: string;
}

const PremiumDoctorCalendar = ({ doctorId: doctorIdProp, practiceId }: PremiumDoctorCalendarProps) => {
  const { t } = useTranslation('dashboard');
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Use prop or denormalized doctor_id from profile, with fallback resolution
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const doctorId = doctorIdProp || (profile as any)?.doctor_id || resolvedId || null;

  // Fallback: resolve doctor_id from doctors table if not available from profile
  useEffect(() => {
    if (doctorIdProp || (profile as any)?.doctor_id || resolvedId) return;
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.id) setResolvedId(data.id);
      });
    return () => { cancelled = true; };
  }, [user?.id, doctorIdProp, profile, resolvedId]);

  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('day');
  const [filters, setFilters] = useState<CalendarFilters>(defaultFilters);
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [isQuickPreviewOpen, setIsQuickPreviewOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [prefilledTime, setPrefilledTime] = useState<string | undefined>();
  const [doctorSpecialty, setDoctorSpecialty] = useState<string>('');

  const [followupOfAppointmentId, setFollowupOfAppointmentId] = useState<string | null>(null);
  const [preselectedPatient, setPreselectedPatient] = useState<Patient | null>(null);

  // Safety check - only warn if profile is fully loaded but doctor_id still missing
  useEffect(() => {
    if (profile && profile.role === 'doctor' && !doctorId) {
      console.warn('Doctor ID not yet resolved for calendar');
    }
  }, [profile, doctorId]);

  // Fetch doctor specialty (for dentist UI)
  useEffect(() => {
    let cancelled = false;

    async function loadSpecialty() {
      if (!user?.id) return;

      // If your doctors table has a "specialty" field, this will populate the dentist tooling.
      const { data, error } = await supabase
        .from('doctors')
        .select('specialty')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (!error) setDoctorSpecialty((data as any)?.specialty ?? '');
    }

    loadSpecialty();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Deep-link follow-up booking:
  // Supported formats:
  // 1) /doctor-dashboard?section=calendar&followupOf=<appointmentId>&patient=<patientId>&patientType=registered|direct
  // 2) /doctor-dashboard?section=calendar&followupOf=<appointmentId>&patient=reg:<patientId>
  // 3) /doctor-dashboard?section=calendar&followupOf=<appointmentId>&patient=dp:<doctorPatientId>
  useEffect(() => {
    if (!doctorId) return;

    const sp = new URLSearchParams(location.search);
    const followupOf = sp.get('followupOf');
    const patientParam = sp.get('patient');
    const patientTypeRaw = sp.get('patientType') || sp.get('type') || null;

    if (!followupOf || !patientParam) return;

    const parsePatientParam = () => {
      const raw = String(patientParam || '').trim();
      if (!raw) return null as null | { id: string; source: Patient['source'] };

      // New format: reg:<uuid> or dp:<uuid>
      if (raw.includes(':')) {
        const [prefix, rest] = raw.split(':', 2);
        const id = (rest || '').trim();
        if (!id) return null;

        if (prefix === 'reg' || prefix === 'registered') {
          return { id, source: 'registered' as const };
        }
        if (prefix === 'dp' || prefix === 'direct' || prefix === 'doctor_added') {
          return { id, source: 'doctor_added' as const };
        }
      }

      // Legacy: patient=<uuid>&patientType=registered|direct
      const legacySource: Patient['source'] =
        patientTypeRaw === 'registered' ? 'registered' : 'doctor_added';

      return { id: raw, source: legacySource };
    };

    const parsed = parsePatientParam();
    if (!parsed) return;

    // Guard: avoid reopening if already in the same follow-up deep-link state
    if (isBookModalOpen && followupOfAppointmentId === followupOf) return;

    const loadPatient = async () => {
      try {
        const patientSource = parsed.source;
        const patientId = parsed.id;

        if (patientSource === 'registered') {
          const { data, error } = await supabase
            .from('profiles')
            .select('user_id, full_name, phone, email, date_of_birth, created_at')
            .eq('user_id', patientId)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            setPreselectedPatient({
              id: data.user_id,
              name: data.full_name || 'Patient',
              phone: data.phone || undefined,
              email: data.email || undefined,
              date_of_birth: data.date_of_birth || undefined,
              created_at: data.created_at || undefined,
              source: 'registered',
            });
          } else {
            throw new Error('Patient not found');
          }
        } else {
          const { data, error } = await supabase
            .from('doctor_patients')
            .select('id, full_name, phone, email, date_of_birth, created_at')
            .eq('id', patientId)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            setPreselectedPatient({
              id: data.id,
              name: data.full_name || 'Patient',
              phone: data.phone || undefined,
              email: data.email || undefined,
              date_of_birth: data.date_of_birth || undefined,
              created_at: data.created_at || undefined,
              source: 'doctor_added',
            });
          } else {
            throw new Error('Patient not found');
          }
        }

        setFollowupOfAppointmentId(followupOf);
        setPrefilledTime(undefined);
        setIsBookModalOpen(true);
      } catch (e) {
        console.error('Failed to prefill follow-up booking:', e);
        toast.error('Failed to prefill follow-up booking');
      }
    };

    loadPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, location.search]);

  // Fetch calendar data
  const {
    appointments,
    blockedTimes,
    loading,
    scheduleSettings,
    refetch,
    getScheduleHealth,
    getAppointmentsForDate,
    getBlockedTimesForDate,
  } = useCalendarData({ doctorId, selectedDate, view });

  // Handlers
  const handleToday = useCallback(() => setSelectedDate(new Date()), []);

  const handleViewChange = useCallback((newView: CalendarView) => setView(newView), []);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setView('day');
  }, []);

  const handleAppointmentClick = useCallback((apt: CalendarAppointment) => {
    // FIX 4: persist current calendar position so the session back button can return here
    try {
      sessionStorage.setItem('calendarReturnDate', apt.appointment_date || '');
      sessionStorage.setItem('calendarReturnView', view || 'week');
    } catch {
      // ignore storage errors
    }
    setSelectedAppointment(apt);
    setIsQuickPreviewOpen(true);
  }, [view]);

  const handleStartSession = useCallback(
    (apt: CalendarAppointment) => {
      const type = (apt.appointment_type || 'in_person') as string;

      // Start based on appointment type
      if (type === 'messaging') {
        // Quick preview "Message" action handles navigation
        return;
      }

      // For in_person / video / home_visit / follow_up
      navigate(`/appointment-session/${apt.id}`);
    },
    [navigate]
  );

  const handleViewPatient = useCallback(
    (patientId: string, patientType: 'registered' | 'direct') => {
      if (!patientId) {
        toast.error(t('doctor.calendar.patientMissing', 'Patient information not available.'));
        return;
      }
      navigate(`/doctor/patient/${patientId}?type=${patientType}`);
    },
    [navigate, t]
  );

  const handleOpenFullModal = useCallback(() => {
    setIsQuickPreviewOpen(false);
    setIsAppointmentModalOpen(true);
  }, []);

  const handleSlotClick = useCallback((time: string) => {
    setPrefilledTime(time);
    setIsBookModalOpen(true);
  }, []);

  const handleBlockSlot = useCallback((time: string) => {
    setPrefilledTime(time);
    setIsBlockModalOpen(true);
  }, []);

  const handleAddAppointment = useCallback(() => {
    setPrefilledTime(undefined);
    setIsBookModalOpen(true);
  }, []);

  const handleBlockTime = useCallback(() => {
    setPrefilledTime(undefined);
    setIsBlockModalOpen(true);
  }, []);

  const handleSetAvailability = useCallback(() => {
    setIsAvailabilityModalOpen(true);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 't':
          handleToday();
          break;
        case 'arrowleft':
          setSelectedDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() - (view === 'day' ? 1 : view === 'week' ? 7 : 30));
            return d;
          });
          break;
        case 'arrowright':
          setSelectedDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + (view === 'day' ? 1 : view === 'week' ? 7 : 30));
            return d;
          });
          break;
        case 'n':
          handleAddAppointment();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, handleToday, handleAddAppointment]);

  const dayAppointments = getAppointmentsForDate(selectedDate);
  const dayBlockedTimes = getBlockedTimesForDate(selectedDate);
  const scheduleHealth = getScheduleHealth(selectedDate);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4">
          <CalendarHeader
            selectedDate={selectedDate}
            view={view}
            filters={filters}
            onDateChange={setSelectedDate}
            onViewChange={handleViewChange}
            onFiltersChange={setFilters}
            onToday={handleToday}
            onAddAppointment={handleAddAppointment}
            onBlockTime={handleBlockTime}
            onSetAvailability={handleSetAvailability}
          />
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          {view === 'day' && (
            <DayView
              selectedDate={selectedDate}
              appointments={dayAppointments}
              blockedTimes={dayBlockedTimes}
              scheduleSettings={scheduleSettings}
              scheduleHealth={scheduleHealth}
              filters={filters}
              loading={loading}
              onAppointmentClick={handleAppointmentClick}
              onSlotClick={handleSlotClick}
              onBlockSlot={handleBlockSlot}
            />
          )}
          {view === 'week' && (
            <WeekView
              selectedDate={selectedDate}
              appointments={appointments}
              blockedTimes={blockedTimes}
              scheduleSettings={scheduleSettings}
              getScheduleHealth={getScheduleHealth}
              filters={filters}
              loading={loading}
              onAppointmentClick={handleAppointmentClick}
              onDayClick={handleDayClick}
            />
          )}
          {view === 'month' && (
            <MonthView
              selectedDate={selectedDate}
              appointments={appointments}
              scheduleSettings={scheduleSettings}
              getScheduleHealth={getScheduleHealth}
              filters={filters}
              loading={loading}
              onDayClick={handleDayClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Quick Preview */}
      <AppointmentQuickPreview
        appointment={selectedAppointment}
        isOpen={isQuickPreviewOpen}
        onClose={() => setIsQuickPreviewOpen(false)}
        onOpenFullModal={handleOpenFullModal}
        onStartSession={handleStartSession}
        onViewPatient={handleViewPatient}
        doctorSpecialty={doctorSpecialty}
      />

      {/* Full Appointment Modal */}
      {selectedAppointment && (
        <AppointmentModal
          isOpen={isAppointmentModalOpen}
          onClose={() => setIsAppointmentModalOpen(false)}
          appointment={selectedAppointment}
          onReschedule={refetch}
          onCancel={refetch}
        />
      )}

      {/* Modals */}
      <ManualBookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => {
          setIsBookModalOpen(false);
          setPrefilledTime(undefined);
          setFollowupOfAppointmentId(null);
          setPreselectedPatient(null);
          if (location.search) navigate({ pathname: location.pathname }, { replace: true });
        }}
        doctorId={doctorId}
        practiceId={practiceId}
        onSuccess={refetch}
        prefilledDate={selectedDate}
        prefilledTime={prefilledTime}
        preselectedPatient={preselectedPatient}
        followupOfAppointmentId={followupOfAppointmentId}
        forceAppointmentType={followupOfAppointmentId ? 'follow_up' : undefined}
      />

      <BlockTimeModal
        isOpen={isBlockModalOpen}
        onClose={() => {
          setIsBlockModalOpen(false);
          setPrefilledTime(undefined);
        }}
        onSuccess={refetch}
        prefilledDate={selectedDate}
        prefilledTime={prefilledTime}
      />

      <SetAvailabilityModal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        doctorId={doctorId}
        practiceId={practiceId}
        onSuccess={refetch}
      />
    </motion.div>
  );
};

export default PremiumDoctorCalendar;
