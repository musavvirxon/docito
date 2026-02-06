// Path: src/hooks/useReferrals.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export type ReferralEntityType = 'doctor' | 'clinic' | 'lab' | 'imaging_center' | 'pharmacy';
export type ReferralScope = 'general' | 'specific';
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
  receiver_entity_id: string | null;

  referral_scope?: ReferralScope;
  target_field?: string | null;
  target_details?: Record<string, any>;
  verification_code?: string;
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
  receiver_entity_id?: string;

  referral_scope?: ReferralScope;
  target_field?: string;
  target_details?: Record<string, any>;

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
        `,
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

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      setReferrals((data as any[]) || []);
    } catch (err: any) {
      console.error('Error fetching referrals:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to load referrals');
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
    referrerEntityId: string,
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

      const scope: ReferralScope = input.referral_scope || 'specific';

      if (scope === 'specific') {
        if (!input.receiver_entity_id) {
          toast.error('Please select a receiver');
          return { error: 'Missing receiver' };
        }
      } else {
        if (!input.target_field || !input.target_field.trim()) {
          toast.error('Please specify a target field / specialty');
          return { error: 'Missing target_field' };
        }
      }

      // If receiver is a doctor and the referral is specific, resolve receiver_user_id up-front
      let receiverUserId: string | null = null;
      if (scope === 'specific' && input.receiver_type === 'doctor' && input.receiver_entity_id) {
        const { data: doc } = await supabase
          .from('doctors')
          .select('user_id')
          .eq('id', input.receiver_entity_id)
          .maybeSingle();
        receiverUserId = (doc as any)?.user_id ?? null;
      }

      const insertPayload: any = {
        patient_id: input.patient_id,
        referrer_type: referrerType,
        referrer_entity_id: referrerEntityId,
        referrer_user_id: user.id,

        receiver_type: input.receiver_type,
        receiver_entity_id: scope === 'specific' ? input.receiver_entity_id : null,
        receiver_user_id: scope === 'specific' ? receiverUserId : null,

        referral_scope: scope,
        target_field: scope === 'general' ? input.target_field?.trim() : null,
        target_details: scope === 'general' ? input.target_details || {} : {},

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
      };

      const { data, error } = await supabase.from('referrals').insert(insertPayload).select().single();

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

  const acceptReferral = async (referralId: string, receiverUserId?: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('referrals')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: receiverUserId || user?.id,
        })
        .eq('id', referralId);

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

  const rejectReferral = async (referralId: string, reason: string, receiverUserId?: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('referrals')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: receiverUserId || user?.id,
          rejection_reason: reason,
        })
        .eq('id', referralId);

      if (error) throw error;

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'rejected',
        p_notes: reason,
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

  const publishSlots = async (referralId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('referrals')
        .update({
          status: 'slots_available',
        })
        .eq('id', referralId);

      if (error) throw error;

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'slots_available',
        p_notes: 'Receiver published available slots',
      });

      toast.success('Slots published');
      return { success: true };
    } catch (err: any) {
      console.error('Error publishing slots:', err);
      toast.error(err.message || 'Failed to publish slots');
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const bookReferralSlot = async (referralId: string, slotId: string) => {
    if (!user) {
      toast.error('You must be logged in to book an appointment');
      return { error: 'Not authenticated' };
    }

    try {
      setLoading(true);

      // Get slot details
      const { data: slot, error: slotError } = await supabase
        .from('referral_slots')
        .select('*')
        .eq('id', slotId)
        .single();

      if (slotError) throw slotError;

      // Create appointment record
      const { data: appointment, error: appointmentError } = await supabase
        .from('referral_appointments')
        .insert({
          referral_id: referralId,
          referral_slot_id: slotId,
          appointment_date: slot.slot_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          status: 'booked',
          booked_at: new Date().toISOString(),
          booked_by: user.id,
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Mark slot as reserved
      const { error: reserveError } = await supabase
        .from('referral_slots')
        .update({
          is_reserved: true,
          is_available: false,
          reserved_at: new Date().toISOString(),
          reserved_by: user.id,
        })
        .eq('id', slotId);

      if (reserveError) throw reserveError;

      // Update referral status
      const { error: updateError } = await supabase
        .from('referrals')
        .update({
          status: 'booked',
          preferred_date: slot.slot_date,
          preferred_time_slot: `${slot.start_time}-${slot.end_time}`,
        })
        .eq('id', referralId);

      if (updateError) throw updateError;

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'booked',
        p_notes: `Appointment booked for ${slot.slot_date} ${slot.start_time}-${slot.end_time}`,
      });

      toast.success('Appointment booked successfully');
      return { success: true, data: appointment };
    } catch (err: any) {
      console.error('Error booking slot:', err);
      toast.error(err.message || 'Failed to book appointment');
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const completeReferral = async (referralId: string, resultNotes?: string, resultAttachments?: any[]) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('referrals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
          result_notes: resultNotes,
          result_attachments: resultAttachments || [],
        })
        .eq('id', referralId);

      if (error) throw error;

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'completed',
        p_notes: resultNotes || 'Referral completed',
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

  const cancelReferral = async (referralId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('referrals')
        .update({
          status: 'cancelled',
        })
        .eq('id', referralId);

      if (error) throw error;

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'cancelled',
        p_notes: 'Referral cancelled',
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
    publishSlots,
    bookReferralSlot,
    completeReferral,
    cancelReferral,
  };
};

// Hook for managing referral slots
export const useReferralSlots = (referralId: string) => {
  const [slots, setSlots] = useState<ReferralSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    if (!referralId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('referral_slots')
        .select('*')
        .eq('referral_id', referralId)
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (queryError) throw queryError;

      setSlots((data as any[]) || []);
    } catch (err: any) {
      console.error('Error fetching referral slots:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [referralId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return { slots, loading, error, refetch: fetchSlots };
};

// Hook for managing referral appointments
export const useReferralAppointments = (referralId: string) => {
  const [appointments, setAppointments] = useState<ReferralAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!referralId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('referral_appointments')
        .select('*')
        .eq('referral_id', referralId)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (queryError) throw queryError;

      setAppointments((data as any[]) || []);
    } catch (err: any) {
      console.error('Error fetching referral appointments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [referralId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return { appointments, loading, error, refetch: fetchAppointments };
};
