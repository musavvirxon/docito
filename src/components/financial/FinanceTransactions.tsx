// File: src/components/financial/FinanceTransactions.tsx

import { useMemo, useState } from "react";
import { Plus, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { FinanceEntityType } from "@/components/financial/FinanceHub";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import FinanceEntryDialog, { FinanceEntryDraft, FinanceEntryRow } from "@/components/financial/FinanceEntryDialog";
import { useFinanceCategories } from "@/hooks/useFinanceCategories";
import { useFinanceEntries } from "@/hooks/useFinanceEntries";

type EntryType = "income" | "expense" | "payroll" | "adjustment" | "transfer";
type TypeFilter = "all" | EntryType;

const formatCurrency = (cents: number, currency: string = "USD") => {
  const value = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

function entryTypeBadgeVariant(t: EntryType) {
  if (t === "income") return "default";
  if (t === "expense" || t === "payroll") return "secondary";
  if (t === "adjustment") return "outline";
  return "secondary";
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

interface FinanceTransactionsProps {
  entityType: FinanceEntityType;
  entityId: string;
}

export default function FinanceTransactions({ entityType, entityId }: FinanceTransactionsProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntryRow | null>(null);

  const { categories, loading: categoriesLoading, refresh: refreshCategories } = useFinanceCategories({
    entityType,
    entityId,
  });

  const {
    rows,
    loading: rowsLoading,
    currency,
    refresh: refreshRows,
  } = useFinanceEntries({
    entityType,
    entityId,
    entryType: typeFilter === "all" ? undefined : typeFilter,
    limit: 200,
  });

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const handleRefresh = async () => {
    await Promise.all([refreshCategories(), refreshRows()]);
  };

  const handleCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleEdit = (row: FinanceEntryRow) => {
    setEditing(row);
    setOpen(true);
  };

  const handleDelete = async (row: FinanceEntryRow) => {
    const ok = window.confirm("Delete this entry? This cannot be undone.");
    if (!ok) return;

    try {
      const { error } = await supabase.from("finance_entries").delete().eq("id", row.id);
      if (error) throw error;
      toast.success("Entry deleted");
      await refreshRows();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to delete entry");
    }
  };

  const handleSave = async (draft: FinanceEntryDraft) => {
    const payload = {
      entity_type: entityType,
      entity_id: entityId,
      entry_type: draft.entryType,
      category_id: draft.categoryId || null,
      amount_cents: draft.amountCents,
      currency: draft.currency || "USD",
      occurred_at: draft.occurredAt,
      description: draft.description || null,
      metadata: draft.metadata ?? {},
    };

    try {
      if (editing?.id) {
        const { error } = await supabase
          .from("finance_entries")
          .update(payload)
          .eq("id", editing.id);

        if (error) throw error;
        toast.success("Entry updated");
      } else {
        const { error } = await supabase.from("finance_entries").insert(payload);
        if (error) throw error;
        toast.success("Entry created");
      }

      setOpen(false);
      setEditing(null);
      await refreshRows();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save entry");
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">Transactions</h3>
          <Badge variant="secondary">Ledger</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="payroll">Payroll</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleRefresh} disabled={rowsLoading || categoriesLoading} className="gap-2">
            {rowsLoading || categoriesLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>

          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add entry
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[190px]">Date</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[220px]">Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-[160px]">Amount</TableHead>
                  <TableHead className="text-right w-[110px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Loading entries…
                    </TableCell>
                  </TableRow>
                )}

                {!rowsLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No entries yet. Click “Add entry” to create your first record.
                    </TableCell>
                  </TableRow>
                )}

                {!rowsLoading &&
                  rows.map((r) => {
                    const t = r.entry_type as EntryType;
                    const categoryName = r.category_id ? categoryNameById.get(r.category_id) || "Unknown" : "—";
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{formatDateTime(r.occurred_at)}</TableCell>
                        <TableCell>
                          <Badge variant={entryTypeBadgeVariant(t)} className="capitalize">
                            {t}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{categoryName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.description || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(r.amount_cents, r.currency || currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(r)} aria-label="Edit">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(r)} aria-label="Delete">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <FinanceEntryDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        currencyDefault={currency}
        categories={categories}
        loadingCategories={categoriesLoading}
        initialRow={editing}
        onSave={handleSave}
      />
    </div>
  );
}
