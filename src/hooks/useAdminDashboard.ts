import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminStats {
  totalBookings: number;
  totalPatients: number;
  totalRevenue: number;
  clinicRating: number;
  pendingInvites: number;
  locations: number;
}

interface Practice {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  logo_url?: string;
  verified: boolean;
  average_rating: number;
  num_reviews: number;
  admin_id?: string;
}

interface Doctor {
  id: string;
  user_id: string;
  specialty: string;
  verified: boolean;
  average_rating: number;
  num_reviews: number;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  patient_name?: string;
  doctor_name?: string;
}

interface Service {
  id: string;
  name: string;
  price?: number;
  duration_minutes: number;
  category: string;
  dentist_id?: string;
  doctor_name?: string;
}

export const useAdminDashboard = () => {
  const { user, profile } = useAuth();
  const [practice, setPractice] = useState<Practice | null>(null);
  const [stats, setStats] = useState<AdminStats>({
    totalBookings: 0,
    totalPatients: 0,
    totalRevenue: 0,
    clinicRating: 0,
    pendingInvites: 0,
    locations: 1,
  });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPractice = async () => {
    if (!user || profile?.role !== 'admin') {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('Fetching practice for admin:', user.id);

      // Get practice where user is admin
      const { data: practiceData, error: practiceError } = await supabase
        .from('practices')
        .select('*')
        .eq('admin_id', user.id)
        .maybeSingle();

      if (practiceError) {
        console.error('Error fetching practice:', practiceError);
        throw practiceError;
      }

      if (practiceData) {
        console.log('Found practice:', practiceData);
        setPractice(practiceData);
      } else {
        console.log('No practice found for admin, creating placeholder');
        // No practice exists for this admin
        setPractice(null);
      }
    } catch (err: any) {
      console.error('Error in fetchPractice:', err);
      setError(err.message || 'Failed to load practice');
      toast.error(`Failed to load practice: ${err.message}`);
    }
  };

  const fetchStats = async () => {
    if (!practice) {
      setStats({
        totalBookings: 0,
        totalPatients: 0,
        totalRevenue: 0,
        clinicRating: 0,
        pendingInvites: 0,
        locations: 1,
      });
      return;
    }

    try {
      // Call the database function to get stats
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_practice_stats', { p_practice_id: practice.id });

      if (statsError) {
        console.error('Error fetching stats:', statsError);
        throw statsError;
      }

      if (statsData) {
        const stats = statsData as any;
        setStats({
          totalBookings: Number(stats.total_bookings) || 0,
          totalPatients: Number(stats.total_patients) || 0,
          totalRevenue: Number(stats.total_revenue) || 0,
          clinicRating: practice.average_rating || 0,
          pendingInvites: Number(stats.pending_invites) || 0,
          locations: 1, // Can be expanded to count actual locations
        });
      }
    } catch (err: any) {
      console.error('Error calculating stats:', err);
      // Don't throw - use default values
      setStats({
        totalBookings: 0,
        totalPatients: 0,
        totalRevenue: 0,
        clinicRating: practice.average_rating || 0,
        pendingInvites: 0,
        locations: 1,
      });
    }
  };

  const fetchDoctors = async () => {
    if (!practice) {
      setDoctors([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          user_id,
          specialty,
          verified,
          average_rating,
          num_reviews,
          appointment_count,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('practice_id', practice.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching doctors:', error);
        throw error;
      }

      setDoctors(data || []);
    } catch (err: any) {
      console.error('Error in fetchDoctors:', err);
      setDoctors([]);
    }
  };

  const fetchAppointments = async () => {
    if (!practice) {
      setAppointments([]);
      return;
    }

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
          patient_profiles:patient_id (
            full_name
          ),
          doctor_profiles:doctors!inner (
            profiles:user_id (
              full_name
            )
          )
        `)
        .eq('practice_id', practice.id)
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }

      const formatted = (data || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        end_time: apt.end_time,
        status: apt.status,
        notes: apt.notes,
        patient_name: apt.patient_profiles?.full_name || 'Unknown Patient',
        doctor_name: apt.doctor_profiles?.profiles?.full_name || 'Unknown Doctor',
      }));

      setAppointments(formatted);
    } catch (err: any) {
      console.error('Error in fetchAppointments:', err);
      setAppointments([]);
    }
  };

  const fetchServices = async () => {
    if (!practice) {
      setServices([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('procedures')
        .select(`
          id,
          name,
          price,
          duration_minutes,
          category,
          dentist_id,
          doctors:dentist_id (
            profiles:user_id (
              full_name
            )
          )
        `)
        .eq('is_active', true)
        .in('dentist_id', doctors.map(d => d.id))
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching services:', error);
        throw error;
      }

      const formatted = (data || []).map((service: any) => ({
        id: service.id,
        name: service.name,
        price: service.price,
        duration_minutes: service.duration_minutes,
        category: service.category,
        dentist_id: service.dentist_id,
        doctor_name: service.doctors?.profiles?.full_name || 'All Providers',
      }));

      setServices(formatted);
    } catch (err: any) {
      console.error('Error in fetchServices:', err);
      setServices([]);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    await fetchPractice();
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user || profile?.role !== 'admin') {
        setLoading(false);
        return;
      }

      setLoading(true);
      await fetchPractice();
    };

    loadData();
  }, [user, profile]);

  useEffect(() => {
    const loadSecondaryData = async () => {
      if (practice) {
        await Promise.allSettled([
          fetchStats(),
          fetchDoctors(),
          fetchAppointments(),
        ]);
      }
      setLoading(false);
    };

    loadSecondaryData();
  }, [practice]);

  useEffect(() => {
    if (doctors.length > 0) {
      fetchServices();
    }
  }, [doctors]);

  return {
    practice,
    stats,
    doctors,
    appointments,
    services,
    loading,
    error,
    refreshData,
  };
};
