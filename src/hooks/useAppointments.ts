import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Appointment {
  id: string;
  doctor_id?: string;
  patient_id?: string;
  practice_id?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'canceled' | 'no_show';
  notes?: string;
  created_at: string;
  // Joined data from related tables
  doctor?: {
    id: string;
    specialty: string;
    user_id: string;
  };
  practice?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
  };
}

export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchAppointments = async () => {
    if (!user) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors(
            id,
            specialty,
            user_id
          ),
          practice:practices(
            id,
            name,
            address,
            phone
          )
        `)
        .eq('patient_id', user.id)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      setAppointments(data || []);
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'canceled' })
        .eq('id', appointmentId);

      if (error) throw error;

      // Refresh appointments
      await fetchAppointments();
      return { success: true };
    } catch (err: any) {
      console.error('Error cancelling appointment:', err);
      return { error: err.message };
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
    cancelAppointment,
  };
};