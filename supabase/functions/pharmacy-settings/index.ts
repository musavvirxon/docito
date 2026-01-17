// File: supabase/functions/pharmacy-settings/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody =
  | {
      action: "get";
      pharmacyId: string;
    }
  | {
      action: "save";
      pharmacyId: string;
      pharmacy: {
        name?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        postal_code?: string | null;
        country?: string | null;
        phone?: string | null;
        email?: string | null;
        website?: string | null;
        license_number?: string | null;
        accepts_insurance?: boolean | null;
        delivery_available?: boolean | null;
        operating_hours?: unknown;
      };
      settings: {
        timezone?: string | null;
        billing_currency?: string | null;
        delivery_radius_km?: number | null;
        delivery_fee_cents?: number | null;
        free_delivery_threshold_cents?: number | null;
        is_24_hours?: boolean | null;
        accepts_online_orders?: boolean | null;
        requires_prescription_verification?: boolean | null;
        notification_settings?: Record<string, unknown> | null;
      };
    };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function badRequest(msg: string) {
  return json({ ok: false, error: msg }, 400);
}

function unauthorized(msg = "Unauthorized") {
  return json({ ok: false, error: msg }, 401);
}

function asText(v: unknown, fallback: string) {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s.length ? s : fallback;
}

function asBool(v: unknown, fallback: boolean) {
  if (v === null || v === undefined) return fallback;
  return Boolean(v);
}

