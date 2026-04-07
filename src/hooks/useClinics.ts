import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Clinic {
  id: string;
  practice_id?: string;
  name: string;
  practice_name?: string;
  description: string;
  city: string;
  address: string;
  state?: string;
  country: string;
  zip_code?: string;
  phone: string;
  email: string;
  logo_url: string | null;
  website?: string;
  verified: boolean;
  average_rating: number;
  num_reviews: number;
  appointment_count: number;
  created_at: string;
  operating_hours?: any;
  is_primary?: boolean;
  photo_urls?: string[] | null;
  practice_type?: string;
}

export function useClinics(searchQuery?: string, specialty?: string) {
  return useQuery({
    queryKey: ['clinics', searchQuery, specialty],
    queryFn: async () => {
      let query = (supabase as any)
        .from('practice_locations')
        .select(`
          id,
          name,
          address,
          city,
          state,
          country,
          zip_code,
          phone,
          email,
          operating_hours,
          is_primary,
          photo_urls,
          practice_id,
          created_at,
          practices!inner (
            id,
            name,
            description,
            verified,
            average_rating,
            weighted_rating,
            num_reviews,
            appointment_count,
            logo_url,
            website,
            practice_type,
            email,
            phone
          )
        `)
        .eq('practices.verified', true);

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(
          `name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%,country.ilike.%${q}%,practices.name.ilike.%${q}%`
        );
      }

      const { data, error } = await query.order('is_primary', { ascending: false });

      if (error) throw error;

      // Flatten location + practice into a single Clinic shape
      const normalized: Clinic[] = (data || []).map((row: any) => {
        const practice = row.practices || {};
        return {
          id: row.id,
          practice_id: practice.id,
          name: row.name || practice.name,
          practice_name: practice.name,
          description: practice.description || '',
          address: row.address || '',
          city: row.city || '',
          state: row.state || '',
          country: row.country || '',
          zip_code: row.zip_code || '',
          phone: row.phone || practice.phone || '',
          email: row.email || practice.email || '',
          logo_url: practice.logo_url,
          website: practice.website,
          verified: practice.verified,
          average_rating: practice.weighted_rating || practice.average_rating || 0,
          num_reviews: practice.num_reviews || 0,
          appointment_count: practice.appointment_count || 0,
          created_at: row.created_at,
          operating_hours: row.operating_hours,
          is_primary: row.is_primary,
          photo_urls: row.photo_urls,
          practice_type: practice.practice_type,
        };
      });

      // Sort by rating desc
      normalized.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));

      return normalized;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useClinicJoinRequests(doctorId: string) {
  return useQuery({
    queryKey: ['clinic-join-requests', doctorId],
    queryFn: async () => {
      if (!doctorId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from('practice_join_requests')
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
      const { data, error } = await (supabase as any)
        .from('practice_join_requests')
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
      const { error } = await (supabase as any)
        .from('practice_join_requests')
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
