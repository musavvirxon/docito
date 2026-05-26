// File: src/components/finance/FinanceHub.tsx
// Step 31: Add recurring panel under budget section (design consistent)

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Loader2, Download, RefreshCw, DollarSign, TrendingDown, Users, Wallet, PencilLine } from "lucide-react";
import RecurringTemplatesPanel from "@/components/finance/RecurringTemplatesPanel";

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type FinanceAnalyticsResponse = {
  ok: boolean;
  entityType: FinanceEntityType;
  entityId: string;
  range: { from: string; to: string };
  currency: string;
  totals: {
    incomeCents: number;
    expenseCents: number;
    payrollCents: number;
    opCostCents: number;
    netCents: number;
    payrollRatioBps: number;
    opCostRatioBps: number;
  };
  topExpenseCategories: Array<{
    categoryId: string | null;
    name: string;
    kind: string;
    totalCents: number;
  }>;
  topIncomeCategories: Array<{
    categoryId: string | null;
    name: string;
    kind: string;
    totalCents: number;
  }>;
  series: Array<{
    day: string;
    incomeCents: number;
    expenseCents: number;
    payrollCents: number;
    netCents: number;
  }>;
};

type BudgetSummaryResponse = {
  ok: boolean;
  entityType: FinanceEntityType;
  entityId: string;
  monthStart: string;
  monthEndExclusive: string;
  currency: string;
  totals: {
    budgetCents: number;
    actualCents: number;
    varianceCents: number;
    uncategorizedCents: number;
  };
  rows: Array<{
    categoryId: string;
    name: string;
    kind: "expense" | "payroll";
    budgetCents: number;
    actualCents: number;
    varianceCents: number;
  }>;
};

function yyyyMmDd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoFromDateStartLocal(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toISOString();
}

