// src/lib/api/referral-api.ts
import { supabase } from '@/integrations/supabase/client';
import type { ReferralEntityType, Referral, ReferralScope } from '@/hooks/useReferrals';

// Helper to get entity name by type (safe for null/undefined entityId)
export const getEntityName = async (entityType: ReferralEntityType, entityId?: string | null): Promise<string> => {
  try {
    if (!entityId) return 'Any provider';

    switch (entityType) {
      case 'doctor': {
        const { data } = await supabase
          .from('doctors')
          .select('specialty, profiles:user_id(full_name)')
          .eq('id', entityId)
          .single();
        return data?.profiles?.full_name || 'Unknown Doctor';
      }
      case 'clinic': {
        const { data } = await supabase.from('practices').select('name').eq('id', entityId).single();
        return data?.name || 'Unknown Clinic';
      }
      case 'lab': {
        const { data } = await supabase.from('lab_centers').select('name').eq('id', entityId).single();
        return data?.name || 'Unknown Lab';
      }
      case 'imaging_center': {
        const { data } = await supabase.from('imaging_centers').select('name').eq('id', entityId).single();
        return data?.name || 'Unknown Imaging Center';
      }
      case 'pharmacy': {
        const { data } = await supabase.from('pharmacies').select('name').eq('id', entityId).single();
        return data?.name || 'Unknown Pharmacy';
      }
      default:
        return 'Unknown Entity';
    }
  } catch (error) {
    console.error('Error fetching entity name:', error);
    return 'Unknown';
  }
};

// Search for potential referral receivers
export const searchReceivers = async (
  receiverType: ReferralEntityType,
  searchTerm?: string,
  specialty?: string
): Promise<any[]> => {
  try {
    switch (receiverType) {
      case 'doctor': {
        let query = supabase
          .from('doctors')
          .select(
            `
            id,
            specialty,
            consultation_fee,
            verified,
            profiles:user_id(full_name, avatar_url),
            practices:practice_id(name, city, country)
          `
          )
          .eq('verified', true)
          .eq('accepts_new_patients', true);

        if (specialty) query = query.ilike('specialty', `%${specialty}%`);

        const { data, error } = await query.limit(50);
        if (error) throw error;

        if (searchTerm && data) {
          const t = searchTerm.toLowerCase();
          return data.filter(
            (d: any) =>
              d.profiles?.full_name?.toLowerCase().includes(t) || d.specialty?.toLowerCase().includes(t)
          );
        }
        return data || [];
      }

      case 'clinic': {
        const { data, error } = await supabase
          .from('practices' as any)
          .select('id, name, address, city, country, phone, specialty_types, logo_url')
          .eq('is_active', true)
          .limit(50);

        if (error) throw error;
        if (searchTerm && data) {
          const t = searchTerm.toLowerCase();
          return (data as any[]).filter((d: any) => d.name?.toLowerCase().includes(t));
        }
        return (data as any[]) || [];
      }

      case 'lab': {
        const { data, error } = await supabase
          .from('lab_centers')
          .select('id, name, address, city, country, phone, services_offered, is_verified')
          .eq('status', 'active')
          .limit(50);

        if (error) throw error;
        if (searchTerm && data) {
          const t = searchTerm.toLowerCase();
          return data.filter((d: any) => d.name?.toLowerCase().includes(t));
        }
        return data || [];
      }

      case 'imaging_center': {
        const { data, error } = await supabase
          .from('imaging_centers')
          .select('id, name, address, city, country, phone, modalities, is_verified')
          .eq('status', 'active')
          .limit(50);

        if (error) throw error;
        if (searchTerm && data) {
          const t = searchTerm.toLowerCase();
          return data.filter((d: any) => d.name?.toLowerCase().includes(t));
        }
        return data || [];
      }

      case 'pharmacy': {
        const { data, error } = await supabase
          .from('pharmacies' as any)
          .select('id, name, address, city, country, phone, is_verified, is_24_hours')
          .eq('status', 'active')
          .limit(50);

        if (error) throw error;
        if (searchTerm && data) {
          const t = searchTerm.toLowerCase();
          return (data as any[]).filter((d: any) => d.name?.toLowerCase().includes(t));
        }
        return (data as any[]) || [];
      }

      default:
        return [];
    }
  } catch (error) {
    console.error('Error searching receivers:', error);
    return [];
  }
};

