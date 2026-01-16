// File: supabase/functions/lab-settings/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody =
  | { action: "get"; labCenterId: string }
  | {
      action: "save";
      labCenterId: string;
      center: {
        name?: string | null;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        city?: string | null;
        website?: string | null;
        accepts_insurance?: boolean | null;
        average_turnaround_hours?: number | null;
      };
      settings: {
        timezone?: string | null;
        billing_currency?: string | null;
        notify_email?: boolean | null;
        notify_sms?: boolean | null;
        auto_accept_referrals?: boolean | null;
        default_turnaround_hours?: number | null;
        report_template?: string | null;
      };
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

function asInt(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
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

async function assertLabAccess(serviceClient: ReturnType<typeof createClient>, userId: string, labCenterId: string) {
  const { data: adminRow, error: adminErr } = await serviceClient
    .from("lab_centers")
    .select("id, admin_id")
    .eq("id", labCenterId)
    .maybeSingle();

  if (adminErr) throw adminErr;
  if (adminRow?.admin_id === userId) return true;

  const { data: staffRow, error: staffErr } = await serviceClient
    .from("lab_staff")
    .select("id")
    .eq("lab_center_id", labCenterId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (staffErr) throw staffErr;
  return Boolean(staffRow?.id);
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

  const service = createClient(env.url, env.service);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const labCenterId = (body as any)?.labCenterId;
  if (!labCenterId) return json({ ok: false, error: "Missing labCenterId" }, 400);

  const allowed = await assertLabAccess(service, userRes.user.id, labCenterId);
  if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

  try {
    if (body.action === "get") {
      const { data: center, error: cErr } = await service
        .from("lab_centers")
        .select("id,name,phone,email,address,city,website,accepts_insurance,average_turnaround_hours")
        .eq("id", labCenterId)
        .maybeSingle();
      if (cErr) throw cErr;

      const { data: settings, error: sErr } = await service
        .from("lab_center_settings")
        .select("lab_center_id,timezone,billing_currency,notify_email,notify_sms,auto_accept_referrals,default_turnaround_hours,report_template")
        .eq("lab_center_id", labCenterId)
        .maybeSingle();
      if (sErr) throw sErr;

      return json({
        ok: true,
        center: {
          id: center?.id ?? labCenterId,
          name: center?.name ?? null,
          phone: center?.phone ?? null,
          email: center?.email ?? null,
          address: center?.address ?? null,
          city: center?.city ?? null,
          website: center?.website ?? null,
          accepts_insurance: Boolean(center?.accepts_insurance),
          average_turnaround_hours: Number(center?.average_turnaround_hours ?? 24),
        },
        settings: {
          lab_center_id: labCenterId,
          timezone: asText(settings?.timezone, "UTC"),
          billing_currency: asText(settings?.billing_currency, "usd"),
          notify_email: asBool(settings?.notify_email, true),
          notify_sms: asBool(settings?.notify_sms, false),
          auto_accept_referrals: asBool(settings?.auto_accept_referrals, false),
          default_turnaround_hours: asInt(settings?.default_turnaround_hours, 24),
          report_template: asText(settings?.report_template, ""),
        },
      });
    }

    if (body.action === "save") {
      const centerPatch = body.center || {};
      const settingsPatch = body.settings || {};

      const avgTurnaround = asInt(
        settingsPatch.default_turnaround_hours ?? centerPatch.average_turnaround_hours,
        24,
      );

      const { error: upCenterErr } = await service
        .from("lab_centers")
        .update({
          name: centerPatch.name ?? undefined,
          phone: centerPatch.phone ?? undefined,
          email: centerPatch.email ?? undefined,
          address: centerPatch.address ?? undefined,
          city: centerPatch.city ?? undefined,
          website: centerPatch.website ?? undefined,
          accepts_insurance: centerPatch.accepts_insurance ?? undefined,
          average_turnaround_hours: avgTurnaround,
        })
        .eq("id", labCenterId);

      if (upCenterErr) throw upCenterErr;

      const { error: upSettingsErr } = await service
        .from("lab_center_settings")
        .upsert(
          {
            lab_center_id: labCenterId,
            timezone: settingsPatch.timezone ?? undefined,
            billing_currency: settingsPatch.billing_currency ?? undefined,
            notify_email: settingsPatch.notify_email ?? undefined,
            notify_sms: settingsPatch.notify_sms ?? undefined,
            auto_accept_referrals: settingsPatch.auto_accept_referrals ?? undefined,
            default_turnaround_hours: avgTurnaround,
            report_template: settingsPatch.report_template ?? undefined,
          },
          { onConflict: "lab_center_id" },
        );

      if (upSettingsErr) throw upSettingsErr;

      return json({ ok: true });
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg }, 500);
  }
});
