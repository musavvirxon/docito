import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/rbac";

const isAuthOrRoot = (path: string) => path === "/" || path === "/auth";

export default function PostAuthRedirect() {
  const { user, profile, loading, allRoles, activeRole } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) return;

    // Don’t force redirect if user is already inside the app somewhere
    if (!isAuthOrRoot(loc.pathname)) return;

    // default redirect is based on roles priority (not activeRole)
    const target = getDashboardRoute(allRoles);

    // if user manually set activeRole, let it win if it has a dashboard
    // (still safe; dashboards remain protected by RoleProtectedRoute)
    const activeTarget = getDashboardRoute([activeRole]);

    nav(activeTarget || target, { replace: true });
  }, [user, profile, loading, allRoles, activeRole, loc.pathname, nav]);

  return null;
}
