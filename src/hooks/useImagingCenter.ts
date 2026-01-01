import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ImagingCenter = Database['public']['Tables']['imaging_centers']['Row'];
type ImagingStaff = Database['public']['Tables']['imaging_staff']['Row'];

export interface ImagingCenterInput {
  name: string;
  license_number?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  modalities?: string[];
  accreditations?: string[];
  accepts_insurance?: boolean;
  operating_hours?: Record<string, any>;
}

export function useImagingCenter() {
  const { user } = useAuth();
  const [imagingCenters, setImagingCenters] = useState<ImagingCenter[]>([]);
  const [myImagingCenter, setMyImagingCenter] = useState<ImagingCenter | null>(null);
  const [imagingStaff, setImagingStaff] = useState<ImagingStaff[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchImagingCenters = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('imaging_centers')
        .select('*')
        .order('name');

      if (error) throw error;
      setImagingCenters((data || []) as ImagingCenter[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyImagingCenter = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Check if user is admin of an imaging center
      const { data: adminData } = await supabase
        .from('imaging_centers')
        .select('*')
        .eq('admin_id', user.id)
        .single();

      if (adminData) {
        setMyImagingCenter(adminData as ImagingCenter);
        return;
      }

      // Check if user is staff at an imaging center
      const { data: staffData } = await supabase
        .from('imaging_staff')
        .select('imaging_center_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (staffData) {
        const { data: centerData } = await supabase
          .from('imaging_centers')
          .select('*')
          .eq('id', staffData.imaging_center_id)
          .single();

        if (centerData) {
          setMyImagingCenter(centerData as ImagingCenter);
        }
      }
    } catch (error: any) {
      console.error('Error fetching imaging center:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createImagingCenter = useCallback(async (input: ImagingCenterInput) => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('imaging_centers')
        .insert({
          ...input,
          admin_id: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Assign imaging_admin role to the user
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: 'imaging_admin'
        }, { onConflict: 'user_id,role' });

      if (roleError) {
        console.error('Error assigning role:', roleError);
      }

      setMyImagingCenter(data as ImagingCenter);
      toast({ title: 'Success', description: 'Imaging center registered successfully' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateImagingCenter = useCallback(async (id: string, updates: Partial<ImagingCenterInput>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('imaging_centers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setMyImagingCenter(data as ImagingCenter);
      toast({ title: 'Success', description: 'Imaging center updated successfully' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchImagingStaff = useCallback(async (centerId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('imaging_staff')
        .select('*')
        .eq('imaging_center_id', centerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImagingStaff((data || []) as ImagingStaff[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    imagingCenters,
    myImagingCenter,
    imagingStaff,
    loading,
    fetchImagingCenters,
    fetchMyImagingCenter,
    createImagingCenter,
    updateImagingCenter,
    fetchImagingStaff,
  };
}
