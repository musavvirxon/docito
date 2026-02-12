import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { DASHBOARD_ROUTES, getPrimaryRole, type AppRole } from '@/lib/rbac';

// Re-export AppRole for convenience
export type { AppRole } from '@/lib/rbac';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  requireVerification?: boolean;
  redirectTo?: string;
}

/**
 * RoleProtectedRoute - Protects routes based on user roles from AuthContext (user_roles table).
 * CRITICAL: Uses allRoles/activeRole from AuthContext, NOT profile.roles (legacy/empty).
 */
const RoleProtectedRoute = ({ 
  children, 
  allowedRoles, 
  requireVerification = false,
  redirectTo
}: RoleProtectedRouteProps) => {
  const { user, loading: authLoading, bootstrapped, allRoles, activeRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for full auth bootstrap (roles resolved)
    if (!bootstrapped || authLoading) return;

    // Not authenticated
    if (!user) {
      navigate('/auth', { state: { from: location.pathname }, replace: true });
      return;
    }

    // Check if user has any of the allowed roles
    const hasAccess = allowedRoles.some(role => allRoles.includes(role));

    if (!hasAccess) {
      const redirectPath = redirectTo || DASHBOARD_ROUTES[activeRole] || '/dashboard';
      navigate(redirectPath, { replace: true });
      return;
    }

    setIsChecking(false);
  }, [user, authLoading, bootstrapped, allRoles, activeRole, allowedRoles, navigate, location.pathname, redirectTo]);

  if (!bootstrapped || authLoading || isChecking) {
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
 * Helper hook to check if user has specific role(s).
 * Uses allRoles from AuthContext (user_roles table), NOT profile.roles.
 */
export function useHasRole(requiredRoles: AppRole | AppRole[]): boolean {
  const { allRoles } = useAuth();
  const rolesToCheck = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return rolesToCheck.some(role => allRoles.includes(role));
}

/**
 * Get user's active/primary role from AuthContext.
 */
export function usePrimaryRole(): AppRole {
  const { activeRole } = useAuth();
  return activeRole;
}

export default RoleProtectedRoute;