import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MedicalRecord {
  id: string;
  patient_id?: string;
  title: string;
  description?: string;
  record_type: 'note' | 'diagnosis' | 'condition' | 'examination' | 'treatment';
  record_date: string;
  doctor_name?: string;
  doctor_email?: string;
  doctor_phone?: string;
  practice_name?: string;
  status: string;
  created_at: string;
  added_by?: string;
}

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
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', user.id)
        .order('record_date', { ascending: false });

      if (error) throw error;

      setRecords(data || []);
    } catch (err: any) {
      console.error('Error fetching medical records:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addMedicalRecord = async (recordData: { title: string; description?: string; record_type?: 'note' | 'diagnosis' | 'condition' | 'examination' | 'treatment'; record_date?: string; }) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('medical_records')
        .insert({
          title: recordData.title,
          description: recordData.description,
          record_type: recordData.record_type || 'note',
          record_date: recordData.record_date || new Date().toISOString().split('T')[0],
          patient_id: user.id,
          added_by: user.id,
          status: 'active',
        });

      if (error) throw error;

      // Refresh records
      await fetchMedicalRecords();
      return { success: true };
    } catch (err: any) {
      console.error('Error adding medical record:', err);
      return { error: err.message };
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