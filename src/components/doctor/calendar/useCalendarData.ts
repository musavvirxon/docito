import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useScheduleSettings } from '@/hooks/useScheduleSettings';
import type { CalendarAppointment, BlockedTime, CalendarView, ScheduleHealth } from './types';

interface UseCalendarDataProps {
  doctorId: string | null;
  selectedDate: Date;
  view: CalendarView;
}

export const useCalendarData = ({ doctorId, selectedDate, view }: UseCalendarDataProps) => {
  const { scheduleSettings, loading: scheduleLoading } = useScheduleSettings();
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate date range based on view
  const getDateRange = useCallback(() => {
    switch (view) {
      case 'day':
        return { start: selectedDate, end: selectedDate };
      case 'week':
        return { start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
      default:
        return { start: selectedDate, end: selectedDate };
    }
  }, [selectedDate, view]);

  const fetchData = useCallback(async () => {
    if (!doctorId) return;
    
    setLoading(true);
    const { start, end } = getDateRange();
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');

    try {
      // Fetch appointments
      const { data: appts, error: apptErr } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles!appointments_patient_id_fkey(full_name, avatar_url, phone, email)
        `)
        .eq('doctor_id', doctorId)
        .gte('appointment_date', startStr)
        .lte('appointment_date', endStr)
        .neq('status', 'canceled');

      if (apptErr) console.error('Failed to fetch appointments:', apptErr);

      // Fetch blocked times
      const { data: blocked, error: blockErr } = await supabase
        .from('blocked_times')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('blocked_date', startStr)
        .lte('blocked_date', endStr);

      if (blockErr) console.error('Failed to fetch blocked times:', blockErr);

      // Transform appointments
      const transformedAppts: CalendarAppointment[] = (appts || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        end_time: apt.end_time,
        status: apt.status as any,
        notes: apt.notes,
        patient_id: apt.patient_id,
        patient_name: apt.profiles?.full_name || 'Patient',
        patient_avatar: apt.profiles?.avatar_url,
        patient_phone: apt.profiles?.phone,
        patient_email: apt.profiles?.email,
        appointment_type: 'in-person' as const,
        source: 'direct' as const,
      }));

      setAppointments(transformedAppts);
      setBlockedTimes((blocked || []) as BlockedTime[]);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [doctorId, getDateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate schedule health for a given date
  const getScheduleHealth = useCallback((date: Date): ScheduleHealth => {
    const dayName = format(date, 'EEEE').toLowerCase();
    const daySchedule = scheduleSettings?.working_days?.[dayName];
    
    if (!daySchedule?.enabled) {
      return { status: 'fully-booked', percentage: 100, openSlots: 0, totalSlots: 0 };
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    const dayAppointments = appointments.filter(a => a.appointment_date === dateStr);
    
    // Estimate slots (assuming 30 min each)
    const startMinutes = timeToMinutes(daySchedule.start_time);
    const endMinutes = timeToMinutes(daySchedule.end_time);
    const totalSlots = Math.floor((endMinutes - startMinutes) / 30);
    const bookedSlots = dayAppointments.length;
    const openSlots = Math.max(0, totalSlots - bookedSlots);
    const percentage = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;

    let status: ScheduleHealth['status'] = 'balanced';
    if (percentage >= 90) status = 'fully-booked';
    else if (percentage < 30) status = 'many-openings';

    return { status, percentage, openSlots, totalSlots };
  }, [appointments, scheduleSettings]);

  // Get appointments for a specific date
  const getAppointmentsForDate = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(a => a.appointment_date === dateStr);
  }, [appointments]);

  // Get blocked times for a specific date
  const getBlockedTimesForDate = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return blockedTimes.filter(b => b.blocked_date === dateStr);
  }, [blockedTimes]);

  return {
    appointments,
    blockedTimes,
    loading: loading || scheduleLoading,
    scheduleSettings,
    refetch: fetchData,
    getScheduleHealth,
    getAppointmentsForDate,
    getBlockedTimesForDate,
  };
};

// Helper
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
