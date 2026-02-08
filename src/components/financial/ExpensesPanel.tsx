// File: src/components/financial/ExpensesPanel.tsx

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { FinanceEntityType } from "@/components/financial/FinanceHub";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CategoryRow = {
  id: string;
  name: string;
  kind: string;
  is_active: boolean;
};

type EntryRow = {
  id: string;
  entry_type: string;
  category_id: string | null;
  amount_cents: number;
  currency: string;
  occurred_at: string;
  description: string | null;
};

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseMoneyToCents(v: string) {
  const n = Number(String(v || "").replaceAll(",", "").trim());
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function formatCurrency(cents: number, currency: string = "USD") {
  const v = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

interface Props {
  entityType: FinanceEntityType;
  entityId: string;
}

export default function ExpensesPanel({ entityType, entityId }: Props) {
  const [loading, setLoading] = useState(false);
  const [catsLoading, setCatsLoading] = useState(false);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);

  const [date, setDate] = useState<string>(() => isoToday());
  const [categoryId, setCategoryId] = useState<string>("__uncat__");
  const [amount, setAmount] = useState<string>("0.00");
  const [description, setDescription] = useState<string>("");

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const currency = "USD";

  const loadCategories = async () => {
    if (!entityType || !entityId) return;
    setCatsLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance_categories")
        .select("id,name,kind,is_active")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("kind", "expense")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(5000);

      if (error) throw error;

      const rows = ((data || []) as any) as CategoryRow[];
      setCategories(rows);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load categories");
      setCategories([]);
    } finally {
      setCatsLoading(false);
    }
  };

  const loadEntries = async () => {
    if (!entityType || !entityId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance_entries")
        .select("id,entry_type,category_id,amount_cents,currency,occurred_at,description")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("entry_type", "expense")
        .order("occurred_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setEntries(((data || []) as any) as EntryRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load expenses");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await Promise.all([loadCategories(), loadEntries()]);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const createExpense = async () => {
    const cents = parseMoneyToCents(amount);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!date) {
      toast.error("Date is required");
      return;
    }

    const occurredAt = new Date(`${date}T12:00:00.000Z`).toISOString();

    try {
      setLoading(true);

      const payload: any = {
        entity_type: entityType,
        entity_id: entityId,
        entry_type: "expense",
        category_id: categoryId === "__uncat__" ? null : categoryId,
        amount_cents: cents,
        currency,
        occurred_at: occurredAt,
        description: description.trim() || null,
        metadata: {},
      };

      const { error } = await supabase.from("finance_entries").insert(payload);
      if (error) throw error;

      toast.success("Expense added");
      setAmount("0.00");
      setDescription("");
      setCategoryId("__uncat__");

      await loadEntries();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (row: EntryRow) => {
    const ok = window.confirm("Delete this expense entry? This cannot be undone.");
    if (!ok) return;

    try {
      setLoading(true);
      const { error } = await supabase.from("finance_entries").delete().eq("id", row.id);
      if (error) throw error;

      toast.success("Expense deleted");
      await loadEntries();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to delete expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Expenses</h3>
          <Badge variant="secondary">Supplies • Utilities • Taxes</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading || catsLoading} className="gap-2">
            {loading || catsLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add expense</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={loading || catsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__uncat__">Uncategorized</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                If you don’t see categories, click refresh (defaults are created automatically).
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount ({currency})</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                inputMode="decimal"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              placeholder="Optional note (e.g., water bill, gloves, tax payment)"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-end">
            <Button onClick={createExpense} disabled={loading} className="gap-2">
              <Plus className="w-4 h-4" />
              Add expense
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent expenses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Date</TableHead>
                  <TableHead className="w-[240px]">Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-[170px]">Amount</TableHead>
                  <TableHead className="text-right w-[90px]"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(loading || catsLoading) && entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      No expenses yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{formatDateTime(r.occurred_at)}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {r.category_id ? categoryNameById.get(r.category_id) || "Unknown" : "Uncategorized"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.description || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(r.amount_cents, r.currency || currency)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteExpense(r)}
                          disabled={loading}
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
  );
}