// Get referral statistics for a user/entity
export const getReferralStats = async (
  entityType: ReferralEntityType,
  entityId: string,
  role: 'referrer' | 'receiver'
): Promise<{
  total: number;
  pending: number;
  accepted: number;
  completed: number;
  rejected: number;
}> => {
  try {
    const column = role === 'referrer' ? 'referrer_entity_id' : 'receiver_entity_id';
    const typeColumn = role === 'referrer' ? 'referrer_type' : 'receiver_type';

    const { data, error } = await supabase.from('referrals').select('status').eq(column, entityId).eq(typeColumn, entityType);
    if (error) throw error;

    const stats = { total: data?.length || 0, pending: 0, accepted: 0, completed: 0, rejected: 0 };

    data?.forEach((r: any) => {
      if (r.status === 'sent' || r.status === 'draft') stats.pending++;
      else if (r.status === 'accepted' || r.status === 'slots_available' || r.status === 'booked' || r.status === 'in_progress') stats.accepted++;
      else if (r.status === 'completed') stats.completed++;
      else if (r.status === 'rejected' || r.status === 'cancelled' || r.status === 'expired') stats.rejected++;
    });

    return stats;
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return { total: 0, pending: 0, accepted: 0, completed: 0, rejected: 0 };
  }
};

// Get duration estimate based on entity type
export const getEstimatedDuration = (referralType: string, entityType: ReferralEntityType): number => {
  switch (entityType) {
    case 'doctor':
      return referralType === 'specialist_referral' ? 45 : 30;
    case 'lab':
      return 15;
    case 'imaging_center':
      return 30;
    case 'pharmacy':
      return 10;
    case 'clinic':
      return 30;
    default:
      return 30;
  }
};

// Check if referral is within validity window
export const isReferralValid = (referral: Referral): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const validFrom = new Date(referral.valid_from);
  const validUntil = new Date(referral.valid_until);

  return today >= validFrom && today <= validUntil;
};

// Get referral priority color
export const getReferralPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'stat':
      return 'destructive';
    case 'urgent':
      return 'warning';
    default:
      return 'secondary';
  }
};

// Get referral status color
export const getReferralStatusColor = (status: string): string => {
  switch (status) {
    case 'draft':
      return 'secondary';
    case 'sent':
      return 'default';
    case 'accepted':
    case 'slots_available':
      return 'success';
    case 'booked':
    case 'in_progress':
      return 'primary';
    case 'completed':
      return 'success';
    case 'rejected':
    case 'cancelled':
    case 'expired':
      return 'destructive';
    default:
      return 'secondary';
  }
};

// Get referral type label
export const getReferralTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    consultation: 'Medical Consultation',
    lab_test: 'Laboratory Test',
    imaging_study: 'Imaging Study',
    prescription_fulfillment: 'Prescription Fulfillment',
    follow_up_care: 'Follow-up Care',
    specialist_referral: 'Specialist Referral',
  };
  return labels[type] || type;
};

// Get entity type label
export const getEntityTypeLabel = (type: ReferralEntityType): string => {
  const labels: Record<ReferralEntityType, string> = {
    doctor: 'Doctor',
    clinic: 'Clinic',
    lab: 'Laboratory',
    imaging_center: 'Imaging Center',
    pharmacy: 'Pharmacy',
  };
  return labels[type] || type;
};

// New helper: human label for general vs specific referral target
export const getReferralTargetLabel = (referral: Referral): string => {
  const scope = (referral.scope || 'specific') as ReferralScope;
  if (scope === 'specific') return 'Specific';

  const receiverType = referral.receiver_type;
  const specialty = (referral.target_specialty_key || '').trim();
  const service = (referral.target_service_label || '').trim();

  if (receiverType === 'doctor' || receiverType === 'clinic') {
    return specialty ? `Any ${specialty}` : 'Any provider';
  }
  return service ? `Any ${service}` : 'Any service';
};

// New helper: safe patient display name (registered or walk-in)
export const getReferralPatientDisplayName = (referral: Referral): string => {
  const anyRef: any = referral as any;
  return (
    referral.patient?.full_name ||
    referral.patient_snapshot_full_name ||
    anyRef.patient_name ||
    (referral.patient_id ? `${String(referral.patient_id).slice(0, 8)}…` : 'Unknown patient')
  );
};
