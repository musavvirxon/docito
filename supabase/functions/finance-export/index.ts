// File: supabase/functions/finance-export/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";
type EntryType = "income" | "expense" | "payroll" | "transfer" | "adjustment";

type ReqBody =
  | {
      entityType: FinanceEntityType;
      entityId: string;
      kind: "entries";
      from: string;
      to: string;
      entryTypes?: EntryType[];
    }
  | {
      entityType: FinanceEntityType;
      entityId: string;
      kind: "payroll_runs";
      from: string;
      to: string;
      includeItems?: boolean;
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

function clampIsoOrNull(s?: string): string | null {
  if (!s) return null;
  const v = String(s).trim();
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvCell).join(","));
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCsvCell((r as any)[h])).join(","));
  }
  return lines.join("\n");
}

function centsToMajor(cents: number) {
  const v = (Number(cents || 0) || 0) / 100;
  return v.toFixed(2);
}

async function assertAccess(userClient: any, entityType: FinanceEntityType, entityId: string) {
  const { data, error } = await userClient.rpc("can_access_entity", {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw error;
  return Boolean(data);
}

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
  const kind = String((body as any)?.kind || "").trim();

  const fromIso = clampIsoOrNull((body as any)?.from);
  const toIso = clampIsoOrNull((body as any)?.to);

  if (!entityType) return json({ ok: false, error: "Invalid entityType" }, 400);
  if (!isUuid(entityId)) return json({ ok: false, error: "Invalid entityId" }, 400);
  if (!fromIso || !toIso) return json({ ok: false, error: "Invalid from/to (expected ISO timestamps)" }, 400);
  if (kind !== "entries" && kind !== "payroll_runs") return json({ ok: false, error: "Invalid kind" }, 400);

  try {
    const allowed = await assertAccess(userClient, entityType, entityId);
    if (!allowed) return json({ ok: false, error: "Forbidden" }, 403);

    const serviceClient = createClient(env.url, env.service);

    if (kind === "entries") {
      const entryTypes = Array.isArray((body as any)?.entryTypes)
        ? ((body as any)?.entryTypes as string[]).map((x) => String(x))
        : (["income", "expense", "payroll", "transfer", "adjustment"] as string[]);

      const { data: cats, error: cErr } = await serviceClient
        .from("finance_categories")
        .select("id,name,kind")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .limit(5000);

      if (cErr) throw cErr;

      const catMap = new Map<string, { name: string; kind: string }>();
      (cats || []).forEach((c: any) => {
        if (!c?.id) return;
        catMap.set(String(c.id), { name: String(c.name || "Uncategorized"), kind: String(c.kind || "") });
      });

      const { data: entries, error: eErr } = await serviceClient
        .from("finance_entries")
        .select("id,occurred_at,entry_type,amount_cents,currency,description,category_id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .gte("occurred_at", fromIso)
        .lt("occurred_at", toIso)
        .in("entry_type", entryTypes)
        .order("occurred_at", { ascending: true })
        .limit(50000);

      if (eErr) throw eErr;

      const rows = (entries || []).map((e: any) => {
        const cat = e.category_id ? catMap.get(String(e.category_id)) : null;
        return {
          occurred_at: e.occurred_at,
          entry_type: e.entry_type,
          category: cat?.name || "Uncategorized",
          category_kind: cat?.kind || "",
          description: e.description || "",
          amount: centsToMajor(Number(e.amount_cents || 0) || 0),
          currency: String(e.currency || "USD").toUpperCase(),
          id: e.id,
        };
      });

      const headers = ["occurred_at", "entry_type", "category", "category_kind", "description", "amount", "currency", "id"];
      const csv = toCsv(headers, rows);

      return json({
        ok: true,
        kind,
        mimeType: "text/csv",
        filename: `finance_entries_${entityType}_${entityId}_${fromIso.slice(0, 10)}_${toIso.slice(0, 10)}.csv`,
        csv,
      });
    }

    // kind === "payroll_runs"
    const includeItems = Boolean((body as any)?.includeItems);

    const { data: runs, error: rErr } = await serviceClient
      .from("finance_payroll_runs")
      .select("id,period_start,period_end,schedule,status,currency,created_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (rErr) throw rErr;

    if (!includeItems) {
      const rows = (runs || []).map((r: any) => ({
        run_id: r.id,
        period_start: r.period_start,
        period_end: r.period_end,
        schedule: r.schedule,
        status: r.status,
        currency: String(r.currency || "USD").toUpperCase(),
        created_at: r.created_at,
      }));

      const headers = ["run_id", "period_start", "period_end", "schedule", "status", "currency", "created_at"];
      const csv = toCsv(headers, rows);

      return json({
        ok: true,
        kind,
        mimeType: "text/csv",
        filename: `payroll_runs_${entityType}_${entityId}_${fromIso.slice(0, 10)}_${toIso.slice(0, 10)}.csv`,
        csv,
      });
    }

    const runIds = (runs || []).map((r: any) => String(r.id)).filter(Boolean);
    if (runIds.length === 0) {
      const headers = ["run_id", "period_start", "period_end", "staff_user_id", "staff_name", "basis", "units", "rate_bps", "rate_cents", "amount", "currency"];
      const csv = toCsv(headers, []);
      return json({
        ok: true,
        kind,
        mimeType: "text/csv",
        filename: `payroll_items_${entityType}_${entityId}_${fromIso.slice(0, 10)}_${toIso.slice(0, 10)}.csv`,
        csv,
      });
    }

    const { data: items, error: iErr } = await serviceClient
      .from("finance_payroll_items")
      .select("payroll_run_id,staff_user_id,staff_name,basis,units,rate_bps,rate_cents,amount_cents,currency")
      .in("payroll_run_id", runIds)
      .order("created_at", { ascending: true })
      .limit(50000);

    if (iErr) throw iErr;

    const runMap = new Map<string, any>();
    (runs || []).forEach((r: any) => runMap.set(String(r.id), r));

    const rows = (items || []).map((it: any) => {
      const run = runMap.get(String(it.payroll_run_id));
      return {
        run_id: it.payroll_run_id,
        period_start: run?.period_start || "",
        period_end: run?.period_end || "",
        staff_user_id: it.staff_user_id || "",
        staff_name: it.staff_name || "",
        basis: it.basis || "",
        units: String(it.units ?? ""),
        rate_bps: it.rate_bps ?? "",
        rate_cents: it.rate_cents ?? "",
        amount: centsToMajor(Number(it.amount_cents || 0) || 0),
        currency: String(it.currency || run?.currency || "USD").toUpperCase(),
      };
    });

    const headers = ["run_id", "period_start", "period_end", "staff_user_id", "staff_name", "basis", "units", "rate_bps", "rate_cents", "amount", "currency"];
    const csv = toCsv(headers, rows);

    return json({
      ok: true,
      kind,
      mimeType: "text/csv",
      filename: `payroll_items_${entityType}_${entityId}_${fromIso.slice(0, 10)}_${toIso.slice(0, 10)}.csv`,
      csv,
    });
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e?.message || "Failed to export" }, 500);
  }
});
