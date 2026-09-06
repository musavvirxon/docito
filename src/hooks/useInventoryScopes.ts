// src/hooks/useInventoryScopes.ts
// Resolves every inventory "location" (entity) the signed-in user can read stock from:
//  - the clinic set on their doctor record
//  - clinics where they are admin or active staff (via get_my_entity_scopes)
//  - their own personal (doctor-owned) stock
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface InventoryScope {
  id: string;
  name: string;
  kind: 'clinic' | 'doctor';
}

export function useInventoryScopes(enabled = true) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [scopes, setScopes] = useState<InventoryScope[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setScopes([]);
      setDoctorId(null);
      return;
    }
    setLoading(true);
    try {
      const found = new Map<string, InventoryScope>();

      const [scopeRes, doctorRes] = await Promise.all([
        (supabase as any).rpc('get_my_entity_scopes'),
        supabase
          .from('doctors')
          .select('id, practice_id')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      for (const row of (scopeRes?.data || []) as any[]) {
        if (row?.entity_type === 'clinic' && row?.entity_id) {
          found.set(row.entity_id, {
            id: row.entity_id,
            name: row.entity_name || 'Clinic',
            kind: 'clinic',
          });
        }
      }

      const doctor = (doctorRes as any)?.data;
      if (doctor?.practice_id && !found.has(doctor.practice_id)) {
        const { data: practice } = await supabase
          .from('practices')
          .select('name')
          .eq('id', doctor.practice_id)
          .maybeSingle();
        found.set(doctor.practice_id, {
          id: doctor.practice_id,
          name: (practice as any)?.name || 'Clinic',
          kind: 'clinic',
        });
      }

      if (doctor?.id) {
        setDoctorId(doctor.id);
        if (!found.has(doctor.id)) {
          found.set(doctor.id, { id: doctor.id, name: 'Personal', kind: 'doctor' });
        }
      } else {
        setDoctorId(null);
      }

      setScopes(Array.from(found.values()));
    } catch (e) {
      console.error('useInventoryScopes failed', e);
      setScopes([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { scopes, doctorId, loading, refresh };
}
