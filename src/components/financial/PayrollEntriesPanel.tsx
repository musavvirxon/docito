// File: src/components/financial/PayrollEntriesPanel.tsx
// B20: Manual Payroll entries (create + edit) + reversals/corrections
// - Uses RPC finance_entry_upsert_manual for create/edit
// - Uses RPC finance_entry_create_reversal for reversal (creates negative payroll entry linked to original)

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { Loader2, RefreshCw, Plus, Pencil, Briefcase, RotateCcw } from "lucide-react";

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type CategoryRow = {
  id: string;
  kind: "income" | "expense" | "payroll";
  name: string;
};

type PayrollRow = {
  id: string;
  amount_cents: number; // can be negative for reversals
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
    const sign = v < 0 ? "-" : "";
    return `${sign}${currency || "USD"} ${Math.abs(v).toFixed(2)}`;
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

function isReversalRow(r: PayrollRow) {
  const md = r.metadata || {};
  return Boolean(md.reversal_of || md["reversal_of"]);
}

export default function PayrollEntriesPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const today = useMemo(() => new Date(), []);
  const [dateFrom, setDateFrom] = useState(() => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)));
  const [dateTo, setDateTo] = useState(() => isoDate(today));
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const payrollCategories = useMemo(() => categories.filter((c) => c.kind === "payroll"), [categories]);

  const [rows, setRows] = useState<PayrollRow[]>([]);

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

  // reversal dialog state
  const [revOpen, setRevOpen] = useState(false);
  const [revOriginal, setRevOriginal] = useState<PayrollRow | null>(null);
  const [revDate, setRevDate] = useState(() => isoDate(today));
  const [revDescription, setRevDescription] = useState("Correction/Reversal");
  const [revReference, setRevReference] = useState("");
  const [revIdempotencyKey, setRevIdempotencyKey] = useState("");

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

  const canReverse = useMemo(() => {
    if (!entityId) return false;
    if (!revOriginal) return false;
    if (!revDate.trim()) return false;
    return true;
  }, [entityId, revDate, revOriginal]);

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

  const resetRev = () => {
    setRevOriginal(null);
    setRevDate(isoDate(today));
    setRevDescription("Correction/Reversal");
    setRevReference("");
    setRevIdempotencyKey("");
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

  const loadPayroll = async () => {
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
        .eq("entry_type", "payroll")
        .gte("occurred_at", fromIso)
        .lte("occurred_at", toIso)
        .order("occurred_at", { ascending: false })
        .limit(200);

      const s = search.trim();
      if (s) q = q.ilike("description", `%${s}%`);

      const [payrollRes] = await Promise.all([q, loadCategories()]);
      if (payrollRes.error) throw payrollRes.error;

      setRows((payrollRes.data || []) as any);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load payroll entries");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPayroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (r: PayrollRow) => {
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

  const openReverse = (r: PayrollRow) => {
    setRevOriginal(r);
    setRevDate(isoDate(today));
    setRevDescription(`Correction for ${formatMoney(r.currency, r.amount_cents)}`);
    setRevReference("");
    setRevIdempotencyKey(`payroll_reverse_${r.id}_${Date.now()}`);
    setRevOpen(true);
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
        p_entry_type: "payroll",
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

      toast.success(editId ? "Payroll entry updated" : "Payroll entry created");
      setOpen(false);
      resetForm();
      await loadPayroll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save payroll entry");
    } finally {
      setSaving(false);
    }
  };

  const createReversal = async () => {
    if (!canReverse || !revOriginal) return;

    setSaving(true);
    try {
      const occurredAt = middayUtcISO(revDate);

      const { data, error } = await supabase.rpc("finance_entry_create_reversal", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_original_entry_id: revOriginal.id,
        p_occurred_at: occurredAt,
        p_description: revDescription.trim() ? revDescription.trim() : null,
        p_reference: revReference.trim() ? revReference.trim() : null,
        p_idempotency_key: revIdempotencyKey.trim() ? revIdempotencyKey.trim() : null,
      });

      if (error) throw error;
      const id = Array.isArray(data) ? data[0]?.reversal_entry_id : (data as any)?.reversal_entry_id;
      if (!id) throw new Error("Reversal failed");

      toast.success("Correction/Reversal posted");
      setRevOpen(false);
      resetRev();
      await loadPayroll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create reversal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Payroll
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Manual payroll postings with category + reference. Corrections create linked negative payroll entries.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add payroll
          </Button>
          <Button variant="outline" onClick={() => void loadPayroll()} disabled={loading} className="gap-2">
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
              <Button variant="outline" onClick={() => void loadPayroll()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Apply
              </Button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Total payroll (filtered range)</div>
          <div className="text-sm font-medium">{formatMoney(currencyHint, totals)}</div>
          <div className="text-xs text-muted-foreground mt-1">Corrections/reversals appear as negative payroll.</div>
        </div>

        {/* List */}
        <div className="rounded-md border overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
            <div className="col-span-2">Date</div>
            <div className="col-span-3">Category</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-1 text-right">Fix</div>
            <div className="col-span-1 text-right">Edit</div>
          </div>

          {loading ? (
            <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No payroll entries in this range.</div>
          ) : (
            <div className="divide-y">
              {rows.map((r) => {
                const catName = r.category_id ? payrollCategories.find((c) => c.id === r.category_id)?.name : null;
                const reversal = isReversalRow(r);
                return (
                  <div key={r.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center">
                    <div className="col-span-2 font-mono">{new Date(r.occurred_at).toLocaleDateString()}</div>
                    <div className="col-span-3 truncate">{catName || <span className="text-muted-foreground">—</span>}</div>
                    <div className="col-span-2 text-right font-medium">{formatMoney(r.currency, r.amount_cents)}</div>
                    <div className="col-span-3 truncate text-muted-foreground">
                      {reversal ? <span className="text-foreground">Correction · </span> : null}
                      {r.description || ""}
                    </div>

                    <div className="col-span-1 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReverse(r)}
                        className="gap-2"
                        disabled={saving || reversal}
                        title={reversal ? "Correction entries cannot be corrected again" : "Create a correction/reversal"}
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
                        title={reversal ? "Correction entries are not editable" : "Edit"}
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
              <DialogTitle>{editId ? "Edit payroll" : "Add payroll"}</DialogTitle>
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
                    {payrollCategories.map((c) => (
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
                  placeholder="e.g. Salaries, Bonuses, Contractors"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  If you type a name here, we’ll create (or reuse) a matching payroll category.
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
                  placeholder="Payment / transfer ref (optional)"
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

        {/* Reversal dialog */}
        <Dialog
          open={revOpen}
          onOpenChange={(v) => {
            setRevOpen(v);
            if (!v) resetRev();
          }}
        >
          <DialogTrigger asChild>
            <span />
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create correction/reversal</DialogTitle>
            </DialogHeader>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div>
                Original amount:{" "}
                <span className="text-foreground font-medium">
                  {revOriginal ? formatMoney(revOriginal.currency, revOriginal.amount_cents) : "—"}
                </span>
              </div>
              <div>This will create a new payroll entry with the negative amount and link it to the original entry.</div>
            </div>

            <div className="grid gap-3 md:grid-cols-12 mt-3">
              <div className="space-y-1 md:col-span-4">
                <Label>Date</Label>
                <Input type="date" value={revDate} onChange={(e) => setRevDate(e.target.value)} />
              </div>

              <div className="space-y-1 md:col-span-8">
                <Label>Description</Label>
                <Input value={revDescription} onChange={(e) => setRevDescription(e.target.value)} placeholder="Reason for correction" />
              </div>

              <div className="space-y-1 md:col-span-12">
                <Label>Reference</Label>
                <Input value={revReference} onChange={(e) => setRevReference(e.target.value)} placeholder="Reference (optional)" />
              </div>

              <div className="space-y-1 md:col-span-12">
                <Label>Idempotency key</Label>
                <Input
                  value={revIdempotencyKey}
                  onChange={(e) => setRevIdempotencyKey(e.target.value)}
                  placeholder="(auto-filled) prevents double posting"
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
                  setRevOpen(false);
                  resetRev();
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={() => void createReversal()} disabled={!canReverse || saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Post correction
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
