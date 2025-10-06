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

  // Generate time slots based on schedule with proper logic
  const timeSlots = useMemo(() => {
    if (scheduleLoading || loading) return [];

    const dayName = format(selectedDate, 'EEEE').toLowerCase();
    const daySchedule = scheduleSettings.working_days[dayName] as WorkingHours;

    if (!daySchedule?.enabled) {
      return [];
    }

    const slots: TimeSlot[] = [];
    const startMinutes = timeToMinutes(daySchedule.start_time);
    const endMinutes = timeToMinutes(daySchedule.end_time);
    
    let currentTime = startMinutes;

    while (currentTime < endMinutes) {
      const slotStartMinutes = currentTime;
      const procedureEndMinutes = currentTime + procedureDuration;
      const bufferEndMinutes = procedureEndMinutes + bufferTime;

      // Can't fit procedure in remaining time
      if (procedureEndMinutes > endMinutes) {
        break;
      }

      const slotStart = minutesToTime(slotStartMinutes);
      const slotEnd = minutesToTime(procedureEndMinutes);
      const bufferEnd = minutesToTime(bufferEndMinutes);

      // Check if slot overlaps with any break
      const overlappingBreak = daySchedule.breaks?.find((breakTime: any) => {
        const breakStart = timeToMinutes(breakTime.start_time);
        const breakEnd = timeToMinutes(breakTime.end_time);
        return timesOverlap(slotStartMinutes, bufferEndMinutes, breakStart, breakEnd);
      });

      if (overlappingBreak) {
        // Skip to end of break
        const breakEnd = timeToMinutes(overlappingBreak.end_time);
        
        // Add break indicator slot
        const breakStart = timeToMinutes(overlappingBreak.start_time);
        if (currentTime <= breakStart) {
          slots.push({
            time: minutesToTime(breakStart),
            endTime: minutesToTime(breakEnd),
            status: 'break',
            reason: overlappingBreak.name || 'Break Time'
          });
        }
        
        currentTime = breakEnd;
        continue;
      }

      // Check if slot overlaps with blocked time
      const overlappingBlock = blockedTimes.find((bt) => {
        const blockStart = timeToMinutes(bt.start_time);
        const blockEnd = timeToMinutes(bt.end_time);
        return timesOverlap(slotStartMinutes, bufferEndMinutes, blockStart, blockEnd);
      });

      if (overlappingBlock) {
        // Use ACTUAL blocked time from database - never recalculate
        const blockStart = timeToMinutes(overlappingBlock.start_time);
        const blockEnd = timeToMinutes(overlappingBlock.end_time);
        
        slots.push({
          time: minutesToTime(blockStart),
          endTime: minutesToTime(blockEnd),
          status: 'blocked',
          reason: overlappingBlock.reason || 'Blocked'
        });
        
        currentTime = blockEnd;
        continue;
      }

      // Check if slot overlaps with an appointment
      const overlappingAppointment = appointments.find((apt) => {
        const aptStart = timeToMinutes(apt.start_time);
        const aptEnd = timeToMinutes(apt.end_time);
        return timesOverlap(slotStartMinutes, procedureEndMinutes, aptStart, aptEnd);
      });

      if (overlappingAppointment) {
        // Use ACTUAL appointment time from database - never recalculate
        const aptStart = timeToMinutes(overlappingAppointment.start_time);
        const aptEnd = timeToMinutes(overlappingAppointment.end_time);
        
        slots.push({
          time: minutesToTime(aptStart),
          endTime: minutesToTime(aptEnd),
          status: 'booked',
          patient: overlappingAppointment.profiles?.full_name || 'Patient',
          service: overlappingAppointment.procedures?.name || 'Appointment',
          appointmentId: overlappingAppointment.id
        });
        
        currentTime = aptEnd;
        continue;
      }

      // Available slot - show only the actual appointment time (no buffer in display)
      slots.push({
        time: slotStart,
        endTime: slotEnd,
        status: 'available'
      });

      // Move to next slot (after buffer for spacing)
      currentTime = bufferEndMinutes;
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
