// File: supabase/functions/me/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

  const authHeader = (req.headers.get("authorization") || req.headers.get("Authorization") || "").trim();
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return json({ ok: false, error: "Missing Authorization" }, 401);
  }

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

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ ok: false, error: "Unauthorized" }, 401);
  const admin = createClient(env.url, env.service, {
    auth: { persistSession: false },
    global: { "X-Client-Info": "me" } as any,
  });

  // Validate JWT with service-role auth client (reliable in edge runtime)
  const { data: userRes, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userRes?.user) {
    console.warn("me auth rejected request", userErr?.message || "no user");
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const userId = userRes.user.id;
  const email = userRes.user.email ?? null;
  const meta = (userRes.user.user_metadata || {}) as Record<string, unknown>;

  const fullName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    safeNameFromEmail(email);

  const profileRole = mapProfileRole(typeof meta.role === "string" ? (meta.role as string) : undefined);

  const timezone =
    (typeof meta.timezone === "string" && meta.timezone.trim()) ||
    "UTC";

  try {
    const { data: existing, error: selErr } = await admin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (selErr) throw selErr;

    if (!existing) {
      const { error: insErr } = await admin
        .from("profiles")
        .upsert(
          {
            user_id: userId,
            full_name: fullName,
            email: email,
            role: profileRole,
            timezone,
          } as any,
          { onConflict: "user_id" },
        )
        .select("*")
        .single();

      if (insErr) throw insErr;
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
