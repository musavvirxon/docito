import { memo, useMemo, useEffect, useRef, useState } from 'react';
import { format, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Plus, Clock, Zap, AlertTriangle } from 'lucide-react';
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

const SLOT_MINUTES = 15;
const SLOT_HEIGHT_PX = 48; // must match your slot row min-h

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

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isToday(selectedDate) && nowLineRef.current && containerRef.current) {
      nowLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedDate]);

  const dayName = format(selectedDate, 'EEEE').toLowerCase();
  const daySchedule = scheduleSettings?.working_days?.[dayName];
  const isWorkingDay = Boolean(daySchedule?.enabled);

  const workStartMin = useMemo(() => {
    const st = daySchedule?.start_time || '09:00';
    return timeToMinutes(st);
  }, [daySchedule]);

  const workEndMin = useMemo(() => {
    const et = daySchedule?.end_time || '17:00';
    return timeToMinutes(et);
  }, [daySchedule]);

  // ✅ Always build the grid so appointments remain visible even on "day off"
  const timeSlots = useMemo(() => {
    const slots: { time: string; endTime: string; isWorking: boolean }[] = [];
    const startHour = 6;
    const endHour = 22;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += SLOT_MINUTES) {
        const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        const endTime = `${String(hour + (min + SLOT_MINUTES >= 60 ? 1 : 0)).padStart(2, '0')}:${String((min + SLOT_MINUTES) % 60).padStart(2, '0')}`;
        const m = hour * 60 + min;
        const isWorking = isWorkingDay && m >= workStartMin && m < workEndMin;
        slots.push({ time, endTime, isWorking });
      }
    }

    return slots;
  }, [isWorkingDay, workStartMin, workEndMin]);

  const nowPosition = useMemo(() => {
    if (!isToday(selectedDate)) return null;
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const startMinutes = 6 * 60;
    const endMinutes = 22 * 60;
    if (totalMinutes < startMinutes || totalMinutes > endMinutes) return null;
    return ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
  }, [currentTime, selectedDate]);

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

  const renderRightPanel = () => (
    <div className="space-y-4">
      {!isWorkingDay && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  {t('doctor.calendar.noWorkingHours', 'No Working Hours')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('doctor.calendar.dayOff', 'This day is not configured as a working day in your schedule settings.')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('doctor.calendar.appointmentsStillVisible', 'Appointments are still shown here if they exist.')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {scheduleHealth.totalSlots > 0 ? (
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
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-1">
              {t('doctor.calendar.scheduleHealth', 'Schedule Health')}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('doctor.calendar.notConfigured', 'Working hours are not configured for this day.')}
            </p>
          </CardContent>
        </Card>
      )}

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
      className={cn("relative overflow-y-auto scroll-smooth", isRTL ? "pl-2" : "pr-2")}
    >
      <div className="relative">
        <AnimatePresence>
          {nowPosition !== null && (
            <motion.div
              ref={nowLineRef}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              className={cn(
                "absolute left-0 right-0 z-30 flex items-center pointer-events-none",
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

        {timeSlots.map((slot, index) => {
          const timeMinutes = timeToMinutes(slot.time);
          const isFirstOfHour = slot.time.endsWith(':00');

          const blocked = blockedTimes.find(b => {
            const start = timeToMinutes(b.start_time);
            const end = timeToMinutes(b.end_time);
            return timeMinutes >= start && timeMinutes < end;
          });

          const blockedStart = blocked && timeMinutes === timeToMinutes(blocked.start_time);
          const blockedInside = blocked && timeMinutes > timeToMinutes(blocked.start_time) && timeMinutes < timeToMinutes(blocked.end_time);

          const apt = filteredAppointments.find(a => {
            const start = timeToMinutes(a.start_time);
            const end = timeToMinutes(a.end_time);
            return timeMinutes >= start && timeMinutes < end;
          });

          const aptStart = apt && timeMinutes === timeToMinutes(apt.start_time);
          const aptInside = apt && timeMinutes > timeToMinutes(apt.start_time) && timeMinutes < timeToMinutes(apt.end_time);

          const isOccupied = Boolean(blocked || apt);

          const calcSpanPx = (startTime: string, endTime: string) => {
            const start = timeToMinutes(startTime);
            const end = timeToMinutes(endTime);
            const slots = Math.max(1, Math.ceil((end - start) / SLOT_MINUTES));
            return slots * SLOT_HEIGHT_PX - 8;
          };

          return (
            <motion.div
              key={slot.time}
              initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.003 }}
              className={cn(
                'relative flex items-stretch min-h-[48px] border-b border-border/30',
                !slot.isWorking && 'bg-muted/30',
                isRTL && 'flex-row-reverse'
              )}
            >
              <div
                className={cn(
                  'w-16 shrink-0 py-2',
                  isRTL ? 'pl-3 text-left' : 'pr-3 text-right',
                  isFirstOfHour ? 'text-xs font-medium text-foreground' : 'text-[10px] text-muted-foreground'
                )}
              >
                {isFirstOfHour ? slot.time : ''}
              </div>

              <div className="flex-1 py-1 px-2 min-w-0 relative">
                {blockedStart && blocked && (
                  <div
                    className="absolute left-2 right-2 top-1 z-20 rounded-lg bg-muted/50 border border-dashed border-border flex items-center justify-center px-2"
                    style={{ height: `${calcSpanPx(blocked.start_time, blocked.end_time)}px` }}
                  >
                    <span className="text-xs text-muted-foreground text-center">
                      {blocked.reason || blocked.block_type}
                    </span>
                  </div>
                )}

                {aptStart && apt && !blocked && (
                  <div
                    className="absolute left-2 right-2 top-1 z-20"
                    style={{ height: `${calcSpanPx(apt.start_time, apt.end_time)}px` }}
                  >
                    <AppointmentBlock
                      appointment={apt as CalendarAppointment}
                      onClick={() => onAppointmentClick(apt as CalendarAppointment)}
                      className="h-full"
                    />
                  </div>
                )}

                {(blockedInside || aptInside) && (
                  <div className="h-full" />
                )}

                {!isOccupied && slot.isWorking && (
                  (() => {
                    // Block past times for today
                    const now = new Date();
                    const slotDateTime = new Date(selectedDate);
                    const [slotHours, slotMinutes] = slot.time.split(':').map(Number);
                    slotDateTime.setHours(slotHours, slotMinutes, 0, 0);
                    
                    const isPastTime = isToday(selectedDate) && slotDateTime <= now;
                    
                    if (isPastTime) {
                      return (
                        <div className="h-full rounded-lg bg-muted/20 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground/50">Past</span>
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        className="group h-full rounded-lg hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100"
                        onClick={() => onSlotClick(slot.time)}
                      >
                        <Plus className="h-4 w-4 text-primary" />
                      </div>
                    );
                  })()
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

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export default DayView;
