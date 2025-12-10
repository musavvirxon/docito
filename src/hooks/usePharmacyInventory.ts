import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export const usePharmacyInventory = (pharmacyId?: string) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [expiringItems, setExpiringItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (pharmacyId) {
      fetchInventory();
    }
  }, [pharmacyId]);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('pharmacy_inventory')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .order('medication_name');

      if (error) throw error;
      setInventory((data || []) as InventoryItem[]);

      // Calculate low stock items
      const lowStock = (data || []).filter(item => 
        item.quantity_on_hand - item.quantity_reserved <= item.reorder_level
      );
      setLowStockItems(lowStock as InventoryItem[]);

      // Calculate expiring items (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const expiring = (data || []).filter(item => 
        item.expiry_date && new Date(item.expiry_date) <= thirtyDaysFromNow
      );
      setExpiringItems(expiring as InventoryItem[]);

    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const addInventoryItem = async (item: Partial<InventoryItem>) => {
    try {
      const { data, error } = await supabase
        .from('pharmacy_inventory')
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
          controlled_substance_schedule: item.controlled_substance_schedule
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Inventory item added');
      setInventory(prev => [...prev, data as InventoryItem]);
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to add item');
      throw error;
    }
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const { data, error } = await supabase
        .from('pharmacy_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('Inventory updated');
      setInventory(prev => prev.map(item => item.id === id ? data as InventoryItem : item));
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update item');
      throw error;
    }
  };

  const adjustQuantity = async (id: string, adjustment: number, reason?: string) => {
    try {
      const item = inventory.find(i => i.id === id);
      if (!item) throw new Error('Item not found');

      const newQuantity = item.quantity_on_hand + adjustment;
      if (newQuantity < 0) throw new Error('Cannot reduce below zero');

      const { data, error } = await supabase
        .from('pharmacy_inventory')
        .update({ quantity_on_hand: newQuantity })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success(`Quantity ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)}`);
      setInventory(prev => prev.map(i => i.id === id ? data as InventoryItem : i));
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to adjust quantity');
      throw error;
    }
  };

  const deleteInventoryItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pharmacy_inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Item removed from inventory');
      setInventory(prev => prev.filter(item => item.id !== id));
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove item');
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
    fetchInventory
  };
};
