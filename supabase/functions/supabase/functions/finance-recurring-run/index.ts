// File: supabase/functions/finance-recurring-run/index.ts
// B7: Run recurring expenses (autopost due items) safely + idempotently.
// - Finds due recurring templates (is_active=true, autopost=true, next_run_at<=now())
// - Creates finance_entries (expense) for each due item
// - Links each created entry to a deterministic source key using finance_event_links (from earlier finance steps)
//   source.table='finance_recurring_expenses', source.id='<recurring_id>:<YYYY-MM-DD>'
// - Updates last_posted_at, recomputes next_run_at via DB trigger from B6
// - Deno + supabase-js v2 + CORS + Authorization
//
// Note: This expects you already have:
//   - public.finance_entries table
//   - public.finance_event_links table with unique(entity_type, entity_id, source_table, source_id)
//   - public.can_access_entity(entity_type, entity_id) rpc
// If your link table differs, update the insert/select parts accordingly.

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
  dryRun?: boolean;
  limit?: number; // max templates to process
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

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function normalizeEntityType(v: unknown): FinanceEntityType | null {
  const t = String(v ?? "").toLowerCase().trim();
  if (t === "clinic" || t === "lab" || t === "imaging" || t === "pharmacy") return t as FinanceEntityType;
  return null;
}

async function assertAccess(userClient: any, entityType: FinanceEntityType, entityId: string) {
  const { data, error } = await userClient.rpc("can_access_entity", {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw error;
  return Boolean(data);
}

function yyyymmddUTC(ts: string | Date) {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type RecurringRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  category_id: string;
  amount_cents: number;
  currency: string;
  description: string;
  frequency: string;
  weekday: number | null;
  day_of_month: number | null;
  month_of_year: number | null;
  autopost: boolean;
  is_active: boolean;
  last_posted_at: string | null;
  next_run_at: string;
};

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
  const dryRun = Boolean((body as any)?.dryRun);
  const limitRaw = Number((body as any)?.limit ?? 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.floor(limitRaw)), 500) : 100;

  if (!entityType) return json({ ok: false, error: "Invalid entityType" }, 400);
  if (!isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);

  try {
    const allowed = await assertAccess(userClient, entityType, entityId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    // 1) Fetch due recurring items
    const nowIso = new Date().toISOString();

    const { data: due, error: dueErr } = await userClient
      .from("finance_recurring_expenses")
      .select(
        "id,entity_type,entity_id,category_id,amount_cents,currency,description,frequency,weekday,day_of_month,month_of_year,autopost,is_active,last_posted_at,next_run_at",
      )
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("is_active", true)
      .eq("autopost", true)
      .lte("next_run_at", nowIso)
      .order("next_run_at", { ascending: true })
      .limit(limit);

    if (dueErr) throw dueErr;

    const rows = ((due || []) as any) as RecurringRow[];
    if (rows.length === 0) {
      return json({ ok: true, processed: 0, created: 0, skipped: 0, dryRun, details: [] });
    }

    const details: any[] = [];
    let created = 0;
    let skipped = 0;

    for (const r of rows) {
      const runKeyDate = yyyymmddUTC(r.next_run_at || nowIso);
      const sourceTable = "finance_recurring_expenses";
      const sourceId = `${r.id}:${runKeyDate}`;

      // 2) Idempotency: if we already created an entry for this recurring+date, skip
      const { data: existingLink, error: linkSelErr } = await userClient
        .from("finance_event_links")
        .select("id,finance_entry_id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("source_table", sourceTable)
        .eq("source_id", sourceId)
        .limit(1)
        .maybeSingle();

      if (linkSelErr) throw linkSelErr;

      if (existingLink?.id) {
        skipped++;
        details.push({
          recurringId: r.id,
          sourceId,
          status: "skipped_exists",
          financeEntryId: existingLink.finance_entry_id ?? null,
        });

        // Still advance schedule so it doesn't stay stuck (optional).
        if (!dryRun) {
          const { error: upErr } = await userClient
            .from("finance_recurring_expenses")
            .update({ last_posted_at: r.next_run_at })
            .eq("id", r.id);
          if (upErr) throw upErr;
        }

        continue;
      }

      if (dryRun) {
        details.push({
          recurringId: r.id,
          sourceId,
          status: "dry_run",
          wouldCreate: {
            entry_type: "expense",
            amount_cents: r.amount_cents,
            currency: r.currency,
            category_id: r.category_id,
            occurred_at: r.next_run_at,
            description: r.description,
          },
        });
        continue;
      }

      // 3) Create finance entry
      const occurredAt = r.next_run_at; // schedule determines occurred_at
      const { data: entry, error: entryErr } = await userClient
        .from("finance_entries")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          entry_type: "expense",
          amount_cents: Number(r.amount_cents || 0) || 0,
          currency: String(r.currency || "USD").toUpperCase(),
          occurred_at: occurredAt,
          category_id: r.category_id,
          description: r.description || "Recurring expense",
          metadata: {
            recurring_id: r.id,
            recurring_frequency: r.frequency,
            run_key_date: runKeyDate,
          },
          created_by: uid,
        })
        .select("id")
        .single();

      if (entryErr) throw entryErr;

      // 4) Insert link record (idempotent with unique index)
      const { error: linkInsErr } = await userClient.from("finance_event_links").insert({
        entity_type: entityType,
        entity_id: entityId,
        finance_entry_id: entry.id,
        source_table: sourceTable,
        source_id: sourceId,
        created_by: uid,
      });

      if (linkInsErr) {
        // If link insert failed due to unique violation, we should not duplicate.
        // Try to clean up entry only if link already exists now.
        const { data: retryLink, error: retryErr } = await userClient
          .from("finance_event_links")
          .select("id,finance_entry_id")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .eq("source_table", sourceTable)
          .eq("source_id", sourceId)
          .limit(1)
          .maybeSingle();

        if (retryErr) throw retryErr;

        if (retryLink?.id) {
          // Another run inserted link; keep system consistent. Optionally delete the just-created entry.
          await userClient.from("finance_entries").delete().eq("id", entry.id);
          skipped++;
          details.push({ recurringId: r.id, sourceId, status: "skipped_race", financeEntryId: retryLink.finance_entry_id ?? null });
        } else {
          throw linkInsErr;
        }
      } else {
        created++;
        details.push({ recurringId: r.id, sourceId, status: "created", financeEntryId: entry.id });
      }

      // 5) Advance schedule: set last_posted_at = occurredAt; trigger recomputes next_run_at
      const { error: advErr } = await userClient
        .from("finance_recurring_expenses")
        .update({ last_posted_at: occurredAt })
        .eq("id", r.id);

      if (advErr) throw advErr;
    }

    return json({
      ok: true,
      dryRun,
      processed: rows.length,
      created,
      skipped,
      details,
    });
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to run recurring expenses" }, 500);
  }
});
