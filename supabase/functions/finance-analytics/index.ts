// File: supabase/functions/finance-analytics/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { secureHandler, jsonResponse, errorResponse } from "../_shared/security-middleware.ts";

type EntityType = "practice" | "lab" | "pharmacy" | "imaging_center";
type EntryType = "income" | "expense" | "payroll" | "transfer" | "adjustment";

type ReqBody = {
  entityType: EntityType;
  entityId: string;

  // ISO timestamps; if missing, defaults to last 30 days
  from?: string;
  to?: string;

  // group series by day only for now (keep simple)
  groupBy?: "day";
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

function parseIsoOrNull(v?: string) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toIso(d: Date) {
  return d.toISOString();
}

function isoDayKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clampDateRange(from: Date, to: Date) {
  // prevent absurd ranges; max 366 days
  const ms = to.getTime() - from.getTime();
  const max = 366 * 24 * 60 * 60 * 1000;
  if (ms <= 0) return null;
  if (ms > max) {
    const capped = new Date(from.getTime() + max);
    return { from, to: capped };
  }
  return { from, to };
}

serve(async (req) => {
  const secured = await secureHandler(req, "finance-analytics", {
    requireAuth: true,
    allowedMethods: ["POST", "OPTIONS"],
  });

  if (secured.response) return secured.response;
  if (!secured.context) return errorResponse("Security context missing", 500);

  // IMPORTANT: use a user-scoped client (RLS enforced) for analytics data reads
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

  const entityType = (body as any)?.entityType as EntityType | undefined;
  const entityId = safeText((body as any)?.entityId);

  if (!entityType) return errorResponse("Missing entityType", 400);
  if (!entityId || !isUuid(entityId)) return errorResponse("Invalid entityId", 400);

  const now = new Date();
  const fromDefault = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const fromD = parseIsoOrNull((body as any)?.from) ?? fromDefault;
  const toD = parseIsoOrNull((body as any)?.to) ?? now;

  const range = clampDateRange(fromD, toD);
  if (!range) return errorResponse("Invalid date range", 400);

  const fromIso = toIso(range.from);
  const toIsoStr = toIso(range.to);

  // Load entries
  const { data: entries, error: entriesErr } = await userClient
    .from("finance_entries")
    .select("entry_type,amount_cents,currency,occurred_at,category_id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .gte("occurred_at", fromIso)
    .lt("occurred_at", toIsoStr)
    .order("occurred_at", { ascending: true })
    .limit(50000);

  if (entriesErr) return errorResponse(entriesErr.message, 500);

  // Load categories (for names)
  const { data: cats, error: catsErr } = await userClient
    .from("finance_categories")
    .select("id,name,kind")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .limit(5000);

  if (catsErr) return errorResponse(catsErr.message, 500);

  const catName = new Map<string, string>();
  (cats || []).forEach((c: any) => {
    if (c?.id) catName.set(String(c.id), String(c.name || "Unnamed"));
  });

  const totalsByType: Record<EntryType, number> = {
    income: 0,
    expense: 0,
    payroll: 0,
    transfer: 0,
    adjustment: 0,
  };

  const totalsByCategory: Record<string, { categoryId: string | null; name: string; kind: string; totalCents: number }> =
    {};

  const seriesByDay: Record<
    string,
    { day: string; incomeCents: number; expenseCents: number; payrollCents: number; netCents: number }
  > = {};

  let currency = "USD";

  for (const r of entries || []) {
    const t = String((r as any).entry_type || "") as EntryType;
    const cents = Number((r as any).amount_cents || 0) || 0;
    const cur = String((r as any).currency || "") || currency;
    if (cur) currency = cur.toUpperCase();

    const occurredAt = new Date(String((r as any).occurred_at));
    const dayKey = Number.isNaN(occurredAt.getTime()) ? "unknown" : isoDayKey(occurredAt);

    if (t in totalsByType) totalsByType[t] += cents;

    const categoryId = (r as any).category_id ? String((r as any).category_id) : null;
    const catKey = categoryId ? categoryId : "uncategorized:" + t;
    const name = categoryId ? catName.get(categoryId) || "Unknown" : "Uncategorized";
    const kind = t;

    if (!totalsByCategory[catKey]) {
      totalsByCategory[catKey] = { categoryId, name, kind, totalCents: 0 };
    }
    totalsByCategory[catKey].totalCents += cents;

    if (!seriesByDay[dayKey]) {
      seriesByDay[dayKey] = { day: dayKey, incomeCents: 0, expenseCents: 0, payrollCents: 0, netCents: 0 };
    }
    if (t === "income") seriesByDay[dayKey].incomeCents += cents;
    if (t === "expense") seriesByDay[dayKey].expenseCents += cents;
    if (t === "payroll") seriesByDay[dayKey].payrollCents += cents;
  }

  const income = totalsByType.income || 0;
  const expense = totalsByType.expense || 0;
  const payroll = totalsByType.payroll || 0;
  const opCost = expense + payroll;
  const net = income - opCost;

  // finalize series net per day
  const series = Object.values(seriesByDay)
    .filter((x) => x.day !== "unknown")
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((d) => ({
      ...d,
      netCents: (d.incomeCents || 0) - ((d.expenseCents || 0) + (d.payrollCents || 0)),
    }));

  const topExpenseCategories = Object.values(totalsByCategory)
    .filter((c) => c.kind === "expense" || c.kind === "payroll")
    .sort((a, b) => (b.totalCents || 0) - (a.totalCents || 0))
    .slice(0, 8);

  const topIncomeCategories = Object.values(totalsByCategory)
    .filter((c) => c.kind === "income")
    .sort((a, b) => (b.totalCents || 0) - (a.totalCents || 0))
    .slice(0, 8);

  const payrollRatioBps = income > 0 ? Math.round((payroll / income) * 10000) : 0; // basis points
  const opCostRatioBps = income > 0 ? Math.round((opCost / income) * 10000) : 0;

  return jsonResponse({
    ok: true,
    entityType,
    entityId,
    range: { from: fromIso, to: toIsoStr },
    currency,
    totals: {
      incomeCents: income,
      expenseCents: expense,
      payrollCents: payroll,
      opCostCents: opCost,
      netCents: net,
      payrollRatioBps,
      opCostRatioBps,
    },
    totalsByType,
    topExpenseCategories,
    topIncomeCategories,
    series, // day grouped
  });
});
