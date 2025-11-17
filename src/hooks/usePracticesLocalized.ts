import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useContentTranslation } from './useContentTranslation';

export const usePracticesLocalized = () => {
  const [practices, setPractices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { buildLocalizedSelect, getTranslatedField } = useContentTranslation();

  useEffect(() => {
    const fetchPractices = async () => {
      setLoading(true);
      try {
        // Build select with localized fields
        const selectFields = buildLocalizedSelect(
          ['name', 'description'],
          ['id', 'admin_id', 'verification_status', 'created_at', 'logo_url',
           'website', 'email', 'phone']
        );

        const { data, error } = await supabase
          .from('practices')
          .select(selectFields)
          .eq('verification_status', 'verified')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setPractices(data || []);
      } catch (error) {
        console.error('Error fetching practices:', error);
        setPractices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPractices();
  }, [buildLocalizedSelect]);

  return {
    practices,
    loading,
    getTranslatedField,
  };
};
