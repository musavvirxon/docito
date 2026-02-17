import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestBody =
  | { action: "list"; q?: string; limit?: number }
  | { action: "upsert"; country_code: string; timezone: string }
  | { action: "bulk_upsert"; items: Array<{ country_code: string; timezone: string }> };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function requireEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function isSuperAdmin(service: any, userId: string) {
  const { data, error } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();

  if (error) return false;
  return !!data;
}

function normalizeCountryCode(code: string) {
  return code.trim().toUpperCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    // Verify user via anon client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    // Service role for privileged operations
    const service = createClient(supabaseUrl, serviceKey);

    const ok = await isSuperAdmin(service, user.id);
    if (!ok) return json({ error: "Forbidden: super_admin required" }, 403);

    const body = (await req.json()) as RequestBody;

    if ((body as any).action === "list") {
      const q = String((body as any).q ?? "").trim().toUpperCase();
      const limit = Math.min(Math.max(Number((body as any).limit ?? 200), 1), 1000);

      let query = service
        .from("country_default_timezones")
        .select("country_code, timezone, updated_at, created_at")
        .order("country_code", { ascending: true })
        .limit(limit);

      if (q) {
        // exact match or prefix match on country_code
        query = query.or(`country_code.eq.${q},country_code.like.${q}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return json({ ok: true, items: data ?? [] });
    }

    if ((body as any).action === "upsert") {
      const code = normalizeCountryCode((body as any).country_code ?? "");
      const timezone = String((body as any).timezone ?? "").trim();

      if (!/^[A-Z]{2}$/.test(code)) return json({ error: "Invalid country_code (ISO alpha2)" }, 400);
      if (!timezone) return json({ error: "Missing timezone" }, 400);

      const { data, error } = await service.rpc("docito_upsert_country_default_timezone", {
        p_country_code: code,
        p_timezone: timezone,
      });

      if (error) throw error;
      return json({ ok: true, item: data });
    }

    if ((body as any).action === "bulk_upsert") {
      const items = (body as any).items as Array<{ country_code: string; timezone: string }> | undefined;
      if (!Array.isArray(items) || items.length === 0) return json({ error: "Missing items[]" }, 400);
      if (items.length > 500) return json({ error: "Too many items (max 500)" }, 400);

      const results: Array<{ country_code: string; ok: boolean; error?: string }> = [];

      for (const it of items) {
        const code = normalizeCountryCode(it?.country_code ?? "");
        const tz = String(it?.timezone ?? "").trim();

        if (!/^[A-Z]{2}$/.test(code) || !tz) {
          results.push({ country_code: code || "(invalid)", ok: false, error: "Invalid country_code or timezone" });
          continue;
        }

        const { error } = await service.rpc("docito_upsert_country_default_timezone", {
          p_country_code: code,
          p_timezone: tz,
        });

        if (error) {
          results.push({ country_code: code, ok: false, error: error.message });
        } else {
          results.push({ country_code: code, ok: true });
        }
      }

      return json({ ok: true, results });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
