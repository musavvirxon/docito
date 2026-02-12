import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/rbac";

/**
 * Invisible component: when mounted, redirects authenticated users
 * from "/" to their role-based dashboard.
 */
export default function PostAuthRedirect() {
  const { user, profile, loading, allRoles, activeRole, bootstrapped } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!bootstrapped) return;
    if (loading) return; // Wait for role resolution
    if (!user || !profile) return;

    // Only redirect from root "/"
    if (loc.pathname !== "/") return;

    const target = getDashboardRoute(
      allRoles.length > 0 ? allRoles : [activeRole || "patient"],
    );
    nav(target, { replace: true });
  }, [user, profile, loading, bootstrapped, allRoles, activeRole, loc.pathname, nav]);

  return null;
}
