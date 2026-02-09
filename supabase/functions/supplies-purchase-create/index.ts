// File: supabase/functions/supplies-purchase-create/index.ts
// B23 (retry): Edge Function wrapper for supplies purchases
// - Deno + supabase-js v2
// - CORS + Authorization
// - Calls RPC: supplies_purchase_create

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  entity_type: "clinic" | "lab" | "imaging" | "pharmacy";
  entity_id: string;

  occurred_at?: string; // ISO
  currency?: string;
  vendor_name?: string | null;
  notes?: string | null;

  // [{ name: string, qty: number, unit_cost_cents: number }]
  items: Array<{ name: string; qty?: number; unit_cost_cents?: number }>;

  idempotency_key?: string | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getAuthHeader(req: Request) {
  return req.headers.get("authorization") || req.headers.get("Authorization") || "";
}

function normalizeCurrency(v?: string) {
  const s = String(v || "").trim().toUpperCase();
  return s || "USD";
}

function cleanStr(v: unknown) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return jsonResponse({ error: "Server not configured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const payload = (await req.json()) as Payload;

    const entityType = String(payload?.entity_type || "").toLowerCase();
    const entityId = String(payload?.entity_id || "");
    if (!entityType || !["clinic", "lab", "imaging", "pharmacy"].includes(entityType)) {
      return jsonResponse({ error: "Invalid entity_type" }, 400);
    }
    if (!entityId) {
      return jsonResponse({ error: "entity_id required" }, 400);
    }

    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (!items.length) {
      return jsonResponse({ error: "items required" }, 400);
    }

    const cleanItems = items
      .map((it) => {
        const name = String(it?.name || "").trim();
        const qty = Number(it?.qty ?? 1);
        const unitCost = Number(it?.unit_cost_cents ?? 0);

        if (!name) return null;
        if (!Number.isFinite(qty) || qty <= 0) return null;
        if (!Number.isFinite(unitCost) || unitCost < 0) return null;

        return { name, qty, unit_cost_cents: Math.round(unitCost) };
      })
      .filter(Boolean) as Array<{ name: string; qty: number; unit_cost_cents: number }>;

    if (!cleanItems.length) {
      return jsonResponse({ error: "Provide at least one valid item" }, 400);
    }

    const occurredAt = payload?.occurred_at ? String(payload.occurred_at) : null;

    const { data, error } = await supabase.rpc("supplies_purchase_create", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_occurred_at: occurredAt,
      p_currency: normalizeCurrency(payload?.currency),
      p_vendor_name: cleanStr(payload?.vendor_name),
      p_notes: cleanStr(payload?.notes),
      p_items: cleanItems,
      p_idempotency_key: cleanStr(payload?.idempotency_key),
    });

    if (error) {
      return jsonResponse({ error: error.message }, 400);
    }

    const row = Array.isArray(data) ? data[0] : data;
    return jsonResponse(
      {
        purchase_id: row?.purchase_id ?? null,
        finance_entry_id: row?.finance_entry_id ?? null,
      },
      200,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});
