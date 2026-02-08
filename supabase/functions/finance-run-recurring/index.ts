// File: supabase/functions/finance-run-recurring/index.ts
// Step 31: Run due recurring templates -> create finance entries + link for idempotency
// - Deno + supabase-js v2 + CORS + Authorization
// - Uses "finance_event_links" with source_table='finance_recurring_templates' and source_id='{templateId}:{YYYY-MM-DD}'
//   so re-runs won't duplicate entries.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type ReqBody = {
  entityType: FinanceEntityType;
  entityId: string;

  // run all due up to "now" by default; or supply runAt (ISO)
  runAt?: string;

  // optional: limit count
  limit?: number;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function normalizeEntityType(v: unknown): FinanceEntityType | null {
  const t = String(v ?? "").toLowerCase().trim();
  if (t === "clinic" || t === "lab" || t === "imaging" || t === "pharmacy") return t as FinanceEntityType;
  return null;
}

function clampIsoOrNow(v: unknown): string {
  if (!v) return new Date().toISOString();
  const s = String(v).trim();
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function ymd(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function requireEnv() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" };
  return { ok: true as const, url, anon };
}

async function assertAccess(userClient: any, entityType: FinanceEntityType, entityId: string) {
  const { data, error } = await userClient.rpc("can_access_entity", {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw error;
  return Boolean(data);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const userClient = createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: u, error: uErr } = await userClient.auth.getUser();
  if (uErr || !u?.user) return json({ ok: false, error: "Unauthorized" }, 401);
  const uid = u.user.id;

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const entityType = normalizeEntityType((body as any)?.entityType);
  const entityId = String((body as any)?.entityId || "").trim();
  if (!entityType) return json({ ok: false, error: "Invalid entityType" }, 400);
  if (!isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);

  const runAtIso = clampIsoOrNow((body as any)?.runAt);
  const runAt = new Date(runAtIso);

  const limit = Math.max(1, Math.min(200, Number((body as any)?.limit ?? 50)));

  try {
    const allowed = await assertAccess(userClient, entityType, entityId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    // Fetch due templates
    const { data: templates, error: tErr } = await userClient
      .from("finance_recurring_templates")
      .select(
        "id, entity_type, entity_id, entry_type, amount_cents, currency, category_id, description, metadata, frequency, interval, byweekday, bymonthday, start_date, end_date, is_active, last_run_at, next_run_at",
      )
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("is_active", true)
      .lte("next_run_at", runAtIso)
      .order("next_run_at", { ascending: true })
      .limit(limit);

    if (tErr) throw tErr;

    const posted: Array<{ templateId: string; entryId: string; occurredAt: string; linkId: string | null }> = [];

    for (const t of templates || []) {
      const templateId = String((t as any).id);

      const occurredAtIso = (t as any).next_run_at ? new Date((t as any).next_run_at).toISOString() : runAtIso;
      const occurrenceKey = ymd(new Date(occurredAtIso));
      const sourceTable = "finance_recurring_templates";
      const sourceId = `${templateId}:${occurrenceKey}`;

      // Idempotency: if link exists, skip
      const { data: existingLink, error: linkSelErr } = await userClient
        .from("finance_event_links")
        .select("finance_entry_id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("source_table", sourceTable)
        .eq("source_id", sourceId)
        .limit(1);

      if (linkSelErr) throw linkSelErr;
      if (existingLink && existingLink.length > 0 && existingLink[0]?.finance_entry_id) {
        // Still advance schedule to avoid getting stuck
        const { data: nextRun, error: nextErr } = await userClient.rpc("finance_compute_next_run_at", {
          p_frequency: (t as any).frequency,
          p_interval: (t as any).interval,
          p_byweekday: (t as any).byweekday,
          p_bymonthday: (t as any).bymonthday,
          p_anchor_date: occurrenceKey,
        });
        if (!nextErr) {
          await userClient
            .from("finance_recurring_templates")
            .update({ last_run_at: occurredAtIso, next_run_at: nextRun })
            .eq("id", templateId);
        }
        continue;
      }

      // Post the finance entry (direct insert; RLS allows because user has access)
      const meta =
        (t as any).metadata && typeof (t as any).metadata === "object" && !Array.isArray((t as any).metadata)
          ? (t as any).metadata
          : {};

      const entryMeta = {
        ...meta,
        recurring: {
          template_id: templateId,
          occurrence_key: occurrenceKey,
          created_by: uid,
        },
      };

      const { data: entryRow, error: entryErr } = await userClient
        .from("finance_entries")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          occurred_at: occurredAtIso,
          entry_type: (t as any).entry_type,
          amount_cents: (t as any).amount_cents,
          currency: (t as any).currency || "USD",
          category_id: (t as any).category_id ?? null,
          description: (t as any).description ?? null,
          metadata: entryMeta,
          created_by: uid,
        })
        .select("id")
        .single();

      if (entryErr) throw entryErr;

      const entryId = String(entryRow?.id);

      const { data: linkId, error: linkErr } = await userClient.rpc("finance_link_entry", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_source_table: sourceTable,
        p_source_id: sourceId,
        p_finance_entry_id: entryId,
      });
      if (linkErr) throw linkErr;

      // Advance schedule
      const { data: nextRunAt, error: nextErr } = await userClient.rpc("finance_compute_next_run_at", {
        p_frequency: (t as any).frequency,
        p_interval: (t as any).interval,
        p_byweekday: (t as any).byweekday,
        p_bymonthday: (t as any).bymonthday,
        p_anchor_date: occurrenceKey,
      });

      if (nextErr) throw nextErr;

      const { error: updErr } = await userClient
        .from("finance_recurring_templates")
        .update({ last_run_at: occurredAtIso, next_run_at: nextRunAt })
        .eq("id", templateId);

      if (updErr) throw updErr;

      posted.push({ templateId, entryId, occurredAt: occurredAtIso, linkId: linkId ? String(linkId) : null });
    }

    return json({ ok: true, runAt: runAtIso, count: posted.length, posted });
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to run recurring templates" }, 500);
  }
});
