// File: supabase/functions/finance-run-recurring/index.ts
// B37: Edge function to execute recurring finance rules
// - If x-cron-secret matches FINANCE_CRON_SECRET -> uses service role RPC (no user auth)
// - Else requires Authorization and calls authenticated RPC (checks can_access_entity)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReqBody = {
  entityType: "clinic" | "practice" | "lab" | "imaging" | "pharmacy";
  entityId: string;
  asOf?: string; // YYYY-MM-DD
  dryRun?: boolean;
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
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("FINANCE_CRON_SECRET") || "";
  if (!url || !anon || !service) {
    return {
      ok: false as const,
      error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
    };
  }
  return { ok: true as const, url, anon, service, cronSecret };
}

function isISODate(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const entityType = String(body?.entityType || "").trim() as ReqBody["entityType"];
  const entityId = String(body?.entityId || "").trim();
  const asOf = body?.asOf ? String(body.asOf).trim() : undefined;
  const dryRun = Boolean(body?.dryRun);

  if (!entityType) return json({ ok: false, error: "Missing entityType" }, 400);
  if (!entityId) return json({ ok: false, error: "Missing entityId" }, 400);
  if (asOf && !isISODate(asOf)) return json({ ok: false, error: "asOf must be YYYY-MM-DD" }, 400);

  const cronHeader = req.headers.get("x-cron-secret") || "";
  const isCron = Boolean(env.cronSecret && cronHeader && cronHeader === env.cronSecret);

  try {
    if (isCron) {
      // Trusted cron execution
      const serviceClient = createClient(env.url, env.service);
      const { data, error } = await serviceClient.rpc("finance_apply_recurring_rules_service", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_as_of: asOf ?? null,
        p_dry_run: dryRun,
        p_max_iterations: 120,
      });

      if (error) throw error;

      return json({ ok: true, mode: "cron", result: data });
    }

    // User execution (requires auth)
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

    const authed = createClient(env.url, env.anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userErr } = await authed.auth.getUser();
    if (userErr || !userRes?.user) return json({ ok: false, error: "Unauthorized" }, 401);

    const { data, error } = await authed.rpc("finance_apply_recurring_rules", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_as_of: asOf ?? null,
      p_dry_run: dryRun,
      p_max_iterations: 120,
    });

    if (error) throw error;

    return json({ ok: true, mode: "user", result: data });
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to run recurring rules" }, 500);
  }
});
