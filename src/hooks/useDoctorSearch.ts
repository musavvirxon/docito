import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DoctorResult {
  id: string;
  type: 'doctor';
  name: string;
  specialty?: string;
  rating?: number;
  reviewCount?: number;
  location?: string;
  consultationFee?: number;
  imageUrl?: string;
  acceptsNewPatients?: boolean;
  videoConsultation?: boolean;
  availableToday?: boolean;
  acceptsInsurance?: boolean;
  bio?: string;
  languages?: string[];
  yearsExperience?: number;
  licenseNumber?: string;
  practiceName?: string;
  practiceAddress?: string;
  practiceCity?: string;
  practiceCountry?: string;
  email?: string;
  phone?: string;
  appointmentCount?: number;
  practiceId?: string;
  consultationTypes?: string[];
  verified?: boolean;
  created_at?: string;
}

interface SearchParams {
  query: string;
  filters?: any;
  sortBy?: string;
}

export function useDoctorSearch() {
  const [results, setResults] = useState<DoctorResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const specialties = [
    'General Medicine', 'Dentistry', 'Cardiology', 'Dermatology',
    'Orthopedics', 'Pediatrics', 'Neurology', 'Ophthalmology',
  ];

  const searchDoctors = useCallback(async ({ query, filters, sortBy }: SearchParams) => {
    setIsLoading(true);
    setError(null);

    try {
      let q = supabase
        .from('doctor_profiles_view')
        .select('id, specialty, consultation_fee, accepts_new_patients, average_rating, num_reviews, consultation_types, verified, full_name, avatar_url, bio, languages, years_experience, license_number, practice_name, practice_address, practice_city, practice_country, email, phone, appointment_count, practice_id')
        .eq('verified', true)
        .limit(50);

      if (query) {
        q = q.or(`specialty.ilike.%${query}%,full_name.ilike.%${query}%`);
      }

      if (filters?.specialty) {
        q = q.eq('specialty', filters.specialty);
      }

      const { data, error: dbError } = await q;

      if (dbError) throw dbError;

      const mapped: DoctorResult[] = (data || []).map((d: any) => ({
        id: d.id,
        type: 'doctor' as const,
        name: d.full_name || 'Doctor',
        specialty: d.specialty,
        rating: d.average_rating,
        reviewCount: d.num_reviews,
        consultationFee: d.consultation_fee,
        imageUrl: d.avatar_url,
        acceptsNewPatients: d.accepts_new_patients,
        videoConsultation: (d.consultation_types || []).includes('video'),
        availableToday: false,
        acceptsInsurance: false,
        bio: d.bio,
        languages: d.languages,
        yearsExperience: d.years_experience,
        licenseNumber: d.license_number,
        practiceName: d.practice_name,
        practiceAddress: d.practice_address,
        practiceCity: d.practice_city,
        practiceCountry: d.practice_country,
        email: d.email,
        phone: d.phone,
        appointmentCount: d.appointment_count,
        practiceId: d.practice_id,
      }));

      setResults(mapped);
      setTotalCount(mapped.length);
    } catch (e: any) {
      console.error('Doctor search error:', e);
      setError(e);
      setResults([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { results, isLoading, searchDoctors, specialties, totalCount, error };
}
