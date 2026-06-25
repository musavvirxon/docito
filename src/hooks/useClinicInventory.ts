// src/hooks/useClinicInventory.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export type InventoryCategory = 'medication' | 'instrument' | 'supply' | 'consumable';
export type InventoryChangeType =
  | 'addition'
  | 'deduction'
  | 'adjustment'
  | 'procedure_use'
  | 'expired'
  | 'damaged';

export interface ClinicInventoryItem {
  id: string;
  entity_id: string;
  name: string;
  description: string | null;
  category: InventoryCategory;
  unit: string;
  quantity_in_stock: number;
  reorder_level: number;
  avg_daily_usage: number | null;
  expiry_date: string | null;
  supplier: string | null;
  unit_cost: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryLog {
  id: string;
  inventory_id: string;
  entity_id: string;
  change_type: InventoryChangeType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface ProcedureInventoryRequirement {
  id: string;
  entity_id: string;
  procedure_id: string | null;
  procedure_name: string | null;
  inventory_id: string;
  quantity_required: number;
  created_at: string;
  inventory_item?: ClinicInventoryItem;
}

export interface AddInventoryItemInput {
  name: string;
  description?: string | null;
  category: InventoryCategory;
  unit: string;
  quantity_in_stock: number;
  reorder_level?: number;
  avg_daily_usage?: number | null;
  expiry_date?: string | null;
  supplier?: string | null;
  unit_cost?: number | null;
  notes?: string | null;
}

export interface AdjustStockInput {
  change_type: InventoryChangeType;
  quantity: number; // for 'adjustment' this is the final amount; otherwise the delta
  notes?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
}

// ── Days-remaining helper ──────────────────────────────────────────────────
export function calcDaysRemaining(item: ClinicInventoryItem): number | null {
  if (!item.avg_daily_usage || item.avg_daily_usage <= 0) return null;
  return Math.floor(item.quantity_in_stock / item.avg_daily_usage);
}

// ── Stock status helper ────────────────────────────────────────────────────
export type StockStatus = 'ok' | 'low' | 'critical' | 'out';

export function getStockStatus(item: ClinicInventoryItem): StockStatus {
  if (item.quantity_in_stock <= 0) return 'out';
  if (item.quantity_in_stock <= item.reorder_level * 0.5) return 'critical';
  if (item.quantity_in_stock <= item.reorder_level) return 'low';
  return 'ok';
}

// ── Main hook ──────────────────────────────────────────────────────────────
export function useClinicInventory(entityId: string | null | undefined) {
  const { session } = useAuth();
  const { t } = useTranslation('inventory');
  const [items, setItems] = useState<ClinicInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const userId = session?.user?.id;

  // ── Fetch all active inventory items ──────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_inventory')
        .select('*')
        .eq('entity_id', entityId)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setItems((data as ClinicInventoryItem[]) || []);
    } catch (err: any) {
      console.error('useClinicInventory: fetch failed', err);
      toast.error(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [entityId, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Add a new item ────────────────────────────────────────────────────────
  const addItem = useCallback(
    async (input: AddInventoryItemInput): Promise<ClinicInventoryItem | null> => {
      if (!entityId || !userId) return null;
      try {
        const { data, error } = await supabase
          .from('clinic_inventory')
          .insert({
            entity_id: entityId,
            name: input.name.trim(),
            description: input.description || null,
            category: input.category,
            unit: input.unit,
            quantity_in_stock: input.quantity_in_stock,
            reorder_level: input.reorder_level ?? 10,
            avg_daily_usage: input.avg_daily_usage ?? null,
            expiry_date: input.expiry_date || null,
            supplier: input.supplier || null,
            unit_cost: input.unit_cost ?? null,
            notes: input.notes || null,
            is_active: true,
            created_by: userId,
            updated_by: userId,
          } as any)
          .select()
          .single();

        if (error) throw error;

        // Log the initial stock addition
        if (input.quantity_in_stock > 0 && data) {
          await (supabase as any).from('clinic_inventory_logs').insert({
            inventory_id: (data as any).id,
            entity_id: entityId,
            change_type: 'addition',
            quantity_change: input.quantity_in_stock,
            quantity_before: 0,
            quantity_after: input.quantity_in_stock,
            reference_type: 'manual',
            notes: 'Initial stock',
            performed_by: userId,
          } as any);
        }

        toast.success(t('success.added'));
        await refresh();
        return data as ClinicInventoryItem;
      } catch (err: any) {
        console.error('addItem failed', err);
        toast.error(t('errors.saveFailed'));
        return null;
      }
    },
    [entityId, userId, refresh, t],
  );

  // ── Update an existing item (metadata only, not quantity) ─────────────────
  const updateItem = useCallback(
    async (id: string, updates: Partial<AddInventoryItemInput>): Promise<boolean> => {
      if (!entityId || !userId) return false;
      try {
        const { error } = await supabase
          .from('clinic_inventory')
          .update({
            ...updates,
            updated_by: userId,
          } as any)
          .eq('id', id)
          .eq('entity_id', entityId);

        if (error) throw error;
        toast.success(t('success.updated'));
        await refresh();
        return true;
      } catch (err: any) {
        console.error('updateItem failed', err);
        toast.error(t('errors.saveFailed'));
        return false;
      }
    },
    [entityId, userId, refresh, t],
  );

  // ── Adjust stock quantity ─────────────────────────────────────────────────
  const adjustStock = useCallback(
    async (item: ClinicInventoryItem, input: AdjustStockInput): Promise<boolean> => {
      if (!entityId || !userId) return false;

      const before = item.quantity_in_stock;
      let after: number;
      let delta: number;

      if (input.change_type === 'adjustment') {
        after = input.quantity;
        delta = after - before;
      } else if (input.change_type === 'addition') {
        delta = input.quantity;
        after = before + delta;
      } else {
        // deduction, expired, damaged, procedure_use
        delta = -Math.abs(input.quantity);
        after = Math.max(0, before + delta);
      }

      try {
        const { error: updateErr } = await supabase
          .from('clinic_inventory')
          .update({ quantity_in_stock: after, updated_by: userId } as any)
          .eq('id', item.id)
          .eq('entity_id', entityId);

        if (updateErr) throw updateErr;

        await (supabase as any).from('clinic_inventory_logs').insert({
          inventory_id: item.id,
          entity_id: entityId,
          change_type: input.change_type,
          quantity_change: delta,
          quantity_before: before,
          quantity_after: after,
          reference_id: input.reference_id || null,
          reference_type: input.reference_type || 'manual',
          notes: input.notes || null,
          performed_by: userId,
        } as any);

        toast.success(t('success.adjusted'));
        await refresh();
        return true;
      } catch (err: any) {
        console.error('adjustStock failed', err);
        toast.error(t('errors.adjustFailed'));
        return false;
      }
    },
    [entityId, userId, refresh, t],
  );

  // ── Soft-delete an item ───────────────────────────────────────────────────
  const deleteItem = useCallback(
    async (id: string): Promise<boolean> => {
      if (!entityId || !userId) return false;
      try {
        const { error } = await supabase
          .from('clinic_inventory')
          .update({ is_active: false, updated_by: userId } as any)
          .eq('id', id)
          .eq('entity_id', entityId);

        if (error) throw error;
        toast.success(t('success.deleted'));
        await refresh();
        return true;
      } catch (err: any) {
        console.error('deleteItem failed', err);
        toast.error(t('errors.deleteFailed'));
        return false;
      }
    },
    [entityId, userId, refresh, t],
  );

  // ── Fetch logs for a specific item ─────────────────────────────────────────
  const fetchLogs = useCallback(
    async (inventoryId: string): Promise<InventoryLog[]> => {
      try {
        const { data, error } = await supabase
          .from('clinic_inventory_logs')
          .select('*')
          .eq('inventory_id', inventoryId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        return (data as InventoryLog[]) || [];
      } catch (err: any) {
        console.error('fetchLogs failed', err);
        return [];
      }
    },
    [],
  );

  // ── Deduct inventory for a completed procedure ────────────────────────────
  const deductForProcedure = useCallback(
    async (
      procedureId: string | null,
      procedureName: string,
      appointmentId: string,
    ): Promise<void> => {
      if (!entityId || !userId) return;
      try {
        // Find requirements for this procedure
        let query = supabase
          .from('procedure_inventory_requirements')
          .select('*, inventory_item:clinic_inventory(*)')
          .eq('entity_id', entityId);

        if (procedureId) {
          query = query.eq('procedure_id', procedureId);
        } else {
          query = query.eq('procedure_name', procedureName);
        }

        const { data: reqs, error } = await query;
        if (error || !reqs?.length) return;

        for (const req of reqs as any[]) {
          const inv: ClinicInventoryItem = req.inventory_item;
          if (!inv) continue;
          const before = inv.quantity_in_stock;
          const delta = Math.min(req.quantity_required, before);
          const after = Math.max(0, before - delta);

          await supabase
            .from('clinic_inventory')
            .update({ quantity_in_stock: after, updated_by: userId } as any)
            .eq('id', inv.id);

          await (supabase as any).from('clinic_inventory_logs').insert({
            inventory_id: inv.id,
            entity_id: entityId,
            change_type: 'procedure_use',
            quantity_change: -delta,
            quantity_before: before,
            quantity_after: after,
            reference_id: appointmentId,
            reference_type: 'appointment',
            notes: `Used in: ${procedureName}`,
            performed_by: userId,
          } as any);
        }

        await refresh();
      } catch (err: any) {
        console.warn('deductForProcedure failed', err);
      }
    },
    [entityId, userId, refresh],
  );

  // ── Derived counts ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const lowStock = items.filter((i) => getStockStatus(i) === 'low');
    const critical = items.filter((i) => getStockStatus(i) === 'critical');
    const outOfStock = items.filter((i) => getStockStatus(i) === 'out');
    const expiringSoon = items.filter((i) => {
      if (!i.expiry_date) return false;
      const days = Math.ceil(
        (new Date(i.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      return days >= 0 && days <= 30;
    });
    return { lowStock, critical, outOfStock, expiringSoon };
  }, [items]);

  return {
    items,
    loading,
    stats,
    refresh,
    addItem,
    updateItem,
    adjustStock,
    deleteItem,
    fetchLogs,
    deductForProcedure,
  };
}

// ── Procedure inventory requirements hook ─────────────────────────────────
export function useProcedureInventoryRequirements(
  entityId: string | null | undefined,
  procedureId: string | null | undefined,
) {
  const [requirements, setRequirements] = useState<ProcedureInventoryRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const userId = session?.user?.id;

  const refresh = useCallback(async () => {
    if (!entityId || !procedureId) { setRequirements([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('procedure_inventory_requirements')
        .select('*, inventory_item:clinic_inventory(*)')
        .eq('entity_id', entityId)
        .eq('procedure_id', procedureId);

      if (error) throw error;
      setRequirements((data as ProcedureInventoryRequirement[]) || []);
    } finally {
      setLoading(false);
    }
  }, [entityId, procedureId]);

  useEffect(() => { refresh(); }, [refresh]);

  const addRequirement = useCallback(
    async (inventoryId: string, quantityRequired: number): Promise<boolean> => {
      if (!entityId || !procedureId || !userId) return false;
      try {
        const { error } = await supabase
          .from('procedure_inventory_requirements')
          .upsert({
            entity_id: entityId,
            procedure_id: procedureId,
            inventory_id: inventoryId,
            quantity_required: quantityRequired,
          } as any, { onConflict: 'entity_id,procedure_id,inventory_id' });

        if (error) throw error;
        await refresh();
        return true;
      } catch (err) {
        console.error('addRequirement failed', err);
        return false;
      }
    },
    [entityId, procedureId, userId, refresh],
  );

  const removeRequirement = useCallback(
    async (requirementId: string): Promise<void> => {
      await (supabase as any).from('procedure_inventory_requirements').delete().eq('id', requirementId);
      await refresh();
    },
    [refresh],
  );

  return { requirements, loading, refresh, addRequirement, removeRequirement };
}
