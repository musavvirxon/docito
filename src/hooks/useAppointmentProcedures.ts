import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ProcedureStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface UnifiedProcedure {
  id: string;
  source: 'dental' | 'general';
  name: string;
  status: ProcedureStatus;
  cost: number | null;
  notes: string | null;
  toothNumbers: number[];
  procedureId: string | null;
  performedAt: string | null;
  createdAt: string;
}

export interface AddProcedureInput {
  name: string;
  procedureId?: string | null;
  status?: ProcedureStatus;
  cost?: number | null;
  notes?: string | null;
  toothNumbers?: number[];
}

interface Params {
  appointmentId?: string;
  doctorId?: string;
  patientId?: string | null;
  doctorPatientId?: string | null;
}

export function useAppointmentProcedures({
  appointmentId,
  doctorId,
  patientId,
  doctorPatientId,
}: Params) {
  const [items, setItems] = useState<UnifiedProcedure[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    try {
      const [dentalRes, generalRes] = await Promise.all([
        supabase
          .from('tooth_procedure_history')
          .select('id,procedure_id,procedure_name,tooth_numbers,status,cost,notes,performed_at,created_at')
          .eq('appointment_id', appointmentId)
          .order('created_at', { ascending: false }),
        supabase
          .from('appointment_procedures')
          .select('id,procedure_id,procedure_notes,estimated_cost,status,created_at,procedure:procedures(name)')
          .eq('appointment_id', appointmentId)
          .order('created_at', { ascending: false }),
      ]);

      const dental: UnifiedProcedure[] = ((dentalRes.data as any[]) || []).map((r) => ({
        id: r.id,
        source: 'dental',
        name: r.procedure_name || 'Procedure',
        status: (r.status as ProcedureStatus) || 'planned',
        cost: r.cost == null ? null : Number(r.cost),
        notes: r.notes || null,
        toothNumbers: Array.isArray(r.tooth_numbers) ? r.tooth_numbers : [],
        procedureId: r.procedure_id || null,
        performedAt: r.performed_at || null,
        createdAt: r.created_at,
      }));

      const general: UnifiedProcedure[] = ((generalRes.data as any[]) || []).map((r) => ({
        id: r.id,
        source: 'general',
        name: r.procedure?.name || 'Procedure',
        status: (r.status as ProcedureStatus) || 'planned',
        cost: r.estimated_cost == null ? null : Number(r.estimated_cost),
        notes: r.procedure_notes || null,
        toothNumbers: [],
        procedureId: r.procedure_id || null,
        performedAt: null,
        createdAt: r.created_at,
      }));

      setItems(
        [...dental, ...general].sort(
          (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
        ),
      );
    } catch (err) {
      console.error('Error loading appointment procedures:', err);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addProcedure = useCallback(
    async (input: AddProcedureInput) => {
      if (!appointmentId || !doctorId) {
        toast.error('Missing appointment or doctor context');
        return;
      }
      const teeth = input.toothNumbers || [];
      const unitCost = input.cost == null ? null : Number(input.cost);
      const totalCost =
        unitCost == null ? null : Number((unitCost * Math.max(teeth.length, 1)).toFixed(2));

      try {
        let createdRowId: string | null = null;
        if (teeth.length > 0) {
          const targetPatient = patientId || null;
          if (!targetPatient) {
            toast.error('Tooth procedures require a registered patient');
            return;
          }
          const { data: inserted, error } = await supabase
            .from('tooth_procedure_history')
            .insert({
              appointment_id: appointmentId,
              doctor_id: doctorId,
              patient_id: targetPatient,
              // procedure_id intentionally omitted: it FKs to public.dental_procedures,
              // while input.procedureId comes from the doctor's services library.
              // The human-readable name is preserved in procedure_name.
              procedure_name: input.name,
              tooth_numbers: teeth,
              status: 'completed',
              cost: totalCost,
              notes: input.notes || null,
              performed_at: new Date().toISOString(),
            } as any)
            .select('id')
            .single();
          if (error) throw error;
          createdRowId = (inserted as any)?.id || null;
        } else {
          const { data: authUser } = await supabase.auth.getUser();
          const { data: inserted, error } = await supabase
            .from('appointment_procedures')
            .insert({
              appointment_id: appointmentId,
              // procedure_id omitted: FKs to public.procedures and would fail
              // for IDs sourced from the doctor's own services library.
              procedure_notes: input.notes || input.name,
              estimated_cost: totalCost,
              status: 'completed',
              prescribed_by: authUser?.user?.id || doctorId,
              prescribed_at: new Date().toISOString(),
            } as any)
            .select('id')
            .single();
          if (error) throw error;
          createdRowId = (inserted as any)?.id || null;
        }

        // Auto-create billing transaction so finance reflects the charge
        if (totalCost != null && totalCost > 0) {
          const description = `${input.name}${teeth.length ? ` (Teeth ${teeth.slice().sort((a, b) => a - b).join(',')})` : ''}`;
          const { error: billErr } = await supabase.from('billing_transactions').insert({
            appointment_id: appointmentId,
            entity_type: 'doctor',
            entity_id: doctorId,
            transaction_type: 'charge',
            status: 'pending',
            amount: Math.round(totalCost),
            amount_cents: Math.round(totalCost * 100),
            currency: 'usd',
            description,
            metadata: {
              source: 'appointment_procedure',
              source_table: teeth.length > 0 ? 'tooth_procedure_history' : 'appointment_procedures',
              source_id: createdRowId,
              unit_cost: unitCost,
              tooth_count: Math.max(teeth.length, 1),
              teeth,
            },
          } as any);
          if (billErr) {
            console.warn('Billing transaction insert failed', billErr);
          }
        }

        toast.success('Procedure added');
        await refresh();
      } catch (err: any) {
        console.error('Add procedure failed', err);
        toast.error(err?.message || 'Failed to add procedure');
      }
    },
    [appointmentId, doctorId, patientId, refresh],
  );

  const updateStatus = useCallback(
    async (item: UnifiedProcedure, status: ProcedureStatus) => {
      try {
        if (item.source === 'dental') {
          await supabase
            .from('tooth_procedure_history')
            .update({
              status,
              performed_at: status === 'completed' ? new Date().toISOString() : null,
            })
            .eq('id', item.id);
        } else {
          await supabase
            .from('appointment_procedures')
            .update({ status })
            .eq('id', item.id);
        }
        await refresh();
      } catch (err) {
        console.error('Update procedure status failed', err);
        toast.error('Failed to update procedure');
      }
    },
    [refresh],
  );

  const removeProcedure = useCallback(
    async (item: UnifiedProcedure) => {
      try {
        const table = item.source === 'dental' ? 'tooth_procedure_history' : 'appointment_procedures';
        await supabase.from(table).delete().eq('id', item.id);
        // Best-effort cleanup of the matching auto-billed charge
        if (appointmentId) {
          try {
            const { data: rows } = await supabase
              .from('billing_transactions')
              .select('id, metadata')
              .eq('appointment_id', appointmentId)
              .eq('transaction_type', 'charge');
            const match = (rows || []).find(
              (r: any) => r?.metadata?.source_id === item.id,
            );
            if (match) {
              await supabase.from('billing_transactions').delete().eq('id', (match as any).id);
            }
          } catch (e) {
            console.warn('Billing cleanup failed', e);
          }
        }
        await refresh();
        toast.success('Procedure removed');
      } catch (err) {
        console.error('Remove procedure failed', err);
        toast.error('Failed to remove procedure');
      }
    },
    [appointmentId, refresh],
  );

  const totalCost = items.reduce((s, i) => s + (i.cost || 0), 0);

  return {
    items,
    loading,
    totalCost,
    refresh,
    addProcedure,
    updateStatus,
    removeProcedure,
  };
}
