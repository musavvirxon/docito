import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DoctorPatient {
  id: string;
  doctor_id: string;
  full_name: string;
  date_of_birth: string;
  gender?: string | null;
  profile_photo_url?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  allergies?: string | null;
  medical_history?: string | null;
  dental_history?: string | null;
  current_medications?: string | null;
  status: string;
  registration_date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  age?: number;
}

export const useDoctorPatientsV2 = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const fetchPatients = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get doctor ID
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (doctorError) {
        // Not a doctor
        setPatients([]);
        return;
      }

      // Fetch doctor's patients
      const { data: patientsData, error: patientsError } = await supabase
        .from('doctor_patients')
        .select('*')
        .eq('doctor_id', doctorData.id)
        .order('full_name', { ascending: true });

      if (patientsError) throw patientsError;

      // Add computed age
      const patientsWithAge = (patientsData || []).map((p) => ({
        ...p,
        age: p.date_of_birth ? calculateAge(p.date_of_birth) : undefined,
      }));

      setPatients(patientsWithAge);
    } catch (err: any) {
      console.error('Error fetching patients:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getPatientById = useCallback(async (patientId: string): Promise<DoctorPatient | null> => {
    try {
      const { data, error } = await supabase
        .from('doctor_patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      
      return data ? {
        ...data,
        age: data.date_of_birth ? calculateAge(data.date_of_birth) : undefined,
      } : null;
    } catch (err: any) {
      console.error('Error fetching patient:', err);
      return null;
    }
  }, []);

  const updatePatient = useCallback(async (
    patientId: string, 
    updates: Partial<DoctorPatient>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('doctor_patients')
        .update(updates)
        .eq('id', patientId);

      if (error) throw error;

      toast.success('Patient updated successfully');
      await fetchPatients();
      return { success: true };
    } catch (err: any) {
      toast.error('Failed to update patient');
      return { success: false, error: err.message };
    }
  }, [fetchPatients]);

  const deletePatient = useCallback(async (patientId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('doctor_patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      toast.success('Patient deleted successfully');
      await fetchPatients();
      return { success: true };
    } catch (err: any) {
      toast.error('Failed to delete patient');
      return { success: false, error: err.message };
    }
  }, [fetchPatients]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return {
    patients,
    loading,
    error,
    fetchPatients,
    getPatientById,
    updatePatient,
    deletePatient,
    refreshPatients: fetchPatients,
  };
};
