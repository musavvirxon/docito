import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ReferralEntityType, Referral } from '@/hooks/useReferrals';

// Helper to get entity name by type
export const getEntityName = async (entityType: ReferralEntityType, entityId: string): Promise<string> => {
  try {
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
        const { data } = await supabase
          .from('practices')
          .select('name')
          .eq('id', entityId)
          .single();
        return data?.name || 'Unknown Clinic';
      }
      case 'lab': {
        const { data } = await supabase
          .from('lab_centers')
          .select('name')
          .eq('id', entityId)
          .single();
        return data?.name || 'Unknown Lab';
      }
      case 'imaging_center': {
        const { data } = await supabase
          .from('imaging_centers')
          .select('name')
          .eq('id', entityId)
          .single();
        return data?.name || 'Unknown Imaging Center';
      }
      case 'pharmacy': {
        const { data } = await supabase
          .from('pharmacies')
          .select('name')
          .eq('id', entityId)
          .single();
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
          .select(`
            id,
            specialty,
            consultation_fee,
            verified,
            profiles:user_id(full_name, avatar_url),
            practices:practice_id(name, city, country)
          `)
          .eq('verified', true)
          .eq('accepts_new_patients', true);

        if (specialty) {
          query = query.ilike('specialty', `%${specialty}%`);
        }

        const { data, error } = await query.limit(50);
        if (error) throw error;

        // Filter by search term if provided
        if (searchTerm && data) {
          return data.filter(d => 
            d.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        return data || [];
      }

      case 'clinic': {
        let query = supabase
          .from('practices')
          .select('id, name, address, city, country, phone, specialty_types, logo_url')
          .eq('is_active', true);

        if (searchTerm) {
          query = query.ilike('name', `%${searchTerm}%`);
        }

        const { data, error } = await query.limit(50);
        if (error) throw error;
        return data || [];
      }

      case 'lab': {
        const { data, error } = await supabase
          .from('lab_centers')
          .select('id, name, address, city, country, phone, services_offered, is_verified')
          .eq('status', 'active')
          .limit(50);

        if (error) throw error;
        if (searchTerm && data) {
          return data.filter((d: any) => d.name?.toLowerCase().includes(searchTerm.toLowerCase()));
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
          return data.filter((d: any) => d.name?.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return data || [];
      }

      case 'pharmacy': {
        let query = supabase
          .from('pharmacies')
          .select('id, name, address, city, country, phone, is_verified, is_24_hours')
          .eq('status', 'active');

        if (searchTerm) {
          query = query.ilike('name', `%${searchTerm}%`);
        }

        const { data, error } = await query.limit(50);
        if (error) throw error;
        return data || [];
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

    const { data, error } = await supabase
      .from('referrals')
      .select('status')
      .eq(column, entityId)
      .eq(typeColumn, entityType);

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      pending: 0,
      accepted: 0,
      completed: 0,
      rejected: 0
    };

    data?.forEach(r => {
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
      return 15; // Fixed duration for lab tests
    case 'imaging_center':
      switch (referralType) {
        case 'imaging_study':
          return 30; // Average imaging study
        default:
          return 30;
      }
    case 'pharmacy':
      return 10; // Fulfillment window
    case 'clinic':
      return 30;
    default:
      return 30;
  }
};

// Notify referral participants
export const notifyReferralParticipants = async (
  referralId: string,
  action: string,
  recipientIds: string[]
): Promise<void> => {
  try {
    const titles: Record<string, string> = {
      sent: 'New Referral Received',
      accepted: 'Referral Accepted',
      rejected: 'Referral Rejected',
      slots_available: 'Appointment Slots Available',
      booked: 'Appointment Booked',
      completed: 'Referral Completed',
      cancelled: 'Referral Cancelled'
    };

    const messages: Record<string, string> = {
      sent: 'You have received a new patient referral. Please review and respond.',
      accepted: 'Your referral has been accepted. The receiver will publish available slots soon.',
      rejected: 'Your referral has been declined. Please check the reason and consider alternatives.',
      slots_available: 'Appointment slots are now available for your referral. Book now!',
      booked: 'An appointment has been scheduled for your referral.',
      completed: 'The referral has been completed. Results are available.',
      cancelled: 'The referral has been cancelled.'
    };

    for (const recipientId of recipientIds) {
      await supabase.rpc('create_referral_notification', {
        p_referral_id: referralId,
        p_recipient_id: recipientId,
        p_type: action,
        p_title: titles[action] || 'Referral Update',
        p_message: messages[action] || 'Your referral has been updated.'
      });
    }
  } catch (error) {
    console.error('Error sending notifications:', error);
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
    specialist_referral: 'Specialist Referral'
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
    pharmacy: 'Pharmacy'
  };
  return labels[type] || type;
};
