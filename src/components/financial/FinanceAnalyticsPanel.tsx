// File: src/components/financial/FinanceAnalyticsPanel.tsx
// B21: Finance Analytics panel (monthly trend + category breakdown)
// - Calls Supabase RPCs: finance_analytics_monthly, finance_analytics_category_totals
// - Shows KPIs and charts (Recharts) with existing UI style

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Loader2, RefreshCw, BarChart3 } from "lucide-react";

import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";
type EntryType = "income" | "expense" | "payroll";

type MonthlyRow = {
  month: string;
  entry_type: EntryType;
  amount_cents: number;
};

type CategoryRow = {
  category_id: string | null;
  category_name: string;
  entry_type: EntryType;
  amount_cents: number;
};

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayISO(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  return dt.toISOString();
}

function endOfDayISO(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
  return dt.toISOString();
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

function monthLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function centsToMajor(cents: number) {
  return (Number(cents || 0) || 0) / 100;
}

export default function FinanceAnalyticsPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const today = useMemo(() => new Date(), []);
  const [dateFrom, setDateFrom] = useState(() => isoDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [dateTo, setDateTo] = useState(() => isoDate(today));
  const [categoryType, setCategoryType] = useState<"all" | EntryType>("all");

  const [loading, setLoading] = useState(false);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryRow[]>([]);
  const [currencyHint, setCurrencyHint] = useState("USD");

  const load = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const fromIso = startOfDayISO(dateFrom);
      const toIso = endOfDayISO(dateTo);

      const [mRes, cRes] = await Promise.all([
        supabase.rpc("finance_analytics_monthly", {
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_date_from: fromIso,
          p_date_to: toIso,
        }),
        supabase.rpc("finance_analytics_category_totals", {
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_date_from: fromIso,
          p_date_to: toIso,
          p_entry_type: categoryType === "all" ? null : categoryType,
        }),
      ]);

      if (mRes.error) throw mRes.error;
      if (cRes.error) throw cRes.error;

      const m = (mRes.data || []) as any as MonthlyRow[];
      const c = (cRes.data || []) as any as CategoryRow[];

      setMonthly(m);
      setCategoryTotals(c);

      // Best-effort currency hint: look up any entry in range
      const { data: sample, error: sErr } = await supabase
        .from("finance_entries")
        .select("currency")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .gte("occurred_at", fromIso)
        .lte("occurred_at", toIso)
        .order("occurred_at", { ascending: false })
        .limit(1);

      if (!sErr && sample?.[0]?.currency) setCurrencyHint(String(sample[0].currency).toUpperCase());
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load analytics");
      setMonthly([]);
      setCategoryTotals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const monthlySeries = useMemo(() => {
    const byMonth: Record<string, { month: string; income: number; expense: number; payroll: number; net: number }> = {};
    for (const r of monthly) {
      const key = r.month;
      if (!byMonth[key]) byMonth[key] = { month: key, income: 0, expense: 0, payroll: 0, net: 0 };
      const v = Number(r.amount_cents || 0) || 0;
      if (r.entry_type === "income") byMonth[key].income += v;
      if (r.entry_type === "expense") byMonth[key].expense += v;
      if (r.entry_type === "payroll") byMonth[key].payroll += v;
    }

    const list = Object.values(byMonth).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    for (const it of list) it.net = it.income - it.expense - it.payroll;

    return list.map((it) => ({
      month: monthLabel(it.month),
      income: centsToMajor(it.income),
      expense: centsToMajor(it.expense),
      payroll: centsToMajor(it.payroll),
      net: centsToMajor(it.net),
    }));
  }, [monthly]);

  const kpis = useMemo(() => {
    let income = 0;
    let expense = 0;
    let payroll = 0;

    for (const r of monthly) {
      const v = Number(r.amount_cents || 0) || 0;
      if (r.entry_type === "income") income += v;
      if (r.entry_type === "expense") expense += v;
      if (r.entry_type === "payroll") payroll += v;
    }

    const net = income - expense - payroll;
    return { income, expense, payroll, net };
  }, [monthly]);

  const categoryTable = useMemo(() => {
    // Transform to display in a single list for the currently selected type filter
    const list = (categoryTotals || []).map((r) => ({
      key: `${r.entry_type}:${r.category_id || "null"}`,
      entry_type: r.entry_type,
      category_name: r.category_name || "Uncategorized",
      amount_cents: Number(r.amount_cents || 0) || 0,
    }));

    // If "all", keep grouping by entry_type. Otherwise just list.
    return list;
  }, [categoryTotals]);

  const canLoad = useMemo(() => {
    if (!entityId) return false;
    if (!dateFrom.trim() || !dateTo.trim()) return false;
    return true;
  }, [dateFrom, dateTo, entityId]);

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Analytics
          </CardTitle>
          <div className="text-sm text-muted-foreground">Monthly trend + category breakdown for the selected period.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              <Label>Date from</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Date to</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label>Category breakdown</Label>
              <Select value={categoryType} onValueChange={(v) => setCategoryType(v as any)}>
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

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Income</div>
            <div className="text-sm font-medium">{formatMoney(currencyHint, kpis.income)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Expenses</div>
            <div className="text-sm font-medium">{formatMoney(currencyHint, kpis.expense)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Payroll</div>
            <div className="text-sm font-medium">{formatMoney(currencyHint, kpis.payroll)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Net</div>
            <div className="text-sm font-medium">{formatMoney(currencyHint, kpis.net)}</div>
          </div>
        </div>

        {/* Monthly chart */}
        <div className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-medium">Monthly trend</div>
          <div className="text-xs text-muted-foreground">Income, expenses, payroll (bars) and net (line). Refunds/reversals are included automatically.</div>

          <div className="h-[320px] w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading chart…
              </div>
            ) : monthlySeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No data for this range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" name="Income" />
                  <Bar dataKey="expense" name="Expenses" />
                  <Bar dataKey="payroll" name="Payroll" />
                  <Line type="monotone" dataKey="net" name="Net" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="rounded-md border overflow-hidden">
          <div className="px-3 py-2 border-b">
            <div className="text-sm font-medium">Category breakdown</div>
            <div className="text-xs text-muted-foreground">
              Top categories by total in this period ({categoryType === "all" ? "all types" : categoryType}).
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
            <div className="col-span-2">Type</div>
            <div className="col-span-7">Category</div>
            <div className="col-span-3 text-right">Total</div>
          </div>

          {loading ? (
            <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : categoryTable.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No category totals for this range.</div>
          ) : (
            <div className="divide-y">
              {categoryTable.slice(0, 30).map((r) => (
                <div key={r.key} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center">
                  <div className="col-span-2 text-muted-foreground">{r.entry_type}</div>
                  <div className="col-span-7 truncate">{r.category_name}</div>
                  <div className="col-span-3 text-right font-medium">{formatMoney(currencyHint, r.amount_cents)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
