import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WorkingHoursRestriction {
  enabled: boolean;
  start: string;
  end: string;
  days: string[];
}

export interface SpecialtyRestriction {
  enabled: boolean;
  allowedSpecialties: string[];
  blockedSpecialties: string[];
}

export interface ProcedureRestriction {
  enabled: boolean;
  mandatoryProcedures: string[];
  blockedProcedures: string[];
}

export interface PracticeRestrictions {
  id?: string;
  practice_id: string;
  working_hours_restriction: WorkingHoursRestriction | null;
  specialty_restriction: SpecialtyRestriction | null;
  procedure_restriction: ProcedureRestriction | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export const usePracticeRestrictions = (practiceId?: string) => {
  const { toast } = useToast();
  const [restrictions, setRestrictions] = useState<PracticeRestrictions | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRestrictions = async () => {
    if (!practiceId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('practice_restrictions' as any)
        .select('*')
        .eq('practice_id', practiceId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setRestrictions(data as any as PracticeRestrictions || null);
    } catch (error: any) {
      console.error('Error fetching restrictions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load practice restrictions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveRestrictions = async (restrictionData: Omit<PracticeRestrictions, 'id' | 'created_at' | 'updated_at'>) => {
    if (!practiceId) return { success: false, error: 'No practice ID provided' };

    try {
      const { data, error } = await supabase
        .from('practice_restrictions' as any)
        .upsert({
          ...restrictionData,
          practice_id: practiceId,
        })
        .select()
        .single();

      if (error) throw error;

      setRestrictions(data as any as PracticeRestrictions);
      
      toast({
        title: 'Restrictions Updated',
        description: 'Restrictions have been updated. Changes will apply to all associated doctors immediately.',
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('Error saving restrictions:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save restrictions',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    fetchRestrictions();
  }, [practiceId]);

  return {
    restrictions,
    loading,
    saveRestrictions,
    refetch: fetchRestrictions,
  };
};