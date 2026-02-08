// File: supabase/functions/finance-post-entry/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";
type EntryType = "income" | "expense" | "payroll" | "transfer" | "adjustment";
type CategoryKind = "income" | "expense" | "payroll";

type ReqBody = {
  entityType: FinanceEntityType;
  entityId: string;

  entryType: EntryType;

  // amount can be provided as cents (preferred) or as major units (e.g. 100.50)
  amountCents?: number;
  amount?: number | string;

  currency?: string; // default USD
  occurredAt?: string; // ISO timestamp, default now
  description?: string;

  // category selection: provide one of:
  categoryId?: string | null;
  categoryName?: string; // used with derived categoryKind (from entryType) unless overridden
  categoryKind?: CategoryKind;

  // optional source link to prevent duplicates and allow traceability
  source?: {
    table: string;
    id: string | number;
  };

  // extra info (direction for adjustments/transfers, payment method, vendor, etc)
  metadata?: Record<string, unknown>;
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
  if (!url || !anon) {
    return { ok: false as const, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" };
  }
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

function normalizeEntryType(v: unknown): EntryType | null {
  const t = String(v ?? "").toLowerCase().trim();
  if (t === "income" || t === "expense" || t === "payroll" || t === "transfer" || t === "adjustment") return t as EntryType;
  return null;
}

function normalizeCategoryKind(v: unknown): CategoryKind | null {
  const t = String(v ?? "").toLowerCase().trim();
  if (t === "income" || t === "expense" || t === "payroll") return t as CategoryKind;
  return null;
}

function clampIsoOrNow(v: unknown): string {
  if (!v) return new Date().toISOString();
  const s = String(v).trim();
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function normalizeCurrency(v: unknown): string {
  const s = String(v ?? "USD").trim().toUpperCase();
  return s || "USD";
}

function normName(v: string) {
  return v.trim().replace(/\s+/g, " ");
}

function nameNorm(v: string) {
  return normName(v).toLowerCase();
}

function parseAmountCents(body: ReqBody): number | null {
  if (typeof body.amountCents === "number" && Number.isFinite(body.amountCents)) {
    const n = Math.round(body.amountCents);
    if (n < 0) return null;
    return n;
  }

  if (body.amount === undefined || body.amount === null) return null;

  const raw = typeof body.amount === "string" ? body.amount.trim().replace(/,/g, ".") : body.amount;
  const n = typeof raw === "string" ? Number(raw) : Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;

  return Math.round(n * 100);
}

async function assertAccess(userClient: any, entityType: FinanceEntityType, entityId: string) {
  const { data, error } = await userClient.rpc("can_access_entity", {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw error;
  return Boolean(data);
}

function deriveCategoryKind(entryType: EntryType): CategoryKind {
  if (entryType === "income") return "income";
  if (entryType === "payroll") return "payroll";
  // treat expense/transfer/adjustment as expense-like buckets by default unless overridden
  return "expense";
}

async function resolveOrCreateCategoryId(args: {
  userClient: any;
  uid: string;
  entityType: FinanceEntityType;
  entityId: string;
  entryType: EntryType;
  categoryId?: string | null;
  categoryName?: string;
  categoryKind?: CategoryKind;
}): Promise<string | null> {
  const { userClient, uid, entityType, entityId, entryType } = args;

  if (args.categoryId === null) return null;
  if (args.categoryId && isUuid(args.categoryId)) return args.categoryId;

  const rawName = args.categoryName ? normName(args.categoryName) : "";
  if (!rawName) return null;

  const kind = args.categoryKind || deriveCategoryKind(entryType);
  const norm = nameNorm(rawName);

  // first try to find existing category by name_norm (generated column)
  const { data: existing, error: selErr } = await userClient
    .from("finance_categories")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("kind", kind)
    .eq("name_norm", norm)
    .limit(1);

  if (selErr) throw selErr;
  if (existing && existing.length > 0 && existing[0]?.id) return String(existing[0].id);

  // create category
  const { data: inserted, error: insErr } = await userClient
    .from("finance_categories")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      kind,
      name: rawName,
      is_default: false,
      created_by: uid,
    })
    .select("id")
    .single();

  if (insErr) throw insErr;
  return inserted?.id ? String(inserted.id) : null;
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
  const entryType = normalizeEntryType((body as any)?.entryType);

  if (!entityType) return json({ ok: false, error: "Invalid entityType" }, 400);
  if (!isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);
  if (!entryType) return json({ ok: false, error: "Invalid entryType" }, 400);

  const amountCents = parseAmountCents(body);
  if (amountCents === null) return json({ ok: false, error: "Invalid amount / amountCents (must be >= 0)" }, 400);

  const currency = normalizeCurrency((body as any)?.currency);
  const occurredAt = clampIsoOrNow((body as any)?.occurredAt);
  const description = typeof body.description === "string" ? body.description.trim() : null;

  const categoryKind = body.categoryKind ? normalizeCategoryKind(body.categoryKind) : null;
  if (body.categoryKind && !categoryKind) return json({ ok: false, error: "Invalid categoryKind" }, 400);

  const categoryIdRaw =
    typeof body.categoryId === "string" ? body.categoryId.trim() : body.categoryId === null ? null : undefined;

  const categoryName = typeof body.categoryName === "string" ? body.categoryName.trim() : undefined;

  const sourceTable = body.source?.table ? String(body.source.table).trim() : "";
  const sourceId = body.source?.id !== undefined && body.source?.id !== null ? String(body.source.id).trim() : "";

  const metadata = (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata))
    ? body.metadata
    : {};

  try {
    const allowed = await assertAccess(userClient, entityType, entityId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    // optional: if a source link exists already, return existing entry id (idempotency)
    if (sourceTable && sourceId) {
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
        return json({
          ok: true,
          deduped: true,
          entryId: String(existingLink[0].finance_entry_id),
          link: { table: sourceTable, id: sourceId },
        });
      }
    }

    const categoryId = await resolveOrCreateCategoryId({
      userClient,
      uid,
      entityType,
      entityId,
      entryType,
      categoryId: categoryIdRaw,
      categoryName,
      categoryKind: categoryKind || undefined,
    });

    const entryInsert = await userClient
      .from("finance_entries")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        occurred_at: occurredAt,
        entry_type: entryType,
        amount_cents: amountCents,
        currency,
        category_id: categoryId,
        description: description || null,
        metadata,
        created_by: uid,
      })
      .select("id")
      .single();

    if (entryInsert.error) throw entryInsert.error;

    const entryId = String(entryInsert.data?.id);

    let linkId: string | null = null;
    if (sourceTable && sourceId) {
      const { data: rpcData, error: rpcErr } = await userClient.rpc("finance_link_entry", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_source_table: sourceTable,
        p_source_id: sourceId,
        p_finance_entry_id: entryId,
      });

      if (rpcErr) throw rpcErr;
      if (rpcData) linkId = String(rpcData);
    }

    return json({
      ok: true,
      entryId,
      linkId,
      categoryId,
    });
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to post finance entry" }, 500);
  }
});
