import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export type ReferralEntityType = 'doctor' | 'clinic' | 'lab' | 'imaging_center' | 'pharmacy';
export type ReferralType =
  | 'consultation'
  | 'lab_test'
  | 'imaging_study'
  | 'prescription_fulfillment'
  | 'follow_up_care'
  | 'specialist_referral';
export type ReferralPriority = 'routine' | 'urgent' | 'stat';
export type ReferralStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'slots_available'
  | 'booked'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface Referral {
  id: string;
  referral_number: string;
  patient_id: string;

  referrer_type: ReferralEntityType;
  referrer_entity_id: string;
  referrer_user_id: string;

  receiver_type: ReferralEntityType;
  receiver_entity_id: string;
  receiver_user_id?: string;

  referral_type_enum: ReferralType;
  priority: ReferralPriority;
  status: string;

  reason: string;
  clinical_notes?: string;

  diagnosis_codes?: string[];
  valid_from: string;
  valid_until: string;

  preferred_date?: string;
  preferred_time_slot?: string;

  estimated_duration_minutes: number;

  attachments?: any[];
  sent_at?: string;
  accepted_at?: string;
  accepted_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
  completed_at?: string;
  completed_by?: string;
  result_notes?: string;
  result_attachments?: any[];
  created_at: string;
  updated_at: string;

  // Joined data
  patient?: any;
  referrer?: any;
  receiver?: any;

  // Legacy fields (still present in DB for backward compatibility)
  referring_doctor_id?: string;
  referred_doctor_id?: string;
}

export interface ReferralSlot {
  id: string;
  referral_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_reserved: boolean;
  reserved_at?: string;
  reserved_by?: string;
  notes?: string;
  created_at: string;
}

export interface ReferralAppointment {
  id: string;
  referral_id: string;
  referral_slot_id?: string;
  appointment_id?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  booked_at: string;
  booked_by: string;
  checked_in_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
}

export interface CreateReferralInput {
  patient_id: string;
  receiver_type: ReferralEntityType;
  receiver_entity_id: string;
  referral_type: ReferralType;
  priority?: ReferralPriority;
  reason: string;
  clinical_notes?: string;
  diagnosis_codes?: string[];
  valid_until: string;
  preferred_date?: string;
  preferred_time_slot?: string;
  estimated_duration_minutes?: number;
  attachments?: any[];
}

type UseReferralsArgs =
  | undefined
  | 'referrer'
  | 'receiver'
  | 'patient'
  | 'all'
  | {
      role?: 'referrer' | 'receiver' | 'patient' | 'all';
      entityType?: ReferralEntityType;
      entityId?: string;
      patientId?: string;
    };

