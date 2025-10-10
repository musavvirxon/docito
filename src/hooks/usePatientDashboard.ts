import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isFuture, isToday, isPast } from 'date-fns';

export interface DashboardStats {
  nextAppointment: any | null;
  upcomingAppointmentsCount: number;
  medicalRecordsCount: number;
  pendingReminders: number;
  recentAppointments: any[];
}

export const usePatientDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    nextAppointment: null,
    upcomingAppointmentsCount: 0,
    medicalRecordsCount: 0,
    pendingReminders: 0,
    recentAppointments: [],
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchDashboardStats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch appointments
      const { data: appointments } = await supabase
        .from('patient_all_appointments')
        .select(`
          *,
          doctor:doctors(
            id,
            specialty,
            user_id,
            profiles:user_id (
              full_name,
              avatar_url
            )
          ),
          practice:practices(
            name,
            address
          )
        `)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Filter upcoming and past appointments
      const now = new Date();
      const upcoming = (appointments || []).filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return isFuture(aptDate) || isToday(aptDate);
      });
      
      const past = (appointments || []).filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return isPast(aptDate) && !isToday(aptDate);
      });

      // Fetch medical records count
      const { count: recordsCount } = await supabase
        .from('medical_records')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', user.id);

      // Fetch pending medication reminders count
      const { count: remindersCount } = await supabase
        .from('medication_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', user.id)
        .eq('status', 'pending')
        .gte('reminder_time', new Date().toISOString());

      setStats({
        nextAppointment: upcoming[0] || null,
        upcomingAppointmentsCount: upcoming.length,
        medicalRecordsCount: recordsCount || 0,
        pendingReminders: remindersCount || 0,
        recentAppointments: past.slice(0, 3),
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [user]);

  return {
    stats,
    loading,
    refetch: fetchDashboardStats,
  };
};
