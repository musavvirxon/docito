import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { medicalRecordsApi } from '@/lib/api/supabase-api';
import { Tables } from '@/integrations/supabase/types';

type MedicalRecord = Tables<'medical_records'>;

export const useMedicalRecords = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchMedicalRecords = async () => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await medicalRecordsApi.fetchMedicalRecords(user.id);
      
      if ('success' in result && result.success) {
        setRecords(result.data as MedicalRecord[]);
        setError(null);
      } else if ('error' in result) {
        setError(result.error);
        setRecords([]);
      }
    } catch (err: any) {
      console.error('Error fetching medical records:', err);
      setError('Failed to fetch medical records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const addMedicalRecord = async (recordData: { 
    title: string; 
    description?: string; 
    record_type?: MedicalRecord['record_type']; 
    record_date?: string; 
  }) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const result = await medicalRecordsApi.createMedicalRecord({
        title: recordData.title,
        description: recordData.description,
        record_type: recordData.record_type || 'note',
        record_date: recordData.record_date || new Date().toISOString().split('T')[0],
        patient_id: user.id,
        added_by: user.id,
        status: 'active',
      } as any);

      if ('success' in result && result.success) {
        // Refresh records
        await fetchMedicalRecords();
        return { data: result.data, success: true };
      } else if ('error' in result) {
        return { error: result.error };
      }
      return { error: 'Unknown error' };
    } catch (err: any) {
      console.error('Error adding medical record:', err);
      return { error: 'Failed to add medical record' };
    }
  };

  useEffect(() => {
    fetchMedicalRecords();
  }, [user]);

  return {
    records,
    loading,
    error,
    refetch: fetchMedicalRecords,
    addMedicalRecord,
  };
};
