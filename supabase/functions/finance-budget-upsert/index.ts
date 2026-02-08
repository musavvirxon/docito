// File: supabase/functions/finance-budget-upsert/index.ts
// B2: Upsert a budget period + budget lines (planned amounts) for an entity.
// - Creates missing expense categories by name (kind='expense').
// - Idempotent via unique constraints:
//    finance_budget_periods(entity_type, entity_id, period_start, period_end)
//    finance_budget_lines(budget_period_id, category_id)
// - Deno + supabase-js v2 + CORS + Authorization

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type BudgetLineInput = {
  categoryId?: string;
  categoryName?: string;
  plannedAmountCents: number;
  notes?: string;
  metadata?: Record<string, unknown>;
};

type ReqBody = {
  entityType: FinanceEntityType;
  entityId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  currency?: string;
  label?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  lines: BudgetLineInput[];
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

function isDateString(v: string) {
  // YYYY-MM-DD basic validation
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime());
}

function dateGte(a: string, b: string) {
  // a >= b
  return new Date(`${a}T00:00:00Z`).getTime() >= new Date(`${b}T00:00:00Z`).getTime();
}

function clampText(v: unknown, max: number) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function normalizeCurrency(v: unknown) {
  const s = String(v ?? "USD").trim().toUpperCase();
  if (!s) return "USD";
  return s.slice(0, 8);
}

function normName(v: string) {
  return v.trim().replace(/\s+/g, " ").toLowerCase();
}

