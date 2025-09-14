import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Doctor = Tables<'doctors'> & {
  profiles?: any;
  practices?: any;
};

export const useDoctors = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            email
          ),
          practices:practice_id (
            name,
            city,
            country,
            logo_url
          )
        `)
        .eq('verified', true)
        .eq('accepts_new_patients', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDoctors(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch doctors');
    } finally {
      setLoading(false);
    }
  };

  const searchDoctors = async (searchTerm: string, location?: string, specialty?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            email
          ),
          practices:practice_id (
            name,
            city,
            country,
            logo_url
          )
        `)
        .eq('verified', true)
        .eq('accepts_new_patients', true);

      if (specialty) {
        query = query.ilike('specialty', `%${specialty}%`);
      }

      if (searchTerm && !specialty) {
        query = query.or(`specialty.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Filter by location if provided (basic filtering by city/country in practice)
      let filteredData = data || [];
      if (location) {
        filteredData = filteredData.filter(doctor => 
          doctor.practices?.city?.toLowerCase().includes(location.toLowerCase()) ||
          doctor.practices?.country?.toLowerCase().includes(location.toLowerCase())
        );
      }

      setDoctors(filteredData);
      setError(null);
      return filteredData;
    } catch (err) {
      console.error('Error searching doctors:', err);
      setError(err instanceof Error ? err.message : 'Failed to search doctors');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getTopRatedDoctors = async (limit = 6) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            email
          ),
          practices:practice_id (
            name,
            city,
            country,
            logo_url
          )
        `)
        .eq('verified', true)
        .eq('accepts_new_patients', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setDoctors(data || []);
      setError(null);
      return data || [];
    } catch (err) {
      console.error('Error fetching top doctors:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch top doctors');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  return {
    doctors,
    loading,
    error,
    fetchDoctors,
    searchDoctors,
    getTopRatedDoctors,
  };
};