// src/hooks/usePracticePublicProfile.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ─── Data shapes ──────────────────────────────────────────────────────────────

export interface PracticePublicData {
  id: string;
  admin_id: string | null;
  name: string;
  name_en: string | null;
  name_ru: string | null;
  name_uz: string | null;
  name_ar: string | null;
  description: string | null;
  description_en: string | null;
  description_ru: string | null;
  description_uz: string | null;
  description_ar: string | null;
  logo_url: string | null;
  banner_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  practice_type: string | null;
  practice_size: string | null;
  specialties: string[] | null;
  services_offered: string[] | null;
  operating_hours: Record<
    string,
    { open: string; close: string; closed?: boolean }
  > | null;
  average_rating: number | null;
  num_reviews: number | null;
  verified: boolean | null;
  verification_status: string | null;
  year_established: number | null;
}

export interface AffiliatedDoctor {
  id: string;
  full_name: string | null;
  specialty: string | null;
  avatar_url: string | null;
  average_rating: number | null;
  num_reviews: number | null;
  years_experience: number | null;
  verified: boolean | null;
  username: string | null;
  custom_profile_link: string | null;
  accepts_new_patients: boolean | null;
  consultation_fee: number | null;
  consultation_types: string[] | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePracticePublicProfile(practiceId: string | undefined) {
  const [practice, setPractice] = useState<PracticePublicData | null>(null);
  const [doctors, setDoctors] = useState<AffiliatedDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!practiceId) return;

    const run = async () => {
      setLoading(true);
      setNotFound(false);

      try {
        // ── Fetch practice row ───────────────────────────────────────────────
        const { data: p, error: pErr } = await supabase
          .from('practices')
          .select('*')
          .eq('id', practiceId)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!p) {
          setNotFound(true);
          return;
        }

        setPractice(p as unknown as PracticePublicData);

        // ── Fetch affiliated doctors via view ────────────────────────────────
        const { data: docs, error: dErr } = await (supabase as any)
          .from('doctor_profiles_view')
          .select(
            'id, full_name, specialty, avatar_url, average_rating, num_reviews,' +
              ' years_experience, verified, username, custom_profile_link,' +
              ' accepts_new_patients, consultation_fee, consultation_types',
          )
          .eq('practice_id', practiceId)
          .order('full_name', { ascending: true });

        if (dErr) console.warn('Affiliated doctors fetch error', dErr);
        setDoctors((docs ?? []) as AffiliatedDoctor[]);
      } catch (e) {
        console.error('usePracticePublicProfile', e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [practiceId]);

  return { practice, doctors, loading, notFound };
}
