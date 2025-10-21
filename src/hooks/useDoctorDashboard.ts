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
  totalServices: number;
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

interface UpcomingAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  patient_name?: string;
  notes?: string;
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
    totalServices: 0
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [todaysAppointments, setTodaysAppointments] = useState<RecentAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchDoctorProfile = async () => {
    if (!user || profile?.role !== 'doctor') {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('Fetching doctor profile for user:', user.id);
      
      // First try to get existing doctor profile
      const { data: existingDoctor, error: fetchError } = await supabase
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
        .maybeSingle();

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }

      if (existingDoctor) {
        console.log('Found existing doctor profile:', existingDoctor);
        setDoctorProfile(existingDoctor);
        return;
      }

      // No doctor profile exists, create one
      console.log('Creating new doctor profile for user:', user.id);
      const { data: newDoctor, error: createError } = await supabase
        .from('doctors')
        .insert({
          user_id: user.id,
          specialty: 'General Practice',
          verified: false,
          accepts_new_patients: true,
          bio: '',
          average_rating: 0,
          num_reviews: 0,
          weighted_rating: 0,
          appointment_count: 0
        })
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
        .single();

      if (createError) {
        console.error('Create error:', createError);
        throw createError;
      }
      
      console.log('Created new doctor profile:', newDoctor);
      setDoctorProfile(newDoctor);
      
    } catch (err: any) {
      console.error('Error in fetchDoctorProfile:', err);
      setError(err.message || 'Failed to load doctor profile');
      toast.error(`Failed to load doctor profile: ${err.message}`);
    }
  };

  const fetchAppointments = async () => {
    if (!user || !doctorProfile) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch upcoming appointments (including today and future)
      const { data: upcomingData, error: upcomingError } = await supabase
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
        .gte('appointment_date', today)
        .in('status', ['pending', 'confirmed'])
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5);

      if (upcomingError) {
        console.error('Error fetching upcoming appointments:', upcomingError);
      }

      // Fetch recent appointments for statistics
      const { data: recentData, error: recentError } = await supabase
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
        .limit(5);

      if (recentError) {
        console.error('Error fetching recent appointments:', recentError);
      }

      const formatAppointments = (appointments: any[]) => 
        (appointments || []).map(apt => ({
          id: apt.id,
          appointment_date: apt.appointment_date,
          start_time: apt.start_time,
          end_time: apt.end_time,
          status: apt.status,
          notes: apt.notes,
          patient_name: (apt.profiles as any)?.full_name || 'Unknown Patient'
        }));

      setUpcomingAppointments(formatAppointments(upcomingData || []));
      setRecentAppointments(formatAppointments(recentData || []));

      // Filter today's appointments from upcoming
      const todaysApts = formatAppointments(upcomingData || []).filter(apt => 
        apt.appointment_date === today
      );
      setTodaysAppointments(todaysApts);

    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      // Don't set error for appointments - it's not critical for dashboard loading
      setUpcomingAppointments([]);
      setRecentAppointments([]);
      setTodaysAppointments([]);
    }
  };

  const calculateStats = async () => {
    if (!user || !doctorProfile) return;

    try {
      // Use timeout for stats calculation
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Stats calculation timeout')), 8000)
      );

      // Get total unique patients
      const patientsPromise = supabase
        .from('appointments')
        .select('patient_id')
        .eq('doctor_id', doctorProfile.id)
        .neq('status', 'canceled');

      const { data: patients, error: patientsError } = await Promise.race([patientsPromise, timeoutPromise]) as any;

      if (patientsError) throw patientsError;
      
      const uniquePatients = new Set(patients?.map(p => p.patient_id) || []);

      // Calculate revenue from completed appointments
      const revenuePromise = supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', doctorProfile.id)
        .eq('status', 'completed');

      const { data: completedAppointments, error: revenueError } = await Promise.race([revenuePromise, timeoutPromise]) as any;

      if (revenueError) throw revenueError;

      const revenue = (completedAppointments?.length || 0) * (doctorProfile.consultation_fee || 150);

      // Calculate profile completion
      const profileCompletion = calculateProfileCompletion(doctorProfile);

      // Get total services count
      const servicesPromise = supabase
        .from('procedures')
        .select('id', { count: 'exact', head: true })
        .eq('dentist_id', doctorProfile.id)
        .eq('is_active', true);

      const { count: servicesCount } = await Promise.race([servicesPromise, timeoutPromise]) as any;

      setStats({
        totalPatients: uniquePatients.size,
        totalAppointments: doctorProfile.appointment_count || 0,
        totalRevenue: revenue,
        averageRating: doctorProfile.average_rating || 0,
        numReviews: doctorProfile.num_reviews || 0,
        profileCompletion,
        totalServices: servicesCount || 0
      });

    } catch (err: any) {
      console.error('Error calculating stats:', err);
      // Don't set error for stats - use defaults instead
      setStats({
        totalPatients: 0,
        totalAppointments: doctorProfile.appointment_count || 0,
        totalRevenue: 0,
        averageRating: doctorProfile.average_rating || 0,
        numReviews: doctorProfile.num_reviews || 0,
        profileCompletion: calculateProfileCompletion(doctorProfile),
        totalServices: 0
      });
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

  const retryFetch = async () => {
    setRetryCount(prev => prev + 1);
    setLoading(true);
    setError(null);
    await fetchDoctorProfile();
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
  }, [user, profile, retryCount]);

  useEffect(() => {
    const fetchSecondaryData = async () => {
      if (doctorProfile) {
        // Fetch appointments and stats in parallel
        await Promise.allSettled([
          fetchAppointments(),
          calculateStats()
        ]);
      }
      setLoading(false);
    };

    fetchSecondaryData();
  }, [doctorProfile]);

  return {
    doctorProfile,
    stats,
    upcomingAppointments,
    recentAppointments,
    todaysAppointments,
    loading,
    error,
    updateDoctorProfile,
    retryFetch,
    refreshData: async () => {
      setLoading(true);
      setError(null);
      await fetchDoctorProfile();
      if (doctorProfile) {
        await Promise.allSettled([
          fetchAppointments(),
          calculateStats()
        ]);
      }
      setLoading(false);
    }
  };
};