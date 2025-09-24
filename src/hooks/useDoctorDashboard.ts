import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DoctorStats {
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  averageRating: number;
  numReviews: number;
  profileCompletion: number;
}

interface DoctorProfile {
  id: string;
  user_id: string;
  specialty: string;
  bio?: string;
  verified: boolean;
  license_number?: string;
  consultation_fee?: number;
  accepts_new_patients: boolean;
  average_rating: number;
  num_reviews: number;
  weighted_rating: number;
  appointment_count: number;
  practice_id?: string;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string;
    phone?: string;
  };
  practices?: {
    name: string;
    city: string;
    country: string;
    verified: boolean;
  };
}

interface RecentAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  patient_name?: string;
  notes?: string;
}

export const useDoctorDashboard = () => {
  const { user, profile } = useAuth();
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [stats, setStats] = useState<DoctorStats>({
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    averageRating: 0,
    numReviews: 0,
    profileCompletion: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [todaysAppointments, setTodaysAppointments] = useState<RecentAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctorProfile = async () => {
    if (!user || profile?.role !== 'doctor') return;

    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url,
            phone
          ),
          practices:practice_id (
            name,
            city,
            country,
            verified
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setDoctorProfile(data);
    } catch (err: any) {
      console.error('Error fetching doctor profile:', err);
      setError(err.message);
    }
  };

  const fetchAppointments = async () => {
    if (!user || !doctorProfile) return;

    try {
      // Fetch recent appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          notes,
          profiles:patient_id (
            full_name
          )
        `)
        .eq('doctor_id', doctorProfile.id)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(10);

      if (appointmentsError) throw appointmentsError;

      const formattedAppointments = (appointments || []).map(apt => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        end_time: apt.end_time,
        status: apt.status,
        notes: apt.notes,
        patient_name: (apt.profiles as any)?.full_name || 'Unknown Patient'
      }));

      setRecentAppointments(formattedAppointments.slice(0, 3));

      // Filter today's appointments
      const today = new Date().toISOString().split('T')[0];
      const todaysApts = formattedAppointments.filter(apt => 
        apt.appointment_date === today
      );
      setTodaysAppointments(todaysApts);

    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError(err.message);
    }
  };

  const calculateStats = async () => {
    if (!user || !doctorProfile) return;

    try {
      // Get total unique patients
      const { data: patients, error: patientsError } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('doctor_id', doctorProfile.id)
        .neq('status', 'canceled');

      if (patientsError) throw patientsError;
      
      const uniquePatients = new Set(patients?.map(p => p.patient_id) || []);

      // Calculate revenue from completed appointments
      const { data: completedAppointments, error: revenueError } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', doctorProfile.id)
        .eq('status', 'completed');

      if (revenueError) throw revenueError;

      const revenue = (completedAppointments?.length || 0) * (doctorProfile.consultation_fee || 150);

      // Calculate profile completion
      const profileCompletion = calculateProfileCompletion(doctorProfile);

      setStats({
        totalPatients: uniquePatients.size,
        totalAppointments: doctorProfile.appointment_count || 0,
        totalRevenue: revenue,
        averageRating: doctorProfile.average_rating || 0,
        numReviews: doctorProfile.num_reviews || 0,
        profileCompletion,
      });

    } catch (err: any) {
      console.error('Error calculating stats:', err);
      setError(err.message);
    }
  };

  const calculateProfileCompletion = (profile: DoctorProfile): number => {
    let completion = 0;
    const totalFields = 7;

    // Check required fields
    if (profile.profiles?.avatar_url) completion += 1;
    if (profile.specialty) completion += 1;
    if (profile.bio) completion += 1;
    if (profile.license_number) completion += 1;
    if (profile.consultation_fee) completion += 1;
    if (profile.profiles?.phone) completion += 1;
    if (profile.practice_id || profile.verified) completion += 1;

    return Math.round((completion / totalFields) * 100);
  };

  const updateDoctorProfile = async (updates: Partial<DoctorProfile>) => {
    if (!doctorProfile) return { error: 'No doctor profile found' };

    try {
      const { error } = await supabase
        .from('doctors')
        .update(updates)
        .eq('id', doctorProfile.id);

      if (error) throw error;

      // Refresh profile
      await fetchDoctorProfile();
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile');
      return { error: err.message };
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user || profile?.role !== 'doctor') {
        setLoading(false);
        return;
      }

      setLoading(true);
      await fetchDoctorProfile();
    };

    fetchData();
  }, [user, profile]);

  useEffect(() => {
    if (doctorProfile) {
      fetchAppointments();
      calculateStats();
    }
    setLoading(false);
  }, [doctorProfile]);

  return {
    doctorProfile,
    stats,
    recentAppointments,
    todaysAppointments,
    loading,
    error,
    updateDoctorProfile,
    refreshData: async () => {
      await fetchDoctorProfile();
      await fetchAppointments();
      await calculateStats();
    }
  };
};