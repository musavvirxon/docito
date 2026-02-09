// File: src/components/financial/RecurringRulesPanel.tsx
// B24: Recurring rules UI (utilities/tax/etc) + "Run due now"
// - Uses RPCs: finance_recurring_rule_list, finance_recurring_rule_upsert, finance_recurring_rule_deactivate
// - Uses Edge Function: finance-recurring-run

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { Loader2, RefreshCw, Repeat, Plus, Play, Trash2, Pencil } from "lucide-react";

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";
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

export default function RecurringRulesPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const today = useMemo(() => new Date(), []);
  const [asOf, setAsOf] = useState(() => isoDate(today));

  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  const [rules, setRules] = useState<RuleRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

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
  const [formCategoryName, setFormCategoryName] = useState<string>("Utilities"); // fallback label when no category id

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
      ]);

      if ((rRes as any).error) throw (rRes as any).error;
      setRules((((rRes as any).data || []) as any) as RuleRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load recurring rules");
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

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
      const created = results.filter((r: any) => r.status === "created").length;
      const skipped = results.filter((r: any) => r.status === "skipped").length;
      const errored = results.filter((r: any) => r.status === "error").length;

      toast.success(`Run complete: ${created} created, ${skipped} skipped, ${errored} errors`);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to run recurring rules");
    } finally {
      setRunning(false);
    }
  };

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
            Running creates finance entries for rules with <span className="font-mono">next_run_date</span> ≤ selected date.
          </div>
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
