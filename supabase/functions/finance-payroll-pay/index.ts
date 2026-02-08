// File: supabase/functions/finance-payroll-pay/index.ts
// Step 32: Mark payroll run as PAID -> create finance_entries row (entry_type='payroll') + link idempotently
// Deno + supabase-js v2 + CORS + Authorization

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type ReqBody = {
  runId: string;
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

function nameNorm(v: string) {
  return v.trim().replace(/\s+/g, " ").toLowerCase();
}

async function ensurePayrollCategoryId(args: {
  userClient: any;
  uid: string;
  entityType: FinanceEntityType;
  entityId: string;
  name: string;
}) {
  const { userClient, uid, entityType, entityId } = args;
  const name = args.name.trim().replace(/\s+/g, " ");
  const n = nameNorm(name);

  // Prefer name_norm if present (generated column created in earlier steps)
  const { data: found1, error: e1 } = await userClient
    .from("finance_categories")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("kind", "payroll")
    .eq("name_norm", n)
    .limit(1);

  if (!e1 && found1 && found1.length > 0 && found1[0]?.id) return String(found1[0].id);

  // Fallback
  const { data: found2, error: e2 } = await userClient
    .from("finance_categories")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("kind", "payroll")
    .ilike("name", name)
    .limit(1);

  if (!e2 && found2 && found2.length > 0 && found2[0]?.id) return String(found2[0].id);

  const { data: inserted, error: insErr } = await userClient
    .from("finance_categories")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      kind: "payroll",
      name,
      is_default: false,
      created_by: uid,
    })
    .select("id")
    .single();

  if (insErr) throw insErr;
  return String(inserted.id);
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

  const runId = String((body as any)?.runId || "").trim();
  if (!isUuid(runId)) return json({ ok: false, error: "Invalid runId" }, 400);

  try {
    // Load run
    const { data: run, error: runErr } = await userClient
      .from("finance_payroll_runs")
      .select("*")
      .eq("id", runId)
      .maybeSingle();

    if (runErr) throw runErr;
    if (!run) return json({ ok: false, error: "Payroll run not found" }, 404);

    const entityType = normalizeEntityType(run.entity_type);
    const entityId = String(run.entity_id || "").trim();

    if (!entityType) return json({ ok: false, error: "Invalid payroll run entity_type" }, 400);
    if (!isUuid(entityId)) return json({ ok: false, error: "Invalid payroll run entity_id" }, 400);

    const allowed = await assertAccess(userClient, entityType, entityId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    // If already paid and linked, return idempotently
    if (String(run.status || "").toLowerCase() === "paid" && run.finance_entry_id) {
      return json({
        ok: true,
        alreadyPaid: true,
        runId,
        financeEntryId: String(run.finance_entry_id),
      });
    }

    // Recompute totals from items (authoritative)
    const { data: totalsRows, error: totalsErr } = await userClient.rpc("finance_payroll_recompute_totals", {
      p_run_id: runId,
    });
    if (totalsErr) throw totalsErr;

    const totals = Array.isArray(totalsRows) ? totalsRows[0] : totalsRows;
    const totalGross = Math.max(0, Number(totals?.total_gross_cents ?? run.total_gross_cents ?? 0) || 0);
    const totalNet = Math.max(0, Number(totals?.total_net_cents ?? run.total_net_cents ?? 0) || 0);
    const totalDed = Math.max(0, Number(totals?.total_deductions_cents ?? run.total_deductions_cents ?? 0) || 0);

    if (totalGross <= 0 && totalNet <= 0) {
      return json({ ok: false, error: "Payroll run total is 0. Add payroll items first." }, 400);
    }

    // Link source idempotency: finance_event_links uses text source_id; reuse existing RPC from earlier steps
    const sourceTable = "finance_payroll_runs";
    const sourceId = runId;

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
      const linkedId = String(existingLink[0].finance_entry_id);

      await userClient
        .from("finance_payroll_runs")
        .update({
          status: "paid",
          paid_by: uid,
          paid_at: new Date().toISOString(),
          finance_entry_id: linkedId,
        })
        .eq("id", runId);

      return json({ ok: true, deduped: true, runId, financeEntryId: linkedId });
    }

    const currency = String(run.currency || "USD").toUpperCase();
    const payoutDate = run.payout_date ? String(run.payout_date) : new Date().toISOString().slice(0, 10);
    const occurredAt = new Date(`${payoutDate}T12:00:00.000Z`).toISOString();

    // Category: Salaries
    const categoryId = await ensurePayrollCategoryId({
      userClient,
      uid,
      entityType,
      entityId,
      name: "Salaries",
    });

    const entryMeta = {
      payroll_run_id: runId,
      period_start: run.period_start,
      period_end: run.period_end,
      payout_date: run.payout_date,
      totals: {
        gross_cents: totalGross,
        net_cents: totalNet,
        deductions_cents: totalDed,
      },
      notes: run.notes ?? null,
      ...((run.metadata && typeof run.metadata === "object" && !Array.isArray(run.metadata)) ? run.metadata : {}),
    };

    // Ledger amount convention: store gross as payroll expense; net/deductions in metadata.
    const { data: entryRow, error: entryErr } = await userClient
      .from("finance_entries")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        occurred_at: occurredAt,
        entry_type: "payroll",
        amount_cents: totalGross,
        currency,
        category_id: categoryId,
        description: `Payroll (${run.period_start} → ${run.period_end})`,
        metadata: entryMeta,
        created_by: uid,
      })
      .select("id")
      .single();

    if (entryErr) throw entryErr;

    const financeEntryId = String(entryRow?.id);

    // Link it (idempotent)
    const { data: linkId, error: linkErr } = await userClient.rpc("finance_link_entry", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_source_table: sourceTable,
      p_source_id: sourceId,
      p_finance_entry_id: financeEntryId,
    });
    if (linkErr) throw linkErr;

    // Mark paid
    const { error: updErr } = await userClient
      .from("finance_payroll_runs")
      .update({
        status: "paid",
        paid_by: uid,
        paid_at: new Date().toISOString(),
        finance_entry_id: financeEntryId,
      })
      .eq("id", runId);

    if (updErr) throw updErr;

    return json({
      ok: true,
      runId,
      financeEntryId,
      linkId: linkId ? String(linkId) : null,
    });
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to pay payroll run" }, 500);
  }
});
