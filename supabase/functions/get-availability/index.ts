import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GetAvailabilityRequest {
  entity_id?: string;
  provider_id?: string; // doctor_id
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  appointment_type?: string;
}

type Interval = { start: number; end: number }; // minutes [start, end)

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
  // Accept HH:MM or HH:MM:SS
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
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
};

const subtractIntervals = (base: Interval[], cuts: Interval[]): Interval[] => {
  if (base.length === 0) return [];
  if (cuts.length === 0) return base;

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

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && aEnd > bStart;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { provider_id, from, to, appointment_type } =
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

    // ✅ Fetch schedule settings (same source of truth as doctor calendar)
    const { data: sched, error: schedErr } = await supabase
      .from("schedule_settings")
      .select("*")
      .eq("doctor_id", provider_id)
      .maybeSingle();

    if (schedErr) throw schedErr;

    // Defaults (match UI defaults)
    const scheduleSettings = {
      working_days:
        (sched?.working_days as Record<
          string,
          {
            enabled: boolean;
            start_time: string;
            end_time: string;
            breaks?: Array<{ start_time: string; end_time: string; name?: string }>;
          }
        >) ?? {
          monday: {
            enabled: true,
            start_time: "09:00",
            end_time: "17:00",
            breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch Break" }],
          },
          tuesday: {
            enabled: true,
            start_time: "09:00",
            end_time: "17:00",
            breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch Break" }],
          },
          wednesday: {
            enabled: true,
            start_time: "09:00",
            end_time: "17:00",
            breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch Break" }],
          },
          thursday: {
            enabled: true,
            start_time: "09:00",
            end_time: "17:00",
            breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch Break" }],
          },
          friday: {
            enabled: true,
            start_time: "09:00",
            end_time: "17:00",
            breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch Break" }],
          },
          saturday: { enabled: false, start_time: "09:00", end_time: "17:00", breaks: [] },
          sunday: { enabled: false, start_time: "09:00", end_time: "17:00", breaks: [] },
        },
      buffer_time: typeof sched?.buffer_time === "number" ? sched.buffer_time : 15,
      holidays: (sched?.holidays as string[]) ?? [],
    };

    // ✅ Fetch existing appointments in range
    const { data: existingAppointments, error: apptErr } = await supabase
      .from("appointments")
      .select("appointment_date,start_time,end_time")
      .eq("doctor_id", provider_id)
      .gte("appointment_date", from)
      .lte("appointment_date", to);

    if (apptErr) throw apptErr;

    // ✅ Fetch blocked times in range
    const { data: blocks, error: blockErr } = await supabase
      .from("blocked_times")
      .select("blocked_date,start_time,end_time,reason")
      .eq("doctor_id", provider_id)
      .gte("blocked_date", from)
      .lte("blocked_date", to);

    if (blockErr) throw blockErr;
    const blockedTimes = blocks || [];

    // ✅ Fetch availability overrides in range
    const { data: ov, error: ovErr } = await supabase
      .from("availability_overrides")
      .select("override_date,start_time,end_time,is_available,notes")
      .eq("doctor_id", provider_id)
      .gte("override_date", from)
      .lte("override_date", to);

    if (ovErr) throw ovErr;
    const overrides = ov || [];

    // Slot duration (keep as before; you can expand types later)
    const procedureDuration = appointment_type === "consultation" ? 30 : 30;
    const bufferTime = scheduleSettings.buffer_time ?? 0;

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

      // ✅ Holidays
      if ((scheduleSettings.holidays || []).includes(dateStr)) {
        current.setUTCDate(current.getUTCDate() + 1);
        continue;
      }

      const dayName = DAY_NAMES[current.getUTCDay()];
      const daySchedule = scheduleSettings.working_days?.[dayName];

      // Base intervals from working hours (if enabled)
      let baseIntervals: Interval[] = [];
      if (daySchedule?.enabled) {
        const start = timeToMinutes(daySchedule.start_time);
        const end = timeToMinutes(daySchedule.end_time);
        if (end > start) baseIntervals.push({ start, end });
      }

      // Apply overrides:
      // - is_available=false => remove time
      // - is_available=true  => add time (even outside regular hours)
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

      baseIntervals = mergeIntervals([...baseIntervals, ...addIntervals]);
      baseIntervals = subtractIntervals(baseIntervals, removeIntervals);

      // Subtract breaks (from schedule_settings)
      if (daySchedule?.enabled && Array.isArray(daySchedule.breaks) && daySchedule.breaks.length) {
        const breakCuts: Interval[] = daySchedule.breaks
          .map((b) => {
            const bStart = timeToMinutes(b.start_time);
            const bEnd = timeToMinutes(b.end_time);
            return bEnd > bStart ? ({ start: bStart, end: bEnd } as Interval) : null;
          })
          .filter(Boolean) as Interval[];

        baseIntervals = subtractIntervals(baseIntervals, breakCuts);
      }

      // Generate slots inside the final availability intervals
      for (const interval of baseIntervals) {
        let t = interval.start;

        while (t < interval.end) {
          const slotStart = t;
          const procedureEnd = t + procedureDuration;
          const bufferEnd = procedureEnd + bufferTime;

          if (procedureEnd > interval.end) break;

          const startTime = minutesToTime(slotStart);
          const endTime = minutesToTime(procedureEnd);

          // Appointment conflict
          const hasConflict = (existingAppointments || []).some((apt) => {
            if (apt.appointment_date !== dateStr) return false;
            const aptStart = timeToMinutes(apt.start_time);
            const aptEnd = timeToMinutes(apt.end_time);
            return overlaps(slotStart, procedureEnd, aptStart, aptEnd);
          });

          // Blocked time conflict (uses bufferEnd like doctor calendar)
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
    console.error("Error in get_availability:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
