import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ClinicImagingOrder {
  id: string;
  order_number: string;
  clinic_id: string;
  department_id: string | null;
  doctor_id: string;
  patient_id: string;
  appointment_id: string | null;
  modality: string;
  body_part: string | null;
  exam_name: string;
  priority: string;
  clinical_notes: string | null;
  diagnosis_codes: string[] | null;
  status: string;
  scheduled_at: string | null;
  performed_at: string | null;
  performed_by: string | null;
  radiologist_id: string | null;
  completed_at: string | null;
  result_images: string[] | null;
  result_report: string | null;
  result_url: string | null;
  impression: string | null;
  findings: string | null;
  created_at: string;
  updated_at: string;
}

interface ImagingOrderInput {
  clinic_id: string;
  patient_id: string;
  modality: string;
  exam_name: string;
  body_part?: string;
  priority?: string;
  clinical_notes?: string;
  diagnosis_codes?: string[];
  appointment_id?: string;
}

interface ImagingResultInput {
  result_images?: string[];
  result_report?: string;
  result_url?: string;
  impression?: string;
  findings?: string;
}

export function useClinicImagingOrders() {
  const { user } = useAuth();
  const [imagingOrders, setImagingOrders] = useState<ClinicImagingOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchImagingOrders = useCallback(async (clinicId: string, status?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('clinic_imaging_orders')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      setImagingOrders((data || []) as ClinicImagingOrder[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPatientImagingOrders = useCallback(async (patientId?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_imaging_orders')
        .select('*')
        .eq('patient_id', patientId || user?.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setImagingOrders((data || []) as ClinicImagingOrder[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchDoctorImagingOrders = useCallback(async (doctorId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_imaging_orders')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImagingOrders((data || []) as ClinicImagingOrder[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  const createImagingOrder = useCallback(async (input: ImagingOrderInput) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_clinic_imaging_order', {
        p_clinic_id: input.clinic_id,
        p_patient_id: input.patient_id,
        p_modality: input.modality,
        p_exam_name: input.exam_name,
        p_body_part: input.body_part || null,
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
      
      toast({ title: 'Success', description: 'Imaging order created' });
      return result.order_id;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: string, additionalData?: Partial<ClinicImagingOrder>) => {
    setLoading(true);
    try {
      const updateData: any = { status, ...additionalData };
      
      if (status === 'in_progress') {
        updateData.performed_at = new Date().toISOString();
        updateData.performed_by = user?.id;
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('clinic_imaging_orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      setImagingOrders(prev => prev.map(o => o.id === orderId ? data as ClinicImagingOrder : o));
      toast({ title: 'Success', description: 'Order status updated' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const uploadResult = useCallback(async (orderId: string, result: ImagingResultInput) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_imaging_orders')
        .update({
          ...result,
          status: 'completed',
          completed_at: new Date().toISOString(),
          radiologist_id: user?.id,
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      setImagingOrders(prev => prev.map(o => o.id === orderId ? data as ClinicImagingOrder : o));
      toast({ title: 'Success', description: 'Imaging results uploaded' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    imagingOrders,
    loading,
    fetchImagingOrders,
    fetchPatientImagingOrders,
    fetchDoctorImagingOrders,
    createImagingOrder,
    updateOrderStatus,
    uploadResult,
  };
}
