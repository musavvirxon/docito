// File: supabase/functions/imaging-settings/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SettingsPayload = {
  centerId: string;
  action: "get" | "upsert";
  settings?: {
    timezone?: string;
    billing_currency?: string;
    notify_email?: boolean;
    notify_sms?: boolean;
    report_template?: string | null;
  };
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function isSchemaCacheMissing(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "");
  const m = msg.toLowerCase();
  return msg.includes("Could not find the table") || m.includes("schema cache") || (m.includes("relation") && m.includes("does not exist"));
}

async function ensureCenterAccess(supabase: ReturnType<typeof createClient>, userId: string, centerId: string) {
  const { data: adminRow, error: adminErr } = await supabase
    .from("imaging_centers")
    .select("id")
    .eq("id", centerId)
    .eq("admin_id", userId)
    .maybeSingle();

  if (adminErr) return false;
  if (adminRow?.id) return true;

  const { data: staffRow, error: staffErr } = await supabase
    .from("imaging_staff")
    .select("id")
    .eq("imaging_center_id", centerId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (staffErr) return false;
  return Boolean(staffRow?.id);
}

const DEFAULTS = {
  timezone: "UTC",
  billing_currency: "usd",
  notify_email: true,
  notify_sms: false,
  report_template: "",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }, 500);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  let body: SettingsPayload;
  try {
    body = (await req.json()) as SettingsPayload;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const centerId = body?.centerId?.trim();
  const action = body?.action;

  if (!centerId) return json({ error: "Missing centerId" }, 400);
  if (action !== "get" && action !== "upsert") return json({ error: "Invalid action" }, 400);

  const allowed = await ensureCenterAccess(supabase, user.id, centerId);
  if (!allowed) return json({ error: "Forbidden" }, 403);

  if (action === "get") {
    const { data, error } = await supabase
      .from("imaging_center_settings")
      .select("imaging_center_id, timezone, billing_currency, notify_email, notify_sms, report_template, updated_at")
      .eq("imaging_center_id", centerId)
      .maybeSingle();

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return json(
          {
            ok: true,
            available: false,
            settings: { ...DEFAULTS, imaging_center_id: centerId },
            warning: "schema_cache_missing:imaging_center_settings",
          },
          200,
        );
      }
      return json({ error: error.message }, 500);
    }

    return json(
      {
        ok: true,
        available: true,
        settings: {
          imaging_center_id: centerId,
          timezone: data?.timezone ?? DEFAULTS.timezone,
          billing_currency: data?.billing_currency ?? DEFAULTS.billing_currency,
          notify_email: data?.notify_email ?? DEFAULTS.notify_email,
          notify_sms: data?.notify_sms ?? DEFAULTS.notify_sms,
          report_template: data?.report_template ?? DEFAULTS.report_template,
          updated_at: data?.updated_at ?? null,
        },
      },
      200,
    );
  }

  // upsert
  const incoming = body.settings ?? {};
  const payload = {
    imaging_center_id: centerId,
    timezone: String(incoming.timezone ?? DEFAULTS.timezone),
    billing_currency: String(incoming.billing_currency ?? DEFAULTS.billing_currency),
    notify_email: Boolean(incoming.notify_email ?? DEFAULTS.notify_email),
    notify_sms: Boolean(incoming.notify_sms ?? DEFAULTS.notify_sms),
    report_template: incoming.report_template ?? "",
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase
    .from("imaging_center_settings")
    .upsert(payload, { onConflict: "imaging_center_id" });

  if (upsertErr) {
    if (isSchemaCacheMissing(upsertErr)) {
      return json(
        {
          ok: false,
          available: false,
          settings: { ...DEFAULTS, imaging_center_id: centerId },
          warning: "schema_cache_missing:imaging_center_settings",
        },
        200,
      );
    }
    return json({ error: upsertErr.message }, 500);
  }

  return json({ ok: true, available: true, settings: payload }, 200);
});
