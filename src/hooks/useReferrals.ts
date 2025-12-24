import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export type ReferralEntityType = 'doctor' | 'clinic' | 'lab' | 'imaging_center' | 'pharmacy';
export type ReferralType = 'consultation' | 'lab_test' | 'imaging_study' | 'prescription_fulfillment' | 'follow_up_care' | 'specialist_referral';
export type ReferralPriority = 'routine' | 'urgent' | 'stat';
export type ReferralStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'slots_available' | 'booked' | 'in_progress' | 'completed' | 'cancelled' | 'expired';

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
  // Legacy fields
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

export const useReferrals = (role?: 'referrer' | 'receiver' | 'patient' | 'all') => {
  const { user, profile } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReferrals = useCallback(async () => {
    if (!user) {
      setReferrals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch referrals - RLS will handle permissions
      const { data, error: fetchError } = await supabase
        .from('referrals')
        .select(`
          *,
          patient:patient_id(
            full_name,
            avatar_url,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Filter based on role if specified
      let filteredData = data || [];
      if (role === 'referrer') {
        filteredData = filteredData.filter(r => 
          r.referrer_user_id === user.id || 
          r.referring_doctor_id !== null
        );
      } else if (role === 'receiver') {
        filteredData = filteredData.filter(r => 
          r.receiver_user_id === user.id ||
          r.referred_doctor_id !== null
        );
      } else if (role === 'patient') {
        filteredData = filteredData.filter(r => r.patient_id === user.id);
      }

      setReferrals(filteredData as Referral[]);
    } catch (err: any) {
      console.error('Error fetching referrals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  return {
    referrals,
    loading,
    error,
    refetch: fetchReferrals
  };
};

// Hook for managing referrals (CRUD operations)
export const useReferralActions = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createReferral = async (input: CreateReferralInput, referrerType: ReferralEntityType, referrerEntityId: string) => {
    if (!user) {
      toast.error('You must be logged in to create a referral');
      return { error: 'Not authenticated' };
    }

    try {
      setLoading(true);

      // Calculate valid_until as 30 days from now if not provided
      const validUntil = input.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('referrals')
        .insert({
          patient_id: input.patient_id,
          referrer_type: referrerType,
          referrer_entity_id: referrerEntityId,
          referrer_user_id: user.id,
          receiver_type: input.receiver_type,
          receiver_entity_id: input.receiver_entity_id,
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
          attachments: input.attachments || []
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
          sent_at: new Date().toISOString()
        })
        .eq('id', referralId);

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'sent',
        p_notes: 'Referral sent to receiver'
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

      const { error } = await supabase
        .from('referrals')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: user.id
        })
        .eq('id', referralId);

      if (error) throw error;

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'accepted',
        p_notes: 'Referral accepted by receiver'
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

      const { error } = await supabase
        .from('referrals')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: reason
        })
        .eq('id', referralId);

      if (error) throw error;

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'rejected',
        p_notes: `Referral rejected: ${reason}`
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

      const { error } = await supabase
        .from('referrals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          result_notes: resultNotes,
          result_attachments: resultAttachments || []
        })
        .eq('id', referralId);

      if (error) throw error;

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'completed',
        p_notes: 'Referral completed'
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
        .update({
          status: 'cancelled'
        })
        .eq('id', referralId);

      if (error) throw error;

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'cancelled',
        p_notes: reason || 'Referral cancelled'
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
    cancelReferral
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

  const createSlots = async (referralId: string, slotsData: Omit<ReferralSlot, 'id' | 'referral_id' | 'created_at' | 'is_available' | 'is_reserved'>[]) => {
    try {
      setLoading(true);
      const insertData = slotsData.map(slot => ({
        referral_id: referralId,
        ...slot,
        is_available: true,
        is_reserved: false
      }));

      const { data, error } = await supabase
        .from('referral_slots')
        .insert(insertData)
        .select();

      if (error) throw error;

      // Update referral status to slots_available
      await supabase
        .from('referrals')
        .update({ status: 'slots_available' })
        .eq('id', referralId);

      toast.success('Slots published successfully');
      await fetchSlots();
      return { data, success: true };
    } catch (err: any) {
      console.error('Error creating slots:', err);
      toast.error(err.message || 'Failed to create slots');
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const reserveSlot = async (slotId: string, userId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('referral_slots')
        .update({
          is_reserved: true,
          reserved_at: new Date().toISOString(),
          reserved_by: userId
        })
        .eq('id', slotId);

      if (error) throw error;
      await fetchSlots();
      return { success: true };
    } catch (err: any) {
      console.error('Error reserving slot:', err);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    slots,
    loading,
    refetch: fetchSlots,
    createSlots,
    reserveSlot
  };
};

// Hook for referral appointments
export const useReferralAppointments = (referralId?: string) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<ReferralAppointment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (!referralId) {
      setAppointments([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referral_appointments')
        .select('*')
        .eq('referral_id', referralId)
        .order('appointment_date')
        .order('start_time');

      if (error) throw error;
      setAppointments(data || []);
    } catch (err: any) {
      console.error('Error fetching referral appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [referralId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const bookAppointment = async (
    referralId: string,
    slotId: string | null,
    appointmentData: {
      appointment_date: string;
      start_time: string;
      end_time: string;
      notes?: string;
    }
  ) => {
    if (!user) {
      toast.error('You must be logged in to book an appointment');
      return { error: 'Not authenticated' };
    }

    try {
      setLoading(true);

      // Create the referral appointment
      const { data, error } = await supabase
        .from('referral_appointments')
        .insert({
          referral_id: referralId,
          referral_slot_id: slotId,
          appointment_date: appointmentData.appointment_date,
          start_time: appointmentData.start_time,
          end_time: appointmentData.end_time,
          booked_by: user.id,
          notes: appointmentData.notes,
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) throw error;

      // Update referral status to booked
      await supabase
        .from('referrals')
        .update({ status: 'booked' })
        .eq('id', referralId);

      // Mark slot as unavailable if using a slot
      if (slotId) {
        await supabase
          .from('referral_slots')
          .update({ is_available: false, is_reserved: true })
          .eq('id', slotId);
      }

      await supabase.rpc('log_referral_action', {
        p_referral_id: referralId,
        p_action: 'booked',
        p_notes: `Appointment booked for ${appointmentData.appointment_date}`
      });

      toast.success('Appointment booked successfully');
      await fetchAppointments();
      return { data, success: true };
    } catch (err: any) {
      console.error('Error booking appointment:', err);
      toast.error(err.message || 'Failed to book appointment');
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    appointments,
    loading,
    refetch: fetchAppointments,
    bookAppointment
  };
};

// Hook for referral notifications
export const useReferralNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referral_notifications')
        .select('*, referral:referral_id(referral_number, status)')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('referral_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
      await fetchNotifications();
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('referral_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      await fetchNotifications();
    } catch (err: any) {
      console.error('Error marking all as read:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead
  };
};
