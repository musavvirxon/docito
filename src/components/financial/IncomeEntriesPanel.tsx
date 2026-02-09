import { useEffect, useMemo, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { Loader2, RefreshCw, Plus, Pencil, ArrowUpRight, RotateCcw } from "lucide-react";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";

type CategoryRow = {
  id: string;
  kind: "income" | "expense" | "payroll";
  name: string;
};

type IncomeRow = {
  id: string;
  amount_cents: number;
  currency: string;
  occurred_at: string;
  category_id: string | null;
  description: string | null;
  metadata: any;
};

function formatMoney(currency: string, cents: number) {
  const v = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(v);
  } catch {
    return `${currency || "USD"} ${v.toFixed(2)}`;
  }
}

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

function normalizeCurrency(v: string) {
  const s = String(v || "").trim().toUpperCase();
  return s || "USD";
}

function parseMajorToCents(v: string) {
  const s = String(v || "").trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, "."));
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return Math.round(n * 100);
}

function middayUtcISO(dateStr: string) {
  return new Date(`${dateStr}T12:00:00.000Z`).toISOString();
}

function isReversalRow(r: IncomeRow) {
  const md = r.metadata || {};
  return Boolean(md.reversal_of || md["reversal_of"]);
}

export default function IncomeEntriesPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const today = useMemo(() => new Date(), []);
  const [dateFrom, setDateFrom] = useState(() => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)));
  const [dateTo, setDateTo] = useState(() => isoDate(today));
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const incomeCategories = useMemo(() => categories.filter((c) => c.kind === "income"), [categories]);

  const [rows, setRows] = useState<IncomeRow[]>([]);

  // entry dialog state
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formDate, setFormDate] = useState(() => isoDate(today));
  const [formCurrency, setFormCurrency] = useState("USD");
  const [formAmount, setFormAmount] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formCategoryName, setFormCategoryName] = useState<string>("");
  const [formDescription, setFormDescription] = useState("");
  const [formReference, setFormReference] = useState("");

  // refund dialog state
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundOriginal, setRefundOriginal] = useState<IncomeRow | null>(null);
  const [refundDate, setRefundDate] = useState(() => isoDate(today));
  const [refundDescription, setRefundDescription] = useState("Refund");
  const [refundReference, setRefundReference] = useState("");
  const [refundIdempotencyKey, setRefundIdempotencyKey] = useState("");

  const currencyHint = useMemo(() => (rows[0]?.currency || "USD").toUpperCase(), [rows]);

  const totals = useMemo(() => {
    let sum = 0;
    for (const r of rows) sum += Number(r.amount_cents || 0) || 0;
    return sum;
  }, [rows]);

  const canSave = useMemo(() => {
    if (!entityId) return false;
    const cents = parseMajorToCents(formAmount);
    if (cents === null || cents <= 0) return false;
    if (!formDate.trim()) return false;
    if (!formCurrency.trim()) return false;
    if (!formCategoryId && !formCategoryName.trim()) return false;
    return true;
  }, [entityId, formAmount, formCategoryId, formCategoryName, formCurrency, formDate]);

  const canRefund = useMemo(() => {
    if (!entityId) return false;
    if (!refundOriginal) return false;
    if (!refundDate.trim()) return false;
    return true;
  }, [entityId, refundDate, refundOriginal]);

  const resetForm = () => {
    setEditId(null);
    setFormDate(isoDate(today));
    setFormCurrency("USD");
    setFormAmount("");
    setFormCategoryId("");
    setFormCategoryName("");
    setFormDescription("");
    setFormReference("");
  };

  const resetRefund = () => {
    setRefundOriginal(null);
    setRefundDate(isoDate(today));
    setRefundDescription("Refund");
    setRefundReference("");
    setRefundIdempotencyKey("");
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("finance_categories")
      .select("id,kind,name")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("kind", { ascending: true })
      .order("name", { ascending: true })
      .limit(1000);

    if (error) throw error;
    setCategories((data || []) as any);
  };

  const loadIncome = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const fromIso = startOfDayISO(dateFrom);
      const toIso = endOfDayISO(dateTo);

      let q = supabase
        .from("finance_entries")
        .select("id,amount_cents,currency,occurred_at,category_id,description,metadata")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("entry_type", "income")
        .gte("occurred_at", fromIso)
        .lte("occurred_at", toIso)
        .order("occurred_at", { ascending: false })
        .limit(200);

      const s = search.trim();
      if (s) q = q.ilike("description", `%${s}%`);

      const [incomeRes] = await Promise.all([q, loadCategories()]);
      if (incomeRes.error) throw incomeRes.error;

      setRows((incomeRes.data || []) as any);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load income entries");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadIncome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (r: IncomeRow) => {
    setEditId(r.id);
    setFormDate(isoDate(new Date(r.occurred_at)));
    setFormCurrency((r.currency || "USD").toUpperCase());
    setFormAmount(((Number(r.amount_cents || 0) || 0) / 100).toFixed(2));
    setFormCategoryId(r.category_id || "");
    setFormCategoryName("");
    setFormDescription(r.description || "");
    setFormReference(String((r.metadata && (r.metadata.reference || r.metadata["reference"])) || "") || "");
    setOpen(true);
  };

  const openRefund = (r: IncomeRow) => {
    setRefundOriginal(r);
    setRefundDate(isoDate(today));
    setRefundDescription(`Refund for ${formatMoney(r.currency, r.amount_cents)}`);
    setRefundReference("");
    setRefundIdempotencyKey(`refund_${r.id}_${Date.now()}`);
    setRefundOpen(true);
  };

  const save = async () => {
    if (!canSave) return;

    setSaving(true);
    try {
      const cents = parseMajorToCents(formAmount);
      if (cents === null || cents <= 0) throw new Error("Invalid amount");

      const occurredAt = middayUtcISO(formDate);

      const { data, error } = await supabase.rpc("finance_entry_upsert_manual", {
        p_entity_type: entityType,
        p_entity_id: entityId,

        p_entry_id: editId,
        p_entry_type: "income",
        p_amount_cents: cents,
        p_currency: normalizeCurrency(formCurrency),
        p_occurred_at: occurredAt,

        p_category_id: formCategoryId ? formCategoryId : null,
        p_category_name: formCategoryId ? null : (formCategoryName.trim() || null),

        p_description: formDescription.trim() ? formDescription.trim() : null,
        p_reference: formReference.trim() ? formReference.trim() : null,
      });

      if (error) throw error;
      const id = Array.isArray(data) ? data[0]?.entry_id : (data as any)?.entry_id;
      if (!id) throw new Error("Save failed");

      toast.success(editId ? "Income entry updated" : "Income entry created");
      setOpen(false);
      resetForm();
      await loadIncome();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save income entry");
    } finally {
      setSaving(false);
    }
  };

  const createRefund = async () => {
    if (!canRefund || !refundOriginal) return;

    setSaving(true);
    try {
      const occurredAt = middayUtcISO(refundDate);

      const { data, error } = await supabase.rpc("finance_entry_create_reversal", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_original_entry_id: refundOriginal.id,
        p_occurred_at: occurredAt,
        p_description: refundDescription.trim() ? refundDescription.trim() : null,
        p_reference: refundReference.trim() ? refundReference.trim() : null,
        p_idempotency_key: refundIdempotencyKey.trim() ? refundIdempotencyKey.trim() : null,
      });

      if (error) throw error;
      const id = Array.isArray(data) ? data[0]?.reversal_entry_id : (data as any)?.reversal_entry_id;
      if (!id) throw new Error("Refund failed");

      toast.success("Refund posted (reversal created)");
      setRefundOpen(false);
      resetRefund();
      await loadIncome();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create refund");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            Income
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Manual income entries with category + reference. Refunds create linked reversal entries.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add income
          </Button>
          <Button variant="outline" onClick={() => void loadIncome()} disabled={loading} className="gap-2">
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
            <div className="space-y-1 md:col-span-6">
              <Label>Search (description)</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to filter (then Refresh)" />
            </div>
            <div className="md:col-span-12 flex justify-end">
              <Button variant="outline" onClick={() => void loadIncome()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Apply
              </Button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Total income (filtered range)</div>
          <div className="text-sm font-medium">{formatMoney(currencyHint, totals)}</div>
          <div className="text-xs text-muted-foreground mt-1">Refunds/reversals appear as negative income.</div>
        </div>

        {/* List */}
        <div className="rounded-md border overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
            <div className="col-span-2">Date</div>
            <div className="col-span-3">Category</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-1 text-right">Refund</div>
            <div className="col-span-1 text-right">Edit</div>
          </div>

          {loading ? (
            <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No income entries in this range.</div>
          ) : (
            <div className="divide-y">
              {rows.map((r) => {
                const catName = r.category_id ? incomeCategories.find((c) => c.id === r.category_id)?.name : null;
                const reversal = isReversalRow(r);
                return (
                  <div key={r.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center">
                    <div className="col-span-2 font-mono">{new Date(r.occurred_at).toLocaleDateString()}</div>
                    <div className="col-span-3 truncate">{catName || <span className="text-muted-foreground">—</span>}</div>
                    <div className="col-span-2 text-right font-medium">{formatMoney(r.currency, r.amount_cents)}</div>
                    <div className="col-span-3 truncate text-muted-foreground">
                      {reversal ? <span className="text-foreground">Refund/Reversal · </span> : null}
                      {r.description || ""}
                    </div>

                    <div className="col-span-1 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRefund(r)}
                        className="gap-2"
                        disabled={saving || reversal}
                        title={reversal ? "Refund entries cannot be refunded again" : "Create a refund reversal"}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="col-span-1 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(r)}
                        className="gap-2"
                        disabled={saving || reversal}
                        title={reversal ? "Refund entries are not editable" : "Edit"}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Entry dialog */}
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <span />
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit income entry" : "Add income entry"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-12">
              <div className="space-y-1 md:col-span-4">
                <Label>Date</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>

              <div className="space-y-1 md:col-span-4">
                <Label>Currency</Label>
                <Input value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)} placeholder="USD" />
              </div>

              <div className="space-y-1 md:col-span-4">
                <Label>Amount</Label>
                <Input inputMode="decimal" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" />
              </div>

              <div className="space-y-1 md:col-span-6">
                <Label>Category (existing)</Label>
                <Select value={formCategoryId || "none"} onValueChange={(v) => setFormCategoryId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No selection</SelectItem>
                    {incomeCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:col-span-6">
                <Label>Or create category (name)</Label>
                <Input
                  value={formCategoryName}
                  onChange={(e) => {
                    setFormCategoryName(e.target.value);
                    if (e.target.value.trim()) setFormCategoryId("");
                  }}
                  placeholder="e.g. Consultations, Lab tests income"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  If you type a name here, we’ll create (or reuse) a matching income category.
                </div>
              </div>

              <div className="space-y-1 md:col-span-12">
                <Label>Description</Label>
                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional notes" />
              </div>

              <div className="space-y-1 md:col-span-12">
                <Label>Reference</Label>
                <Input
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                  placeholder="Receipt / invoice / payment ref (optional)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={() => void save()} disabled={!canSave || saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editId ? "Save" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Refund dialog */}
        <Dialog
          open={refundOpen}
          onOpenChange={(v) => {
            setRefundOpen(v);
            if (!v) resetRefund();
          }}
        >
          <DialogTrigger asChild>
            <span />
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create refund (reversal)</DialogTitle>
            </DialogHeader>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div>
                Original amount:{" "}
                <span className="text-foreground font-medium">
                  {refundOriginal ? formatMoney(refundOriginal.currency, refundOriginal.amount_cents) : "—"}
                </span>
              </div>
              <div>The refund will create a new income entry with the negative amount and link it to the original entry.</div>
            </div>

            <div className="grid gap-3 md:grid-cols-12 mt-3">
              <div className="space-y-1 md:col-span-4">
                <Label>Date</Label>
                <Input type="date" value={refundDate} onChange={(e) => setRefundDate(e.target.value)} />
              </div>

              <div className="space-y-1 md:col-span-8">
                <Label>Description</Label>
                <Input value={refundDescription} onChange={(e) => setRefundDescription(e.target.value)} placeholder="Refund reason" />
              </div>

              <div className="space-y-1 md:col-span-12">
                <Label>Reference</Label>
                <Input value={refundReference} onChange={(e) => setRefundReference(e.target.value)} placeholder="Refund reference (optional)" />
              </div>

              <div className="space-y-1 md:col-span-12">
                <Label>Idempotency key</Label>
                <Input
                  value={refundIdempotencyKey}
                  onChange={(e) => setRefundIdempotencyKey(e.target.value)}
                  placeholder="(auto-filled) prevents double refunds"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Keep this unchanged unless you intentionally want a second reversal.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRefundOpen(false);
                  resetRefund();
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={() => void createRefund()} disabled={!canRefund || saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Post refund
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
