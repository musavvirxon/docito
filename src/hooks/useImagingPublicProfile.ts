// src/hooks/useImagingPublicProfile.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FacilityPublicData } from '@/types/facility';

export interface ImagingPublicData extends FacilityPublicData {
  modalities: string[] | null;
  accreditations: string[] | null;
}

export function useImagingPublicProfile(centerId: string | undefined) {
  const [center, setCenter] = useState<ImagingPublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!centerId) return;

    const run = async () => {
      setLoading(true);
      setNotFound(false);

      try {
        const { data, error } = await supabase
          .from('imaging_centers')
          .select('*')
          .eq('id', centerId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setNotFound(true);
          return;
        }

        const row = data as any;
        setCenter({
          id: row.id,
          admin_id: row.admin_id,
          name: row.name,
          logo_url: row.logo_url,
          address: row.address,
          city: row.city,
          state: row.state,
          country: row.country,
          phone: row.phone,
          email: row.email,
          website: row.website,
          operating_hours: row.operating_hours,
          average_rating: row.average_rating,
          num_reviews: row.num_reviews,
          verified: row.is_verified,
          accepts_insurance: row.accepts_insurance,
          modalities: row.modalities,
          accreditations: row.accreditations,
        });
      } catch (e) {
        console.error('useImagingPublicProfile', e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [centerId]);

  return { center, loading, notFound };
}
