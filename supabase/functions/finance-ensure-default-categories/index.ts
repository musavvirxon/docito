// File: supabase/functions/finance-ensure-default-categories/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { secureHandler, jsonResponse, errorResponse } from "../_shared/security-middleware.ts";

type EntityType = "clinic" | "lab" | "imaging" | "pharmacy" | "practice" | "imaging_center" | "laboratory";

type ReqBody = {
  entityType: EntityType;
  entityId: string;
};

type TemplateRow = {
  kind: "income" | "expense" | "payroll" | "transfer" | "adjustment";
  name: string;
  is_active: boolean;
  sort_order: number;
};

type CategoryRow = {
  kind: string;
  name: string;
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

function keyOf(kind: string, name: string) {
  return `${String(kind).toLowerCase()}::${String(name).trim().toLowerCase()}`;
}

serve(async (req) => {
  const secured = await secureHandler(req, "finance-ensure-default-categories", {
    requireAuth: true,
    allowedMethods: ["POST", "OPTIONS"],
  });

  if (secured.response) return secured.response;
  if (!secured.context) return errorResponse("Security context missing", 500);

  const { serviceClient } = secured.context;

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const entityTypeRaw = (body as any)?.entityType as EntityType | undefined;
  const entityId = safeText((body as any)?.entityId);

  if (!entityTypeRaw) return errorResponse("Missing entityType", 400);
  if (!entityId || !isUuid(entityId)) return errorResponse("Invalid entityId", 400);

  const entityType = normalizeEntityType(entityTypeRaw);

  const { data: templates, error: tplErr } = await serviceClient
    .from("finance_category_templates")
    .select("kind,name,is_active,sort_order")
    .eq("is_active", true)
    .order("kind", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(5000);

  if (tplErr) return errorResponse(tplErr.message, 500);

  const tplRows = (templates || []) as any as TemplateRow[];
  if (tplRows.length === 0) {
    return jsonResponse({ ok: true, inserted: 0, skipped: 0, message: "No active templates found." });
  }

  const { data: existing, error: exErr } = await serviceClient
    .from("finance_categories")
    .select("kind,name")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .limit(5000);

  if (exErr) return errorResponse(exErr.message, 500);

  const existingSet = new Set<string>();
  (existing || []).forEach((c: any as CategoryRow) => existingSet.add(keyOf(c.kind, c.name)));

  const toInsert = tplRows
    .filter((t) => !existingSet.has(keyOf(t.kind, t.name)))
    .map((t) => ({
      entity_type: entityType,
      entity_id: entityId,
      kind: t.kind,
      name: t.name,
      is_active: true,
    }));

  if (toInsert.length === 0) {
    return jsonResponse({ ok: true, inserted: 0, skipped: tplRows.length, message: "Defaults already present." });
  }

  const { error: insErr } = await serviceClient.from("finance_categories").insert(toInsert);
  if (insErr) return errorResponse(insErr.message, 500);

  return jsonResponse({
    ok: true,
    inserted: toInsert.length,
    skipped: tplRows.length - toInsert.length,
    entityType,
  });
});
