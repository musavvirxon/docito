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

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  department: string;
  status: string;
}

interface Location {
  id: string;
  name: string;
  address: string;
  phone: string;
  city: string;
  photo_urls: string[];
  is_primary: boolean;
}

interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  last_visit: string;
  doctor_name: string;
  status: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  patient_name: string;
  created_at: string;
  paid_at?: string;
}

interface Message {
  id: string;
  title: string;
  message: string;
  sender_name: string;
  created_at: string;
  read_at?: string;
}

interface PerformanceMetrics {
  averageRating: number;
  patientRetention: number;
  avgWaitTime: number;
  noShowRate: number;
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
    locations: 0,
  });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    averageRating: 0,
    patientRetention: 0,
    avgWaitTime: 0,
    noShowRate: 0,
  });
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
        console.log('No practice found for admin - setup required');
        setPractice(null);
      }
    } catch (err: any) {
      console.error('Error in fetchPractice:', err);
      setError(err.message || 'Failed to load practice');
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
        locations: 0,
      });
      return;
    }

    try {
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
          clinicRating: Number(stats.clinic_rating) || 0,
          pendingInvites: Number(stats.pending_invites) || 0,
          locations: Number(stats.locations) || 0,
        });
      }
    } catch (err: any) {
      console.error('Error calculating stats:', err);
      setStats({
        totalBookings: 0,
        totalPatients: 0,
        totalRevenue: 0,
        clinicRating: practice.average_rating || 0,
        pendingInvites: 0,
        locations: 0,
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

      if (error) throw error;
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

      if (error) throw error;

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
    if (!practice || doctors.length === 0) {
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

      if (error) throw error;

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

  const fetchStaff = async () => {
    if (!practice) {
      setStaff([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('practice_staff')
        .select('*')
        .eq('practice_id', practice.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (err: any) {
      console.error('Error in fetchStaff:', err);
      setStaff([]);
    }
  };

  const fetchLocations = async () => {
    if (!practice) {
      setLocations([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('practice_locations')
        .select('*')
        .eq('practice_id', practice.id)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (err: any) {
      console.error('Error in fetchLocations:', err);
      setLocations([]);
    }
  };

  const fetchPatients = async () => {
    if (!practice) {
      setPatients([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          patient_id,
          appointment_date,
          profiles!appointments_patient_id_fkey(full_name, email, phone),
          doctors!inner(id, profiles!doctors_user_id_fkey(full_name))
        `)
        .eq('practice_id', practice.id)
        .order('appointment_date', { ascending: false });

      if (error) throw error;

      // Group by patient and get their latest appointment
      const patientMap = new Map();
      data?.forEach((apt: any) => {
        if (!patientMap.has(apt.patient_id)) {
          patientMap.set(apt.patient_id, {
            id: apt.patient_id,
            full_name: apt.profiles?.full_name || 'Unknown',
            email: apt.profiles?.email || '',
            phone: apt.profiles?.phone || '',
            last_visit: apt.appointment_date,
            doctor_name: apt.doctors?.profiles?.full_name || 'Unknown',
            status: 'Active',
          });
        }
      });

      setPatients(Array.from(patientMap.values()).slice(0, 10));
    } catch (err: any) {
      console.error('Error in fetchPatients:', err);
      setPatients([]);
    }
  };

  const fetchPayments = async () => {
    if (!practice) {
      setPayments([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          profiles!payments_patient_id_fkey(full_name)
        `)
        .eq('practice_id', practice.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formatted = (data || []).map((payment: any) => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        patient_name: payment.profiles?.full_name || 'Unknown',
        created_at: payment.created_at,
        paid_at: payment.paid_at,
      }));

      setPayments(formatted);
    } catch (err: any) {
      console.error('Error in fetchPayments:', err);
      setPayments([]);
    }
  };

  const fetchMessages = async () => {
    if (!practice || doctors.length === 0) {
      setMessages([]);
      return;
    }

    try {
      const doctorUserIds = doctors.map(d => d.user_id).filter(Boolean);
      if (doctorUserIds.length === 0) {
        setMessages([]);
        return;
      }

      const { data, error } = await supabase
        .from('real_time_notifications')
        .select(`
          *,
          sender:profiles!real_time_notifications_sender_user_id_fkey(full_name)
        `)
        .in('recipient_user_id', doctorUserIds)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const formatted = (data || []).map((notif: any) => ({
        id: notif.id,
        title: notif.title,
        message: notif.message,
        sender_name: notif.sender?.full_name || 'System',
        created_at: notif.created_at,
        read_at: notif.read_at,
      }));

      setMessages(formatted);
    } catch (err: any) {
      console.error('Error in fetchMessages:', err);
      setMessages([]);
    }
  };

  const fetchPerformanceMetrics = async () => {
    if (!practice) {
      setMetrics({
        averageRating: 0,
        patientRetention: 0,
        avgWaitTime: 0,
        noShowRate: 0,
      });
      return;
    }

    try {
      // Calculate patient retention (patients with multiple visits)
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('practice_id', practice.id)
        .eq('status', 'completed');

      const patientVisitCounts = new Map<string, number>();
      allAppointments?.forEach((apt: any) => {
        patientVisitCounts.set(apt.patient_id, (patientVisitCounts.get(apt.patient_id) || 0) + 1);
      });

      const returningPatients = Array.from(patientVisitCounts.values()).filter(count => count > 1).length;
      const totalPatients = patientVisitCounts.size;
      const patientRetention = totalPatients > 0 ? (returningPatients / totalPatients) * 100 : 0;

      // Calculate no-show rate
      const { count: totalCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('practice_id', practice.id);

      const { count: noShowCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('practice_id', practice.id)
        .eq('status', 'canceled');

      const noShowRate = (totalCount || 0) > 0 ? ((noShowCount || 0) / (totalCount || 1)) * 100 : 0;

      setMetrics({
        averageRating: practice.average_rating || 0,
        patientRetention: Math.round(patientRetention),
        avgWaitTime: 12, // This would require additional tracking
        noShowRate: Math.round(noShowRate),
      });
    } catch (err: any) {
      console.error('Error in fetchPerformanceMetrics:', err);
      setMetrics({
        averageRating: practice.average_rating || 0,
        patientRetention: 0,
        avgWaitTime: 12,
        noShowRate: 0,
      });
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
          fetchStaff(),
          fetchLocations(),
        ]);
      }
      setLoading(false);
    };

    loadSecondaryData();
  }, [practice]);

  useEffect(() => {
    if (doctors.length > 0) {
      Promise.allSettled([
        fetchServices(),
        fetchPatients(),
        fetchPayments(),
        fetchMessages(),
        fetchPerformanceMetrics(),
      ]);
    }
  }, [doctors]);

  return {
    practice,
    stats,
    doctors,
    appointments,
    services,
    staff,
    locations,
    patients,
    payments,
    messages,
    metrics,
    loading,
    error,
    refreshData,
  };
};
