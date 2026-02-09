// File: src/components/financial/RecurringRulesPanel.tsx
// B33: Add export (CSV) for recurring runs by date range

import { useEffect, useMemo, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import {
  Loader2,
  RefreshCw,
  Repeat,
  Plus,
  Play,
  Trash2,
  Pencil,
  History,
  CalendarClock,
  Eye,
  Activity,
  Download,
  FileDown,
} from "lucide-react";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";
type EntryType = "income" | "expense" | "payroll";
type Schedule = "daily" | "weekly" | "monthly";

type CategoryRow = { id: string; kind: "income" | "expense" | "payroll"; name: string };

type RuleRow = {
  id: string;
  entry_type: EntryType;
  category_id: string | null;
  category_name: string;
  amount_cents: number;
  currency: string;
  description: string | null;
  schedule: Schedule;
  interval_n: number;
  day_of_week: number | null;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  active: boolean;
  updated_at: string;
};

type RunRow = {
  run_id: string;
  rule_id: string;
  run_date: string;
  status: "created" | "skipped" | "error";
  finance_entry_id: string | null;
  error: string | null;
  created_at: string;
};

type EntityRunRow = {
  id: string;
  source: "pg_cron" | "edge_cron" | "manual";
  as_of: string;
  started_at: string;
  finished_at: string | null;
  created_count: number;
  skipped_count: number;
  error_count: number;
  notes: string | null;
};

type FinanceEntryRow = {
  id: string;
  entry_type: "income" | "expense" | "payroll";
  amount_cents: number;
  currency: string;
  occurred_at: string;
  description: string | null;
  reference: string | null;
};

type StatusRow = {
  due_rules_count: number;
  next_due_date: string | null;
  last_run_started_at: string | null;
  last_run_finished_at: string | null;
  last_run_source: "pg_cron" | "edge_cron" | "manual" | null;
  last_created_count: number | null;
  last_skipped_count: number | null;
  last_error_count: number | null;
};

type ExportRow = {
  run_date: string;
  status: string;
  rule_id: string;
  entry_type: string | null;
  amount_cents: number | null;
  currency: string | null;
  category_name: string | null;
  rule_description: string | null;
  finance_entry_id: string | null;
  entry_occurred_at: string | null;
  entry_description: string | null;
  entry_reference: string | null;
  run_error: string | null;
  run_created_at: string | null;
};

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseMajorToCents(v: string) {
  const s = String(v || "").trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, "."));
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return Math.round(n * 100);
}

function normalizeCurrency(v: string) {
  const s = String(v || "").trim().toUpperCase();
  return s || "USD";
}

function formatMoney(currency: string, cents: number) {
  const v = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(v);
  } catch {
    const sign = v < 0 ? "-" : "";
    return `${sign}${currency || "USD"} ${Math.abs(v).toFixed(2)}`;
  }
}

function dowLabel(dow: number | null) {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (dow === null || dow < 0 || dow > 6) return "—";
  return names[dow] || "—";
}

function sourceLabel(s: EntityRunRow["source"] | StatusRow["last_run_source"]) {
  if (s === "pg_cron") return "DB cron";
  if (s === "edge_cron") return "Edge cron";
  if (s === "manual") return "Manual";
  return "—";
}

