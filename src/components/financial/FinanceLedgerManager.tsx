// File: src/components/financial/FinanceLedgerManager.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { toast } from "sonner";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import FinanceCategorySelect from "@/components/financial/FinanceCategorySelect";
import { Loader2, Plus, RefreshCcw, Trash2, Save, Pencil, X, NotebookPen } from "lucide-react";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";
type EntryType = "income" | "expense" | "payroll";
type EntryTypeFilter = "all" | EntryType;

type FinanceEntryRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  occurred_at: string;
  entry_type: EntryType;
  amount_cents: number;
  currency: string;
  category_id: string | null;
  description: string | null;
  reference: string | null;
  created_at?: string;
  updated_at?: string;
};

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODateToNoon(dateStr: string) {
  // Store as midday UTC to reduce timezone edge cases when querying by date
  return `${dateStr}T12:00:00.000Z`;
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

function badgeForType(t: EntryType) {
  if (t === "income") return { label: "Income", variant: "default" as const };
  if (t === "expense") return { label: "Expense", variant: "secondary" as const };
  return { label: "Payroll", variant: "outline" as const };
}

export default function FinanceLedgerManager(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const today = useMemo(() => new Date(), []);
  const [dateTo, setDateTo] = useState(() => isoDate(today));
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    return isoDate(d);
  });

  const [typeFilter, setTypeFilter] = useState<EntryTypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [savingNew, setSavingNew] = useState(false);

  const [rows, setRows] = useState<FinanceEntryRow[]>([]);

  // New entry form
  const [newDate, setNewDate] = useState(() => isoDate(today));
  const [newType, setNewType] = useState<EntryType>("expense");
  const [newCurrency, setNewCurrency] = useState("USD");
  const [newAmount, setNewAmount] = useState<string>("");
  const [newCategoryId, setNewCategoryId] = useState<string>("all");
  const [newDescription, setNewDescription] = useState<string>("");
  const [newReference, setNewReference] = useState<string>("");

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    occurred_at: string;
    entry_type: EntryType;
    currency: string;
    amount: string;
    category_id: string;
    description: string;
    reference: string;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canLoad = useMemo(() => Boolean(entityId && entityType), [entityId, entityType]);

  const canCreate = useMemo(() => {
    if (!canLoad) return false;
    if (!newDate) return false;
    const amt = Number(newAmount);
    if (!Number.isFinite(amt) || amt <= 0) return false;
    if (!newCurrency.trim()) return false;
    return true;
  }, [canLoad, newDate, newAmount, newCurrency]);

  const fetchEntries = async () => {
    if (!canLoad) {
      setRows([]);
      return;
    }
    if (!dateFrom || !dateTo || dateFrom > dateTo) {
      toast.error("Invalid date range");
      return;
    }

    setLoading(true);
    try {
      let q = supabase
        .from("finance_entries")
        .select(
          "id,entity_type,entity_id,occurred_at,entry_type,amount_cents,currency,category_id,description,reference,created_at,updated_at"
        )
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .gte("occurred_at", `${dateFrom}T00:00:00.000Z`)
        .lte("occurred_at", `${dateTo}T23:59:59.999Z`)
        .order("occurred_at", { ascending: false })
        .limit(200);

      if (typeFilter !== "all") q = q.eq("entry_type", typeFilter);
      if (categoryFilter !== "all") q = q.eq("category_id", categoryFilter);

      if (search.trim()) {
        // Use ilike on description OR reference
        const s = search.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
        q = q.or(`description.ilike.%${s}%,reference.ilike.%${s}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      setRows((data || []) as any[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load finance entries");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const createEntry = async () => {
    if (!canCreate) return;

    setSavingNew(true);
    try {
      const cents = Math.round(Number(newAmount) * 100);
      const occurredAt = parseISODateToNoon(newDate);

      const { error } = await supabase.from("finance_entries").insert({
        entity_type: entityType,
        entity_id: entityId,
        occurred_at: occurredAt,
        entry_type: newType,
        amount_cents: cents,
        currency: newCurrency.trim(),
        category_id: newCategoryId === "all" ? null : newCategoryId,
        description: newDescription.trim() || null,
        reference: newReference.trim() || null,
      });

      if (error) throw error;

      toast.success("Entry created");
      setNewAmount("");
      setNewDescription("");
      setNewReference("");
      setNewType("expense");
      setNewCategoryId("all");
      await fetchEntries();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create entry");
    } finally {
      setSavingNew(false);
    }
  };

  const startEdit = (row: FinanceEntryRow) => {
    const dt = new Date(row.occurred_at);
    const dateStr = isoDate(dt);

    setEditingId(row.id);
    setEditDraft({
      occurred_at: dateStr,
      entry_type: row.entry_type,
      currency: row.currency || "USD",
      amount: ((Number(row.amount_cents || 0) || 0) / 100).toFixed(2),
      category_id: row.category_id || "all",
      description: row.description || "",
      reference: row.reference || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editDraft) return;

    const amt = Number(editDraft.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }
    if (!editDraft.occurred_at) {
      toast.error("Date is required");
      return;
    }
    if (!editDraft.currency.trim()) {
      toast.error("Currency is required");
      return;
    }

    setSavingEdit(true);
    try {
      const cents = Math.round(amt * 100);
      const occurredAt = parseISODateToNoon(editDraft.occurred_at);

      const { error } = await supabase
        .from("finance_entries")
        .update({
          occurred_at: occurredAt,
          entry_type: editDraft.entry_type,
          amount_cents: cents,
          currency: editDraft.currency.trim(),
          category_id: editDraft.category_id === "all" ? null : editDraft.category_id,
          description: editDraft.description.trim() || null,
          reference: editDraft.reference.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) throw error;

      toast.success("Entry updated");
      cancelEdit();
      await fetchEntries();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update entry");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteEntry = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("finance_entries").delete().eq("id", id);
      if (error) throw error;

      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Entry deleted");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to delete entry");
    } finally {
      setDeletingId(null);
    }
  };

  const summary = useMemo(() => {
    const total = rows.reduce((acc, r) => acc + (Number(r.amount_cents || 0) || 0), 0);
    const byType = rows.reduce(
      (acc, r) => {
        acc[r.entry_type] = (acc[r.entry_type] || 0) + (Number(r.amount_cents || 0) || 0);
        return acc;
      },
      {} as Record<string, number>
    );
    const currency = rows[0]?.currency || "USD";
    return {
      currency,
      total,
      income: byType.income || 0,
      expense: byType.expense || 0,
      payroll: byType.payroll || 0,
      count: rows.length,
    };
  }, [rows]);

  return (
    <Card className="rounded-xl border-muted">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-muted-foreground" />
          Ledger
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Add and manage income, expenses, and payroll entries. Filter by date, type, and category.
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid gap-3 md:grid-cols-12 items-end">
          <div className="space-y-1 md:col-span-3">
            <Label>From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-3">
            <Label>To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-3">
            <Label>Type</Label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as EntryTypeFilter)}>
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

          <div className="md:col-span-3">
            <FinanceCategorySelect
              entityType={entityType}
              entityId={entityId}
              value={categoryFilter}
              onChange={setCategoryFilter}
              includeAll
              label="Category"
              placeholder="All categories"
            />
          </div>

          <div className="space-y-1 md:col-span-10">
            <Label>Search</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description or reference..." />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <Button variant="outline" onClick={() => void fetchEntries()} disabled={!canLoad || loading} className="gap-2 w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-3 md:grid-cols-4">
          <div className="p-3 rounded-xl border bg-muted/30">
            <div className="text-xs text-muted-foreground">Entries</div>
            <div className="text-lg font-semibold">{summary.count}</div>
          </div>
          <div className="p-3 rounded-xl border bg-muted/30">
            <div className="text-xs text-muted-foreground">Income</div>
            <div className="text-lg font-semibold">{formatMoney(summary.currency, summary.income)}</div>
          </div>
          <div className="p-3 rounded-xl border bg-muted/30">
            <div className="text-xs text-muted-foreground">Expenses</div>
            <div className="text-lg font-semibold">{formatMoney(summary.currency, summary.expense + summary.payroll)}</div>
          </div>
          <div className="p-3 rounded-xl border bg-muted/30">
            <div className="text-xs text-muted-foreground">Net</div>
            <div className="text-lg font-semibold">{formatMoney(summary.currency, summary.income - (summary.expense + summary.payroll))}</div>
          </div>
        </div>

        {/* Create */}
        <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Add entry</div>
            <Badge variant="outline" className="text-xs">
              Manual
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-12">
            <div className="space-y-1 md:col-span-3">
              <Label>Date</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>

            <div className="space-y-1 md:col-span-3">
              <Label>Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as EntryType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="payroll">Payroll</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label>Currency</Label>
              <Select value={newCurrency} onValueChange={setNewCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="UZS">UZS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-4">
              <Label>Amount</Label>
              <Input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="e.g., 120.00" />
            </div>

            <div className="md:col-span-6">
              <FinanceCategorySelect
                entityType={entityType}
                entityId={entityId}
                value={newCategoryId}
                onChange={setNewCategoryId}
                includeAll
                label="Category"
                placeholder="All categories"
              />
            </div>

            <div className="space-y-1 md:col-span-6">
              <Label>Reference (optional)</Label>
              <Input value={newReference} onChange={(e) => setNewReference(e.target.value)} placeholder="e.g., INV-1029" />
            </div>

            <div className="space-y-1 md:col-span-12">
              <Label>Description (optional)</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Notes about this entry…"
                rows={3}
              />
            </div>

            <div className="md:col-span-12 flex justify-end">
              <Button onClick={() => void createEntry()} disabled={!canCreate || savingNew} className="gap-2 w-full md:w-auto">
                {savingNew ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add entry
              </Button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Entries</div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading…</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No entries found for this filter.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => {
                const isEditing = editingId === r.id;
                const badge = badgeForType(r.entry_type);

                if (isEditing && editDraft) {
                  return (
                    <div key={r.id} className="p-3 rounded-xl border bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          <span className="text-xs text-muted-foreground">Editing</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={cancelEdit} disabled={savingEdit} className="gap-2">
                            <X className="h-4 w-4" />
                            Cancel
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void saveEdit()} disabled={savingEdit} className="gap-2">
                            {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-12">
                        <div className="space-y-1 md:col-span-3">
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={editDraft.occurred_at}
                            onChange={(e) => setEditDraft({ ...editDraft, occurred_at: e.target.value })}
                          />
                        </div>

                        <div className="space-y-1 md:col-span-3">
                          <Label>Type</Label>
                          <Select
                            value={editDraft.entry_type}
                            onValueChange={(v) => setEditDraft({ ...editDraft, entry_type: v as EntryType })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income">Income</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                              <SelectItem value="payroll">Payroll</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <Label>Currency</Label>
                          <Select value={editDraft.currency} onValueChange={(v) => setEditDraft({ ...editDraft, currency: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="UZS">UZS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1 md:col-span-4">
                          <Label>Amount</Label>
                          <Input
                            value={editDraft.amount}
                            onChange={(e) => setEditDraft({ ...editDraft, amount: e.target.value })}
                          />
                        </div>

                        <div className="md:col-span-6">
                          <FinanceCategorySelect
                            entityType={entityType}
                            entityId={entityId}
                            value={editDraft.category_id || "all"}
                            onChange={(v) => setEditDraft({ ...editDraft, category_id: v })}
                            includeAll
                            label="Category"
                            placeholder="All categories"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-6">
                          <Label>Reference</Label>
                          <Input
                            value={editDraft.reference}
                            onChange={(e) => setEditDraft({ ...editDraft, reference: e.target.value })}
                          />
                        </div>

                        <div className="space-y-1 md:col-span-12">
                          <Label>Description</Label>
                          <Textarea
                            value={editDraft.description}
                            onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border bg-muted/30">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <span className="text-sm font-medium">
                          {formatMoney(r.currency || "USD", Number(r.amount_cents || 0))}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(r.occurred_at), "MMM dd, yyyy")}
                        </span>
                        {r.reference ? (
                          <Badge variant="outline" className="text-xs">
                            {r.reference}
                          </Badge>
                        ) : null}
                      </div>

                      {r.description ? <div className="text-sm text-muted-foreground mt-1">{r.description}</div> : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => startEdit(r)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => void deleteEntry(r.id)}
                        disabled={deletingId === r.id}
                        title="Delete"
                      >
                        {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Note: this list shows up to 200 entries per filter. For full exports, use the CSV export card.
        </div>
      </CardContent>
    </Card>
  );
}
