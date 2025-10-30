import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalClinics: number;
  verifiedClinics: number;
  pendingClinics: number;
  totalDoctors: number;
  verifiedDoctors: number;
  pendingDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export interface SystemLog {
  id: string;
  user_id: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async () => {
      // Fetch all required data in parallel
      const [
        clinicsResult,
        doctorsResult,
        patientsResult,
        appointmentsResult,
        paymentsResult,
        verificationClinicsResult,
        verificationDoctorsResult,
      ] = await Promise.all([
        supabase.from('practices').select('id, verified', { count: 'exact' }),
        supabase.from('doctors').select('id, verified', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'patient'),
        supabase.from('appointments').select('id, status', { count: 'exact' }),
        supabase.from('payments').select('amount, status'),
        supabase.from('practice_verification' as any).select('id', { count: 'exact' }).eq('verification_status', 'under_review'),
        supabase.from('doctor_verification' as any).select('id', { count: 'exact' }).eq('verification_status', 'under_review'),
      ]);

      const clinics = clinicsResult.data || [];
      const doctors = doctorsResult.data || [];
      const appointments = appointmentsResult.data || [];
      const payments = paymentsResult.data || [];

      // Calculate stats
      const stats: DashboardStats = {
        totalClinics: clinicsResult.count || 0,
        verifiedClinics: clinics.filter(c => c.verified).length,
        pendingClinics: (verificationClinicsResult.count || 0),
        totalDoctors: doctorsResult.count || 0,
        verifiedDoctors: doctors.filter(d => d.verified).length,
        pendingDoctors: (verificationDoctorsResult.count || 0),
        totalPatients: patientsResult.count || 0,
        totalAppointments: appointmentsResult.count || 0,
        completedAppointments: appointments.filter(a => a.status === 'completed').length,
        pendingAppointments: appointments.filter(a => a.status === 'pending').length,
        totalRevenue: payments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0),
        monthlyRevenue: payments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0),
      };

      return stats;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Auto-refresh every 60 seconds
  });
}

export function useSystemLogs(limit: number = 50) {
  return useQuery({
    queryKey: ['system-audit-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_audit_logs' as any)
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching system logs:', error);
        return [];
      }
      return (data || []) as any as SystemLog[];
    },
    staleTime: 10000,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

export function useAllAppointments() {
  return useQuery({
    queryKey: ['all-appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patient_id (full_name, email, phone),
          doctor:doctor_id (user_id, specialty),
          practice:practice_id (name)
        `)
        .order('appointment_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });
}

export function useAllPayments() {
  return useQuery({
    queryKey: ['all-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          patient:patient_id (full_name, email),
          practice:practice_id (name),
          appointment:appointment_id (appointment_date)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });
}

export function useAllDoctors() {
  return useQuery({
    queryKey: ['all-doctors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profiles:user_id (full_name, email, phone, avatar_url),
          practice:practice_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });
}

export function useAllPatients() {
  return useQuery({
    queryKey: ['all-patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });
}

export function useAllPractices() {
  return useQuery({
    queryKey: ['all-practices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practices')
        .select(`
          *,
          admin:admin_id (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });
}
