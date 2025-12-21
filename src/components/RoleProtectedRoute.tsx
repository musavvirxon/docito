import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// Define all possible roles
export type AppRole = 
  | 'patient'
  | 'doctor'
  | 'admin'
  | 'super_admin'
  | 'staff'
  | 'clinic_staff'
  | 'pharmacy_admin'
  | 'pharmacy_staff'
  | 'lab_admin'
  | 'lab_staff'
  | 'imaging_admin'
  | 'imaging_staff';

// Define dashboard routes for each role
export const roleDashboardRoutes: Record<AppRole, string> = {
  patient: '/patient-dashboard',
  doctor: '/doctor-dashboard',
  admin: '/admin-dashboard',
  super_admin: '/super-admin-dashboard',
  staff: '/staff-dashboard',
  clinic_staff: '/staff-dashboard',
  pharmacy_admin: '/pharmacy/dashboard',
  pharmacy_staff: '/pharmacy/dashboard',
  lab_admin: '/lab/dashboard',
  lab_staff: '/lab/dashboard',
  imaging_admin: '/imaging/dashboard',
  imaging_staff: '/imaging/dashboard',
};

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  requireVerification?: boolean;
  redirectTo?: string;
}

/**
 * RoleProtectedRoute - Protects routes based on user roles from the user_roles table
 * 
 * @param allowedRoles - Array of roles that can access this route
 * @param requireVerification - Whether to require practice/doctor verification
 * @param redirectTo - Custom redirect path if access denied (defaults to appropriate dashboard)
 */
const RoleProtectedRoute = ({ 
  children, 
  allowedRoles, 
  requireVerification = false,
  redirectTo
}: RoleProtectedRouteProps) => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      // Wait for auth to load
      if (authLoading) return;

      // Not authenticated - redirect to auth
      if (!user) {
        navigate('/auth', { state: { from: location.pathname } });
        return;
      }

      // Wait for profile to load
      if (!profile) {
        return;
      }

      // Get user roles from user_roles table (stored in profile.roles)
      const userRoles = profile.roles || [];
      
      // Also check the legacy role from profiles table as fallback
      const legacyRole = profile.role as string;
      
      // Combine all roles
      const allUserRoles = [...new Set([...userRoles, legacyRole])];

      // Check if user has any of the allowed roles
      const hasAccess = allowedRoles.some(role => allUserRoles.includes(role));

      if (!hasAccess) {
        // Determine where to redirect based on user's actual role
        const redirectPath = redirectTo || getDefaultDashboard(allUserRoles);
        navigate(redirectPath, { replace: true });
        return;
      }

      setIsChecking(false);
    };

    checkAccess();
  }, [user, profile, authLoading, allowedRoles, navigate, location.pathname, redirectTo]);

  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Checking access...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Get the default dashboard route for a user based on their roles
 * Priority order: super_admin > admin > doctor > pharmacy > lab > imaging > staff > patient
 */
function getDefaultDashboard(roles: string[]): string {
  if (roles.includes('super_admin')) return '/super-admin-dashboard';
  if (roles.includes('admin')) return '/admin-dashboard';
  if (roles.includes('doctor')) return '/doctor-dashboard';
  if (roles.includes('pharmacy_admin')) return '/pharmacy/dashboard';
  if (roles.includes('pharmacy_staff')) return '/pharmacy/dashboard';
  if (roles.includes('lab_admin')) return '/lab/dashboard';
  if (roles.includes('lab_staff')) return '/lab/dashboard';
  if (roles.includes('imaging_admin')) return '/imaging/dashboard';
  if (roles.includes('imaging_staff')) return '/imaging/dashboard';
  if (roles.includes('clinic_staff') || roles.includes('staff')) return '/staff-dashboard';
  return '/patient-dashboard';
}

/**
 * Helper hook to check if user has specific role(s)
 */
export function useHasRole(requiredRoles: AppRole | AppRole[]): boolean {
  const { profile } = useAuth();
  
  if (!profile) return false;
  
  const userRoles = profile.roles || [];
  const legacyRole = profile.role as string;
  const allUserRoles = [...new Set([...userRoles, legacyRole])];
  
  const rolesToCheck = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return rolesToCheck.some(role => allUserRoles.includes(role));
}

/**
 * Get user's primary role (highest priority role)
 */
export function usePrimaryRole(): AppRole {
  const { profile } = useAuth();
  
  if (!profile) return 'patient';
  
  const userRoles = profile.roles || [];
  const legacyRole = profile.role as string;
  const allUserRoles = [...new Set([...userRoles, legacyRole])];
  
  // Return highest priority role
  const priorityOrder: AppRole[] = [
    'super_admin', 'admin', 'doctor', 
    'pharmacy_admin', 'lab_admin', 'imaging_admin',
    'pharmacy_staff', 'lab_staff', 'imaging_staff', 
    'clinic_staff', 'staff', 'patient'
  ];
  
  for (const role of priorityOrder) {
    if (allUserRoles.includes(role)) return role;
  }
  
  return 'patient';
}

export default RoleProtectedRoute;
