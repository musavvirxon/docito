// File: src/components/financial/InventoryItemsPanel.tsx
// B14: Inventory avg cost display + optional consumption posting to finance on negative adjustments
// - Shows avg_unit_cost_cents
// - Uses RPC inventory_adjust_stock_v2 with "Post to finance" toggle

import { useEffect, useMemo, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Plus, Package, Save, Minus, PlusCircle, History, DollarSign } from "lucide-react";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";

type ItemRow = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  min_stock_qty: number;
  current_stock_qty: number;
  avg_unit_cost_cents: number;
  is_active: boolean;
  notes: string | null;
};

type AdjRow = {
  id: string;
  item_id: string;
  delta_qty: number;
  reason: string;
  note: string | null;
  occurred_at: string;
};

function parseQty(v: string) {
  const s = String(v || "").trim().replace(/,/g, ".");
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

function formatMoney(currency: string, cents: number) {
  const v = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}

export default function InventoryItemsPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<ItemRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId]);

  // Create item form
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newUnit, setNewUnit] = useState("unit");
  const [newMin, setNewMin] = useState("0");
  const [newNotes, setNewNotes] = useState("");

  // Adjustment form
  const [adjDelta, setAdjDelta] = useState("1");
  const [adjReason, setAdjReason] = useState("manual");
  const [adjNote, setAdjNote] = useState("");

  // Finance posting (consumption)
  const [postToFinance, setPostToFinance] = useState(false);
  const [expenseCategoryName, setExpenseCategoryName] = useState("Supplies usage");

  const [history, setHistory] = useState<AdjRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const canCreate = useMemo(() => {
    if (!entityId) return false;
    if (!newName.trim()) return false;
    const min = parseQty(newMin);
    if (min === null || min < 0) return false;
    if (!newUnit.trim()) return false;
    return true;
  }, [entityId, newMin, newName, newUnit]);

  const fetchItems = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id,name,sku,unit,min_stock_qty,current_stock_qty,avg_unit_cost_cents,is_active,notes")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("is_active", { ascending: false })
        .order("name", { ascending: true })
        .limit(1000);

      if (error) throw error;

      const rows = (data || []) as ItemRow[];
      setItems(rows);

      if (!selectedId && rows[0]?.id) setSelectedId(rows[0].id);
      else if (selectedId && !rows.some((r) => r.id === selectedId)) setSelectedId(rows[0]?.id ?? null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load inventory items");
      setItems([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (itemId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("inventory_adjustments")
        .select("id,item_id,delta_qty,reason,note,occurred_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("item_id", itemId)
        .order("occurred_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setHistory((data || []) as AdjRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load history");
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  useEffect(() => {
    if (selectedId) void fetchHistory(selectedId);
    else setHistory([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const createItem = async () => {
    if (!canCreate) return;
    setSaving(true);
    try {
      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      const uid = u?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const min = parseQty(newMin);
      if (min === null || min < 0) throw new Error("Invalid min stock");

      const payload = {
        entity_type: entityType,
        entity_id: entityId,
        name: newName.trim(),
        sku: newSku.trim() ? newSku.trim() : null,
        unit: newUnit.trim(),
        min_stock_qty: min,
        current_stock_qty: 0,
        avg_unit_cost_cents: 0,
        is_active: true,
        notes: newNotes.trim() ? newNotes.trim() : null,
        created_by: uid,
      };

      const { error } = await supabase.from("inventory_items").insert(payload);
      if (error) throw error;

      toast.success("Item created");
      setNewName("");
      setNewSku("");
      setNewUnit("unit");
      setNewMin("0");
      setNewNotes("");
      await fetchItems();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create item");
    } finally {
      setSaving(false);
    }
  };

  const updateSelected = async (patch: Partial<ItemRow>) => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("inventory_items").update(patch).eq("id", selected.id);
      if (error) throw error;
      toast.success("Saved");
      await fetchItems();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const adjustStock = async (deltaSign: 1 | -1) => {
    if (!selected) return;

    const deltaRaw = parseQty(adjDelta);
    if (deltaRaw === null || deltaRaw <= 0) {
      toast.error("Adjustment qty must be > 0");
      return;
    }

    // Only negative adjustments can be posted as consumption
    const shouldPost = postToFinance && deltaSign === -1;

    setSaving(true);
    try {
      const delta = deltaRaw * deltaSign;

      const { data, error } = await supabase.rpc("inventory_adjust_stock_v2", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_item_id: selected.id,
        p_delta_qty: delta,
        p_reason: adjReason.trim() ? adjReason.trim() : "manual",
        p_note: adjNote.trim() ? adjNote.trim() : null,
        p_occurred_at: null,
        p_post_to_finance: shouldPost,
        p_expense_category_name: expenseCategoryName.trim() ? expenseCategoryName.trim() : "Supplies usage",
      });

      if (error) throw error;

      const row = Array.isArray(data) ? (data as any[])[0] : (data as any);

      const newQty = Number(row?.new_stock_qty ?? 0);
      const posted = Number(row?.posted_amount_cents ?? 0);

      if (shouldPost && posted > 0) {
        toast.success(`Stock updated · posted ${formatMoney("USD", posted)} to finance`);
      } else {
        toast.success(`Stock updated · new stock: ${newQty.toFixed(2)} ${selected.unit}`);
      }

      setAdjNote("");
      await fetchItems();
      await fetchHistory(selected.id);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to adjust stock");
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
            Inventory items
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Create items, set min stock, track average cost, and record adjustments (optionally post consumption to finance).
          </div>
        </div>

        <Button variant="outline" onClick={() => void fetchItems()} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Create */}
        <div className="rounded-md border p-4 space-y-3">
          <div className="text-sm font-medium">Create item</div>

          <div className="grid gap-3 md:grid-cols-6">
            <div className="space-y-1 md:col-span-2">
              <Label>Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Gloves (box)" />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label>SKU</Label>
              <Input value={newSku} onChange={(e) => setNewSku(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label>Unit</Label>
              <Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="box / pcs / ml" />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label>Min stock</Label>
              <Input inputMode="decimal" value={newMin} onChange={(e) => setNewMin(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1 md:col-span-1 flex items-end">
              <Button onClick={() => void createItem()} disabled={!canCreate || saving} className="gap-2 w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </Button>
            </div>
            <div className="space-y-1 md:col-span-6">
              <Label>Notes</Label>
              <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Items list */}
          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">Items</div>
            {loading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">No items yet.</div>
            ) : (
              <div className="space-y-2">
                {items.slice(0, 50).map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className={`w-full text-left rounded-md border px-3 py-2 hover:bg-muted/30 ${
                      selectedId === i.id ? "bg-muted/30" : ""
                    }`}
                    onClick={() => setSelectedId(i.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium truncate pr-2">
                        {i.name} {!i.is_active ? <span className="text-xs text-muted-foreground">(inactive)</span> : null}
                      </div>
                      <div className="text-sm">
                        {Number(i.current_stock_qty).toFixed(2)}{" "}
                        <span className="text-xs text-muted-foreground">{i.unit}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>min {Number(i.min_stock_qty).toFixed(2)} · {i.sku ? `sku ${i.sku}` : "no sku"}</span>
                      <span className="inline-flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        avg {formatMoney("USD", Number(i.avg_unit_cost_cents || 0))}
                      </span>
                    </div>
                  </button>
                ))}
                {items.length > 50 ? <div className="text-xs text-muted-foreground">Showing first 50 of {items.length}.</div> : null}
              </div>
            )}
          </div>

          {/* Item editor + adjustments */}
          <div className="rounded-md border p-3 space-y-3">
            <div className="text-sm font-medium">Item details</div>

            {!selected ? (
              <div className="text-sm text-muted-foreground">Select an item.</div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-6">
                  <div className="space-y-1 md:col-span-4">
                    <Label>Name</Label>
                    <Input
                      defaultValue={selected.name}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (!v) {
                          toast.error("Name required");
                          e.currentTarget.value = selected.name;
                          return;
                        }
                        if (v !== selected.name) void updateSelected({ name: v });
                      }}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <Label>Unit</Label>
                    <Input
                      defaultValue={selected.unit}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (!v) {
                          toast.error("Unit required");
                          e.currentTarget.value = selected.unit;
                          return;
                        }
                        if (v !== selected.unit) void updateSelected({ unit: v });
                      }}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <Label>SKU</Label>
                    <Input
                      defaultValue={selected.sku ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const next = v ? v : null;
                        if ((next ?? "") !== (selected.sku ?? "")) void updateSelected({ sku: next });
                      }}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <Label>Min stock</Label>
                    <Input
                      inputMode="decimal"
                      defaultValue={String(selected.min_stock_qty ?? 0)}
                      onBlur={(e) => {
                        const n = parseQty(e.target.value);
                        if (n === null || n < 0) {
                          toast.error("Min stock must be >= 0");
                          e.currentTarget.value = String(selected.min_stock_qty ?? 0);
                          return;
                        }
                        if (Number(n) !== Number(selected.min_stock_qty ?? 0)) void updateSelected({ min_stock_qty: n as any });
                      }}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <Label>Active</Label>
                    <div className="h-10 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.is_active}
                        onChange={(e) => void updateSelected({ is_active: e.target.checked })}
                        disabled={saving}
                      />
                      <span className="text-sm text-muted-foreground">{selected.is_active ? "Active" : "Inactive"}</span>
                    </div>
                  </div>

                  <div className="space-y-1 md:col-span-6">
                    <Label>Notes</Label>
                    <Input
                      defaultValue={selected.notes ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const next = v ? v : null;
                        if ((next ?? "") !== (selected.notes ?? "")) void updateSelected({ notes: next });
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-md border p-3 space-y-2">
                  <div className="text-sm font-medium">Stock adjustment</div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="text-xs text-muted-foreground">
                      Current: <span className="font-medium">{Number(selected.current_stock_qty).toFixed(2)}</span>{" "}
                      {selected.unit}
                    </div>
                    <div className="text-xs text-muted-foreground md:text-right">
                      Avg cost: <span className="font-medium">{formatMoney("USD", Number(selected.avg_unit_cost_cents || 0))}</span> /{" "}
                      {selected.unit}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-6 md:items-end">
                    <div className="space-y-1 md:col-span-2">
                      <Label>Qty</Label>
                      <Input inputMode="decimal" value={adjDelta} onChange={(e) => setAdjDelta(e.target.value)} placeholder="1" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label>Reason</Label>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={adjReason}
                        onChange={(e) => setAdjReason(e.target.value)}
                      >
                        <option value="manual">manual</option>
                        <option value="count">count</option>
                        <option value="usage">usage</option>
                        <option value="waste">waste</option>
                        <option value="correction">correction</option>
                      </select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label>Note</Label>
                      <Input value={adjNote} onChange={(e) => setAdjNote(e.target.value)} placeholder="Optional" />
                    </div>

                    <div className="md:col-span-6 rounded-md border p-3 bg-muted/20">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={postToFinance} onChange={(e) => setPostToFinance(e.target.checked)} />
                          Post negative adjustments to finance (consumption)
                        </Label>
                        <div className="text-xs text-muted-foreground">
                          Uses avg cost × qty, posts to expense category.
                        </div>
                      </div>

                      <div className="mt-2 grid gap-3 md:grid-cols-3">
                        <div className="md:col-span-2 space-y-1">
                          <Label>Expense category name</Label>
                          <Input
                            value={expenseCategoryName}
                            onChange={(e) => setExpenseCategoryName(e.target.value)}
                            placeholder="Supplies usage"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Posting currency</Label>
                          <Input value="USD" disabled />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-6 flex flex-wrap items-center gap-2 justify-end">
                      <Button variant="outline" onClick={() => void adjustStock(-1)} disabled={saving} className="gap-2">
                        <Minus className="h-4 w-4" />
                        Decrease
                      </Button>
                      <Button onClick={() => void adjustStock(1)} disabled={saving} className="gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Increase
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border p-3 space-y-2">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    Recent adjustments
                  </div>

                  {loadingHistory ? (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No adjustments yet.</div>
                  ) : (
                    <div className="divide-y rounded-md border overflow-hidden">
                      {history.map((h) => (
                        <div key={h.id} className="px-3 py-2 grid grid-cols-12 gap-2 text-sm">
                          <div className="col-span-3 font-mono">{new Date(h.occurred_at).toLocaleDateString()}</div>
                          <div className="col-span-3">
                            <span className="font-medium">{Number(h.delta_qty).toFixed(2)}</span>{" "}
                            <span className="text-xs text-muted-foreground">{selected.unit}</span>
                          </div>
                          <div className="col-span-3 text-muted-foreground">{h.reason}</div>
                          <div className="col-span-3 truncate text-muted-foreground">{h.note || ""}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Save className="h-3.5 w-3.5" />
                  Edits save on blur / toggle.
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
