// File: supabase/functions/me/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = { action: "get" };

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

function safeNameFromEmail(email: string | null | undefined) {
  const e = String(email || "").trim();
  if (!e) return "User";
  const left = e.split("@")[0] || "User";
  return left.replace(/[._-]+/g, " ").trim() || "User";
}

function mapProfileRole(metaRole: string | null | undefined): "patient" | "doctor" | "admin" | "staff" {
  const r = String(metaRole || "").trim();
  if (r === "doctor") return "doctor";
  if (r === "staff") return "staff";
  if (r === "admin" || r === "clinic_admin" || r === "pharmacy_admin" || r === "lab_admin" || r === "imaging_admin" || r === "super_admin") {
    return "admin";
  }
  return "patient";
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
  if (!body?.action) return json({ ok: false, error: "Missing action" }, 400);
  if (body.action !== "get") return json({ ok: false, error: "Unknown action" }, 400);

  const authed = createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userRes, error: userErr } = await authed.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  const u = userRes.user;
  const userId = u.id;
  const email = u.email ?? null;
  const meta = (u.user_metadata || {}) as Record<string, unknown>;

  const admin = createClient(env.url, env.service, {
    auth: { persistSession: false },
    global: { "X-Client-Info": "me" } as any,
  });

  const fullName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    safeNameFromEmail(email);

  const profileRole = mapProfileRole(typeof meta.role === "string" ? (meta.role as string) : undefined);

  const timezone =
    (typeof meta.timezone === "string" && meta.timezone.trim()) ||
    "UTC";

  const timezoneSource =
    (typeof meta.timezone_source === "string" && meta.timezone_source.trim()) ||
    "browser";

  try {
    const { data: existing, error: selErr } = await admin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (selErr) throw selErr;

    if (!existing) {
      // Try the "new schema" (timezone columns), then fall back if columns are missing.
      const attemptFull = await admin
        .from("profiles")
        .upsert(
          {
            user_id: userId,
            full_name: fullName,
            email: email,
            role: profileRole,
            timezone,
            timezone_source: timezoneSource,
            timezone_updated_at: new Date().toISOString(),
            timezone_detected_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id" },
        )
        .select("*")
        .single();

      if (attemptFull.error) {
        const attemptMinimal = await admin
          .from("profiles")
          .upsert(
            {
              user_id: userId,
              full_name: fullName,
              email: email,
              role: profileRole,
            } as any,
            { onConflict: "user_id" },
          )
          .select("*")
          .single();

        if (attemptMinimal.error) throw attemptMinimal.error;
      }
    }
  } catch (e: any) {
    console.error("me bootstrap error:", e);
    return json({ ok: false, error: e?.message || "Failed to bootstrap profile" }, 500);
  }

  const { data: profileRow, error: profErr } = await admin.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (profErr || !profileRow) return json({ ok: false, error: "Profile not found" }, 500);

  const { data: roleRows, error: roleErr } = await admin.from("user_roles").select("role").eq("user_id", userId);
  if (roleErr) {
    console.error("me roles error:", roleErr);
  }

  const roles = (Array.isArray(roleRows) ? roleRows : []).map((r: any) => r?.role).filter(Boolean);

  return json({
    ok: true,
    user: { id: userId, email },
    profile: profileRow,
    roles,
  });
});
