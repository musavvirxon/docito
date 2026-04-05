import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, DollarSign, Receipt, Wallet, TrendingUp, Loader2, RefreshCcw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { FinanceEntityType } from "@/components/financial/FinanceHub";
import { useFinanceAnalytics } from "@/hooks/useFinanceAnalytics";

type Props = {
  entityType: FinanceEntityType;
  entityId: string;
  locationId?: string | null;
};

function isoForDaysAgo(days: number) {
  const now = new Date();
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function formatCents(cents: number, currency: string) {
  const cur = (currency || "USD").toUpperCase();
  const value = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(value);
  } catch {
    return `${cur} ${value.toFixed(2)}`;
  }
}

function bpsToPct(bps: number) {
  return (Number(bps || 0) || 0) / 100;
}

export default function FinanceOverview({ entityType, entityId, locationId }: Props) {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");

  const { from, to } = useMemo(() => {
    const nowIso = new Date().toISOString();
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    return { from: isoForDaysAgo(days), to: nowIso };
  }, [range]);

  const { loading, data, error, refresh } = useFinanceAnalytics({
    entityType,
    entityId,
    from,
    to,
    locationId: locationId || undefined,
  });

  const currency = data?.currency || "USD";

  const cards = useMemo(() => {
    const totals = data?.totals;
    const income = totals?.incomeCents ?? 0;
    const expense = totals?.expenseCents ?? 0;
    const payroll = totals?.payrollCents ?? 0;
    const net = totals?.netCents ?? 0;

    const payrollPct = bpsToPct(totals?.payrollRatioBps ?? 0);
    const opCostPct = bpsToPct(totals?.opCostRatioBps ?? 0);

    return [
      {
        label: "Income",
        value: formatCents(income, currency),
        icon: <DollarSign className="h-5 w-5 text-primary" />,
        hint: "Total income",
      },
      {
        label: "Expenses",
        value: formatCents(expense, currency),
        icon: <Receipt className="h-5 w-5 text-primary" />,
        hint: "Non-payroll expenses",
      },
      {
        label: "Payroll",
        value: formatCents(payroll, currency),
        icon: <Wallet className="h-5 w-5 text-primary" />,
        hint: `${payrollPct.toFixed(1)}% of income`,
      },
      {
        label: "Net",
        value: formatCents(net, currency),
        icon: <TrendingUp className="h-5 w-5 text-primary" />,
        hint: `${opCostPct.toFixed(1)}% total costs`,
      },
    ];
  }, [data, currency]);

  const series = useMemo(() => {
    const s = data?.series || [];
    return s.map((p) => ({
      ...p,
      dateLabel: (() => {
        try {
          return format(new Date(`${p.day}T00:00:00Z`), "MMM d");
        } catch {
          return p.day;
        }
      })(),
      income: (Number(p.incomeCents || 0) || 0) / 100,
      costs: ((Number(p.expenseCents || 0) || 0) + (Number(p.payrollCents || 0) || 0)) / 100,
      net: (Number(p.netCents || 0) || 0) / 100,
    }));
  }, [data]);

  const topCosts = useMemo(() => {
    return (data?.topExpenseCategories || []).slice(0, 6).map((c) => ({
      name: c.name,
      total: formatCents(c.totalCents, currency),
    }));
  }, [data, currency]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Overview</h3>
          <Badge variant="secondary">{range}</Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={range === "7d" ? "default" : "outline"}
            onClick={() => setRange("7d")}
            disabled={loading}
          >
            7d
          </Button>
          <Button
            size="sm"
            variant={range === "30d" ? "default" : "outline"}
            onClick={() => setRange("30d")}
            disabled={loading}
          >
            30d
          </Button>
          <Button
            size="sm"
            variant={range === "90d" ? "default" : "outline"}
            onClick={() => setRange("90d")}
            disabled={loading}
          >
            90d
          </Button>

          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Couldn&apos;t load finance overview</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>{error}</p>
            <Button variant="outline" onClick={refresh}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-semibold">{loading ? "—" : c.value}</p>
                  <p className="text-xs text-muted-foreground">{loading ? "Loading…" : c.hint}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">{c.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Daily trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {loading ? (
                <div className="h-full w-full rounded-lg bg-muted animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateLabel" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        const cur = currency || "USD";
                        const v = Number(value || 0);
                        if (name === "income") return [formatCents(Math.round(v * 100), cur), "Income"];
                        if (name === "costs") return [formatCents(Math.round(v * 100), cur), "Costs"];
                        if (name === "net") return [formatCents(Math.round(v * 100), cur), "Net"];
                        return [value, name];
                      }}
                    />
                    <Area type="monotone" dataKey="income" fillOpacity={0.18} strokeWidth={2} />
                    <Area type="monotone" dataKey="costs" fillOpacity={0.12} strokeWidth={2} />
                    <Area type="monotone" dataKey="net" fillOpacity={0.10} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Top costs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : topCosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expense/payroll entries yet for this range.</p>
            ) : (
              <div className="space-y-2">
                {topCosts.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20"
                  >
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-sm font-semibold">{c.total}</p>
                  </div>
                ))}
              </div>
            )}

            {data?.range ? (
              <p className="text-xs text-muted-foreground pt-2">
                {format(new Date(data.range.from), "MMM d, yyyy")} – {format(new Date(data.range.to), "MMM d, yyyy")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
