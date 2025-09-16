import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { appointmentApi, type Appointment } from '@/lib/api/supabase-api';

export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchAppointments = async () => {
    if (!user || !profile) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await appointmentApi.fetchAppointments(user.id, profile.role as 'patient' | 'doctor');
      
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
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const result = await appointmentApi.cancelAppointment(appointmentId);
      
      if ('success' in result && result.success) {
        // Refresh appointments
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
  }, [user, profile]);

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
    cancelAppointment,
  };
};