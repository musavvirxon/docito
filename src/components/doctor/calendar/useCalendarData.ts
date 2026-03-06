import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import type {
  CalendarAppointment,
  BlockedTime,
  CalendarView,
  ScheduleHealth,
  AppointmentType,
} from "./types";

interface UseCalendarDataProps {
  doctorId: string | null;
  selectedDate: Date;
  view: CalendarView;
}

function isMissingColumnError(err: any, col: string) {
  const msg = String(err?.message || "").toLowerCase();
  const c = col.toLowerCase();
  return msg.includes(c) && (msg.includes("does not exist") || msg.includes("schema cache") || msg.includes("column"));
}

function normalizeProcedureRow(proc: any) {
  if (!proc) return null;
  if (Array.isArray(proc)) return proc[0] ?? null;
  return proc;
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

  const fetchAppointments = useCallback(
    async (doctorId: string, startStr: string, endStr: string) => {
      // We try a few select strings (newest -> oldest schema).
      // Goal: include procedure join whenever possible.
      const baseWhere = (q: any) =>
        q
          .eq("doctor_id", doctorId)
          .gte("appointment_date", startStr)
          .lte("appointment_date", endStr)
          .neq("status", "canceled")
          .order("appointment_date", { ascending: true })
          .order("start_time", { ascending: true });

      // ✅ Full schema: includes start-request columns + procedure join
      const selectFull = `
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
        procedures:procedure_id(
          id,
          name,
          category,
          default_cost,
          price,
          duration_minutes,
          estimated_duration_minutes
        )
      `;

      // ✅ Older schema: no start-request columns but still procedure join
      const selectNoStartRequest = `
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
        procedures:procedure_id(
          id,
          name,
          category,
          default_cost,
          price,
          duration_minutes,
          estimated_duration_minutes
        )
      `;

      // ✅ Oldest fallback: no procedure_id at all (still show appointments)
      const selectNoProcedure = `
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
        patient_confirmation_status,
        profiles:patient_id(full_name, avatar_url, phone, email),
        doctor_patients:doctor_patient_id(full_name, phone, email)
      `;

      // Try full select
      let q1 = baseWhere((supabase as any).from("appointments").select(selectFull));
      const r1 = await q1;

      if (!r1.error) return { rows: r1.data || [], usedProcedure: true };

      // If error is about procedure join columns (price/estimated_duration_minutes), retry with slimmer procedure join
      const procedureJoinError =
        isMissingColumnError(r1.error, "price") ||
        isMissingColumnError(r1.error, "estimated_duration_minutes") ||
        isMissingColumnError(r1.error, "default_cost") ||
        isMissingColumnError(r1.error, "procedure_id") ||
        String(r1.error?.message || "").toLowerCase().includes("procedures");

      if (procedureJoinError) {
        // retry full but with minimal procedure columns
        const selectFullMinimalProc = `
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
          procedures:procedure_id(id, name, category)
        `;

        const r1b = await baseWhere((supabase as any).from("appointments").select(selectFullMinimalProc));

        if (!r1b.error) return { rows: r1b.data || [], usedProcedure: true };

        // Continue to next fallback
      }

      // Try without start-request cols (but keep procedure)
      const r2 = await baseWhere((supabase as any).from("appointments").select(selectNoStartRequest));

      if (!r2.error) return { rows: r2.data || [], usedProcedure: true };

      // If procedure_id column missing, fallback to no procedure select
      if (isMissingColumnError(r2.error, "procedure_id")) {
        const r3 = await baseWhere((supabase as any).from("appointments").select(selectNoProcedure));

        if (!r3.error) return { rows: r3.data || [], usedProcedure: false };
      }

      // Last attempt: no procedure
      const rLast = await baseWhere((supabase as any).from("appointments").select(selectNoProcedure));

      if (!rLast.error) return { rows: rLast.data || [], usedProcedure: false };

      // If everything failed, throw last error
      throw rLast.error || r2.error || r1.error;
    },
    []
  );

  const fetchData = useCallback(async () => {
    if (!doctorId) return;

    setLoading(true);
    const { start, end } = getDateRange();
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");

    try {
      // Appointments (with procedure join if possible)
      const { rows: appts } = await fetchAppointments(doctorId, startStr, endStr);

      // Blocked times
      const { data: blocked, error: blockErr } = await supabase
        .from("blocked_times")
        .select("*")
        .eq("doctor_id", doctorId)
        .gte("blocked_date", startStr)
        .lte("blocked_date", endStr);

      if (blockErr) console.error("Failed to fetch blocked times:", blockErr);

      // Collect patient_ids that have null profiles (RLS blocked)
      const missingProfilePatientIds = (appts || [])
        .filter((apt: any) => apt.patient_id && !apt.profiles?.full_name && !apt.doctor_patients?.full_name)
        .map((apt: any) => apt.patient_id);

      // Fallback: hydrate missing patient names from doctor_profiles_view or profiles via a separate query
      const fallbackProfileMap = new Map<string, any>();
      if (missingProfilePatientIds.length > 0) {
        const uniqueIds = Array.from(new Set(missingProfilePatientIds));
        const { data: fallbackProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, phone, email')
          .in('user_id', uniqueIds);
        (fallbackProfiles || []).forEach((p: any) => fallbackProfileMap.set(p.user_id, p));
      }

      const transformedAppts: CalendarAppointment[] = (appts || []).map((apt: any) => {
        const reg = apt.profiles;
        const dp = apt.doctor_patients;
        const fallback = apt.patient_id ? fallbackProfileMap.get(apt.patient_id) : null;

        const procRow = normalizeProcedureRow(apt.procedures);
        const procCost =
          procRow?.default_cost ?? procRow?.price ?? null;

        return {
          id: apt.id,
          doctor_id: apt.doctor_id,
          practice_id: apt.practice_id,
          appointment_date: apt.appointment_date,
          start_time: apt.start_time,
          end_time: apt.end_time,
          status: apt.status as any,
          notes: apt.notes ?? null,

          patient_id: apt.patient_id ?? null,
          doctor_patient_id: apt.doctor_patient_id ?? null,

          // ✅ Procedure fields (calendar UI uses these)
          procedure_id: apt.procedure_id ?? null,
          procedure_name: procRow?.name ?? null,
          procedure_category: procRow?.category ?? null,
          procedure_cost: procCost == null ? null : Number(procCost),

          patient_name: reg?.full_name || dp?.full_name || fallback?.full_name || "Patient",
          patient_avatar: reg?.avatar_url ?? fallback?.avatar_url ?? null,
          patient_phone: reg?.phone || dp?.phone || fallback?.phone || null,
          patient_email: reg?.email || dp?.email || fallback?.email || null,

          appointment_type: normalizeAppointmentType(apt.appointment_type),
          patient_confirmation_status: apt.patient_confirmation_status ?? null,
          start_requested_by_doctor: apt.start_requested_by_doctor ?? null,
          start_requested_by_patient: apt.start_requested_by_patient ?? null,
          started_at: apt.started_at ?? null,

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
  }, [doctorId, fetchAppointments, getDateRange]);

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
