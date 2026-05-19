import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DoctorRestrictionsRow {
  id?: string;
  practice_id: string;
  doctor_id: string;
  working_hours_restriction: {
    enabled: boolean;
    start: string;
    end: string;
    days: string[];
  } | null;
  specialty_restriction: {
    enabled: boolean;
    allowedSpecialties: string[];
    blockedSpecialties: string[];
  } | null;
  procedure_restriction: {
    enabled: boolean;
    mandatoryProcedures: string[];
    blockedProcedures: string[];
  } | null;
  max_daily_appointments: number | null;
  max_weekly_appointments: number | null;
  requires_admin_approval: boolean;
  notes: string | null;
}

export const useDoctorRestrictions = (practiceId?: string, doctorId?: string) => {
  const { toast } = useToast();
  const [restrictions, setRestrictions] = useState<DoctorRestrictionsRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!practiceId || !doctorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('doctor_restrictions')
        .select('*')
        .eq('practice_id', practiceId)
        .eq('doctor_id', doctorId)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      setRestrictions((data as DoctorRestrictionsRow) || null);
    } catch (e: any) {
      console.error('Error loading doctor restrictions:', e);
    } finally {
      setLoading(false);
    }
  }, [practiceId, doctorId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const save = async (payload: Omit<DoctorRestrictionsRow, 'id'>) => {
    if (!practiceId || !doctorId) return { success: false };
    try {
      const { data, error } = await (supabase as any)
        .from('doctor_restrictions')
        .upsert(
          { ...payload, practice_id: practiceId, doctor_id: doctorId },
          { onConflict: 'practice_id,doctor_id' },
        )
        .select()
        .single();
      if (error) throw error;
      setRestrictions(data as DoctorRestrictionsRow);
      toast({ title: 'Rules saved', description: 'Doctor rules updated for this practice.' });
      return { success: true, data };
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save rules', variant: 'destructive' });
      return { success: false };
    }
  };

  return { restrictions, loading, save, refetch: fetch };
};
