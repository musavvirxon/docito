import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles, AppRole } from './useUserRoles';

// Staff type categories
export type StaffType = 'clinic' | 'pharmacy' | 'lab' | 'imaging' | 'unknown';

// Map roles to staff types
const roleToStaffType: Partial<Record<AppRole, StaffType>> = {
  clinic_admin: 'clinic',
  clinic_staff: 'clinic',
  receptionist: 'clinic',
  nurse: 'clinic',
  billing_manager: 'clinic',
  staff: 'clinic',
  pharmacy_admin: 'pharmacy',
  pharmacy_staff: 'pharmacy',
  pharmacist: 'pharmacy',
  lab_admin: 'lab',
  lab_staff: 'lab',
  lab_technician: 'lab',
  internal_lab_tech: 'lab',
  imaging_admin: 'imaging',
  imaging_staff: 'imaging',
  internal_imaging_tech: 'imaging',
};

// Entity info for each staff type
export interface EntityInfo {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
}

// Base permissions that all staff types share
export interface BaseStaffPermissions {
  entity_id: string | null;
  staff_role: string | null;
  status: string;
}

// Clinic-specific permissions
export interface ClinicPermissions extends BaseStaffPermissions {
  can_book_appointments: boolean;
  can_view_medical_records: boolean;
  can_manage_billing: boolean;
  can_manage_patients: boolean;
  can_view_schedule: boolean;
}

// Pharmacy-specific permissions
export interface PharmacyPermissions extends BaseStaffPermissions {
  can_dispense: boolean;
  can_manage_inventory: boolean;
  can_process_prescriptions: boolean;
}

// Lab-specific permissions
export interface LabPermissions extends BaseStaffPermissions {
  can_process_samples: boolean;
  can_upload_results: boolean;
  can_verify_results: boolean;
  can_manage_equipment: boolean;
}

// Imaging-specific permissions  
export interface ImagingPermissions extends BaseStaffPermissions {
  can_view_orders: boolean;
  can_process_scans: boolean;
  can_upload_results: boolean;
  can_verify_results: boolean;
  can_manage_equipment: boolean;
}

// Union type for all permissions
export type StaffPermissions = 
  | (ClinicPermissions & { staffType: 'clinic' })
  | (PharmacyPermissions & { staffType: 'pharmacy' })
  | (LabPermissions & { staffType: 'lab' })
  | (ImagingPermissions & { staffType: 'imaging' });

interface UseStaffContextReturn {
  staffType: StaffType;
  entityInfo: EntityInfo | null;
  permissions: StaffPermissions | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  refetch: () => Promise<void>;
}

