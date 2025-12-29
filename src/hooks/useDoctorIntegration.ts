import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Unified types for all doctor data
export interface DoctorProfile {
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

export interface DoctorService {
  id: string;
  dentist_id: string;
  name: string;
  description?: string;
  category: string;
  default_cost?: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  patient_name?: string;
  notes?: string;
}

export interface DoctorStats {
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  averageRating: number;
  numReviews: number;
  profileCompletion: number;
}

export interface TreatmentPlan {
  id: string;
  title: string;
  status: string;
  patient_id: string;
  doctor_id: string;
  total_cost: number;
  created_at: string;
  updated_at: string;
}

// Custom hook for unified doctor data management
export const useDoctorIntegration = () => {
  const { user, profile } = useAuth();
  
  // State management
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [services, setServices] = useState<DoctorService[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [todaysAppointments, setTodaysAppointments] = useState<Appointment[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [stats, setStats] = useState<DoctorStats>({
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    averageRating: 0,
    numReviews: 0,
    profileCompletion: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Profile operations
  const fetchDoctorProfile = useCallback(async () => {
    if (!user || profile?.role !== 'doctor') return null;

    try {
      const { data: existingDoctor, error } = await supabase
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

      if (error) throw error;

      if (existingDoctor) {
        setDoctorProfile(existingDoctor);
        return existingDoctor;
      }

      // Create new doctor profile
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

      if (createError) throw createError;
      
      setDoctorProfile(newDoctor);
      return newDoctor;
    } catch (err: any) {
      console.error('Error with doctor profile:', err);
      toast.error(`Profile error: ${err.message}`);
      return null;
    }
  }, [user, profile]);

  // Services operations
  const fetchServices = useCallback(async () => {
    if (!doctorProfile) return;

    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('dentist_id', doctorProfile.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (err: any) {
      console.error('Error fetching services:', err);
    }
  }, [doctorProfile]);

  // Appointments operations
  const fetchAppointments = useCallback(async () => {
    if (!doctorProfile) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: upcomingData } = await supabase
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
        .order('start_time', { ascending: true });

      const { data: recentData } = await supabase
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

      const formatted = formatAppointments(upcomingData || []);
      setUpcomingAppointments(formatted);
      setRecentAppointments(formatAppointments(recentData || []));
      setTodaysAppointments(formatted.filter(apt => apt.appointment_date === today));
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
    }
  }, [doctorProfile]);

  // Treatment plans operations
  const fetchTreatmentPlans = useCallback(async () => {
    if (!doctorProfile) return;

    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('doctor_id', doctorProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTreatmentPlans(data || []);
    } catch (err: any) {
      console.error('Error fetching treatment plans:', err);
    }
  }, [doctorProfile]);

  // Stats calculation
  const calculateStats = useCallback(async () => {
    if (!doctorProfile) return;

    try {
      const { data: patients } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('doctor_id', doctorProfile.id)
        .neq('status', 'canceled');
      
      const uniquePatients = new Set(patients?.map(p => p.patient_id) || []);

      const { data: completedAppointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', doctorProfile.id)
        .eq('status', 'completed');

      const revenue = (completedAppointments?.length || 0) * (doctorProfile.consultation_fee || 150);
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
    }
  }, [doctorProfile]);

  const calculateProfileCompletion = (profile: DoctorProfile): number => {
    let completion = 0;
    const totalFields = 7;

    if (profile.profiles?.avatar_url) completion += 1;
    if (profile.specialty) completion += 1;
    if (profile.bio) completion += 1;
    if (profile.license_number) completion += 1;
    if (profile.consultation_fee) completion += 1;
    if (profile.profiles?.phone) completion += 1;
    if (profile.practice_id || profile.verified) completion += 1;

    return Math.round((completion / totalFields) * 100);
  };

  // CRUD operations
  const updateProfile = async (updates: Partial<DoctorProfile>) => {
    if (!doctorProfile) return { error: 'No doctor profile found' };

    try {
      const { error } = await supabase
        .from('doctors')
        .update(updates)
        .eq('id', doctorProfile.id);

      if (error) throw error;

      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile');
      return { error: err.message };
    }
  };

  const addService = async (serviceData: Omit<DoctorService, 'id' | 'dentist_id' | 'created_at' | 'updated_at'>) => {
    if (!doctorProfile) return { error: 'No doctor profile found' };

    try {
      const insertData = {
        name: serviceData.name,
        description: serviceData.description,
        category: serviceData.category as any,
        default_cost: serviceData.default_cost,
        duration_minutes: serviceData.duration_minutes,
        is_active: serviceData.is_active,
        dentist_id: doctorProfile.id
      };
      const { error } = await supabase
        .from('procedures')
        .insert(insertData);

      if (error) throw error;

      setRefreshTrigger(prev => prev + 1);
      toast.success('Service added successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Error adding service:', err);
      toast.error('Failed to add service');
      return { error: err.message };
    }
  };

  const updateService = async (id: string, updates: Partial<DoctorService>) => {
    try {
      const updateData = {
        ...updates,
        category: updates.category as any
      };
      const { error } = await supabase
        .from('procedures')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setRefreshTrigger(prev => prev + 1);
      toast.success('Service updated successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Error updating service:', err);
      toast.error('Failed to update service');
      return { error: err.message };
    }
  };

  const deleteService = async (id: string) => {
    try {
      const { error } = await supabase
        .from('procedures')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setRefreshTrigger(prev => prev + 1);
      toast.success('Service deleted successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting service:', err);
      toast.error('Failed to delete service');
      return { error: err.message };
    }
  };

  // Comprehensive refresh function
  const refreshAllData = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await fetchDoctorProfile();
      if (profile) {
        await Promise.all([
          fetchServices(),
          fetchAppointments(),
          fetchTreatmentPlans(),
          calculateStats()
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchDoctorProfile, fetchServices, fetchAppointments, fetchTreatmentPlans, calculateStats]);

  // Real-time subscriptions for data sync with debouncing
  useEffect(() => {
    if (!doctorProfile) return;

    let debounceTimer: NodeJS.Timeout;
    const triggerRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 1000); // Debounce for 1 second
    };

    const channels = [
      // Profile changes
      supabase
        .channel('doctor-profile-changes')
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'doctors', filter: `id=eq.${doctorProfile.id}` },
          triggerRefresh
        )
        .subscribe(),

      // Service changes
      supabase
        .channel('doctor-services-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'procedures', filter: `dentist_id=eq.${doctorProfile.id}` },
          triggerRefresh
        )
        .subscribe(),

      // Appointment changes
      supabase
        .channel('doctor-appointments-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'appointments', filter: `doctor_id=eq.${doctorProfile.id}` },
          triggerRefresh
        )
        .subscribe()
    ];

    return () => {
      clearTimeout(debounceTimer);
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [doctorProfile]);

  // Initial load only - do not include refreshAllData in dependencies to prevent loops
  useEffect(() => {
    let mounted = true;
    
    const loadInitialData = async () => {
      if (user && profile?.role === 'doctor' && mounted) {
        await refreshAllData();
      } else if (mounted) {
        setLoading(false);
      }
    };
    
    loadInitialData();
    
    return () => {
      mounted = false;
    };
  }, [user, profile]);
  
  // Handle refresh trigger separately without calling refreshAllData
  useEffect(() => {
    if (!doctorProfile || refreshTrigger === 0) return;
    
    let mounted = true;
    
    const handleRefresh = async () => {
      if (!mounted) return;
      
      // Fetch only the changed data, not everything
      await Promise.all([
        fetchServices(),
        fetchAppointments(),
        calculateStats()
      ]);
    };
    
    handleRefresh();
    
    return () => {
      mounted = false;
    };
  }, [refreshTrigger]);

  return {
    // Data
    doctorProfile,
    services,
    upcomingAppointments,
    todaysAppointments,
    recentAppointments,
    treatmentPlans,
    stats,
    
    // State
    loading,
    
    // Actions
    updateProfile,
    addService,
    updateService,
    deleteService,
    refreshAllData,
    
    // Computed values
    isProfileComplete: stats.profileCompletion >= 80,
    hasActiveServices: services.length > 0,
    hasUpcomingAppointments: upcomingAppointments.length > 0,
    hasTodaysAppointments: todaysAppointments.length > 0,
  };
};