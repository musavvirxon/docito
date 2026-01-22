import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import CalendarHeader from './CalendarHeader';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import AppointmentModal from './AppointmentModal';
import AppointmentQuickPreview from './AppointmentQuickPreview';
import { useCalendarData } from './useCalendarData';
import ManualBookAppointmentModal from '../ManualBookAppointmentModal';
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
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const doctorId = doctorIdProp || (profile?.role === 'doctor' ? profile?.id : undefined);

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

  // Safety check
  useEffect(() => {
    if (profile?.role === 'doctor' && !doctorId) {
      toast.error(t('doctor.calendar.profileLoading', 'Doctor profile still loading...'));
    }
  }, [profile?.role, doctorId, t]);

  const {
    appointments,
    blockedTimes,
    scheduleSettings,
    loading,
    error,
    refetch,
    getAppointmentsForDate,
    getBlockedTimesForDate,
    getScheduleHealth
  } = useCalendarData({
    doctorId,
    practiceId,
    date: selectedDate,
    view,
    filters
  });

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleViewChange = useCallback((newView: CalendarView) => {
    setView(newView);
  }, []);

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const handleAddAppointment = useCallback(() => {
    setIsBookModalOpen(true);
  }, []);

  const handleBlockTime = useCallback(() => {
    setIsBlockModalOpen(true);
  }, []);

  const handleSetAvailability = useCallback(() => {
    setIsAvailabilityModalOpen(true);
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setView('day');
  }, []);

  const handleAppointmentClick = useCallback((apt: CalendarAppointment) => {
    setSelectedAppointment(apt);
    setIsQuickPreviewOpen(true);
  }, []);

  const handleStartSession = useCallback((apt: CalendarAppointment) => {
    navigate(`/appointment-session/${apt.id}`);
  }, [navigate]);

  const handleViewPatient = useCallback((patientId: string, patientType: 'registered' | 'direct') => {
    navigate(`/patient-dashboard/${patientId}?type=${patientType}`);
  }, [navigate]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when modals are open or user is typing
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isTyping = activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as any)?.isContentEditable;

      if (isTyping) return;
      if (isAppointmentModalOpen || isQuickPreviewOpen || isBookModalOpen || isBlockModalOpen || isAvailabilityModalOpen) return;

      if (e.key === 't' || e.key === 'T') {
        handleToday();
      }
      if (e.key === 'a' || e.key === 'A') {
        handleAddAppointment();
      }
      if (e.key === 'Escape') {
        if (view !== 'day') setView('day');
      }
      if (e.key === '1') setView('day');
      if (e.key === '2') setView('week');
      if (e.key === '3') setView('month');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    view,
    handleToday,
    handleAddAppointment,
    isAppointmentModalOpen,
    isQuickPreviewOpen,
    isBookModalOpen,
    isBlockModalOpen,
    isAvailabilityModalOpen
  ]);

  const dayAppointments = getAppointmentsForDate(selectedDate);
  const dayBlockedTimes = getBlockedTimesForDate(selectedDate);
  const scheduleHealth = getScheduleHealth(selectedDate);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
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

      {/* Modals */}
      <AppointmentModal
        appointment={selectedAppointment}
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onMarkComplete={() => { refetch(); setIsAppointmentModalOpen(false); }}
      />

      <AppointmentQuickPreview
        appointment={selectedAppointment}
        isOpen={isQuickPreviewOpen}
        onClose={() => setIsQuickPreviewOpen(false)}
        onStartSession={handleStartSession}
        onViewPatient={handleViewPatient}
        onOpenFullModal={handleOpenFullModal}
        doctorSpecialty={profile?.specialty}
      />

      {doctorId && (
        <>
          <ManualBookAppointmentModal
            isOpen={isBookModalOpen}
            onClose={() => { setIsBookModalOpen(false); setPrefilledTime(undefined); }}
            doctorId={doctorId}
            practiceId={practiceId}
            onSuccess={refetch}
            prefilledDate={selectedDate}
            prefilledTime={prefilledTime}
          />

          <BlockTimeModal
            isOpen={isBlockModalOpen}
            onClose={() => { setIsBlockModalOpen(false); setPrefilledTime(undefined); }}
            prefilledDate={selectedDate}
            prefilledTime={prefilledTime}
            onSuccess={refetch}
          />

          <SetAvailabilityModal
            isOpen={isAvailabilityModalOpen}
            onClose={() => setIsAvailabilityModalOpen(false)}
            doctorId={doctorId}
            practiceId={practiceId}
            onSuccess={refetch}
          />
        </>
      )}
    </motion.div>
  );
};

export default PremiumDoctorCalendar;
