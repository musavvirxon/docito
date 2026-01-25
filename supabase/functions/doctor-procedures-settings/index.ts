// File: supabase/functions/doctor-procedures-settings/index.ts
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

type GetResp = {
  doctor_id: string;
  verified: boolean;
  consultation_fee: number | null;
  accepts_new_patients: boolean | null;
  consultation_procedure_id: string | null;
  consultation_procedure_cost: number | null;
  consultation_is_bookable: boolean | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = getEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  // Verify JWT with anon client
  const authed = createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  const userId = userRes.user.id;

  // Service role for DB reads/writes; still authorize on userId
  const admin = createClient(env.url, env.service);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action = String(body?.action || "get").toLowerCase();

  try {
    const { data: doctorRow, error: doctorErr } = await admin
      .from("doctors")
      .select("id, verified, consultation_fee, accepts_new_patients")
      .eq("user_id", userId)
      .maybeSingle();

    if (doctorErr) throw doctorErr;
    if (!doctorRow?.id) return json({ ok: false, error: "Doctor profile not found" }, 404);

    const doctorId = String(doctorRow.id);
    const verified = Boolean(doctorRow.verified);
    const consultationFee = doctorRow.consultation_fee == null ? null : Number(doctorRow.consultation_fee);
    const acceptsNewPatients =
      typeof doctorRow.accepts_new_patients === "boolean" ? doctorRow.accepts_new_patients : null;

    const ensureIfEligible = async (fee: number | null) => {
      if (!verified) return;
      if (fee == null) return;
      // RPC created by migration; safe to call even if already exists
      const { error } = await admin.rpc("ensure_consultation_procedure", { p_doctor_id: doctorId });
      if (error) {
        // Don't hard-fail GET; but do fail SAVE so user sees the issue
        if (action === "save") throw error;
      }
    };

    const fetchConsultationProcedure = async () => {
      const { data, error } = await admin
        .from("procedures")
        .select("id, default_cost, price, is_bookable, is_active, is_consultation")
        .eq("dentist_id", doctorId)
        .eq("is_consultation", true)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      return data
        ? {
            id: String(data.id),
            cost: data.default_cost == null ? null : Number(data.default_cost),
            is_bookable: typeof data.is_bookable === "boolean" ? data.is_bookable : null,
          }
        : null;
    };

    if (action === "get") {
      await ensureIfEligible(consultationFee);
      const proc = await fetchConsultationProcedure();

      const resp: GetResp = {
        doctor_id: doctorId,
        verified,
        consultation_fee: consultationFee,
        accepts_new_patients: acceptsNewPatients,
        consultation_procedure_id: proc?.id ?? null,
        consultation_procedure_cost: proc?.cost ?? null,
        consultation_is_bookable: proc?.is_bookable ?? null,
      };

      return json({ ok: true, data: resp });
    }

    if (action === "save") {
      const fee =
        body?.consultation_fee === null || body?.consultation_fee === undefined ? undefined : Number(body.consultation_fee);
      const ap = body?.accepts_new_patients;
      const bookable = body?.consultation_is_bookable;

      if (fee !== undefined && (Number.isNaN(fee) || fee < 0)) {
        return json({ ok: false, error: "consultation_fee must be a non-negative number or null" }, 400);
      }
      if (ap !== undefined && typeof ap !== "boolean") {
        return json({ ok: false, error: "accepts_new_patients must be boolean" }, 400);
      }
      if (bookable !== undefined && typeof bookable !== "boolean") {
        return json({ ok: false, error: "consultation_is_bookable must be boolean" }, 400);
      }

      const doctorUpdate: Record<string, any> = {};
      if (body?.consultation_fee === null) doctorUpdate.consultation_fee = null;
      if (fee !== undefined) doctorUpdate.consultation_fee = fee;
      if (ap !== undefined) doctorUpdate.accepts_new_patients = ap;

      if (Object.keys(doctorUpdate).length > 0) {
        const { error } = await admin.from("doctors").update(doctorUpdate).eq("id", doctorId);
        if (error) throw error;
      }

      const finalFee =
        doctorUpdate.consultation_fee !== undefined
          ? doctorUpdate.consultation_fee === null
            ? null
            : Number(doctorUpdate.consultation_fee)
          : consultationFee;

      // Ensure + sync procedure fields (only if verified + fee is set)
      await ensureIfEligible(finalFee);

      const proc = await fetchConsultationProcedure();
      if (proc?.id) {
        const procUpdate: Record<string, any> = {};
        if (finalFee !== undefined) {
          procUpdate.default_cost = finalFee;
          procUpdate.price = finalFee;
        }
        if (bookable !== undefined) procUpdate.is_bookable = bookable;

        if (Object.keys(procUpdate).length > 0) {
          const { error } = await admin.from("procedures").update(procUpdate).eq("id", proc.id);
          if (error) throw error;
        }
      }

      const updatedDoctor = await admin
        .from("doctors")
        .select("verified, consultation_fee, accepts_new_patients")
        .eq("id", doctorId)
        .single();

      if (updatedDoctor.error) throw updatedDoctor.error;

      const updatedFee =
        updatedDoctor.data.consultation_fee == null ? null : Number(updatedDoctor.data.consultation_fee);
      const updatedAccepts =
        typeof updatedDoctor.data.accepts_new_patients === "boolean" ? updatedDoctor.data.accepts_new_patients : null;

      // Re-fetch procedure after updates
      const proc2 = await fetchConsultationProcedure();

      const resp: GetResp = {
        doctor_id: doctorId,
        verified: Boolean(updatedDoctor.data.verified),
        consultation_fee: updatedFee,
        accepts_new_patients: updatedAccepts,
        consultation_procedure_id: proc2?.id ?? null,
        consultation_procedure_cost: proc2?.cost ?? null,
        consultation_is_bookable: proc2?.is_bookable ?? null,
      };

      return json({ ok: true, data: resp });
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
