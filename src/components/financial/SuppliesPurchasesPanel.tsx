// File: src/components/financial/SuppliesPurchasesPanel.tsx
// B11: Supplies purchases list + quick analytics + low-stock list
// - Reads inventory_purchases, inventory_purchase_items, inventory_low_stock_v
// - Uses inventory-purchase-create function from B10 to create purchases
// - Keeps UI consistent, minimal, admin-oriented

import { useEffect, useMemo, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Plus, ShoppingCart, AlertTriangle, PackageSearch } from "lucide-react";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";

type PurchaseRow = {
  id: string;
  vendor_name: string | null;
  purchased_at: string;
  currency: string;
  total_amount_cents: number;
  status: string;
  finance_entry_id: string | null;
  notes: string | null;
};

type PurchaseItemRow = {
  id: string;
  purchase_id: string;
  item_id: string;
  qty: number;
  unit_cost_cents: number;
  line_total_cents: number;
  notes: string | null;
  items?: { id: string; name: string; unit: string } | null;
};

type ItemRow = {
  id: string;
  name: string;
  unit: string;
  current_stock_qty: number;
  min_stock_qty: number;
};

type LowStockRow = {
  id: string;
  name: string;
  unit: string;
  current_stock_qty: number;
  min_stock_qty: number;
  shortage_qty: number;
};

function formatMoney(currency: string, cents: number) {
  const v = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}

