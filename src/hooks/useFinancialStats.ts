import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays } from 'date-fns';

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
  const rangeStart = startOfDay(defaultFrom);
  const rangeEnd = endOfDay(defaultTo);

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

        // Patient names are resolved later with a targeted query so RLS lets the doctor
        // read each linked patient's profile.
        Promise.resolve({ data: [] as Array<{ user_id: string; full_name: string | null }> } as any),

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
        .select('id, appointment_id, patient_id, amount, status, paid_at, created_at')
        .eq('doctor_id', doctorId)
        .in('status', ['paid', 'completed', 'succeeded', 'partial']);

      // The billing ledger is also the source of manual-patient payments and outstanding charges.
      const { data: billingLedgerRows } = await supabase
        .from('billing_transactions')
        .select('id, appointment_id, patient_id, amount, amount_cents, paid_cents, created_at, transaction_type, status')
        .eq('doctor_id', doctorId);

      const collectedRows: Array<{
        key: string;
        appointment_id: string | null;
        patient_id: string | null;
        amount: number;
        at: string;
      }> = [
        ...(paidRows || []).map((r: any) => ({
          key: `payment:${r.id}`,
          appointment_id: r.appointment_id ?? null,
          patient_id: r.patient_id ?? null,
          amount: Number(r.amount) || 0,
          at: r.paid_at || r.created_at,
        })),
        ...(billingLedgerRows || [])
          .filter((r: any) => r.transaction_type === 'payment')
          .filter((r: any) => !['refunded', 'failed', 'voided'].includes(String(r.status || '').toLowerCase()))
          .map((r: any) => ({
            key: `ledger:${r.id}`,
            appointment_id: r.appointment_id ?? null,
            patient_id: r.patient_id ?? null,
            amount: r.amount_cents != null ? Number(r.amount_cents) / 100 : Number(r.amount) || 0,
            at: r.created_at,
          })),
      ].filter((r) => r.amount > 0 && r.at);

      const uniqueCollectedRows = Array.from(
        new Map(collectedRows.map((row) => [row.key, row])).values(),
      );
      const paidByAppointment = new Map<string, number>();
      uniqueCollectedRows.forEach((r) => {
        if (!r.appointment_id) return;
        paidByAppointment.set(
          r.appointment_id,
          (paidByAppointment.get(r.appointment_id) || 0) + r.amount,
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
      void profilesData;
      const sessions = sessionsData.data || [];
      const consultationFee = Number(doctor?.consultation_fee) || 0;
      const practiceId = (doctor as any)?.practice_id || null;
      const platformCommissionRate = 0.15; // 15% platform fee

      // Resolve patient names for every patient referenced across the result sets.
      const toothHistoryRaw = (toothHistoryData as any)?.data || [];
      const apptProceduresRaw = (apptProceduresData as any)?.data || [];
      const patientIdSet = new Set<string>();
      [...(appointmentsData.data || []), ...(allAppointmentsData.data || [])]
        .forEach((a: any) => { if (a?.patient_id) patientIdSet.add(a.patient_id); });
      toothHistoryRaw.forEach((r: any) => { if (r?.patient_id) patientIdSet.add(r.patient_id); });
      apptProceduresRaw.forEach((r: any) => {
        const pid = r?.appointments?.patient_id;
        if (pid) patientIdSet.add(pid);
      });
      let profiles: Array<{ user_id: string; full_name: string | null }> = [];
      if (patientIdSet.size > 0) {
        const { data: profRows } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', Array.from(patientIdSet));
        profiles = (profRows as any) || [];
      }

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
      const weekAgo = subDays(new Date(), 7);

      // Money actually collected (recorded payments), which is what the earnings
      // figures and the chart below report.
      const collectedInRange = uniqueCollectedRows
        .filter((r) => {
          const d = new Date(r.at);
          return d >= rangeStart && d <= rangeEnd;
        })
        .reduce((sum, r) => sum + r.amount, 0);
      const collectedTotal = uniqueCollectedRows.reduce((sum, r) => sum + r.amount, 0);
      const collectedThisMonth = uniqueCollectedRows
        .filter((r) => {
          const d = new Date(r.at);
          return d >= thisMonthStart && d <= thisMonthEnd;
        })
        .reduce((sum, r) => sum + r.amount, 0);
      const collectedThisWeek = uniqueCollectedRows
        .filter((r) => new Date(r.at) >= weekAgo)
        .reduce((sum, r) => sum + r.amount, 0);
      const ledgerOutstanding = (billingLedgerRows || [])
        .filter((row: any) => !['payment', 'discount', 'refund'].includes(String(row.transaction_type || 'charge')))
        .reduce((sum: number, row: any) => {
          const totalCents = row.amount_cents != null
            ? Number(row.amount_cents)
            : Math.round((Number(row.amount) || 0) * 100);
          return sum + Math.max(0, totalCents - (Number(row.paid_cents) || 0));
        }, 0) / 100;

      const platformCommission = collectedTotal * platformCommissionRate;
      const netEarnings = collectedTotal - platformCommission;

      // Earnings history by date - ensure we have entries for all dates in range
      const earningsHistoryMap: Record<string, { earnings: number; appointments: number }> = {};
      
      // Initialize all dates in range with 0
      let currentDate = new Date(rangeStart);
      while (currentDate <= rangeEnd) {
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        earningsHistoryMap[dateKey] = { earnings: 0, appointments: 0 };
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
      }

      // Appointment counts remain useful context, but appointment prices are not revenue.
      completedAppointments.forEach((apt: any) => {
        const date = format(new Date(apt.appointment_date), 'yyyy-MM-dd');
        if (earningsHistoryMap[date]) {
          earningsHistoryMap[date].appointments++;
        }
      });

      // Recorded payments land on the day they were collected.
      uniqueCollectedRows.forEach((r) => {
        const d = new Date(r.at);
        if (d < rangeStart || d > rangeEnd) return;
        const date = format(d, 'yyyy-MM-dd');
        if (earningsHistoryMap[date]) {
          earningsHistoryMap[date].earnings += r.amount;
        }
      });

      const earningsHistory: EarningsHistory[] = Object.entries(earningsHistoryMap)
        .map(([date, data]) => ({
          date: format(new Date(`${date}T12:00:00`), 'MMM dd'),
          earnings: data.earnings,
          appointments: data.appointments
        }));

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
      const appointmentById = new Map(allAppointments.map((apt: any) => [apt.id, apt]));
      const patientEarningsMap: Record<string, any> = {};
      uniqueCollectedRows.forEach((payment) => {
        const apt: any = payment.appointment_id ? appointmentById.get(payment.appointment_id) : null;
        const patientId = payment.patient_id || apt?.patient_id || `payment:${payment.key}`;
        const patientProfile = profiles.find((p: any) => p.user_id === patientId);
        const patientName = patientProfile?.full_name || 'Unknown Patient';
        if (!patientEarningsMap[patientId]) {
          patientEarningsMap[patientId] = {
            patientId,
            patientName,
            totalPaid: 0,
            appointmentCount: 0,
            lastVisit: payment.at,
            appointmentIds: new Set<string>(),
          };
        }
        patientEarningsMap[patientId].totalPaid += payment.amount;
        if (payment.appointment_id) patientEarningsMap[patientId].appointmentIds.add(payment.appointment_id);
        patientEarningsMap[patientId].appointmentCount = patientEarningsMap[patientId].appointmentIds.size;
        if (new Date(payment.at) > new Date(patientEarningsMap[patientId].lastVisit)) {
          patientEarningsMap[patientId].lastVisit = payment.at;
        }
      });

      const patientEarnings: PatientEarnings[] = Object.values(patientEarningsMap)
        .map(({ appointmentIds: _appointmentIds, ...patient }: any) => patient)
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
      const busiestDays = [...earningsHistory]
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 3);

      const totalHours = completedAppointments.reduce((sum: number, apt: any) => {
        return sum + (apt.procedures?.duration_minutes || 30) / 60;
      }, 0);
      const revenuePerHour = totalHours > 0 ? collectedInRange / totalHours : 0;

      return {
        stats: {
          totalEarnings: collectedTotal,
          earningsThisMonth: collectedThisMonth,
          earningsThisWeek: collectedThisWeek,
          unpaidEarnings: ledgerOutstanding || unpaidEarnings,
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
    refreshData: refetch,
    doctorId,
  };
};
