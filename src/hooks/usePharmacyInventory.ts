// File: src/hooks/usePharmacyInventory.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InventoryItem {
  id: string;
  pharmacy_id: string;
  medication_name: string;
  medication_code?: string;
  ndc_code?: string;
  manufacturer?: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_level: number;
  unit_cost?: number;
  unit_price?: number;
  expiry_date?: string;
  batch_number?: string;
  storage_location?: string;
  requires_refrigeration: boolean;
  is_controlled_substance: boolean;
  controlled_substance_schedule?: string;
}

function toNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, ".").trim());
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function toCentsFromMajor(v: unknown): number {
  const n = toNumber(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

async function postFinanceExpenseForInventoryAdd(pharmacyId: string, item: InventoryItem) {
  // Step 30 (Ledger-first A): treat "adding inventory with quantity + unit_cost" as a supply purchase
  const qty = Number(item.quantity_on_hand || 0);
  const unitCostMajor = toNumber(item.unit_cost);

  if (!pharmacyId) return;
  if (!Number.isFinite(qty) || qty <= 0) return;
  if (!Number.isFinite(unitCostMajor) || unitCostMajor <= 0) return;

  const amountCents = Math.round(qty * toCentsFromMajor(unitCostMajor));
  if (!Number.isFinite(amountCents) || amountCents <= 0) return;

  try {
    const { data, error } = await supabase.functions.invoke("finance-post-entry", {
      body: {
        entityType: "pharmacy",
        entityId: pharmacyId,
        entryType: "expense",
        amountCents,
        currency: "USD",
        occurredAt: new Date().toISOString(),
        categoryName: "Supplies",
        description: `Inventory purchase: ${item.medication_name}`,
        source: { table: "pharmacy_inventory", id: item.id },
        metadata: {
          inventory_item_id: item.id,
          pharmacy_id: pharmacyId,
          medication_name: item.medication_name,
          medication_code: item.medication_code ?? null,
          ndc_code: item.ndc_code ?? null,
          manufacturer: item.manufacturer ?? null,
          batch_number: item.batch_number ?? null,
          expiry_date: item.expiry_date ?? null,
          quantity_added: qty,
          unit_cost: unitCostMajor,
          computed_total_cents: amountCents,
        },
      },
    });

    if (error) throw error;
    if (data && (data as any).ok === false) throw new Error((data as any).error || "finance-post-entry failed");
  } catch (e) {
    // Do not block inventory workflows if finance ledger posting fails.
    // Idempotency is handled by finance_event_links via source table+id.
    console.error("Finance ledger post failed (inventory purchase):", e);
  }
}

export const usePharmacyInventory = (pharmacyId?: string) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [expiringItems, setExpiringItems] = useState<InventoryItem[]>([]);

  const debounceRef = useRef<number | null>(null);

  const computeDerived = useCallback((rows: InventoryItem[]) => {
    const lowStock = rows.filter((item) => item.quantity_on_hand - item.quantity_reserved <= item.reorder_level);
    setLowStockItems(lowStock);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiring = rows.filter((item) => item.expiry_date && new Date(item.expiry_date) <= thirtyDaysFromNow);
    setExpiringItems(expiring);
  }, []);

  const fetchInventory = useCallback(async () => {
    if (!pharmacyId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("pharmacy_inventory")
        .select("*")
        .eq("pharmacy_id", pharmacyId)
        .order("medication_name");

      if (error) throw error;

      const rows = (data || []) as InventoryItem[];
      setInventory(rows);
      computeDerived(rows);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  }, [computeDerived, pharmacyId]);

  useEffect(() => {
    if (pharmacyId) fetchInventory();
  }, [fetchInventory, pharmacyId]);

  // Realtime refresh
  useEffect(() => {
    if (!pharmacyId) return;

    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => fetchInventory(), 350);
    };

    const channel = supabase
      .channel(`pharmacy-inventory-live-${pharmacyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pharmacy_inventory", filter: `pharmacy_id=eq.${pharmacyId}` },
        () => schedule(),
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchInventory, pharmacyId]);

  const addInventoryItem = async (item: Partial<InventoryItem>) => {
    try {
      const { data, error } = await supabase
        .from("pharmacy_inventory")
        .insert({
          pharmacy_id: pharmacyId!,
          medication_name: item.medication_name!,
          medication_code: item.medication_code,
          ndc_code: item.ndc_code,
          manufacturer: item.manufacturer,
          quantity_on_hand: item.quantity_on_hand ?? 0,
          quantity_reserved: item.quantity_reserved ?? 0,
          reorder_level: item.reorder_level ?? 10,
          unit_cost: item.unit_cost,
          unit_price: item.unit_price,
          expiry_date: item.expiry_date,
          batch_number: item.batch_number,
          storage_location: item.storage_location,
          requires_refrigeration: item.requires_refrigeration ?? false,
          is_controlled_substance: item.is_controlled_substance ?? false,
          controlled_substance_schedule: item.controlled_substance_schedule,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Inventory item added");
      // Realtime will refresh; still update optimistically
      const next = [...inventory, data as InventoryItem].sort((a, b) => a.medication_name.localeCompare(b.medication_name));
      setInventory(next);
      computeDerived(next);

      // Step 30: write expense ledger entry for supplies purchase (non-blocking)
      if (pharmacyId) {
        void postFinanceExpenseForInventoryAdd(pharmacyId, data as InventoryItem);
      }

      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to add item");
      throw error;
    }
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const { data, error } = await supabase
        .from("pharmacy_inventory")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Inventory updated");
      const next = inventory.map((item) => (item.id === id ? (data as InventoryItem) : item));
      setInventory(next);
      computeDerived(next);
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to update item");
      throw error;
    }
  };

  const adjustQuantity = async (id: string, adjustment: number) => {
    try {
      const item = inventory.find((i) => i.id === id);
      if (!item) throw new Error("Item not found");

      const newQuantity = item.quantity_on_hand + adjustment;
      if (newQuantity < 0) throw new Error("Cannot reduce below zero");

      const { data, error } = await supabase
        .from("pharmacy_inventory")
        .update({ quantity_on_hand: newQuantity })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success(`Quantity ${adjustment > 0 ? "increased" : "decreased"} by ${Math.abs(adjustment)}`);
      const next = inventory.map((i) => (i.id === id ? (data as InventoryItem) : i));
      setInventory(next);
      computeDerived(next);
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to adjust quantity");
      throw error;
    }
  };

  const deleteInventoryItem = async (id: string) => {
    try {
      const { error } = await supabase.from("pharmacy_inventory").delete().eq("id", id);

      if (error) throw error;

      toast.success("Item removed from inventory");
      const next = inventory.filter((item) => item.id !== id);
      setInventory(next);
      computeDerived(next);
    } catch (error: any) {
      toast.error(error.message || "Failed to remove item");
      throw error;
    }
  };

  return {
    inventory,
    loading,
    lowStockItems,
    expiringItems,
    addInventoryItem,
    updateInventoryItem,
    adjustQuantity,
    deleteInventoryItem,
    fetchInventory,
  };
};
