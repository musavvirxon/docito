import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTopSpecialties = () => {
  return useQuery({
    queryKey: ['top-specialties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('specialty')
        .not('specialty', 'is', null)
        .limit(100);

      if (error) throw error;

      // Count specialties and get top ones
      const specialtyCounts = (data || []).reduce((acc: Record<string, number>, doc) => {
        if (doc.specialty) {
          acc[doc.specialty] = (acc[doc.specialty] || 0) + 1;
        }
        return acc;
      }, {});

      return Object.entries(specialtyCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    },
  });
};

export interface TopClinic {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  logo_url: string | null;
  practice_type: string | null;
}

export const useTopClinics = () => {
  return useQuery<TopClinic[]>({
    queryKey: ['top-clinics'],
    queryFn: async () => {
      const client = supabase as any;
      const result = await client
        .from('practices')
        .select('id, name, address, city, country, logo_url, practice_type')
        .eq('status', 'active')
        .limit(6);
      
      if (result.error) throw result.error;
      return (result.data || []) as TopClinic[];
    },
  });
};

export interface TopPharmacy {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  logo_url: string | null;
}

export const useTopPharmacies = () => {
  return useQuery<TopPharmacy[]>({
    queryKey: ['top-pharmacies'],
    queryFn: async () => {
      const client = supabase as any;
      const result = await client
        .from('pharmacies')
        .select('id, name, address, city, country, logo_url')
        .eq('status', 'active')
        .limit(6);

      if (result.error) throw result.error;
      return (result.data || []) as TopPharmacy[];
    },
  });
};

export interface TopLabCenter {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  type: string | null;
  services_offered: string[] | null;
}

export const useTopLabCenters = () => {
  return useQuery<TopLabCenter[]>({
    queryKey: ['top-lab-centers'],
    queryFn: async () => {
      const client = supabase as any;
      const result = await client
        .from('lab_centers')
        .select('id, name, address, city, country, type, services_offered')
        .eq('status', 'active')
        .limit(6);

      if (result.error) throw result.error;
      return (result.data || []) as TopLabCenter[];
    },
  });
};

export interface BookedService {
  id: string;
  name: string;
  category: string;
  description: string | null;
  default_cost: number | null;
}

export const useMostBookedServices = () => {
  return useQuery<BookedService[]>({
    queryKey: ['most-booked-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dental_procedures')
        .select('id, name, category, description, default_cost')
        .eq('is_active', true)
        .limit(8);

      if (error) throw error;
      return (data || []) as BookedService[];
    },
  });
};
