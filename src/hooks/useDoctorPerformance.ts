import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { addDays, subDays, format, startOfMonth, endOfMonth } from 'date-fns';

interface PerformanceStats {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalPatients: number;
  lifetimePatients: number;
  averageRating: number;
  totalReviews: number;
  monthlyRevenue: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  averageSessionLength: number;
  responseTime: number;
  monthlyGrowth: number;
  patientGrowth: number;
  activeDays: number;
  avgDailyPatients: number;
  performanceBadge: string;
  returningPatients: number;
  newPatients: number;
}

interface DailyTrend {
  date: string;
  appointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
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

export const useDoctorPerformance = (dateFrom?: Date, dateTo?: Date) => {
  const { user } = useAuth();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  
  // Default date range: last 30 days
  const defaultFrom = dateFrom || subDays(new Date(), 30);
  const defaultTo = dateTo || new Date();

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
    queryKey: ['doctor-performance', doctorId, format(defaultFrom, 'yyyy-MM-dd'), format(defaultTo, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!doctorId) throw new Error('No doctor ID');

      // Fetch all data in parallel
      const [
        appointmentsData,
        allAppointmentsData,
        trendsData,
        responseTimeData,
        achievementsData,
        earnedAchievementsData,
        proceduresData,
        doctorData,
        reviewsData,
        scheduleData,
        sessionsData,
      ] = await Promise.all([
        // Get appointments in date range
        supabase
          .from('appointments')
          .select('*, procedures(name, price, default_cost)')
          .eq('doctor_id', doctorId)
          .gte('appointment_date', format(defaultFrom, 'yyyy-MM-dd'))
          .lte('appointment_date', format(defaultTo, 'yyyy-MM-dd'))
          .order('appointment_date', { ascending: true }),
        
        // Get all appointments for lifetime stats
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
        
        // Get procedures for services with appointment counts
        supabase
          .from('procedures')
          .select('id, name, default_cost, price, duration_minutes, category')
          .eq('dentist_id', doctorId)
          .eq('is_active', true),
        
        // Get doctor data
        supabase
          .from('doctors')
          .select('average_rating, num_reviews, consultation_fee')
          .eq('id', doctorId)
          .single(),
        
        // Get reviews
        supabase
          .from('appointments')
          .select('id, appointment_date, patient_id, notes')
          .eq('doctor_id', doctorId)
          .eq('status', 'completed')
          .not('notes', 'is', null)
          .order('appointment_date', { ascending: false })
          .limit(20),
        
        // Get schedule settings for active days
        supabase
          .from('schedule_settings')
          .select('working_days')
          .eq('doctor_id', doctorId)
          .single(),

        // Get appointment sessions (counts in-progress / completed sessions as activity)
        supabase
          .from('appointment_sessions')
          .select('appointment_id, session_status, started_at, ended_at')
          .eq('doctor_id', doctorId),
      ]);

      const appointments = appointmentsData.data || [];
      const allAppointments = allAppointmentsData.data || [];
      const trends = trendsData.data || [];
      const responseTime = responseTimeData.data || 12;
      const newAchievements = (achievementsData.data || []).filter((a: any) => a.newly_earned);
      const earnedAchievements = earnedAchievementsData.data || [];
      const procedures = proceduresData.data || [];
      const doctor = doctorData.data;
      const reviews = reviewsData.data || [];
      const schedule = scheduleData.data;
      const sessions = sessionsData.data || [];

      // Sessions in active / completed states promote their appointment to "completed" for analytics.
      const activeSessionApptIds = new Set(
        sessions
          .filter((s: any) => ['in_progress', 'completed', 'ended'].includes(String(s.session_status)))
          .map((s: any) => s.appointment_id)
          .filter(Boolean),
      );
      const isCompleted = (a: any) => a.status === 'completed' || activeSessionApptIds.has(a.id);

      // Calculate detailed stats
      const completedAppointments = appointments.filter(isCompleted);
      const cancelledAppointments = appointments.filter((a: any) => a.status === 'cancelled');
      const noShowAppointments = appointments.filter((a: any) => a.status === 'no-show');
      const uniquePatients = new Set(appointments.map((a: any) => a.patient_id));
      const allUniquePatients = new Set(allAppointments.map((a: any) => a.patient_id));
      const consultationFee = doctor?.consultation_fee || 150;

      // Calculate revenue
      const totalRevenue = appointments.reduce((sum: number, apt: any) => {
        if (isCompleted(apt)) {
          const procPrice = apt.procedures?.price || apt.procedures?.default_cost || consultationFee;
          return sum + procPrice;
        }
        return sum;
      }, 0);

      const completionRate = appointments.length > 0 
        ? (completedAppointments.length / appointments.length) * 100 
        : 0;
      
      const cancellationRate = appointments.length > 0
        ? (cancelledAppointments.length / appointments.length) * 100
        : 0;
      
      const noShowRate = appointments.length > 0
        ? (noShowAppointments.length / appointments.length) * 100
        : 0;

      // Calculate average appointment duration
      const avgDuration = completedAppointments.length > 0
        ? completedAppointments.reduce((sum: number, apt: any) => {
            const start = new Date(`2000-01-01T${apt.start_time}`);
            const end = new Date(`2000-01-01T${apt.end_time}`);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60);
          }, 0) / completedAppointments.length
        : 45;

      // Calculate active days
      const activeDays = new Set(
        appointments.map((a: any) => format(new Date(a.appointment_date), 'yyyy-MM-dd'))
      ).size;

      // Calculate average daily patients
      const avgDailyPatients = activeDays > 0 ? appointments.length / activeDays : 0;

      // Calculate growth rates
      const currentMonth = trends[0];
      const previousMonth = trends[1];
      const monthlyGrowth = previousMonth && previousMonth.appointments_count > 0
        ? ((currentMonth.appointments_count - previousMonth.appointments_count) / previousMonth.appointments_count) * 100
        : 0;
      const patientGrowth = previousMonth && previousMonth.new_patients > 0
        ? ((currentMonth.new_patients - previousMonth.new_patients) / previousMonth.new_patients) * 100
        : 0;

      // Group appointments by date for daily trends
      const dailyTrends = appointments.reduce((acc: any, apt: any) => {
        const date = format(new Date(apt.appointment_date), 'MMM dd');
        if (!acc[date]) {
          acc[date] = { date, appointments: 0, completed: 0, cancelled: 0, noShow: 0 };
        }
        acc[date].appointments++;
        if (isCompleted(apt)) acc[date].completed++;
        if (apt.status === 'cancelled') acc[date].cancelled++;
        if (apt.status === 'no-show') acc[date].noShow++;
        return acc;
      }, {});

      const dailyTrendsArray = Object.values(dailyTrends) as DailyTrend[];

      // Calculate service performance
      const servicePerformance = procedures.map((proc: any) => {
        const procAppointments = appointments.filter((a: any) => a.procedure_id === proc.id);
        const completed = procAppointments.filter((a: any) => a.status === 'completed');
        const revenue = completed.reduce((sum: number, apt: any) => {
          return sum + (proc.price || proc.default_cost || consultationFee);
        }, 0);
        
        return {
          id: proc.id,
          name: proc.name,
          bookings: procAppointments.length,
          completed: completed.length,
          revenue,
          avgDuration: proc.duration_minutes || 45,
          category: proc.category,
          conversionRate: procAppointments.length > 0 ? (completed.length / procAppointments.length) * 100 : 0
        };
      }).sort((a, b) => b.bookings - a.bookings);

      // Calculate time slot popularity
      const timeSlotPopularity: Record<string, number> = {};
      appointments.forEach((apt: any) => {
        const hour = new Date(`2000-01-01T${apt.start_time}`).getHours();
        const timeSlot = `${hour}:00`;
        timeSlotPopularity[timeSlot] = (timeSlotPopularity[timeSlot] || 0) + 1;
      });

      const popularTimeSlots = Object.entries(timeSlotPopularity)
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate returning vs new patients
      const patientVisits: Record<string, number> = {};
      allAppointments.forEach((apt: any) => {
        patientVisits[apt.patient_id] = (patientVisits[apt.patient_id] || 0) + 1;
      });

      const returningPatients = Object.values(patientVisits).filter(count => count > 1).length;
      const newPatients = Object.values(patientVisits).filter(count => count === 1).length;

      // Calculate performance badge
      let performanceBadge = 'Bronze';
      const score = completionRate * 0.4 + (doctor?.average_rating || 0) * 20 * 0.4 + (activeDays / 30) * 100 * 0.2;
      if (score >= 85) performanceBadge = 'Gold';
      else if (score >= 70) performanceBadge = 'Silver';

      return {
        stats: {
          totalAppointments: appointments.length,
          completedAppointments: completedAppointments.length,
          cancelledAppointments: cancelledAppointments.length,
          noShowAppointments: noShowAppointments.length,
          totalPatients: uniquePatients.size,
          lifetimePatients: allUniquePatients.size,
          averageRating: doctor?.average_rating || 0,
          totalReviews: doctor?.num_reviews || 0,
          monthlyRevenue: totalRevenue,
          completionRate,
          cancellationRate,
          noShowRate,
          averageSessionLength: Math.round(avgDuration),
          responseTime,
          monthlyGrowth,
          patientGrowth,
          activeDays,
          avgDailyPatients: Math.round(avgDailyPatients * 10) / 10,
          performanceBadge,
          returningPatients,
          newPatients
        },
        monthlyData: trends.map((t: any) => ({
          month: t.month_name,
          appointments: t.appointments_count,
          revenue: t.revenue,
          newPatients: t.new_patients
        })),
        dailyTrends: dailyTrendsArray,
        servicePerformance,
        popularTimeSlots,
        recentReviews: reviews.map((r: any) => ({
          patient_name: 'Patient',
          rating: 5,
          comment: r.notes || 'Great service',
          date: format(new Date(r.appointment_date), 'MMM dd, yyyy')
        })),
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
          earned_at: ua.earned_at,
          progress: ua.progress
        })) as Achievement[]
      };
    },
    enabled: !!doctorId,
    refetchInterval: 60000 // Refetch every minute for real-time updates
  });

  return {
    stats: data?.stats || {
      totalAppointments: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
      noShowAppointments: 0,
      totalPatients: 0,
      lifetimePatients: 0,
      averageRating: 0,
      totalReviews: 0,
      monthlyRevenue: 0,
      completionRate: 0,
      cancellationRate: 0,
      noShowRate: 0,
      averageSessionLength: 45,
      responseTime: 12,
      monthlyGrowth: 0,
      patientGrowth: 0,
      activeDays: 0,
      avgDailyPatients: 0,
      performanceBadge: 'Bronze',
      returningPatients: 0,
      newPatients: 0
    },
    monthlyData: data?.monthlyData || [],
    dailyTrends: data?.dailyTrends || [],
    servicePerformance: data?.servicePerformance || [],
    popularTimeSlots: data?.popularTimeSlots || [],
    recentReviews: data?.recentReviews || [],
    newAchievements: data?.newAchievements || [],
    earnedAchievements: data?.earnedAchievements || [],
    loading: isLoading,
    error: error?.message || null,
    refreshData: refetch
  };
};