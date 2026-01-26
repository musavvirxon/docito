import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { procedureApi, type Procedure } from '@/lib/api/supabase-api';
import { Database } from '@/integrations/supabase/types';

type ProcedureInsert = Database['public']['Tables']['procedures']['Insert'];

export const useProcedures = () => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchProcedures = async () => {
    if (!user || profile?.role !== 'doctor') {
      setProcedures([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch doctor record first to get doctor_id
      const result = await procedureApi.fetchProcedures();
      
      if ('success' in result && result.success) {
        setProcedures(result.data as Procedure[]);
        setError(null);
      } else if ('error' in result) {
        setError(result.error);
        setProcedures([]);
      }
    } catch (err: any) {
      console.error('Error fetching procedures:', err);
      setError('Failed to fetch procedures');
      setProcedures([]);
    } finally {
      setLoading(false);
    }
  };

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
    fetchProcedures();
  }, [user, profile]);

  return {
    procedures,
    loading,
    error,
    refetch: fetchProcedures,
    createProcedure,
  };
};
