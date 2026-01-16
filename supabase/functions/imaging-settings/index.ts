// File: supabase/functions/imaging-settings/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody =
  | { action: "get"; centerId: string }
  | {
      action: "save";
      centerId: string;
      center: {
        name?: string | null;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        city?: string | null;
        website?: string | null;
        modalities?: string[] | null;
        accreditations?: string[] | null;
        accepts_insurance?: boolean | null;
      };
      settings: {
        timezone?: string | null;
        billing_currency?: string | null;
        notify_email?: boolean | null;
        notify_sms?: boolean | null;
        report_template?: string | null;
        auto_accept_referrals?: boolean | null;
        default_turnaround_hours?: number | null;
      };
    };

type RespBody =
  | {
      ok: true;
      center: any;
      settings: any;
      warnings?: string[];
    }
  | { ok: false; error: string; warnings?: string[] };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function isMissingSchemaError(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "");
  const m = msg.toLowerCase();
  return (
    msg.includes("Could not find the table") ||
    m.includes("schema cache") ||
    (m.includes("column") && m.includes("does not exist")) ||
    (m.includes("relation") && m.includes("does not exist"))
  );
}

async function ensureCenterAccess(supabase: ReturnType<typeof createClient>, userId: string, centerId: string) {
  const { data: adminRow } = await supabase
    .from("imaging_centers")
    .select("id")
    .eq("id", centerId)
    .eq("admin_id", userId)
    .maybeSingle();

  if (adminRow?.id) return true;

  const { data: staffRow } = await supabase
    .from("imaging_staff")
    .select("id")
    .eq("imaging_center_id", centerId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return Boolean(staffRow?.id);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method Not Allowed" } satisfies RespBody, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, error: "Missing Authorization header" } satisfies RespBody, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return json({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" } satisfies RespBody, 500);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) return json({ ok: false, error: "Unauthorized" } satisfies RespBody, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" } satisfies RespBody, 400);
  }

  const centerId = (body.centerId || "").trim();
  if (!centerId) return json({ ok: false, error: "Missing centerId" } satisfies RespBody, 400);

  const allowed = await ensureCenterAccess(supabase, user.id, centerId);
  if (!allowed) return json({ ok: false, error: "Forbidden" } satisfies RespBody, 403);

  const warnings: string[] = [];

  try {
    if (body.action === "get") {
      const { data: center, error: cErr } = await supabase
        .from("imaging_centers")
        .select("id, name, phone, email, address, city, website, modalities, accreditations, accepts_insurance")
        .eq("id", centerId)
        .single();

      if (cErr) return json({ ok: false, error: cErr.message } satisfies RespBody, 500);

      let settings: any = {
        imaging_center_id: centerId,
        timezone: "UTC",
        billing_currency: "usd",
        notify_email: true,
        notify_sms: false,
        report_template: "",
        auto_accept_referrals: false,
        default_turnaround_hours: 24,
      };

      const { data: sData, error: sErr } = await supabase
        .from("imaging_center_settings")
        .select("imaging_center_id, timezone, billing_currency, notify_email, notify_sms, report_template, auto_accept_referrals, default_turnaround_hours")
        .eq("imaging_center_id", centerId)
        .maybeSingle();

      if (sErr) {
        if (isMissingSchemaError(sErr)) warnings.push("schema_not_ready:imaging_center_settings");
        else warnings.push(`settings_query_failed:${sErr.message}`);
      } else if (sData) {
        settings = {
          imaging_center_id: centerId,
          timezone: sData.timezone ?? "UTC",
          billing_currency: sData.billing_currency ?? "usd",
          notify_email: Boolean(sData.notify_email),
          notify_sms: Boolean(sData.notify_sms),
          report_template: sData.report_template ?? "",
          auto_accept_referrals: Boolean(sData.auto_accept_referrals),
          default_turnaround_hours: Number(sData.default_turnaround_hours ?? 24),
        };
      }

      return json({ ok: true, center, settings, ...(warnings.length ? { warnings } : {}) } satisfies RespBody, 200);
    }

    // save
    const { center, settings } = body;

    const { error: upCenterErr } = await supabase
      .from("imaging_centers")
      .update({
        name: center.name ?? null,
        phone: center.phone ?? null,
        email: center.email ?? null,
        address: center.address ?? null,
        city: center.city ?? null,
        website: center.website ?? null,
        modalities: center.modalities ?? [],
        accreditations: center.accreditations ?? [],
        accepts_insurance: Boolean(center.accepts_insurance),
      })
      .eq("id", centerId);

    if (upCenterErr) return json({ ok: false, error: upCenterErr.message } satisfies RespBody, 500);

    const payload = {
      imaging_center_id: centerId,
      timezone: settings.timezone ?? "UTC",
      billing_currency: settings.billing_currency ?? "usd",
      notify_email: Boolean(settings.notify_email),
      notify_sms: Boolean(settings.notify_sms),
      report_template: settings.report_template ?? null,
      auto_accept_referrals: Boolean(settings.auto_accept_referrals),
      default_turnaround_hours: Number(settings.default_turnaround_hours ?? 24),
    };

    const { error: upSettingsErr } = await supabase
      .from("imaging_center_settings")
      .upsert(payload, { onConflict: "imaging_center_id" });

    if (upSettingsErr) {
      if (isMissingSchemaError(upSettingsErr)) warnings.push("schema_not_ready:imaging_center_settings");
      else return json({ ok: false, error: upSettingsErr.message } satisfies RespBody, 500);
    }

    const { data: centerOut, error: cOutErr } = await supabase
      .from("imaging_centers")
      .select("id, name, phone, email, address, city, website, modalities, accreditations, accepts_insurance")
      .eq("id", centerId)
      .single();

    if (cOutErr) return json({ ok: false, error: cOutErr.message } satisfies RespBody, 500);

    let settingsOut: any = payload;
    const { data: sOut, error: sOutErr } = await supabase
      .from("imaging_center_settings")
      .select("imaging_center_id, timezone, billing_currency, notify_email, notify_sms, report_template, auto_accept_referrals, default_turnaround_hours")
      .eq("imaging_center_id", centerId)
      .maybeSingle();

    if (sOutErr) {
      if (isMissingSchemaError(sOutErr)) warnings.push("schema_not_ready:imaging_center_settings");
      else warnings.push(`settings_readback_failed:${sOutErr.message}`);
    } else if (sOut) {
      settingsOut = {
        imaging_center_id: centerId,
        timezone: sOut.timezone ?? "UTC",
        billing_currency: sOut.billing_currency ?? "usd",
        notify_email: Boolean(sOut.notify_email),
        notify_sms: Boolean(sOut.notify_sms),
        report_template: sOut.report_template ?? "",
        auto_accept_referrals: Boolean(sOut.auto_accept_referrals),
        default_turnaround_hours: Number(sOut.default_turnaround_hours ?? 24),
      };
    }

    return json({ ok: true, center: centerOut, settings: settingsOut, ...(warnings.length ? { warnings } : {}) } satisfies RespBody, 200);
  } catch (e) {
    return json({ ok: false, error: String((e as any)?.message ?? e) } satisfies RespBody, 200);
  }
});
