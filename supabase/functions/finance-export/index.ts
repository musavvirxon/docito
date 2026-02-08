// File: supabase/functions/finance-export/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { secureHandler, jsonResponse, errorResponse } from "../_shared/security-middleware.ts";

type EntityType = "practice" | "lab" | "pharmacy" | "imaging_center";
type EntryType = "income" | "expense" | "payroll" | "transfer" | "adjustment";

type ExportKind = "entries" | "payroll_runs";

type ReqBody = {
  entityType: EntityType;
  entityId: string;

  kind: ExportKind;

  // ISO timestamps; if missing defaults to last 30 days
  from?: string;
  to?: string;

  // for entries
  entryTypes?: EntryType[];

  // for payroll_runs
  includeItems?: boolean; // default true
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

function clampDateRange(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  const max = 366 * 24 * 60 * 60 * 1000;
  if (ms <= 0) return null;
  if (ms > max) return { from, to: new Date(from.getTime() + max) };
  return { from, to };
}

function escapeCsv(v: unknown) {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: Record<string, unknown>[]) {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsv).join(","));
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCsv((r as any)[h])).join(","));
  }
  return lines.join("\n");
}

function isoDayKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

serve(async (req) => {
  const secured = await secureHandler(req, "finance-export", {
    requireAuth: true,
    allowedMethods: ["POST", "OPTIONS"],
  });

  if (secured.response) return secured.response;
  if (!secured.context) return errorResponse("Security context missing", 500);

  // Use user-scoped client (RLS enforced)
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
  const kind = safeText((body as any)?.kind) as ExportKind;

  if (!entityType) return errorResponse("Missing entityType", 400);
  if (!entityId || !isUuid(entityId)) return errorResponse("Invalid entityId", 400);
  if (kind !== "entries" && kind !== "payroll_runs") return errorResponse("Invalid kind", 400);

  const now = new Date();
  const fromDefault = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const fromD = parseIsoOrNull((body as any)?.from) ?? fromDefault;
  const toD = parseIsoOrNull((body as any)?.to) ?? now;

  const range = clampDateRange(fromD, toD);
  if (!range) return errorResponse("Invalid date range", 400);

  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();

  if (kind === "entries") {
    const entryTypes = ((body as any)?.entryTypes as EntryType[] | undefined) ?? [
      "income",
      "expense",
      "payroll",
      "transfer",
      "adjustment",
    ];

    const allowed = new Set<EntryType>(["income", "expense", "payroll", "transfer", "adjustment"]);
    const types = entryTypes.filter((t) => allowed.has(t));
    if (types.length === 0) return errorResponse("entryTypes must include at least one valid type", 400);

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

    const { data: entries, error: entErr } = await userClient
      .from("finance_entries")
      .select("id,entry_type,category_id,amount_cents,currency,occurred_at,description,metadata")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .in("entry_type", types)
      .gte("occurred_at", fromIso)
      .lt("occurred_at", toIso)
      .order("occurred_at", { ascending: true })
      .limit(50000);

    if (entErr) return errorResponse(entErr.message, 500);

    const rows = (entries || []).map((e: any) => {
      const occurredAt = new Date(String(e.occurred_at));
      const day = Number.isNaN(occurredAt.getTime()) ? "" : isoDayKey(occurredAt);
      const categoryId = e.category_id ? String(e.category_id) : "";
      const categoryName = categoryId ? catName.get(categoryId) || "Unknown" : "Uncategorized";

      return {
        id: String(e.id),
        occurred_day: day,
        occurred_at: String(e.occurred_at),
        entry_type: String(e.entry_type),
        category_id: categoryId,
        category_name: categoryName,
        amount_cents: Number(e.amount_cents || 0) || 0,
        currency: String(e.currency || ""),
        description: e.description ? String(e.description) : "",
        metadata_json: e.metadata ? JSON.stringify(e.metadata) : "",
      };
    });

    const headers = [
      "id",
      "occurred_day",
      "occurred_at",
      "entry_type",
      "category_id",
      "category_name",
      "amount_cents",
      "currency",
      "description",
      "metadata_json",
    ];

    const csv = toCsv(headers, rows);
    const filename = `finance_entries_${entityType}_${entityId}_${isoDayKey(range.from)}_to_${isoDayKey(range.to)}.csv`;

    return jsonResponse({
      ok: true,
      kind,
      entityType,
      entityId,
      range: { from: fromIso, to: toIso },
      filename,
      mimeType: "text/csv",
      csv,
      rowCount: rows.length,
    });
  }

  // kind === "payroll_runs"
  const includeItems = (body as any)?.includeItems !== false;

  // payroll_runs uses date range (period_start..period_end_exclusive) AND created_at.
  // We'll include runs whose period_start is within the range (simple + predictable).
  const fromDate = isoDayKey(range.from); // YYYY-MM-DD
  const toDate = isoDayKey(range.to);

  const { data: runs, error: runsErr } = await userClient
    .from("payroll_runs")
    .select("id,period_start,period_end_exclusive,status,currency,total_cents,created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .gte("period_start", fromDate)
    .lte("period_start", toDate)
    .order("period_start", { ascending: true })
    .limit(5000);

  if (runsErr) return errorResponse(runsErr.message, 500);

  const runRows = (runs || []) as any[];

  if (!includeItems) {
    const rows = runRows.map((r) => ({
      run_id: String(r.id),
      period_start: String(r.period_start),
      period_end_exclusive: String(r.period_end_exclusive),
      status: String(r.status),
      total_cents: Number(r.total_cents || 0) || 0,
      currency: String(r.currency || ""),
      created_at: String(r.created_at || ""),
    }));

    const headers = ["run_id", "period_start", "period_end_exclusive", "status", "total_cents", "currency", "created_at"];
    const csv = toCsv(headers, rows);
    const filename = `payroll_runs_${entityType}_${entityId}_${fromDate}_to_${toDate}.csv`;

    return jsonResponse({
      ok: true,
      kind,
      entityType,
      entityId,
      range: { from: fromIso, to: toIso },
      filename,
      mimeType: "text/csv",
      csv,
      rowCount: rows.length,
    });
  }

  const runIds = runRows.map((r) => String(r.id));
  let items: any[] = [];

  if (runIds.length > 0) {
    const { data: itemsData, error: itemsErr } = await userClient
      .from("payroll_run_items")
      .select("id,run_id,user_id,minutes_worked,units,amount_cents,currency,created_at")
      .in("run_id", runIds)
      .order("run_id", { ascending: true })
      .limit(50000);

    if (itemsErr) return errorResponse(itemsErr.message, 500);
    items = (itemsData || []) as any[];
  }

  const runById = new Map<string, any>();
  runRows.forEach((r) => runById.set(String(r.id), r));

  const rows = items.map((it) => {
    const run = runById.get(String(it.run_id));
    return {
      run_id: String(it.run_id),
      period_start: run ? String(run.period_start) : "",
      period_end_exclusive: run ? String(run.period_end_exclusive) : "",
      run_status: run ? String(run.status) : "",
      user_id: String(it.user_id),
      minutes_worked: it.minutes_worked != null ? Number(it.minutes_worked) : "",
      units: it.units != null ? Number(it.units) : "",
      amount_cents: Number(it.amount_cents || 0) || 0,
      currency: String(it.currency || ""),
      item_created_at: String(it.created_at || ""),
    };
  });

  const headers = [
    "run_id",
    "period_start",
    "period_end_exclusive",
    "run_status",
    "user_id",
    "minutes_worked",
    "units",
    "amount_cents",
    "currency",
    "item_created_at",
  ];

  const csv = toCsv(headers, rows);
  const filename = `payroll_items_${entityType}_${entityId}_${fromDate}_to_${toDate}.csv`;

  return jsonResponse({
    ok: true,
    kind,
    entityType,
    entityId,
    range: { from: fromIso, to: toIso },
    filename,
    mimeType: "text/csv",
    csv,
    rowCount: rows.length,
  });
});
