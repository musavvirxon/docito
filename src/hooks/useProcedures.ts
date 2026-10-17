import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { procedureApi, type Procedure } from '@/lib/api/supabase-api';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { ownActiveProcedures } from '@/lib/ownProcedures';

type ProcedureInsert = Database['public']['Tables']['procedures']['Insert'];

export const useProcedures = () => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const fetchProcedures = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (!user?.id) {
      setProcedures([]);
      setDoctorId(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors').select('id').eq('user_id', user.id).maybeSingle();
      if (sequence !== requestSequence.current) return;
      if (doctorError) throw doctorError;
      setDoctorId(doctor?.id ?? null);
      if (!doctor?.id) {
        setProcedures([]);
        setError(null);
        return;
      }
      const result = await procedureApi.fetchProcedures(doctor.id);
      if (sequence !== requestSequence.current) return;
      
      if ('success' in result && result.success) {
        setProcedures(ownActiveProcedures(result.data as Procedure[], doctor.id));
        setError(null);
      } else if ('error' in result) {
        setError(result.error);
        setProcedures([]);
      }
    } catch (err: any) {
      if (sequence !== requestSequence.current) return;
      console.error('Error fetching procedures:', err);
      setError('Failed to fetch procedures');
      setProcedures([]);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [user?.id]);

  const createProcedure = async (procedureData: ProcedureInsert) => {
    try {
      const result = await procedureApi.createProcedure(procedureData);
      
      if ('success' in result && result.success) {
        // Refresh procedures
        await fetchProcedures();
        return { data: result.data, success: true };
      } else if ('error' in result) {
        return { error: result.error };
      }
      return { error: 'Unknown error' };
    } catch (err: any) {
      console.error('Error creating procedure:', err);
      return { error: 'Failed to create procedure' };
    }
  };

  useEffect(() => {
    setProcedures([]);
    setDoctorId(null);
    void fetchProcedures();
    return () => { requestSequence.current += 1; };
  }, [fetchProcedures]);

  useEffect(() => {
    const refresh = () => { void fetchProcedures(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('doctor-procedures-changed', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('doctor-procedures-changed', refresh);
    };
  }, [fetchProcedures]);

  useEffect(() => {
    if (!doctorId) return;
    const channel = supabase
      .channel(`own-procedures-${doctorId}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'procedures', filter: `dentist_id=eq.${doctorId}`,
      }, () => { void fetchProcedures(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [doctorId, fetchProcedures]);

  return {
    procedures,
    loading,
    error,
    refetch: fetchProcedures,
    createProcedure,
  };
};
