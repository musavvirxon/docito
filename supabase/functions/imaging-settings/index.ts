// File: supabase/functions/imaging-settings/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

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
      available: boolean;
      center: {
        id: string;
        name: string | null;
        phone: string | null;
        email: string | null;
        address: string | null;
        city: string | null;
        website: string | null;
        modalities: string[];
        accreditations: string[];
        accepts_insurance: boolean;
      };
      settings: {
        imaging_center_id: string;
        timezone: string;
        billing_currency: string;
        notify_email: boolean;
        notify_sms: boolean;
        report_template: string;
        auto_accept_referrals: boolean;
        default_turnaround_hours: number;
      };
      warnings?: string[];
    }
  | { ok: false; error: string; available?: boolean; warnings?: string[] };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function asText(v: unknown, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

function asBool(v: unknown, fallback = false): boolean {
  if (v === null || v === undefined) return fallback;
  return Boolean(v);
}

function asInt(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

async function getAuthedUserId(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return { ok: false as const, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" };

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { ok: false as const, error: "Unauthorized" };
  return { ok: true as const, userId: user.id };
}

function requireDbUrl(): string | null {
  return Deno.env.get("SUPABASE_DB_URL") || Deno.env.get("DATABASE_URL") || null;
}

async function tableExists(client: Client, tableName: string): Promise<boolean> {
  const res = await client.queryObject<{ exists: boolean }>({
    text: `select exists (
       select 1
       from information_schema.tables
       where table_schema = 'public' and table_name = $1
     ) as exists`,
    args: [tableName],
  });
  return Boolean(res.rows?.[0]?.exists);
}

async function ensureCenterAccessPg(client: Client, userId: string, centerId: string): Promise<boolean> {
  // admin?
  const admin = await client.queryObject<{ id: string }>({
    text: `select id from public.imaging_centers where id = $1 and admin_id = $2 limit 1`,
    args: [centerId, userId],
  });
  if (admin.rows.length) return true;

  // staff?
  const staff = await client.queryObject<{ id: string }>({
    text: `select id
     from public.imaging_staff
     where imaging_center_id = $1 and user_id = $2 and status = 'active'
     limit 1`,
    args: [centerId, userId],
  });
  return staff.rows.length > 0;
}

async function readCenterPg(client: Client, centerId: string) {
  const r = await client.queryObject<{
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    website: string | null;
    modalities: string[] | null;
    accreditations: string[] | null;
    accepts_insurance: boolean | null;
  }>({
    text: `select id, name, phone, email, address, city, website, modalities, accreditations, accepts_insurance
     from public.imaging_centers
     where id = $1
     limit 1`,
    args: [centerId],
  });

  if (!r.rows.length) throw new Error("Imaging center not found");

  const c = r.rows[0];
  return {
    id: c.id,
    name: c.name ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
    address: c.address ?? null,
    city: c.city ?? null,
    website: c.website ?? null,
    modalities: Array.isArray(c.modalities) ? c.modalities : [],
    accreditations: Array.isArray(c.accreditations) ? c.accreditations : [],
    accepts_insurance: Boolean(c.accepts_insurance),
  };
}

async function readSettingsPg(client: Client, centerId: string) {
  const r = await client.queryObject<{
    imaging_center_id: string;
    timezone: string | null;
    billing_currency: string | null;
    notify_email: boolean | null;
    notify_sms: boolean | null;
    report_template: string | null;
    auto_accept_referrals: boolean | null;
    default_turnaround_hours: number | null;
  }>({
    text: `select imaging_center_id, timezone, billing_currency, notify_email, notify_sms, report_template,
            auto_accept_referrals, default_turnaround_hours
     from public.imaging_center_settings
     where imaging_center_id = $1
     limit 1`,
    args: [centerId],
  });

  if (!r.rows.length) {
    return {
      imaging_center_id: centerId,
      timezone: "UTC",
      billing_currency: "usd",
      notify_email: true,
      notify_sms: false,
      report_template: "",
      auto_accept_referrals: false,
      default_turnaround_hours: 24,
    };
  }

  const s = r.rows[0];
  return {
    imaging_center_id: centerId,
    timezone: asText(s.timezone, "UTC"),
    billing_currency: asText(s.billing_currency, "usd"),
    notify_email: asBool(s.notify_email, true),
    notify_sms: asBool(s.notify_sms, false),
    report_template: asText(s.report_template, ""),
    auto_accept_referrals: asBool(s.auto_accept_referrals, false),
    default_turnaround_hours: asInt(s.default_turnaround_hours, 24),
  };
}

async function saveCenterPg(client: Client, centerId: string, center: NonNullable<Extract<ReqBody, { action: "save" }>["center"]>) {
  await client.queryArray(
    `update public.imaging_centers
     set name = $2,
         phone = $3,
         email = $4,
         address = $5,
         city = $6,
         website = $7,
         modalities = $8,
         accreditations = $9,
         accepts_insurance = $10
     where id = $1`,
    [
      centerId,
      center.name ?? null,
      center.phone ?? null,
      center.email ?? null,
      center.address ?? null,
      center.city ?? null,
      center.website ?? null,
      Array.isArray(center.modalities) ? center.modalities : [],
      Array.isArray(center.accreditations) ? center.accreditations : [],
      Boolean(center.accepts_insurance),
    ],
  );
}

async function upsertSettingsPg(
  client: Client,
  centerId: string,
  userId: string,
  settings: NonNullable<Extract<ReqBody, { action: "save" }>["settings"]>,
) {
  await client.queryArray(
    `insert into public.imaging_center_settings (
        imaging_center_id, timezone, billing_currency, notify_email, notify_sms, report_template,
        auto_accept_referrals, default_turnaround_hours, created_at, updated_at
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
     on conflict (imaging_center_id) do update
     set timezone = excluded.timezone,
         billing_currency = excluded.billing_currency,
         notify_email = excluded.notify_email,
         notify_sms = excluded.notify_sms,
         report_template = excluded.report_template,
         auto_accept_referrals = excluded.auto_accept_referrals,
         default_turnaround_hours = excluded.default_turnaround_hours,
         updated_at = now()`,
    [
      centerId,
      asText(settings.timezone, "UTC"),
      asText(settings.billing_currency, "usd"),
      asBool(settings.notify_email, true),
      asBool(settings.notify_sms, false),
      settings.report_template ?? null,
      asBool(settings.auto_accept_referrals, false),
      asInt(settings.default_turnaround_hours, 24),
    ],
  );

  // best-effort: reload PostgREST cache so direct REST queries also start working
  await client.queryArray(`select pg_notify('pgrst', 'reload schema');`);
  void userId; // reserved for future auditing
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method Not Allowed" } satisfies RespBody, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, error: "Missing Authorization header" } satisfies RespBody, 401);

  const auth = await getAuthedUserId(authHeader);
  if (!auth.ok) return json({ ok: false, error: auth.error } satisfies RespBody, auth.error === "Unauthorized" ? 401 : 500);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" } satisfies RespBody, 400);
  }

  const centerId = asText((body as any)?.centerId, "").trim();
  if (!centerId) return json({ ok: false, error: "Missing centerId" } satisfies RespBody, 400);

  const dbUrl = requireDbUrl();
  if (!dbUrl) {
    return json(
      {
        ok: false,
        error: "Missing SUPABASE_DB_URL (or DATABASE_URL) function secret. Set it, then redeploy this function.",
      } satisfies RespBody,
      501,
    );
  }

  const client = new Client(dbUrl);
  const warnings: string[] = [];

  try {
    await client.connect();

    const allowed = await ensureCenterAccessPg(client, auth.userId, centerId);
    if (!allowed) return json({ ok: false, error: "Forbidden" } satisfies RespBody, 403);

    // If the table truly doesn't exist, return available=false (no more schema-cache guessing).
    const settingsTableOk = await tableExists(client, "imaging_center_settings");
    if (!settingsTableOk) {
      const center = await readCenterPg(client, centerId);
      return json(
        {
          ok: true,
          available: false,
          center,
          settings: {
            imaging_center_id: centerId,
            timezone: "UTC",
            billing_currency: "usd",
            notify_email: true,
            notify_sms: false,
            report_template: "",
            auto_accept_referrals: false,
            default_turnaround_hours: 24,
          },
          warnings: ["missing_table:imaging_center_settings"],
        } satisfies RespBody,
        200,
      );
    }

    if (body.action === "get") {
      const center = await readCenterPg(client, centerId);
      const settings = await readSettingsPg(client, centerId);
      return json(
        {
          ok: true,
          available: true,
          center,
          settings,
          ...(warnings.length ? { warnings } : {}),
        } satisfies RespBody,
        200,
      );
    }

    // save
    await saveCenterPg(client, centerId, body.center);
    await upsertSettingsPg(client, centerId, auth.userId, body.settings);

    const center = await readCenterPg(client, centerId);
    const settings = await readSettingsPg(client, centerId);

    return json(
      {
        ok: true,
        available: true,
        center,
        settings,
        ...(warnings.length ? { warnings } : {}),
      } satisfies RespBody,
      200,
    );
  } catch (e: any) {
    return json(
      {
        ok: false,
        error: String(e?.message ?? e),
        available: false,
      } satisfies RespBody,
      200,
    );
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
});
