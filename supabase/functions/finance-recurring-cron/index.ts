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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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

    const asOf = cleanDate(payload?.as_of) || todayIso();
    const maxEntities = Math.max(1, Math.min(Number(payload?.max_entities ?? 200), 1000));

    // Find due entities (distinct)
    const { data: dueRules, error: dueErr } = await supabase
      .from("finance_recurring_rules")
      .select("entity_type,entity_id,next_run_date")
      .eq("active", true)
      .lte("next_run_date", asOf)
      .order("next_run_date", { ascending: true })
      .limit(5000);

    if (dueErr) {
      return jsonResponse({ error: dueErr.message }, 400);
    }

    const seen = new Set<string>();
    const entities: Array<{ entity_type: string; entity_id: string }> = [];

    for (const row of dueRules || []) {
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
      run_log_id?: string;
    }> = [];

    for (const e of entities) {
      const startedAt = new Date().toISOString();

      // Insert per-entity run log
      const { data: runLog, error: runLogErr } = await supabase
        .from("finance_recurring_entity_runs")
        .insert({
          entity_type: e.entity_type,
          entity_id: e.entity_id,
          source: "edge_cron",
          as_of: asOf,
          started_at: startedAt,
        })
        .select("id")
        .single();

      const runLogId = runLogErr ? undefined : String((runLog as any)?.id || "");

      const { data, error } = await supabase.rpc("finance_recurring_generate_due", {
        p_entity_type: e.entity_type,
        p_entity_id: e.entity_id,
        p_as_of: asOf,
      });

      if (error) {
        // Update run log as error
        if (runLogId) {
          await supabase
            .from("finance_recurring_entity_runs")
            .update({
              finished_at: new Date().toISOString(),
              created_count: 0,
              skipped_count: 0,
              error_count: 1,
              notes: `RPC error: ${error.message}`,
            })
            .eq("id", runLogId);
        }

        perEntity.push({
          entity_type: e.entity_type,
          entity_id: e.entity_id,
          created: 0,
          skipped: 0,
          error: 1,
          total: 1,
          run_log_id: runLogId,
        });
        totalErrors += 1;
        continue;
      }

      const results = Array.isArray(data) ? data : [];
      const created = results.filter((r: any) => r.status === "created").length;
      const skipped = results.filter((r: any) => r.status === "skipped").length;
      const errored = results.filter((r: any) => r.status === "error").length;

      if (runLogId) {
        await supabase
          .from("finance_recurring_entity_runs")
          .update({
            finished_at: new Date().toISOString(),
            created_count: created,
            skipped_count: skipped,
            error_count: errored,
          })
          .eq("id", runLogId);
      }

      perEntity.push({
        entity_type: e.entity_type,
        entity_id: e.entity_id,
        created,
        skipped,
        error: errored,
        total: results.length,
        run_log_id: runLogId,
      });

      totalCreated += created;
      totalSkipped += skipped;
      totalErrors += errored;
    }

    return jsonResponse(
      {
        as_of: asOf,
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
