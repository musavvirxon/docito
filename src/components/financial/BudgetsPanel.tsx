// File: src/components/financial/BudgetsPanel.tsx

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, PiggyBank, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import type { FinanceEntityType } from "@/components/financial/FinanceHub";
import { supabase } from "@/integrations/supabase/client";
import { useBudgetSummary } from "@/hooks/useBudgetSummary";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function firstDayOfMonthIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function formatCurrency(cents: number, currency: string = "USD") {
  const v = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}

function parseMoneyToCents(v: string) {
  const n = Number(String(v || "").replaceAll(",", "").trim());
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToMoneyInput(cents: number) {
  const n = (Number(cents || 0) || 0) / 100;
  return n.toFixed(2);
}

function monthValueFromMonthStart(monthStart: string) {
  // YYYY-MM-DD -> YYYY-MM
  return monthStart.slice(0, 7);
}

function monthStartFromMonthValue(month: string) {
  // YYYY-MM -> YYYY-MM-01
  if (!month || month.length < 7) return "";
  return `${month}-01`;
}

type BudgetEditMap = Record<string, string>; // categoryId -> "12.34"

interface Props {
  entityType: FinanceEntityType;
  entityId: string;
}

export default function BudgetsPanel({ entityType, entityId }: Props) {
  const defaultMonthStart = useMemo(() => firstDayOfMonthIso(new Date()), []);
  const [monthStart, setMonthStart] = useState<string>(defaultMonthStart);

  const { loading, data, error, refresh } = useBudgetSummary({ entityType, entityId, monthStart });

  const currency = data?.currency || "USD";
  const rows = data?.rows || [];
  const totals = data?.totals || {
    budgetCents: 0,
    actualCents: 0,
    varianceCents: 0,
    uncategorizedCents: 0,
  };

  const [edits, setEdits] = useState<BudgetEditMap>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    // reset edits when data changes
    const next: BudgetEditMap = {};
    for (const r of rows) next[r.categoryId] = centsToMoneyInput(r.budgetCents || 0);
    setEdits(next);
  }, [rows, monthStart]);

  const onMonthChange = (v: string) => {
    const ms = monthStartFromMonthValue(v);
    if (!ms) return;
    setMonthStart(ms);
  };

  const setEdit = (categoryId: string, val: string) => {
    setEdits((p) => ({ ...p, [categoryId]: val }));
  };

  const saveOne = async (categoryId: string) => {
    const row = rows.find((r) => r.categoryId === categoryId);
    if (!row) return;

    const cents = parseMoneyToCents(edits[categoryId] ?? "0");
    if (cents < 0) {
      toast.error("Budget cannot be negative");
      return;
    }

    try {
      setSavingId(categoryId);

      const payload = {
        entity_type: entityType,
        entity_id: entityId,
        month_start: monthStart,
        category_id: categoryId,
        amount_cents: cents,
        currency,
      };

      const { error: upErr } = await supabase.from("finance_budgets").upsert(payload, {
        onConflict: "entity_type,entity_id,month_start,category_id",
      });

      if (upErr) throw upErr;

      toast.success("Budget saved");
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save budget");
    } finally {
      setSavingId(null);
    }
  };

  const varianceLabel = (cents: number) => {
    // positive variance means under budget (budget - actual)
    if (cents > 0) return "Under";
    if (cents < 0) return "Over";
    return "On";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Budgets</h3>
          <Badge variant="secondary">Monthly</Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="month"
            value={monthValueFromMonthStart(monthStart)}
            onChange={(e) => onMonthChange(e.target.value)}
            disabled={loading}
            className="w-[160px]"
          />
          <Button variant="outline" onClick={refresh} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Budget total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totals.budgetCents, currency)}</div>
            <div className="text-xs text-muted-foreground">Sum of category budgets</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Actual cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totals.actualCents, currency)}</div>
            <div className="text-xs text-muted-foreground">Expenses + payroll in month</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totals.varianceCents, currency)}</div>
            <div className="text-xs text-muted-foreground">
              {varianceLabel(totals.varianceCents)} budget (budget − actual)
            </div>
          </CardContent>
        </Card>
      </div>

      {totals.uncategorizedCents > 0 ? (
        <Card>
          <CardContent className="py-4 text-sm flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <div className="font-medium">Uncategorized spending detected</div>
              <div className="text-muted-foreground">
                Uncategorized actual: <span className="font-medium text-foreground">{formatCurrency(totals.uncategorizedCents, currency)}</span>. Categorize entries to improve budget reporting.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget vs actual (by category)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">Category</TableHead>
                  <TableHead className="w-[120px]">Kind</TableHead>
                  <TableHead className="w-[200px]">Budget</TableHead>
                  <TableHead className="text-right w-[180px]">Actual</TableHead>
                  <TableHead className="text-right w-[180px]">Variance</TableHead>
                  <TableHead className="text-right w-[110px]"> </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No expense/payroll categories found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const val = edits[r.categoryId] ?? "0.00";
                    const isSaving = savingId === r.categoryId;

                    return (
                      <TableRow key={r.categoryId}>
                        <TableCell className="text-sm font-medium">{r.name}</TableCell>
                        <TableCell className="text-sm capitalize">{r.kind}</TableCell>
                        <TableCell className="text-sm">
                          <Input
                            value={val}
                            onChange={(e) => setEdit(r.categoryId, e.target.value)}
                            disabled={loading || isSaving}
                            inputMode="decimal"
                            className="w-[170px]"
                          />
                          <div className="text-xs text-muted-foreground mt-1">{currency}</div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(r.actualCents || 0, currency)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(r.varianceCents || 0, currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => saveOne(r.categoryId)}
                            disabled={loading || isSaving}
                            className="gap-2"
                          >
                            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
