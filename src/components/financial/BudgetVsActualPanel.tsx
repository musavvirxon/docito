// File: src/components/financial/BudgetVsActualPanel.tsx
// B5: Budget vs Actual dashboard (summary + top overspend categories)
// - Uses RPC finance_budget_get(budget_period_id)

import { useEffect, useMemo, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

type BudgetRow = {
  budget_period_id: string;
  entity_type: string;
  entity_id: string;
  period_start: string;
  period_end: string;
  budget_currency: string;
  period_label: string | null;
  period_notes: string | null;

  category_id: string;
  category_name: string;

  planned_amount_cents: number;
  actual_amount_cents: number;
  variance_amount_cents: number;

  budget_line_id: string;
};

function formatMoney(currency: string, cents: number) {
  const v = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}

export default function BudgetVsActualPanel(props: { budgetPeriodId: string | null }) {
  const { budgetPeriodId } = props;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BudgetRow[]>([]);

  const currency = useMemo(() => rows[0]?.budget_currency || "USD", [rows]);

  const totals = useMemo(() => {
    const planned = rows.reduce((s, r) => s + (Number(r.planned_amount_cents || 0) || 0), 0);
    const actual = rows.reduce((s, r) => s + (Number(r.actual_amount_cents || 0) || 0), 0);
    const variance = planned - actual;
    return { planned, actual, variance };
  }, [rows]);

  const overspent = useMemo(() => {
    // Overspent means actual > planned => variance < 0
    return [...rows]
      .filter((r) => (Number(r.variance_amount_cents || 0) || 0) < 0)
      .sort((a, b) => (a.variance_amount_cents || 0) - (b.variance_amount_cents || 0)); // most negative first
  }, [rows]);

  const underspent = useMemo(() => {
    return [...rows]
      .filter((r) => (Number(r.variance_amount_cents || 0) || 0) > 0)
      .sort((a, b) => (b.variance_amount_cents || 0) - (a.variance_amount_cents || 0));
  }, [rows]);

  const topOverspent = useMemo(() => overspent.slice(0, 5), [overspent]);
  const topUnderspent = useMemo(() => underspent.slice(0, 5), [underspent]);

  const fetchBudget = async () => {
    if (!budgetPeriodId) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("finance_budget_get", { p_budget_period_id: budgetPeriodId });
      if (error) throw error;
      setRows(((data || []) as any) as BudgetRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load budget vs actual");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBudget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetPeriodId]);

  if (!budgetPeriodId) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">Budget vs Actual</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Select a budget period to view actual spend.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">Budget vs Actual</CardTitle>
          {rows[0] ? (
            <div className="text-sm text-muted-foreground">
              {rows[0].period_start} → {rows[0].period_end}
              {rows[0].period_label ? <span className="ml-2">· {rows[0].period_label}</span> : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No budget lines found.</div>
          )}
        </div>

        <Button variant="outline" onClick={() => void fetchBudget()} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Totals */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Planned</div>
            <div className="text-sm font-medium">{formatMoney(currency, totals.planned)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Actual</div>
            <div className="text-sm font-medium">{formatMoney(currency, totals.actual)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Variance</div>
            <div className="text-sm font-medium">
              {formatMoney(currency, totals.variance)}{" "}
              {totals.variance < 0 ? (
                <span className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" /> overspent
                </span>
              ) : (
                <span className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" /> under budget
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top overspent */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              Top overspent
            </div>
            {topOverspent.length === 0 ? (
              <div className="text-sm text-muted-foreground">No overspent categories.</div>
            ) : (
              <div className="space-y-2">
                {topOverspent.map((r) => (
                  <div key={r.category_id} className="flex items-center justify-between text-sm">
                    <div className="truncate pr-3">{r.category_name}</div>
                    <div className="text-right">
                      <div className="font-medium">{formatMoney(currency, r.actual_amount_cents)}</div>
                      <div className="text-xs text-muted-foreground">
                        planned {formatMoney(currency, r.planned_amount_cents)} ·{" "}
                        <span className="font-medium">{formatMoney(currency, r.variance_amount_cents)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top underspent */}
          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Top under budget
            </div>
            {topUnderspent.length === 0 ? (
              <div className="text-sm text-muted-foreground">No under-budget categories.</div>
            ) : (
              <div className="space-y-2">
                {topUnderspent.map((r) => (
                  <div key={r.category_id} className="flex items-center justify-between text-sm">
                    <div className="truncate pr-3">{r.category_name}</div>
                    <div className="text-right">
                      <div className="font-medium">{formatMoney(currency, r.actual_amount_cents)}</div>
                      <div className="text-xs text-muted-foreground">
                        planned {formatMoney(currency, r.planned_amount_cents)} ·{" "}
                        <span className="font-medium">{formatMoney(currency, r.variance_amount_cents)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Full table */}
        <div className="rounded-md border overflow-hidden">
          <div className="px-3 py-2 text-sm font-medium border-b">All categories</div>
          {rows.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No budget lines in this period.</div>
          ) : (
            <div className="divide-y">
              {rows.map((r) => {
                const variance = Number(r.variance_amount_cents || 0) || 0;
                return (
                  <div key={r.budget_line_id} className="p-3 grid gap-2 md:grid-cols-12 md:items-center">
                    <div className="md:col-span-4">
                      <div className="text-sm font-medium">{r.category_name}</div>
                      <div className="text-xs text-muted-foreground">category id: {r.category_id}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs text-muted-foreground">Planned</div>
                      <div className="text-sm">{formatMoney(currency, r.planned_amount_cents)}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs text-muted-foreground">Actual</div>
                      <div className="text-sm">{formatMoney(currency, r.actual_amount_cents)}</div>
                    </div>
                    <div className="md:col-span-4">
                      <div className="text-xs text-muted-foreground">Variance</div>
                      <div className="text-sm font-medium">
                        {formatMoney(currency, variance)}{" "}
                        <span className="text-xs text-muted-foreground">
                          {variance < 0 ? "· over" : "· under"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-md border p-3 bg-muted/20">
          <div className="text-sm font-medium">Notes</div>
          <div className="text-xs text-muted-foreground mt-1 space-y-1">
            <div>• Actual spend is computed from finance expense entries in the same category and period.</div>
            <div>• If you post utilities/tax/supplies as expenses, they will show here automatically.</div>
            <div>• Next steps can add recurring expense autopost to keep utilities/taxes consistent.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
