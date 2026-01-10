import { memo, useMemo, useEffect, useRef, useState } from 'react';
import { format, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Plus, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import AppointmentBlock from './AppointmentBlock';
import type { CalendarAppointment, BlockedTime, ScheduleHealth, CalendarFilters } from './types';

interface DayViewProps {
  selectedDate: Date;
  appointments: CalendarAppointment[];
  blockedTimes: BlockedTime[];
  scheduleSettings: any;
  scheduleHealth: ScheduleHealth;
  filters: CalendarFilters;
  loading: boolean;
  onAppointmentClick: (appointment: CalendarAppointment) => void;
  onSlotClick: (time: string) => void;
  onBlockSlot: (time: string) => void;
}

const DayView = memo(({
  selectedDate,
  appointments,
  blockedTimes,
  scheduleSettings,
  scheduleHealth,
  filters,
  loading,
  onAppointmentClick,
  onSlotClick,
  onBlockSlot,
}: DayViewProps) => {
  const { t, i18n } = useTranslation('dashboard');
  const containerRef = useRef<HTMLDivElement>(null);
  const nowLineRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const isRTL = i18n.language === 'ar';

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current time on mount if today
  useEffect(() => {
    if (isToday(selectedDate) && nowLineRef.current && containerRef.current) {
      nowLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedDate]);

  const dayName = format(selectedDate, 'EEEE').toLowerCase();
  const daySchedule = scheduleSettings?.working_days?.[dayName];
  const isWorkingDay = daySchedule?.enabled;

  // Generate time slots
  const timeSlots = useMemo(() => {
    if (!isWorkingDay || !daySchedule) return [];

    const slots: { time: string; endTime: string; isWorking: boolean }[] = [];
    const startHour = 6; // Start display at 6 AM
    const endHour = 22; // End display at 10 PM
    const workStart = parseInt(daySchedule.start_time?.split(':')[0] || '9');
    const workEnd = parseInt(daySchedule.end_time?.split(':')[0] || '17');

    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += 15) {
        const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        const endTime = `${String(hour + (min + 15 >= 60 ? 1 : 0)).padStart(2, '0')}:${String((min + 15) % 60).padStart(2, '0')}`;
        const isWorking = hour >= workStart && hour < workEnd;
        slots.push({ time, endTime, isWorking });
      }
    }
    return slots;
  }, [daySchedule, isWorkingDay]);

  // Get appointment or blocked time for a slot
  const getSlotContent = (time: string) => {
    const timeMinutes = timeToMinutes(time);
    
    // Check blocked times
    const blocked = blockedTimes.find(b => {
      const start = timeToMinutes(b.start_time);
      const end = timeToMinutes(b.end_time);
      return timeMinutes >= start && timeMinutes < end;
    });

    if (blocked) return { type: 'blocked' as const, data: blocked };

    // Check appointments
    const apt = appointments.find(a => {
      const start = timeToMinutes(a.start_time);
      const end = timeToMinutes(a.end_time);
      return timeMinutes >= start && timeMinutes < end;
    });

    if (apt) return { type: 'appointment' as const, data: apt };

    return null;
  };

  // Calculate now line position
  const nowPosition = useMemo(() => {
    if (!isToday(selectedDate)) return null;
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const startMinutes = 6 * 60; // 6 AM
    const endMinutes = 22 * 60; // 10 PM
    if (totalMinutes < startMinutes || totalMinutes > endMinutes) return null;
    return ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
  }, [currentTime, selectedDate]);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    let result = appointments;
    
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(a => 
        a.patient_name?.toLowerCase().includes(query) ||
        a.notes?.toLowerCase().includes(query)
      );
    }
    
    if (filters.appointmentTypes.length > 0) {
      result = result.filter(a => filters.appointmentTypes.includes(a.appointment_type || 'in-person'));
    }
    
    if (filters.statuses.length > 0) {
      result = result.filter(a => filters.statuses.includes(a.status));
    }

    return result;
  }, [appointments, filters]);

  // Get next appointment
  const nextAppointment = useMemo(() => {
    if (!isToday(selectedDate)) return null;
    const now = format(currentTime, 'HH:mm');
    return filteredAppointments
      .filter(a => a.start_time >= now)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
  }, [filteredAppointments, currentTime, selectedDate]);

  if (loading) {
    return (
      <div className="grid grid-cols-[1fr_280px] gap-6 h-[calc(100vh-300px)]">
        <div className="space-y-2">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!isWorkingDay) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[400px] text-center"
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Clock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {t('doctor.calendar.noWorkingHours', 'No Working Hours')}
        </h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          {t('doctor.calendar.dayOff', 'This day is not configured as a working day in your schedule settings.')}
        </p>
      </motion.div>
    );
  }

  const renderRightPanel = () => (
    <div className="space-y-4">
      {/* Schedule Health */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              {t('doctor.calendar.scheduleHealth', 'Schedule Health')}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                scheduleHealth.status === 'fully-booked' && 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
                scheduleHealth.status === 'balanced' && 'bg-blue-500/10 text-blue-600 border-blue-200',
                scheduleHealth.status === 'many-openings' && 'bg-amber-500/10 text-amber-600 border-amber-200'
              )}
            >
              {scheduleHealth.status === 'fully-booked' && '✓ Fully Booked'}
              {scheduleHealth.status === 'balanced' && '◉ Balanced'}
              {scheduleHealth.status === 'many-openings' && '○ Many Openings'}
            </Badge>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${scheduleHealth.percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                scheduleHealth.status === 'fully-booked' && 'bg-emerald-500',
                scheduleHealth.status === 'balanced' && 'bg-primary',
                scheduleHealth.status === 'many-openings' && 'bg-amber-500'
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {scheduleHealth.openSlots} of {scheduleHealth.totalSlots} slots available
          </p>
        </CardContent>
      </Card>

      {/* Next Appointment */}
      {nextAppointment && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {t('doctor.calendar.nextAppointment', 'Next Appointment')}
              </span>
            </div>
            <AppointmentBlock
              appointment={nextAppointment}
              onClick={() => onAppointmentClick(nextAppointment)}
            />
          </CardContent>
        </Card>
      )}

      {/* Today's Appointments */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-medium mb-3">
            {t('doctor.calendar.upcomingToday', 'Upcoming Today')}
          </h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {filteredAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('doctor.calendar.noAppointments', 'No appointments')}
              </p>
            ) : (
              filteredAppointments.map((apt) => (
                <AppointmentBlock
                  key={apt.id}
                  appointment={apt}
                  compact
                  onClick={() => onAppointmentClick(apt)}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTimeGrid = () => (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-y-auto scroll-smooth",
        isRTL ? "pl-2" : "pr-2"
      )}
    >
      <div className="relative">
        {/* Now Line */}
        <AnimatePresence>
          {nowPosition !== null && (
            <motion.div
              ref={nowLineRef}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              className={cn(
                "absolute left-0 right-0 z-20 flex items-center pointer-events-none",
                isRTL && "flex-row-reverse"
              )}
              style={{ top: `${nowPosition}%` }}
            >
              <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/30" />
              <div className="flex-1 h-0.5 bg-primary shadow-sm shadow-primary/30" />
              <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full shadow-lg">
                {format(currentTime, 'HH:mm')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Time Slots */}
        {timeSlots.map((slot, index) => {
          const slotContent = getSlotContent(slot.time);
          const isFirstOfHour = slot.time.endsWith(':00');

          return (
            <motion.div
              key={slot.time}
              initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.01 }}
              className={cn(
                'relative flex items-stretch min-h-[48px] border-b border-border/30',
                !slot.isWorking && 'bg-muted/30',
                isRTL && 'flex-row-reverse'
              )}
            >
              {/* Time Label */}
              <div className={cn(
                'w-16 shrink-0 py-2',
                isRTL ? 'pl-3 text-left' : 'pr-3 text-right',
                isFirstOfHour ? 'text-xs font-medium text-foreground' : 'text-[10px] text-muted-foreground'
              )}>
                {isFirstOfHour ? slot.time : ''}
              </div>

              {/* Slot Content */}
              <div className="flex-1 py-1 px-2 min-w-0">
                {slotContent?.type === 'blocked' && (
                  <div className="h-full rounded-lg bg-muted/50 border border-dashed border-border flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">
                      {slotContent.data.reason || slotContent.data.block_type}
                    </span>
                  </div>
                )}

                {slotContent?.type === 'appointment' && (
                  <AppointmentBlock
                    appointment={slotContent.data as CalendarAppointment}
                    onClick={() => onAppointmentClick(slotContent.data as CalendarAppointment)}
                  />
                )}

                {!slotContent && slot.isWorking && (
                  <div 
                    className="group h-full rounded-lg hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100"
                    onClick={() => onSlotClick(slot.time)}
                  >
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={cn(
      "grid gap-6 h-[calc(100vh-300px)]",
      isRTL ? "grid-cols-[280px_1fr]" : "grid-cols-[1fr_280px]"
    )}>
      {isRTL ? (
        <>
          {renderRightPanel()}
          {renderTimeGrid()}
        </>
      ) : (
        <>
          {renderTimeGrid()}
          {renderRightPanel()}
        </>
      )}
    </div>
  );
});

DayView.displayName = 'DayView';

// Helper
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export default DayView;
