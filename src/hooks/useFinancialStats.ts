import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface FinancialStats {
  totalEarnings: number;
  earningsThisMonth: number;
  earningsThisWeek: number;
  unpaidEarnings: number;
  payoutsProcessed: number;
  nextPayoutDate: string | null;
  platformCommission: number;
  netEarnings: number;
}

interface EarningsHistory {
  date: string;
  earnings: number;
  appointments: number;
}

interface ServiceEarnings {
  serviceId: string;
  serviceName: string;
  bookings: number;
  totalRevenue: number;
  avgRevenue: number;
  avgDuration: number;
}

interface PayoutRecord {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  paymentMethod: string;
  referenceId: string;
}

interface PendingPayment {
  appointmentId: string;
  patientName: string;
  patientId?: string | null;
  serviceName: string;
  amount: number;
  date: string;
  status: string;
  doctorId?: string | null;
  practiceId?: string | null;
}

interface PatientEarnings {
  patientId: string;
  patientName: string;
  totalPaid: number;
  appointmentCount: number;
  lastVisit: string;
}

export const useFinancialStats = (dateFrom?: Date, dateTo?: Date, doctorIdOverride?: string | null) => {
  const { user } = useAuth();
  const [doctorId, setDoctorId] = useState<string | null>(doctorIdOverride || null);
  
  const defaultFrom = dateFrom || subDays(new Date(), 30);
  const defaultTo = dateTo || new Date();

  useEffect(() => {
    if (doctorIdOverride) {
      setDoctorId(doctorIdOverride);
      return;
    }
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
  }, [user, doctorIdOverride]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['financial-stats', doctorId, format(defaultFrom, 'yyyy-MM-dd'), format(defaultTo, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!doctorId) throw new Error('No doctor ID');

      const [
        appointmentsData,
        allAppointmentsData,
        proceduresData,
        doctorData,
        profilesData,
        toothHistoryData,
        apptProceduresData,
        sessionsData,
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, procedures(name, price, default_cost)')
          .eq('doctor_id', doctorId)
          .gte('appointment_date', format(defaultFrom, 'yyyy-MM-dd'))
          .lte('appointment_date', format(defaultTo, 'yyyy-MM-dd'))
          .order('appointment_date', { ascending: false }),
        
        supabase
          .from('appointments')
          .select('*, procedures(name, price, default_cost)')
          .eq('doctor_id', doctorId),
        
        supabase
          .from('procedures')
          .select('id, name, default_cost, price, duration_minutes')
          .eq('dentist_id', doctorId)
          .eq('is_active', true),
        
        supabase
          .from('doctors')
          .select('consultation_fee, practice_id')
          .eq('id', doctorId)
          .single(),

        supabase
          .from('profiles')
          .select('user_id, full_name'),

        supabase
          .from('tooth_procedure_history')
          .select('id, appointment_id, patient_id, procedure_name, cost, performed_at, status')
          .eq('doctor_id', doctorId),

        supabase
          .from('appointment_procedures')
          .select('id, appointment_id, estimated_cost, status, procedures(name, price, default_cost), appointments!inner(doctor_id, patient_id, appointment_date)')
          .eq('appointments.doctor_id', doctorId),

        supabase
          .from('appointment_sessions')
          .select('appointment_id, session_status')
          .eq('doctor_id', doctorId),
      ]);

      // Fetch payments already recorded for this doctor so we can subtract paid amounts
      // (including partial payments) from pending balances.
      const { data: paidRows } = await supabase
        .from('payments')
        .select('appointment_id, amount, status')
        .eq('doctor_id', doctorId)
        .in('status', ['paid', 'completed', 'succeeded', 'partial']);
      const paidByAppointment = new Map<string, number>();
      (paidRows || []).forEach((r: any) => {
        if (!r.appointment_id) return;
        paidByAppointment.set(
          r.appointment_id,
          (paidByAppointment.get(r.appointment_id) || 0) + Number(r.amount || 0),
        );
      });
      const paidAppointmentIds = new Set<string>();
      paidByAppointment.forEach((paid, id) => {
        // mark only fully paid (any positive remaining still keeps it pending)
        // We can't know the due here without context, so we leave the filter to the per-row logic below.
        // Kept for backward compatibility with consultation-only flow:
        if (paid > 0) paidAppointmentIds.add(id);
      });
      const remainingFor = (apptId: string | null | undefined, full: number) => {
        if (!apptId) return full;
        const paid = paidByAppointment.get(apptId) || 0;
        return Math.max(full - paid, 0);
      };

      const appointments = appointmentsData.data || [];
      const allAppointments = allAppointmentsData.data || [];
      const procedures = proceduresData.data || [];
      const doctor = doctorData.data;
      const profiles = profilesData.data || [];
      const sessions = sessionsData.data || [];
      const consultationFee = Number(doctor?.consultation_fee) || 0;
      const practiceId = (doctor as any)?.practice_id || null;
      const platformCommissionRate = 0.15; // 15% platform fee

      // Sessions in active/completed states make their appointment count as completed for finance.
      const activeSessionApptIds = new Set(
        sessions
          .filter((s: any) => ['in_progress', 'completed', 'ended'].includes(String(s.session_status)))
          .map((s: any) => s.appointment_id)
          .filter(Boolean),
      );
      const isCompleted = (a: any) => a.status === 'completed' || activeSessionApptIds.has(a.id);

      // Calculate earnings
      const completedAppointments = appointments.filter(isCompleted);
      const pendingAppointments = appointments.filter(
        (a: any) => !isCompleted(a) && (a.status === 'pending' || a.status === 'confirmed'),
      );
      
      const totalEarnings = allAppointments
        .filter(isCompleted)
        .reduce((sum: number, apt: any) => {
          const procPrice = apt.procedures?.price || apt.procedures?.default_cost || consultationFee;
          return sum + procPrice;
        }, 0);

      const earningsInRange = completedAppointments.reduce((sum: number, apt: any) => {
        const procPrice = apt.procedures?.price || apt.procedures?.default_cost || consultationFee;
        return sum + procPrice;
      }, 0);

      const unpaidEarnings = pendingAppointments.reduce((sum: number, apt: any) => {
        const procPrice = apt.procedures?.price || apt.procedures?.default_cost || consultationFee;
        return sum + procPrice;
      }, 0);

      const thisMonthStart = startOfMonth(new Date());
      const thisMonthEnd = endOfMonth(new Date());
      const earningsThisMonth = allAppointments
        .filter((a: any) => {
          const date = new Date(a.appointment_date);
          return isCompleted(a) && date >= thisMonthStart && date <= thisMonthEnd;
        })
        .reduce((sum: number, apt: any) => {
          const procPrice = apt.procedures?.price || apt.procedures?.default_cost || consultationFee;
          return sum + procPrice;
        }, 0);

      const weekAgo = subDays(new Date(), 7);
      const earningsThisWeek = allAppointments
        .filter((a: any) => {
          const date = new Date(a.appointment_date);
          return isCompleted(a) && date >= weekAgo;
        })
        .reduce((sum: number, apt: any) => {
          const procPrice = apt.procedures?.price || apt.procedures?.default_cost || consultationFee;
          return sum + procPrice;
        }, 0);

      const platformCommission = totalEarnings * platformCommissionRate;
      const netEarnings = totalEarnings - platformCommission;

      // Earnings history by date - ensure we have entries for all dates in range
      const earningsHistoryMap: Record<string, { earnings: number; appointments: number }> = {};
      
      // Initialize all dates in range with 0
      let currentDate = new Date(defaultFrom);
      while (currentDate <= defaultTo) {
        const dateKey = format(currentDate, 'MMM dd');
        earningsHistoryMap[dateKey] = { earnings: 0, appointments: 0 };
        currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
      }
      
      // Fill in actual data
      completedAppointments.forEach((apt: any) => {
        const date = format(new Date(apt.appointment_date), 'MMM dd');
        const procPrice = apt.procedures?.price || apt.procedures?.default_cost || consultationFee;
        
        if (earningsHistoryMap[date]) {
          earningsHistoryMap[date].earnings += procPrice;
          earningsHistoryMap[date].appointments++;
        }
      });

      const earningsHistory: EarningsHistory[] = Object.entries(earningsHistoryMap)
        .map(([date, data]) => ({
          date,
          earnings: data.earnings,
          appointments: data.appointments
        }))
        .sort((a, b) => {
          // Sort by date chronologically
          const dateA = new Date(a.date + ' ' + new Date().getFullYear());
          const dateB = new Date(b.date + ' ' + new Date().getFullYear());
          return dateA.getTime() - dateB.getTime();
        });

      // Service earnings
      const serviceEarningsMap: Record<string, any> = {};
      procedures.forEach((proc: any) => {
        serviceEarningsMap[proc.id] = {
          serviceId: proc.id,
          serviceName: proc.name,
          bookings: 0,
          totalRevenue: 0,
          avgDuration: proc.duration_minutes || 30
        };
      });

      completedAppointments.forEach((apt: any) => {
        if (apt.procedure_id && serviceEarningsMap[apt.procedure_id]) {
          const procPrice = apt.procedures?.price || apt.procedures?.default_cost || consultationFee;
          serviceEarningsMap[apt.procedure_id].bookings++;
          serviceEarningsMap[apt.procedure_id].totalRevenue += procPrice;
        }
      });

      const serviceEarnings: ServiceEarnings[] = Object.values(serviceEarningsMap)
        .map((service: any) => ({
          ...service,
          avgRevenue: service.bookings > 0 ? service.totalRevenue / service.bookings : 0
        }))
        .filter((service: any) => service.bookings > 0)
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Patient earnings
      const patientEarningsMap: Record<string, any> = {};
      completedAppointments.forEach((apt: any) => {
        const patientProfile = profiles.find((p: any) => p.user_id === apt.patient_id);
        const patientName = patientProfile?.full_name || 'Unknown Patient';
        const procPrice = apt.procedures?.price || apt.procedures?.default_cost || consultationFee;
        
        if (!patientEarningsMap[apt.patient_id]) {
          patientEarningsMap[apt.patient_id] = {
            patientId: apt.patient_id,
            patientName,
            totalPaid: 0,
            appointmentCount: 0,
            lastVisit: apt.appointment_date
          };
        }
        
        patientEarningsMap[apt.patient_id].totalPaid += procPrice;
        patientEarningsMap[apt.patient_id].appointmentCount++;
        
        if (new Date(apt.appointment_date) > new Date(patientEarningsMap[apt.patient_id].lastVisit)) {
          patientEarningsMap[apt.patient_id].lastVisit = apt.appointment_date;
        }
      });

      const patientEarnings: PatientEarnings[] = Object.values(patientEarningsMap)
        .sort((a: any, b: any) => b.totalPaid - a.totalPaid);

      // Pending payments — appointment-level.
      // Only include the consultation fee when the appointment has no linked procedure
      // (a pure consultation). Appointments with a procedure are billed via the
      // procedure rows below, so we don't double-charge a consultation fee on them.
      const pendingPayments: PendingPayment[] = pendingAppointments
        .filter((apt: any) => !apt.procedure_id && !apt.procedures)
        .map((apt: any) => {
          const remaining = remainingFor(apt.id, consultationFee);
          if (remaining <= 0) return null;
          const patientProfile = profiles.find((p: any) => p.user_id === apt.patient_id);
          const paid = paidByAppointment.get(apt.id) || 0;
          return {
            appointmentId: apt.id,
            patientName: patientProfile?.full_name || 'Unknown Patient',
            patientId: apt.patient_id,
            serviceName: 'Consultation',
            amount: remaining,
            date: apt.appointment_date,
            status: paid > 0 ? 'partial' : apt.status,
            doctorId,
            practiceId,
          } as PendingPayment;
        })
        .filter(Boolean) as PendingPayment[];

      // Pending payments — procedures performed during appointments (dental work, injections, etc.)
      const toothHistory = (toothHistoryData as any)?.data || [];
      const apptProcedures = (apptProceduresData as any)?.data || [];

      toothHistory
        .filter((row: any) => row.status === 'completed' && Number(row.cost) > 0)
        .forEach((row: any) => {
          const patientProfile = profiles.find((p: any) => p.user_id === row.patient_id);
          pendingPayments.push({
            appointmentId: `tph-${row.id}`,
            patientName: patientProfile?.full_name || 'Unknown Patient',
            patientId: row.patient_id,
            serviceName: row.procedure_name || 'Procedure',
            amount: Number(row.cost) || 0,
            date: row.performed_at || row.created_at,
            status: 'unpaid',
            doctorId,
            practiceId,
          });
        });

      apptProcedures
        .filter((row: any) => Number(row.estimated_cost) > 0 && row.status !== 'cancelled')
        .forEach((row: any) => {
          const apt = row.appointments;
          if (!apt) return;
          const full = Number(row.estimated_cost) || 0;
          const remaining = remainingFor(row.appointment_id, full);
          if (remaining <= 0) return;
          const patientProfile = profiles.find((p: any) => p.user_id === apt.patient_id);
          const paid = paidByAppointment.get(row.appointment_id) || 0;
          pendingPayments.push({
            appointmentId: `ap-${row.id}`,
            patientName: patientProfile?.full_name || 'Unknown Patient',
            patientId: apt.patient_id,
            serviceName: row.procedures?.name || 'Procedure',
            amount: remaining,
            date: apt.appointment_date,
            status: paid > 0 ? 'partial' : (row.status || 'unpaid'),
            doctorId,
            practiceId,
          });
        });

      // Calculate payout records from completed appointments
      // Group payouts by month
      const payoutMap: Record<string, { amount: number; appointments: string[] }> = {};
      
      allAppointments
        .filter(isCompleted)
        .forEach((apt: any) => {
          const monthKey = format(new Date(apt.appointment_date), 'yyyy-MM');
          const procPrice = apt.procedures?.price || apt.procedures?.default_cost || consultationFee;
          const netAmount = procPrice * (1 - platformCommissionRate);
          
          if (!payoutMap[monthKey]) {
            payoutMap[monthKey] = { amount: 0, appointments: [] };
          }
          payoutMap[monthKey].amount += netAmount;
          payoutMap[monthKey].appointments.push(apt.id);
        });

      const payoutRecords: PayoutRecord[] = Object.entries(payoutMap)
        .map(([monthKey, data], index) => {
          const monthDate = new Date(monthKey + '-01');
          const isPastMonth = monthDate < startOfMonth(new Date());
          
          return {
            id: monthKey,
            amount: data.amount,
            status: isPastMonth ? 'completed' : 'pending',
            date: format(monthDate, 'yyyy-MM-dd'),
            paymentMethod: 'Bank Transfer',
            referenceId: 'PAY-' + monthKey.replace('-', '')
          } as PayoutRecord;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 12); // Last 12 months

      // Financial insights
      const cancelledAppointments = appointments.filter((a: any) => a.status === 'cancelled');
      const refundRate = appointments.length > 0 ? (cancelledAppointments.length / appointments.length) * 100 : 0;
      
      const mostProfitableService = serviceEarnings[0] || null;
      const busiestDays = earningsHistory
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 3);

      const totalHours = completedAppointments.reduce((sum: number, apt: any) => {
        return sum + (apt.procedures?.duration_minutes || 30) / 60;
      }, 0);
      const revenuePerHour = totalHours > 0 ? earningsInRange / totalHours : 0;

      return {
        stats: {
          totalEarnings,
          earningsThisMonth,
          earningsThisWeek,
          unpaidEarnings,
          payoutsProcessed: payoutRecords.filter(p => p.status === 'completed').length,
          nextPayoutDate: format(new Date(new Date().setDate(new Date().getDate() + 15)), 'MMM dd, yyyy'),
          platformCommission,
          netEarnings
        },
        earningsHistory,
        serviceEarnings,
        patientEarnings,
        pendingPayments,
        payoutRecords,
        insights: {
          refundRate,
          mostProfitableService,
          busiestDays,
          revenuePerHour,
          totalHours
        }
      };
    },
    enabled: !!doctorId,
    refetchInterval: 60000
  });

  return {
    stats: data?.stats || {
      totalEarnings: 0,
      earningsThisMonth: 0,
      earningsThisWeek: 0,
      unpaidEarnings: 0,
      payoutsProcessed: 0,
      nextPayoutDate: null,
      platformCommission: 0,
      netEarnings: 0
    },
    earningsHistory: data?.earningsHistory || [],
    serviceEarnings: data?.serviceEarnings || [],
    patientEarnings: data?.patientEarnings || [],
    pendingPayments: data?.pendingPayments || [],
    payoutRecords: data?.payoutRecords || [],
    insights: data?.insights || {
      refundRate: 0,
      mostProfitableService: null,
      busiestDays: [],
      revenuePerHour: 0,
      totalHours: 0
    },
    loading: isLoading,
    error: error?.message || null,
    refreshData: refetch
  };
};
