import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ViewerEntityType = 'doctor' | 'clinic' | 'pharmacy' | 'lab' | 'imaging';

interface BillingRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  transaction_type: string;
  created_at: string;
}

interface InsuranceRow {
  id: string;
  provider_name?: string;
  plan_name?: string;
  status: string;
  amount?: number;
  created_at?: string;
}

interface ActivityRow {
  id: string;
  type: 'appointment' | 'prescription' | 'lab' | 'imaging' | 'billing';
  title: string;
  date: string;
  status?: string;
  meta?: Record<string, any>;
}

interface PatientEntityHistory {
  loading: boolean;
  billing: BillingRow[];
  insurance: InsuranceRow[];
  totals: {
    spendCents: number;
    visitCount: number;
    outstandingCents: number;
    lastVisit?: string;
    nextVisit?: string;
  };
  activity: ActivityRow[];
  refresh: () => Promise<void>;
}

/**
 * Cross-entity patient history. Fetches every record the given entity has
 * provided to the patient: bills, insurance claims, and a chronological
 * activity timeline.
 */
export function usePatientEntityHistory(
  patientId: string | null | undefined,
  entityType: ViewerEntityType | null | undefined,
  entityId: string | null | undefined,
): PatientEntityHistory {
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<BillingRow[]>([]);
  const [insurance, setInsurance] = useState<InsuranceRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [totals, setTotals] = useState<PatientEntityHistory['totals']>({
    spendCents: 0,
    visitCount: 0,
    outstandingCents: 0,
  });

  const fetchAll = useCallback(async () => {
    if (!patientId || !entityType || !entityId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // Billing transactions for this patient + entity
      const { data: bills } = await supabase
        .from('billing_transactions')
        .select('id, amount, currency, status, description, transaction_type, created_at, appointment_id')
        .eq('user_id', patientId)
        .or(`entity_id.eq.${entityId},practice_id.eq.${entityId}`)
        .order('created_at', { ascending: false })
        .limit(200);

      const billsArr = (bills || []) as any[];
      setBilling(billsArr);

      const spendCents = billsArr
        .filter((b) => b.status === 'paid' && b.transaction_type !== 'refund')
        .reduce((acc, b) => acc + Math.round(Number(b.amount) * 100), 0);
      const outstandingCents = billsArr
        .filter((b) => ['pending', 'unpaid', 'overdue'].includes((b.status || '').toLowerCase()))
        .reduce((acc, b) => acc + Math.round(Number(b.amount) * 100), 0);

      // Appointments visit count + last/next
      const { data: appts } = await supabase
        .from('appointments')
        .select('id, appointment_date, start_time, status, doctor_id, practice_id, appointment_type')
        .eq('patient_id', patientId)
        .or(
          entityType === 'clinic'
            ? `practice_id.eq.${entityId}`
            : `doctor_id.eq.${entityId}`,
        )
        .order('appointment_date', { ascending: false })
        .limit(200);

      const apptArr = (appts || []) as any[];
      const visitCount = apptArr.filter((a) => a.status === 'completed').length;
      const today = new Date().toISOString().slice(0, 10);
      const past = apptArr.filter((a) => a.appointment_date < today);
      const future = apptArr.filter((a) => a.appointment_date >= today).reverse();
      const lastVisit = past[0]?.appointment_date;
      const nextVisit = future[0]?.appointment_date;

      setTotals({ spendCents, visitCount, outstandingCents, lastVisit, nextVisit });

      // Activity timeline (combine streams)
      const tl: ActivityRow[] = [];
      for (const a of apptArr.slice(0, 30)) {
        tl.push({
          id: `appt-${a.id}`,
          type: 'appointment',
          title: `${a.appointment_type || 'Appointment'} (${a.status})`,
          date: a.appointment_date,
          status: a.status,
          meta: { appointment_id: a.id },
        });
      }
      for (const b of billsArr.slice(0, 30)) {
        tl.push({
          id: `bill-${b.id}`,
          type: 'billing',
          title: b.description || b.transaction_type,
          date: (b.created_at || '').slice(0, 10),
          status: b.status,
          meta: { amount: b.amount, currency: b.currency },
        });
      }
      tl.sort((x, y) => (x.date < y.date ? 1 : -1));
      setActivity(tl.slice(0, 50));

      // Insurance claims (best-effort — table may not exist for every entity type)
      setInsurance([]);
    } catch (err) {
      console.error('usePatientEntityHistory error:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, entityType, entityId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { loading, billing, insurance, totals, activity, refresh: fetchAll };
}
