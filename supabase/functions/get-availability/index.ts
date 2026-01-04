import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GetAvailabilityRequest {
  entity_id?: string;
  provider_id?: string;
  from: string;
  to: string;
  appointment_type?: string;
}

interface TimeSlot {
  start_at: string;
  end_at: string;
  available: boolean;
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { entity_id, provider_id, from, to, appointment_type } =
      (await req.json()) as GetAvailabilityRequest;

    if (!from || !to) {
      return new Response(
        JSON.stringify({ error: "Missing from/to dates" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const slots: TimeSlot[] = [];

    // Fetch existing appointments for the date range
    let appointmentsQuery = supabase
      .from("appointments")
      .select("*")
      .gte("appointment_date", from)
      .lte("appointment_date", to)
      .neq("status", "canceled");

    if (provider_id) {
      appointmentsQuery = appointmentsQuery.eq("doctor_id", provider_id);
    }
    if (entity_id) {
      appointmentsQuery = appointmentsQuery.eq("practice_id", entity_id);
    }

    const { data: existingAppointments, error: appointmentsError } = await appointmentsQuery;

    if (appointmentsError) {
      console.error("Error fetching appointments:", appointmentsError);
    }

    // Fetch blocked times if provider is specified
    let blockedTimes: any[] = [];
    if (provider_id) {
      const { data: blocks } = await supabase
        .from("blocked_times")
        .select("*")
        .eq("doctor_id", provider_id)
        .gte("blocked_date", from)
        .lte("blocked_date", to);
      
      blockedTimes = blocks || [];
    }

    // Fetch availability overrides
    let overrides: any[] = [];
    if (provider_id) {
      const { data: ov } = await supabase
        .from("availability_overrides")
        .select("*")
        .eq("doctor_id", provider_id)
        .gte("override_date", from)
        .lte("override_date", to);
      
      overrides = ov || [];
    }

    // Generate time slots (30-minute intervals from 9 AM to 5 PM)
    const slotDuration = appointment_type === "consultation" ? 30 : 30; // minutes
    const workDayStart = 9; // 9 AM
    const workDayEnd = 17; // 5 PM

    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayOfWeek = currentDate.getDay();

      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Check for full-day overrides
      const fullDayOverride = overrides.find(
        o => o.override_date === dateStr && !o.is_available
      );

      if (fullDayOverride) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Generate slots for this day
      for (let hour = workDayStart; hour < workDayEnd; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const startTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;
          const endMinute = minute + slotDuration;
          const endHour = endMinute >= 60 ? hour + 1 : hour;
          const endMinuteAdjusted = endMinute >= 60 ? endMinute - 60 : endMinute;
          const endTime = `${endHour.toString().padStart(2, "0")}:${endMinuteAdjusted.toString().padStart(2, "0")}:00`;

          // Skip if past work hours
          if (endHour > workDayEnd) continue;

          // Check for conflicts with existing appointments
          const hasConflict = (existingAppointments || []).some((apt) => {
            if (apt.appointment_date !== dateStr) return false;
            
            const aptStart = apt.start_time;
            const aptEnd = apt.end_time;

            return (
              (startTime >= aptStart && startTime < aptEnd) ||
              (endTime > aptStart && endTime <= aptEnd) ||
              (startTime <= aptStart && endTime >= aptEnd)
            );
          });

          // Check for blocked times
          const isBlocked = blockedTimes.some((block) => {
            if (block.blocked_date !== dateStr) return false;
            return (
              (startTime >= block.start_time && startTime < block.end_time) ||
              (endTime > block.start_time && endTime <= block.end_time)
            );
          });

          slots.push({
            start_at: `${dateStr}T${startTime}`,
            end_at: `${dateStr}T${endTime}`,
            available: !hasConflict && !isBlocked,
            reason: hasConflict ? "Already booked" : isBlocked ? "Blocked" : undefined,
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return new Response(
      JSON.stringify({ slots }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in get_availability:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
