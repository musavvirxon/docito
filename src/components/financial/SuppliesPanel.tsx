// File: src/components/financial/SuppliesPanel.tsx
// B23: Supplies purchases UI (create purchase + list purchases + view items)
// - Uses RPC supplies_purchase_create
// - Direct queries to list purchases and purchase items

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { Loader2, RefreshCw, Package, Plus, ChevronDown, ChevronUp } from "lucide-react";

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type PurchaseRow = {
  id: string;
  occurred_at: string;
  vendor_name: string | null;
  currency: string;
  total_cents: number;
  notes: string | null;
  finance_entry_id: string | null;
};

type PurchaseItemRow = {
  id: string;
  purchase_id: string;
  item_name: string;
  qty: number;
  unit_cost_cents: number;
  line_total_cents: number;
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

function formatMoney(currency: string, cents: number) {
  const v = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(v);
  } catch {
    const sign = v < 0 ? "-" : "";
    return `${sign}${currency || "USD"} ${Math.abs(v).toFixed(2)}`;
  }
}

function middayUtcISO(dateStr: string) {
  return new Date(`${dateStr}T12:00:00.000Z`).toISOString();
}

function qtyNumber(v: string) {
  const s = String(v || "").trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, "."));
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return Math.round(n * 1000) / 1000;
}

type DraftItem = { name: string; qty: string; unitCost: string };

