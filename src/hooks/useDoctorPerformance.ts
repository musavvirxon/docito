import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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

export const useDoctorPerformance = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PerformanceStats>({
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
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [recentReviews, setRecentReviews] = useState<PatientReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformanceData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get doctor profile
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!doctorData) return;

      // Get all appointments for stats calculation
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles:patient_id (full_name)
        `)
        .eq('doctor_id', doctorData.id);

      const appointmentsData = appointments || [];

      // Calculate basic stats
      const totalAppointments = appointmentsData.length;
      const uniquePatients = new Set(appointmentsData.map(apt => apt.patient_id));
      const totalPatients = uniquePatients.size;
      const completedAppointments = appointmentsData.filter(apt => apt.status === 'completed');
      const monthlyRevenue = completedAppointments.length * (doctorData.consultation_fee || 150);
      const completionRate = totalAppointments > 0 ? (completedAppointments.length / totalAppointments) * 100 : 0;

      // Calculate monthly data for the last 6 months
      const monthlyStats: MonthlyData[] = [];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = months[date.getMonth()];
        const year = date.getFullYear();
        const monthKey = `${year}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

        const monthAppointments = appointmentsData.filter(apt => 
          apt.appointment_date.startsWith(monthKey)
        );

        const monthCompletedAppointments = monthAppointments.filter(apt => apt.status === 'completed');
        const monthRevenue = monthCompletedAppointments.length * (doctorData.consultation_fee || 150);
        const monthNewPatients = new Set(monthAppointments.map(apt => apt.patient_id)).size;

        monthlyStats.push({
          month: monthStr,
          appointments: monthAppointments.length,
          revenue: monthRevenue,
          newPatients: monthNewPatients
        });
      }

      // Calculate growth rates
      const currentMonth = monthlyStats[monthlyStats.length - 1];
      const previousMonth = monthlyStats[monthlyStats.length - 2];
      const monthlyGrowth = previousMonth && previousMonth.appointments > 0 
        ? ((currentMonth.appointments - previousMonth.appointments) / previousMonth.appointments) * 100
        : 0;

      const patientGrowth = previousMonth && previousMonth.newPatients > 0
        ? ((currentMonth.newPatients - previousMonth.newPatients) / previousMonth.newPatients) * 100
        : 0;

      // Get top services from procedures
      const { data: procedures } = await supabase
        .from('procedures')
        .select('name, default_cost')
        .eq('dentist_id', doctorData.id)
        .eq('is_active', true)
        .limit(4);

      const topServicesData: TopService[] = (procedures || []).map((proc, index) => ({
        name: proc.name,
        bookings: Math.floor(Math.random() * 50) + 10, // Mock data for now
        revenue: (Math.floor(Math.random() * 50) + 10) * (proc.default_cost || 150)
      }));

      // Mock recent reviews (in real app, you'd have a reviews table)
      const mockReviews: PatientReview[] = [
        {
          patient_name: "Sarah M.",
          rating: 5,
          comment: "Excellent care and very thorough examination.",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString()
        },
        {
          patient_name: "John D.",
          rating: 5,
          comment: "Dr. " + (doctorData?.id || 'Doctor') + " is very knowledgeable and caring.",
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
        },
        {
          patient_name: "Emily R.",
          rating: 4,
          comment: "Great experience, would recommend to others.",
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toLocaleDateString()
        }
      ];

      setStats({
        totalAppointments,
        totalPatients,
        averageRating: doctorData.average_rating || 0,
        totalReviews: doctorData.num_reviews || 0,
        monthlyRevenue,
        completionRate,
        averageSessionLength: 45, // Mock data
        responseTime: 12, // Mock data
        monthlyGrowth,
        patientGrowth
      });

      setMonthlyData(monthlyStats);
      setTopServices(topServicesData);
      setRecentReviews(mockReviews);

    } catch (err: any) {
      console.error('Error fetching performance data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [user]);

  return {
    stats,
    monthlyData,
    topServices,
    recentReviews,
    loading,
    error,
    refreshData: fetchPerformanceData
  };
};