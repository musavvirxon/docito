import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GetAvailabilityRequest {
  entity_id?: string;
  provider_id?: string; // doctor_id
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  appointment_type?: string;

  // ✅ NEW
  procedure_duration_minutes?: number; // allows correct slot length checks
  include_breaks?: boolean; // show break times as unavailable reasons
  return_meta?: boolean; // include day meta (day off/holiday/blocked/breaks)

  // ✅ Back-compat (older clients)
  duration_minutes?: number;
}

type Interval = { start: number; end: number };

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map((x) => Number(x));
  return h * 60 + m;
};

const minutesToTime = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && aEnd > bStart;

const mergeIntervals = (intervals: Interval[]): Interval[] => {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const cur of sorted) {
    const last = out[out.length - 1];
    if (!last) out.push({ ...cur });
    else if (cur.start <= last.end) last.end = Math.max(last.end, cur.end);
    else out.push({ ...cur });
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

      if (c.start > cursor) result.push({ start: cursor, end: Math.min(c.start, b.end) });
      cursor = Math.max(cursor, c.end);

      if (cursor >= b.end) break;
    }

    if (cursor < b.end) result.push({ start: cursor, end: b.end });
  }

  return result;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = (await req.json()) as GetAvailabilityRequest;

    const provider_id = body.provider_id;
    const from = body.from;
    const to = body.to;
    const appointment_type = body.appointment_type;
    const entity_id = body.entity_id;

    const rawDuration =
      (typeof body.procedure_duration_minutes === "number" ? body.procedure_duration_minutes : undefined) ??
      (typeof body.duration_minutes === "number" ? body.duration_minutes : undefined);

    const procedureDuration =
      typeof rawDuration === "number" && rawDuration > 0 ? Math.floor(rawDuration) : 30;

    const includeBreaks = Boolean(body.include_breaks);
    const returnMeta = Boolean(body.return_meta);

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

    const { data: sched, error: schedErr } = await supabase
      .from("schedule_settings")
      .select("working_days,buffer_time,holidays")
      .eq("doctor_id", provider_id)
      .maybeSingle();
    if (schedErr) throw schedErr;

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

    const bufferTime = scheduleSettings.buffer_time ?? 0;

    const { data: existingAppointments, error: apptErr } = await supabase
      .from("appointments")
      .select("appointment_date,start_time,end_time")
      .eq("doctor_id", provider_id)
      .gte("appointment_date", from)
      .lte("appointment_date", to);
    if (apptErr) throw apptErr;

    const { data: bt, error: btErr } = await supabase
      .from("blocked_times")
      .select("blocked_date,start_time,end_time,reason,block_type")
      .eq("doctor_id", provider_id)
      .gte("blocked_date", from)
      .lte("blocked_date", to);
    if (btErr) throw btErr;
    const blockedTimes = bt || [];

    const { data: ov, error: ovErr } = await supabase
      .from("availability_overrides")
      .select("override_date,start_time,end_time,is_available")
      .eq("doctor_id", provider_id)
      .gte("override_date", from)
      .lte("override_date", to);
    if (ovErr) throw ovErr;
    const overrides = ov || [];

    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);

    const slots: Array<{ start_at: string; end_at: string; available: boolean; reason?: string }> = [];

    const meta: Record<
      string,
      {
        date: string;
        is_holiday: boolean;
        is_working_day: boolean;
        working_hours?: { start_time: string; end_time: string };
        breaks: Array<{ start_time: string; end_time: string; name?: string }>;
        blocked: Array<{ start_time: string; end_time: string; reason?: string }>;
      }
    > = {};

    const now = new Date();
    const todayUtc = now.toISOString().split("T")[0];
    const nowUtcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

    const current = new Date(fromDate);

    while (current <= toDate) {
      const dateStr = current.toISOString().split("T")[0];
      const dayName = DAY_NAMES[current.getUTCDay()];
      const daySchedule = scheduleSettings.working_days?.[dayName];

      const isHoliday = (scheduleSettings.holidays || []).includes(dateStr);
      const isWorkingDay = Boolean(daySchedule?.enabled);

      const dayBreaks = Array.isArray(daySchedule?.breaks) ? daySchedule!.breaks! : [];

      const dayBlocked = blockedTimes
        .filter((b) => b.blocked_date === dateStr)
        .map((b) => ({
          start_time: b.start_time,
          end_time: b.end_time,
          reason: b.reason || b.block_type || "Blocked",
        }));

      if (returnMeta) {
        meta[dateStr] = {
          date: dateStr,
          is_holiday: isHoliday,
          is_working_day: isWorkingDay,
          working_hours: daySchedule?.enabled
            ? { start_time: daySchedule.start_time, end_time: daySchedule.end_time }
            : undefined,
          breaks: dayBreaks,
          blocked: dayBlocked,
        };
      }

      if (isHoliday || !isWorkingDay) {
        current.setUTCDate(current.getUTCDate() + 1);
        continue;
      }

      const workStart = timeToMinutes(daySchedule.start_time);
      const workEnd = timeToMinutes(daySchedule.end_time);

      let baseIntervals: Interval[] = [{ start: workStart, end: workEnd }];

      const dayOverrides = overrides.filter((o) => o.override_date === dateStr);
      if (dayOverrides.length > 0) {
        const availableIntervals: Interval[] = [];
        const unavailableIntervals: Interval[] = [];

        for (const o of dayOverrides) {
          const s = timeToMinutes(o.start_time);
          const e = timeToMinutes(o.end_time);
          if (o.is_available) availableIntervals.push({ start: s, end: e });
          else unavailableIntervals.push({ start: s, end: e });
        }

        baseIntervals = availableIntervals.length ? mergeIntervals(availableIntervals) : baseIntervals;
        baseIntervals = subtractIntervals(baseIntervals, unavailableIntervals);
      }

      if (includeBreaks && dayBreaks.length) {
        const breakIntervals: Interval[] = dayBreaks.map((b) => ({
          start: timeToMinutes(b.start_time),
          end: timeToMinutes(b.end_time),
        }));
        baseIntervals = subtractIntervals(baseIntervals, breakIntervals);
      }

      for (const interval of baseIntervals) {
        let t = interval.start;

        while (t < interval.end) {
          const slotStart = t;
          const procedureEnd = t + procedureDuration;
          const bufferEnd = procedureEnd + bufferTime;

          if (procedureEnd > interval.end) break;

          const startTime = minutesToTime(slotStart);
          const endTime = minutesToTime(procedureEnd);

          const isPastUtc = dateStr === todayUtc && slotStart <= nowUtcMinutes;

          let breakReason: string | undefined = undefined;
          if (includeBreaks && dayBreaks.length) {
            for (const br of dayBreaks) {
              const bStart = timeToMinutes(br.start_time);
              const bEnd = timeToMinutes(br.end_time);
              if (overlaps(slotStart, procedureEnd, bStart, bEnd)) {
                breakReason = br.name || "Break";
                break;
              }
            }
          }

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

          const available = !isPastUtc && !hasConflict && !isBlocked && !breakReason;
          const reason = isPastUtc
            ? "Past time"
            : hasConflict
            ? "Already booked"
            : isBlocked
            ? (overlappingBlock?.reason || overlappingBlock?.block_type || "Blocked")
            : breakReason
            ? breakReason
            : undefined;

          slots.push({
            start_at: `${dateStr}T${startTime}`,
            end_at: `${dateStr}T${endTime}`,
            available,
            reason,
          });

          t += procedureDuration;
        }
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    return new Response(JSON.stringify(returnMeta ? { slots, meta } : { slots }), {
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
});
