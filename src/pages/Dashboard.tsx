import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/rbac";

const Dashboard = () => {
  const { user, loading, activeRole } = useAuth();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang?: string }>();
  const hasRedirected = useRef(false);

  const prefix = (path: string) => (lang ? `/${lang}${path}` : path);

  useEffect(() => {
    if (loading) return;
    if (hasRedirected.current) return;

    if (!user) {
      hasRedirected.current = true;
      navigate(prefix("/auth"), { replace: true });
      return;
    }

    const target = getDashboardRoute([activeRole || "patient"]);
    hasRedirected.current = true;
    navigate(prefix(target), { replace: true });
  }, [loading, user, activeRole]);

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
