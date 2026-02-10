import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/rbac";

// Only redirect from root page, NOT from /auth (user may want to stay on auth page)
const isAuthOrRoot = (path: string) => path === "/";

export default function PostAuthRedirect() {
  const { user, profile, loading, allRoles, activeRole } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) return;

    // Don't force redirect if user is already inside the app somewhere
    if (!isAuthOrRoot(loc.pathname)) return;

    // If user has no roles yet (edge case), redirect to patient dashboard
    if (!allRoles || allRoles.length === 0) {
      nav("/patient-dashboard", { replace: true });
      return;
    }

    // Redirect to active role's dashboard (primary role by default)
    const target = getDashboardRoute([activeRole]);
    nav(target, { replace: true });
  }, [user, profile, loading, allRoles, activeRole, loc.pathname, nav]);

  return null;
}
