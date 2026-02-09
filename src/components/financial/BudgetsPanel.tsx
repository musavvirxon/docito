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

import { Loader2, RefreshCw, Wallet, Plus, Pencil } from "lucide-react";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";
type EntryType = "income" | "expense" | "payroll";

type CategoryRow = {
  id: string;
  kind: "income" | "expense" | "payroll";
  name: string;
};

type BudgetRow = {
  id: string;
  month: string; // date
  entry_type: EntryType;
  category_id: string | null;
  amount_cents: number;
  currency: string;
  updated_at: string;
};

type VsRow = {
  month: string; // date
  entry_type: EntryType;
  category_id: string | null;
  category_name: string;
  budget_cents: number;
  actual_cents: number;
  variance_cents: number;
};

function isoMonth(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function addMonths(firstDay: string, delta: number) {
  const d = new Date(`${firstDay}T00:00:00.000Z`);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const nd = new Date(Date.UTC(y, m + delta, 1, 0, 0, 0));
  return isoMonth(new Date(nd.getTime()));
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

function monthLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

export default function BudgetsPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const now = useMemo(() => new Date(), []);
  const [monthFrom, setMonthFrom] = useState(() => isoMonth(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))));
  const [monthTo, setMonthTo] = useState(() => isoMonth(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))));
  const [filterEntryType, setFilterEntryType] = useState<"all" | EntryType>("all");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [vs, setVs] = useState<VsRow[]>([]);

  // dialog
  const [open, setOpen] = useState(false);
  const [editBudgetId, setEditBudgetId] = useState<string | null>(null);

  const [formMonth, setFormMonth] = useState(() => isoMonth(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))));
  const [formEntryType, setFormEntryType] = useState<EntryType>("expense");
  const [formCategoryId, setFormCategoryId] = useState<string>("overall"); // "overall" | uuid
  const [formCurrency, setFormCurrency] = useState("USD");
  const [formAmount, setFormAmount] = useState("");

  const canLoad = useMemo(() => Boolean(entityId && monthFrom && monthTo), [entityId, monthFrom, monthTo]);

  const relevantCategories = useMemo(() => {
    if (formEntryType === "income") return categories.filter((c) => c.kind === "income");
    if (formEntryType === "expense") return categories.filter((c) => c.kind === "expense");
    return categories.filter((c) => c.kind === "payroll");
  }, [categories, formEntryType]);

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
      const [bRes, vRes] = await Promise.all([
        supabase.rpc("finance_budget_list", {
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_month_from: monthFrom,
          p_month_to: monthTo,
        }),
        supabase.rpc("finance_budget_vs_actual", {
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_month_from: monthFrom,
          p_month_to: monthTo,
          p_entry_type: filterEntryType === "all" ? null : filterEntryType,
        }),
        loadCategories(),
      ]);

      if ((bRes as any).error) throw (bRes as any).error;
      if ((vRes as any).error) throw (vRes as any).error;

      setBudgets(((bRes as any).data || []) as any);
      setVs(((vRes as any).data || []) as any);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load budgets");
      setBudgets([]);
      setVs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const currencyHint = useMemo(() => {
    const b = budgets[0]?.currency;
    if (b) return String(b).toUpperCase();
    return "USD";
  }, [budgets]);

  const resetForm = () => {
    setEditBudgetId(null);
    setFormMonth(isoMonth(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))));
    setFormEntryType("expense");
    setFormCategoryId("overall");
    setFormCurrency(currencyHint || "USD");
    setFormAmount("");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (b: BudgetRow) => {
    setEditBudgetId(b.id);
    setFormMonth(String(b.month));
    setFormEntryType(b.entry_type);
    setFormCategoryId(b.category_id ? b.category_id : "overall");
    setFormCurrency(String(b.currency || "USD").toUpperCase());
    setFormAmount(((Number(b.amount_cents || 0) || 0) / 100).toFixed(2));
    setOpen(true);
  };

  const canSave = useMemo(() => {
    const cents = parseMajorToCents(formAmount);
    if (!entityId) return false;
    if (!formMonth) return false;
    if (!formEntryType) return false;
    if (cents === null || cents < 0) return false;
    return true;
  }, [entityId, formAmount, formEntryType, formMonth]);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const cents = parseMajorToCents(formAmount);
      if (cents === null || cents < 0) throw new Error("Invalid amount");

      const categoryId = formCategoryId === "overall" ? null : formCategoryId;

      const { data, error } = await supabase.rpc("finance_budget_upsert", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_month: formMonth,
        p_entry_type: formEntryType,
        p_amount_cents: cents,
        p_currency: normalizeCurrency(formCurrency),
        p_category_id: categoryId,
      });

      if (error) throw error;

      const id = Array.isArray(data) ? data[0]?.budget_id : (data as any)?.budget_id;
      if (!id) throw new Error("Save failed");

      toast.success(editBudgetId ? "Budget updated" : "Budget created/updated");
      setOpen(false);
      resetForm();
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  const vsFiltered = useMemo(() => {
    if (filterEntryType === "all") return vs;
    return vs.filter((r) => r.entry_type === filterEntryType);
  }, [filterEntryType, vs]);

  const totals = useMemo(() => {
    let budget = 0;
    let actual = 0;
    for (const r of vsFiltered) {
      budget += Number(r.budget_cents || 0) || 0;
      actual += Number(r.actual_cents || 0) || 0;
    }
    return { budget, actual, variance: budget - actual };
  }, [vsFiltered]);

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Budgets
          </CardTitle>
          <div className="text-sm text-muted-foreground">Set monthly budgets and compare against actuals.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add budget
          </Button>
          <Button variant="outline" onClick={() => void load()} disabled={!canLoad || loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="rounded-md border p-3 space-y-3">
          <div className="text-sm font-medium">Filters</div>
          <div className="grid gap-3 md:grid-cols-12">
            <div className="space-y-1 md:col-span-3">
              <Label>Month from</Label>
              <Input type="month" value={monthFrom.slice(0, 7)} onChange={(e) => setMonthFrom(`${e.target.value}-01`)} />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Month to</Label>
              <Input type="month" value={monthTo.slice(0, 7)} onChange={(e) => setMonthTo(`${e.target.value}-01`)} />
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label>Entry type</Label>
              <Select value={filterEntryType} onValueChange={(v) => setFilterEntryType(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="payroll">Payroll</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-end justify-end">
              <Button variant="outline" onClick={() => void load()} disabled={!canLoad || loading} className="gap-2 w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Apply
              </Button>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Budget total</div>
            <div className="text-sm font-medium">{formatMoney(currencyHint, totals.budget)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Actual total</div>
            <div className="text-sm font-medium">{formatMoney(currencyHint, totals.actual)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Variance (budget - actual)</div>
            <div className="text-sm font-medium">{formatMoney(currencyHint, totals.variance)}</div>
          </div>
        </div>

        {/* Budgets list */}
        <div className="rounded-md border overflow-hidden">
          <div className="px-3 py-2 border-b">
            <div className="text-sm font-medium">Budgets</div>
            <div className="text-xs text-muted-foreground">Click edit to change amounts (upsert by month/type/category).</div>
          </div>

          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
            <div className="col-span-3">Month</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-5">Category</div>
            <div className="col-span-1 text-right">Amount</div>
            <div className="col-span-1 text-right">Edit</div>
          </div>

          {loading ? (
            <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : budgets.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No budgets in this range.</div>
          ) : (
            <div className="divide-y">
              {budgets.map((b) => {
                const catName =
                  b.category_id === null
                    ? "Overall"
                    : categories.find((c) => c.id === b.category_id)?.name || "Uncategorized";

                return (
                  <div key={b.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center">
                    <div className="col-span-3 font-mono">{monthLabel(b.month)}</div>
                    <div className="col-span-2 text-muted-foreground">{b.entry_type}</div>
                    <div className="col-span-5 truncate">{catName}</div>
                    <div className="col-span-1 text-right font-medium">{formatMoney(b.currency, b.amount_cents)}</div>
                    <div className="col-span-1 text-right">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(b)} disabled={saving}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Budget vs actual */}
        <div className="rounded-md border overflow-hidden">
          <div className="px-3 py-2 border-b">
            <div className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Budget vs Actual
            </div>
            <div className="text-xs text-muted-foreground">Monthly/category variance. For income, variance is budget - actual.</div>
          </div>

          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
            <div className="col-span-3">Month</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-4">Category</div>
            <div className="col-span-1 text-right">Budget</div>
            <div className="col-span-1 text-right">Actual</div>
            <div className="col-span-1 text-right">Var</div>
          </div>

          {loading ? (
            <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : vsFiltered.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No budget vs actual rows for this range.</div>
          ) : (
            <div className="divide-y">
              {vsFiltered.slice(0, 100).map((r, idx) => (
                <div key={`${r.month}-${r.entry_type}-${r.category_id ?? "overall"}-${idx}`} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center">
                  <div className="col-span-3 font-mono">{monthLabel(r.month)}</div>
                  <div className="col-span-2 text-muted-foreground">{r.entry_type}</div>
                  <div className="col-span-4 truncate">{r.category_name || "Overall"}</div>
                  <div className="col-span-1 text-right font-medium">{formatMoney(currencyHint, r.budget_cents)}</div>
                  <div className="col-span-1 text-right font-medium">{formatMoney(currencyHint, r.actual_cents)}</div>
                  <div className="col-span-1 text-right font-medium">{formatMoney(currencyHint, r.variance_cents)}</div>
                </div>
              ))}
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

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editBudgetId ? "Edit budget" : "Add budget"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-12">
              <div className="space-y-1 md:col-span-4">
                <Label>Month</Label>
                <Input
                  type="month"
                  value={formMonth.slice(0, 7)}
                  onChange={(e) => setFormMonth(`${e.target.value}-01`)}
                />
              </div>

              <div className="space-y-1 md:col-span-4">
                <Label>Entry type</Label>
                <Select value={formEntryType} onValueChange={(v) => setFormEntryType(v as EntryType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Expense" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="payroll">Payroll</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:col-span-4">
                <Label>Currency</Label>
                <Input value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)} placeholder="USD" />
              </div>

              <div className="space-y-1 md:col-span-8">
                <Label>Category</Label>
                <Select value={formCategoryId} onValueChange={(v) => setFormCategoryId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Overall" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overall">Overall</SelectItem>
                    {relevantCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground mt-1">Overall budget is stored with category_id = null.</div>
              </div>

              <div className="space-y-1 md:col-span-4">
                <Label>Amount</Label>
                <Input inputMode="decimal" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" />
              </div>
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