export default function SuppliesPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const today = useMemo(() => new Date(), []);
  const [dateFrom, setDateFrom] = useState(() => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)));
  const [dateTo, setDateTo] = useState(() => isoDate(today));

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [itemsByPurchase, setItemsByPurchase] = useState<Record<string, PurchaseItemRow[]>>({});

  // create dialog
  const [open, setOpen] = useState(false);
  const [formDate, setFormDate] = useState(() => isoDate(today));
  const [formCurrency, setFormCurrency] = useState("USD");
  const [formVendor, setFormVendor] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [idemKey, setIdemKey] = useState(() => `supplies_${Date.now()}`);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([
    { name: "", qty: "1", unitCost: "" },
    { name: "", qty: "1", unitCost: "" },
    { name: "", qty: "1", unitCost: "" },
  ]);

  const totals = useMemo(() => {
    let sum = 0;
    for (const p of purchases) sum += Number(p.total_cents || 0) || 0;
    return sum;
  }, [purchases]);

  const currencyHint = useMemo(() => (purchases[0]?.currency || "USD").toUpperCase(), [purchases]);

  const resetForm = () => {
    setFormDate(isoDate(today));
    setFormCurrency("USD");
    setFormVendor("");
    setFormNotes("");
    setIdemKey(`supplies_${Date.now()}`);
    setDraftItems([
      { name: "", qty: "1", unitCost: "" },
      { name: "", qty: "1", unitCost: "" },
      { name: "", qty: "1", unitCost: "" },
    ]);
  };

  const loadPurchases = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const fromIso = startOfDayISO(dateFrom);
      const toIso = endOfDayISO(dateTo);

      const { data, error } = await supabase
        .from("supplies_purchases")
        .select("id,occurred_at,vendor_name,currency,total_cents,notes,finance_entry_id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .gte("occurred_at", fromIso)
        .lte("occurred_at", toIso)
        .order("occurred_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      setPurchases((data || []) as any);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load supplies purchases");
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (purchaseId: string) => {
    try {
      const { data, error } = await supabase
        .from("supplies_purchase_items")
        .select("id,purchase_id,item_name,qty,unit_cost_cents,line_total_cents")
        .eq("purchase_id", purchaseId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;

      setItemsByPurchase((prev) => ({ ...prev, [purchaseId]: (data || []) as any }));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load purchase items");
    }
  };

  useEffect(() => {
    void loadPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const toggleExpand = async (p: PurchaseRow) => {
    const next = !expanded[p.id];
    setExpanded((prev) => ({ ...prev, [p.id]: next }));
    if (next && !itemsByPurchase[p.id]) {
      await loadItems(p.id);
    }
  };

  const canSave = useMemo(() => {
    if (!entityId) return false;
    if (!formDate.trim()) return false;

    const clean = draftItems
      .map((it) => ({
        name: it.name.trim(),
        qty: qtyNumber(it.qty),
        unitCost: parseMajorToCents(it.unitCost),
      }))
      .filter((x) => x.name && x.qty !== null && x.unitCost !== null);

    return clean.length > 0;
  }, [draftItems, entityId, formDate]);

  const createPurchase = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const occurredAt = middayUtcISO(formDate);

      const items = draftItems
        .map((it) => ({
          name: it.name.trim(),
          qty: qtyNumber(it.qty),
          unit_cost_cents: parseMajorToCents(it.unitCost),
        }))
        .filter((x) => x.name && x.qty !== null && x.unit_cost_cents !== null)
        .map((x) => ({
          name: x.name,
          qty: x.qty,
          unit_cost_cents: x.unit_cost_cents,
        }));

      if (!items.length) throw new Error("Add at least one valid item");

      const { data, error } = await supabase.rpc("supplies_purchase_create", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_occurred_at: occurredAt,
        p_currency: normalizeCurrency(formCurrency),
        p_vendor_name: formVendor.trim() ? formVendor.trim() : null,
        p_notes: formNotes.trim() ? formNotes.trim() : null,
        p_items: items as any,
        p_idempotency_key: idemKey.trim() ? idemKey.trim() : null,
      });

      if (error) throw error;

      const purchaseId = Array.isArray(data) ? data[0]?.purchase_id : (data as any)?.purchase_id;
      if (!purchaseId) throw new Error("Failed to create purchase");

      toast.success("Supplies purchase saved and posted to expenses");
      setOpen(false);
      resetForm();
      await loadPurchases();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create supplies purchase");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Supplies
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Record purchases and automatically post them as expense entries (category: Supplies).
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add purchase
          </Button>

          <Button variant="outline" onClick={() => void loadPurchases()} disabled={loading} className="gap-2">
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
            <div className="md:col-span-6 flex items-end justify-end">
              <Button variant="outline" onClick={() => void loadPurchases()} className="gap-2 w-full md:w-auto">
                <RefreshCw className="h-4 w-4" />
                Apply
              </Button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Total supplies purchases (filtered range)</div>
          <div className="text-sm font-medium">{formatMoney(currencyHint, totals)}</div>
        </div>

        {/* Purchases list */}
        <div className="rounded-md border overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
            <div className="col-span-2">Date</div>
            <div className="col-span-4">Vendor</div>
            <div className="col-span-3">Notes</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1 text-right">Items</div>
          </div>

          {loading ? (
            <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : purchases.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No purchases in this range.</div>
          ) : (
            <div className="divide-y">
              {purchases.map((p) => {
                const isOpen = Boolean(expanded[p.id]);
                const items = itemsByPurchase[p.id] || null;

                return (
                  <div key={p.id} className="px-3 py-2">
                    <div className="grid grid-cols-12 gap-2 text-sm items-center">
                      <div className="col-span-2 font-mono">{new Date(p.occurred_at).toLocaleDateString()}</div>
                      <div className="col-span-4 truncate">{p.vendor_name || <span className="text-muted-foreground">—</span>}</div>
                      <div className="col-span-3 truncate text-muted-foreground">{p.notes || ""}</div>
                      <div className="col-span-2 text-right font-medium">{formatMoney(p.currency, p.total_cents)}</div>
                      <div className="col-span-1 text-right">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => void toggleExpand(p)}>
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {isOpen ? (
                      <div className="mt-2 rounded-md border bg-background">
                        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
                          <div className="col-span-6">Item</div>
                          <div className="col-span-2 text-right">Qty</div>
                          <div className="col-span-2 text-right">Unit</div>
                          <div className="col-span-2 text-right">Line</div>
                        </div>

                        {!items ? (
                          <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading items…
                          </div>
                        ) : items.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground">No items.</div>
                        ) : (
                          <div className="divide-y">
                            {items.map((it) => (
                              <div key={it.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center">
                                <div className="col-span-6 truncate">{it.item_name}</div>
                                <div className="col-span-2 text-right text-muted-foreground">{Number(it.qty).toFixed(3).replace(/\.?0+$/,"")}</div>
                                <div className="col-span-2 text-right text-muted-foreground">
                                  {formatMoney(p.currency, it.unit_cost_cents)}
                                </div>
                                <div className="col-span-2 text-right font-medium">
                                  {formatMoney(p.currency, it.line_total_cents)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create purchase dialog */}
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

          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add supplies purchase</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-12">
              <div className="space-y-1 md:col-span-3">
                <Label>Date</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>

              <div className="space-y-1 md:col-span-3">
                <Label>Currency</Label>
                <Input value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)} placeholder="USD" />
              </div>

              <div className="space-y-1 md:col-span-6">
                <Label>Vendor</Label>
                <Input value={formVendor} onChange={(e) => setFormVendor(e.target.value)} placeholder="Optional" />
              </div>

              <div className="space-y-1 md:col-span-12">
                <Label>Notes</Label>
                <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional notes" />
              </div>
            </div>

            <div className="rounded-md border p-3 mt-3 space-y-3">
              <div className="text-sm font-medium">Items</div>

              <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground">
                <div className="col-span-6">Name</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-3 text-right">Unit cost</div>
                <div className="col-span-1 text-right">—</div>
              </div>

              <div className="space-y-2">
                {draftItems.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <Input
                        value={it.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraftItems((prev) => prev.map((p, i) => (i === idx ? { ...p, name: v } : p)));
                        }}
                        placeholder="e.g. Gloves"
                      />
                    </div>

                    <div className="col-span-2">
                      <Input
                        inputMode="decimal"
                        value={it.qty}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraftItems((prev) => prev.map((p, i) => (i === idx ? { ...p, qty: v } : p)));
                        }}
                        placeholder="1"
                      />
                    </div>

                    <div className="col-span-3">
                      <Input
                        inputMode="decimal"
                        value={it.unitCost}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraftItems((prev) => prev.map((p, i) => (i === idx ? { ...p, unitCost: v } : p)));
                        }}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="col-span-1 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDraftItems((prev) => prev.filter((_, i) => i !== idx))}
                        disabled={draftItems.length <= 1}
                        title="Remove"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDraftItems((prev) => [...prev, { name: "", qty: "1", unitCost: "" }])}
                >
                  + Add item
                </Button>

                <div className="space-y-1">
                  <Label>Idempotency key</Label>
                  <Input value={idemKey} onChange={(e) => setIdemKey(e.target.value)} />
                  <div className="text-xs text-muted-foreground">Prevents duplicate posting if you click twice.</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-3">
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
              <Button onClick={() => void createPurchase()} disabled={!canSave || saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save purchase
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
