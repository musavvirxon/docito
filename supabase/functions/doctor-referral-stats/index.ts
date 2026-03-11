/**
 * Edge Function: doctor-referral-stats
 * Returns aggregated referral KPI stats for the authenticated doctor.
 *
 * Method: POST
 * Body: { doctor_id: string }  — must match the caller's own doctor profile.
 *
 * Responses:
 *   200 { ok: true, stats: { total_sent, total_received, pending_sent,
 *                             pending_received, completed, rejected,
 *                             this_month_sent, this_month_received } }
 *   400 { ok: false, error: "..." }
 *   401 { ok: false, error: "Unauthorized" }
 *   403 { ok: false, error: "Forbidden" }
 *   500 { ok: false, error: "..." }
 *
 * Frontend usage:
 *   const { data } = await supabase.functions.invoke('doctor-referral-stats', {
 *     body: { doctor_id: doctorProfile.id },
 *   });
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function isUuid(v: unknown): boolean {
  const s = String(v ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

serve(async (req: Request) => {
  // ── CORS pre-flight ──────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  // ── Env ──────────────────────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(
      { ok: false, error: "Server misconfiguration: missing env vars" },
      500
    );
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const authHeader =
    req.headers.get("authorization") ||
    req.headers.get("Authorization") ||
    "";
  if (!authHeader) {
    return json({ ok: false, error: "Missing Authorization header" }, 401);
  }

  const authedClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userRes, error: userErr } = await authedClient.auth.getUser();
  if (userErr || !userRes?.user) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }
  const userId = userRes.user.id;

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: { doctor_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const doctorId = String(body?.doctor_id ?? "").trim();
  if (!isUuid(doctorId)) {
    return json({ ok: false, error: "Invalid or missing doctor_id" }, 400);
  }

  // ── Service client ───────────────────────────────────────────────────────────
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ── Authorization: verify caller owns this doctor profile ────────────────────
  const { data: doctorRow, error: docErr } = await admin
    .from("doctors")
    .select("id, user_id")
    .eq("id", doctorId)
    .maybeSingle();

  if (docErr) {
    console.error("doctor-referral-stats: doctor lookup error", docErr);
    return json({ ok: false, error: "Database error" }, 500);
  }

  if (!doctorRow) {
    return json({ ok: false, error: "Doctor not found" }, 404);
  }

  // Check super_admin fallback
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = (roleRows ?? []).map((r: any) =>
    String(r.role ?? "").toLowerCase()
  );
  const isSuperAdmin = roles.includes("super_admin");

  if (!isSuperAdmin && (doctorRow as any).user_id !== userId) {
    return json({ ok: false, error: "Forbidden" }, 403);
  }

  // ── Fetch stats via DB function ──────────────────────────────────────────────
  const { data: statsRows, error: statsErr } = await admin.rpc(
    "get_doctor_referral_stats",
    { p_doctor_id: doctorId }
  );

  if (statsErr) {
    console.error("doctor-referral-stats: rpc error", statsErr);
    return json({ ok: false, error: statsErr.message }, 500);
  }

  const raw = (statsRows as any[])?.[0] ?? {};

  const stats = {
    total_sent: Number(raw.total_sent ?? 0),
    total_received: Number(raw.total_received ?? 0),
    pending_sent: Number(raw.pending_sent ?? 0),
    pending_received: Number(raw.pending_received ?? 0),
    completed: Number(raw.completed ?? 0),
    rejected: Number(raw.rejected ?? 0),
    this_month_sent: Number(raw.this_month_sent ?? 0),
    this_month_received: Number(raw.this_month_received ?? 0),
  };

  return json({ ok: true, stats });
});
