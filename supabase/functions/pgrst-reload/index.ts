// File: supabase/functions/pgrst-reload/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function ensureAuthenticated(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false as const, error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" };
  }

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const auth = await ensureAuthenticated(authHeader);
  if (!auth.ok) return json({ error: auth.error }, auth.error === "Unauthorized" ? 401 : 500);

  // Prefer a dedicated DB URL secret (recommended):
  //   supabase secrets set SUPABASE_DB_URL="postgresql://..."
  // Fallback to DATABASE_URL if you already have it.
  const dbUrl = Deno.env.get("SUPABASE_DB_URL") || Deno.env.get("DATABASE_URL");
  if (!dbUrl) {
    return json(
      {
        ok: false,
        error:
          "Missing SUPABASE_DB_URL (or DATABASE_URL). Set it as a Supabase Function secret so this function can NOTIFY pgrst.",
      },
      501,
    );
  }

  const client = new Client(dbUrl);
  try {
    await client.connect();
    await client.queryArray(`NOTIFY pgrst, 'reload schema';`);
    return json({ ok: true, reloaded: true }, 200);
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message ?? e) }, 500);
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
});
