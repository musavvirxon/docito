import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LibraryDiagnosis {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
}

/**
 * Doctor diagnosis library, readable outside of the doctor dashboard provider.
 * Backed by the same doctor-scoped `procedure_templates` table used by the
 * Diagnoses section of the doctor dashboard.
 */
export function useDiagnosisLibrary() {
  const { user } = useAuth();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [diagnoses, setDiagnoses] = useState<LibraryDiagnosis[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFor = useCallback(async (dId: string) => {
    const { data, error } = await (supabase as any)
      .from('procedure_templates')
      .select('id, name, description, category, is_active')
      .eq('doctor_id', dId)
      .order('name', { ascending: true });
    if (error) {
      console.error('Error loading diagnosis library:', error);
      return;
    }
    setDiagnoses(
      (data || [])
        .filter((r: any) => r.is_active !== false)
        .map((r: any) => ({
          id: r.id,
          title: r.name,
          description: r.description ?? null,
          tags: r.category ? [r.category] : [],
        })),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (!data?.id) {
          setDoctorId(null);
          setDiagnoses([]);
          return;
        }
        setDoctorId(data.id);
        await fetchFor(data.id);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user, fetchFor]);

  // Realtime: keep the library in sync with the dashboard Diagnoses section.
  useEffect(() => {
    if (!doctorId) return;
    const channel = supabase
      .channel(`diagnosis-library-${doctorId}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'procedure_templates', filter: `doctor_id=eq.${doctorId}` },
        () => {
          fetchFor(doctorId);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, fetchFor]);

  const addDiagnosis = useCallback(
    async (input: { title: string; description?: string | null }) => {
      if (!doctorId) return { error: 'No doctor profile' };
      const { error } = await (supabase as any).from('procedure_templates').insert({
        doctor_id: doctorId,
        name: input.title.trim(),
        description: input.description ?? null,
        is_active: true,
      });
      if (error) return { error: error.message };
      await fetchFor(doctorId);
      return { success: true };
    },
    [doctorId, fetchFor],
  );

  const refresh = useCallback(async () => {
    if (doctorId) await fetchFor(doctorId);
  }, [doctorId, fetchFor]);

  return { diagnoses, loading, doctorId, addDiagnosis, refresh };
}

export default useDiagnosisLibrary;
