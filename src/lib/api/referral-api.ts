// File: src/lib/api/referral-api.ts

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ReferralEntityType, Referral } from '@/hooks/useReferrals';

export interface AvailableReceiver {
  id: string;
  name: string;
  type: ReferralEntityType;
  specialty?: string;
  location?: string;
  phone?: string;
  email?: string;
}

export interface CreateReferralData {
  patient_id: string;
  receiver_type: ReferralEntityType;
  receiver_entity_id?: string;
  receiver_user_id?: string;
  referral_type_enum: string;
  reason: string;
  clinical_notes?: string;
  diagnosis_codes?: string[];
  priority?: 'routine' | 'urgent' | 'stat';
  estimated_duration_minutes?: number;
  required_equipment?: string[];
  metadata?: any;
}

/**
 * Search for available receivers based on referral type and criteria
 */
export const searchReceivers = async (
  receiverType: ReferralEntityType,
  searchTerm: string = '',
  location?: string
): Promise<AvailableReceiver[]> => {
  try {
    let query;
    
    switch (receiverType) {
      case 'doctor':
        query = supabase
          .from('doctors')
          .select(`
            id,
            specialty,
            profiles!user_id (
              full_name,
              phone,
              email
            )
          `);
        break;
        
      case 'clinic':
        query = supabase
          .from('practices')
          .select('id, name, address, phone');
        break;
        
      case 'lab':
        query = supabase
          .from('lab_centers')
          .select('id, name, address, phone');
        break;
        
      case 'imaging_center':
        query = supabase
          .from('imaging_centers')
          .select('id, name, address, phone');
        break;
        
      case 'pharmacy':
        query = supabase
          .from('pharmacies')
          .select('id, name, address, phone');
        break;
        
      default:
        return [];
    }
    
    // Apply search filter
    if (searchTerm) {
      if (receiverType === 'doctor') {
        query = query.or(`profiles.full_name.ilike.%${searchTerm}%,specialty.ilike.%${searchTerm}%`);
      } else {
        query = query.ilike('name', `%${searchTerm}%`);
      }
    }
    
    // Apply location filter
    if (location && receiverType !== 'doctor') {
      query = query.ilike('address', `%${location}%`);
    }
    
    const { data, error } = await query.limit(20);
    
    if (error) throw error;
    
    return (data || []).map((item: any) => ({
      id: item.id,
      name: receiverType === 'doctor' ? item.profiles?.full_name : item.name,
      type: receiverType,
      specialty: receiverType === 'doctor' ? item.specialty : undefined,
      location: receiverType !== 'doctor' ? item.address : undefined,
      phone: receiverType === 'doctor' ? item.profiles?.phone : item.phone,
      email: receiverType === 'doctor' ? item.profiles?.email : undefined,
    }));
  } catch (error: any) {
    console.error('Error searching receivers:', error);
    toast.error(error.message || 'Failed to search receivers');
    return [];
  }
};

/**
 * Create a new referral
 */
export const createReferral = async (
  referralData: CreateReferralData,
  referrerType: ReferralEntityType,
  referrerEntityId: string,
  referrerUserId?: string
): Promise<Referral | null> => {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        ...referralData,
        referrer_type: referrerType,
        referrer_entity_id: referrerEntityId,
        referrer_user_id: referrerUserId,
        status: 'pending',
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
      })
      .select(`
        *,
        patient:patient_id (
          full_name,
          avatar_url
        )
      `)
      .single();
      
    if (error) throw error;
    
    toast.success('Referral created successfully');
    return data;
  } catch (error: any) {
    console.error('Error creating referral:', error);
    toast.error(error.message || 'Failed to create referral');
    return null;
  }
};

/**
 * Update referral status
 */
export const updateReferralStatus = async (
  referralId: string,
  status: 'accepted' | 'rejected' | 'completed' | 'expired',
  rejectionReason?: string
): Promise<boolean> => {
  try {
    const updateData: any = { status };
    if (rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }
    
    const { error } = await supabase
      .from('referrals')
      .update(updateData)
      .eq('id', referralId);
      
    if (error) throw error;
    
    toast.success(`Referral ${status} successfully`);
    return true;
  } catch (error: any) {
    console.error('Error updating referral status:', error);
    toast.error(error.message || 'Failed to update referral');
    return false;
  }
};

/**
 * Get referral details with receiver information
 */
export const getReferralDetails = async (referralId: string): Promise<Referral | null> => {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        patient:patient_id (
          full_name,
          avatar_url,
          email,
          phone
        )
      `)
      .eq('id', referralId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error fetching referral details:', error);
    toast.error(error.message || 'Failed to fetch referral details');
    return null;
  }
};

/**
 * Helper to get entity name for notifications
 */
export const getEntityName = async (
  entityType: ReferralEntityType,
  entityId: string
): Promise<string> => {
  try {
    let query;
    
    switch (entityType) {
      case 'doctor':
        query = supabase
          .from('doctors')
          .select('profiles!user_id(full_name)')
          .eq('id', entityId)
          .single();
        break;
      case 'clinic':
        query = supabase
          .from('practices')
          .select('name')
          .eq('id', entityId)
          .single();
        break;
      case 'lab':
        query = supabase
          .from('lab_centers')
          .select('name')
          .eq('id', entityId)
          .single();
        break;
      case 'imaging_center':
        query = supabase
          .from('imaging_centers')
          .select('name')
          .eq('id', entityId)
          .single();
        break;
      case 'pharmacy':
        query = supabase
          .from('pharmacies')
          .select('name')
          .eq('id', entityId)
          .single();
        break;
      default:
        return 'Unknown';
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    if (entityType === 'doctor') {
      return (data as any)?.profiles?.full_name || 'Unknown Doctor';
    }
    
    return (data as any)?.name || 'Unknown';
  } catch (error) {
    console.error('Error getting entity name:', error);
    return 'Unknown';
  }
};

export const downloadReferralPdf = async (
  referralId: string,
  referralNumber?: string,
  locale?: string
): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-referral-pdf', {
      body: { referral_id: referralId, locale },
      // Supabase Functions v2 supports binary response types; we use ArrayBuffer for PDFs
      responseType: 'arrayBuffer',
    } as any);

    if (error) throw error;
    if (!data) throw new Error('No PDF data received');

    const bytes = data as ArrayBuffer;
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const safeName = (referralNumber || 'referral')
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '_');

    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    toast.success('Referral PDF downloaded');
  } catch (error: any) {
    console.error('Error downloading referral PDF:', error);
    toast.error(error?.message || 'Failed to download referral PDF');
    throw error;
  }
};
