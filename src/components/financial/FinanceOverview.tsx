// File: src/components/financial/FinanceOverview.tsx

import { useMemo, useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Wallet, Percent, CalendarDays } from "lucide-react";
import { toast } from "sonner";

import type { FinanceEntityType } from "@/components/financial/FinanceHub";
import { useFinanceAnalytics } from "@/hooks/useFinanceAnalytics";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

function formatCurrency(cents: number, currency: string = "USD") {
  const v = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}

function formatBps(bps: number) {
  const pct = (Number(bps || 0) || 0) / 100;
  return `${pct.toFixed(2)}%`;
}

function miniBarWidth(value: number, max: number) {
  if (max <= 0) return "0%";
  const p = Math.max(0, Math.min(1, value / max));
  return `${Math.round(p * 100)}%`;
}

interface Props {
  entityType: FinanceEntityType;
  entityId: string;
}

export default function FinanceOverview({ entityType, entityId }: Props) {
  // Default: last 30 days (date-only, converted to ISO range by appending times)
  const today = startOfToday();
  const defaultFrom = isoDay(addDays(today, -30));
  const defaultTo = isoDay(addDays(today, 1)); // exclusive

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  const fromIso = useMemo(() => new Date(`${fromDate}T00:00:00.000Z`).toISOString(), [fromDate]);
  const toIso = useMemo(() => new Date(`${toDate}T00:00:00.000Z`).toISOString(), [toDate]);

  const { loading, data, error, refresh } = useFinanceAnalytics({
    entityType,
    entityId,
    from: fromIso,
    to: toIso,
  });

  const currency = data?.currency || "USD";

  const totals = data?.totals || {
    incomeCents: 0,
    expenseCents: 0,
    payrollCents: 0,
    opCostCents: 0,
    netCents: 0,
    payrollRatioBps: 0,
    opCostRatioBps: 0,
  };

  const topExpense = data?.topExpenseCategories || [];
  const topIncome = data?.topIncomeCategories || [];

  const maxExpense = useMemo(() => Math.max(0, ...topExpense.map((x) => Number(x.totalCents || 0))), [topExpense]);
  const maxIncome = useMemo(() => Math.max(0, ...topIncome.map((x) => Number(x.totalCents || 0))), [topIncome]);

  const series = data?.series || [];
  const maxSeriesValue = useMemo(() => {
    let m = 0;
    for (const s of series) {
      m = Math.max(m, Number(s.incomeCents || 0), Number(s.expenseCents || 0) + Number(s.payrollCents || 0));
    }
    return m;
  }, [series]);

  const onApplyRange = async () => {
    if (!fromDate || !toDate) {
      toast.error("Please select a valid date range");
      return;
    }
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Overview</h3>
          <Badge variant="secondary">Analytics</Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              disabled={loading}
              className="w-[155px]"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              disabled={loading}
              className="w-[155px]"
            />
          </div>

          <Button variant="outline" onClick={onApplyRange} disabled={loading} className="gap-2">
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
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totals.incomeCents, currency)}</div>
            <div className="text-xs text-muted-foreground">Total income in range</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Operating cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totals.opCostCents, currency)}</div>
            <div className="text-xs text-muted-foreground">
              Expense + payroll ({formatBps(totals.opCostRatioBps)} of income)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Net
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totals.netCents, currency)}</div>
            <div className="text-xs text-muted-foreground">Income − (expense + payroll)</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Trend (daily)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : series.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No entries in this range.</div>
            ) : (
              <div className="space-y-2">
                {series.slice(-14).map((d) => {
                  const cost = (d.expenseCents || 0) + (d.payrollCents || 0);
                  const incomeW = miniBarWidth(d.incomeCents || 0, maxSeriesValue);
                  const costW = miniBarWidth(cost, maxSeriesValue);

                  return (
                    <div key={d.day} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{d.day}</span>
                        <span>
                          Net: <span className="font-medium text-foreground">{formatCurrency(d.netCents || 0, currency)}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-1">
                        <div className="h-2 rounded bg-muted overflow-hidden">
                          <div className="h-2 bg-foreground/70 rounded" style={{ width: incomeW }} />
                        </div>
                        <div className="h-2 rounded bg-muted overflow-hidden">
                          <div className="h-2 bg-foreground/30 rounded" style={{ width: costW }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Income: {formatCurrency(d.incomeCents || 0, currency)}</span>
                        <span>Cost: {formatCurrency(cost, currency)}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="text-xs text-muted-foreground pt-2">
                  Bars: top = income, bottom = cost (expense + payroll). Last 14 days shown.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              Payroll ratio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold">{formatBps(totals.payrollRatioBps)}</div>
            <div className="text-sm text-muted-foreground">
              Payroll: <span className="font-medium text-foreground">{formatCurrency(totals.payrollCents, currency)}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Expense: <span className="font-medium text-foreground">{formatCurrency(totals.expenseCents, currency)}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Income: <span className="font-medium text-foreground">{formatCurrency(totals.incomeCents, currency)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top expense categories</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right w-[160px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="py-10 text-center text-sm text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : topExpense.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="py-10 text-center text-sm text-muted-foreground">
                        No expense categories found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    topExpense.map((c) => (
                      <TableRow key={`${c.kind}:${c.categoryId || c.name}`}>
                        <TableCell className="text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium">{c.name}</span>
                            <span className="text-xs text-muted-foreground capitalize">{c.kind}</span>
                          </div>
                          <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
                            <div
                              className="h-2 bg-foreground/40 rounded"
                              style={{ width: miniBarWidth(c.totalCents || 0, maxExpense) }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(c.totalCents || 0, currency)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top income categories</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right w-[160px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="py-10 text-center text-sm text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : topIncome.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="py-10 text-center text-sm text-muted-foreground">
                        No income categories found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    topIncome.map((c) => (
                      <TableRow key={`${c.kind}:${c.categoryId || c.name}`}>
                        <TableCell className="text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium">{c.name}</span>
                            <span className="text-xs text-muted-foreground capitalize">{c.kind}</span>
                          </div>
                          <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
                            <div
                              className="h-2 bg-foreground/40 rounded"
                              style={{ width: miniBarWidth(c.totalCents || 0, maxIncome) }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(c.totalCents || 0, currency)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
