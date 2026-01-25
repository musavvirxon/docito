import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GetReq = {
  action: "get";
};

type SaveReq = {
  action: "save";
  consultation_fee?: number | null;
  accepts_new_patients?: boolean | null;
  consultation_duration_minutes?: number | null;
  consultation_is_active?: boolean | null;
  consultation_is_bookable?: boolean | null;
};

type ReqBody = GetReq | SaveReq;

type DoctorRow = {
  id: string;
  user_id: string;
  verified: boolean | null;
  consultation_fee: number | null;
  accepts_new_patients?: boolean | null;
};

type ProcedureRow = {
  id: string;
  dentist_id: string;
  name: string;
  price: number | null;
  default_cost: number | null;
  duration_minutes: number | null;
  is_active: boolean | null;
  is_bookable: boolean | null;
  is_consultation: boolean | null;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function requireEnv() {
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

function clampNumber(v: unknown, min: number, max: number, fallback: number | null) {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampInt(v: unknown, min: number, max: number, fallback: number | null) {
  const n = clampNumber(v, min, max, fallback);
  if (n === null) return null;
  return Math.trunc(n);
}

async function getDoctorByUserId(serviceClient: any, userId: string): Promise<DoctorRow | null> {
  const { data, error } = await serviceClient
    .from("doctors")
    .select("id, user_id, verified, consultation_fee, accepts_new_patients")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as DoctorRow) ?? null;
}

async function getConsultationProcedure(serviceClient: any, doctorId: string): Promise<ProcedureRow | null> {
  const { data, error } = await serviceClient
    .from("procedures")
    .select("id, dentist_id, name, price, default_cost, duration_minutes, is_active, is_bookable, is_consultation")
    .eq("dentist_id", doctorId)
    .eq("is_consultation", true)
    .maybeSingle();

  if (error) throw error;
  return (data as ProcedureRow) ?? null;
}

async function ensureConsultationProcedure(serviceClient: any, doctor: DoctorRow): Promise<ProcedureRow | null> {
  if (!doctor.verified) return null;
  if (doctor.consultation_fee === null || doctor.consultation_fee === undefined) return null;

  const existing = await getConsultationProcedure(serviceClient, doctor.id);
  if (existing) return existing;

  const fee = Number(doctor.consultation_fee);

  const { data, error } = await serviceClient
    .from("procedures")
    .insert({
      dentist_id: doctor.id,
      name: "Consultation",
      category: "general",
      type: "single_visit",
      default_cost: fee,
      price: fee,
      duration_minutes: 30,
      is_active: true,
      is_bookable: true,
      is_consultation: true,
    })
    .select("id, dentist_id, name, price, default_cost, duration_minutes, is_active, is_bookable, is_consultation")
    .single();

  if (error) {
    // Race condition safety (unique partial index): if another request created it first, read it back.
    const readBack = await getConsultationProcedure(serviceClient, doctor.id);
    if (readBack) return readBack;
    throw error;
  }

  return (data as ProcedureRow) ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  if (!body || ((body as any).action !== "get" && (body as any).action !== "save")) {
    return json({ ok: false, error: "Invalid action" }, 400);
  }

  // Authed client for user identity
  const authed = createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  // Service role client for DB ops (we still enforce ownership checks ourselves)
  const service = createClient(env.url, env.service);

  try {
    const doctor = await getDoctorByUserId(service, userRes.user.id);
    if (!doctor) return json({ ok: false, error: "Doctor profile not found" }, 404);

    // Always ensure the consultation procedure exists when doctor is verified & has a fee.
    // (DB trigger should handle this too; this is a safe fallback for legacy data.)
    const ensured = await ensureConsultationProcedure(service, doctor);

    if (body.action === "get") {
      const proc = ensured ?? (await getConsultationProcedure(service, doctor.id));
      return json({
        ok: true,
        doctor: {
          id: doctor.id,
          verified: Boolean(doctor.verified),
          consultation_fee: doctor.consultation_fee,
          accepts_new_patients: (doctor as any).accepts_new_patients ?? null,
        },
        consultationProcedure: proc,
      });
    }

    // save
    const saveBody = body as SaveReq;

    const nextFee =
      saveBody.consultation_fee === undefined ? undefined : clampNumber(saveBody.consultation_fee, 0, 1000000, null);

    const nextAccepts =
      saveBody.accepts_new_patients === undefined
        ? undefined
        : saveBody.accepts_new_patients === null
          ? null
          : Boolean(saveBody.accepts_new_patients);

    const nextDuration =
      saveBody.consultation_duration_minutes === undefined
        ? undefined
        : clampInt(saveBody.consultation_duration_minutes, 5, 600, null);

    const nextIsActive =
      saveBody.consultation_is_active === undefined
        ? undefined
        : saveBody.consultation_is_active === null
          ? null
          : Boolean(saveBody.consultation_is_active);

    const nextIsBookable =
      saveBody.consultation_is_bookable === undefined
        ? undefined
        : saveBody.consultation_is_bookable === null
          ? null
          : Boolean(saveBody.consultation_is_bookable);

    // Update doctor settings
    const doctorUpdate: Record<string, unknown> = {};
    if (nextFee !== undefined) doctorUpdate.consultation_fee = nextFee;
    if (nextAccepts !== undefined) doctorUpdate.accepts_new_patients = nextAccepts;

    if (Object.keys(doctorUpdate).length > 0) {
      const { error: dErr } = await service.from("doctors").update(doctorUpdate).eq("id", doctor.id);
      if (dErr) throw dErr;
    }

    // Re-fetch doctor after update
    const updatedDoctor = (await getDoctorByUserId(service, userRes.user.id)) as DoctorRow;

    // Ensure consultation procedure exists if verified+fee
    const consultationProc = await ensureConsultationProcedure(service, updatedDoctor);

    // Update consultation procedure settings if it exists
    const procToUpdate = consultationProc ?? (await getConsultationProcedure(service, updatedDoctor.id));
    if (procToUpdate) {
      const procUpdate: Record<string, unknown> = {};

      if (nextFee !== undefined) {
        procUpdate.price = nextFee;
        procUpdate.default_cost = nextFee;
      }
      if (nextDuration !== undefined) procUpdate.duration_minutes = nextDuration;
      if (nextIsActive !== undefined) procUpdate.is_active = nextIsActive;
      if (nextIsBookable !== undefined) procUpdate.is_bookable = nextIsBookable;

      if (Object.keys(procUpdate).length > 0) {
        const { error: pErr } = await service
          .from("procedures")
          .update(procUpdate)
          .eq("id", procToUpdate.id)
          .eq("dentist_id", updatedDoctor.id)
          .eq("is_consultation", true);
        if (pErr) throw pErr;
      }
    }

    // Return fresh values
    const finalDoctor = (await getDoctorByUserId(service, userRes.user.id)) as DoctorRow;
    const finalProc = await getConsultationProcedure(service, finalDoctor.id);

    return json({
      ok: true,
      doctor: {
        id: finalDoctor.id,
        verified: Boolean(finalDoctor.verified),
        consultation_fee: finalDoctor.consultation_fee,
        accepts_new_patients: (finalDoctor as any).accepts_new_patients ?? null,
      },
      consultationProcedure: finalProc,
    });
  } catch (e) {
    const msg = (e as any)?.message || String(e);
    console.error("doctor-procedures-settings error:", msg);
    return json({ ok: false, error: msg }, 500);
  }
});
