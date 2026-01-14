import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type TestOrder = Database['public']['Tables']['test_orders']['Row'];
type TestOrderItem = Database['public']['Tables']['test_order_items']['Row'];
type TestResult = Database['public']['Tables']['test_results']['Row'];
type TestResultFile = Database['public']['Tables']['test_result_files']['Row'];

export interface TestOrderInput {
  patient_id: string;
  doctor_id?: string;
  lab_center_id?: string;
  appointment_id?: string;
  priority?: string;
  clinical_notes?: string;
  diagnosis_codes?: string[];
  scheduled_date?: string;
  scheduled_time?: string;
}

export interface TestOrderItemInput {
  test_order_id: string;
  test_id: string;
  price?: number;
  notes?: string;
}

export interface TestResultInput {
  test_order_item_id: string;
  result_data?: Record<string, any>;
  result_text?: string;
  reference_range?: string;
  unit?: string;
  is_abnormal?: boolean;
  abnormal_flag?: string;
  interpretation?: string;
}

export interface TestResultFileInput {
  test_result_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size?: number;
  file_category?: string;
  description?: string;
}

interface TestOrderWithItems extends TestOrder {
  items?: any[];
}

export function useTestOrders() {
  const { user } = useAuth();
  const [testOrders, setTestOrders] = useState<TestOrderWithItems[]>([]);
  const [currentOrder, setCurrentOrder] = useState<TestOrderWithItems | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [resultFiles, setResultFiles] = useState<TestResultFile[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch test orders for patients
  const fetchPatientOrders = useCallback(async (patientId?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_orders')
        .select('*')
        .eq('patient_id', patientId || user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTestOrders((data || []) as TestOrderWithItems[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch test orders for lab center
  const fetchLabOrders = useCallback(async (labCenterId: string, status?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('test_orders')
        .select('*')
        .eq('lab_center_id', labCenterId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTestOrders((data || []) as TestOrderWithItems[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Create test order with items
  const createTestOrder = useCallback(async (order: TestOrderInput, testIds: string[]) => {
    if (!user) return null;
    setLoading(true);
    try {
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('test_orders')
        .insert(order)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const items = testIds.map(testId => ({
        test_order_id: orderData.id,
        test_id: testId,
      }));

      const { error: itemsError } = await supabase
        .from('test_order_items')
        .insert(items);

      if (itemsError) throw itemsError;

      toast({ title: 'Success', description: 'Test order created successfully' });
      return orderData;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Update test order status
  const updateOrderStatus = useCallback(async (orderId: string, status: string, additionalData?: Partial<TestOrder>) => {
    setLoading(true);
    try {
      const updateData: any = { status, ...additionalData };

      if (status === 'sample_collected') {
        updateData.sample_collected_at = new Date().toISOString();
        updateData.sample_collected_by = user?.id;
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('test_orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      setTestOrders(prev => prev.map(o => (o.id === orderId ? (data as TestOrderWithItems) : o)));
      toast({ title: 'Success', description: 'Order status updated' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Fetch order items INCLUDING test_catalog info (name, code, parameters)
   * so UI can render per-parameter result entry.
   */
  const fetchOrderItems = useCallback(async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('test_order_items')
        .select('*, test:test_catalog(id,name,test_code,category,sample_type,parameters)')
        .eq('test_order_id', orderId);

      if (error) throw error;
      return (data || []) as any[];
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return [];
    }
  }, []);

  // Update order item status
  const updateItemStatus = useCallback(async (itemId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('test_order_items')
        .update({ status })
        .eq('id', itemId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
  }, []);

  // Create test result
  const createResult = useCallback(async (input: TestResultInput) => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_results')
        .insert({
          ...input,
          result_data: input.result_data || {},
          performed_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update order item status
      await updateItemStatus(input.test_order_item_id, 'completed');

      setTestResults(prev => [...prev, data as TestResult]);
      toast({ title: 'Success', description: 'Result recorded successfully' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, updateItemStatus]);

  // Update test result
  const updateResult = useCallback(async (resultId: string, updates: Partial<TestResultInput>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_results')
        .update({
          ...updates,
          result_data: updates.result_data || undefined,
        })
        .eq('id', resultId)
        .select()
        .single();

      if (error) throw error;
      setTestResults(prev => prev.map(r => (r.id === resultId ? (data as TestResult) : r)));
      toast({ title: 'Success', description: 'Result updated successfully' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify result (supervisor action)
  const verifyResult = useCallback(async (resultId: string) => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_results')
        .update({
          status: 'final',
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', resultId)
        .select()
        .single();

      if (error) throw error;
      setTestResults(prev => prev.map(r => (r.id === resultId ? (data as TestResult) : r)));
      toast({ title: 'Success', description: 'Result verified and finalized' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch results for an order item
  const fetchResults = useCallback(async (orderItemId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_order_item_id', orderItemId);

      if (error) throw error;
      setTestResults((data || []) as TestResult[]);
      return data as TestResult[];
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload result file
  const uploadResultFile = useCallback(async (input: TestResultFileInput) => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_result_files')
        .insert({
          ...input,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      setResultFiles(prev => [...prev, data as TestResultFile]);
      toast({ title: 'Success', description: 'File uploaded successfully' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch result files
  const fetchResultFiles = useCallback(async (resultId: string) => {
    try {
      const { data, error } = await supabase
        .from('test_result_files')
        .select('*')
        .eq('test_result_id', resultId);

      if (error) throw error;
      setResultFiles((data || []) as TestResultFile[]);
      return data as TestResultFile[];
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return [];
    }
  }, []);

  return {
    testOrders,
    currentOrder,
    testResults,
    resultFiles,
    loading,
    fetchPatientOrders,
    fetchLabOrders,
    createTestOrder,
    updateOrderStatus,
    fetchOrderItems,
    updateItemStatus,
    createResult,
    updateResult,
    verifyResult,
    fetchResults,
    uploadResultFile,
    fetchResultFiles,
    setCurrentOrder,
  };
}
