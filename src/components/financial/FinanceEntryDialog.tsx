// File: src/components/financial/FinanceEntryDialog.tsx

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export type FinanceCategoryRow = {
  id: string;
  kind: "income" | "expense" | "transfer" | "adjustment" | "payroll";
  name: string;
  is_active: boolean;
};

export type FinanceEntryRow = {
  id: string;
  entry_type: "income" | "expense" | "transfer" | "adjustment" | "payroll";
  category_id: string | null;
  amount_cents: number;
  currency: string;
  occurred_at: string;
  description: string | null;
  metadata: any;
};

export type FinanceEntryDraft = {
  entryType: FinanceEntryRow["entry_type"];
  categoryId: string | null;
  amountCents: number;
  currency: string;
  occurredAt: string; // ISO
  description: string;
  metadata: Record<string, any>;
};

function toDatetimeLocal(iso: string) {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch {
    return "";
  }
}

function datetimeLocalToIso(v: string) {
  if (!v) return new Date().toISOString();
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function parseMoneyToCents(v: string) {
  const n = Number(String(v || "").split(",").join("").trim());
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToMoney(cents: number) {
  return ((Number(cents) || 0) / 100).toFixed(2);
}

function allowedCategoryKindsForEntryType(entryType: FinanceEntryRow["entry_type"]) {
  if (entryType === "income") return new Set(["income"]);
  if (entryType === "expense") return new Set(["expense"]);
  if (entryType === "payroll") return new Set(["payroll", "expense"]);
  if (entryType === "transfer") return new Set(["transfer"]);
  return new Set(["adjustment"]);
}

function normalizeAmountByType(entryType: FinanceEntryRow["entry_type"], cents: number) {
  if (entryType === "adjustment") return cents; // allow negative
  if (entryType === "income") return Math.abs(cents);
  if (entryType === "expense" || entryType === "payroll") return Math.abs(cents);
  if (entryType === "transfer") return Math.abs(cents);
  return cents;
}

interface FinanceEntryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currencyDefault: string;
  categories: FinanceCategoryRow[];
  loadingCategories: boolean;
  initialRow: FinanceEntryRow | null;
  onSave: (draft: FinanceEntryDraft) => Promise<void>;
}

export default function FinanceEntryDialog({
  open,
  onOpenChange,
  currencyDefault,
  categories,
  loadingCategories,
  initialRow,
  onSave,
}: FinanceEntryDialogProps) {
  const isEdit = !!initialRow?.id;

  const [saving, setSaving] = useState(false);

  const [entryType, setEntryType] = useState<FinanceEntryRow["entry_type"]>("income");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("0.00");
  const [currency, setCurrency] = useState<string>(currencyDefault || "USD");
  const [occurredAtLocal, setOccurredAtLocal] = useState<string>(toDatetimeLocal(new Date().toISOString()));
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    if (initialRow) {
      setEntryType(initialRow.entry_type);
      setCategoryId(initialRow.category_id ?? null);
      setAmount(centsToMoney(initialRow.amount_cents));
      setCurrency((initialRow.currency || currencyDefault || "USD").toUpperCase());
      setOccurredAtLocal(toDatetimeLocal(initialRow.occurred_at));
      setDescription(initialRow.description || "");
      return;
    }

    // create defaults
    setEntryType("income");
    setCategoryId(null);
    setAmount("0.00");
    setCurrency((currencyDefault || "USD").toUpperCase());
    setOccurredAtLocal(toDatetimeLocal(new Date().toISOString()));
    setDescription("");
  }, [open, initialRow, currencyDefault]);

  const filteredCategories = useMemo(() => {
    const allowedKinds = allowedCategoryKindsForEntryType(entryType);
    return (categories || [])
      .filter((c) => c.is_active !== false)
      .filter((c) => allowedKinds.has(c.kind))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, entryType]);

  useEffect(() => {
    // If selected category is no longer valid after switching entry type, clear it.
    if (!categoryId) return;
    const exists = filteredCategories.some((c) => c.id === categoryId);
    if (!exists) setCategoryId(null);
  }, [filteredCategories, categoryId]);

  const handleSubmit = async () => {
    const centsRaw = parseMoneyToCents(amount);
    const cents = normalizeAmountByType(entryType, centsRaw);

    if (!cents || cents === 0) {
      toast.error("Amount must be non-zero");
      return;
    }

    const occurredAtIso = datetimeLocalToIso(occurredAtLocal);

    setSaving(true);
    try {
      await onSave({
        entryType,
        categoryId,
        amountCents: cents,
        currency: (currency || currencyDefault || "USD").toUpperCase(),
        occurredAt: occurredAtIso,
        description: description?.trim() || "",
        metadata: {},
      });
      onOpenChange(false);
    } catch (e: any) {
      // onSave already shows toast; keep silent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base">{isEdit ? "Edit entry" : "Add entry"}</DialogTitle>
            <Badge variant="secondary" className="capitalize">
              {entryType}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={entryType} onValueChange={(v) => setEntryType(v as any)} disabled={saving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="payroll">Payroll</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                Payroll is treated as an expense in analytics.
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date & time</Label>
              <Input
                type="datetime-local"
                value={occurredAtLocal}
                onChange={(e) => setOccurredAtLocal(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Category</Label>
              <Select
                value={categoryId ?? ""}
                onValueChange={(v) => setCategoryId(v ? v : null)}
                disabled={saving || loadingCategories}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingCategories ? "Loading..." : "Select category (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No categories for this type
                    </SelectItem>
                  ) : (
                    filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                Categories are entity-specific. We’ll add a category manager in a later step.
              </div>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                disabled={saving}
                placeholder="USD"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-1">
              <Label>Amount</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={saving}
                inputMode="decimal"
                placeholder="0.00"
              />
              <div className="text-xs text-muted-foreground">
                Adjustment can be negative. Other types are saved as absolute values.
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
                placeholder="Optional note (e.g., utilities bill, supplies, consultation income)"
                rows={3}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
