import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StaffPermissions {
  practice_id: string | null;
  staff_role: string | null;
  can_book_appointments: boolean;
  can_view_medical_records: boolean;
  can_manage_billing: boolean;
  can_manage_patients: boolean;
  can_view_schedule: boolean;
  status: string;
}

export interface StaffAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  patient_name: string;
  patient_email?: string;
  patient_phone?: string;
  doctor_name: string;
  doctor_id: string;
}

export interface StaffPatient {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  last_visit?: string;
  status: string;
}

export interface StaffPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_type: string;
  patient_name: string;
  created_at: string;
  paid_at?: string;
}

export interface PracticeInfo {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
}

export const useStaffDashboard = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<StaffPermissions | null>(null);
  const [practice, setPractice] = useState<PracticeInfo | null>(null);
  const [todaysAppointments, setTodaysAppointments] = useState<StaffAppointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<StaffAppointment[]>([]);
  const [recentPatients, setRecentPatients] = useState<StaffPatient[]>([]);
  const [recentPayments, setRecentPayments] = useState<StaffPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('get_staff_permissions', {
        p_user_id: user.id
      });

      if (error) throw error;
      if (!data || typeof data !== 'object') return null;
      return data as unknown as StaffPermissions;
    } catch (err: any) {
      console.error('Error fetching permissions:', err);
      return null;
    }
  }, [user]);

  const fetchPractice = useCallback(async (practiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('practices')
        .select('id, name, phone, email, address, city, country')
        .eq('id', practiceId)
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error fetching practice:', err);
      return null;
    }
  }, []);

  const fetchTodaysAppointments = useCallback(async (practiceId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          notes,
          patient_id,
          doctor_id,
          profiles!appointments_patient_id_fkey (
            full_name,
            email,
            phone
          ),
          doctors!inner (
            id,
            profiles:user_id (
              full_name
            )
          )
        `)
        .eq('practice_id', practiceId)
        .eq('appointment_date', today)
        .order('start_time', { ascending: true });

      if (error) throw error;

      return (data || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        end_time: apt.end_time,
        status: apt.status,
        notes: apt.notes,
        patient_name: apt.profiles?.full_name || 'Unknown',
        patient_email: apt.profiles?.email,
        patient_phone: apt.profiles?.phone,
        doctor_name: apt.doctors?.profiles?.full_name || 'Unknown',
        doctor_id: apt.doctor_id,
      }));
    } catch (err: any) {
      console.error('Error fetching today\'s appointments:', err);
      return [];
    }
  }, []);

  const fetchUpcomingAppointments = useCallback(async (practiceId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          notes,
          patient_id,
          doctor_id,
          profiles!appointments_patient_id_fkey (
            full_name,
            email,
            phone
          ),
          doctors!inner (
            id,
            profiles:user_id (
              full_name
            )
          )
        `)
        .eq('practice_id', practiceId)
        .gt('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(20);

      if (error) throw error;

      return (data || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        end_time: apt.end_time,
        status: apt.status,
        notes: apt.notes,
        patient_name: apt.profiles?.full_name || 'Unknown',
        patient_email: apt.profiles?.email,
        patient_phone: apt.profiles?.phone,
        doctor_name: apt.doctors?.profiles?.full_name || 'Unknown',
        doctor_id: apt.doctor_id,
      }));
    } catch (err: any) {
      console.error('Error fetching upcoming appointments:', err);
      return [];
    }
  }, []);

  const fetchRecentPatients = useCallback(async (practiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          patient_id,
          appointment_date,
          profiles!appointments_patient_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .eq('practice_id', practiceId)
        .order('appointment_date', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Deduplicate by patient_id
      const patientMap = new Map();
      (data || []).forEach((apt: any) => {
        if (apt.patient_id && !patientMap.has(apt.patient_id)) {
          patientMap.set(apt.patient_id, {
            id: apt.patient_id,
            full_name: apt.profiles?.full_name || 'Unknown',
            email: apt.profiles?.email,
            phone: apt.profiles?.phone,
            last_visit: apt.appointment_date,
            status: 'active',
          });
        }
      });

      return Array.from(patientMap.values()).slice(0, 20);
    } catch (err: any) {
      console.error('Error fetching patients:', err);
      return [];
    }
  }, []);

  const fetchRecentPayments = useCallback(async (practiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          currency,
          status,
          payment_type,
          created_at,
          paid_at,
          profiles!payments_patient_id_fkey (
            full_name
          )
        `)
        .eq('practice_id', practiceId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map((payment: any) => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency || 'USD',
        status: payment.status,
        payment_type: payment.payment_type,
        patient_name: payment.profiles?.full_name || 'Unknown',
        created_at: payment.created_at,
        paid_at: payment.paid_at,
      }));
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      return [];
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const perms = await fetchPermissions();
      if (!perms || !perms.practice_id) {
        setError('No staff assignment found. Please contact your clinic administrator.');
        setLoading(false);
        return;
      }

      setPermissions(perms);

      const [practiceData, todayAppts, upcomingAppts, patients, payments] = await Promise.all([
        fetchPractice(perms.practice_id),
        perms.can_view_schedule ? fetchTodaysAppointments(perms.practice_id) : Promise.resolve([]),
        perms.can_view_schedule ? fetchUpcomingAppointments(perms.practice_id) : Promise.resolve([]),
        perms.can_manage_patients ? fetchRecentPatients(perms.practice_id) : Promise.resolve([]),
        perms.can_manage_billing ? fetchRecentPayments(perms.practice_id) : Promise.resolve([]),
      ]);

      setPractice(practiceData);
      setTodaysAppointments(todayAppts);
      setUpcomingAppointments(upcomingAppts);
      setRecentPatients(patients);
      setRecentPayments(payments);
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [user, fetchPermissions, fetchPractice, fetchTodaysAppointments, fetchUpcomingAppointments, fetchRecentPatients, fetchRecentPayments]);

  // Appointment actions
  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    if (!permissions?.can_book_appointments) {
      toast.error('You do not have permission to update appointments');
      return false;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus as any })
        .eq('id', appointmentId);

      if (error) throw error;
      toast.success('Appointment status updated');
      await refreshData();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update appointment');
      return false;
    }
  };

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    permissions,
    practice,
    todaysAppointments,
    upcomingAppointments,
    recentPatients,
    recentPayments,
    loading,
    error,
    refreshData,
    updateAppointmentStatus,
  };
};
