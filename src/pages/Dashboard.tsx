import { useEffect, forwardRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute, type AppRole } from "@/lib/rbac";

const Dashboard = forwardRef<HTMLDivElement>((_props, ref) => {
  const { user, loading, allRoles, activeRole } = useAuth();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang?: string }>();

  const prefix = (path: string) => (lang ? `/${lang}${path}` : path);

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // Not logged in → send to auth
    if (!user) {
      navigate(prefix("/auth"), { replace: true });
      return;
    }

    // Determine target dashboard from roles
    const roles: AppRole[] =
      Array.isArray(allRoles) && allRoles.length > 0
        ? allRoles
        : [activeRole || "patient"];

    const target = getDashboardRoute(roles);
    navigate(prefix(target), { replace: true });
  }, [loading, user, allRoles, activeRole]);

  // Always render a visible loading state so the page is never blank
  return (
    <div ref={ref} className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p>
      </div>
    </div>
  );
});

Dashboard.displayName = "Dashboard";

export default Dashboard;
