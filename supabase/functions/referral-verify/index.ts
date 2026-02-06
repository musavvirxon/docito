// Path: supabase/functions/referral-verify/index.ts
// Public referral verification endpoint.
// - Deno + supabase-js v2 + CORS
// - No auth required
// - Verifies by (referral_number, verification_code)
// - Returns safe verification payload only (no PHI)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function getEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) {
    return {
      ok: false as const,
      error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    };
  }
  return { ok: true as const, url, service };
}

function safeString(v: string | null, max = 200) {
  const s = (v || "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function isReasonableToken(v: string) {
  // Accept "DCT-xxxxxxxxxxxxxxxx" or hex tokens
  const s = v.trim();
  if (!s) return false;
  if (/^DCT-[0-9a-f]{16}$/i.test(s)) return true;
  if (/^[0-9a-f]{16,64}$/i.test(s)) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

  const env = getEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const url = new URL(req.url);
  const referralNumber = safeString(url.searchParams.get("ref"), 80);
  const verificationCode = safeString(url.searchParams.get("code"), 80);

  if (!referralNumber || !verificationCode) {
    return json({ ok: false, valid: false, error: "Missing ref or code" }, 400);
  }

  if (!isReasonableToken(verificationCode)) {
    return json({ ok: false, valid: false, error: "Invalid code format" }, 400);
  }

  const admin = createClient(env.url, env.service, {
    auth: { persistSession: false },
    global: { "X-Client-Info": "referral-verify" } as any,
  });

  try {
    // Only return safe fields (no patient name/phone/email)
    const { data, error } = await admin
      .from("referrals")
      .select(
        [
          "id",
          "referral_number",
          "verification_code",
          "status",
          "referral_scope",
          "referral_type_enum",
          "target_field",
          "created_at",
          "valid_from",
          "valid_until",
          "referrer_type",
          "referrer_entity_id",
          "receiver_type",
          "receiver_entity_id",
        ].join(","),
      )
      .eq("referral_number", referralNumber)
      .eq("verification_code", verificationCode)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return json({ ok: true, valid: false });
    }

    // Determine expiration
    const now = new Date();
    const validUntil = (data as any).valid_until ? new Date((data as any).valid_until) : null;
    const isExpired = validUntil ? validUntil.getTime() < now.getTime() : false;

    return json({
      ok: true,
      valid: !isExpired,
      expired: isExpired,
      referral: {
        id: (data as any).id,
        referral_number: (data as any).referral_number,
        status: safeString(String((data as any).status || ""), 40),
        referral_scope: safeString(String((data as any).referral_scope || ""), 20),
        referral_type: safeString(String((data as any).referral_type_enum || ""), 80),
        target_field: safeString(String((data as any).target_field || ""), 120),
        created_at: (data as any).created_at,
        valid_from: (data as any).valid_from,
        valid_until: (data as any).valid_until,
        referrer_type: safeString(String((data as any).referrer_type || ""), 40),
        referrer_entity_id: (data as any).referrer_entity_id,
        receiver_type: safeString(String((data as any).receiver_type || ""), 40),
        receiver_entity_id: (data as any).receiver_entity_id,
      },
    });
  } catch (e: any) {
    console.error("referral-verify error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
