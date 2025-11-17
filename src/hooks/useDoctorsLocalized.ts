import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useContentTranslation } from './useContentTranslation';

export const useDoctorsLocalized = () => {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { buildLocalizedSelect, getTranslatedField } = useContentTranslation();

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        // Build select with localized fields
        const selectFields = buildLocalizedSelect(
          ['specialty', 'bio'],
          ['id', 'user_id', 'consultation_fee', 'verified', 'accepts_new_patients', 
           'average_rating', 'num_reviews', 'created_at', 'practice_id']
        );

        const { data, error } = await supabase
          .from('doctor_profiles_view')
          .select(selectFields)
          .eq('verified', true)
          .order('average_rating', { ascending: false });

        if (error) throw error;

        setDoctors(data || []);
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [buildLocalizedSelect]);

  return {
    doctors,
    loading,
    getTranslatedField,
  };
};
