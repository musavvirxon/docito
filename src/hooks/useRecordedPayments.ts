// Recorded payments used as a source for generating superbills.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RecordedPayment {
  id: string;
  amount: number;
  currency: string | null;
  status: string | null;
  paid_at: string | null;
  created_at: string;
  notes: string | null;
  payment_method: string | null;
  appointment_id: string | null;
  patient_id: string;
  doctor_id: string | null;
  practice_id: string | null;
  patient_name?: string | null;
}

export interface SuperbillPrefill {
  patientId: string;
  serviceDate: string;
  appointmentId: string | null;
  diagnoses: { code: string; description?: string }[];
  lineItems: { code: string; description: string; units: number; fee_cents: number }[];
  notes: string | null;
  currency: string;
}

interface Options {
  practiceId?: string | null;
  doctorId?: string | null;
  patientId?: string | null;
}

const PAID = ['paid', 'completed', 'succeeded'];

export function useRecordedPayments({ practiceId, doctorId, patientId }: Options) {
  const [payments, setPayments] = useState<RecordedPayment[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('payments')
        .select('id, amount, currency, status, paid_at, created_at, notes, payment_method, appointment_id, patient_id, doctor_id, practice_id')
        .in('status', PAID)
        .order('paid_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(200);

      if (practiceId) q = q.eq('practice_id', practiceId);
      if (doctorId) q = q.eq('doctor_id', doctorId);
      if (patientId) q = q.eq('patient_id', patientId);

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data || []) as RecordedPayment[];
      const ids = Array.from(new Set(rows.map((r) => r.patient_id).filter(Boolean)));
      let names = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', ids);
        names = new Map(
          (profs || []).map((p: any) => [
            p.user_id,
            [p.first_name, p.last_name].filter(Boolean).join(' ').trim(),
          ]),
        );
      }
      setPayments(rows.map((r) => ({ ...r, patient_name: names.get(r.patient_id) || null })));
    } catch (e) {
      console.error('load recorded payments error', e);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [practiceId, doctorId, patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { payments, loading, reload: load };
}

/**
 * Pull everything a superbill needs from one or more recorded payments:
 * procedures done on the linked appointments become line items and the
 * recorded diagnoses become ICD-10 entries.
 */
export async function buildSuperbillFromPayments(
  selected: RecordedPayment[],
): Promise<SuperbillPrefill | null> {
  if (!selected.length) return null;
  const first = selected[0];
  const appointmentIds = Array.from(
    new Set(selected.map((p) => p.appointment_id).filter(Boolean)),
  ) as string[];

  const lineItems: SuperbillPrefill['lineItems'] = [];
  const diagnoses: SuperbillPrefill['diagnoses'] = [];

  if (appointmentIds.length) {
    const [{ data: procs }, { data: dxs }] = await Promise.all([
      supabase
        .from('appointment_procedures')
        .select('id, estimated_cost, procedure_notes, procedures(name, code, price)')
        .in('appointment_id', appointmentIds),
      supabase
        .from('appointment_diagnoses')
        .select('icd10_code, diagnosis_title')
        .in('appointment_id', appointmentIds),
    ]);

    for (const p of (procs || []) as any[]) {
      const cost = Number(p.estimated_cost ?? p.procedures?.price ?? 0);
      lineItems.push({
        code: p.procedures?.code || 'N/A',
        description: p.procedures?.name || p.procedure_notes || 'Procedure',
        units: 1,
        fee_cents: Math.round(cost * 100),
      });
    }

    for (const d of (dxs || []) as any[]) {
      if (!d.icd10_code && !d.diagnosis_title) continue;
      diagnoses.push({ code: d.icd10_code || '', description: d.diagnosis_title || '' });
    }
  }

  // Fall back to the payment amount itself when no procedures are linked.
  if (!lineItems.length) {
    const total = selected.reduce((s, p) => s + Number(p.amount || 0), 0);
    lineItems.push({
      code: 'PAYMENT',
      description: first.notes || 'Services rendered',
      units: 1,
      fee_cents: Math.round(total * 100),
    });
  }

  const date = first.paid_at || first.created_at;
  return {
    patientId: first.patient_id,
    serviceDate: new Date(date).toISOString().slice(0, 10),
    appointmentId: first.appointment_id,
    diagnoses,
    lineItems,
    notes:
      selected
        .map((p) => p.notes)
        .filter(Boolean)
        .join(' · ') || null,
    currency: (first.currency || 'usd').toLowerCase(),
  };
}
