import { memo, useMemo } from 'react';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import AppointmentBlock from './AppointmentBlock';
import type { CalendarAppointment, BlockedTime, ScheduleHealth, CalendarFilters } from './types';

interface WeekViewProps {
  selectedDate: Date;
  appointments: CalendarAppointment[];
  blockedTimes: BlockedTime[];
  scheduleSettings: any;
  getScheduleHealth: (date: Date) => ScheduleHealth;
  filters: CalendarFilters;
  loading: boolean;
  onAppointmentClick: (appointment: CalendarAppointment) => void;
  onDayClick: (date: Date) => void;
}

const WeekView = memo(({
  selectedDate,
  appointments,
  blockedTimes,
  scheduleSettings,
  getScheduleHealth,
  filters,
  loading,
  onAppointmentClick,
  onDayClick,
}: WeekViewProps) => {
  const { t } = useTranslation('dashboard');

  // Get week days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));

  // Generate time slots (hourly for week view)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 6; hour < 22; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // Get appointments for a specific day
  const getAppointmentsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let result = appointments.filter(a => a.appointment_date === dateStr);

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(a =>
        a.patient_name?.toLowerCase().includes(query) ||
        a.notes?.toLowerCase().includes(query)
      );
    }

    return result;
  };

  // Get appointments for a specific hour
  const getAppointmentsForHour = (date: Date, hour: string) => {
    const dayAppts = getAppointmentsForDay(date);
    const hourNum = parseInt(hour.split(':')[0]);
    return dayAppts.filter(a => {
      const aptHour = parseInt(a.start_time.split(':')[0]);
      return aptHour === hourNum;
    });
  };

  // Check if day is working day
  const isDayWorking = (date: Date) => {
    const dayName = format(date, 'EEEE').toLowerCase();
    return scheduleSettings?.working_days?.[dayName]?.enabled;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-8 gap-2">
          <div className="w-16" />
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="grid grid-cols-8 gap-2">
            <Skeleton className="h-12 w-16" />
            {[...Array(7)].map((_, j) => (
              <Skeleton key={j} className="h-12" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="min-w-[800px]">
        {/* Header Row */}
        <div className="grid grid-cols-[64px_repeat(7,1fr)] gap-px bg-border sticky top-0 z-10">
          <div className="bg-background p-2" />
          {weekDays.map((day, index) => {
            const health = getScheduleHealth(day);
            const dayAppts = getAppointmentsForDay(day);
            const isWorking = isDayWorking(day);

            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onDayClick(day)}
                className={cn(
                  'bg-background p-3 cursor-pointer transition-colors hover:bg-muted/50',
                  isToday(day) && 'bg-primary/5'
                )}
              >
                <div className="text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    {format(day, 'EEE')}
                  </div>
                  <div className={cn(
                    'text-2xl font-semibold mt-1',
                    isToday(day) && 'text-primary'
                  )}>
                    {format(day, 'd')}
                  </div>
                  {isWorking && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs text-muted-foreground">
                        {dayAppts.length} appt{dayAppts.length !== 1 ? 's' : ''}
                      </div>
                      <div className="flex justify-center gap-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] h-4 px-1.5',
                            health.status === 'fully-booked' && 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
                            health.status === 'balanced' && 'bg-blue-500/10 text-blue-600 border-blue-200',
                            health.status === 'many-openings' && 'bg-amber-500/10 text-amber-600 border-amber-200'
                          )}
                        >
                          {health.openSlots} open
                        </Badge>
                      </div>
                    </div>
                  )}
                  {!isWorking && (
                    <div className="mt-2 text-xs text-muted-foreground">Off</div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Time Grid */}
        <div className="grid grid-cols-[64px_repeat(7,1fr)] gap-px bg-border">
          {timeSlots.map((time, timeIndex) => (
            <>
              {/* Time Label */}
              <div
                key={`time-${time}`}
                className="bg-background p-2 text-xs text-muted-foreground text-right pr-3 border-t border-border/30"
              >
                {time}
              </div>

              {/* Day Cells */}
              {weekDays.map((day, dayIndex) => {
                const hourAppts = getAppointmentsForHour(day, time);
                const isWorking = isDayWorking(day);

                return (
                  <motion.div
                    key={`${day.toISOString()}-${time}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: (timeIndex * 7 + dayIndex) * 0.002 }}
                    className={cn(
                      'bg-background min-h-[60px] p-1 border-t border-border/30',
                      !isWorking && 'bg-muted/30',
                      isToday(day) && 'bg-primary/5'
                    )}
                  >
                    <div className="space-y-1">
                      {hourAppts.slice(0, 2).map((apt) => (
                        <AppointmentBlock
                          key={apt.id}
                          appointment={apt}
                          compact
                          onClick={() => onAppointmentClick(apt)}
                        />
                      ))}
                      {hourAppts.length > 2 && (
                        <div className="text-[10px] text-muted-foreground text-center">
                          +{hourAppts.length - 2} more
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </>
          ))}
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
});

WeekView.displayName = 'WeekView';

export default WeekView;
