// File: src/components/financial/FinanceOverview.tsx

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { useEntityFinanceSummary } from "@/hooks/useEntityFinanceSummary";
import type { FinanceEntityType } from "@/components/financial/FinanceHub";

type DaysPreset = "7" | "30" | "90";

interface FinanceOverviewProps {
  entityType: FinanceEntityType;
  entityId: string;
}

const formatCurrency = (cents: number, currency: string = "USD") => {
  const value = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

export default function FinanceOverview({ entityType, entityId }: FinanceOverviewProps) {
  const [days, setDays] = useState<DaysPreset>("30");

  const { data, loading, refresh } = useEntityFinanceSummary({
    entityType,
    entityId,
    days: Number(days),
  });

  const currency = data?.currency || "USD";

  const totals = data?.totals || {
    entriesCount: 0,
    incomeCents: 0,
    expenseCents: 0,
    netCents: 0,
  };

  const chartData = useMemo(() => {
    const rows = data?.daily || [];
    return rows.map((r) => ({
      date: r.date,
      income: (r.incomeCents || 0) / 100,
      expense: (r.expenseCents || 0) / 100,
      net: (r.netCents || 0) / 100,
    }));
  }, [data]);

  const topExpense = data?.breakdown?.topExpenseCategories || [];
  const topIncome = data?.breakdown?.topIncomeCategories || [];

  const handleRefresh = async () => {
    try {
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to refresh finance overview");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">Overview</h3>
          <Badge variant="secondary">Ledger-based</Badge>
        </div>

        <div className="flex items-center gap-3">
          <Select value={days} onValueChange={(v) => setDays(v as DaysPreset)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleRefresh} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totals.incomeCents, currency)}</div>
            <div className="text-xs text-muted-foreground">{totals.entriesCount} entries (range)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totals.expenseCents, currency)}</div>
            <div className="text-xs text-muted-foreground">Includes payroll entries</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Net</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totals.netCents, currency)}</div>
            <div className="text-xs text-muted-foreground">Income - expenses</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="income" name="Income" dot={false} />
                <Line type="monotone" dataKey="expense" name="Expenses" dot={false} />
                <Line type="monotone" dataKey="net" name="Net" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top income categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topIncome.length === 0 && (
              <div className="text-sm text-muted-foreground">No categorized income entries yet.</div>
            )}
            {topIncome.map((c) => (
              <div key={c.categoryId ?? c.name} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.count} entries</div>
                </div>
                <div className="text-sm font-semibold">{formatCurrency(c.amountCents, currency)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top expense categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topExpense.length === 0 && (
              <div className="text-sm text-muted-foreground">No categorized expense entries yet.</div>
            )}
            {topExpense.map((c) => (
              <div key={c.categoryId ?? c.name} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.count} entries</div>
                </div>
                <div className="text-sm font-semibold">{formatCurrency(c.amountCents, currency)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
