// File: supabase/functions/finance-budget-summary/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { secureHandler, jsonResponse, errorResponse } from "../_shared/security-middleware.ts";

type EntityType = "clinic" | "lab" | "imaging" | "pharmacy" | "practice" | "imaging_center" | "laboratory";

type ReqBody = {
  entityType: EntityType;
  entityId: string;
  monthStart: string; // YYYY-MM-DD (must be first of month)
  currency?: string;
};

type CategoryRow = {
  id: string;
  name: string;
  kind: string;
  is_active: boolean;
};

type BudgetRow = {
  category_id: string;
  amount_cents: number;
  currency: string;
};

type EntryRow = {
  category_id: string | null;
  entry_type: string;
  amount_cents: number;
  currency: string;
  occurred_at: string;
};

function normalizeEntityType(v: string): "clinic" | "lab" | "imaging" | "pharmacy" {
  const s = String(v || "").trim().toLowerCase();
  if (s === "practice" || s === "clinic") return "clinic";
  if (s === "laboratory" || s === "lab") return "lab";
  if (s === "imaging_center" || s === "imaging") return "imaging";
  if (s === "pharmacy") return "pharmacy";
  return "clinic";
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

function isIsoDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function parseDateOnly(v: string): Date | null {
  if (!isIsoDate(v)) return null;
  const [y, m, d] = v.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toIso(d: Date) {
  return d.toISOString();
}

function firstOfMonthCheck(d: Date) {
  return d.getUTCDate() === 1;
}

function addMonths(d: Date, months: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, 0, 0, 0, 0));
}

function keyOf(kind: string, name: string) {
  return `${String(kind).toLowerCase()}::${String(name).trim().toLowerCase()}`;
}

serve(async (req) => {
  const secured = await secureHandler(req, "finance-budget-summary", {
    requireAuth: true,
    allowedMethods: ["POST", "OPTIONS"],
  });

  if (secured.response) return secured.response;
  if (!secured.context) return errorResponse("Security context missing", 500);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const entityTypeRaw = (body as any)?.entityType as EntityType | undefined;
  const entityId = safeText((body as any)?.entityId);
  const monthStart = safeText((body as any)?.monthStart);
  const currencyReq = safeText((body as any)?.currency);

  if (!entityTypeRaw) return errorResponse("Missing entityType", 400);
  if (!entityId || !isUuid(entityId)) return errorResponse("Invalid entityId", 400);

  const ms = parseDateOnly(monthStart);
  if (!ms) return errorResponse("Invalid monthStart (YYYY-MM-DD)", 400);
  if (!firstOfMonthCheck(ms)) return errorResponse("monthStart must be the first day of the month", 400);

  const entityType = normalizeEntityType(entityTypeRaw);
  const next = addMonths(ms, 1);

  const { data: cats, error: catsErr } = await userClient
    .from("finance_categories")
    .select("id,name,kind,is_active")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("is_active", true)
    .in("kind", ["expense", "payroll"])
    .order("kind", { ascending: true })
    .order("name", { ascending: true })
    .limit(5000);

  if (catsErr) return errorResponse(catsErr.message, 500);

  const categories = ((cats || []) as any) as CategoryRow[];

  const { data: buds, error: budsErr } = await userClient
    .from("finance_budgets")
    .select("category_id,amount_cents,currency")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("month_start", monthStart)
    .limit(5000);

  if (budsErr) return errorResponse(budsErr.message, 500);

  const budgets = ((buds || []) as any) as BudgetRow[];
  const budgetByCat = new Map<string, BudgetRow>();
  budgets.forEach((b) => budgetByCat.set(String(b.category_id), b));

  const { data: entries, error: entErr } = await userClient
    .from("finance_entries")
    .select("category_id,entry_type,amount_cents,currency,occurred_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .in("entry_type", ["expense", "payroll"])
    .gte("occurred_at", toIso(ms))
    .lt("occurred_at", toIso(next))
    .limit(50000);

  if (entErr) return errorResponse(entErr.message, 500);

  const entryRows = ((entries || []) as any) as EntryRow[];

  const actualByCat = new Map<string, number>();
  let uncategorizedCents = 0;
  let currency = (currencyReq || "USD").toUpperCase();

  for (const r of entryRows) {
    const cents = Number((r as any).amount_cents || 0) || 0;
    const cur = String((r as any).currency || "") || currency;
    if (cur) currency = cur.toUpperCase();

    const catId = (r as any).category_id ? String((r as any).category_id) : null;
    if (!catId) {
      uncategorizedCents += cents;
      continue;
    }
    actualByCat.set(catId, (actualByCat.get(catId) || 0) + cents);
  }

  const seen = new Set<string>();
  const normalizedCats = categories.filter((c) => {
    const k = keyOf(c.kind, c.name);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const rows = normalizedCats.map((c) => {
    const b = budgetByCat.get(c.id);
    const budgetCents = Number(b?.amount_cents || 0) || 0;
    const actualCents = Number(actualByCat.get(c.id) || 0) || 0;
    const varianceCents = budgetCents - actualCents;

    return {
      categoryId: c.id,
      name: c.name,
      kind: c.kind,
      budgetCents,
      actualCents,
      varianceCents,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.budgetCents += Number(r.budgetCents || 0) || 0;
      acc.actualCents += Number(r.actualCents || 0) || 0;
      return acc;
    },
    { budgetCents: 0, actualCents: 0 },
  );

  return jsonResponse({
    ok: true,
    entityType,
    entityId,
    monthStart,
    monthEndExclusive: toIso(next),
    currency,
    totals: {
      budgetCents: totals.budgetCents,
      actualCents: totals.actualCents,
      varianceCents: totals.budgetCents - totals.actualCents,
      uncategorizedCents,
    },
    rows,
  });
});
