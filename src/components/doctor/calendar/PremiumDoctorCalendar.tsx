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

  // Use prop or denormalized doctor_id from profile
  const doctorId = doctorIdProp || (profile as any)?.doctor_id || null;

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

  // Safety check
  useEffect(() => {
    if (profile?.role === 'doctor' && !doctorId) {
      toast.error(t('doctor.calendar.profileLoading', 'Doctor profile still loading. Please refresh.'));
    }
  }, [profile, doctorId, t]);

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
  // /doctor-dashboard?section=calendar&followupOf=<appointmentId>&patient=reg:<user_id> OR dp:<doctor_patient_id>
  // Backward compat: patient=<id>&patientType=registered|direct
  useEffect(() => {
    if (!doctorId) return;

    const sp = new URLSearchParams(location.search);
    const followupOf = sp.get('followupOf');
    const patientRaw = sp.get('patient');
    const patientTypeRaw = sp.get('patientType'); // legacy

    if (!followupOf || !patientRaw) return;

    let patientId = patientRaw;
    let patientSource: Patient['source'] | null = null;

    // New format: reg:<uuid> or dp:<uuid>
    if (patientRaw.includes(':')) {
      const [prefix, id] = patientRaw.split(':');
      patientId = id || patientRaw;

      if (prefix === 'reg' || prefix === 'registered') patientSource = 'registered';
      if (prefix === 'dp' || prefix === 'direct' || prefix === 'doctor_added') patientSource = 'doctor_added';
    }

    // Legacy format: patient=<uuid>&patientType=registered|direct
    if (!patientSource) {
      patientSource = patientTypeRaw === 'registered' ? 'registered' : 'doctor_added';
    }

    const loadPatient = async () => {
      try {
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
    setSelectedAppointment(apt);
    setIsQuickPreviewOpen(true);
  }, []);

  const handleStartSession = useCallback(
    (apt: CalendarAppointment) => {
      const type = (apt.appointment_type || 'in_person') as string;

      // Start based on appointment type
      if (type === 'messaging' || type === 'chat') {
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