export const useReferrals = (args?: UseReferralsArgs) => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Normalize args to always be an object
  let role: 'referrer' | 'receiver' | 'patient' | 'all' | undefined;
  let entityType: ReferralEntityType | undefined;
  let entityId: string | undefined;
  let patientId: string | undefined;

  if (typeof args === 'string') {
    role = args;
  } else if (args !== undefined && typeof args === 'object') {
    role = args.role;
    entityType = args.entityType;
    entityId = args.entityId;
    patientId = args.patientId;
  }

  const fetchReferrals = useCallback(async () => {
    if (!user) {
      setReferrals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('referrals')
        .select(
          `
          *,
          patient:patient_id(
            full_name,
            avatar_url,
            email,
            phone
          )
        `
        )
        .order('created_at', { ascending: false });

      // Prefer server-side filtering (works with proper RLS and improves correctness/perf)
      if (role === 'patient') {
        query = query.eq('patient_id', patientId || user.id);
      } else if (role === 'referrer') {
        if (entityType && entityId) {
          query = query.eq('referrer_type', entityType).eq('referrer_entity_id', entityId);
        } else {
          // fallback by user_id (works for doctors + any referrer user)
          query = query.eq('referrer_user_id', user.id);
        }
      } else if (role === 'receiver') {
        if (entityType && entityId) {
          query = query.eq('receiver_type', entityType).eq('receiver_entity_id', entityId);
        } else {
          query = query.eq('receiver_user_id', user.id);
        }
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setReferrals((data || []) as Referral[]);
    } catch (err: any) {
      console.error('Error fetching referrals:', err);
      setError(err.message);
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  }, [user, role, entityType, entityId, patientId]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  return { referrals, loading, error, refetch: fetchReferrals };
};

// Hook for managing referrals (CRUD operations)
export const useReferralActions = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createReferral = async (
    input: CreateReferralInput,
    referrerType: ReferralEntityType,
    referrerEntityId: string
  ) => {
    if (!user) {
      toast.error('You must be logged in to create a referral');
      return { error: 'Not authenticated' };
    }

    try {
      setLoading(true);

      const validUntil =
        input.valid_until ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // If receiver is a doctor, we can resolve receiver_user_id up-front
      let receiverUserId: string | null = null;
      if (input.receiver_type === 'doctor') {
        const { data: doc } = await supabase
          .from('doctors')
          .select('user_id')
          .eq('id', input.receiver_entity_id)
          .maybeSingle();
        receiverUserId = (doc as any)?.user_id ?? null;
      }

      const { data, error } = await supabase
        .from('referrals')
        .insert({
          patient_id: input.patient_id,
          referrer_type: referrerType,
          referrer_entity_id: referrerEntityId,
          referrer_user_id: user.id,

          receiver_type: input.receiver_type,
          receiver_entity_id: input.receiver_entity_id,
          receiver_user_id: receiverUserId,

          referral_type_enum: input.referral_type,
          priority: input.priority || 'routine',
          status: 'draft',
          reason: input.reason,
          clinical_notes: input.clinical_notes,
          diagnosis_codes: input.diagnosis_codes,
          valid_from: new Date().toISOString().split('T')[0],
          valid_until: validUntil,
          preferred_date: input.preferred_date,
          preferred_time_slot: input.preferred_time_slot,
          estimated_duration_minutes: input.estimated_duration_minutes || 30,
          attachments: input.attachments || [],
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Referral created successfully');
      return { data, success: true };
    } catch (err: any) {
      console.error('Error creating referral:', err);
      toast.error(err.message || 'Failed to create referral');
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const sendReferral = async (referralId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('referrals')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', referralId);

      if (error) throw error;

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'sent',
        p_notes: 'Referral sent to receiver',
      });

      toast.success('Referral sent successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Error sending referral:', err);
      toast.error(err.message || 'Failed to send referral');
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const acceptReferral = async (referralId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      setLoading(true);

      // Ensure receiver_user_id is set when receiver accepts (very important for non-doctor entities)
      const { data: current, error: readErr } = await supabase
        .from('referrals')
        .select('id, receiver_user_id')
        .eq('id', referralId)
        .single();
      if (readErr) throw readErr;

      const patch: any = {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      };

      if (!current.receiver_user_id) {
        patch.receiver_user_id = user.id;
      }

      const { error } = await supabase.from('referrals').update(patch).eq('id', referralId);
      if (error) throw error;

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'accepted',
        p_notes: 'Referral accepted by receiver',
      });

      toast.success('Referral accepted');
      return { success: true };
    } catch (err: any) {
      console.error('Error accepting referral:', err);
      toast.error(err.message || 'Failed to accept referral');
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const rejectReferral = async (referralId: string, reason: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      setLoading(true);

      const { data: current, error: readErr } = await supabase
        .from('referrals')
        .select('id, receiver_user_id')
        .eq('id', referralId)
        .single();
      if (readErr) throw readErr;

      const patch: any = {
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
        rejection_reason: reason,
      };

      if (!current.receiver_user_id) {
        patch.receiver_user_id = user.id;
      }

      const { error } = await supabase.from('referrals').update(patch).eq('id', referralId);
      if (error) throw error;

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'rejected',
        p_notes: `Referral rejected: ${reason}`,
      });

      toast.success('Referral rejected');
      return { success: true };
    } catch (err: any) {
      console.error('Error rejecting referral:', err);
      toast.error(err.message || 'Failed to reject referral');
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const completeReferral = async (referralId: string, resultNotes?: string, resultAttachments?: any[]) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      setLoading(true);

      const { data: current, error: readErr } = await supabase
        .from('referrals')
        .select('id, receiver_user_id')
        .eq('id', referralId)
        .single();
      if (readErr) throw readErr;

      const patch: any = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id,
        result_notes: resultNotes,
        result_attachments: resultAttachments || [],
      };

      if (!current.receiver_user_id) {
        patch.receiver_user_id = user.id;
      }

      const { error } = await supabase.from('referrals').update(patch).eq('id', referralId);
      if (error) throw error;

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'completed',
        p_notes: 'Referral completed',
      });

      toast.success('Referral completed');
      return { success: true };
    } catch (err: any) {
      console.error('Error completing referral:', err);
      toast.error(err.message || 'Failed to complete referral');
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const cancelReferral = async (referralId: string, reason?: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('referrals')
        .update({ status: 'cancelled' })
        .eq('id', referralId);

      if (error) throw error;

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'cancelled',
        p_notes: reason || 'Referral cancelled',
      });

      toast.success('Referral cancelled');
      return { success: true };
    } catch (err: any) {
      console.error('Error cancelling referral:', err);
      toast.error(err.message || 'Failed to cancel referral');
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createReferral,
    sendReferral,
    acceptReferral,
    rejectReferral,
    completeReferral,
    cancelReferral,
  };
};

