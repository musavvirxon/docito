// src/hooks/useSuperAdminData.ts
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
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

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
        supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role', 'patient'),
        supabase.from('appointments').select('id, status', { count: 'exact' }),
        supabase.from('payments').select('amount, status, created_at'),
        supabase.from('practice_verification' as any).select('id', { count: 'exact' }).eq('verification_status', 'under_review'),
        supabase.from('doctor_verification' as any).select('id', { count: 'exact' }).eq('verification_status', 'under_review'),
      ]);

      const clinics = clinicsResult.data || [];
      const doctors = doctorsResult.data || [];
      const appointments = appointmentsResult.data || [];
      const payments = (paymentsResult.data || []) as any[];

      const completedPayments = payments.filter((p) => p.status === 'completed');
      const totalRevenue = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const monthlyRevenue = completedPayments
        .filter((p) => {
          const d = new Date(p.created_at);
          return d >= monthStart && d < nextMonthStart;
        })
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const stats: DashboardStats = {
        totalClinics: clinicsResult.count || 0,
        verifiedClinics: clinics.filter((c: any) => c.verified).length,
        pendingClinics: verificationClinicsResult.count || 0,
        totalDoctors: doctorsResult.count || 0,
        verifiedDoctors: doctors.filter((d: any) => d.verified).length,
        pendingDoctors: verificationDoctorsResult.count || 0,
        totalPatients: patientsResult.count || 0,
        totalAppointments: appointmentsResult.count || 0,
        completedAppointments: appointments.filter((a: any) => a.status === 'completed').length,
        pendingAppointments: appointments.filter((a: any) => a.status === 'pending').length,
        totalRevenue,
        monthlyRevenue,
      };

      return stats;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useSystemLogs(limit: number = 50) {
  return useQuery({
    queryKey: ['system-audit-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_audit_logs' as any)
        .select(
          `
          *,
          profiles:user_id (
            full_name,
            email
          )
        `
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching system logs:', error);
        return [];
      }
      return (data || []) as any as SystemLog[];
    },
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

export function useAllAppointments() {
  return useQuery({
    queryKey: ['all-appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(
          `
          *,
          patient:patient_id (full_name, email, phone),
          doctor:doctor_id (user_id, specialty),
          practice:practice_id (name)
        `
        )
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
        .select(
          `
          *,
          patient:patient_id (full_name, email),
          practice:practice_id (name),
          appointment:appointment_id (appointment_date)
        `
        )
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
        .select(
          `
          *,
          profiles:user_id (full_name, email, phone, avatar_url),
          practice:practice_id (name)
        `
        )
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
        .select(
          `
          *,
          admin:admin_id (full_name, email)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });
}

export function useRevenueData() {
  return useQuery({
    queryKey: ['revenue-analytics'],
    queryFn: async () => {
      const start = new Date();
      start.setMonth(start.getMonth() - 6);

      const { data, error } = await supabase
        .from('payments')
        .select('amount, created_at, status')
        .eq('status', 'completed')
        .gte('created_at', start.toISOString());

      if (error) throw error;

      const buckets: Record<string, { key: string; label: string; revenue: number; sort: number }> = {};

      for (const p of data || []) {
        const d = new Date((p as any).created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!buckets[key]) {
          const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          buckets[key] = { key, label, revenue: 0, sort: d.getFullYear() * 100 + (d.getMonth() + 1) };
        }
        buckets[key].revenue += Number((p as any).amount || 0);
      }

      return Object.values(buckets)
        .sort((a, b) => a.sort - b.sort)
        .map((b) => ({ month: b.label, revenue: Math.round(b.revenue) }));
    },
    staleTime: 60000,
  });
}

export function useAppointmentVolumeData() {
  return useQuery({
    queryKey: ['appointment-volume'],
    queryFn: async () => {
      const start = new Date();
      start.setDate(start.getDate() - 7);

      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_date, status')
        .gte('appointment_date', start.toISOString().split('T')[0]);

      if (error) throw error;

      const dayData = (data || []).reduce((acc: any, apt: any) => {
        const day = new Date(apt.appointment_date).toLocaleDateString('en-US', { weekday: 'short' });
        if (!acc[day]) acc[day] = { day, appointments: 0 };
        acc[day].appointments += 1;
        return acc;
      }, {});

      const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return daysOrder.map((day) => dayData[day] || { day, appointments: 0 });
    },
    staleTime: 60000,
  });
}

export function useSignupData() {
  return useQuery({
    queryKey: ['signup-analytics'],
    queryFn: async () => {
      const start = new Date();
      start.setDate(start.getDate() - 28);

      const { data: doctors, error: docError } = await supabase
        .from('doctors')
        .select('created_at')
        .gte('created_at', start.toISOString());

      if (docError) throw docError;

      const { data: patients, error: patError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('role', 'patient')
        .gte('created_at', start.toISOString());

      if (patError) throw patError;

      const weeks = [0, 1, 2, 3].map((i) => {
        const weekStart = new Date(start);
        weekStart.setDate(weekStart.getDate() + i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekLabel = `Week ${i + 1}`;

        const doctorCount = (doctors || []).filter((d: any) => {
          const date = new Date(d.created_at);
          return date >= weekStart && date < weekEnd;
        }).length;

        const patientCount = (patients || []).filter((p: any) => {
          const date = new Date(p.created_at);
          return date >= weekStart && date < weekEnd;
        }).length;

        return { week: weekLabel, doctors: doctorCount, patients: patientCount };
      });

      return weeks;
    },
    staleTime: 60000,
  });
}
