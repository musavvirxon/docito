// Hooks for managing superbills (insurance reimbursement records).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SuperbillStatus = 'draft' | 'issued' | 'submitted' | 'paid' | 'denied';

export interface SuperbillLineItem {
  code: string;            // CPT / HCPCS
  description: string;
  units: number;
  fee_cents: number;
}

export interface SuperbillDiagnosis {
  code: string;            // ICD-10
  description?: string;
}

export interface Superbill {
  id: string;
  superbill_number: string;
  practice_id: string | null;
  doctor_id: string | null;
  patient_id: string;
  appointment_id: string | null;
  invoice_id: string | null;
  service_date: string;
  diagnosis_codes: SuperbillDiagnosis[];
  line_items: SuperbillLineItem[];
  total_amount_cents: number;
  currency: string;
  status: SuperbillStatus;
  pdf_url: string | null;
  notes: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export const generateSuperbillNumber = () => {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SB-${ymd}-${rand}`;
};

interface UseSuperbillsOptions {
  practiceId?: string | null;
  doctorId?: string | null;
  patientId?: string | null;
  autoLoad?: boolean;
}

export function useSuperbills(opts: UseSuperbillsOptions = {}) {
  const { practiceId, doctorId, patientId, autoLoad = true } = opts;
  const [superbills, setSuperbills] = useState<Superbill[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = (supabase as any).from('superbills').select('*').order('created_at', { ascending: false });
      if (practiceId) q = q.eq('practice_id', practiceId);
      if (doctorId) q = q.eq('doctor_id', doctorId);
      if (patientId) q = q.eq('patient_id', patientId);
      const { data, error } = await q;
      if (error) throw error;
      setSuperbills((data as any) || []);
    } catch (e: any) {
      console.error('load superbills error', e);
      setSuperbills([]);
    } finally {
      setLoading(false);
    }
  }, [practiceId, doctorId, patientId]);

  useEffect(() => { if (autoLoad) void load(); }, [load, autoLoad]);

  // Realtime
  useEffect(() => {
    if (!practiceId && !doctorId && !patientId) return;
    const key = practiceId || doctorId || patientId;
    const channel = supabase
      .channel(`superbills-${key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'superbills' }, () => { void load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [practiceId, doctorId, patientId, load]);

  const stats = useMemo(() => {
    const total = superbills.length;
    const issued = superbills.filter(s => s.status === 'issued').length;
    const submitted = superbills.filter(s => s.status === 'submitted').length;
    const paid = superbills.filter(s => s.status === 'paid').length;
    const denied = superbills.filter(s => s.status === 'denied').length;
    const totalCents = superbills.reduce((s, b) => s + (b.total_amount_cents || 0), 0);
    return { total, issued, submitted, paid, denied, totalCents };
  }, [superbills]);

  return { superbills, loading, reload: load, stats };
}

export interface CreateSuperbillInput {
  doctorId: string | null;
  practiceId?: string | null;
  patientId: string;
  appointmentId?: string | null;
  invoiceId?: string | null;
  serviceDate: string;
  diagnosisCodes: SuperbillDiagnosis[];
  lineItems: SuperbillLineItem[];
  notes?: string | null;
  currency?: string;
  status?: SuperbillStatus;
}

export function useCreateSuperbill() {
  const [submitting, setSubmitting] = useState(false);
  const create = async (input: CreateSuperbillInput) => {
    setSubmitting(true);
    try {
      const totalCents = input.lineItems.reduce(
        (s, i) => s + Math.round(Number(i.fee_cents) || 0) * Math.max(Number(i.units) || 1, 1),
        0,
      );
      // Note: store fee_cents per line as already-multiplied total per row to keep PDF simple
      const cleanedItems = input.lineItems.map(i => ({
        code: i.code,
        description: i.description,
        units: Math.max(Number(i.units) || 1, 1),
        fee_cents: Math.round(Number(i.fee_cents) || 0),
      }));
      const payload = {
        superbill_number: generateSuperbillNumber(),
        doctor_id: input.doctorId,
        practice_id: input.practiceId ?? null,
        patient_id: input.patientId,
        appointment_id: input.appointmentId ?? null,
        invoice_id: input.invoiceId ?? null,
        service_date: input.serviceDate,
        diagnosis_codes: input.diagnosisCodes,
        line_items: cleanedItems,
        total_amount_cents: totalCents,
        currency: (input.currency || 'usd').toLowerCase(),
        status: input.status || 'issued',
        notes: input.notes ?? null,
        created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      };
      const { data, error } = await (supabase as any).from('superbills').insert(payload).select().single();
      if (error) throw error;
      toast.success('Superbill generated');
      return { success: true, data } as const;
    } catch (e: any) {
      console.error('create superbill error', e);
      toast.error(e.message || 'Failed to create superbill');
      return { success: false, error: e.message } as const;
    } finally {
      setSubmitting(false);
    }
  };
  return { create, submitting };
}

export async function updateSuperbillStatus(id: string, status: SuperbillStatus) {
  const { error } = await (supabase as any).from('superbills').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteSuperbill(id: string) {
  const { error } = await (supabase as any).from('superbills').delete().eq('id', id);
  if (error) throw error;
}
