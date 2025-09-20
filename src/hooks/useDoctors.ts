import { useState, useEffect } from 'react';
import { doctorApi, type Doctor } from '@/lib/api/supabase-api';

export const useDoctors = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const result = await doctorApi.fetchDoctors();
      
      if ('success' in result && result.success) {
        // Sort by weighted rating DESC, then appointment count DESC
        const sortedDoctors = result.data.sort((a, b) => {
          if (b.weighted_rating !== a.weighted_rating) {
            return (b.weighted_rating || 0) - (a.weighted_rating || 0);
          }
          return (b.appointment_count || 0) - (a.appointment_count || 0);
        });
        setDoctors(sortedDoctors);
        setError(null);
      } else if ('error' in result) {
        setError(result.error);
        setDoctors([]);
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('Failed to fetch doctors');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const searchDoctors = async (searchTerm: string, location?: string, specialty?: string) => {
    try {
      setLoading(true);
      const result = await doctorApi.searchDoctors(searchTerm, location, specialty);
      
      if ('success' in result && result.success) {
        // Sort by weighted rating DESC, then appointment count DESC
        const sortedDoctors = result.data.sort((a, b) => {
          if (b.weighted_rating !== a.weighted_rating) {
            return (b.weighted_rating || 0) - (a.weighted_rating || 0);
          }
          return (b.appointment_count || 0) - (a.appointment_count || 0);
        });
        setDoctors(sortedDoctors);
        setError(null);
        return sortedDoctors;
      } else if ('error' in result) {
        setError(result.error);
        setDoctors([]);
        return [];
      }
      return [];
    } catch (err) {
      console.error('Error searching doctors:', err);
      setError('Failed to search doctors');
      setDoctors([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getTopRatedDoctors = async (limit = 6) => {
    try {
      setLoading(true);
      const result = await doctorApi.fetchDoctors();
      
      if ('success' in result && result.success) {
        // Sort by weighted rating DESC, then appointment count DESC, then take top N
        const sortedDoctors = result.data.sort((a, b) => {
          if (b.weighted_rating !== a.weighted_rating) {
            return (b.weighted_rating || 0) - (a.weighted_rating || 0);
          }
          return (b.appointment_count || 0) - (a.appointment_count || 0);
        });
        const topDoctors = sortedDoctors.slice(0, limit);
        setDoctors(topDoctors);
        setError(null);
        return topDoctors;
      } else if ('error' in result) {
        setError(result.error);
        setDoctors([]);
        return [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching top doctors:', err);
      setError('Failed to fetch top doctors');
      setDoctors([]);
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