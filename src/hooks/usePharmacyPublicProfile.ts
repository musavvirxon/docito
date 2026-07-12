// src/hooks/usePharmacyPublicProfile.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FacilityPublicData } from '@/types/facility';

export interface PharmacyPublicData extends FacilityPublicData {
  delivery_available: boolean | null;
}

export function usePharmacyPublicProfile(pharmacyId: string | undefined) {
  const [pharmacy, setPharmacy] = useState<PharmacyPublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!pharmacyId) return;

    const run = async () => {
      setLoading(true);
      setNotFound(false);

      try {
        const { data, error } = await supabase
          .from('pharmacies')
          .select('*')
          .eq('id', pharmacyId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setNotFound(true);
          return;
        }

        const row = data as any;
        setPharmacy({
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
          verified: row.verified,
          accepts_insurance: row.accepts_insurance,
          delivery_available: row.delivery_available,
        });
      } catch (e) {
        console.error('usePharmacyPublicProfile', e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [pharmacyId]);

  return { pharmacy, loading, notFound };
}
