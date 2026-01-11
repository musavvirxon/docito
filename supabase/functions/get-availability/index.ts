import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GetAvailabilityRequest {
  entity_id?: string;      // practice_id (clinic/hospital)
  provider_id?: string;    // doctor_id
  from: string;            // YYYY-MM-DD
  to: string;              // YYYY-MM-DD
  appointment_type?: string;
}

type Interval = { start: number; end: number }; // minutes [start, end)

type WorkingDay = {
  enabled: boolean;
  start_time: string;
  end_time: string;
  breaks?: Array<{ start_time: string; end_time: string; name?: string }>;
};

type WorkingDays = Record<string, WorkingDay>;

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const pad2 = (n: number) => n.toString().padStart(2, "0");

const normalizeTime = (t: string): string => {
  const parts = t.split(":").map((p) => p.trim());
  if (parts.length === 2) return `${pad2(Number(parts[0]))}:${pad2(Number(parts[1]))}:00`;
  return `${pad2(Number(parts[0] || 0))}:${pad2(Number(parts[1] || 0))}:${pad2(Number(parts[2] || 0))}`;
};

const timeToMinutes = (t: string): number => {
  const [hh, mm] = normalizeTime(t).split(":");
  return Number(hh) * 60 + Number(mm);
};

const minutesToTime = (m: number): string => {
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(hh)}:${pad2(mm)}:00`;
};

const mergeIntervals = (intervals: Interval[]): Interval[] => {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end) last.end = Math.max(last.end, cur.end);
    else out.push({ ...cur });
  }
  return out;
};

const subtractIntervals = (base: Interval[], cuts: Interval[]): Interval[] => {
  if (!base.length) return [];
  if (!cuts.length) return base;

  const mergedCuts = mergeIntervals(cuts);
  const result: Interval[] = [];

  for (const b of base) {
    let cursor = b.start;

    for (const c of mergedCuts) {
      if (c.end <= cursor) continue;
      if (c.start >= b.end) break;

      const cutStart = Math.max(c.start, b.start);
      const cutEnd = Math.min(c.end, b.end);

      if (cutStart > cursor) result.push({ start: cursor, end: cutStart });
      cursor = Math.max(cursor, cutEnd);
      if (cursor >= b.end) break;
    }

    if (cursor < b.end) result.push({ start: cursor, end: b.end });
  }

  return result;
};

const intersectIntervals = (a: Interval[], b: Interval[]): Interval[] => {
  const A = mergeIntervals(a);
  const B = mergeIntervals(b);
  const out: Interval[] = [];

  let i = 0, j = 0;
  while (i < A.length && j < B.length) {
    const start = Math.max(A[i].start, B[j].start);
    const end = Math.min(A[i].end, B[j].end);
    if (end > start) out.push({ start, end });

    if (A[i].end < B[j].end) i++;
    else j++;
  }
  return out;
};

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && aEnd > bStart;

const defaultWorkingDays = (start = "09:00", end = "17:00"): WorkingDays => ({
  monday: { enabled: true, start_time: start, end_time: end, breaks: [] },
  tuesday: { enabled: true, start_time: start, end_time: end, breaks: [] },
  wednesday: { enabled: true, start_time: start, end_time: end, breaks: [] },
  thursday: { enabled: true, start_time: start, end_time: end, breaks: [] },
  friday: { enabled: true, start_time: start, end_time: end, breaks: [] },
  saturday: { enabled: false, start_time: "10:00", end_time: "14:00", breaks: [] },
  sunday: { enabled: false, start_time: "10:00", end_time: "14:00", breaks: [] },
});

const dayToIntervals = (day?: WorkingDay): Interval[] => {
  if (!day?.enabled) return [];
  const s = timeToMinutes(day.start_time);
  const e = timeToMinutes(day.end_time);
  if (e <= s) return [];
  return [{ start: s, end: e }];
};

const breaksToCuts = (day?: WorkingDay): Interval[] => {
  const br = day?.breaks;
  if (!day?.enabled || !Array.isArray(br) || !br.length) return [];
  return br
    .map((b) => {
      const s = timeToMinutes(b.start_time);
      const e = timeToMinutes(b.end_time);
      return e > s ? ({ start: s, end: e } as Interval) : null;
    })
    .filter(Boolean) as Interval[];
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { provider_id, entity_id, from, to, appointment_type } =
      (await req.json()) as GetAvailabilityRequest;

    if (!provider_id) {
      return new Response(JSON.stringify({ error: "Missing provider_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!from || !to) {
      return new Response(JSON.stringify({ error: "Missing from/to dates" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get doctor's practice_id (if entity_id not provided)
    const { data: doctorRow, error: doctorErr } = await supabase
      .from("doctors")
      .select("id, practice_id")
      .eq("id", provider_id)
      .maybeSingle();

    if (doctorErr) throw doctorErr;

    const practiceId = entity_id || doctorRow?.practice_id || null;

    // Doctor schedule settings
    const { data: sched, error: schedErr } = await supabase
      .from("schedule_settings")
      .select("*")
      .eq("doctor_id", provider_id)
      .maybeSingle();

    if (schedErr) throw schedErr;

    const doctorWorkingDays: WorkingDays =
      (sched?.working_days as WorkingDays) ?? defaultWorkingDays("09:00", "17:00");

    const doctorHolidays: string[] = (sched?.holidays as string[]) ?? [];
    const bufferTime = typeof sched?.buffer_time === "number" ? sched.buffer_time : 15;

    // Practice schedule settings (clinic/hospital hours)
    let practiceWorkingDays: WorkingDays | null = null;
    let practiceHolidays: string[] = [];

    if (practiceId) {
      const { data: ps, error: psErr } = await supabase
        .from("practice_schedule_settings")
        .select("*")
        .eq("practice_id", practiceId)
        .maybeSingle();

      if (psErr) throw psErr;

      practiceWorkingDays = (ps?.working_days as WorkingDays) ?? defaultWorkingDays("09:00", "17:00");
      practiceHolidays = (ps?.holidays as string[]) ?? [];
    }

    const holidays = Array.from(new Set([...(doctorHolidays || []), ...(practiceHolidays || [])]));

    // Existing appointments in range
    const { data: existingAppointments, error: apptErr } = await supabase
      .from("appointments")
      .select("appointment_date,start_time,end_time")
      .eq("doctor_id", provider_id)
      .gte("appointment_date", from)
      .lte("appointment_date", to);

    if (apptErr) throw apptErr;

    // Blocked times in range
    const { data: blocks, error: blockErr } = await supabase
      .from("blocked_times")
      .select("blocked_date,start_time,end_time,reason")
      .eq("doctor_id", provider_id)
      .gte("blocked_date", from)
      .lte("blocked_date", to);

    if (blockErr) throw blockErr;
    const blockedTimes = blocks || [];

    // Availability overrides (doctor)
    const { data: ov, error: ovErr } = await supabase
      .from("availability_overrides")
      .select("override_date,start_time,end_time,is_available,notes")
      .eq("doctor_id", provider_id)
      .gte("override_date", from)
      .lte("override_date", to);

    if (ovErr) throw ovErr;
    const overrides = ov || [];

    // Slot duration
    const procedureDuration = appointment_type === "consultation" ? 30 : 30;

    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);

    const slots: Array<{
      start_at: string;
      end_at: string;
      available: boolean;
      reason?: string;
    }> = [];

    const current = new Date(fromDate);
    while (current <= toDate) {
      const dateStr = current.toISOString().split("T")[0];

      // Holidays (doctor OR practice)
      if (holidays.includes(dateStr)) {
        current.setUTCDate(current.getUTCDate() + 1);
        continue;
      }

      const dayName = DAY_NAMES[current.getUTCDay()];

      // Doctor base intervals
      let doctorIntervals: Interval[] = dayToIntervals(doctorWorkingDays?.[dayName]);

      // Apply doctor overrides (add/remove)
      const dayOverrides = overrides.filter((o) => o.override_date === dateStr);
      const addIntervals: Interval[] = [];
      const removeIntervals: Interval[] = [];

      for (const o of dayOverrides) {
        const oStart = timeToMinutes(o.start_time);
        const oEnd = timeToMinutes(o.end_time);
        if (oEnd <= oStart) continue;

        if (o.is_available) addIntervals.push({ start: oStart, end: oEnd });
        else removeIntervals.push({ start: oStart, end: oEnd });
      }

      doctorIntervals = mergeIntervals([...doctorIntervals, ...addIntervals]);
      doctorIntervals = subtractIntervals(doctorIntervals, removeIntervals);

      // Subtract doctor breaks
      doctorIntervals = subtractIntervals(doctorIntervals, breaksToCuts(doctorWorkingDays?.[dayName]));

      // Practice intervals (if practice schedule exists, intersect; otherwise just use doctor)
      let baseIntervals: Interval[] = doctorIntervals;

      if (practiceWorkingDays) {
        let practiceIntervals: Interval[] = dayToIntervals(practiceWorkingDays?.[dayName]);
        practiceIntervals = subtractIntervals(practiceIntervals, breaksToCuts(practiceWorkingDays?.[dayName]));
        baseIntervals = intersectIntervals(doctorIntervals, practiceIntervals);
      }

      // Generate slots inside final intervals
      for (const interval of baseIntervals) {
        let t = interval.start;

        while (t < interval.end) {
          const slotStart = t;
          const procedureEnd = t + procedureDuration;
          const bufferEnd = procedureEnd + bufferTime;

          if (procedureEnd > interval.end) break;

          const startTime = minutesToTime(slotStart);
          const endTime = minutesToTime(procedureEnd);

          const hasConflict = (existingAppointments || []).some((apt) => {
            if (apt.appointment_date !== dateStr) return false;
            const aptStart = timeToMinutes(apt.start_time);
            const aptEnd = timeToMinutes(apt.end_time);
            return overlaps(slotStart, procedureEnd, aptStart, aptEnd);
          });

          const overlappingBlock = blockedTimes.find((bt) => {
            if (bt.blocked_date !== dateStr) return false;
            const bStart = timeToMinutes(bt.start_time);
            const bEnd = timeToMinutes(bt.end_time);
            return overlaps(slotStart, bufferEnd, bStart, bEnd);
          });

          const isBlocked = Boolean(overlappingBlock);

          slots.push({
            start_at: `${dateStr}T${startTime}`,
            end_at: `${dateStr}T${endTime}`,
            available: !hasConflict && !isBlocked,
            reason: hasConflict
              ? "Already booked"
              : isBlocked
              ? (overlappingBlock?.reason || "Blocked")
              : undefined,
          });

          t += procedureDuration;
        }
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    return new Response(JSON.stringify({ slots }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in get-availability:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
