import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Practice = Tables<'practices'>;

export const usePractices = () => {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPractices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('practices')
        .select('*')
        .eq('verified', true)
        .order('weighted_rating', { ascending: false })
        .order('appointment_count', { ascending: false });

      if (error) throw error;

      setPractices(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching practices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch practices');
    } finally {
      setLoading(false);
    }
  };

  const searchPractices = async (searchTerm: string, location?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('practices')
        .select('*')
        .eq('verified', true);

      if (searchTerm) {
        // Clean the search term by removing problematic characters
        const cleanSearchTerm = searchTerm.replace(/[,()]/g, ' ').trim();
        if (cleanSearchTerm) {
          // Split into words and use the first word to avoid SQL parsing issues
          const words = cleanSearchTerm.split(/\s+/).filter(word => word.length > 0);
          if (words.length > 0) {
            const mainWord = words[0];
            query = query.or(`name.ilike.%${mainWord}%,description.ilike.%${mainWord}%`);
          }
        }
      }

      if (location) {
        const cleanLocation = location.replace(/[,()]/g, ' ').trim();
        if (cleanLocation) {
          const locationWords = cleanLocation.split(/\s+/).filter(word => word.length > 0);
          if (locationWords.length > 0) {
            const mainLocationWord = locationWords[0];
            query = query.or(`city.ilike.%${mainLocationWord}%,country.ilike.%${mainLocationWord}%,address.ilike.%${mainLocationWord}%`);
          }
        }
      }

      const { data, error } = await query
        .order('weighted_rating', { ascending: false })
        .order('appointment_count', { ascending: false });

      if (error) throw error;

      setPractices(data || []);
      setError(null);
      return data || [];
    } catch (err) {
      console.error('Error searching practices:', err);
      setError(err instanceof Error ? err.message : 'Failed to search practices');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getTopRatedPractices = async (limit = 6) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('practices')
        .select('*')
        .eq('verified', true)
        .order('weighted_rating', { ascending: false })
        .order('appointment_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setPractices(data || []);
      setError(null);
      return data || [];
    } catch (err) {
      console.error('Error fetching top practices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch top practices');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPractices();
  }, []);

  return {
    practices,
    loading,
    error,
    fetchPractices,
    searchPractices,
    getTopRatedPractices,
  };
};