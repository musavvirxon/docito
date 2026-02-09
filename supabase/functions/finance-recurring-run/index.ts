// File: supabase/functions/finance-recurring-run/index.ts
// B30: Manual runner now calls finance_recurring_generate_due_v2 and passes entity_run_id for drilldown linking.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  entity_type: "clinic" | "lab" | "imaging" | "pharmacy";
  entity_id: string;
  as_of?: string; // YYYY-MM-DD
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

    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return jsonResponse({ error: "Server not configured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const payload = (await req.json()) as Payload;

    const entityType = String(payload?.entity_type || "").toLowerCase();
    const entityId = String(payload?.entity_id || "");

    if (!entityType || !["clinic", "lab", "imaging", "pharmacy"].includes(entityType)) {
      return jsonResponse({ error: "Invalid entity_type" }, 400);
    }
    if (!entityId) {
      return jsonResponse({ error: "entity_id required" }, 400);
    }

    const asOf = cleanDate(payload?.as_of);

    // Create run log (best effort)
    const startedAt = new Date().toISOString();
    const { data: runLog } = await supabase
      .from("finance_recurring_entity_runs")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        source: "manual",
        as_of: asOf || new Date().toISOString().slice(0, 10),
        started_at: startedAt,
      })
      .select("id")
      .single();

    const runLogId = String((runLog as any)?.id || "");

    const { data, error } = await supabase.rpc("finance_recurring_generate_due_v2", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_as_of: asOf,
      p_entity_run_id: runLogId || null,
    });

    if (error) {
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
      return jsonResponse({ error: error.message }, 400);
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

    return jsonResponse(
      {
        results,
        run_log_id: runLogId || null,
      },
      200,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});
