// File: supabase/functions/get_public_metrics/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Metrics = {
  verified_doctors: number;
  verified_facilities: number;
  appointments_7d: number;
};

function asInt(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

async function countExact(
  admin: any,
  table: string,
  filters: Array<{ col: string; op: "eq" | "gte"; value: string | boolean }>
): Promise<number> {
  let q = admin.from(table).select("id", { count: "exact", head: true });
  for (const f of filters) {
    if (f.op === "eq") q = q.eq(f.col, f.value);
    if (f.op === "gte") q = q.gte(f.col, f.value);
  }
  const { count, error } = await q;
  if (error) throw error;
  return asInt(count ?? 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase environment variables" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const result: Metrics = {
      verified_doctors: 0,
      verified_facilities: 0,
      appointments_7d: 0,
    };

    // Doctors: public.doctors.verified = true
    try {
      result.verified_doctors = await countExact(admin, "doctors", [{ col: "verified", op: "eq", value: true }]);
    } catch {
      result.verified_doctors = 0;
    }

    // Facilities: practices.verified + pharmacies.verified + lab_centers.is_verified + imaging_centers.is_verified
    const facilityCounts: number[] = [];
    try {
      facilityCounts.push(await countExact(admin, "practices", [{ col: "verified", op: "eq", value: true }]));
    } catch {
      facilityCounts.push(0);
    }
    try {
      facilityCounts.push(await countExact(admin, "pharmacies", [{ col: "verified", op: "eq", value: true }]));
    } catch {
      facilityCounts.push(0);
    }
    try {
      facilityCounts.push(await countExact(admin, "lab_centers", [{ col: "is_verified", op: "eq", value: true }]));
    } catch {
      facilityCounts.push(0);
    }
    try {
      facilityCounts.push(await countExact(admin, "imaging_centers", [{ col: "is_verified", op: "eq", value: true }]));
    } catch {
      facilityCounts.push(0);
    }
    result.verified_facilities = facilityCounts.reduce((a, b) => a + b, 0);

    // Appointments created in last 7 days
    try {
      result.appointments_7d = await countExact(admin, "appointments", [{ col: "created_at", op: "gte", value: since }]);
    } catch {
      result.appointments_7d = 0;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
