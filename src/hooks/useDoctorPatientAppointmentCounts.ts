import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns a Map<doctor_patient_id, appointmentCount> for the current doctor.
 * Uses a single query and counts client-side (Supabase has no GROUP BY).
 */
export const useDoctorPatientAppointmentCounts = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        setCounts(new Map());
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!doctorData) {
          if (!cancelled) setCounts(new Map());
          return;
        }

        const { data, error } = await supabase
          .from('appointments')
          .select('doctor_patient_id')
          .eq('doctor_id', doctorData.id)
          .not('doctor_patient_id', 'is', null);

        if (error) throw error;

        const map = new Map<string, number>();
        (data || []).forEach((row: any) => {
          if (!row.doctor_patient_id) return;
          map.set(row.doctor_patient_id, (map.get(row.doctor_patient_id) || 0) + 1);
        });

        if (!cancelled) setCounts(map);
      } catch (err) {
        console.error('Error loading patient appointment counts:', err);
        if (!cancelled) setCounts(new Map());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user]);

  return { counts, loading };
};
