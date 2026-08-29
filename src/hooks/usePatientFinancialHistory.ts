import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { chargeRemaining, chargePaid } from '@/lib/billing/recordBillingPayment';

export interface HistoryCharge {
  id: string;
  description: string;
  amount: number;
  paid: number;
  remaining: number;
  currency: string;
  date: string;
  teeth?: number[];
}

export interface HistoryVisit {
  appointmentId: string | null;
  date: string;
  appointmentType?: string | null;
  status?: string | null;
  charges: HistoryCharge[];
  billed: number;
  discounts: number;
  paid: number;
  remaining: number;
  currency: string;
}

export interface PatientFinancialHistory {
  loading: boolean;
  visits: HistoryVisit[];
  totals: {
    billed: number;
    discounts: number;
    paid: number;
    outstanding: number;
    credit: number;
    currency: string;
  };
  refresh: () => Promise<void>;
}

const money = (row: any): number =>
  row?.amount_cents != null ? Number(row.amount_cents) / 100 : Number(row?.amount) || 0;

/**
 * Full, patient-wide financial history: every visit with its procedure charges,
 * what has been paid against them, and the resulting balance (or credit).
 * Works for registered patients (patient_id) and manually added ones
 * (appointments.doctor_patient_id).
 */
export function usePatientFinancialHistory(
  patientId?: string | null,
  doctorPatientId?: string | null,
): PatientFinancialHistory {
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState<HistoryVisit[]>([]);
  const [totals, setTotals] = useState<PatientFinancialHistory['totals']>({
    billed: 0,
    discounts: 0,
    paid: 0,
    outstanding: 0,
    credit: 0,
    currency: 'USD',
  });

  const refresh = useCallback(async () => {
    if (!patientId && !doctorPatientId) {
      setVisits([]);
      return;
    }
    setLoading(true);
    try {
      // Appointments belonging to this patient (both link styles).
      const apptQuery = patientId
        ? supabase
            .from('appointments')
            .select('id, appointment_date, start_time, status, appointment_type')
            .eq('patient_id', patientId)
        : supabase
            .from('appointments')
            .select('id, appointment_date, start_time, status, appointment_type')
            .eq('doctor_patient_id', doctorPatientId as string);

      const { data: appts } = await apptQuery
        .order('appointment_date', { ascending: false })
        .limit(300);
      const apptArr = (appts as any[]) || [];
      const apptIds = apptArr.map((a) => a.id);

      // Billing rows: by patient when registered, otherwise by their appointments.
      let billRows: any[] = [];
      if (patientId) {
        const { data } = await supabase
          .from('billing_transactions')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(500);
        billRows = (data as any[]) || [];
      }
      if (apptIds.length > 0) {
        const { data } = await supabase
          .from('billing_transactions')
          .select('*')
          .in('appointment_id', apptIds)
          .order('created_at', { ascending: false })
          .limit(500);
        const seen = new Set(billRows.map((r) => r.id));
        for (const row of (data as any[]) || []) {
          if (!seen.has(row.id)) billRows.push(row);
        }
      }

      // Real payment rows (payments table) for these appointments.
      let payRows: any[] = [];
      if (apptIds.length > 0) {
        const { data } = await supabase
          .from('payments')
          .select('id, appointment_id, amount, status, payment_method, paid_at, created_at')
          .in('appointment_id', apptIds)
          .limit(500);
        payRows = ((data as any[]) || []).filter(
          (p) => !['refunded', 'failed'].includes((p.status || '').toLowerCase()),
        );
      }

      const apptMap = new Map(apptArr.map((a) => [a.id, a]));
      const groups = new Map<string, HistoryVisit>();
      const keyOf = (id: string | null) => id || '__other__';

      const ensure = (apptId: string | null): HistoryVisit => {
        const key = keyOf(apptId);
        let g = groups.get(key);
        if (!g) {
          const appt = apptId ? apptMap.get(apptId) : null;
          g = {
            appointmentId: apptId,
            date: appt?.appointment_date || '',
            appointmentType: appt?.appointment_type ?? null,
            status: appt?.status ?? null,
            charges: [],
            billed: 0,
            discounts: 0,
            paid: 0,
            remaining: 0,
            currency: 'USD',
          };
          groups.set(key, g);
        }
        return g;
      };

      for (const row of billRows) {
        const type = row.transaction_type ?? 'charge';
        if (type === 'refund') continue;
        const g = ensure(row.appointment_id ?? null);
        const currency = (row.currency || 'USD').toUpperCase();
        g.currency = currency;
        const value = money(row);
        if (type === 'discount') {
          g.discounts += Math.abs(value);
        } else if (type === 'payment') {
          g.paid += Math.abs(value);
        } else {
          const paid = chargePaid(row);
          const remaining = chargeRemaining(row);
          g.billed += value;
          g.paid += paid;
          g.charges.push({
            id: row.id,
            description: row.description || 'Charge',
            amount: value,
            paid,
            remaining,
            currency,
            date: (row.metadata as any)?.performed_at || row.created_at,
            teeth: (row.metadata as any)?.teeth,
          });
        }
        if (!g.date) g.date = (row.created_at || '').slice(0, 10);
      }

      for (const p of payRows) {
        const g = ensure(p.appointment_id ?? null);
        g.paid += Number(p.amount) || 0;
      }

      const list = Array.from(groups.values()).map((g) => ({
        ...g,
        charges: g.charges.sort((a, b) => (a.date < b.date ? 1 : -1)),
        remaining: g.billed - g.discounts - g.paid,
      }));
      list.sort((a, b) => {
        if (!a.appointmentId) return 1;
        if (!b.appointmentId) return -1;
        return a.date < b.date ? 1 : -1;
      });

      const billed = list.reduce((s, g) => s + g.billed, 0);
      const discounts = list.reduce((s, g) => s + g.discounts, 0);
      const paid = list.reduce((s, g) => s + g.paid, 0);
      const net = billed - discounts - paid;

      setVisits(list);
      setTotals({
        billed,
        discounts,
        paid,
        outstanding: Math.max(0, net),
        credit: net < -0.005 ? -net : 0,
        currency: list[0]?.currency || 'USD',
      });
    } catch (e) {
      console.error('usePatientFinancialHistory failed', e);
    } finally {
      setLoading(false);
    }
  }, [patientId, doctorPatientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, visits, totals, refresh };
}
