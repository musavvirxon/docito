import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Clinic {
  id: string;
  name: string;
  description: string;
  city: string;
  address: string;
  country: string;
  phone: string;
  email: string;
  logo_url: string | null;
  website?: string;
  verified: boolean;
  average_rating: number;
  num_reviews: number;
  appointment_count: number;
  created_at: string;
}

export function useClinics(searchQuery?: string, specialty?: string) {
  return useQuery({
    queryKey: ['clinics', searchQuery, specialty],
    queryFn: async () => {
      let query = supabase
        .from('practices')
        .select('*')
        .eq('verified', true)
        .order('average_rating', { ascending: false });

      if (searchQuery && searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,country.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Clinic[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useClinicJoinRequests(doctorId: string) {
  return useQuery({
    queryKey: ['clinic-join-requests', doctorId],
    queryFn: async () => {
      if (!doctorId) return [];
      
      // First check if table exists by trying to read it
      try {
        const { data, error } = await supabase
          .from('practice_join_requests' as any)
          .select('*, practices:practice_id(id, name, logo_url, city)')
          .eq('doctor_id', doctorId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching join requests:', error);
          return [];
        }
        return data || [];
      } catch (err) {
        console.error('Table may not exist yet:', err);
        return [];
      }
    },
    enabled: !!doctorId,
  });
}

export function useRequestToJoinClinic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ doctorId, practiceId }: { doctorId: string; practiceId: string }) => {
      const { data, error } = await supabase
        .from('practice_join_requests' as any)
        .insert({
          doctor_id: doctorId,
          practice_id: practiceId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-join-requests'] });
      toast.success('Join request submitted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit join request');
    },
  });
}

export function useCancelJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('practice_join_requests' as any)
        .delete()
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-join-requests'] });
      toast.success('Join request cancelled');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel join request');
    },
  });
}