function fmtTs(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function escapeCsvCell(v: unknown) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const header = keys.map(escapeCsvCell).join(",");
  const lines = rows.map((r) => keys.map((k) => escapeCsvCell((r as any)[k])).join(","));
  const content = [header, ...lines].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function RecurringRulesPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const today = useMemo(() => new Date(), []);
  const [asOf, setAsOf] = useState(() => isoDate(today));

  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  const [rules, setRules] = useState<RuleRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [entityRuns, setEntityRuns] = useState<EntityRunRow[]>([]);
  const [lastRunResults, setLastRunResults] = useState<any[]>([]);

  const [statusLoading, setStatusLoading] = useState(false);
  const [status, setStatus] = useState<StatusRow | null>(null);

  // export
  const [exporting, setExporting] = useState(false);
  const [exportFrom, setExportFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return isoDate(d);
  });
  const [exportTo, setExportTo] = useState(() => isoDate(today));

  // drilldown
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRun, setDetailsRun] = useState<EntityRunRow | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsRuleRuns, setDetailsRuleRuns] = useState<RunRow[]>([]);
  const [detailsEntries, setDetailsEntries] = useState<Record<string, FinanceEntryRow>>({});

  // dialog
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formActive, setFormActive] = useState(true);
  const [formEntryType, setFormEntryType] = useState<EntryType>("expense");
  const [formSchedule, setFormSchedule] = useState<Schedule>("monthly");
  const [formInterval, setFormInterval] = useState("1");
  const [formDow, setFormDow] = useState("1"); // Mon
  const [formDom, setFormDom] = useState("1");
  const [formStart, setFormStart] = useState(() => isoDate(today));
  const [formEnd, setFormEnd] = useState<string>(""); // optional
  const [formCurrency, setFormCurrency] = useState("USD");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string>("uncategorized"); // "uncategorized" | uuid
  const [formCategoryName, setFormCategoryName] = useState<string>("Utilities");

  const relevantCategories = useMemo(() => {
    return categories.filter((c) => c.kind === formEntryType);
  }, [categories, formEntryType]);

  const currencyHint = useMemo(() => (rules[0]?.currency || "USD").toUpperCase(), [rules]);
  const canLoad = useMemo(() => Boolean(entityId), [entityId]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("finance_categories")
      .select("id,kind,name")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("kind", { ascending: true })
      .order("name", { ascending: true })
      .limit(2000);

    if (error) throw error;
    setCategories((data || []) as any);
  };

  const loadRuns = async () => {
    const { data, error } = await supabase.rpc("finance_recurring_rule_runs_list", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_limit: 150,
    });

    if (error) throw error;
    setRuns(((data || []) as any) as RunRow[]);
  };

  const loadEntityRuns = async () => {
    const { data, error } = await supabase.rpc("finance_recurring_entity_runs_list", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_limit: 30,
    });

    if (error) throw error;
    setEntityRuns(((data || []) as any) as EntityRunRow[]);
  };

  const loadStatus = async () => {
    if (!entityId) return;
    setStatusLoading(true);
    try {
      const { data, error } = await supabase.rpc("finance_recurring_entity_status", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_as_of: asOf,
      });

      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as any;
      setStatus(
        row
          ? {
              due_rules_count: Number(row.due_rules_count ?? 0),
              next_due_date: row.next_due_date ?? null,
              last_run_started_at: row.last_run_started_at ?? null,
              last_run_finished_at: row.last_run_finished_at ?? null,
              last_run_source: row.last_run_source ?? null,
              last_created_count: row.last_created_count ?? null,
              last_skipped_count: row.last_skipped_count ?? null,
              last_error_count: row.last_error_count ?? null,
            }
          : null,
      );
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  const load = async () => {
    if (!canLoad) return;
    setLoading(true);
    try {
      const [rRes] = await Promise.all([
        supabase.rpc("finance_recurring_rule_list", {
          p_entity_type: entityType,
          p_entity_id: entityId,
        }),
        loadCategories(),
        loadRuns(),
        loadEntityRuns(),
      ]);

      if ((rRes as any).error) throw (rRes as any).error;
      setRules((((rRes as any).data || []) as any) as RuleRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load recurring rules");
      setRules([]);
      setRuns([]);
      setEntityRuns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  useEffect(() => {
    void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId, asOf]);

  const resetForm = () => {
    setEditId(null);
    setFormActive(true);
    setFormEntryType("expense");
    setFormSchedule("monthly");
    setFormInterval("1");
    setFormDow("1");
    setFormDom("1");
    setFormStart(isoDate(today));
    setFormEnd("");
    setFormCurrency(currencyHint || "USD");
    setFormAmount("");
    setFormDescription("");
    setFormCategoryId("uncategorized");
    setFormCategoryName("Utilities");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (r: RuleRow) => {
    setEditId(r.id);
    setFormActive(Boolean(r.active));
    setFormEntryType(r.entry_type);
    setFormSchedule(r.schedule);
    setFormInterval(String(r.interval_n ?? 1));
    setFormDow(String(r.day_of_week ?? 1));
    setFormDom(String(r.day_of_month ?? 1));
    setFormStart(r.start_date);
    setFormEnd(r.end_date || "");
    setFormCurrency(String(r.currency || "USD").toUpperCase());
    setFormAmount(((Number(r.amount_cents || 0) || 0) / 100).toFixed(2));
    setFormDescription(r.description || "");
    setFormCategoryId(r.category_id ? r.category_id : "uncategorized");
    setFormCategoryName(r.category_name || "Utilities");
    setOpen(true);
  };

  const canSave = useMemo(() => {
    if (!entityId) return false;
    const cents = parseMajorToCents(formAmount);
    if (cents === null) return false;

    const interval = Number(formInterval);
    if (!Number.isFinite(interval) || interval < 1) return false;

    if (!formStart) return false;

    if (formSchedule === "weekly") {
      const dow = Number(formDow);
      if (!Number.isFinite(dow) || dow < 0 || dow > 6) return false;
    }

    if (formSchedule === "monthly") {
      const dom = Number(formDom);
      if (!Number.isFinite(dom) || dom < 1 || dom > 28) return false;
    }

    if (formEnd) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formEnd)) return false;
      if (formEnd < formStart) return false;
    }

    return true;
  }, [entityId, formAmount, formEnd, formInterval, formSchedule, formStart, formDow, formDom]);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const cents = parseMajorToCents(formAmount);
      if (cents === null) throw new Error("Invalid amount");

      const interval = Math.max(1, Math.floor(Number(formInterval)));
      const dow = formSchedule === "weekly" ? Math.floor(Number(formDow)) : null;
      const dom = formSchedule === "monthly" ? Math.floor(Number(formDom)) : null;

      const categoryId = formCategoryId === "uncategorized" ? null : formCategoryId;
      const categoryName = categoryId ? null : (formCategoryName.trim() || null);

      const { data, error } = await supabase.rpc("finance_recurring_rule_upsert", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_rule_id: editId,
        p_entry_type: formEntryType,
        p_amount_cents: cents,
        p_currency: normalizeCurrency(formCurrency),
        p_description: formDescription.trim() ? formDescription.trim() : null,
        p_schedule: formSchedule,
        p_interval_n: interval,
        p_day_of_week: dow,
        p_day_of_month: dom,
        p_start_date: formStart,
        p_end_date: formEnd.trim() ? formEnd.trim() : null,
        p_category_id: categoryId,
        p_category_name: categoryName,
        p_active: formActive,
      });

      if (error) throw error;

      const id = Array.isArray(data) ? data[0]?.rule_id : (data as any)?.rule_id;
      if (!id) throw new Error("Failed to save rule");

      toast.success(editId ? "Rule updated" : "Rule created");
      setOpen(false);
      resetForm();
      await load();
      await loadStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (ruleId: string) => {
    try {
      await supabase.rpc("finance_recurring_rule_deactivate", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_rule_id: ruleId,
      });
      toast.success("Rule deactivated");
      await load();
      await loadStatus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to deactivate rule");
    }
  };

  const runDue = async () => {
    if (!entityId) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("finance-recurring-run", {
        body: {
          entity_type: entityType,
          entity_id: entityId,
          as_of: asOf,
        },
      });

      if (error) throw error;

      const results = Array.isArray(data?.results) ? data.results : [];
      setLastRunResults(results);

      const created = results.filter((r: any) => r.status === "created").length;
      const skipped = results.filter((r: any) => r.status === "skipped").length;
      const errored = results.filter((r: any) => r.status === "error").length;

      toast.success(`Run complete: ${created} created, ${skipped} skipped, ${errored} errors`);

      await Promise.all([loadRuns(), loadEntityRuns(), loadStatus()]);
      await supabase.rpc("finance_recurring_rule_list", { p_entity_type: entityType, p_entity_id: entityId }).then((res: any) => {
        if (!res.error) setRules(((res.data || []) as any) as RuleRow[]);
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to run recurring rules");
    } finally {
      setRunning(false);
    }
  };

  const openDetails = async (er: EntityRunRow) => {
    setDetailsRun(er);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsRuleRuns([]);
    setDetailsEntries({});
    try {
      const { data, error } = await supabase.rpc("finance_recurring_rule_runs_for_entity_run", {
        p_entity_run_id: er.id,
        p_limit: 400,
      });
      if (error) throw error;

      const ruleRuns = ((data || []) as any) as RunRow[];
      setDetailsRuleRuns(ruleRuns);

      const entryIds = ruleRuns.map((r) => r.finance_entry_id).filter((x): x is string => Boolean(x));

      if (entryIds.length) {
        const { data: entries, error: eErr } = await supabase
          .from("finance_entries")
          .select("id,entry_type,amount_cents,currency,occurred_at,description,reference")
          .in("id", entryIds)
          .limit(1000);

        if (eErr) throw eErr;

        const map: Record<string, FinanceEntryRow> = {};
        for (const row of (entries || []) as any[]) {
          map[String(row.id)] = row as FinanceEntryRow;
        }
        setDetailsEntries(map);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load run details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const exportRuns = async () => {
    if (!entityId) return;
    if (!exportFrom || !exportTo) {
      toast.error("Select export date range");
      return;
    }
    if (exportFrom > exportTo) {
      toast.error("Export from must be before export to");
      return;
    }

    setExporting(true);
    try {
      const { data, error } = await supabase.rpc("finance_recurring_runs_export", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_date_from: exportFrom,
        p_date_to: exportTo,
        p_limit: 20000,
      });

      if (error) throw error;

      const rows = ((data || []) as any[]) as ExportRow[];

      const csvRows = rows.map((r) => ({
        run_date: r.run_date,
        status: r.status,
        rule_id: r.rule_id,
        entry_type: r.entry_type ?? "",
        amount: r.amount_cents === null ? "" : (Number(r.amount_cents || 0) / 100).toFixed(2),
        currency: r.currency ?? "",
        category: r.category_name ?? "",
        rule_description: r.rule_description ?? "",
        finance_entry_id: r.finance_entry_id ?? "",
        entry_occurred_at: r.entry_occurred_at ?? "",
        entry_description: r.entry_description ?? "",
        entry_reference: r.entry_reference ?? "",
        run_error: r.run_error ?? "",
        run_created_at: r.run_created_at ?? "",
      }));

      const filename = `recurring_runs_${entityType}_${entityId.slice(0, 8)}_${exportFrom}_to_${exportTo}.csv`;
      downloadCsv(filename, csvRows);
      toast.success(`Exported ${csvRows.length} rows`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to export");
    } finally {
      setExporting(false);
    }
  };

  const statusLine = useMemo(() => {
    if (statusLoading) return "Loading status…";
    if (!status) return "—";
    const due = Number(status.due_rules_count || 0);
    const next = status.next_due_date ? `next due ${status.next_due_date}` : "no due rules";
    return due > 0 ? `${due} due · ${next}` : next;
  }, [status, statusLoading]);

  const lastRunLine = useMemo(() => {
    if (!status || !status.last_run_started_at) return "No previous runs";
    const src = sourceLabel(status.last_run_source);
    const created = status.last_created_count ?? 0;
    const skipped = status.last_skipped_count ?? 0;
    const err = status.last_error_count ?? 0;
    return `${src} · created ${created} / skipped ${skipped} / errors ${err} · ${fmtTs(status.last_run_started_at)}`;
  }, [status]);

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="h-4 w-4 text-muted-foreground" />
            Recurring
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Automate repeating finance entries (utilities, rent, taxes, subscriptions).
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add rule
          </Button>

          <Button variant="outline" onClick={() => void load()} disabled={!canLoad || loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status summary */}
        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Status
              </div>
              <div className="text-sm text-muted-foreground mt-1">{statusLine}</div>
              <div className="text-xs text-muted-foreground mt-1">{lastRunLine}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadStatus()} disabled={!entityId || statusLoading} className="gap-2">
              {statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>

        {/* Run Due */}
        <div className="rounded-md border p-3 space-y-3">
          <div className="text-sm font-medium flex items-center gap-2">
            <Play className="h-4 w-4 text-muted-foreground" />
            Run due rules
          </div>
          <div className="grid gap-3 md:grid-cols-12">
            <div className="space-y-1 md:col-span-3">
              <Label>As of</Label>
              <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
            </div>
            <div className="md:col-span-9 flex items-end justify-end">
              <Button onClick={() => void runDue()} disabled={running || !asOf || !entityId} className="gap-2 w-full md:w-auto">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run due now
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Running creates finance entries for all rules with <span className="font-mono">next_run_date</span> ≤ selected date (catch-up supported).
          </div>

          {lastRunResults.length ? (
            <div className="mt-2 rounded-md border bg-background">
              <div className="px-3 py-2 text-xs text-muted-foreground border-b">Last run results</div>
              <div className="divide-y">
                {lastRunResults.slice(0, 12).map((r: any, idx: number) => (
                  <div key={idx} className="px-3 py-2 text-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{String(r.run_date || "")}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-mono text-muted-foreground">{String(r.rule_id || "").slice(0, 8)}</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={
                          r.status === "created"
                            ? "text-foreground"
                            : r.status === "error"
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }
                      >
                        {String(r.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {lastRunResults.length > 12 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">Showing first 12 results.</div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Automation */}
        <div className="rounded-md border overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="text-sm font-medium flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              Automation
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadEntityRuns()} disabled={!entityId} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {entityRuns.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No automation runs yet.</div>
          ) : (
            <div className="divide-y">
              {entityRuns.slice(0, 10).map((er) => {
                const total = (er.created_count || 0) + (er.skipped_count || 0) + (er.error_count || 0);
                const state = er.finished_at ? "done" : "running";
                return (
                  <div key={er.id} className="px-3 py-2 text-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground">{sourceLabel(er.source)}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-mono">{er.as_of}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="truncate text-muted-foreground">{state === "running" ? "running…" : "completed"}</span>
                      {er.notes ? <span className="text-xs text-muted-foreground truncate">· {er.notes}</span> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right whitespace-nowrap">
                        <span className="font-medium">{total}</span>
                        <span className="text-muted-foreground"> total</span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="text-foreground">{er.created_count}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{er.skipped_count}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className={er.error_count ? "text-destructive" : "text-muted-foreground"}>{er.error_count}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void openDetails(er)} className="gap-2">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {entityRuns.length > 10 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Showing latest 10 runs.</div>
          ) : null}
        </div>

        {/* Rules list */}
        <div className="rounded-md border overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
            <div className="col-span-3">Description</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Schedule</div>
            <div className="col-span-2">Next run</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : rules.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No recurring rules yet.</div>
          ) : (
            <div className="divide-y">
              {rules.map((r) => {
                const sched =
                  r.schedule === "daily"
                    ? `Daily ×${r.interval_n}`
                    : r.schedule === "weekly"
                      ? `Weekly ×${r.interval_n} (${dowLabel(r.day_of_week)})`
                      : `Monthly ×${r.interval_n} (day ${r.day_of_month ?? 1})`;

                return (
                  <div key={r.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center">
                    <div className="col-span-3 truncate">
                      {r.description || <span className="text-muted-foreground">—</span>}
                      {!r.active ? <span className="ml-2 text-xs text-muted-foreground">(inactive)</span> : null}
                    </div>
                    <div className="col-span-2 truncate text-muted-foreground">{r.category_name || "Uncategorized"}</div>
                    <div className="col-span-2 text-muted-foreground">{sched}</div>
                    <div className="col-span-2 font-mono">{r.next_run_date}</div>
                    <div className="col-span-2 text-right font-medium">{formatMoney(r.currency, r.amount_cents)}</div>
                    <div className="col-span-1 text-right flex justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEdit(r)} className="gap-2">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void deactivate(r.id)}
                        disabled={!r.active}
                        className="gap-2"
                        title="Deactivate"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent runs + Export */}
        <div className="rounded-md border overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Recent runs
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadRuns()} disabled={!entityId} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Export controls */}
          <div className="px-3 py-3 border-b bg-background">
            <div className="grid gap-3 md:grid-cols-12">
              <div className="space-y-1 md:col-span-3">
                <Label>Export from</Label>
                <Input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label>Export to</Label>
                <Input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
              </div>
              <div className="md:col-span-6 flex items-end justify-end">
                <Button
                  variant="outline"
                  onClick={() => void exportRuns()}
                  disabled={!entityId || exporting || !exportFrom || !exportTo}
                  className="gap-2 w-full md:w-auto"
                >
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Export CSV
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
              <Download className="h-3.5 w-3.5" />
              Exports rule runs + linked created entries (for auditing and analytics).
            </div>
          </div>

          {runs.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No runs yet.</div>
          ) : (
            <div className="divide-y">
              {runs.slice(0, 20).map((rr) => (
                <div key={rr.run_id} className="px-3 py-2 text-sm flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{rr.run_date}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-mono text-muted-foreground">{rr.rule_id.slice(0, 8)}</span>
                    {rr.status === "error" && rr.error ? (
                      <span className="text-xs text-destructive truncate max-w-[420px]">· {rr.error}</span>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <span
                      className={
                        rr.status === "created"
                          ? "text-foreground"
                          : rr.status === "error"
                            ? "text-destructive"
                            : "text-muted-foreground"
                      }
                    >
                      {rr.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {runs.length > 20 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Showing latest 20 runs.</div>
          ) : null}
        </div>

        {/* Details dialog */}
        <Dialog
          open={detailsOpen}
          onOpenChange={(v) => {
            setDetailsOpen(v);
            if (!v) {
              setDetailsRun(null);
              setDetailsRuleRuns([]);
              setDetailsEntries({});
              setDetailsLoading(false);
            }
          }}
        >
          <DialogTrigger asChild>
            <span />
          </DialogTrigger>

          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Automation run details</DialogTitle>
            </DialogHeader>

            {detailsRun ? (
              <div className="space-y-4">
                <div className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">{sourceLabel(detailsRun.source)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-mono">{detailsRun.as_of}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">created {detailsRun.created_count}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">skipped {detailsRun.skipped_count}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className={detailsRun.error_count ? "text-destructive" : "text-muted-foreground"}>
                      errors {detailsRun.error_count}
                    </span>
                  </div>
                  {detailsRun.notes ? <div className="mt-2 text-xs text-muted-foreground">{detailsRun.notes}</div> : null}
                </div>

                {detailsLoading ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading details…
                  </div>
                ) : detailsRuleRuns.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No linked rule runs for this automation run.</div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
                      <div className="col-span-2">Run date</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2">Rule</div>
                      <div className="col-span-6">Created entry</div>
                    </div>
                    <div className="divide-y">
                      {detailsRuleRuns.slice(0, 100).map((rr) => {
                        const entry = rr.finance_entry_id ? detailsEntries[rr.finance_entry_id] : undefined;
                        return (
                          <div key={rr.run_id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center">
                            <div className="col-span-2 font-mono">{rr.run_date}</div>
                            <div
                              className={
                                rr.status === "created"
                                  ? "col-span-2"
                                  : rr.status === "error"
                                    ? "col-span-2 text-destructive"
                                    : "col-span-2 text-muted-foreground"
                              }
                            >
                              {rr.status}
                            </div>
                            <div className="col-span-2 font-mono text-muted-foreground">{rr.rule_id.slice(0, 8)}</div>
                            <div className="col-span-6 min-w-0">
                              {rr.status === "error" ? (
                                <span className="text-destructive truncate block">{rr.error || "Error"}</span>
                              ) : entry ? (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="truncate">
                                    <span className="text-muted-foreground">{entry.entry_type}</span>
                                    <span className="text-muted-foreground"> · </span>
                                    <span className="truncate">{entry.description || "—"}</span>
                                    {entry.reference ? <span className="text-xs text-muted-foreground"> · {entry.reference}</span> : null}
                                  </div>
                                  <div className="font-medium whitespace-nowrap">
                                    {formatMoney(entry.currency, entry.amount_cents)}
                                  </div>
                                </div>
                              ) : rr.finance_entry_id ? (
                                <span className="text-muted-foreground font-mono">entry {rr.finance_entry_id.slice(0, 8)}…</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {detailsRuleRuns.length > 100 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Showing first 100 rows.</div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No run selected.</div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upsert dialog */}
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <span />
          </DialogTrigger>

          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit recurring rule" : "Add recurring rule"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-12">
              <div className="space-y-1 md:col-span-4">
                <Label>Entry type</Label>
                <Select value={formEntryType} onValueChange={(v) => setFormEntryType(v as EntryType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Expense" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="payroll">Payroll</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:col-span-4">
                <Label>Currency</Label>
                <Input value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)} placeholder="USD" />
              </div>

              <div className="space-y-1 md:col-span-4">
                <Label>Amount</Label>
                <Input inputMode="decimal" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" />
              </div>

              <div className="space-y-1 md:col-span-12">
                <Label>Description</Label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Electricity bill, Water, Heating, Tax reserve"
                />
              </div>

              <div className="space-y-1 md:col-span-8">
                <Label>Category</Label>
                <Select value={formCategoryId} onValueChange={(v) => setFormCategoryId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Uncategorized" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uncategorized">Uncategorized (use name)</SelectItem>
                    {relevantCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formCategoryId === "uncategorized" ? (
                  <div className="mt-2 space-y-1">
                    <Label>Category name (auto-create)</Label>
                    <Input value={formCategoryName} onChange={(e) => setFormCategoryName(e.target.value)} placeholder="Utilities" />
                    <div className="text-xs text-muted-foreground">
                      If no category is selected, we will create/find a category by this name when generating entries.
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-1 md:col-span-4">
                <Label>Active</Label>
                <Select value={formActive ? "yes" : "no"} onValueChange={(v) => setFormActive(v === "yes")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Active</SelectItem>
                    <SelectItem value="no">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:col-span-4">
                <Label>Schedule</Label>
                <Select value={formSchedule} onValueChange={(v) => setFormSchedule(v as Schedule)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:col-span-4">
                <Label>Interval</Label>
                <Input inputMode="numeric" value={formInterval} onChange={(e) => setFormInterval(e.target.value)} placeholder="1" />
                <div className="text-xs text-muted-foreground">Every N days/weeks/months.</div>
              </div>

              <div className="space-y-1 md:col-span-4">
                <Label>Start date</Label>
                <Input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
              </div>

              <div className="space-y-1 md:col-span-4">
                <Label>End date (optional)</Label>
                <Input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
              </div>

              {formSchedule === "weekly" ? (
                <div className="space-y-1 md:col-span-4">
                  <Label>Day of week</Label>
                  <Select value={formDow} onValueChange={(v) => setFormDow(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Mon</SelectItem>
                      <SelectItem value="2">Tue</SelectItem>
                      <SelectItem value="3">Wed</SelectItem>
                      <SelectItem value="4">Thu</SelectItem>
                      <SelectItem value="5">Fri</SelectItem>
                      <SelectItem value="6">Sat</SelectItem>
                      <SelectItem value="0">Sun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {formSchedule === "monthly" ? (
                <div className="space-y-1 md:col-span-4">
                  <Label>Day of month (1-28)</Label>
                  <Input inputMode="numeric" value={formDom} onChange={(e) => setFormDom(e.target.value)} placeholder="1" />
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={() => void save()} disabled={!canSave || saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
