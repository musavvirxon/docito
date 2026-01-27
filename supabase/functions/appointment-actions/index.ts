// File: supabase/functions/appointment-actions/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = { action: "request_start"; appointment_id: string };

type Resp = { ok: true } | { ok: false; error: string; code?: string };

function json(data: Resp, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function requireEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, error: "Missing Authorization header" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) return json({ ok: false, error: "Unauthorized" }, 401);

    let body: ReqBody;
    try {
      body = (await req.json()) as ReqBody;
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    if (!body.appointment_id) return json({ ok: false, error: "Missing appointment_id" }, 400);

    const { data: apt, error: aptErr } = await service
      .from("appointments")
      .select("id, appointment_date, start_time, status, appointment_type, doctor_id, patient_id")
      .eq("id", body.appointment_id)
      .maybeSingle();

    if (aptErr) {
      console.error("Appointment read error:", aptErr);
      return json({ ok: false, error: "Failed to load appointment" }, 500);
    }
    if (!apt) return json({ ok: false, error: "Appointment not found", code: "NOT_FOUND" }, 404);

    if (apt.patient_id !== user.id) return json({ ok: false, error: "Forbidden" }, 403);

    const { data: doc, error: docErr } = await service
      .from("doctors")
      .select("id, user_id")
      .eq("id", apt.doctor_id)
      .maybeSingle();

    if (docErr || !doc?.user_id) {
      console.error("Doctor lookup error:", docErr);
      return json({ ok: false, error: "Failed to resolve doctor" }, 500);
    }

    const { data: existing, error: existingErr } = await service
      .from("notifications")
      .select("id")
      .eq("user_id", doc.user_id)
      .eq("entity_type", "appointment")
      .eq("entity_id", apt.id)
      .eq("metadata->>type", "appointment_start_request")
      .is("read_at", null)
      .limit(1);

    if (existingErr) console.error("Notification dedupe error:", existingErr);

    if (!existing || existing.length === 0) {
      await service
        .from("notifications")
        .insert({
          user_id: doc.user_id,
          entity_type: "appointment",
          entity_id: apt.id,
          role_scope: "doctor",
          level: "info",
          title: "Patient is ready to start",
          body: `Appointment start requested for ${apt.appointment_date} ${apt.start_time}`,
          action_url: `/appointment-session/${apt.id}`,
          metadata: { type: "appointment_start_request", appointment_type: apt.appointment_type },
        })
        .catch((e) => console.error("Notification insert error:", e));
    }

    return json({ ok: true }, 200);
  } catch (e: any) {
    console.error("Error in appointment-actions:", e);
    return json({ ok: false, error: e?.message ?? String(e) }, 500);
  }
});