export const useStaffContext = (): UseStaffContextReturn => {
  const { user } = useAuth();
  const { roles, primaryRole, loading: rolesLoading } = useUserRoles();
  const [staffType, setStaffType] = useState<StaffType>('unknown');
  const [entityInfo, setEntityInfo] = useState<EntityInfo | null>(null);
  const [permissions, setPermissions] = useState<StaffPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine if user is admin
  const isAdmin = roles.some(role => 
    ['clinic_admin', 'pharmacy_admin', 'lab_admin', 'imaging_admin', 'admin', 'super_admin'].includes(role)
  );

  // Determine staff type from roles
  const determineStaffType = useCallback((): StaffType => {
    for (const role of roles) {
      const type = roleToStaffType[role];
      if (type) return type;
    }
    return 'unknown';
  }, [roles]);

  // Fetch clinic staff data
  const fetchClinicData = useCallback(async (): Promise<{ entity: EntityInfo | null; perms: ClinicPermissions | null }> => {
    if (!user) return { entity: null, perms: null };

    try {
      const { data: staffData, error: staffError } = await supabase
        .from('clinic_staff')
        .select(`
          practice_id,
          staff_role,
          status,
          can_book_appointments,
          can_view_medical_records,
          can_manage_billing,
          can_manage_patients,
          can_view_schedule,
          practices (
            id, name, phone, email, address, city, country
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (staffError || !staffData) return { entity: null, perms: null };

      const practice = staffData.practices as any;
      return {
        entity: practice ? {
          id: practice.id,
          name: practice.name,
          phone: practice.phone,
          email: practice.email,
          address: practice.address,
          city: practice.city,
          country: practice.country,
        } : null,
        perms: {
          entity_id: staffData.practice_id,
          staff_role: staffData.staff_role,
          status: staffData.status || 'active',
          can_book_appointments: staffData.can_book_appointments || false,
          can_view_medical_records: staffData.can_view_medical_records || false,
          can_manage_billing: staffData.can_manage_billing || false,
          can_manage_patients: staffData.can_manage_patients || false,
          can_view_schedule: staffData.can_view_schedule || false,
        }
      };
    } catch (err) {
      console.error('Error fetching clinic data:', err);
      return { entity: null, perms: null };
    }
  }, [user]);

  // Fetch pharmacy staff data
  const fetchPharmacyData = useCallback(async (): Promise<{ entity: EntityInfo | null; perms: PharmacyPermissions | null }> => {
    if (!user) return { entity: null, perms: null };

    try {
      const { data: staffData, error: staffError } = await supabase
        .from('pharmacy_staff')
        .select(`
          pharmacy_id,
          staff_role,
          status,
          can_dispense,
          can_manage_inventory,
          can_process_prescriptions,
          pharmacies (
            id, name, phone, email, address, city, country
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (staffError || !staffData) return { entity: null, perms: null };

      const pharmacy = staffData.pharmacies as any;
      return {
        entity: pharmacy ? {
          id: pharmacy.id,
          name: pharmacy.name,
          phone: pharmacy.phone,
          email: pharmacy.email,
          address: pharmacy.address,
          city: pharmacy.city,
          country: pharmacy.country,
        } : null,
        perms: {
          entity_id: staffData.pharmacy_id,
          staff_role: staffData.staff_role,
          status: staffData.status || 'active',
          can_dispense: staffData.can_dispense || false,
          can_manage_inventory: staffData.can_manage_inventory || false,
          can_process_prescriptions: staffData.can_process_prescriptions || false,
        }
      };
    } catch (err) {
      console.error('Error fetching pharmacy data:', err);
      return { entity: null, perms: null };
    }
  }, [user]);

  // Fetch lab staff data
  const fetchLabData = useCallback(async (): Promise<{ entity: EntityInfo | null; perms: LabPermissions | null }> => {
    if (!user) return { entity: null, perms: null };

    try {
      const { data: staffData, error: staffError } = await supabase
        .from('lab_staff')
        .select(`
          lab_center_id,
          staff_role,
          status,
          can_process_samples,
          can_upload_results,
          can_verify_results,
          can_manage_equipment,
          lab_centers (
            id, name, phone, email, address, city, country
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (staffError || !staffData) return { entity: null, perms: null };

      const labCenter = staffData.lab_centers as any;
      return {
        entity: labCenter ? {
          id: labCenter.id,
          name: labCenter.name,
          phone: labCenter.phone,
          email: labCenter.email,
          address: labCenter.address,
          city: labCenter.city,
          country: labCenter.country,
        } : null,
        perms: {
          entity_id: staffData.lab_center_id,
          staff_role: staffData.staff_role,
          status: staffData.status || 'active',
          can_process_samples: staffData.can_process_samples || false,
          can_upload_results: staffData.can_upload_results || false,
          can_verify_results: staffData.can_verify_results || false,
          can_manage_equipment: staffData.can_manage_equipment || false,
        }
      };
    } catch (err) {
      console.error('Error fetching lab data:', err);
      return { entity: null, perms: null };
    }
  }, [user]);

  // Fetch imaging staff data
  const fetchImagingData = useCallback(async (): Promise<{ entity: EntityInfo | null; perms: ImagingPermissions | null }> => {
    if (!user) return { entity: null, perms: null };

    try {
      const { data: staffData, error: staffError } = await supabase
        .from('imaging_staff')
        .select(`
          imaging_center_id,
          staff_role,
          status,
          can_view_orders,
          can_process_scans,
          can_upload_results,
          can_verify_results,
          can_manage_equipment,
          imaging_centers (
            id, name, phone, email, address, city, country
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (staffError || !staffData) return { entity: null, perms: null };

      const imagingCenter = staffData.imaging_centers as any;
      return {
        entity: imagingCenter ? {
          id: imagingCenter.id,
          name: imagingCenter.name,
          phone: imagingCenter.phone,
          email: imagingCenter.email,
          address: imagingCenter.address,
          city: imagingCenter.city,
          country: imagingCenter.country,
        } : null,
        perms: {
          entity_id: staffData.imaging_center_id,
          staff_role: staffData.staff_role,
          status: staffData.status || 'active',
          can_view_orders: staffData.can_view_orders || false,
          can_process_scans: staffData.can_process_scans || false,
          can_upload_results: staffData.can_upload_results || false,
          can_verify_results: staffData.can_verify_results || false,
          can_manage_equipment: staffData.can_manage_equipment || false,
        }
      };
    } catch (err) {
      console.error('Error fetching imaging data:', err);
      return { entity: null, perms: null };
    }
  }, [user]);

  // Main fetch function
  const fetchStaffData = useCallback(async () => {
    if (!user || rolesLoading) return;

    setLoading(true);
    setError(null);

    try {
      const type = determineStaffType();
      setStaffType(type);

      let result: { entity: EntityInfo | null; perms: any } = { entity: null, perms: null };

      switch (type) {
        case 'clinic':
          result = await fetchClinicData();
          if (result.perms) {
            setPermissions({ ...result.perms, staffType: 'clinic' });
          }
          break;
        case 'pharmacy':
          result = await fetchPharmacyData();
          if (result.perms) {
            setPermissions({ ...result.perms, staffType: 'pharmacy' });
          }
          break;
        case 'lab':
          result = await fetchLabData();
          if (result.perms) {
            setPermissions({ ...result.perms, staffType: 'lab' });
          }
          break;
        case 'imaging':
          result = await fetchImagingData();
          if (result.perms) {
            setPermissions({ ...result.perms, staffType: 'imaging' });
          }
          break;
        default:
          setError('Unable to determine staff type');
          break;
      }

      setEntityInfo(result.entity);

      if (!result.entity && type !== 'unknown') {
        setError('You are not assigned to any organization. Please contact your administrator.');
      }
    } catch (err: any) {
      console.error('Error fetching staff data:', err);
      setError(err.message || 'Failed to load staff data');
    } finally {
      setLoading(false);
    }
  }, [user, rolesLoading, determineStaffType, fetchClinicData, fetchPharmacyData, fetchLabData, fetchImagingData]);

  useEffect(() => {
    if (!rolesLoading) {
      fetchStaffData();
    }
  }, [rolesLoading, fetchStaffData]);

  return {
    staffType,
    entityInfo,
    permissions,
    loading: loading || rolesLoading,
    error,
    isAdmin,
    refetch: fetchStaffData,
  };
};
