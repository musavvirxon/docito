// File: supabase/functions/get-availability/index.ts
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
  procedure_duration_minutes?: number;
  include_breaks?: boolean;
  return_meta?: boolean;
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

    const rawDuration =
      (typeof body.procedure_duration_minutes === "number" ? body.procedure_duration_minutes : undefined) ??
      (typeof body.duration_minutes === "number" ? body.duration_minutes : undefined);

    const procedureDuration = typeof rawDuration === "number" && rawDuration > 0 ? Math.floor(rawDuration) : 30;

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

    // Fetch schedule settings
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
          monday: { enabled: true, start_time: "09:00", end_time: "17:00", breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch Break" }] },
          tuesday: { enabled: true, start_time: "09:00", end_time: "17:00", breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch Break" }] },
          wednesday: { enabled: true, start_time: "09:00", end_time: "17:00", breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch Break" }] },
          thursday: { enabled: true, start_time: "09:00", end_time: "17:00", breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch Break" }] },
          friday: { enabled: true, start_time: "09:00", end_time: "17:00", breaks: [{ start_time: "12:00", end_time: "13:00", name: "Lunch Break" }] },
          saturday: { enabled: false, start_time: "09:00", end_time: "17:00", breaks: [] },
          sunday: { enabled: false, start_time: "09:00", end_time: "17:00", breaks: [] },
        },
      buffer_time: typeof sched?.buffer_time === "number" ? sched.buffer_time : 15,
      holidays: (sched?.holidays as string[]) ?? [],
    };

    const bufferTime = scheduleSettings.buffer_time ?? 0;

    // Fetch existing appointments (confirmed ones)
    const { data: existingAppointments, error: apptErr } = await supabase
      .from("appointments")
      .select("appointment_date,start_time,end_time,status")
      .eq("doctor_id", provider_id)
      .gte("appointment_date", from)
      .lte("appointment_date", to)
      .neq("status", "canceled");
    if (apptErr) throw apptErr;

    // Pending (unconfirmed) appointment holds block slots temporarily
    const nowIso = new Date().toISOString();
    const { data: pendingHolds, error: holdErr } = await supabase
      .from("appointment_holds")
      .select("start_at,end_at,expires_at,status")
      .eq("doctor_id", provider_id)
      .eq("status", "pending")
      .gt("expires_at", nowIso);
    if (holdErr) throw holdErr;

    // Fetch blocked times
    const { data: bt, error: btErr } = await supabase
      .from("blocked_times")
      .select("blocked_date,start_time,end_time,reason,block_type")
      .eq("doctor_id", provider_id)
      .gte("blocked_date", from)
      .lte("blocked_date", to);
    if (btErr) throw btErr;
    const blockedTimes = bt || [];

    // Fetch availability overrides
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

    const meta: Record<string, { date: string; is_holiday: boolean; is_working_day: boolean; working_hours?: { start: string; end: string }; breaks?: Array<{ start: string; end: string }> }> = {};

    // Iterate through each day in range
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dayName = DAY_NAMES[d.getDay()];
      const daySettings = scheduleSettings.working_days[dayName];
      const isHoliday = scheduleSettings.holidays.includes(dateStr);
      const isWorkingDay = daySettings?.enabled && !isHoliday;

      if (returnMeta) {
        meta[dateStr] = {
          date: dateStr,
          is_holiday: isHoliday,
          is_working_day: isWorkingDay,
          working_hours: isWorkingDay ? { start: daySettings.start_time, end: daySettings.end_time } : undefined,
          breaks: isWorkingDay ? daySettings.breaks?.map(b => ({ start: b.start_time, end: b.end_time })) : undefined,
        };
      }

      if (!isWorkingDay) continue;

      // Build available intervals for the day
      const dayStartMins = timeToMinutes(daySettings.start_time);
      const dayEndMins = timeToMinutes(daySettings.end_time);

      let availableIntervals: Interval[] = [{ start: dayStartMins, end: dayEndMins }];

      // Apply overrides for this date
      const dayOverrides = overrides.filter(o => o.override_date === dateStr);
      for (const override of dayOverrides) {
        const oStart = timeToMinutes(override.start_time);
        const oEnd = timeToMinutes(override.end_time);
        if (!override.is_available) {
          availableIntervals = subtractIntervals(availableIntervals, [{ start: oStart, end: oEnd }]);
        }
      }

      // Subtract breaks if not including them
      if (!includeBreaks && daySettings.breaks) {
        const breakIntervals = daySettings.breaks.map(b => ({
          start: timeToMinutes(b.start_time),
          end: timeToMinutes(b.end_time),
        }));
        availableIntervals = subtractIntervals(availableIntervals, breakIntervals);
      }

      // Subtract blocked times
      const dayBlocked = blockedTimes.filter(b => b.blocked_date === dateStr);
      if (dayBlocked.length > 0) {
        const blockedIntervals = dayBlocked.map(b => ({
          start: timeToMinutes(b.start_time),
          end: timeToMinutes(b.end_time),
        }));
        availableIntervals = subtractIntervals(availableIntervals, blockedIntervals);
      }

      // Subtract existing appointments (with buffer)
      const dayAppts = (existingAppointments || []).filter(a => a.appointment_date === dateStr);
      if (dayAppts.length > 0) {
        const apptIntervals = dayAppts.map(a => ({
          start: timeToMinutes(a.start_time) - bufferTime,
          end: timeToMinutes(a.end_time) + bufferTime,
        }));
        availableIntervals = subtractIntervals(availableIntervals, apptIntervals);
      }

      // Subtract pending holds
      const dayHolds = (pendingHolds || []).filter(h => {
        const holdStart = new Date(h.start_at);
        return holdStart.toISOString().split("T")[0] === dateStr;
      });
      if (dayHolds.length > 0) {
        const holdIntervals = dayHolds.map(h => {
          const sDate = new Date(h.start_at);
          const eDate = new Date(h.end_at);
          return {
            start: sDate.getUTCHours() * 60 + sDate.getUTCMinutes() - bufferTime,
            end: eDate.getUTCHours() * 60 + eDate.getUTCMinutes() + bufferTime,
          };
        });
        availableIntervals = subtractIntervals(availableIntervals, holdIntervals);
      }

      // Generate slots from available intervals
      for (const interval of availableIntervals) {
        let cursor = interval.start;
        while (cursor + procedureDuration <= interval.end) {
          const slotStart = minutesToTime(cursor);
          const slotEnd = minutesToTime(cursor + procedureDuration);
          slots.push({
            start_at: `${dateStr}T${slotStart}:00Z`,
            end_at: `${dateStr}T${slotEnd}:00Z`,
            available: true,
          });
          cursor += 15; // 15-minute increments
        }
      }
    }

    const response: any = { slots };
    if (returnMeta) response.meta = meta;

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("get-availability error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
