import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SearchFilters {
  doctors: boolean;
  clinics: boolean;
  pharmacies: boolean;
  labs: boolean;
  imaging: boolean;
}

export interface DoctorResult {
  id: string;
  type: 'doctor';
  name: string;
  specialty: string;
  specialties?: string[];
  degrees?: string[];
  rating: number | null;
  reviewCount: number;
  image: string | null;
  clinicAffiliation: string | null;
  location: string | null;
  consultationFee: number | null;
  acceptsNewPatients: boolean;
  languages: string[] | null;
}

export interface ClinicResult {
  id: string;
  type: 'clinic';
  name: string;
  image: string | null;
  location: string | null;
  rating: number | null;
  reviewCount: number;
  specialties: string[] | null;
  doctorCount?: number;
  services?: string[];
}

export interface PharmacyResult {
  id: string;
  type: 'pharmacy';
  name: string;
  image: string | null;
  location: string | null;
  deliveryAvailable: boolean;
  acceptsInsurance: boolean;
  isOpen?: boolean;
  rating: number | null;
  reviewCount: number;
}

export interface LabResult {
  id: string;
  type: 'lab';
  name: string;
  image?: string | null;
  location: string | null;
  rating?: number | null;
  servicesOffered: string[] | null;
  turnaroundHours?: number | null;
  acceptsInsurance: boolean;
}

export interface ImagingResult {
  id: string;
  type: 'imaging';
  name: string;
  image?: string | null;
  location: string | null;
  rating?: number | null;
  procedures: string[];
  accreditations: string[] | null;
  acceptsInsurance: boolean;
}

export type SearchResult = DoctorResult | ClinicResult | PharmacyResult | LabResult | ImagingResult;

export interface UnifiedSearchResults {
  doctors: DoctorResult[];
  clinics: ClinicResult[];
  pharmacies: PharmacyResult[];
  labs: LabResult[];
  imaging: ImagingResult[];
}

const DEFAULT_FILTERS: SearchFilters = {
  doctors: true,
  clinics: true,
  pharmacies: true,
  labs: true,
  imaging: true,
};

