// File: supabase/functions/doctor-dashboard/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function getEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return {
      ok: false as const,
      error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
    };
  }
  return { ok: true as const, url, anon, service };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = getEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  // Verify the JWT with anon client
  const authed = createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  const userId = userRes.user.id;

  // Service role for fast, consistent reads (we still authorize on userId)
  const admin = createClient(env.url, env.service);

  try {
    const { data: doctorRow, error: doctorErr } = await admin
      .from("doctors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (doctorErr) throw doctorErr;
    if (!doctorRow?.id) return json({ ok: false, error: "Doctor profile not found" }, 404);

    const doctorId = doctorRow.id as string;

    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(today.getUTCDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const [{ data: stats, error: statsErr }, { data: upcoming, error: upErr }, { data: recent, error: recErr }] =
      await Promise.all([
        admin.rpc("doctor_dashboard_stats_admin", { p_doctor_id: doctorId }),
        admin
          .from("appointments")
          .select(
            "id, appointment_date, start_time, end_time, status, consultation_type, notes, created_at, patient_id, profiles:patient_id(full_name, avatar_url)",
          )
          .eq("doctor_id", doctorId)
          .gte("appointment_date", todayStr)
          .in("status", ["pending", "confirmed"])
          .order("appointment_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(25),
        admin
          .from("appointments")
          .select(
            "id, appointment_date, start_time, end_time, status, consultation_type, notes, created_at, patient_id, profiles:patient_id(full_name, avatar_url)",
          )
          .eq("doctor_id", doctorId)
          .order("appointment_date", { ascending: false })
          .order("start_time", { ascending: false })
          .limit(25),
      ]);

    if (statsErr) throw statsErr;
    if (upErr) throw upErr;
    if (recErr) throw recErr;

    // Normalize consultation_type (some legacy rows might have null)
    const normalizeType = (t: unknown) => {
      const s = String(t || "").toLowerCase();
      if (s === "video" || s === "telemedicine" || s === "virtual") return "video";
      if (s === "chat") return "chat";
      if (s === "in_person" || s === "in-person" || s === "clinic") return "in_person";
      return t ?? "in_person";
    };

    const mapAppt = (a: any) => ({
      ...a,
      consultation_type: normalizeType(a.consultation_type),
    });

    return json({
      ok: true,
      doctor_id: doctorId,
      stats: Array.isArray(stats) ? stats[0] : stats,
      upcoming_appointments: (upcoming || []).map(mapAppt),
      recent_appointments: (recent || []).map(mapAppt),
    });
  } catch (e: any) {
    console.error("doctor-dashboard error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
