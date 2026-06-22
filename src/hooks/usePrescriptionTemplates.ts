// Reusable prescription template management.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PrescriptionTemplateMedication {
  medication_name: string;
  medication_code?: string | null;
  dosage: string;
  frequency: string;
  quantity: number;
  unit: string;
  instructions?: string | null;
  substitutions_allowed?: boolean;
}

export interface PrescriptionTemplate {
  id: string;
  doctor_id: string;
  practice_id: string | null;
  name: string;
  description: string | null;
  notes: string | null;
  refills: number;
  medications: PrescriptionTemplateMedication[];
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export function usePrescriptionTemplates(doctorId: string | undefined) {
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!doctorId) {
      setTemplates([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('prescription_templates')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setTemplates(
        (data || []).map((r: any) => ({
          ...r,
          medications: Array.isArray(r.medications) ? r.medications : [],
        })),
      );
    } catch (e: any) {
      console.error('usePrescriptionTemplates fetch error', e);
      toast.error(e?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const saveTemplate = useCallback(
    async (input: {
      name: string;
      description?: string;
      notes?: string;
      refills: number;
      medications: PrescriptionTemplateMedication[];
      is_shared: boolean;
      practice_id?: string | null;
    }) => {
      if (!doctorId) {
        toast.error('Doctor profile not loaded');
        return null;
      }
      const { data, error } = await (supabase as any)
        .from('prescription_templates')
        .insert({
          doctor_id: doctorId,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          notes: input.notes?.trim() || null,
          refills: input.refills ?? 0,
          medications: input.medications,
          is_shared: !!input.is_shared,
          practice_id: input.practice_id ?? null,
        })
        .select()
        .single();
      if (error) {
        toast.error(error.message || 'Failed to save template');
        return null;
      }
      toast.success('Template saved');
      await fetchTemplates();
      return data as PrescriptionTemplate;
    },
    [doctorId, fetchTemplates],
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any)
        .from('prescription_templates')
        .delete()
        .eq('id', id);
      if (error) {
        toast.error(error.message || 'Failed to delete template');
        return false;
      }
      toast.success('Template deleted');
      await fetchTemplates();
      return true;
    },
    [fetchTemplates],
  );

  return { templates, loading, refetch: fetchTemplates, saveTemplate, deleteTemplate };
}