function monthKeyUTC(ts: string) {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function parseMajorToCents(v: string) {
  const s = String(v || "").trim();
  if (!s) return 0;
  const n = Number(s.replace(/,/g, "."));
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return Math.round(n * 100);
}

function toIdempotencyKey() {
  // simple client key, good enough: timestamp + random
  return `pur_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

type DraftPurchaseItem = {
  key: string;
  itemId: string;
  qty: string;
  unitCostMajor: string;
  notes: string;
};

function rowKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function SuppliesPurchasesPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [lowStock, setLowStock] = useState<LowStockRow[]>([]);

  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<PurchaseItemRow[]>([]);

  // Create purchase (minimal)
  const [vendorName, setVendorName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [expenseCategoryName, setExpenseCategoryName] = useState("Supplies");
  const [draftItems, setDraftItems] = useState<DraftPurchaseItem[]>([
    { key: rowKey(), itemId: "", qty: "1", unitCostMajor: "", notes: "" },
  ]);

  const fetchAll = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const [purRes, itemsRes, lowRes] = await Promise.all([
        supabase
          .from("inventory_purchases")
          .select("id,vendor_name,purchased_at,currency,total_amount_cents,status,finance_entry_id,notes")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .order("purchased_at", { ascending: false })
          .limit(100),
        supabase
          .from("inventory_items")
          .select("id,name,unit,current_stock_qty,min_stock_qty")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .eq("is_active", true)
          .order("name", { ascending: true })
          .limit(1000),
        supabase
          .from("inventory_low_stock_v")
          .select("id,name,unit,current_stock_qty,min_stock_qty,shortage_qty")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .limit(200),
      ]);

      if (purRes.error) throw purRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (lowRes.error) throw lowRes.error;

      const pur = (purRes.data || []) as PurchaseRow[];
      setPurchases(pur);
      setItems((itemsRes.data || []) as ItemRow[]);
      setLowStock((lowRes.data || []) as LowStockRow[]);

      if (!selectedPurchaseId && pur[0]?.id) {
        setSelectedPurchaseId(pur[0].id);
      } else if (selectedPurchaseId && !pur.some((p) => p.id === selectedPurchaseId)) {
        setSelectedPurchaseId(pur[0]?.id ?? null);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load supplies");
      setPurchases([]);
      setItems([]);
      setLowStock([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseItems = async (purchaseId: string) => {
    try {
      const { data, error } = await supabase
        .from("inventory_purchase_items")
        .select("id,purchase_id,item_id,qty,unit_cost_cents,line_total_cents,notes, items:item_id(id,name,unit)")
        .eq("purchase_id", purchaseId)
        .order("line_total_cents", { ascending: false });

      if (error) throw error;
      setSelectedItems(((data || []) as any) as PurchaseItemRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load purchase items");
      setSelectedItems([]);
    }
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  useEffect(() => {
    if (selectedPurchaseId) void fetchPurchaseItems(selectedPurchaseId);
    else setSelectedItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPurchaseId]);

  const analytics = useMemo(() => {
    // simple: group purchases by month
    const byMonth = new Map<string, { total: number; currency: string; count: number }>();
    for (const p of purchases) {
      const k = monthKeyUTC(p.purchased_at);
      const cur = (p.currency || "USD").toUpperCase();
      const prev = byMonth.get(k) || { total: 0, currency: cur, count: 0 };
      prev.total += Number(p.total_amount_cents || 0) || 0;
      prev.count += 1;
      byMonth.set(k, prev);
    }
    const rows = Array.from(byMonth.entries())
      .map(([month, v]) => ({ month, totalCents: v.total, currency: v.currency, count: v.count }))
      .sort((a, b) => (a.month < b.month ? 1 : -1));
    const latest = rows[0] || null;
    return { rows, latest };
  }, [purchases]);

  const canCreatePurchase = useMemo(() => {
    if (!entityId) return false;
    if (!currency.trim()) return false;
    if (!expenseCategoryName.trim()) return false;

    if (draftItems.length === 0) return false;

    for (const it of draftItems) {
      if (!it.itemId.trim()) return false;
      const qty = Number(it.qty);
      if (!Number.isFinite(qty) || qty <= 0) return false;
      const cents = parseMajorToCents(it.unitCostMajor);
      if (cents === null || cents < 0) return false;
    }

    return true;
  }, [currency, draftItems, entityId, expenseCategoryName]);

  const addDraftItem = () => {
    setDraftItems((prev) => [...prev, { key: rowKey(), itemId: "", qty: "1", unitCostMajor: "", notes: "" }]);
  };

  const removeDraftItem = (key: string) => {
    setDraftItems((prev) => prev.filter((x) => x.key !== key));
  };

  const updateDraftItem = (key: string, patch: Partial<DraftPurchaseItem>) => {
    setDraftItems((prev) => prev.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  };

  const createPurchase = async () => {
    if (!canCreatePurchase) return;
    setCreating(true);
    try {
      const payloadItems = draftItems.map((it) => {
        const qty = Number(it.qty);
        const unitCostCents = parseMajorToCents(it.unitCostMajor);
        if (unitCostCents === null) throw new Error("Invalid unit cost");
        return {
          itemId: it.itemId,
          qty,
          unitCostCents,
          notes: it.notes.trim() ? it.notes.trim() : undefined,
        };
      });

      const { data, error } = await supabase.functions.invoke("inventory-purchase-create", {
        body: {
          entityType,
          entityId,
          idempotencyKey: toIdempotencyKey(),
          currency: currency.trim().toUpperCase(),
          vendorName: vendorName.trim() ? vendorName.trim() : undefined,
          expenseCategoryName: expenseCategoryName.trim(),
          items: payloadItems,
        },
      });

      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error || "Failed to create purchase");

      toast.success("Purchase created and posted to finance");
      setVendorName("");
      setDraftItems([{ key: rowKey(), itemId: "", qty: "1", unitCostMajor: "", notes: "" }]);
      await fetchAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create purchase");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            Supplies purchases
          </CardTitle>
          <div className="text-sm text-muted-foreground">Track purchases, update stock, and post expenses to finance.</div>
        </div>

        <Button variant="outline" onClick={() => void fetchAll()} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Low stock */}
        <div className="rounded-md border p-3">
          <div className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Low stock
          </div>

          {lowStock.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-2">No low-stock items.</div>
          ) : (
            <div className="mt-2 space-y-2">
              {lowStock.slice(0, 8).map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <div className="truncate pr-3">
                    {r.name} <span className="text-xs text-muted-foreground">({r.unit})</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {Number(r.current_stock_qty).toFixed(2)} / min {Number(r.min_stock_qty).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">short {Number(r.shortage_qty).toFixed(2)}</div>
                  </div>
                </div>
              ))}
              {lowStock.length > 8 ? (
                <div className="text-xs text-muted-foreground">Showing first 8 of {lowStock.length}.</div>
              ) : null}
            </div>
          )}
        </div>

        {/* Analytics */}
        <div className="rounded-md border p-3">
          <div className="text-sm font-medium flex items-center gap-2">
            <PackageSearch className="h-4 w-4 text-muted-foreground" />
            Purchase analytics
          </div>

          {analytics.latest ? (
            <div className="mt-2 text-sm">
              Latest month <span className="font-mono">{analytics.latest.month}</span>:{" "}
              <span className="font-medium">{formatMoney(analytics.latest.currency, analytics.latest.totalCents)}</span>{" "}
              <span className="text-xs text-muted-foreground">· {analytics.latest.count} purchases</span>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">No purchases yet.</div>
          )}

          {analytics.rows.length > 0 ? (
            <div className="mt-3 rounded-md border overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
                <div className="col-span-4">Month</div>
                <div className="col-span-4 text-right">Total</div>
                <div className="col-span-4 text-right">Count</div>
              </div>
              <div className="divide-y">
                {analytics.rows.slice(0, 6).map((r) => (
                  <div key={r.month} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                    <div className="col-span-4 font-mono">{r.month}</div>
                    <div className="col-span-4 text-right">{formatMoney(r.currency, r.totalCents)}</div>
                    <div className="col-span-4 text-right text-muted-foreground">{r.count}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Create purchase */}
        <div className="rounded-md border p-4 space-y-3">
          <div className="text-sm font-medium">Create purchase</div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1 md:col-span-2">
              <Label>Vendor (optional)</Label>
              <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Vendor name" />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
            </div>
            <div className="space-y-1">
              <Label>Expense category name</Label>
              <Input value={expenseCategoryName} onChange={(e) => setExpenseCategoryName(e.target.value)} placeholder="Supplies" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Items</div>
              <Button variant="outline" onClick={addDraftItem} className="gap-2">
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>

            {draftItems.map((it) => (
              <div key={it.key} className="rounded-md border p-3 grid gap-3 md:grid-cols-12 md:items-end">
                <div className="md:col-span-5 space-y-1">
                  <Label>Inventory item</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={it.itemId}
                    onChange={(e) => updateDraftItem(it.key, { itemId: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {items.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} ({x.unit}) · stock {Number(x.current_stock_qty).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <Label>Qty</Label>
                  <Input
                    inputMode="decimal"
                    value={it.qty}
                    onChange={(e) => updateDraftItem(it.key, { qty: e.target.value })}
                    placeholder="1"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <Label>Unit cost</Label>
                  <Input
                    inputMode="decimal"
                    value={it.unitCostMajor}
                    onChange={(e) => updateDraftItem(it.key, { unitCostMajor: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <Label>Notes</Label>
                  <Input value={it.notes} onChange={(e) => updateDraftItem(it.key, { notes: e.target.value })} placeholder="Optional" />
                </div>

                <div className="md:col-span-12 flex justify-end">
                  <Button variant="outline" onClick={() => removeDraftItem(it.key)} disabled={draftItems.length <= 1}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void createPurchase()} disabled={!canCreatePurchase || creating} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create & post
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            This will increase stock and create an expense entry (shows in Budget vs Actual automatically).
          </div>
        </div>

        {/* Purchases list + details */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">Recent purchases</div>
            {purchases.length === 0 ? (
              <div className="text-sm text-muted-foreground">No purchases yet.</div>
            ) : (
              <div className="space-y-2">
                {purchases.slice(0, 20).map((p) => (
                  <button
                    key={p.id}
                    className={`w-full text-left rounded-md border px-3 py-2 hover:bg-muted/30 ${
                      selectedPurchaseId === p.id ? "bg-muted/30" : ""
                    }`}
                    onClick={() => setSelectedPurchaseId(p.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium truncate pr-2">{p.vendor_name || "Supplies purchase"}</div>
                      <div className="text-sm">{formatMoney(p.currency, p.total_amount_cents)}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.purchased_at).toLocaleString()} · {p.status}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">Purchase details</div>
            {!selectedPurchaseId ? (
              <div className="text-sm text-muted-foreground">Select a purchase to see items.</div>
            ) : selectedItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">No items.</div>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <div className="truncate pr-3">
                      {r.items?.name || r.item_id}{" "}
                      <span className="text-xs text-muted-foreground">({r.items?.unit || "unit"})</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatMoney(currency, r.line_total_cents)}</div>
                      <div className="text-xs text-muted-foreground">
                        {Number(r.qty).toFixed(2)} × {formatMoney(currency, r.unit_cost_cents)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
