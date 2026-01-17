// File: supabase/functions/pharmacy-settings/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody =
  | { action: "get"; pharmacyId: string }
  | {
      action: "save";
      pharmacyId: string;
      profile?: {
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
      };
      settings?: {
        delivery_available?: boolean;
        delivery_radius_km?: number;
        delivery_fee?: number;
        free_delivery_threshold?: number;
        is_24_hours?: boolean;
        accepts_insurance?: boolean;
        accepts_online_orders?: boolean;
        requires_prescription_verification?: boolean;
        billing_currency?: string;
        timezone?: string;
      };
      operating_hours?: unknown;
      notifications?: unknown;
    };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function asText(v: unknown, fallback: string) {
  if (v === null || v === undefined) return fallback;
  const s = String(v);
  return s.length ? s : fallback;
}

function asBool(v: unknown, fallback: boolean) {
  if (v === null || v === undefined) return fallback;
  return Boolean(v);
}

function asNum(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" };
  }
  return { ok: true as const, url, anon, service };
}

async function assertPharmacyAccess(serviceClient: ReturnType<typeof createClient>, userId: string, pharmacyId: string) {
  const { data: pRow, error: pErr } = await serviceClient
    .from("pharmacies")
    .select("id,admin_id")
    .eq("id", pharmacyId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (pRow?.admin_id === userId) return { ok: true, isAdmin: true };

  const { data: staffRow, error: sErr } = await serviceClient
    .from("pharmacy_staff")
    .select("id,staff_role,status")
    .eq("pharmacy_id", pharmacyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (sErr) throw sErr;

  if (!staffRow?.id) return { ok: false, isAdmin: false };

  const role = String((staffRow as any).staff_role || "staff").toLowerCase();
  return { ok: true, isAdmin: role === "admin" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = await requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const authed = createClient(env.url, env.anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const pharmacyId = (body as any)?.pharmacyId;
  if (!pharmacyId) return json({ ok: false, error: "Missing pharmacyId" }, 400);

  const service = createClient(env.url, env.service);
  const access = await assertPharmacyAccess(service, userRes.user.id, pharmacyId);
  if (!access.ok) return json({ ok: false, error: "Forbidden" }, 403);

  try {
    if (body.action === "get") {
      const { data: pharmacy, error: pErr } = await service
        .from("pharmacies")
        .select("id,name,address,city,state,postal_code,country,phone,email,website,license_number,delivery_available,accepts_insurance,operating_hours,verified,verification_status")
        .eq("id", pharmacyId)
        .maybeSingle();
      if (pErr) throw pErr;

      const { data: settings, error: sErr } = await service
        .from("pharmacy_settings")
        .select("pharmacy_id,delivery_radius_km,delivery_fee,free_delivery_threshold,is_24_hours,accepts_online_orders,requires_prescription_verification,billing_currency,timezone,notifications")
        .eq("pharmacy_id", pharmacyId)
        .maybeSingle();
      if (sErr) throw sErr;

      return json({
        ok: true,
        profile: {
          id: pharmacy?.id ?? pharmacyId,
          name: pharmacy?.name ?? "",
          address: pharmacy?.address ?? "",
          city: pharmacy?.city ?? "",
          state: pharmacy?.state ?? "",
          postal_code: pharmacy?.postal_code ?? "",
          country: pharmacy?.country ?? "US",
          phone: pharmacy?.phone ?? "",
          email: pharmacy?.email ?? "",
          website: pharmacy?.website ?? "",
          license_number: pharmacy?.license_number ?? "",
          verified: Boolean((pharmacy as any)?.verified),
          verification_status: (pharmacy as any)?.verification_status ?? "pending",
        },
        settings: {
          delivery_available: Boolean((pharmacy as any)?.delivery_available),
          accepts_insurance: Boolean((pharmacy as any)?.accepts_insurance),
          delivery_radius_km: asNum(settings?.delivery_radius_km, 10),
          delivery_fee: asNum(settings?.delivery_fee, 5),
          free_delivery_threshold: asNum(settings?.free_delivery_threshold, 50),
          is_24_hours: asBool(settings?.is_24_hours, false),
          accepts_online_orders: asBool(settings?.accepts_online_orders, true),
          requires_prescription_verification: asBool(settings?.requires_prescription_verification, true),
          billing_currency: asText(settings?.billing_currency, "usd"),
          timezone: asText(settings?.timezone, "UTC"),
        },
        operating_hours: (pharmacy as any)?.operating_hours ?? {},
        notifications: settings?.notifications ?? {},
        can_edit: access.isAdmin,
      });
    }

    if (body.action === "save") {
      if (!access.isAdmin) return json({ ok: false, error: "Only pharmacy admins can change settings" }, 403);

      const profile = body.profile || {};
      const settingsPatch = body.settings || {};
      const operatingHours = body.operating_hours;
      const notifications = body.notifications;

      const { error: upPharmacyErr } = await service
        .from("pharmacies")
        .update({
          name: profile.name ?? undefined,
          address: profile.address ?? undefined,
          city: profile.city ?? undefined,
          state: profile.state ?? undefined,
          postal_code: profile.postal_code ?? undefined,
          country: profile.country ?? undefined,
          phone: profile.phone ?? undefined,
          email: profile.email ?? undefined,
          website: profile.website ?? undefined,
          license_number: profile.license_number ?? undefined,
          delivery_available: settingsPatch.delivery_available ?? undefined,
          accepts_insurance: settingsPatch.accepts_insurance ?? undefined,
          operating_hours: operatingHours ?? undefined,
        })
        .eq("id", pharmacyId);

      if (upPharmacyErr) throw upPharmacyErr;

      const { error: upSettingsErr } = await service
        .from("pharmacy_settings")
        .upsert(
          {
            pharmacy_id: pharmacyId,
            delivery_radius_km: settingsPatch.delivery_radius_km ?? undefined,
            delivery_fee: settingsPatch.delivery_fee ?? undefined,
            free_delivery_threshold: settingsPatch.free_delivery_threshold ?? undefined,
            is_24_hours: settingsPatch.is_24_hours ?? undefined,
            accepts_online_orders: settingsPatch.accepts_online_orders ?? undefined,
            requires_prescription_verification: settingsPatch.requires_prescription_verification ?? undefined,
            billing_currency: settingsPatch.billing_currency ?? undefined,
            timezone: settingsPatch.timezone ?? undefined,
            notifications: notifications ?? undefined,
          },
          { onConflict: "pharmacy_id" },
        );

      if (upSettingsErr) throw upSettingsErr;

      return json({ ok: true });
    }

    return json({ ok: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to process pharmacy settings" }, 500);
  }
});
