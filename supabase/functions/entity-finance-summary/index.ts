// File: supabase/functions/entity-finance-summary/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { secureHandler, jsonResponse, errorResponse } from "../_shared/security-middleware.ts";

type EntityType = "practice" | "lab" | "pharmacy" | "imaging_center";

type ReqBody = {
  entityType: EntityType;
  entityId: string;
  startUtc?: string; // ISO
  endExclusiveUtc?: string; // ISO
  days?: number; // if provided, overrides start/end (default 30)
};

type DailyRow = {
  date: string; // YYYY-MM-DD (UTC)
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

type CategoryRow = {
  categoryId: string | null;
  name: string;
  kind: string;
  amountCents: number;
  count: number;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function addUtcDays(d: Date, days: number) {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function isoDay(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDailySkeleton(startDay: Date, days: number): DailyRow[] {
  const out: DailyRow[] = [];
  for (let i = 0; i < days; i++) {
    out.push({ date: isoDay(addUtcDays(startDay, i)), incomeCents: 0, expenseCents: 0, netCents: 0 });
  }
  return out;
}

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeEntryType(v: unknown) {
  const s = safeText(v).toLowerCase();
  // keep aligned with check constraint in migration
  if (s === "income" || s === "expense" || s === "transfer" || s === "adjustment" || s === "payroll") return s;
  return "adjustment";
}

function asBigintSafe(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

serve(async (req) => {
  const secured = await secureHandler(req, "entity-finance-summary", {
    requireAuth: true,
    allowedMethods: ["POST", "OPTIONS"],
  });

  if (secured.response) return secured.response;
  if (!secured.context) return errorResponse("Security context missing", 500);

  const { anonClient } = secured.context;

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const entityType = (body as any)?.entityType as EntityType | undefined;
  const entityId = safeText((body as any)?.entityId);

  if (!entityType) return errorResponse("Missing entityType", 400);
  if (!entityId || !isUuid(entityId)) return errorResponse("Invalid entityId", 400);

  const days = clampInt((body as any)?.days, 7, 365, 30);

  let startDay: Date;
  let endExclusive: Date;

  if ((body as any)?.days != null) {
    const today = startOfUtcDay(new Date());
    startDay = addUtcDays(today, -(days - 1));
    endExclusive = addUtcDays(today, 1);
  } else {
    const startUtc = safeText((body as any)?.startUtc);
    const endExclusiveUtc = safeText((body as any)?.endExclusiveUtc);

    if (!startUtc || !endExclusiveUtc) return errorResponse("Provide either days OR (startUtc and endExclusiveUtc)", 400);

    const s = new Date(startUtc);
    const e = new Date(endExclusiveUtc);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return errorResponse("Invalid date range", 400);
    if (e <= s) return errorResponse("endExclusiveUtc must be after startUtc", 400);

    startDay = startOfUtcDay(s);
    endExclusive = e;
  }

  const computedDays = Math.max(
    1,
    Math.min(365, Math.floor((endExclusive.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000)) + 1),
  );

  const dailyIndex: Record<string, number> = {};
  const daily = buildDailySkeleton(startDay, computedDays);
  daily.forEach((r, idx) => (dailyIndex[r.date] = idx));

  // Load categories for display names
  const { data: catRows, error: catErr } = await anonClient
    .from("finance_categories")
    .select("id, name, kind")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .limit(5000);

  if (catErr) return errorResponse(catErr.message, 400);

  const categoryMap = new Map<string, { name: string; kind: string }>();
  (catRows || []).forEach((c: any) => {
    categoryMap.set(String(c.id), { name: String(c.name), kind: String(c.kind) });
  });

  // Load ledger entries in range
  const { data: entryRows, error: entryErr } = await anonClient
    .from("finance_entries")
    .select("id, entry_type, category_id, amount_cents, occurred_at, currency")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .gte("occurred_at", startDay.toISOString())
    .lt("occurred_at", endExclusive.toISOString())
    .order("occurred_at", { ascending: true })
    .limit(50000);

  if (entryErr) return errorResponse(entryErr.message, 400);

  let currency = "USD";
  let incomeCents = 0;
  let expenseCents = 0;
  let entriesCount = 0;

  const byCategory: Map<string, { categoryId: string | null; amountCents: number; count: number }> = new Map();

  const expenseTypes = new Set(["expense", "payroll"]); // payroll treated as expense in analytics

  for (const r of (entryRows || []) as any[]) {
    entriesCount += 1;
    if (r?.currency) currency = String(r.currency).toUpperCase();

    const entryType = normalizeEntryType(r?.entry_type);
    const amount = asBigintSafe(r?.amount_cents);

    const dt = r?.occurred_at ? new Date(r.occurred_at) : null;
    if (!dt) continue;

    const dayKey = isoDay(startOfUtcDay(dt));
    const idx = dailyIndex[dayKey];
    if (idx === undefined) continue;

    if (entryType === "income") {
      daily[idx].incomeCents += amount;
      incomeCents += amount;
    } else if (expenseTypes.has(entryType)) {
      daily[idx].expenseCents += Math.abs(amount);
      expenseCents += Math.abs(amount);
    } else if (entryType === "adjustment") {
      // adjustments affect net: positive increases income, negative increases expense
      if (amount >= 0) {
        daily[idx].incomeCents += amount;
        incomeCents += amount;
      } else {
        daily[idx].expenseCents += Math.abs(amount);
        expenseCents += Math.abs(amount);
      }
    } else {
      // transfers are not counted in P&L by default
    }

    const catId: string | null = r?.category_id ? String(r.category_id) : null;
    const catKey = catId ?? "uncategorized";

    const agg = byCategory.get(catKey) || { categoryId: catId, amountCents: 0, count: 0 };

    // For category breakdown, include only P&L relevant entry types
    if (entryType === "income") {
      agg.amountCents += amount;
      agg.count += 1;
    } else if (expenseTypes.has(entryType)) {
      agg.amountCents += Math.abs(amount);
      agg.count += 1;
    } else if (entryType === "adjustment") {
      agg.amountCents += Math.abs(amount);
      agg.count += 1;
    }

    byCategory.set(catKey, agg);
  }

  for (const d of daily) {
    d.netCents = d.incomeCents - d.expenseCents;
  }

  const netCents = incomeCents - expenseCents;

  const categories: CategoryRow[] = Array.from(byCategory.entries()).map(([key, agg]) => {
    if (key === "uncategorized") {
      return {
        categoryId: null,
        name: "Uncategorized",
        kind: "mixed",
        amountCents: agg.amountCents,
        count: agg.count,
      };
    }
    const meta = categoryMap.get(String(agg.categoryId)) || { name: "Unknown", kind: "mixed" };
    return {
      categoryId: agg.categoryId,
      name: meta.name,
      kind: meta.kind,
      amountCents: agg.amountCents,
      count: agg.count,
    };
  });

  categories.sort((a, b) => b.amountCents - a.amountCents);

  const topExpenseCategories = categories.filter((c) => c.kind === "expense" || c.kind === "payroll").slice(0, 8);
  const topIncomeCategories = categories.filter((c) => c.kind === "income").slice(0, 8);

  return jsonResponse({
    ok: true,
    entityType,
    entityId,
    currency,
    window: {
      startUtc: startDay.toISOString(),
      endExclusiveUtc: endExclusive.toISOString(),
      days: computedDays,
    },
    totals: {
      entriesCount,
      incomeCents,
      expenseCents,
      netCents,
    },
    daily,
    breakdown: {
      topIncomeCategories,
      topExpenseCategories,
    },
  });
});
