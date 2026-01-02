import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// All available roles in the system - must match app_role enum in database
export type AppRole = 
  | 'patient'
  | 'doctor'
  | 'admin'
  | 'staff'
  | 'super_admin'
  | 'receptionist'
  | 'nurse'
  | 'billing_manager'
  | 'pharmacist'
  | 'lab_technician'
  | 'internal_lab_tech'
  | 'internal_imaging_tech'
  | 'clinic_admin'
  | 'clinic_staff'
  | 'pharmacy_admin'
  | 'pharmacy_staff'
  | 'lab_admin'
  | 'lab_staff'
  | 'imaging_admin'
  | 'imaging_staff';

// Dashboard routes for each role
export const roleDashboardRoutes: Record<AppRole, string> = {
  super_admin: '/super-admin-dashboard',
  admin: '/practice-dashboard',
  clinic_admin: '/practice-dashboard',
  pharmacy_admin: '/pharmacy/dashboard',
  lab_admin: '/lab/dashboard',
  imaging_admin: '/imaging-center/dashboard',
  doctor: '/doctor-dashboard',
  clinic_staff: '/staff-dashboard',
  pharmacy_staff: '/pharmacy/dashboard',
  lab_staff: '/lab/dashboard',
  imaging_staff: '/imaging-center/dashboard',
  receptionist: '/staff-dashboard',
  nurse: '/staff-dashboard',
  billing_manager: '/staff-dashboard',
  pharmacist: '/pharmacy/dashboard',
  lab_technician: '/lab/dashboard',
  internal_lab_tech: '/lab/dashboard',
  internal_imaging_tech: '/imaging-center/dashboard',
  staff: '/staff-dashboard',
  patient: '/patient-dashboard',
};

// Role priority for determining primary role (lower = higher priority)
const rolePriority: Record<AppRole, number> = {
  super_admin: 1,
  admin: 2,
  clinic_admin: 3,
  pharmacy_admin: 4,
  lab_admin: 5,
  imaging_admin: 6,
  doctor: 7,
  clinic_staff: 8,
  pharmacy_staff: 9,
  lab_staff: 10,
  imaging_staff: 11,
  receptionist: 12,
  nurse: 13,
  billing_manager: 14,
  pharmacist: 15,
  lab_technician: 16,
  internal_lab_tech: 17,
  internal_imaging_tech: 18,
  staff: 19,
  patient: 20,
};

interface UseUserRolesReturn {
  roles: AppRole[];
  primaryRole: AppRole | null;
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  getDashboardRoute: () => string;
  refetch: () => Promise<void>;
}

export const useUserRoles = (): UseUserRolesReturn => {
  const { user, profile } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      // First check if roles are already in profile
      if (profile?.roles && profile.roles.length > 0) {
        setRoles(profile.roles as AppRole[]);
        setLoading(false);
        return;
      }

      // Otherwise fetch from database
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      const userRoles = data?.map(r => r.role as AppRole) || [];
      
      // If no roles in user_roles table, fall back to profile.role
      if (userRoles.length === 0 && profile?.role) {
        setRoles([profile.role as AppRole]);
      } else {
        setRoles(userRoles);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      // Fall back to profile.role if available
      if (profile?.role) {
        setRoles([profile.role as AppRole]);
      } else {
        setRoles(['patient']);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [user, profile]);

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  const hasAnyRole = (checkRoles: AppRole[]): boolean => {
    return checkRoles.some(role => roles.includes(role));
  };

  const getPrimaryRole = (): AppRole | null => {
    if (roles.length === 0) return null;
    
    // Sort by priority and return the highest priority role
    return roles.reduce((primary, current) => {
      const primaryPriority = rolePriority[primary] || 999;
      const currentPriority = rolePriority[current] || 999;
      return currentPriority < primaryPriority ? current : primary;
    });
  };

  const getDashboardRoute = (): string => {
    const primary = getPrimaryRole();
    if (!primary) return '/patient-dashboard';
    return roleDashboardRoutes[primary] || '/patient-dashboard';
  };

  return {
    roles,
    primaryRole: getPrimaryRole(),
    loading,
    hasRole,
    hasAnyRole,
    getDashboardRoute,
    refetch: fetchRoles,
  };
};
