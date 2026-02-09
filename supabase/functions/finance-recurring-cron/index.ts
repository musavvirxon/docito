// File: supabase/functions/finance-recurring-cron/index.ts
// B27: Cron-safe Edge Function to run recurring rules across ALL due entities
// - Deno + supabase-js v2 + CORS
// - Authorization: requires Authorization: Bearer <CRON_SECRET>
// - Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS and call finance_recurring_generate_due (now service_role-enabled)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  as_of?: string; // YYYY-MM-DD
  max_entities?: number; // safety cap
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getAuthHeader(req: Request) {
  return req.headers.get("authorization") || req.headers.get("Authorization") || "";
}

function parseBearer(tokenHeader: string) {
  const s = String(tokenHeader || "").trim();
  const m = /^bearer\s+(.+)$/i.exec(s);
  return m ? m[1].trim() : "";
}

function cleanDate(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    // Authorization: Bearer CRON_SECRET
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const authHeader = getAuthHeader(req);
    const bearer = parseBearer(authHeader);

    if (!cronSecret || bearer !== cronSecret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Server not configured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } },
    });

    const payload = (await req.json().catch(() => ({}))) as Payload;

    const asOf = cleanDate(payload?.as_of);
    const maxEntities = Math.max(1, Math.min(Number(payload?.max_entities ?? 200), 1000));

    // Find distinct entities with due rules
    const { data: dueEntities, error: entErr } = await supabase
      .from("finance_recurring_rules")
      .select("entity_type,entity_id,next_run_date,active")
      .eq("active", true)
      .lte("next_run_date", asOf || new Date().toISOString().slice(0, 10))
      .order("next_run_date", { ascending: true })
      .limit(5000);

    if (entErr) {
      return jsonResponse({ error: entErr.message }, 400);
    }

    const seen = new Set<string>();
    const entities: Array<{ entity_type: string; entity_id: string }> = [];
    for (const row of dueEntities || []) {
      const et = String((row as any).entity_type || "").toLowerCase();
      const eid = String((row as any).entity_id || "");
      if (!et || !eid) continue;
      const key = `${et}:${eid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entities.push({ entity_type: et, entity_id: eid });
      if (entities.length >= maxEntities) break;
    }

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    const perEntity: Array<{
      entity_type: string;
      entity_id: string;
      created: number;
      skipped: number;
      error: number;
      total: number;
    }> = [];

    for (const e of entities) {
      const { data, error } = await supabase.rpc("finance_recurring_generate_due", {
        p_entity_type: e.entity_type,
        p_entity_id: e.entity_id,
        p_as_of: asOf,
      });

      if (error) {
        perEntity.push({
          entity_type: e.entity_type,
          entity_id: e.entity_id,
          created: 0,
          skipped: 0,
          error: 1,
          total: 1,
        });
        totalErrors += 1;
        continue;
      }

      const results = Array.isArray(data) ? data : [];
      const created = results.filter((r: any) => r.status === "created").length;
      const skipped = results.filter((r: any) => r.status === "skipped").length;
      const errored = results.filter((r: any) => r.status === "error").length;

      perEntity.push({
        entity_type: e.entity_type,
        entity_id: e.entity_id,
        created,
        skipped,
        error: errored,
        total: results.length,
      });

      totalCreated += created;
      totalSkipped += skipped;
      totalErrors += errored;
    }

    return jsonResponse(
      {
        as_of: asOf || new Date().toISOString().slice(0, 10),
        entities_processed: entities.length,
        totals: {
          created: totalCreated,
          skipped: totalSkipped,
          error: totalErrors,
        },
        per_entity: perEntity,
      },
      200,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});
