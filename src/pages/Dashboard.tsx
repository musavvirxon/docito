import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute, type AppRole } from "@/lib/rbac";

const Dashboard = () => {
  const { user, loading, allRoles, activeRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useParams<{ lang?: string }>();

  const withLang = (path: string) => {
    if (!lang) return path;
    if (!path.startsWith("/")) return `/${lang}/${path}`;
    if (path === "/") return `/${lang}`;
    if (path.startsWith(`/${lang}/`) || path === `/${lang}`) return path;
    return `/${lang}${path}`;
  };

  const returnTo = useMemo(() => {
    const p = location.pathname + location.search + location.hash;
    return encodeURIComponent(p);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate(withLang(`/auth?returnTo=${returnTo}`), { replace: true });
      return;
    }

    const roles: AppRole[] = (Array.isArray(allRoles) && allRoles.length > 0 ? allRoles : [activeRole]).filter(
      Boolean,
    ) as AppRole[];

    if (!roles || roles.length === 0) return;

    const target = withLang(getDashboardRoute(roles));
    navigate(target, { replace: true });
  }, [loading, user, allRoles, activeRole, navigate, returnTo]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading dashboard…</span>
      </div>
    </div>
  );
};

export default Dashboard;
