import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import type { CalendarAppointment, BlockedTime, CalendarView, ScheduleHealth, AppointmentType } from "./types";

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

  const getDateRange = useCallback(() => {
    switch (view) {
      case "day":
        return { start: selectedDate, end: selectedDate };
      case "week":
        return {
          start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
        };
      case "month":
        return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
      default:
        return { start: selectedDate, end: selectedDate };
    }
  }, [selectedDate, view]);

  const normalizeAppointmentType = (t: any): AppointmentType => {
    if (!t) return "in_person";
    if (t === "in-person") return "in_person";
    if (t === "home") return "home_visit";
    if (t === "chat") return "messaging";
    return t as AppointmentType;
  };

  const fetchData = useCallback(async () => {
    if (!doctorId) return;

    setLoading(true);
    const { start, end } = getDateRange();
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");

    try {
      let appts: any[] | null = null;
      let apptErr: any = null;

      // First try with all columns including the new start_requested ones
      const q1 = await (supabase as any)
        .from("appointments")
        .select(
          `
          id,
          doctor_id,
          practice_id,
          appointment_date,
          start_time,
          end_time,
          status,
          appointment_type,
          notes,
          patient_id,
          doctor_patient_id,
          procedure_id,
          patient_confirmation_status,
          start_requested_by_doctor,
          start_requested_by_patient,
          started_at,
          profiles:patient_id(full_name, avatar_url, phone, email),
          doctor_patients:doctor_patient_id(full_name, phone, email),
          procedures:procedure_id(id, name, category, default_cost, duration_minutes)
        `
        )
        .eq("doctor_id", doctorId)
        .gte("appointment_date", startStr)
        .lte("appointment_date", endStr)
        .neq("status", "canceled")
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (!q1.error) {
        appts = q1.data || [];
      } else {
        // Fallback without start_requested columns if they don't exist
        const q2 = await (supabase as any)
          .from("appointments")
          .select(
            `
            id,
            doctor_id,
            practice_id,
            appointment_date,
            start_time,
            end_time,
            status,
            appointment_type,
            notes,
            patient_id,
            doctor_patient_id,
            procedure_id,
            patient_confirmation_status,
            profiles:patient_id(full_name, avatar_url, phone, email),
            doctor_patients:doctor_patient_id(full_name, phone, email),
            procedures:procedure_id(id, name, category, default_cost, duration_minutes)
          `
          )
          .eq("doctor_id", doctorId)
          .gte("appointment_date", startStr)
          .lte("appointment_date", endStr)
          .neq("status", "canceled")
          .order("appointment_date", { ascending: true })
          .order("start_time", { ascending: true });

        appts = q2.data || [];
        apptErr = q2.error || q1.error;
      }

      if (apptErr) console.error("Failed to fetch appointments:", apptErr);

      const { data: blocked, error: blockErr } = await supabase
        .from("blocked_times")
        .select("*")
        .eq("doctor_id", doctorId)
        .gte("blocked_date", startStr)
        .lte("blocked_date", endStr);

      if (blockErr) console.error("Failed to fetch blocked times:", blockErr);

      const transformedAppts: CalendarAppointment[] = (appts || []).map((apt: any) => {
        const reg = apt.profiles;
        const dp = apt.doctor_patients;
        const proc = apt.procedures;

        return {
          id: apt.id,
          doctor_id: apt.doctor_id,
          practice_id: apt.practice_id,
          appointment_date: apt.appointment_date,
          start_time: apt.start_time,
          end_time: apt.end_time,
          status: apt.status as any,
          notes: apt.notes,
          patient_id: apt.patient_id,
          doctor_patient_id: apt.doctor_patient_id,
          procedure_id: apt.procedure_id,
          procedure_name: proc?.name || null,
          procedure_category: proc?.category || null,
          procedure_cost: proc?.default_cost || null,
          patient_name: reg?.full_name || dp?.full_name || "Patient",
          patient_avatar: reg?.avatar_url,
          patient_phone: reg?.phone || dp?.phone,
          patient_email: reg?.email || dp?.email,
          appointment_type: normalizeAppointmentType(apt.appointment_type),
          patient_confirmation_status: apt.patient_confirmation_status,
          start_requested_by_doctor: apt.start_requested_by_doctor,
          start_requested_by_patient: apt.start_requested_by_patient,
          started_at: apt.started_at,
          source: "direct" as const,
        };
      });

      setAppointments(transformedAppts);
      setBlockedTimes((blocked || []) as BlockedTime[]);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
    }
  }, [doctorId, getDateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!doctorId) return;

    const channel = supabase
      .channel(`doctor-calendar-${doctorId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `doctor_id=eq.${doctorId}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocked_times", filter: `doctor_id=eq.${doctorId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, fetchData]);

  const getScheduleHealth = useCallback(
    (date: Date): ScheduleHealth => {
      const dayName = format(date, "EEEE").toLowerCase();
      const daySchedule = (scheduleSettings as any)?.working_days?.[dayName];

      if (!daySchedule?.enabled) {
        return { status: "fully-booked", percentage: 100, openSlots: 0, totalSlots: 0 };
      }

      const dateStr = format(date, "yyyy-MM-dd");
      const dayAppointments = appointments.filter((a) => a.appointment_date === dateStr);

      const startMinutes = timeToMinutes(daySchedule.start_time);
      const endMinutes = timeToMinutes(daySchedule.end_time);
      const totalSlots = Math.floor((endMinutes - startMinutes) / 30);
      const bookedSlots = dayAppointments.length;
      const openSlots = Math.max(0, totalSlots - bookedSlots);
      const percentage = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;

      let status: ScheduleHealth["status"] = "balanced";
      if (percentage >= 90) status = "fully-booked";
      else if (percentage < 30) status = "many-openings";

      return { status, percentage, openSlots, totalSlots };
    },
    [appointments, scheduleSettings]
  );

  const getAppointmentsForDate = useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return appointments.filter((a) => a.appointment_date === dateStr);
    },
    [appointments]
  );

  const getBlockedTimesForDate = useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return blockedTimes.filter((b) => b.blocked_date === dateStr);
    },
    [blockedTimes]
  );

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

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export default useCalendarData;