// Hook for referral slots
export const useReferralSlots = (referralId?: string) => {
  const [slots, setSlots] = useState<ReferralSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSlots = useCallback(async () => {
    if (!referralId) {
      setSlots([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referral_slots')
        .select('*')
        .eq('referral_id', referralId)
        .eq('is_available', true)
        .order('slot_date')
        .order('start_time');

      if (error) throw error;
      setSlots(data || []);
    } catch (err: any) {
      console.error('Error fetching referral slots:', err);
    } finally {
      setLoading(false);
    }
  }, [referralId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const createSlots = async (
    referralId: string,
    slotsData: Omit<ReferralSlot, 'id' | 'referral_id' | 'created_at' | 'is_available' | 'is_reserved'>[]
  ) => {
    try {
      setLoading(true);

      const { error } = await supabase.from('referral_slots').insert(
        slotsData.map((slot) => ({
          referral_id: referralId,
          slot_date: slot.slot_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          notes: slot.notes,
        }))
      );

      if (error) throw error;

      toast.success('Slots published');

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'slots_published',
        p_notes: 'Receiver published available time slots',
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error creating slots:', err);
      toast.error(err.message || 'Failed to publish slots');
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { slots, loading, refetch: fetchSlots, createSlots };
};

// Hook for booking appointments via referral slots
export const useReferralAppointments = (referralId?: string) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const bookAppointment = async (referralId: string, slotId: string, appointmentData: any) => {
    if (!user) {
      toast.error('You must be logged in to book');
      return { error: 'Not authenticated' };
    }

    try {
      setLoading(true);

      const { data: slot, error: slotErr } = await supabase
        .from('referral_slots')
        .select('*')
        .eq('id', slotId)
        .single();
      if (slotErr) throw slotErr;

      if (!slot.is_available || slot.is_reserved) {
        toast.error('This slot is no longer available');
        return { error: 'Slot not available' };
      }

      const { error: reserveErr } = await supabase
        .from('referral_slots')
        .update({
          is_reserved: true,
          reserved_at: new Date().toISOString(),
          reserved_by: user.id,
        })
        .eq('id', slotId);
      if (reserveErr) throw reserveErr;

      const { error: apptErr } = await supabase.from('referral_appointments').insert({
        referral_id: referralId,
        referral_slot_id: slotId,
        appointment_date: slot.slot_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        status: 'scheduled',
        booked_by: user.id,
        notes: appointmentData?.notes,
      });
      if (apptErr) throw apptErr;

      await supabase
        .from('referrals')
        .update({ status: 'booked' })
        .eq('id', referralId);

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'booked',
        p_notes: 'Patient booked a slot',
      });

      toast.success('Appointment booked');
      return { success: true };
    } catch (err: any) {
      console.error('Error booking appointment:', err);
      toast.error(err.message || 'Failed to book');
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { loading, bookAppointment };
};
