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
        setDoctors(result.data);
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
        setDoctors(result.data);
        setError(null);
        return result.data;
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
        const topDoctors = result.data.slice(0, limit);
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