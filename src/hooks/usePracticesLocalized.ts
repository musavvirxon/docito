import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useContentTranslation } from './useContentTranslation';

export const usePracticesLocalized = () => {
  const [practices, setPractices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { getTranslatedField } = useContentTranslation();

  useEffect(() => {
    const fetchPractices = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('practice_locations')
          .select(`
            id, name, address, city, state, country, phone, email,
            operating_hours, is_primary, photo_urls, practice_id, created_at,
            practices!inner (
              id, name, description, verified, verification_status,
              logo_url, website, email, phone, average_rating, weighted_rating,
              num_reviews, appointment_count, practice_type
            )
          `)
          .eq('practices.verification_status', 'verified')
          .order('is_primary', { ascending: false });

        if (error) throw error;

        const normalized = (data || []).map((row: any) => {
          const p = row.practices || {};
          return {
            id: row.id,
            practice_id: p.id,
            name: row.name || p.name,
            description: p.description,
            address: row.address,
            city: row.city,
            country: row.country,
            phone: row.phone || p.phone,
            email: row.email || p.email,
            logo_url: p.logo_url,
            website: p.website,
            admin_id: p.admin_id,
            verification_status: p.verification_status,
            created_at: row.created_at,
          };
        });

        setPractices(normalized);
      } catch (error) {
        console.error('Error fetching practices:', error);
        setPractices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPractices();
  }, []);

  return {
    practices,
    loading,
    getTranslatedField,
  };
};
