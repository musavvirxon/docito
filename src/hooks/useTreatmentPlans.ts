import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { treatmentPlanApi, type TreatmentPlan } from '@/lib/api/supabase-api';

export const useTreatmentPlans = () => {
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const fetchTreatmentPlans = async () => {
    if (!user || !profile) {
      setTreatmentPlans([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await treatmentPlanApi.fetchTreatmentPlans(user.id, profile.role as 'patient' | 'doctor');
      
      if ('success' in result && result.success) {
        setTreatmentPlans(result.data as any[]);
        setError(null);
      } else if ('error' in result) {
        setError(result.error);
        setTreatmentPlans([]);
      }
    } catch (err: any) {
      console.error('Error fetching treatment plans:', err);
      setError('Failed to fetch treatment plans');
      setTreatmentPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const createTreatmentPlan = async (planData: {
    doctor_id: string;
    patient_id: string;
    title: string;
    description?: string;
    procedures?: Array<{
      procedure_id: string;
      cost?: number;
      notes?: string;
    }>;
  }) => {
    try {
      const result = await treatmentPlanApi.createTreatmentPlan(planData);
      
      if ('success' in result && result.success) {
        // Refresh treatment plans
        await fetchTreatmentPlans();
        return { data: result.data, success: true };
      } else if ('error' in result) {
        return { error: result.error };
      }
      return { error: 'Unknown error' };
    } catch (err: any) {
      console.error('Error creating treatment plan:', err);
      return { error: 'Failed to create treatment plan' };
    }
  };

  useEffect(() => {
    fetchTreatmentPlans();
  }, [user, profile]);

  return {
    treatmentPlans,
    loading,
    error,
    refetch: fetchTreatmentPlans,
    createTreatmentPlan,
  };
};