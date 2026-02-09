// File: supabase/functions/inventory-purchase-create/index.ts
// B10: Edge Function to create a supplies purchase + post finance expense (transactional via RPC)
// - Deno + supabase-js v2 + CORS + Authorization
// - Validates payload + access (RPC enforces can_access_entity)
// - Ensures expense category exists (defaults to "Supplies") when not provided

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type PurchaseItemInput = {
  itemId: string;
  qty: number; // numeric, > 0
  unitCostCents: number; // >=0
  notes?: string;
};

type ReqBody = {
  entityType: FinanceEntityType;
  entityId: string;

  idempotencyKey: string; // REQUIRED: unique per purchase attempt (e.g. uuid, ULID)

  purchasedAt?: string; // ISO
  currency?: string;

  vendorName?: string;
  vendorPhone?: string;
  vendorEmail?: string;

  notes?: string;

  // Finance expense category (optional). If not provided, will ensure expense category "Supplies".
  expenseCategoryId?: string;
  expenseCategoryName?: string;

  items: PurchaseItemInput[];
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

async function ensureExpenseCategoryId(args: {
  userClient: any;
  uid: string;
  entityType: FinanceEntityType;
  entityId: string;
  categoryId?: string | null;
  categoryName?: string | null;
}) {
  const { userClient, uid, entityType, entityId } = args;

  if (args.categoryId) {
    const cid = String(args.categoryId).trim();
    if (!isUuid(cid)) throw new Error("Invalid expenseCategoryId");

    const { data, error } = await userClient
      .from("finance_categories")
      .select("id, kind, entity_type, entity_id")
      .eq("id", cid)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Expense category not found");
    if (String(data.entity_type) !== entityType || String(data.entity_id) !== entityId) {
      throw new Error("Expense category does not belong to this entity");
    }
    if (String(data.kind) !== "expense") throw new Error("Category must be expense kind");
    return cid;
  }

  const rawName = String(args.categoryName ?? "Supplies").trim().replace(/\s+/g, " ");
  const n = normName(rawName);

  // Prefer name_norm if present
  const { data: found1, error: e1 } = await userClient
    .from("finance_categories")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("kind", "expense")
    .eq("name_norm", n)
    .limit(1);

  if (!e1 && found1 && found1.length > 0 && found1[0]?.id) return String(found1[0].id);

  // Fallback name match
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
  const idempotencyKey = String((body as any)?.idempotencyKey || "").trim();

  if (!entityType) return json({ ok: false, error: "Invalid entityType" }, 400);
  if (!isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);
  if (!idempotencyKey) return json({ ok: false, error: "idempotencyKey is required" }, 400);
  if (idempotencyKey.length > 120) return json({ ok: false, error: "idempotencyKey too long (max 120)" }, 400);

  const items = Array.isArray((body as any)?.items) ? ((body as any).items as PurchaseItemInput[]) : null;
  if (!items || items.length === 0) return json({ ok: false, error: "items[] is required" }, 400);
  if (items.length > 500) return json({ ok: false, error: "Too many items (max 500)" }, 400);

  for (const it of items) {
    const itemId = String((it as any)?.itemId || "").trim();
    const qty = Number((it as any)?.qty);
    const unitCostCents = Number((it as any)?.unitCostCents);

    if (!isUuid(itemId)) return json({ ok: false, error: "Invalid itemId" }, 400);
    if (!Number.isFinite(qty) || qty <= 0) return json({ ok: false, error: "qty must be > 0" }, 400);
    if (!Number.isFinite(unitCostCents) || unitCostCents < 0) return json({ ok: false, error: "unitCostCents must be >= 0" }, 400);
  }

  const purchasedAt = (body as any)?.purchasedAt ? String((body as any).purchasedAt) : null;
  const currency = normalizeCurrency((body as any)?.currency);

  const vendorName = clampText((body as any)?.vendorName, 200);
  const vendorPhone = clampText((body as any)?.vendorPhone, 80);
  const vendorEmail = clampText((body as any)?.vendorEmail, 200);
  const notes = clampText((body as any)?.notes, 2000);

  try {
    // Ensure expense category (default to "Supplies")
    const expenseCategoryId = await ensureExpenseCategoryId({
      userClient,
      uid,
      entityType,
      entityId,
      categoryId: (body as any)?.expenseCategoryId ?? null,
      categoryName: (body as any)?.expenseCategoryName ?? "Supplies",
    });

    // Map items to RPC jsonb
    const rpcItems = items.map((it) => ({
      item_id: String((it as any).itemId).trim(),
      qty: Number((it as any).qty),
      unit_cost_cents: Math.floor(Number((it as any).unitCostCents)),
      notes: (it as any)?.notes ? String((it as any).notes).trim() : null,
    }));

    const { data, error } = await userClient.rpc("inventory_purchase_create", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_idempotency_key: idempotencyKey,
      p_purchased_at: purchasedAt ? purchasedAt : null,
      p_currency: currency,
      p_vendor_name: vendorName,
      p_vendor_phone: vendorPhone,
      p_vendor_email: vendorEmail,
      p_notes: notes,
      p_expense_category_id: expenseCategoryId,
      p_items: rpcItems,
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.purchase_id) throw new Error("RPC did not return purchase_id");

    return json({
      ok: true,
      purchaseId: row.purchase_id,
      financeEntryId: row.finance_entry_id ?? null,
      totalAmountCents: row.total_amount_cents ?? 0,
      currency,
      expenseCategoryId,
      idempotencyKey,
    });
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to create purchase" }, 500);
  }
});
