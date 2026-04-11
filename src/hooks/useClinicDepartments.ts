import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ClinicDepartment {
  id: string;
  clinic_id: string;
  name: string;
  display_name: string;
  description: string | null;
  status: string;
  equipment_list: string[] | null;
  test_templates: any[];
  created_at: string;
  updated_at: string;
}

interface DepartmentStaff {
  id: string;
  department_id: string;
  user_id: string;
  clinic_id: string;
  role: string;
  license_number: string | null;
  can_view_orders: boolean;
  can_upload_results: boolean;
  can_manage_equipment: boolean;
  status: string;
  hired_at: string;
  created_at: string;
}

interface DepartmentStaffInput {
  department_id: string;
  user_id: string;
  clinic_id: string;
  role: string;
  license_number?: string;
  can_view_orders?: boolean;
  can_upload_results?: boolean;
  can_manage_equipment?: boolean;
}

export function useClinicDepartments() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<ClinicDepartment[]>([]);
  const [departmentStaff, setDepartmentStaff] = useState<DepartmentStaff[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDepartments = useCallback(async (clinicId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_departments')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');

      if (error) throw error;
      setDepartments((data || []) as ClinicDepartment[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleService = useCallback(async (clinicId: string, service: 'lab' | 'imaging', enabled: boolean) => {
    setLoading(true);
    try {
      const updateField = service === 'lab' ? 'has_lab_service' : 'has_imaging_service';
      
      const { error } = await supabase
        .from('practices')
        .update({ [updateField]: enabled } as any)
        .eq('id', clinicId);

      if (error) throw error;
      
      toast({ 
        title: 'Success', 
        description: `${service === 'lab' ? 'Laboratory' : 'Imaging'} service ${enabled ? 'enabled' : 'disabled'}` 
      });
      
      // Refresh departments
      await fetchDepartments(clinicId);
      return true;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchDepartments]);

  const updateDepartment = useCallback(async (departmentId: string, updates: Partial<ClinicDepartment>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_departments')
        .update(updates)
        .eq('id', departmentId)
        .select()
        .single();

      if (error) throw error;
      setDepartments(prev => prev.map(d => d.id === departmentId ? data as ClinicDepartment : d));
      toast({ title: 'Success', description: 'Department updated' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Staff management
  const fetchDepartmentStaff = useCallback(async (departmentId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_department_staff')
        .select('*')
        .eq('department_id', departmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDepartmentStaff((data || []) as DepartmentStaff[]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  const addDepartmentStaff = useCallback(async (input: DepartmentStaffInput) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_department_staff')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      setDepartmentStaff(prev => [data as DepartmentStaff, ...prev]);
      toast({ title: 'Success', description: 'Staff member added' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDepartmentStaff = useCallback(async (staffId: string, updates: Partial<DepartmentStaffInput>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_department_staff')
        .update(updates)
        .eq('id', staffId)
        .select()
        .single();

      if (error) throw error;
      setDepartmentStaff(prev => prev.map(s => s.id === staffId ? data as DepartmentStaff : s));
      toast({ title: 'Success', description: 'Staff updated' });
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeDepartmentStaff = useCallback(async (staffId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('clinic_department_staff')
        .delete()
        .eq('id', staffId);

      if (error) throw error;
      setDepartmentStaff(prev => prev.filter(s => s.id !== staffId));
      toast({ title: 'Success', description: 'Staff member removed' });
      return true;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    departments,
    departmentStaff,
    loading,
    fetchDepartments,
    toggleService,
    updateDepartment,
    fetchDepartmentStaff,
    addDepartmentStaff,
    updateDepartmentStaff,
    removeDepartmentStaff,
  };
}