export function useUnifiedSearch() {
  const [results, setResults] = useState<UnifiedSearchResults>({
    doctors: [],
    clinics: [],
    pharmacies: [],
    labs: [],
    imaging: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [hasSearched, setHasSearched] = useState(false);

  const searchDoctors = async (query: string, location?: string): Promise<DoctorResult[]> => {
    try {
      let dbQuery = supabase
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          ),
          practices:practice_id (
            name,
            city,
            country
          )
        `)
        .eq('verified', true);

      if (query) {
        const cleanQuery = query.replace(/[,()]/g, ' ').trim();
        if (cleanQuery) {
          const words = cleanQuery.split(/\s+/).filter(w => w.length > 0);
          if (words.length > 0) {
            dbQuery = dbQuery.or(`specialty.ilike.%${words[0]}%,bio.ilike.%${words[0]}%`);
          }
        }
      }

      const { data, error } = await dbQuery
        .order('weighted_rating', { ascending: false })
        .order('appointment_count', { ascending: false })
        .limit(50);

      if (error) throw error;

      let filteredData = data || [];
      if (location) {
        filteredData = filteredData.filter(doctor => 
          doctor.practices?.city?.toLowerCase().includes(location.toLowerCase()) ||
          doctor.practices?.country?.toLowerCase().includes(location.toLowerCase())
        );
      }

      return filteredData
        .filter(d => d.profiles?.full_name)
        .map(doctor => ({
          id: doctor.id,
          type: 'doctor' as const,
          name: doctor.profiles?.full_name || 'Unknown',
          specialty: doctor.specialty,
          specialties: [doctor.specialty],
          rating: doctor.weighted_rating || doctor.average_rating,
          reviewCount: doctor.num_reviews || 0,
          image: doctor.profiles?.avatar_url,
          clinicAffiliation: doctor.practices?.name || null,
          location: doctor.practices?.city && doctor.practices?.country 
            ? `${doctor.practices.city}, ${doctor.practices.country}` 
            : null,
          consultationFee: doctor.consultation_fee,
          acceptsNewPatients: doctor.accepts_new_patients ?? true,
          languages: doctor.languages,
        }));
    } catch (err) {
      console.error('Error searching doctors:', err);
      return [];
    }
  };

  const searchClinics = async (query: string, location?: string): Promise<ClinicResult[]> => {
    try {
      let dbQuery = supabase
        .from('practices')
        .select('*')
        .eq('verified', true);

      if (query) {
        const cleanQuery = query.replace(/[,()]/g, ' ').trim();
        if (cleanQuery) {
          const words = cleanQuery.split(/\s+/).filter(w => w.length > 0);
          if (words.length > 0) {
            dbQuery = dbQuery.or(`name.ilike.%${words[0]}%,description.ilike.%${words[0]}%`);
          }
        }
      }

      if (location) {
        const cleanLocation = location.replace(/[,()]/g, ' ').trim();
        if (cleanLocation) {
          const words = cleanLocation.split(/\s+/).filter(w => w.length > 0);
          if (words.length > 0) {
            dbQuery = dbQuery.or(`city.ilike.%${words[0]}%,country.ilike.%${words[0]}%`);
          }
        }
      }

      const { data, error } = await dbQuery
        .order('weighted_rating', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map(clinic => ({
        id: clinic.id,
        type: 'clinic' as const,
        name: clinic.name,
        image: clinic.logo_url,
        location: clinic.city && clinic.country ? `${clinic.city}, ${clinic.country}` : null,
        rating: clinic.weighted_rating || clinic.average_rating,
        reviewCount: clinic.num_reviews || 0,
        specialties: clinic.specialties,
      }));
    } catch (err) {
      console.error('Error searching clinics:', err);
      return [];
    }
  };

  const searchPharmacies = async (query: string, location?: string): Promise<PharmacyResult[]> => {
    try {
      let dbQuery = supabase
        .from('pharmacies')
        .select('*')
        .eq('verified', true);

      if (query) {
        const cleanQuery = query.replace(/[,()]/g, ' ').trim();
        if (cleanQuery) {
          const words = cleanQuery.split(/\s+/).filter(w => w.length > 0);
          if (words.length > 0) {
            dbQuery = dbQuery.ilike('name', `%${words[0]}%`);
          }
        }
      }

      if (location) {
        const cleanLocation = location.replace(/[,()]/g, ' ').trim();
        if (cleanLocation) {
          const words = cleanLocation.split(/\s+/).filter(w => w.length > 0);
          if (words.length > 0) {
            dbQuery = dbQuery.or(`city.ilike.%${words[0]}%,country.ilike.%${words[0]}%`);
          }
        }
      }

      const { data, error } = await dbQuery
        .order('average_rating', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map(pharmacy => ({
        id: pharmacy.id,
        type: 'pharmacy' as const,
        name: pharmacy.name,
        image: pharmacy.logo_url,
        location: pharmacy.city && pharmacy.country ? `${pharmacy.city}, ${pharmacy.country}` : null,
        deliveryAvailable: pharmacy.delivery_available ?? false,
        acceptsInsurance: pharmacy.accepts_insurance ?? false,
        rating: pharmacy.average_rating,
        reviewCount: pharmacy.num_reviews || 0,
      }));
    } catch (err) {
      console.error('Error searching pharmacies:', err);
      return [];
    }
  };

  const searchLabsAndImaging = async (query: string, location?: string): Promise<{ labs: LabResult[]; imaging: ImagingResult[] }> => {
    try {
      let dbQuery = supabase
        .from('lab_centers')
        .select('*')
        .eq('is_verified', true);

      if (query) {
        const cleanQuery = query.replace(/[,()]/g, ' ').trim();
        if (cleanQuery) {
          const words = cleanQuery.split(/\s+/).filter(w => w.length > 0);
          if (words.length > 0) {
            dbQuery = dbQuery.ilike('name', `%${words[0]}%`);
          }
        }
      }

      if (location) {
        const cleanLocation = location.replace(/[,()]/g, ' ').trim();
        if (cleanLocation) {
          const words = cleanLocation.split(/\s+/).filter(w => w.length > 0);
          if (words.length > 0) {
            dbQuery = dbQuery.or(`city.ilike.%${words[0]}%,country.ilike.%${words[0]}%`);
          }
        }
      }

      const { data, error } = await dbQuery.limit(50);

      if (error) throw error;

      const labs: LabResult[] = [];
      const imaging: ImagingResult[] = [];

      (data || []).forEach(center => {
        const baseData = {
          id: center.id,
          name: center.name,
          location: center.city && center.country ? `${center.city}, ${center.country}` : null,
          acceptsInsurance: center.accepts_insurance ?? false,
        };

        // Categorize based on type or services offered
        const type = (center.type || '').toLowerCase();
        const services = center.services_offered || [];
        
        const isImaging = type.includes('imaging') || type.includes('radiology') || 
          services.some((s: string) => ['mri', 'ct', 'x-ray', 'ultrasound', 'mammography'].some(proc => s.toLowerCase().includes(proc)));

        if (isImaging) {
          imaging.push({
            ...baseData,
            type: 'imaging',
            procedures: services,
            accreditations: center.accreditations,
          });
        } else {
          labs.push({
            ...baseData,
            type: 'lab',
            servicesOffered: services,
            turnaroundHours: center.average_turnaround_hours,
          });
        }
      });

      return { labs, imaging };
    } catch (err) {
      console.error('Error searching labs/imaging:', err);
      return { labs: [], imaging: [] };
    }
  };

  const search = useCallback(async (
    query: string,
    location?: string,
    activeFilters: SearchFilters = filters
  ) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const promises: Promise<any>[] = [];

      if (activeFilters.doctors) {
        promises.push(searchDoctors(query, location));
      } else {
        promises.push(Promise.resolve([]));
      }

      if (activeFilters.clinics) {
        promises.push(searchClinics(query, location));
      } else {
        promises.push(Promise.resolve([]));
      }

      if (activeFilters.pharmacies) {
        promises.push(searchPharmacies(query, location));
      } else {
        promises.push(Promise.resolve([]));
      }

      if (activeFilters.labs || activeFilters.imaging) {
        promises.push(searchLabsAndImaging(query, location));
      } else {
        promises.push(Promise.resolve({ labs: [], imaging: [] }));
      }

      const [doctors, clinics, pharmacies, labsImaging] = await Promise.all(promises);

      const newResults: UnifiedSearchResults = {
        doctors: activeFilters.doctors ? doctors : [],
        clinics: activeFilters.clinics ? clinics : [],
        pharmacies: activeFilters.pharmacies ? pharmacies : [],
        labs: activeFilters.labs ? labsImaging.labs : [],
        imaging: activeFilters.imaging ? labsImaging.imaging : [],
      };

      setResults(newResults);
      setFilters(activeFilters);

      const totalCount = 
        newResults.doctors.length + 
        newResults.clinics.length + 
        newResults.pharmacies.length + 
        newResults.labs.length + 
        newResults.imaging.length;

      if (totalCount === 0 && query) {
        toast.info('No results found. Try adjusting your search.');
      }

      return newResults;
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed');
      toast.error('Search failed. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetSearch = useCallback(() => {
    setResults({
      doctors: [],
      clinics: [],
      pharmacies: [],
      labs: [],
      imaging: [],
    });
    setHasSearched(false);
    setError(null);
    setFilters(DEFAULT_FILTERS);
  }, []);

  const totalResultCount = 
    results.doctors.length + 
    results.clinics.length + 
    results.pharmacies.length + 
    results.labs.length + 
    results.imaging.length;

  return {
    results,
    loading,
    error,
    filters,
    hasSearched,
    totalResultCount,
    search,
    updateFilters,
    resetSearch,
  };
}
