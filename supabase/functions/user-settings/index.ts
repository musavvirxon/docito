// Path: supabase/functions/user-settings/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotificationSettings = {
  emailBookings: boolean;
  emailReminders: boolean;
  emailCancellations: boolean;
  smsBookings: boolean;
  smsReminders: boolean;
  smsCancellations: boolean;
  pushNotifications: boolean;
};

type PrivacySettings = {
  profileVisibility: boolean;
  shareAnalytics: boolean;
  marketingCommunications: boolean;
};

type AccountSettings = {
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
  address: string | null;
  timezone: string;
  language: string;
};

type ReqBody =
  | { action: "get" }
  | {
      action: "upsert";
      patch?: {
        notifications?: Partial<NotificationSettings>;
        privacy?: Partial<PrivacySettings>;
        account?: Partial<AccountSettings>;
      };
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
  if (!url || !anon) return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" };
  return { ok: true as const, url, anon };
}

const defaults = {
  notifications: {
    emailBookings: true,
    emailReminders: true,
    emailCancellations: true,
    smsBookings: false,
    smsReminders: true,
    smsCancellations: true,
    pushNotifications: true,
  } satisfies NotificationSettings,
  privacy: {
    profileVisibility: true,
    shareAnalytics: true,
    marketingCommunications: false,
  } satisfies PrivacySettings,
  account: {
    full_name: "",
    email: "",
    phone: null,
    date_of_birth: null,
    gender: null,
    address: null,
    timezone: "America/New_York",
    language: "en",
  } satisfies AccountSettings,
};

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function mergeObj<T extends Record<string, unknown>>(a: T, b: Record<string, unknown>): T {
  return { ...(a as any), ...(b as any) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const supabase = createClient(env.url, env.anon, { global: { headers: { Authorization: authHeader } } });

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);
  const userId = userRes.user.id;

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  if (!body?.action) return json({ ok: false, error: "Missing action" }, 400);

  try {
    const load = async () => {
      const [{ data: profile, error: pErr }, { data: us, error: uErr }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name,email,phone,date_of_birth,gender,address,timezone,language")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.from("user_settings").select("settings").eq("user_id", userId).maybeSingle(),
      ]);

      if (pErr) throw pErr;
      if (uErr) throw uErr;

      const settings = isObject(us?.settings) ? (us?.settings as Record<string, unknown>) : {};

      const notifRaw = isObject(settings.notifications) ? (settings.notifications as Record<string, unknown>) : {};
      const privRaw = isObject(settings.privacy) ? (settings.privacy as Record<string, unknown>) : {};

      const notifications = mergeObj({ ...defaults.notifications }, notifRaw) as unknown as NotificationSettings;
      const privacy = mergeObj({ ...defaults.privacy }, privRaw) as unknown as PrivacySettings;

      const account: AccountSettings = {
        ...defaults.account,
        full_name: String(profile?.full_name || defaults.account.full_name),
        email: String(profile?.email || defaults.account.email),
        phone: (profile?.phone as any) ?? defaults.account.phone,
        date_of_birth: (profile?.date_of_birth as any) ?? defaults.account.date_of_birth,
        gender: (profile?.gender as any) ?? defaults.account.gender,
        address: (profile?.address as any) ?? defaults.account.address,
        timezone: String(profile?.timezone || defaults.account.timezone),
        language: String(profile?.language || defaults.account.language),
      };

      return { notifications, privacy, account, rawSettings: settings };
    };

    if (body.action === "get") {
      const { notifications, privacy, account } = await load();
      return json({ ok: true, settings: { notifications, privacy }, account });
    }

    if (body.action === "upsert") {
      const patch = body.patch || {};
      const { notifications, privacy, account, rawSettings } = await load();

      const notifPatch = isObject(patch.notifications) ? (patch.notifications as Record<string, unknown>) : {};
      const privPatch = isObject(patch.privacy) ? (patch.privacy as Record<string, unknown>) : {};
      const acctPatch = isObject(patch.account) ? (patch.account as Record<string, unknown>) : {};

      const nextNotifications = mergeObj({ ...notifications }, notifPatch) as unknown as NotificationSettings;
      const nextPrivacy = mergeObj({ ...privacy }, privPatch) as unknown as PrivacySettings;

      const nextSettings: Record<string, unknown> = {
        ...(isObject(rawSettings) ? rawSettings : {}),
        notifications: nextNotifications,
        privacy: nextPrivacy,
      };

      // Update profiles (account) if any fields provided
      const allowedAcctKeys = new Set([
        "full_name",
        "email",
        "phone",
        "date_of_birth",
        "gender",
        "address",
        "timezone",
        "language",
      ]);

      const profileUpdate: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(acctPatch)) {
        if (allowedAcctKeys.has(k)) profileUpdate[k] = v;
      }

      if (Object.keys(profileUpdate).length > 0) {
        const { error: upErr } = await supabase.from("profiles").update(profileUpdate).eq("user_id", userId);
        if (upErr) throw upErr;
      }

      const { error: usErr } = await supabase
        .from("user_settings")
        .upsert({ user_id: userId, settings: nextSettings }, { onConflict: "user_id" });
      if (usErr) throw usErr;

      const refreshed = await load();
      return json({
        ok: true,
        settings: { notifications: refreshed.notifications, privacy: refreshed.privacy },
        account: refreshed.account,
      });
    }

    return json({ ok: false, error: "Invalid action" }, 400);
  } catch (e: any) {
    console.error("user-settings error:", e);
    return json({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
});
