import { memo, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CalendarAppointment, ScheduleHealth, CalendarFilters } from './types';

interface MonthViewProps {
  selectedDate: Date;
  appointments: CalendarAppointment[];
  scheduleSettings: any;
  getScheduleHealth: (date: Date) => ScheduleHealth;
  filters: CalendarFilters;
  loading: boolean;
  onDayClick: (date: Date) => void;
}

const MonthView = memo(({
  selectedDate,
  appointments,
  scheduleSettings,
  getScheduleHealth,
  filters,
  loading,
  onDayClick,
}: MonthViewProps) => {
  const { t } = useTranslation('dashboard');

  // Get calendar days including padding for start/end of month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [selectedDate]);

  const shortProcedure = (name: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return '';
    const firstWord = trimmed.split(/\s+/)[0] || trimmed;
    return firstWord.length > 12 ? `${firstWord.slice(0, 11)}…` : firstWord;
  };

  // Get appointments for a specific day
  const getAppointmentsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let result = appointments.filter(a => a.appointment_date === dateStr);

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(a =>
        a.patient_name?.toLowerCase().includes(query) ||
        a.notes?.toLowerCase().includes(query) ||
        a.procedure_name?.toLowerCase().includes(query)
      );
    }

    return result;
  };

  // Check if day is working day
  const isDayWorking = (date: Date) => {
    const dayName = format(date, 'EEEE').toLowerCase();
    return scheduleSettings?.working_days?.[dayName]?.enabled;
  };

  // Get appointment type indicators
  const getTypeIndicators = (dayAppts: CalendarAppointment[]) => {
    const types = new Set(dayAppts.map(a => a.appointment_type || 'in-person'));
    return Array.from(types);
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, index) => {
          const dayAppts = getAppointmentsForDay(day);
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isWorking = isDayWorking(day);
          const health = getScheduleHealth(day);
          const typeIndicators = getTypeIndicators(dayAppts);

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.01 }}
              onClick={() => onDayClick(day)}
              className={cn(
                'min-h-[100px] p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:border-primary/30',
                isCurrentMonth ? 'bg-card border-border' : 'bg-muted/30 border-transparent',
                isToday(day) && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                !isWorking && isCurrentMonth && 'bg-muted/50'
              )}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    !isCurrentMonth && 'text-muted-foreground',
                    isToday(day) && 'text-primary'
                  )}
                >
                  {format(day, 'd')}
                </span>

                {isCurrentMonth && isWorking && dayAppts.length > 0 && (
                  <span
                    className={cn(
                      'text-xs font-medium px-1.5 py-0.5 rounded-full',
                      health.status === 'fully-booked' && 'bg-emerald-500/10 text-emerald-600',
                      health.status === 'balanced' && 'bg-blue-500/10 text-blue-600',
                      health.status === 'many-openings' && 'bg-amber-500/10 text-amber-600'
                    )}
                  >
                    {dayAppts.length}
                  </span>
                )}
              </div>

              {/* Appointment indicators */}
              {isCurrentMonth && isWorking && (
                <div className="space-y-1">
                  {dayAppts.slice(0, 3).map((apt) => {
                    const firstName = (apt.patient_name || '').split(' ')[0] || 'Patient';
                    const proc = apt.procedure_name ? ` • ${shortProcedure(apt.procedure_name)}` : '';
                    const title = apt.procedure_name
                      ? `${apt.start_time} ${apt.patient_name || ''} — ${apt.procedure_name}`
                      : `${apt.start_time} ${apt.patient_name || ''}`;

                    return (
                      <div
                        key={apt.id}
                        title={title}
                        className={cn(
                          'text-[10px] truncate px-1.5 py-0.5 rounded',
                          apt.status === 'confirmed' && 'bg-emerald-500/10 text-emerald-700',
                          apt.status === 'pending' && 'bg-amber-500/10 text-amber-700',
                          apt.status === 'completed' && 'bg-muted text-muted-foreground',
                          apt.status === 'no_show' && 'bg-red-500/10 text-red-700'
                        )}
                      >
                        {apt.start_time} {firstName}
                        {proc}
                      </div>
                    );
                  })}

                  {dayAppts.length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      +{dayAppts.length - 3} more
                    </div>
                  )}
                </div>
              )}

              {/* Type dots */}
              {isCurrentMonth && typeIndicators.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {typeIndicators.map((type) => (
                    <div
                      key={type}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        type === 'in-person' && 'bg-primary',
                        type === 'video' && 'bg-emerald-500',
                        type === 'home' && 'bg-amber-500',
                        type === 'chat' && 'bg-purple-500'
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Off day indicator */}
              {isCurrentMonth && !isWorking && (
                <div className="text-[10px] text-muted-foreground mt-2">
                  {t('doctor.calendar.off', 'Off')}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span>{t('doctor.calendar.inPerson', 'In-Person')}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{t('doctor.calendar.video', 'Video')}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>{t('doctor.calendar.home', 'Home Visit')}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span>{t('doctor.calendar.chat', 'Chat')}</span>
        </div>
      </div>
    </div>
  );
});

MonthView.displayName = 'MonthView';

export default MonthView;
