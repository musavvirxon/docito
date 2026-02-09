// File: src/components/financial/ExpenseBreakdownPanel.tsx
// B12: Expense breakdown analytics (monthly totals by category)
// - Uses RPC finance_expense_breakdown(entity_type, entity_id, start_month, end_month)
// - Provides month range and a selected month "Top categories" table
// - Keeps UI consistent with other admin/finance panels

import { useEffect, useMemo, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, PieChart } from "lucide-react";

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type BreakdownRow = {
  month_start: string; // YYYY-MM-01
  currency: string;
  category_id: string;
  category_name: string;
  amount_cents: number; // bigint -> number in JS (safe for typical ranges)
};

function formatMoney(currency: string, cents: number) {
  const v = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}

function monthToDate(month: string) {
  // month: YYYY-MM -> YYYY-MM-01
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  return `${month}-01`;
}

function monthFromDateStr(d: string) {
  // YYYY-MM-01 -> YYYY-MM
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  return d.slice(0, 7);
}

function addMonths(yyyyMm: string, delta: number) {
  const [yStr, mStr] = yyyyMm.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return yyyyMm;
  const date = new Date(Date.UTC(y, m - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + delta);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

function utcNowMonth() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function ExpenseBreakdownPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BreakdownRow[]>([]);

  const [startMonth, setStartMonth] = useState(() => addMonths(utcNowMonth(), -5)); // last 6 months
  const [endMonth, setEndMonth] = useState(() => utcNowMonth());
  const [selectedMonth, setSelectedMonth] = useState(() => utcNowMonth());

  const currency = useMemo(() => rows[0]?.currency || "USD", [rows]);

  const monthsInRange = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(startMonth) || !/^\d{4}-\d{2}$/.test(endMonth)) return [];
    const s = monthToDate(startMonth);
    const e = monthToDate(endMonth);
    if (!s || !e) return [];
    if (e < s) return [];
    const out: string[] = [];
    let cur = startMonth;
    // max 60 months for safety
    for (let i = 0; i < 60; i++) {
      out.push(cur);
      if (cur === endMonth) break;
      cur = addMonths(cur, 1);
    }
    return out;
  }, [startMonth, endMonth]);

  const totalsByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const m = monthFromDateStr(r.month_start);
      map.set(m, (map.get(m) || 0) + (Number(r.amount_cents || 0) || 0));
    }
    const list = monthsInRange
      .slice()
      .reverse()
      .map((m) => ({ month: m, totalCents: map.get(m) || 0 }));
    return list;
  }, [monthsInRange, rows]);

  const selectedMonthRows = useMemo(() => {
    const target = selectedMonth;
    const filtered = rows.filter((r) => monthFromDateStr(r.month_start) === target);
    // Sort by amount desc
    filtered.sort((a, b) => (Number(b.amount_cents || 0) || 0) - (Number(a.amount_cents || 0) || 0));
    return filtered;
  }, [rows, selectedMonth]);

  const topSelected = useMemo(() => selectedMonthRows.slice(0, 12), [selectedMonthRows]);

  const inferredSlices = useMemo(() => {
    // Lightweight heuristics so user sees "Supplies / Taxes / Utilities" quickly.
    const utilTokens = ["electric", "water", "gas", "heating", "rent", "internet", "utility", "utilities"];
    const taxTokens = ["tax", "vat"];
    const suppliesTokens = ["supply", "supplies", "inventory", "materials"];

    let utilities = 0;
    let taxes = 0;
    let supplies = 0;
    let other = 0;

    for (const r of selectedMonthRows) {
      const name = String(r.category_name || "").toLowerCase();
      const amt = Number(r.amount_cents || 0) || 0;

      const isUtil = utilTokens.some((t) => name.includes(t));
      const isTax = taxTokens.some((t) => name.includes(t));
      const isSup = suppliesTokens.some((t) => name.includes(t));

      if (isTax) taxes += amt;
      else if (isSup) supplies += amt;
      else if (isUtil) utilities += amt;
      else other += amt;
    }

    return { utilities, taxes, supplies, other };
  }, [selectedMonthRows]);

  const fetchBreakdown = async () => {
    if (!entityId) return;
    const s = monthToDate(startMonth);
    const e = monthToDate(endMonth);
    if (!s || !e) {
      toast.error("Invalid month range");
      return;
    }
    if (e < s) {
      toast.error("End month must be >= start month");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("finance_expense_breakdown", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_start_month: s,
        p_end_month: e,
      });

      if (error) throw error;

      const result = ((data || []) as any) as BreakdownRow[];
      setRows(result);

      // If selected month is outside the range, snap it
      if (!monthsInRange.includes(selectedMonth)) {
        setSelectedMonth(endMonth);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load expense breakdown");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBreakdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  useEffect(() => {
    // keep selected month inside range if user changes range
    if (monthsInRange.length === 0) return;
    if (!monthsInRange.includes(selectedMonth)) setSelectedMonth(monthsInRange[monthsInRange.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMonth, endMonth]);

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-4 w-4 text-muted-foreground" />
            Expense breakdown
          </CardTitle>
          <div className="text-sm text-muted-foreground">Monthly totals by category (utilities / taxes / supplies included).</div>
        </div>

        <Button variant="outline" onClick={() => void fetchBreakdown()} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Range controls */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Start month</Label>
            <Input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>End month</Label>
            <Input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Selected month</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {monthsInRange.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trend totals */}
        <div className="rounded-md border overflow-hidden">
          <div className="px-3 py-2 text-sm font-medium border-b">Trend (total expenses)</div>
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : totalsByMonth.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No data for selected range.</div>
          ) : (
            <div className="divide-y">
              {totalsByMonth.map((t) => (
                <div key={t.month} className="px-3 py-2 grid grid-cols-12 gap-2 text-sm">
                  <div className="col-span-4 font-mono">{t.month}</div>
                  <div className="col-span-8 text-right">{formatMoney(currency, t.totalCents)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slices summary */}
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Utilities (heuristic)</div>
            <div className="text-sm font-medium">{formatMoney(currency, inferredSlices.utilities)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Taxes (heuristic)</div>
            <div className="text-sm font-medium">{formatMoney(currency, inferredSlices.taxes)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Supplies (heuristic)</div>
            <div className="text-sm font-medium">{formatMoney(currency, inferredSlices.supplies)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Other</div>
            <div className="text-sm font-medium">{formatMoney(currency, inferredSlices.other)}</div>
          </div>
        </div>

        {/* Top categories in selected month */}
        <div className="rounded-md border overflow-hidden">
          <div className="px-3 py-2 text-sm font-medium border-b">Top categories ({selectedMonth})</div>
          {topSelected.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No expenses for this month.</div>
          ) : (
            <div className="divide-y">
              {topSelected.map((r) => (
                <div key={`${r.month_start}-${r.category_id}`} className="px-3 py-2 grid grid-cols-12 gap-2 text-sm">
                  <div className="col-span-8 truncate">{r.category_name}</div>
                  <div className="col-span-4 text-right font-medium">{formatMoney(r.currency, Number(r.amount_cents || 0) || 0)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border p-3 bg-muted/20">
          <div className="text-sm font-medium">Notes</div>
          <div className="text-xs text-muted-foreground mt-1 space-y-1">
            <div>• This uses posted finance expense entries and groups them by month + category.</div>
            <div>• Utilities/taxes/supplies boxes are heuristic based on category names; rename categories to improve grouping.</div>
            <div>• Budget vs Actual remains authoritative for planned vs actual per category.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
