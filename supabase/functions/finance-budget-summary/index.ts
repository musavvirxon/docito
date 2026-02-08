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
  monthStart: string; // YYYY-MM-DD (expected: 1st of month)
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

function isDateYYYYMMDD(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function monthEndExclusive(monthStart: string): string | null {
  try {
    const d = new Date(`${monthStart}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const end = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
    const yy = end.getUTCFullYear();
    const mm = String(end.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(end.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  } catch {
    return null;
  }
}

async function assertAccess(userClient: any, entityType: FinanceEntityType, entityId: string) {
  const { data, error } = await userClient.rpc("can_access_entity", {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw error;
  return Boolean(data);
}

type CatRow = { id: string; name: string; kind: "income" | "expense" | "payroll" };

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
  const monthStart = String((body as any)?.monthStart || "").trim();

  if (!entityType) return json({ ok: false, error: "Invalid entityType" }, 400);
  if (!isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);
  if (!isDateYYYYMMDD(monthStart)) return json({ ok: false, error: "Invalid monthStart (expected YYYY-MM-DD)" }, 400);

  const monthEnd = monthEndExclusive(monthStart);
  if (!monthEnd) return json({ ok: false, error: "Invalid monthStart date" }, 400);

  const fromIso = `${monthStart}T00:00:00Z`;
  const toIso = `${monthEnd}T00:00:00Z`;

  try {
    const allowed = await assertAccess(userClient, entityType, entityId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    const serviceClient = createClient(env.url, env.service);

    const [{ data: cats, error: cErr }, { data: budgets, error: bErr }, { data: entries, error: eErr }] = await Promise.all([
      serviceClient
        .from("finance_categories")
        .select("id,name,kind")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .in("kind", ["expense", "payroll"])
        .limit(5000),
      serviceClient
        .from("finance_budgets")
        .select("id,category_id,budget_cents,currency,month_start")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("month_start", monthStart)
        .limit(5000),
      serviceClient
        .from("finance_entries")
        .select("category_id,entry_type,amount_cents,currency,occurred_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .gte("occurred_at", fromIso)
        .lt("occurred_at", toIso)
        .in("entry_type", ["expense", "payroll"])
        .limit(50000),
    ]);

    if (cErr) throw cErr;
    if (bErr) throw bErr;
    if (eErr) throw eErr;

    const catMap = new Map<string, CatRow>();
    (cats || []).forEach((c: any) => {
      if (!c?.id) return;
      const kind = String(c.kind || "") as "income" | "expense" | "payroll";
      catMap.set(String(c.id), { id: String(c.id), name: String(c.name || "Uncategorized"), kind: (kind as any) });
    });

    const budgetByCat = new Map<string, { budgetCents: number; currency: string }>();
    let currency = "USD";
    (budgets || []).forEach((b: any) => {
      const cid = String(b.category_id || "");
      if (!cid) return;
      const cents = Number(b.budget_cents || 0) || 0;
      const cur = String(b.currency || "USD").toUpperCase();
      currency = cur || currency;
      budgetByCat.set(cid, { budgetCents: cents, currency: cur });
    });

    const actualByCat = new Map<string, number>(); // category_id | 'null'
    let uncategorizedCents = 0;

    (entries || []).forEach((e: any) => {
      const cid = e.category_id ? String(e.category_id) : "null";
      const cents = Number(e.amount_cents || 0) || 0;
      const cur = String(e.currency || "USD").toUpperCase();
      currency = cur || currency;

      actualByCat.set(cid, (actualByCat.get(cid) || 0) + cents);
      if (cid === "null") uncategorizedCents += cents;
    });

    // Union of: all expense/payroll categories + any budget/actual rows
    const allCatIds = new Set<string>();
    for (const cid of catMap.keys()) allCatIds.add(cid);
    for (const cid of budgetByCat.keys()) allCatIds.add(cid);
    for (const cid of actualByCat.keys()) if (cid !== "null") allCatIds.add(cid);

    const rows = Array.from(allCatIds.values())
      .map((cid) => {
        const cat = catMap.get(cid) || { id: cid, name: "Uncategorized", kind: "expense" as const };
        const budget = budgetByCat.get(cid)?.budgetCents ?? 0;
        const actual = actualByCat.get(cid) ?? 0;
        const variance = budget - actual;

        return {
          categoryId: cid,
          name: cat.name,
          kind: cat.kind,
          budgetCents: budget,
          actualCents: actual,
          varianceCents: variance,
        };
      })
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));

    const totals = rows.reduce(
      (acc, r) => {
        acc.budgetCents += r.budgetCents;
        acc.actualCents += r.actualCents;
        acc.varianceCents += r.varianceCents;
        return acc;
      },
      { budgetCents: 0, actualCents: 0, varianceCents: 0 },
    );

    return json({
      ok: true,
      entityType,
      entityId,
      monthStart,
      monthEndExclusive: monthEnd,
      currency,
      totals: {
        ...totals,
        uncategorizedCents,
      },
      rows,
    });
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to compute budget summary" }, 500);
  }
});
