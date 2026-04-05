import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ListChecks, Loader2, RefreshCcw, Filter, ArrowDownUp } from "lucide-react";
import { toast } from "sonner";

import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import type { FinanceEntityType } from "@/components/financial/FinanceHub";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  entityType: FinanceEntityType;
  entityId: string;
  locationId?: string | null;
};

type EntryType = "income" | "expense" | "payroll" | "transfer" | "adjustment";

type FinanceEntryRow = {
  id: string;
  occurred_at: string;
  entry_type: EntryType;
  amount_cents: number;
  currency: string;
  description: string | null;
  category_id: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  kind: string;
};

function formatCents(cents: number, currency: string) {
  const cur = (currency || "USD").toUpperCase();
  const value = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(value);
  } catch {
    return `${cur} ${value.toFixed(2)}`;
  }
}

function isoForDaysAgo(days: number) {
  const now = new Date();
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

export default function FinanceTransactions({ entityType, entityId, locationId }: Props) {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [type, setType] = useState<EntryType | "all">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FinanceEntryRow[]>([]);
  const [cats, setCats] = useState<Map<string, CategoryRow>>(new Map());

  const { from, to } = useMemo(() => {
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    return { from: isoForDaysAgo(days), to: new Date().toISOString() };
  }, [range]);

  const currency = useMemo(() => rows.find((r) => r.currency)?.currency || "USD", [rows]);

  const refresh = async () => {
    if (!entityType || !entityId) return;

    setLoading(true);
    try {
      const catRes = await (supabase as any)
        .from("finance_categories")
        .select("id,name,kind")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .limit(5000);

      if (catRes?.error) throw catRes.error;

      const catMap = new Map<string, CategoryRow>();
      ((catRes?.data || []) as any[]).forEach((c) => {
        if (c?.id) catMap.set(String(c.id), { id: String(c.id), name: String(c.name || "Unnamed"), kind: String(c.kind || "") });
      });
      setCats(catMap);

      let q = (supabase as any)
        .from("finance_entries")
        .select("id,occurred_at,entry_type,amount_cents,currency,description,category_id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .gte("occurred_at", from)
        .lt("occurred_at", to);

      if (locationId) q = q.eq("location_id", locationId);

      if (type !== "all") q = q.eq("entry_type", type);

      q = q.order("occurred_at", { ascending: sort === "oldest" });

      const { data, error } = await q.limit(5000);
      if (error) throw error;

      setRows((data || []) as FinanceEntryRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load transactions");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId, range, type, sort, locationId]);

  const totals = useMemo(() => {
    const sums: Record<string, number> = { income: 0, expense: 0, payroll: 0, transfer: 0, adjustment: 0 };
    for (const r of rows) {
      const k = String(r.entry_type || "");
      if (k in sums) sums[k] += Number(r.amount_cents || 0) || 0;
    }
    const income = sums.income || 0;
    const costs = (sums.expense || 0) + (sums.payroll || 0);
    const net = income - costs;
    return { sums, income, costs, net };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Transactions</h3>
          <Badge variant="secondary">{range}</Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant={range === "7d" ? "default" : "outline"} onClick={() => setRange("7d")} disabled={loading}>
            7d
          </Button>
          <Button size="sm" variant={range === "30d" ? "default" : "outline"} onClick={() => setRange("30d")} disabled={loading}>
            30d
          </Button>
          <Button size="sm" variant={range === "90d" ? "default" : "outline"} onClick={() => setRange("90d")} disabled={loading}>
            90d
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
            disabled={loading}
            className="gap-2"
          >
            <ArrowDownUp className="h-4 w-4" />
            {sort === "newest" ? "Newest" : "Oldest"}
          </Button>

          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Income</p>
            <p className="text-2xl font-semibold">{loading ? "—" : formatCents(totals.income, currency)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Costs (expense + payroll)</p>
            <p className="text-2xl font-semibold">{loading ? "—" : formatCents(totals.costs, currency)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Net</p>
            <p className="text-2xl font-semibold">{loading ? "—" : formatCents(totals.net, currency)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Entries</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                Type:
              </div>
              <Button size="sm" variant={type === "all" ? "default" : "outline"} onClick={() => setType("all")} disabled={loading}>
                All
              </Button>
              <Button size="sm" variant={type === "income" ? "default" : "outline"} onClick={() => setType("income")} disabled={loading}>
                Income
              </Button>
              <Button size="sm" variant={type === "expense" ? "default" : "outline"} onClick={() => setType("expense")} disabled={loading}>
                Expense
              </Button>
              <Button size="sm" variant={type === "payroll" ? "default" : "outline"} onClick={() => setType("payroll")} disabled={loading}>
                Payroll
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {format(new Date(from), "MMM d, yyyy")} – {format(new Date(to), "MMM d, yyyy")}
          </p>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <div className="h-12 rounded-lg bg-muted animate-pulse" />
              <div className="h-12 rounded-lg bg-muted animate-pulse mt-3" />
              <div className="h-12 rounded-lg bg-muted animate-pulse mt-3" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No transactions for this filter/range yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const cat = r.category_id ? cats.get(String(r.category_id)) : null;
                  const dateLabel = (() => {
                    try {
                      return format(new Date(r.occurred_at), "MMM d, yyyy");
                    } catch {
                      return r.occurred_at;
                    }
                  })();

                  const amount = formatCents(r.amount_cents, r.currency || currency);

                  const typeBadge =
                    r.entry_type === "income"
                      ? "default"
                      : r.entry_type === "expense" || r.entry_type === "payroll"
                      ? "secondary"
                      : "outline";

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{dateLabel}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={typeBadge as any}>{r.entry_type}</Badge>
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <span className="font-medium">{cat?.name || "Uncategorized"}</span>
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <span className="text-sm text-muted-foreground">{r.description || "—"}</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">{amount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
