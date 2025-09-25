import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  avatar_url?: string;
  address?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  age?: number;
  lastVisit?: string;
  nextAppointment?: string;
  totalVisits: number;
  status: 'active' | 'inactive';
}

interface MedicalRecord {
  id: string;
  patient_id: string;
  title: string;
  description?: string;
  record_type: string;
  record_date: string;
  created_at: string;
  added_by: string;
}

export const useDoctorPatients = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get doctor ID
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctorData) {
        setPatients([]);
        return;
      }

      // Get unique patient IDs from appointments
      const { data: appointmentData } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('doctor_id', doctorData.id);

      if (!appointmentData || appointmentData.length === 0) {
        setPatients([]);
        return;
      }

      const uniquePatientIds = [...new Set(appointmentData.map(apt => apt.patient_id))];

      // Get patient profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', uniquePatientIds);

      if (profileError) throw profileError;

      // Get appointment statistics for each patient
      const patientsWithStats = await Promise.all(
        (profileData || []).map(async (profile) => {
          // Get appointment count and dates
          const { data: aptData } = await supabase
            .from('appointments')
            .select('appointment_date, status')
            .eq('doctor_id', doctorData.id)
            .eq('patient_id', profile.user_id)
            .order('appointment_date', { ascending: false });

          const totalVisits = aptData?.filter(apt => apt.status === 'completed').length || 0;
          const lastVisit = aptData?.[0]?.appointment_date;
          const nextAppointment = aptData?.find(apt => 
            apt.status === 'confirmed' && new Date(apt.appointment_date) > new Date()
          )?.appointment_date;

          const age = profile.date_of_birth 
            ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
            : undefined;

          const status: 'active' | 'inactive' = lastVisit && 
            new Date(lastVisit) > new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) // 6 months
            ? 'active' : 'inactive';

          return {
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            date_of_birth: profile.date_of_birth,
            gender: profile.gender,
            avatar_url: profile.avatar_url,
            address: profile.address,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            age,
            lastVisit,
            nextAppointment,
            totalVisits,
            status
          };
        })
      );

      setPatients(patientsWithStats);
    } catch (err: any) {
      console.error('Error fetching patients:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientMedicalRecords = async (patientId: string): Promise<MedicalRecord[]> => {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('record_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error fetching medical records:', err);
      return [];
    }
  };

  const addMedicalRecord = async (patientId: string, recordData: {
    title: string;
    description?: string;
    record_type: 'note' | 'diagnosis' | 'condition' | 'examination' | 'treatment';
  }) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('medical_records')
        .insert({
          title: recordData.title,
          description: recordData.description,
          record_type: recordData.record_type,
          patient_id: patientId,
          added_by: user.id,
          record_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Medical record added successfully');
      return { success: true, data };
    } catch (err: any) {
      console.error('Error adding medical record:', err);
      toast.error('Failed to add medical record');
      return { error: err.message };
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [user]);

  return {
    patients,
    loading,
    error,
    fetchPatients,
    fetchPatientMedicalRecords,
    addMedicalRecord,
    refreshPatients: fetchPatients
  };
};