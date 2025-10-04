import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useScheduleSettings, WorkingHours } from './useScheduleSettings';

export interface TimeSlot {
  time: string;
  endTime: string;
  status: 'available' | 'booked' | 'blocked' | 'break' | 'outside-hours';
  patient?: string;
  service?: string;
  reason?: string;
  appointmentId?: string;
}

interface UseTimeSlotsProps {
  doctorId: string | null;
  selectedDate: Date;
  procedureDuration: number;
  bufferTime?: number;
}

export const useTimeSlots = ({ 
  doctorId, 
  selectedDate, 
  procedureDuration,
  bufferTime = 0 
}: UseTimeSlotsProps) => {
  const { scheduleSettings, loading: scheduleLoading } = useScheduleSettings();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch appointments and blocked times
  useEffect(() => {
    if (!doctorId || !selectedDate) return;

    const fetchData = async () => {
      setLoading(true);
      const dateString = format(selectedDate, 'yyyy-MM-dd');

      // Fetch appointments
      const { data: appts } = await supabase
        .from('appointments')
        .select('*, profiles!appointments_patient_id_fkey(full_name), procedures(name)')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', dateString)
        .neq('status', 'canceled');

      // Fetch blocked times
      const { data: blocked } = await supabase
        .from('blocked_times')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('blocked_date', dateString);

      setAppointments(appts || []);
      setBlockedTimes(blocked || []);
      setLoading(false);
    };

    fetchData();
  }, [doctorId, selectedDate]);

  // Generate time slots based on schedule
  const timeSlots = useMemo(() => {
    if (scheduleLoading || loading) return [];

    const dayName = format(selectedDate, 'EEEE').toLowerCase();
    const daySchedule = scheduleSettings.working_days[dayName] as WorkingHours;

    if (!daySchedule?.enabled) {
      return [];
    }

    const slots: TimeSlot[] = [];
    const slotDuration = procedureDuration + bufferTime;
    const startMinutes = timeToMinutes(daySchedule.start_time);
    const endMinutes = timeToMinutes(daySchedule.end_time);

    // Generate slots in 15-minute intervals
    for (let minutes = startMinutes; minutes + slotDuration <= endMinutes; minutes += 15) {
      const slotStart = minutesToTime(minutes);
      const slotEnd = minutesToTime(minutes + slotDuration);

      // Check if slot is in a break
      const isBreak = daySchedule.breaks?.some((breakTime: any) => {
        const breakStart = timeToMinutes(breakTime.start_time);
        const breakEnd = timeToMinutes(breakTime.end_time);
        return timesOverlap(minutes, minutes + slotDuration, breakStart, breakEnd);
      });

      if (isBreak) {
        slots.push({
          time: slotStart,
          endTime: slotEnd,
          status: 'break',
          reason: 'Break Time'
        });
        continue;
      }

      // Check if slot is blocked
      const blocked = blockedTimes.find((bt) => {
        const blockStart = timeToMinutes(bt.start_time);
        const blockEnd = timeToMinutes(bt.end_time);
        return timesOverlap(minutes, minutes + slotDuration, blockStart, blockEnd);
      });

      if (blocked) {
        slots.push({
          time: slotStart,
          endTime: slotEnd,
          status: 'blocked',
          reason: blocked.reason || 'Blocked'
        });
        continue;
      }

      // Check if slot is booked
      const appointment = appointments.find((apt) => {
        const aptStart = timeToMinutes(apt.start_time);
        const aptEnd = timeToMinutes(apt.end_time);
        return timesOverlap(minutes, minutes + slotDuration, aptStart, aptEnd);
      });

      if (appointment) {
        slots.push({
          time: slotStart,
          endTime: slotEnd,
          status: 'booked',
          patient: appointment.profiles?.full_name || 'Patient',
          service: appointment.procedures?.name || 'Appointment',
          appointmentId: appointment.id
        });
        continue;
      }

      // Available slot
      slots.push({
        time: slotStart,
        endTime: slotEnd,
        status: 'available'
      });
    }

    return slots;
  }, [selectedDate, scheduleSettings, appointments, blockedTimes, procedureDuration, bufferTime, scheduleLoading, loading]);

  const refetch = async () => {
    if (!doctorId) return;
    
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const { data: appts } = await supabase
      .from('appointments')
      .select('*, profiles!appointments_patient_id_fkey(full_name), procedures(name)')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', dateString)
      .neq('status', 'canceled');

    const { data: blocked } = await supabase
      .from('blocked_times')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('blocked_date', dateString);

    setAppointments(appts || []);
    setBlockedTimes(blocked || []);
  };

  return {
    timeSlots,
    loading: scheduleLoading || loading,
    refetch
  };
};

// Helper functions
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const timesOverlap = (start1: number, end1: number, start2: number, end2: number): boolean => {
  return start1 < end2 && end1 > start2;
};
