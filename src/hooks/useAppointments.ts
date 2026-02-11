import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { appointmentApi, type Appointment } from '@/lib/api/supabase-api';

export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile, activeRole } = useAuth();

  const fetchAppointments = useCallback(async () => {
    if (!user) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    // Derive role: prefer activeRole, then profile.role, default to 'patient'
    const role: 'patient' | 'doctor' = activeRole === 'doctor' ? 'doctor'
      : (profile?.role === 'doctor' ? 'doctor' : 'patient');

    try {
      setLoading(true);
      const result = await appointmentApi.fetchAppointments(user.id, role);
      
      if ('success' in result && result.success) {
        setAppointments(result.data as any[]);
        setError(null);
      } else if ('error' in result) {
        setError(result.error);
        setAppointments([]);
      }
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError('Failed to fetch appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [user, profile, activeRole]);

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const result = await appointmentApi.cancelAppointment(appointmentId);
      
      if ('success' in result && result.success) {
        await fetchAppointments();
        return { success: true };
      } else if ('error' in result) {
        return { error: result.error };
      }
      return { error: 'Unknown error' };
    } catch (err: any) {
      console.error('Error cancelling appointment:', err);
      return { error: 'Failed to cancel appointment' };
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
    cancelAppointment,
  };
};