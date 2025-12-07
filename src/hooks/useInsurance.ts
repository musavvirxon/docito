import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types
export interface InsuranceProvider {
  id: string;
  provider_name: string;
  country: string;
  logo_url: string | null;
  is_global: boolean;
  created_at: string;
}

export interface InsurancePlan {
  id: string;
  provider_id: string;
  plan_name: string;
  description: string | null;
  coverage_type: string;
  created_at: string;
  provider?: InsuranceProvider;
}

export interface ClinicInsurance {
  id: string;
  clinic_id: string;
  provider_id: string;
  plan_id: string | null;
  is_accepted: boolean;
  provider?: InsuranceProvider;
  plan?: InsurancePlan;
}

export interface DoctorInsurance {
  id: string;
  doctor_id: string;
  clinic_id: string | null;
  provider_id: string;
  plan_id: string | null;
  is_accepted: boolean;
  is_inherited: boolean;
  provider?: InsuranceProvider;
  plan?: InsurancePlan;
}

export interface PatientInsurance {
  id: string;
  patient_id: string;
  provider_id: string;
  plan_id: string | null;
  member_id: string | null;
  valid_until: string | null;
  file_url: string | null;
  is_primary: boolean;
  status: string;
  created_at: string;
  group_number?: string | null;
  card_front_url?: string | null;
  card_back_url?: string | null;
  co_pay?: number | null;
  deductible?: number | null;
  annual_limit?: number | null;
  provider_phone?: string | null;
  notes?: string | null;
  covers_emergency?: boolean;
  provider?: InsuranceProvider;
  plan?: InsurancePlan;
}

// Fetch all insurance providers
export const useInsuranceProviders = (country?: string) => {
  return useQuery({
    queryKey: ['insurance-providers', country],
    queryFn: async () => {
      let query = supabase
        .from('insurance_providers')
        .select('*')
        .order('provider_name');
      
      if (country) {
        query = query.eq('country', country);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as InsuranceProvider[];
    },
  });
};

// Fetch insurance plans for a provider
export const useInsurancePlans = (providerId?: string) => {
  return useQuery({
    queryKey: ['insurance-plans', providerId],
    queryFn: async () => {
      let query = supabase
        .from('insurance_plans')
        .select('*, provider:insurance_providers(*)')
        .order('plan_name');
      
      if (providerId) {
        query = query.eq('provider_id', providerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as InsurancePlan[];
    },
    enabled: !!providerId || providerId === undefined,
  });
};

// Fetch clinic insurance
export const useClinicInsurance = (clinicId: string) => {
  return useQuery({
    queryKey: ['clinic-insurance', clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_insurance')
        .select('*, provider:insurance_providers(*), plan:insurance_plans(*)')
        .eq('clinic_id', clinicId);
      
      if (error) throw error;
      return data as ClinicInsurance[];
    },
    enabled: !!clinicId,
  });
};

// Fetch doctor insurance
export const useDoctorInsurance = (doctorId: string) => {
  return useQuery({
    queryKey: ['doctor-insurance', doctorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctor_insurance')
        .select('*, provider:insurance_providers(*), plan:insurance_plans(*)')
        .eq('doctor_id', doctorId);
      
      if (error) throw error;
      return data as DoctorInsurance[];
    },
    enabled: !!doctorId,
  });
};

// Fetch patient insurance
export const usePatientInsurance = (patientId: string) => {
  return useQuery({
    queryKey: ['patient-insurance', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_insurance')
        .select('*, provider:insurance_providers(*), plan:insurance_plans(*)')
        .eq('patient_id', patientId)
        .order('is_primary', { ascending: false });
      
      if (error) throw error;
      return data as PatientInsurance[];
    },
    enabled: !!patientId,
  });
};

// Mutations for Super Admin
export const useCreateInsuranceProvider = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (provider: Omit<InsuranceProvider, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('insurance_providers')
        .insert(provider)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-providers'] });
      toast({ title: 'Provider created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create provider', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateInsuranceProvider = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...provider }: Partial<InsuranceProvider> & { id: string }) => {
      const { data, error } = await supabase
        .from('insurance_providers')
        .update(provider)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-providers'] });
      toast({ title: 'Provider updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update provider', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteInsuranceProvider = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('insurance_providers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-providers'] });
      toast({ title: 'Provider deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete provider', description: error.message, variant: 'destructive' });
    },
  });
};

export const useCreateInsurancePlan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (plan: Omit<InsurancePlan, 'id' | 'created_at' | 'provider'>) => {
      const { data, error } = await supabase
        .from('insurance_plans')
        .insert(plan)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-plans'] });
      toast({ title: 'Plan created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create plan', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateInsurancePlan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...plan }: Partial<InsurancePlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('insurance_plans')
        .update(plan)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-plans'] });
      toast({ title: 'Plan updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update plan', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteInsurancePlan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('insurance_plans')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-plans'] });
      toast({ title: 'Plan deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete plan', description: error.message, variant: 'destructive' });
    },
  });
};

// Clinic insurance mutations
export const useUpdateClinicInsurance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      clinicId, 
      providerId, 
      planId, 
      isAccepted 
    }: { 
      clinicId: string; 
      providerId: string; 
      planId?: string; 
      isAccepted: boolean 
    }) => {
      if (isAccepted) {
        const { data, error } = await supabase
          .from('clinic_insurance')
          .upsert({
            clinic_id: clinicId,
            provider_id: providerId,
            plan_id: planId || null,
            is_accepted: true,
          }, {
            onConflict: 'clinic_id,provider_id,plan_id'
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        let query = supabase
          .from('clinic_insurance')
          .delete()
          .eq('clinic_id', clinicId)
          .eq('provider_id', providerId);
        
        if (planId) {
          query = query.eq('plan_id', planId);
        }
        
        const { error } = await query;
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clinic-insurance', variables.clinicId] });
      toast({ title: 'Insurance updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update insurance', description: error.message, variant: 'destructive' });
    },
  });
};

// Patient insurance mutations
export const useAddPatientInsurance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (insurance: Omit<PatientInsurance, 'id' | 'provider' | 'plan'>) => {
      const { data, error } = await supabase
        .from('patient_insurance')
        .insert(insurance)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-insurance', variables.patient_id] });
      toast({ title: 'Insurance added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add insurance', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdatePatientInsurance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...insurance }: Partial<PatientInsurance> & { id: string }) => {
      const { data, error } = await supabase
        .from('patient_insurance')
        .update(insurance)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-insurance'] });
      toast({ title: 'Insurance updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update insurance', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeletePatientInsurance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('patient_insurance')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-insurance'] });
      toast({ title: 'Insurance removed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove insurance', description: error.message, variant: 'destructive' });
    },
  });
};

// Get doctors by insurance
export const useDoctorsByInsurance = (providerId?: string, planId?: string) => {
  return useQuery({
    queryKey: ['doctors-by-insurance', providerId, planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_doctors_by_insurance', {
          p_provider_id: providerId,
          p_plan_id: planId || null,
        });
      
      if (error) throw error;
      return data as { doctor_id: string }[];
    },
    enabled: !!providerId,
  });
};

// Get unique countries from providers
export const useInsuranceCountries = () => {
  return useQuery({
    queryKey: ['insurance-countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_providers')
        .select('country')
        .order('country');
      
      if (error) throw error;
      
      // Get unique countries
      const countries = [...new Set(data.map(p => p.country))];
      return countries;
    },
  });
};
