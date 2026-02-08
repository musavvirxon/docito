// File: supabase/functions/finance-analytics/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";
type EntryType = "income" | "expense" | "payroll" | "transfer" | "adjustment";

type ReqBody = {
  entityType: FinanceEntityType;
  entityId: string;
  from?: string;
  to?: string;
  groupBy?: "day";
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
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return {
      ok: false as const,
      error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
    };
  }
  return { ok: true as const, url, anon, service };
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function normalizeEntityType(v: string): FinanceEntityType | null {
  const t = String(v || "").toLowerCase().trim();
  if (t === "clinic" || t === "lab" || t === "imaging" || t === "pharmacy") return t as FinanceEntityType;
  return null;
}

function dayKeyUTC(iso: string) {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clampIsoOrNull(s?: string): string | null {
  if (!s) return null;
  const v = String(s).trim();
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function assertAccess(userClient: any, entityType: FinanceEntityType, entityId: string) {
  const { data, error } = await userClient.rpc("can_access_entity", {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw error;
  return Boolean(data);
}

type CatRow = { id: string; name: string; kind: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) return json({ ok: false, error: "Missing Authorization" }, 401);

  const env = requireEnv();
  if (!env.ok) return json({ ok: false, error: env.error }, 500);

  const userClient = createClient(env.url, env.anon, { global: { headers: { Authorization: authHeader } } });
  const { data: u, error: uErr } = await userClient.auth.getUser();
  if (uErr || !u?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const entityType = normalizeEntityType((body as any)?.entityType);
  const entityId = String((body as any)?.entityId || "").trim();
  const fromIso = clampIsoOrNull((body as any)?.from) || new Date(Date.now() - 30 * 86400000).toISOString();
  const toIso = clampIsoOrNull((body as any)?.to) || new Date().toISOString();

  if (!entityType) return json({ ok: false, error: "Invalid entityType" }, 400);
  if (!isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);

  try {
    const allowed = await assertAccess(userClient, entityType, entityId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    const serviceClient = createClient(env.url, env.service);

    const [{ data: cats, error: cErr }, { data: entries, error: eErr }] = await Promise.all([
      serviceClient
        .from("finance_categories")
        .select("id,name,kind")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .limit(5000),
      serviceClient
        .from("finance_entries")
        .select("id,occurred_at,entry_type,amount_cents,currency,category_id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .gte("occurred_at", fromIso)
        .lt("occurred_at", toIso)
        .limit(50000),
    ]);

    if (cErr) throw cErr;
    if (eErr) throw eErr;

    const catMap = new Map<string, CatRow>();
    (cats || []).forEach((c: any) => {
      if (c?.id) catMap.set(String(c.id), { id: String(c.id), name: String(c.name || "Uncategorized"), kind: String(c.kind || "") });
    });

    const rows = (entries || []) as Array<{
      occurred_at: string;
      entry_type: EntryType;
      amount_cents: number;
      currency: string;
      category_id: string | null;
    }>;

    const totalsByType: Record<EntryType, number> = {
      income: 0,
      expense: 0,
      payroll: 0,
      transfer: 0,
      adjustment: 0,
    };

    const seriesMap = new Map<string, { day: string; incomeCents: number; expenseCents: number; payrollCents: number; netCents: number }>();
    const expenseCatSum = new Map<string, number>(); // key: category_id or 'null'
    const incomeCatSum = new Map<string, number>();

    let currency = "USD";
    for (const r of rows) {
      const type = String(r.entry_type || "") as EntryType;
      const cents = Number(r.amount_cents || 0) || 0;
      const cur = String(r.currency || "USD").toUpperCase();
      if (cur) currency = cur;

      if (type in totalsByType) totalsByType[type] += cents;

      const dkey = dayKeyUTC(r.occurred_at);
      const existing = seriesMap.get(dkey) || { day: dkey, incomeCents: 0, expenseCents: 0, payrollCents: 0, netCents: 0 };

      if (type === "income") existing.incomeCents += cents;
      if (type === "expense") existing.expenseCents += cents;
      if (type === "payroll") existing.payrollCents += cents;

      existing.netCents = existing.incomeCents - existing.expenseCents - existing.payrollCents;
      seriesMap.set(dkey, existing);

      const catKey = r.category_id ? String(r.category_id) : "null";
      if (type === "income") {
        incomeCatSum.set(catKey, (incomeCatSum.get(catKey) || 0) + cents);
      }
      if (type === "expense" || type === "payroll") {
        expenseCatSum.set(catKey, (expenseCatSum.get(catKey) || 0) + cents);
      }
    }

    const incomeCents = totalsByType.income || 0;
    const expenseCents = totalsByType.expense || 0;
    const payrollCents = totalsByType.payroll || 0;
    const opCostCents = expenseCents + payrollCents;
    const netCents = incomeCents - opCostCents;

    const payrollRatioBps = incomeCents > 0 ? Math.round((payrollCents / incomeCents) * 10000) : 0;
    const opCostRatioBps = incomeCents > 0 ? Math.round((opCostCents / incomeCents) * 10000) : 0;

    const topExpenseCategories = Array.from(expenseCatSum.entries())
      .map(([categoryId, totalCents]) => {
        const cat = categoryId !== "null" ? catMap.get(categoryId) : null;
        return {
          categoryId: categoryId === "null" ? null : categoryId,
          name: cat?.name || "Uncategorized",
          kind: cat?.kind || "expense",
          totalCents,
        };
      })
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, 10);

    const topIncomeCategories = Array.from(incomeCatSum.entries())
      .map(([categoryId, totalCents]) => {
        const cat = categoryId !== "null" ? catMap.get(categoryId) : null;
        return {
          categoryId: categoryId === "null" ? null : categoryId,
          name: cat?.name || "Uncategorized",
          kind: cat?.kind || "income",
          totalCents,
        };
      })
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, 10);

    const series = Array.from(seriesMap.values()).sort((a, b) => a.day.localeCompare(b.day));

    return json({
      ok: true,
      entityType,
      entityId,
      range: { from: fromIso, to: toIso },
      currency,
      totals: {
        incomeCents,
        expenseCents,
        payrollCents,
        opCostCents,
        netCents,
        payrollRatioBps,
        opCostRatioBps,
      },
      totalsByType,
      topExpenseCategories,
      topIncomeCategories,
      series,
    });
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to compute analytics" }, 500);
  }
});
