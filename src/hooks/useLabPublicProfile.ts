// src/hooks/useLabPublicProfile.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FacilityPublicData } from '@/types/facility';

export interface LabPublicData extends FacilityPublicData {
  type: string | null;
  services_offered: string[] | null;
  average_turnaround_hours: number | null;
  accreditations: string[] | null;
}

export function useLabPublicProfile(labId: string | undefined) {
  const [lab, setLab] = useState<LabPublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!labId) return;

    const run = async () => {
      setLoading(true);
      setNotFound(false);

      try {
        const { data, error } = await supabase
          .from('lab_centers')
          .select('*')
          .eq('id', labId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setNotFound(true);
          return;
        }

        const row = data as any;
        setLab({
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
          // lab_centers has no rating column yet — this holds space for
          // when one is added, without breaking the shared components.
          average_rating: null,
          num_reviews: null,
          verified: row.is_verified,
          accepts_insurance: row.accepts_insurance,
          type: row.type,
          services_offered: row.services_offered,
          average_turnaround_hours: row.average_turnaround_hours,
          accreditations: row.accreditations,
        });
      } catch (e) {
        console.error('useLabPublicProfile', e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [labId]);

  return { lab, loading, notFound };
}
