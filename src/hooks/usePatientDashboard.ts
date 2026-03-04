import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isFuture, isToday, isPast } from 'date-fns';

export interface DashboardStats {
  nextAppointment: any | null;
  upcomingAppointmentsCount: number;
  upcomingAppointments: number; // Alias for count
  completedAppointments: number;
  testResults: number;
  medicalRecords: number;
  medicalRecordsCount: number; // Alias
  pendingReminders: number;
  recentAppointments: any[];
}

export const usePatientDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    nextAppointment: null,
    upcomingAppointmentsCount: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
    testResults: 0,
    medicalRecords: 0,
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
            user_id
          ),
          practice:practices(
            name,
            address
          )
        `)
        .eq('patient_id', user.id)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Hydrate doctor names from doctor_profiles_view
      const doctorIds = [...new Set((appointments || []).map((a: any) => a.doctor?.id).filter(Boolean))];
      let doctorNameMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (doctorIds.length > 0) {
        const { data: dpvData } = await supabase
          .from('doctor_profiles_view')
          .select('id, full_name, avatar_url')
          .in('id', doctorIds);
        if (dpvData) {
          for (const d of dpvData as any[]) {
            doctorNameMap[d.id] = { full_name: d.full_name, avatar_url: d.avatar_url };
          }
        }
      }

      // Attach doctor names
      const hydratedAppointments = (appointments || []).map((a: any) => {
        if (a.doctor?.id && doctorNameMap[a.doctor.id]) {
          return {
            ...a,
            doctor: {
              ...a.doctor,
              profiles: doctorNameMap[a.doctor.id],
            },
          };
        }
        return a;
      });

      // Filter upcoming and past appointments
      const now = new Date();
      const upcoming = hydratedAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.appointment_date);
        return isFuture(aptDate) || isToday(aptDate);
      });
      
      const past = hydratedAppointments.filter((apt: any) => {
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
        upcomingAppointments: upcoming.length,
        completedAppointments: past.length,
        testResults: 0, // TODO: Fetch from lab orders
        medicalRecords: recordsCount || 0,
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
