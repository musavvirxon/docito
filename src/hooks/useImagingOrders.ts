import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface ImagingOrder {
  id: string;
  order_number: string;
  imaging_center_id: string;
  patient_id: string;
  patient_name?: string;
  doctor_id?: string;
  doctor_name?: string;
  modality: string;
  exam_name: string;
  body_part?: string;
  priority: 'routine' | 'urgent' | 'stat';
  clinical_notes?: string;
  diagnosis_codes?: string[];
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'image_uploaded' | 'pending_review' | 'finalized' | 'delivered';
  scheduled_at?: string;
  performed_at?: string;
  performed_by?: string;
  radiologist_id?: string;
  completed_at?: string;
  result_images?: string[];
  result_report?: string;
  result_url?: string;
  impression?: string;
  findings?: string;
  contrast: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Map referral status to imaging-specific status
const mapReferralStatusToImagingStatus = (status: string): ImagingOrder['status'] => {
  const mapping: Record<string, ImagingOrder['status']> = {
    pending: 'scheduled',
    accepted: 'checked_in',
    in_progress: 'in_progress',
    completed: 'finalized',
    cancelled: 'scheduled',
  };
  return mapping[status] || 'scheduled';
};

// Map imaging status back to referral status
const mapImagingStatusToReferralStatus = (status: ImagingOrder['status']): string => {
  const mapping: Record<ImagingOrder['status'], string> = {
    scheduled: 'pending',
    checked_in: 'accepted',
    in_progress: 'in_progress',
    image_uploaded: 'in_progress',
    pending_review: 'in_progress',
    finalized: 'completed',
    delivered: 'completed',
  };
  return mapping[status] || 'pending';
};

export function useImagingOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ImagingOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch orders for an imaging center
  const fetchCenterOrders = useCallback(async (centerId: string, filterStatus?: string) => {
    setLoading(true);
    try {
      // Fetch from referrals where receiver is imaging_center
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('receiver_type', 'imaging_center')
        .eq('receiver_entity_id', centerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const referrals = data || [];
      
      // Filter by status if provided
      const filteredData = filterStatus 
        ? referrals.filter((r) => r.status === filterStatus)
        : referrals;

      // Transform referrals to imaging order format
      const transformedOrders: ImagingOrder[] = filteredData.map((r) => {
        const attachments = r.attachments as Record<string, unknown> | null;
        return {
          id: r.id,
          order_number: r.referral_number || `IMG-${r.id.slice(0, 8).toUpperCase()}`,
          imaging_center_id: r.receiver_entity_id || '',
          patient_id: r.patient_id,
          patient_name: 'Patient',
          doctor_id: r.referrer_user_id || r.referring_doctor_id || undefined,
          doctor_name: 'Referring Doctor',
          modality: (attachments?.modality as string) || 'X-ray',
          exam_name: (attachments?.exam_name as string) || r.reason || 'Imaging Exam',
          body_part: (attachments?.body_part as string) || undefined,
          priority: (r.priority as 'routine' | 'urgent' | 'stat') || 'routine',
          clinical_notes: r.clinical_notes || undefined,
          diagnosis_codes: r.diagnosis_codes || undefined,
          status: mapReferralStatusToImagingStatus(r.status),
          scheduled_at: r.preferred_date || undefined,
          completed_at: r.completed_at || undefined,
          contrast: (attachments?.contrast as boolean) || false,
          notes: r.notes || undefined,
          created_at: r.created_at,
          updated_at: r.updated_at,
        };
      });

      setOrders(transformedOrders);
    } catch (error: unknown) {
      console.error('Error fetching imaging orders:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: ImagingOrder['status']) => {
    setLoading(true);
    try {
      const referralStatus = mapImagingStatusToReferralStatus(newStatus);
      const updateData: Record<string, unknown> = { status: referralStatus };

      if (newStatus === 'finalized') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('referrals')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ));
      
      toast({ title: 'Success', description: 'Order status updated' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload results
  const uploadResults = useCallback(async (orderId: string, results: {
    result_images?: string[];
    result_report?: string;
    impression?: string;
    findings?: string;
  }) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('referrals')
        .update({
          result_attachments: results,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => 
        o.id === orderId ? { 
          ...o, 
          status: 'finalized' as const,
          ...results 
        } : o
      ));

      toast({ title: 'Success', description: 'Results uploaded successfully' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    orders,
    loading,
    fetchCenterOrders,
    updateOrderStatus,
    uploadResults,
  };
}
