// File: src/components/auth/RoleRouteSync.tsx
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { inferRoleFromPathname, type AppRole } from "@/lib/rbac";

export default function RoleRouteSync() {
  const location = useLocation();
  const { allRoles, activeRole, setActiveRoleSilently } = useAuth();

  const inferred: AppRole | null = useMemo(() => inferRoleFromPathname(location.pathname), [location.pathname]);

  useEffect(() => {
    if (!inferred) return;

    // Only sync if user actually has the role (or roles not loaded yet).
    if (allRoles.length > 0 && !allRoles.includes(inferred)) return;

    if (activeRole !== inferred) {
      setActiveRoleSilently(inferred);
    }
  }, [activeRole, allRoles, inferred, setActiveRoleSilently]);

  return null;
}
