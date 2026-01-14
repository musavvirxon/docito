import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type LabCenter = Database['public']['Tables']['lab_centers']['Row'];
type LabStaff = Database['public']['Tables']['lab_staff']['Row'];
type TestCatalog = Database['public']['Tables']['test_catalog']['Row'];

export interface LabCenterInput {
  name: string;
  type: string;
  license_number?: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  phone: string;
  email?: string;
  website?: string;
  services_offered?: string[];
  accreditations?: string[];
  accepts_insurance?: boolean;
  average_turnaround_hours?: number;
}

export interface LabStaffInput {
  lab_center_id: string;
  user_id: string;
  staff_role: string;
  license_number?: string;
  specializations?: string[];
  can_process_samples?: boolean;
  can_upload_results?: boolean;
  can_verify_results?: boolean;
  can_manage_equipment?: boolean;
}

export interface TestCatalogInput {
  lab_center_id?: string;
  test_code: string;
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  sample_type?: string;
  preparation_instructions?: string;
  turnaround_hours?: number;
  price?: number;
  requires_fasting?: boolean;
  visibility?: 'public' | 'private';
  is_global?: boolean;
  is_active?: boolean;
  parameters?: any[];
}

export function useLabCenter() {
  const { user } = useAuth();
  const [labCenters, setLabCenters] = useState<LabCenter[]>([]);
  const [myLabCenter, setMyLabCenter] = useState<LabCenter | null>(null);
  const [labStaff, setLabStaff] = useState<LabStaff[]>([]);
  const [testCatalog, setTestCatalog] = useState<TestCatalog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLabCenters = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_centers')
        .select('*')
        .order('name');

      if (error) throw error;
      setLabCenters((data || []) as LabCenter[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyLabCenter = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Check if user is admin of a lab center
      const { data: adminData } = await supabase
        .from('lab_centers')
        .select('*')
        .eq('admin_id', user.id)
        .single();

      if (adminData) {
        setMyLabCenter(adminData as LabCenter);
        return;
      }

      // Check if user is staff at a lab center
      const { data: staffData } = await supabase
        .from('lab_staff')
        .select('lab_center_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (staffData) {
        const { data: labData } = await supabase
          .from('lab_centers')
          .select('*')
          .eq('id', staffData.lab_center_id)
          .single();

        if (labData) {
          setMyLabCenter(labData as LabCenter);
        }
      }
    } catch (error: any) {
      console.error('Error fetching lab center:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createLabCenter = useCallback(async (input: LabCenterInput) => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_centers')
        .insert({
          ...input,
          admin_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Assign lab_admin role to user
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: user.id, 
          role: 'lab_admin' 
        }, { 
          onConflict: 'user_id,role' 
        });

      if (roleError) {
        console.error('Error assigning lab_admin role:', roleError);
      }

      setMyLabCenter(data as LabCenter);
      toast({ title: 'Success', description: 'Lab center registered successfully' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateLabCenter = useCallback(async (id: string, updates: Partial<LabCenterInput>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_centers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setMyLabCenter(data as LabCenter);
      toast({ title: 'Success', description: 'Lab center updated successfully' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Lab Staff Management
  const fetchLabStaff = useCallback(async (labCenterId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_staff')
        .select('*')
        .eq('lab_center_id', labCenterId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLabStaff((data || []) as LabStaff[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  const addLabStaff = useCallback(async (input: LabStaffInput) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_staff')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      setLabStaff(prev => [data as LabStaff, ...prev]);
      toast({ title: 'Success', description: 'Staff member added successfully' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLabStaff = useCallback(async (id: string, updates: Partial<LabStaffInput>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_staff')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setLabStaff(prev => prev.map(s => s.id === id ? data as LabStaff : s));
      toast({ title: 'Success', description: 'Staff member updated successfully' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Test Catalog Management
  const fetchTestCatalog = useCallback(async (labCenterId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('test_catalog')
        .select('*')
        .eq('is_active', true);

      if (labCenterId) {
        // Show: lab-owned OR public (new schema) OR global (older schema)
        query = query.or(`lab_center_id.eq.${labCenterId},visibility.eq.public,is_global.eq.true`);
      }

      const { data, error } = await query.order('category').order('name');
      if (error) throw error;

      setTestCatalog((data || []) as TestCatalog[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  const addTest = useCallback(
    async (input: TestCatalogInput) => {
      setLoading(true);
      try {
        const isGlobal = (input as any).is_global === true || (input as any).visibility === 'public';

        const basePayload: any = {
          ...input,
          // enforce active so it appears
          is_active: true,
          // enforce consistency:
          // - if global/public: visible to all, no owner lab required
          // - if private: must be owned by the creating lab
          is_global: isGlobal,
          visibility: isGlobal ? 'public' : ((input as any).visibility ?? 'private'),
          lab_center_id: isGlobal ? null : (input.lab_center_id ?? null),
        };

        // Some deployments don't have the optional `parameters` column yet.
        // Try with parameters (if provided), then retry without on schema-cache error.
        const attemptInsert = async (payload: any) => {
          return await supabase.from('test_catalog').insert(payload).select().single();
        };

        let insertPayload: any = { ...basePayload };
        const params = (input as any).parameters;
        if (Array.isArray(params)) insertPayload.parameters = params;

        let { data, error } = await attemptInsert(insertPayload);
        if (error && (error as any)?.code === 'PGRST204' && String((error as any)?.message || '').includes('parameters')) {
          ({ data, error } = await attemptInsert(basePayload));
        }

        if (error) throw error;

        setTestCatalog((prev) => [...prev, data as TestCatalog]);
        toast({ title: 'Success', description: 'Test added to catalog' });
        return data;
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateTest = useCallback(async (id: string, updates: Partial<TestCatalogInput>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_catalog')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setTestCatalog(prev => prev.map(t => t.id === id ? data as TestCatalog : t));
      toast({ title: 'Success', description: 'Test updated successfully' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTest = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('test_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTestCatalog(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Success', description: 'Test removed from catalog' });
      return true;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    labCenters,
    myLabCenter,
    labStaff,
    testCatalog,
    loading,
    fetchLabCenters,
    fetchMyLabCenter,
    createLabCenter,
    updateLabCenter,
    fetchLabStaff,
    addLabStaff,
    updateLabStaff,
    fetchTestCatalog,
    addTest,
    updateTest,
    deleteTest,
  };
}