async function assertAccess(userClient: any, entityType: FinanceEntityType, entityId: string) {
  const { data, error } = await userClient.rpc("can_access_entity", {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw error;
  return Boolean(data);
}

async function ensureExpenseCategoryId(args: {
  userClient: any;
  uid: string;
  entityType: FinanceEntityType;
  entityId: string;
  categoryId?: string | null;
  categoryName?: string | null;
}) {
  const { userClient, uid, entityType, entityId } = args;

  // If categoryId provided, validate it belongs to entity and is expense kind.
  if (args.categoryId) {
    const cid = String(args.categoryId).trim();
    if (!isUuid(cid)) throw new Error("Invalid categoryId");

    const { data, error } = await userClient
      .from("finance_categories")
      .select("id, kind, entity_type, entity_id")
      .eq("id", cid)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Category not found");
    if (String(data.entity_type) !== entityType || String(data.entity_id) !== entityId) {
      throw new Error("Category does not belong to this entity");
    }
    if (String(data.kind) !== "expense") {
      throw new Error("Budget lines require an expense category");
    }
    return cid;
  }

  const rawName = String(args.categoryName ?? "").trim().replace(/\s+/g, " ");
  if (!rawName) throw new Error("Each line must include categoryId or categoryName");
  const n = normName(rawName);

  // Prefer name_norm if present in your schema (earlier steps)
  const { data: found1, error: e1 } = await userClient
    .from("finance_categories")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("kind", "expense")
    .eq("name_norm", n)
    .limit(1);

  if (!e1 && found1 && found1.length > 0 && found1[0]?.id) return String(found1[0].id);

  // Fallback: ilike name
  const { data: found2, error: e2 } = await userClient
    .from("finance_categories")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("kind", "expense")
    .ilike("name", rawName)
    .limit(1);

  if (!e2 && found2 && found2.length > 0 && found2[0]?.id) return String(found2[0].id);

  const { data: inserted, error: insErr } = await userClient
    .from("finance_categories")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      kind: "expense",
      name: rawName,
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

  const entityType = normalizeEntityType((body as any)?.entityType);
  const entityId = String((body as any)?.entityId || "").trim();
  const periodStart = String((body as any)?.periodStart || "").trim();
  const periodEnd = String((body as any)?.periodEnd || "").trim();

  if (!entityType) return json({ ok: false, error: "Invalid entityType" }, 400);
  if (!isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);
  if (!isDateString(periodStart)) return json({ ok: false, error: "Invalid periodStart (YYYY-MM-DD)" }, 400);
  if (!isDateString(periodEnd)) return json({ ok: false, error: "Invalid periodEnd (YYYY-MM-DD)" }, 400);
  if (!dateGte(periodEnd, periodStart)) return json({ ok: false, error: "periodEnd must be >= periodStart" }, 400);

  const currency = normalizeCurrency((body as any)?.currency);
  const label = clampText((body as any)?.label, 120);
  const notes = clampText((body as any)?.notes, 1000);
  const metadata =
    (body as any)?.metadata && typeof (body as any).metadata === "object" && !Array.isArray((body as any).metadata)
      ? (body as any).metadata
      : {};

  const lines = Array.isArray((body as any)?.lines) ? ((body as any).lines as BudgetLineInput[]) : null;
  if (!lines || lines.length === 0) return json({ ok: false, error: "lines[] is required" }, 400);
  if (lines.length > 2000) return json({ ok: false, error: "Too many lines (max 2000)" }, 400);

  try {
    const allowed = await assertAccess(userClient, entityType, entityId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    // 1) Find or create budget period
    const { data: existingPeriod, error: pSelErr } = await userClient
      .from("finance_budget_periods")
      .select("id")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .limit(1)
      .maybeSingle();

    if (pSelErr) throw pSelErr;

    let periodId: string;
    let createdPeriod = false;

    if (existingPeriod?.id) {
      periodId = String(existingPeriod.id);

      // optional update: currency/label/notes/metadata
      const patch: any = {};
      if (currency) patch.currency = currency;
      if (label !== null) patch.label = label;
      if (notes !== null) patch.notes = notes;
      if (metadata && typeof metadata === "object") patch.metadata = metadata;

      if (Object.keys(patch).length > 0) {
        const { error: pUpErr } = await userClient.from("finance_budget_periods").update(patch).eq("id", periodId);
        if (pUpErr) throw pUpErr;
      }
    } else {
      const { data: inserted, error: pInsErr } = await userClient
        .from("finance_budget_periods")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          period_start: periodStart,
          period_end: periodEnd,
          currency,
          label,
          notes,
          metadata,
          created_by: uid,
        })
        .select("id")
        .single();

      if (pInsErr) {
        // If race condition created it, re-select (idempotent behavior)
        const { data: retry, error: retryErr } = await userClient
          .from("finance_budget_periods")
          .select("id")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .eq("period_start", periodStart)
          .eq("period_end", periodEnd)
          .limit(1)
          .maybeSingle();

        if (retryErr) throw retryErr;
        if (!retry?.id) throw pInsErr;
        periodId = String(retry.id);
      } else {
        periodId = String(inserted.id);
        createdPeriod = true;
      }
    }

    // 2) Resolve categories and build upsert payload for lines
    const upsertRows: any[] = [];

    for (const line of lines) {
      const planned = Number((line as any)?.plannedAmountCents);
      if (!Number.isFinite(planned) || planned < 0) {
        throw new Error("plannedAmountCents must be a non-negative number");
      }

      const categoryId = await ensureExpenseCategoryId({
        userClient,
        uid,
        entityType,
        entityId,
        categoryId: (line as any)?.categoryId ?? null,
        categoryName: (line as any)?.categoryName ?? null,
      });

      const lineNotes = clampText((line as any)?.notes, 500);
      const lineMeta =
        (line as any)?.metadata && typeof (line as any).metadata === "object" && !Array.isArray((line as any).metadata)
          ? (line as any).metadata
          : {};

      upsertRows.push({
        budget_period_id: periodId,
        entity_type: entityType,
        entity_id: entityId,
        category_id: categoryId,
        planned_amount_cents: Math.round(planned),
        notes: lineNotes,
        metadata: lineMeta,
        created_by: uid,
      });
    }

    // De-dup in case same category appears multiple times (last wins)
    const dedupMap = new Map<string, any>();
    for (const r of upsertRows) dedupMap.set(String(r.category_id), r);
    const deduped = Array.from(dedupMap.values());

    // 3) Upsert lines (idempotent)
    const { data: upserted, error: upErr } = await userClient
      .from("finance_budget_lines")
      .upsert(deduped, { onConflict: "budget_period_id,category_id" })
      .select("id,category_id,planned_amount_cents");

    if (upErr) throw upErr;

    return json({
      ok: true,
      entityType,
      entityId,
      periodId,
      createdPeriod,
      updatedLines: Array.isArray(upserted) ? upserted.length : deduped.length,
    });
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to upsert budget" }, 500);
  }
});
