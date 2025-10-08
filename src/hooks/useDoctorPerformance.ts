import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface PerformanceStats {
  totalAppointments: number;
  totalPatients: number;
  averageRating: number;
  totalReviews: number;
  monthlyRevenue: number;
  completionRate: number;
  averageSessionLength: number;
  responseTime: number;
  monthlyGrowth: number;
  patientGrowth: number;
}

interface MonthlyData {
  month: string;
  appointments: number;
  revenue: number;
  newPatients: number;
}

interface TopService {
  name: string;
  bookings: number;
  revenue: number;
}

interface PatientReview {
  patient_name: string;
  rating: number;
  comment: string;
  date: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  badge_color: string;
  earned_at?: string;
  newly_earned?: boolean;
}

export const useDoctorPerformance = () => {
  const { user } = useAuth();
  const [doctorId, setDoctorId] = useState<string | null>(null);

  // Get doctor ID
  useEffect(() => {
    const getDoctorId = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (data) setDoctorId(data.id);
    };

    getDoctorId();
  }, [user]);

  // Fetch performance data with React Query for real-time updates
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['doctor-performance', doctorId],
    queryFn: async () => {
      if (!doctorId) throw new Error('No doctor ID');

      // Fetch all data in parallel
      const [
        appointmentsData,
        trendsData,
        responseTimeData,
        achievementsData,
        earnedAchievementsData,
        proceduresData,
        doctorData
      ] = await Promise.all([
        // Get appointments for stats
        supabase
          .from('appointments')
          .select('*')
          .eq('doctor_id', doctorId),
        
        // Get monthly trends
        supabase.rpc('get_doctor_monthly_trends', {
          p_doctor_id: doctorId,
          p_months: 6
        }),
        
        // Get response time
        supabase.rpc('calculate_avg_response_time', {
          p_doctor_id: doctorId
        }),
        
        // Check for new achievements
        supabase.rpc('check_and_award_achievements', {
          p_doctor_id: doctorId
        }),
        
        // Get earned achievements
        supabase
          .from('user_achievements')
          .select('*, achievements(*)')
          .eq('doctor_id', doctorId)
          .order('earned_at', { ascending: false }),
        
        // Get procedures for services
        supabase
          .from('procedures')
          .select('id, name, default_cost, price')
          .eq('dentist_id', doctorId)
          .eq('is_active', true)
          .limit(4),
        
        // Get doctor data
        supabase
          .from('doctors')
          .select('average_rating, num_reviews, consultation_fee')
          .eq('id', doctorId)
          .single()
      ]);

      const appointments = appointmentsData.data || [];
      const trends = trendsData.data || [];
      const responseTime = responseTimeData.data || 12;
      const newAchievements = (achievementsData.data || []).filter((a: any) => a.newly_earned);
      const earnedAchievements = earnedAchievementsData.data || [];
      const procedures = proceduresData.data || [];
      const doctor = doctorData.data;

      // Calculate stats
      const completedAppointments = appointments.filter((a: any) => a.status === 'completed');
      const uniquePatients = new Set(appointments.map((a: any) => a.patient_id));
      const consultationFee = doctor?.consultation_fee || 150;
      const totalRevenue = completedAppointments.length * consultationFee;

      const completionRate = appointments.length > 0 
        ? (completedAppointments.length / appointments.length) * 100 
        : 0;

      // Calculate growth rates
      const currentMonth = trends[0];
      const previousMonth = trends[1];
      const monthlyGrowth = previousMonth && previousMonth.appointments_count > 0
        ? ((currentMonth.appointments_count - previousMonth.appointments_count) / previousMonth.appointments_count) * 100
        : 0;
      const patientGrowth = previousMonth && previousMonth.new_patients > 0
        ? ((currentMonth.new_patients - previousMonth.new_patients) / previousMonth.new_patients) * 100
        : 0;

      // Format top services
      const topServices = procedures.map((proc: any) => ({
        name: proc.name,
        bookings: appointments.filter((a: any) => a.procedure_id === proc.id).length,
        revenue: appointments
          .filter((a: any) => a.procedure_id === proc.id && a.status === 'completed')
          .length * (proc.price || proc.default_cost || consultationFee)
      }));

      return {
        stats: {
          totalAppointments: appointments.length,
          totalPatients: uniquePatients.size,
          averageRating: doctor?.average_rating || 0,
          totalReviews: doctor?.num_reviews || 0,
          monthlyRevenue: totalRevenue,
          completionRate,
          averageSessionLength: 45,
          responseTime,
          monthlyGrowth,
          patientGrowth
        },
        monthlyData: trends.map((t: any) => ({
          month: t.month_name,
          appointments: t.appointments_count,
          revenue: t.revenue,
          newPatients: t.new_patients
        })),
        topServices,
        recentReviews: [],
        newAchievements: newAchievements.map((a: any) => ({
          id: a.achievement_id,
          title: a.title,
          description: '',
          icon: '',
          category: '',
          badge_color: '',
          newly_earned: a.newly_earned
        })) as Achievement[],
        earnedAchievements: earnedAchievements.map((ua: any) => ({
          id: ua.achievement_id,
          title: ua.achievements?.title || '',
          description: ua.achievements?.description || '',
          icon: ua.achievements?.icon || '',
          category: ua.achievements?.category || '',
          badge_color: ua.achievements?.badge_color || 'blue',
          earned_at: ua.earned_at
        })) as Achievement[]
      };
    },
    enabled: !!doctorId,
    refetchInterval: 60000 // Refetch every minute for real-time updates
  });

  return {
    stats: data?.stats || {
      totalAppointments: 0,
      totalPatients: 0,
      averageRating: 0,
      totalReviews: 0,
      monthlyRevenue: 0,
      completionRate: 0,
      averageSessionLength: 45,
      responseTime: 12,
      monthlyGrowth: 0,
      patientGrowth: 0
    },
    monthlyData: data?.monthlyData || [],
    topServices: data?.topServices || [],
    recentReviews: data?.recentReviews || [],
    newAchievements: data?.newAchievements || [],
    earnedAchievements: data?.earnedAchievements || [],
    loading: isLoading,
    error: error?.message || null,
    refreshData: refetch
  };
};