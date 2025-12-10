import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ClinicLabOrder {
  id: string;
  order_number: string;
  clinic_id: string;
  department_id: string | null;
  doctor_id: string;
  patient_id: string;
  appointment_id: string | null;
  test_type: string;
  test_name: string;
  test_code: string | null;
  priority: string;
  clinical_notes: string | null;
  diagnosis_codes: string[] | null;
  status: string;
  sample_collected_at: string | null;
  sample_collected_by: string | null;
  processed_by: string | null;
  completed_at: string | null;
  result_data: Record<string, any>;
  result_text: string | null;
  result_url: string | null;
  is_abnormal: boolean;
  reference_range: string | null;
  created_at: string;
  updated_at: string;
}

interface LabOrderInput {
  clinic_id: string;
  patient_id: string;
  test_type: string;
  test_name: string;
  test_code?: string;
  priority?: string;
  clinical_notes?: string;
  diagnosis_codes?: string[];
  appointment_id?: string;
}

interface LabResultInput {
  result_data?: Record<string, any>;
  result_text?: string;
  result_url?: string;
  is_abnormal?: boolean;
  reference_range?: string;
}

export function useClinicLabOrders() {
  const { user } = useAuth();
  const [labOrders, setLabOrders] = useState<ClinicLabOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLabOrders = useCallback(async (clinicId: string, status?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('clinic_lab_orders')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLabOrders((data || []) as ClinicLabOrder[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPatientLabOrders = useCallback(async (patientId?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_lab_orders')
        .select('*')
        .eq('patient_id', patientId || user?.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setLabOrders((data || []) as ClinicLabOrder[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchDoctorLabOrders = useCallback(async (doctorId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_lab_orders')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLabOrders((data || []) as ClinicLabOrder[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  const createLabOrder = useCallback(async (input: LabOrderInput) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_clinic_lab_order', {
        p_clinic_id: input.clinic_id,
        p_patient_id: input.patient_id,
        p_test_type: input.test_type,
        p_test_name: input.test_name,
        p_test_code: input.test_code || null,
        p_priority: input.priority || 'routine',
        p_clinical_notes: input.clinical_notes || null,
        p_diagnosis_codes: input.diagnosis_codes || null,
        p_appointment_id: input.appointment_id || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; order_id?: string; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to create order');
      }
      
      toast({ title: 'Success', description: 'Lab order created' });
      return result.order_id;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: string, additionalData?: Partial<ClinicLabOrder>) => {
    setLoading(true);
    try {
      const updateData: any = { status, ...additionalData };
      
      if (status === 'sample_collected') {
        updateData.sample_collected_at = new Date().toISOString();
        updateData.sample_collected_by = user?.id;
      } else if (status === 'processing') {
        updateData.processed_by = user?.id;
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('clinic_lab_orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      setLabOrders(prev => prev.map(o => o.id === orderId ? data as ClinicLabOrder : o));
      toast({ title: 'Success', description: 'Order status updated' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const uploadResult = useCallback(async (orderId: string, result: LabResultInput) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_lab_orders')
        .update({
          ...result,
          status: 'completed',
          completed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      setLabOrders(prev => prev.map(o => o.id === orderId ? data as ClinicLabOrder : o));
      toast({ title: 'Success', description: 'Results uploaded' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    labOrders,
    loading,
    fetchLabOrders,
    fetchPatientLabOrders,
    fetchDoctorLabOrders,
    createLabOrder,
    updateOrderStatus,
    uploadResult,
  };
}
