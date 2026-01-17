// File: src/hooks/useStaffContext.ts

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

  // Optional verification fields (used for topbar verification badge)
  is_verified?: boolean; // practices, labs, imaging centers
  verified?: boolean; // pharmacies
  status?: string | null; // labs/imaging/practices (when available)
  verification_status?: string | null; // pharmacies/practices (when available)
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
  const { roles, loading: rolesLoading } = useUserRoles();
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
            id, name, phone, email, address, city, country,
            is_verified, status, verification_status
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (staffError || !staffData) return { entity: null, perms: null };

      const practice = staffData.practices as any;
      return {
        entity: practice
          ? {
              id: practice.id,
              name: practice.name,
              phone: practice.phone,
              email: practice.email,
              address: practice.address,
              city: practice.city,
              country: practice.country,
              is_verified: Boolean(practice.is_verified),
              status: practice.status ?? null,
              verification_status: practice.verification_status ?? null,
            }
          : null,
        perms: {
          entity_id: staffData.practice_id,
          staff_role: staffData.staff_role,
          status: staffData.status || 'active',
          can_book_appointments: staffData.can_book_appointments || false,
          can_view_medical_records: staffData.can_view_medical_records || false,
          can_manage_billing: staffData.can_manage_billing || false,
          can_manage_patients: staffData.can_manage_patients || false,
          can_view_schedule: staffData.can_view_schedule || false,
        },
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
            id, name, phone, email, address, city, country,
            verified, verification_status
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (staffError || !staffData) return { entity: null, perms: null };

      const pharmacy = staffData.pharmacies as any;
      return {
        entity: pharmacy
          ? {
              id: pharmacy.id,
              name: pharmacy.name,
              phone: pharmacy.phone,
              email: pharmacy.email,
              address: pharmacy.address,
              city: pharmacy.city,
              country: pharmacy.country,
              verified: Boolean(pharmacy.verified),
              verification_status: pharmacy.verification_status ?? null,
            }
          : null,
        perms: {
          entity_id: staffData.pharmacy_id,
          staff_role: staffData.staff_role,
          status: staffData.status || 'active',
          can_dispense: staffData.can_dispense || false,
          can_manage_inventory: staffData.can_manage_inventory || false,
          can_process_prescriptions: staffData.can_process_prescriptions || false,
        },
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
            id, name, phone, email, address, city, country,
            is_verified, status
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (staffError || !staffData) return { entity: null, perms: null };

      const lab = staffData.lab_centers as any;
      return {
        entity: lab
          ? {
              id: lab.id,
              name: lab.name,
              phone: lab.phone,
              email: lab.email,
              address: lab.address,
              city: lab.city,
              country: lab.country,
              is_verified: Boolean(lab.is_verified),
              status: lab.status ?? null,
            }
          : null,
        perms: {
          entity_id: staffData.lab_center_id,
          staff_role: staffData.staff_role,
          status: staffData.status || 'active',
          can_process_samples: staffData.can_process_samples || false,
          can_upload_results: staffData.can_upload_results || false,
          can_verify_results: staffData.can_verify_results || false,
          can_manage_equipment: staffData.can_manage_equipment || false,
        },
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
            id, name, phone, email, address, city, country,
            is_verified, status
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (staffError || !staffData) return { entity: null, perms: null };

      const center = staffData.imaging_centers as any;
      return {
        entity: center
          ? {
              id: center.id,
              name: center.name,
              phone: center.phone,
              email: center.email,
              address: center.address,
              city: center.city,
              country: center.country,
              is_verified: Boolean(center.is_verified),
              status: center.status ?? null,
            }
          : null,
        perms: {
          entity_id: staffData.imaging_center_id,
          staff_role: staffData.staff_role,
          status: staffData.status || 'active',
          can_view_orders: staffData.can_view_orders || false,
          can_process_scans: staffData.can_process_scans || false,
          can_upload_results: staffData.can_upload_results || false,
          can_verify_results: staffData.can_verify_results || false,
          can_manage_equipment: staffData.can_manage_equipment || false,
        },
      };
    } catch (err) {
      console.error('Error fetching imaging data:', err);
      return { entity: null, perms: null };
    }
  }, [user]);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setStaffType('unknown');
      setEntityInfo(null);
      setPermissions(null);
      setLoading(false);
      return;
    }

    if (rolesLoading) return;

    setLoading(true);
    setError(null);

    try {
      const type = determineStaffType();
      setStaffType(type);

      if (type === 'clinic') {
        const { entity, perms } = await fetchClinicData();
        setEntityInfo(entity);
        setPermissions(perms ? ({ ...perms, staffType: 'clinic' } as any) : null);
      } else if (type === 'pharmacy') {
        const { entity, perms } = await fetchPharmacyData();
        setEntityInfo(entity);
        setPermissions(perms ? ({ ...perms, staffType: 'pharmacy' } as any) : null);
      } else if (type === 'lab') {
        const { entity, perms } = await fetchLabData();
        setEntityInfo(entity);
        setPermissions(perms ? ({ ...perms, staffType: 'lab' } as any) : null);
      } else if (type === 'imaging') {
        const { entity, perms } = await fetchImagingData();
        setEntityInfo(entity);
        setPermissions(perms ? ({ ...perms, staffType: 'imaging' } as any) : null);
      } else {
        setEntityInfo(null);
        setPermissions(null);
      }

      // If we couldn't resolve anything, show a helpful error
      if (type !== 'unknown' && !entityInfo && !permissions) {
        // Not a hard error; many orgs may be missing a link in DB
      }
    } catch (err: any) {
      console.error('Error fetching staff context:', err);
      setError(err?.message || 'Failed to load staff context');
      setEntityInfo(null);
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  }, [
    user,
    rolesLoading,
    determineStaffType,
    fetchClinicData,
    fetchPharmacyData,
    fetchLabData,
    fetchImagingData,
    entityInfo,
    permissions,
  ]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    staffType,
    entityInfo,
    permissions,
    loading,
    error,
    isAdmin,
    refetch: fetchAll,
  };
};