function asInt(v: unknown, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function asNum(v: unknown, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

async function getAuthedUserId(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return { ok: false as const, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" };

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return { ok: false as const, error: "Unauthorized" };
  return { ok: true as const, userId: data.user.id };
}

function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

async function ensurePharmacyAccess(supabase: ReturnType<typeof createClient>, userId: string, pharmacyId: string) {
  // Admin
  const admin = await supabase
    .from("pharmacies")
    .select("id")
    .eq("id", pharmacyId)
    .eq("admin_id", userId)
    .maybeSingle();
  if (admin.data?.id) return true;

  // Staff
  const staff = await supabase
    .from("pharmacy_staff")
    .select("id")
    .eq("pharmacy_id", pharmacyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return Boolean(staff.data?.id);
}

async function readPharmacy(supabase: ReturnType<typeof createClient>, pharmacyId: string) {
  const { data, error } = await supabase
    .from("pharmacies")
    .select(
      "id, name, address, city, state, postal_code, country, phone, email, website, license_number, accepts_insurance, delivery_available, operating_hours, verified, verification_status",
    )
    .eq("id", pharmacyId)
    .single();
  if (error) throw error;
  return data;
}

async function readSettings(supabase: ReturnType<typeof createClient>, pharmacyId: string) {
  const { data, error } = await supabase
    .from("pharmacy_settings")
    .select(
      "pharmacy_id, timezone, billing_currency, delivery_radius_km, delivery_fee_cents, free_delivery_threshold_cents, is_24_hours, accepts_online_orders, requires_prescription_verification, notification_settings",
    )
    .eq("pharmacy_id", pharmacyId)
    .maybeSingle();

  if (error) {
    // If migration hasn't been applied yet, surface a helpful message.
    const msg = (error as any)?.message || "Failed to read pharmacy settings";
    if (String(msg).toLowerCase().includes("does not exist")) {
      return {
        available: false,
        row: {
          pharmacy_id: pharmacyId,
          timezone: "UTC",
          billing_currency: "usd",
          delivery_radius_km: 10,
          delivery_fee_cents: 0,
          free_delivery_threshold_cents: 0,
          is_24_hours: false,
          accepts_online_orders: true,
          requires_prescription_verification: true,
          notification_settings: {},
        },
        warnings: ["pharmacy_settings table not found (run latest migrations)"] as string[],
      };
    }
    throw error;
  }

  if (!data) {
    return {
      available: true,
      row: {
        pharmacy_id: pharmacyId,
        timezone: "UTC",
        billing_currency: "usd",
        delivery_radius_km: 10,
        delivery_fee_cents: 0,
        free_delivery_threshold_cents: 0,
        is_24_hours: false,
        accepts_online_orders: true,
        requires_prescription_verification: true,
        notification_settings: {},
      },
      warnings: [] as string[],
    };
  }

  return {
    available: true,
    row: {
      pharmacy_id: data.pharmacy_id,
      timezone: asText(data.timezone, "UTC"),
      billing_currency: asText(data.billing_currency, "usd"),
      delivery_radius_km: asNum(data.delivery_radius_km, 10),
      delivery_fee_cents: asInt(data.delivery_fee_cents, 0),
      free_delivery_threshold_cents: asInt(data.free_delivery_threshold_cents, 0),
      is_24_hours: asBool(data.is_24_hours, false),
      accepts_online_orders: asBool(data.accepts_online_orders, true),
      requires_prescription_verification: asBool(data.requires_prescription_verification, true),
      notification_settings: (data.notification_settings || {}) as Record<string, unknown>,
    },
    warnings: [] as string[],
  };
}

async function savePharmacy(supabase: ReturnType<typeof createClient>, pharmacyId: string, patch: any) {
  const updates: any = {};
  for (const k of [
    "name",
    "address",
    "city",
    "state",
    "postal_code",
    "country",
    "phone",
    "email",
    "website",
    "license_number",
    "accepts_insurance",
    "delivery_available",
    "operating_hours",
  ]) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) updates[k] = patch[k];
  }

  const { error } = await supabase
    .from("pharmacies")
    .update(updates)
    .eq("id", pharmacyId);
  if (error) throw error;
}

async function saveSettings(supabase: ReturnType<typeof createClient>, pharmacyId: string, patch: any) {
  const upsertRow: any = {
    pharmacy_id: pharmacyId,
  };

  if (Object.prototype.hasOwnProperty.call(patch, "timezone")) upsertRow.timezone = patch.timezone;
  if (Object.prototype.hasOwnProperty.call(patch, "billing_currency")) upsertRow.billing_currency = patch.billing_currency;
  if (Object.prototype.hasOwnProperty.call(patch, "delivery_radius_km")) upsertRow.delivery_radius_km = patch.delivery_radius_km;
  if (Object.prototype.hasOwnProperty.call(patch, "delivery_fee_cents")) upsertRow.delivery_fee_cents = patch.delivery_fee_cents;
  if (Object.prototype.hasOwnProperty.call(patch, "free_delivery_threshold_cents")) {
    upsertRow.free_delivery_threshold_cents = patch.free_delivery_threshold_cents;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "is_24_hours")) upsertRow.is_24_hours = patch.is_24_hours;
  if (Object.prototype.hasOwnProperty.call(patch, "accepts_online_orders")) upsertRow.accepts_online_orders = patch.accepts_online_orders;
  if (Object.prototype.hasOwnProperty.call(patch, "requires_prescription_verification")) {
    upsertRow.requires_prescription_verification = patch.requires_prescription_verification;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "notification_settings")) {
    upsertRow.notification_settings = patch.notification_settings || {};
  }

  const { error } = await supabase
    .from("pharmacy_settings")
    .upsert(upsertRow, { onConflict: "pharmacy_id" });
  if (error) throw error;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return badRequest("POST required");

  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader) return unauthorized();

  const authed = await getAuthedUserId(authHeader);
  if (!authed.ok) return unauthorized(authed.error);

  const supabase = getServiceClient();
  if (!supabase) return json({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return badRequest("Invalid JSON");
  }

  const action = (body as any)?.action;
  const pharmacyId = String((body as any)?.pharmacyId || "").trim();
  if (!pharmacyId) return badRequest("pharmacyId is required");

  const allowed = await ensurePharmacyAccess(supabase, authed.userId, pharmacyId);
  if (!allowed) return unauthorized("Not authorized for this pharmacy");

  try {
    if (action === "get") {
      const pharmacy = await readPharmacy(supabase, pharmacyId);
      const s = await readSettings(supabase, pharmacyId);
      return json({ ok: true, available: s.available, pharmacy, settings: s.row, warnings: s.warnings });
    }

    if (action === "save") {
      const p = (body as any)?.pharmacy || {};
      const sPatch = (body as any)?.settings || {};

      await savePharmacy(supabase, pharmacyId, p);
      await saveSettings(supabase, pharmacyId, sPatch);

      const pharmacy = await readPharmacy(supabase, pharmacyId);
      const s = await readSettings(supabase, pharmacyId);
      return json({ ok: true, available: s.available, pharmacy, settings: s.row, warnings: s.warnings });
    }

    return badRequest("Invalid action");
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Unexpected error" }, 500);
  }
});