function isoToDateEndExclusiveLocal(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

function monthStartFromDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function formatMoney(currency: string, cents: number) {
  const value = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatPercentBps(bps: number) {
  const v = (Number(bps || 0) || 0) / 100;
  return `${v.toFixed(2)}%`;
}

function centsToInput(cents: number) {
  const v = (Number(cents || 0) || 0) / 100;
  return v === 0 ? "" : v.toFixed(2);
}

function parseMoneyToCents(input: string) {
  const s = String(input || "").trim();
  if (!s) return 0;
  const normalized = s.replace(/,/g, ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return Math.round(n * 100);
}

async function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType || "text/plain" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "export.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FinanceHub(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;




  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return yyyyMmDd(d);
  });
  const [toDate, setToDate] = useState(() => yyyyMmDd(new Date()));

  const [ensuringDefaults, setEnsuringDefaults] = useState(false);

  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<FinanceAnalyticsResponse | null>(null);

  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budget, setBudget] = useState<BudgetSummaryResponse | null>(null);

  const currency = analytics?.currency || budget?.currency || "USD";

  const fromIso = useMemo(() => isoFromDateStartLocal(fromDate), [fromDate]);
  const toIso = useMemo(() => isoToDateEndExclusiveLocal(toDate), [toDate]);

  const monthStart = useMemo(() => monthStartFromDate(toDate), [toDate]);

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [savingBudgets, setSavingBudgets] = useState(false);
  const [budgetEdits, setBudgetEdits] = useState<Record<string, string>>({});

  const budgetRows = useMemo(() => {
    const rows = (budget?.rows || []).slice();
    rows.sort((a, b) => {
      const byKind = a.kind.localeCompare(b.kind);
      if (byKind !== 0) return byKind;
      return a.name.localeCompare(b.name);
    });
    return rows;
  }, [budget?.rows]);

  const ensureDefaults = async () => {
    if (!entityId) return;
    setEnsuringDefaults(true);
    try {
      const { data, error } = await supabase.functions.invoke("finance-ensure-default-categories", {
        body: { entityType, entityId },
      });
      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error || "Failed to ensure defaults");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to initialize finance categories");
    } finally {
      setEnsuringDefaults(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("finance-analytics", {
        body: { entityType, entityId, from: fromIso, to: toIso, groupBy: "day" },
      });
      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error || "Failed to load analytics");
      setAnalytics(data as FinanceAnalyticsResponse);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load finance analytics");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudget = async () => {
    if (!entityId) return;
    setBudgetLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("finance-budget-summary", {
        body: { entityType, entityId, monthStart },
      });
      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error || "Failed to load budget summary");
      setBudget(data as BudgetSummaryResponse);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load budget summary");
      setBudget(null);
    } finally {
      setBudgetLoading(false);
    }
  };

  const refreshAll = async () => {
    await ensureDefaults();
    await Promise.all([fetchAnalytics(), fetchBudget()]);
  };

  const exportEntriesCsv = async () => {
    if (!entityId) return;
    try {
      const { data, error } = await supabase.functions.invoke("finance-export", {
        body: { entityType, entityId, kind: "entries", from: fromIso, to: toIso },
      });
      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error || "Export failed");

      const payload = data as any;
      await downloadTextFile(payload.filename, payload.csv, payload.mimeType || "text/csv");
      toast.success("Export downloaded");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to export");
    }
  };

  const openBudgetEditor = () => {
    const next: Record<string, string> = {};
    for (const r of budgetRows) {
      next[r.categoryId] = centsToInput(r.budgetCents);
    }
    setBudgetEdits(next);
    setBudgetDialogOpen(true);
  };

  const saveBudgets = async () => {
    if (!entityId) return;
    if (budgetRows.length === 0) {
      toast.error("No budget categories found yet.");
      return;
    }

    setSavingBudgets(true);
    try {
      const { data: userResp, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userResp?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const upsertRows: any[] = [];
      for (const r of budgetRows) {
        const raw = budgetEdits[r.categoryId] ?? "";
        const cents = parseMoneyToCents(raw);
        if (cents === null) {
          throw new Error(`Invalid amount for "${r.name}". Use a number like 100 or 100.50`);
        }

        upsertRows.push({
          entity_type: entityType,
          entity_id: entityId,
          category_id: r.categoryId,
          month_start: monthStart,
          budget_cents: cents,
          currency,
          created_by: uid,
        });
      }

      const { error } = await supabase
        .from("finance_budgets")
        .upsert(upsertRows, { onConflict: "entity_type,entity_id,category_id,month_start" });

      if (error) throw error;

      toast.success("Budgets saved");
      setBudgetDialogOpen(false);
      await fetchBudget();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save budgets");
    } finally {
      setSavingBudgets(false);
    }
  };

  useEffect(() => {
    if (!entityId) return;
    void ensureDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, entityType]);

  useEffect(() => {
    if (!entityId) return;
    void fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, entityType, fromIso, toIso]);

  useEffect(() => {
    if (!entityId) return;
    void fetchBudget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, entityType, monthStart]);

  const totals = analytics?.totals;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Finance</CardTitle>
            <div className="text-sm text-muted-foreground">
              Track income, expenses, payroll, and budgets in one place.
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => void refreshAll()}
              disabled={loading || budgetLoading || ensuringDefaults}
              className="gap-2"
            >
              {(loading || budgetLoading || ensuringDefaults) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>

            <Button variant="default" onClick={() => void exportEntriesCsv()} disabled={loading} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Card className="border-muted">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Income</div>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-xl font-semibold">{formatMoney(currency, totals?.incomeCents || 0)}</div>
              </CardHeader>
            </Card>

            <Card className="border-muted">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Expenses</div>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-xl font-semibold">{formatMoney(currency, totals?.expenseCents || 0)}</div>
              </CardHeader>
            </Card>

            <Card className="border-muted">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Payroll</div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-xl font-semibold">{formatMoney(currency, totals?.payrollCents || 0)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatPercentBps(totals?.payrollRatioBps || 0)} of income
                </div>
              </CardHeader>
            </Card>

            <Card className="border-muted">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Net</div>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-xl font-semibold">{formatMoney(currency, totals?.netCents || 0)}</div>
                <div className="text-xs text-muted-foreground">
                  Operating cost: {formatPercentBps(totals?.opCostRatioBps || 0)} of income
                </div>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-muted">
              <CardHeader>
                <CardTitle className="text-base">Top expenses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(analytics?.topExpenseCategories || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No expense data in this range.</div>
                ) : (
                  (analytics?.topExpenseCategories || []).map((c) => (
                    <div key={`${c.categoryId || "null"}:${c.name}`} className="flex items-center justify-between gap-3">
                      <div className="text-sm">{c.name}</div>
                      <div className="text-sm font-medium">{formatMoney(currency, c.totalCents)}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-muted">
              <CardHeader>
                <CardTitle className="text-base">Top income</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(analytics?.topIncomeCategories || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No income data in this range.</div>
                ) : (
                  (analytics?.topIncomeCategories || []).map((c) => (
                    <div key={`${c.categoryId || "null"}:${c.name}`} className="flex items-center justify-between gap-3">
                      <div className="text-sm">{c.name}</div>
                      <div className="text-sm font-medium">{formatMoney(currency, c.totalCents)}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Monthly budget</CardTitle>
            <div className="text-sm text-muted-foreground">Month starting {budget?.monthStart || monthStart}</div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void fetchBudget()} disabled={budgetLoading} className="gap-2">
              {budgetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>

            <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  onClick={openBudgetEditor}
                  disabled={budgetLoading || ensuringDefaults || budgetRows.length === 0}
                  className="gap-2"
                >
                  <PencilLine className="h-4 w-4" />
                  Edit budgets
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-3xl">
                <UiDialogHeader>
                  <UiDialogTitle>Edit monthly budgets</UiDialogTitle>
                  <DialogDescription>
                    Set a target budget per category for <span className="font-medium">{monthStart}</span>. Enter amounts in{" "}
                    {currency}. Leave blank to set 0.
                  </DialogDescription>
                </UiDialogHeader>

                <div className="space-y-4">
                  {budgetRows.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No expense/payroll categories available yet.</div>
                  ) : (
                    <div className="max-h-[55vh] overflow-auto rounded-md border">
                      <div className="grid grid-cols-12 gap-2 p-3 text-xs font-medium text-muted-foreground bg-muted/30">
                        <div className="col-span-6">Category</div>
                        <div className="col-span-2">Kind</div>
                        <div className="col-span-4 text-right">Budget ({currency})</div>
                      </div>

                      <div className="divide-y">
                        {budgetRows.map((r) => (
                          <div key={r.categoryId} className="grid grid-cols-12 gap-2 p-3 items-center">
                            <div className="col-span-6">
                              <div className="text-sm font-medium">{r.name}</div>
                              <div className="text-xs text-muted-foreground">Current spent: {formatMoney(currency, r.actualCents)}</div>
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground">{r.kind}</div>
                            <div className="col-span-4 flex justify-end">
                              <div className="w-[180px]">
                                <Input
                                  inputMode="decimal"
                                  placeholder="0.00"
                                  value={budgetEdits[r.categoryId] ?? ""}
                                  onChange={(e) => setBudgetEdits((prev) => ({ ...prev, [r.categoryId]: e.target.value }))}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-md border p-3 bg-muted/20">
                    <div className="text-sm font-medium">Tip</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Use budgets for supplies, utilities (water/electricity/gas/heating), taxes, rent, maintenance, and payroll. Recurring
                      templates below can auto-generate fixed costs.
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setBudgetDialogOpen(false)} disabled={savingBudgets}>
                    Cancel
                  </Button>
                  <Button onClick={() => void saveBudgets()} disabled={savingBudgets || budgetRows.length === 0}>
                    {savingBudgets ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-muted">
              <CardHeader className="pb-2">
                <div className="text-sm text-muted-foreground">Budget</div>
                <div className="text-lg font-semibold">{formatMoney(currency, budget?.totals.budgetCents || 0)}</div>
              </CardHeader>
            </Card>

            <Card className="border-muted">
              <CardHeader className="pb-2">
                <div className="text-sm text-muted-foreground">Spent</div>
                <div className="text-lg font-semibold">{formatMoney(currency, budget?.totals.actualCents || 0)}</div>
              </CardHeader>
            </Card>

            <Card className="border-muted">
              <CardHeader className="pb-2">
                <div className="text-sm text-muted-foreground">Remaining</div>
                <div className="text-lg font-semibold">{formatMoney(currency, budget?.totals.varianceCents || 0)}</div>
              </CardHeader>
            </Card>
          </div>

          {budgetRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No budget rows yet. Default categories should be created automatically. If this stays empty, add at least one expense entry.
            </div>
          ) : (
            <div className="space-y-3">
              {budgetRows.slice(0, 12).map((r) => {
                const pct = r.budgetCents > 0 ? Math.min(100, Math.round((r.actualCents / r.budgetCents) * 100)) : 0;
                const labelRight =
                  r.budgetCents > 0 ? `${formatMoney(currency, r.actualCents)} / ${formatMoney(currency, r.budgetCents)}` : `${formatMoney(currency, r.actualCents)} / —`;

                return (
                  <div key={r.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm">
                        {r.name} <span className="text-xs text-muted-foreground">({r.kind})</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{labelRight}</div>
                    </div>
                    <Progress value={pct} />
                  </div>
                );
              })}
              {(budgetRows.length || 0) > 12 ? <div className="text-xs text-muted-foreground">Showing first 12 categories.</div> : null}
            </div>
          )}

          {(budget?.totals.uncategorizedCents || 0) > 0 ? (
            <div className="text-xs text-muted-foreground">Uncategorized spending this month: {formatMoney(currency, budget?.totals.uncategorizedCents || 0)}</div>
          ) : null}
        </CardContent>
      </Card>

      {/* Step 31 */}
      <RecurringTemplatesPanel entityType={entityType} entityId={entityId} />
    </div>
  );
}

export default FinanceHub;
