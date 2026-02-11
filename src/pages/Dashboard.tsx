import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute, type AppRole } from "@/lib/rbac";

const Dashboard = () => {
  const { user, loading, allRoles, activeRole } = useAuth();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang?: string }>();

  const prefix = (path: string) => (lang ? `/${lang}${path}` : path);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate(prefix("/auth"), { replace: true });
      return;
    }

    const roles: AppRole[] =
      Array.isArray(allRoles) && allRoles.length > 0
        ? allRoles
        : [activeRole || "patient"];

    const target = getDashboardRoute(roles);
    navigate(prefix(target), { replace: true });
  }, [loading, user, allRoles, activeRole]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p>
      </div>
    </div>
  );
};

export default Dashboard;
