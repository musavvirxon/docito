import React, { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/rbac";
import { useTranslation } from "react-i18next";

const Dashboard = React.forwardRef<HTMLDivElement>(function Dashboard(_props, ref) {
  const { t } = useTranslation('dashboard');
  const { user, loading, activeRole, bootstrapped } = useAuth();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang?: string }>();
  const hasRedirected = useRef(false);

  const prefix = (path: string) => (lang ? `/${lang}${path}` : path);

  useEffect(() => {
    // Reset redirect guard when bootstrapped changes to allow re-evaluation
    hasRedirected.current = false;
  }, [bootstrapped]);

  useEffect(() => {
    if (!bootstrapped) return;
    if (loading) return; // CRITICAL: wait for role resolution to complete
    if (hasRedirected.current) return;

    if (!user) {
      hasRedirected.current = true;
      navigate(prefix("/auth"), { replace: true });
      return;
    }

    const target = getDashboardRoute([activeRole || "patient"]);
    console.log("[Dashboard] Redirecting to", target, "activeRole=", activeRole);
    hasRedirected.current = true;
    navigate(prefix(target), { replace: true });
  }, [bootstrapped, loading, user, activeRole, navigate, lang]);

  return (
    <div ref={ref} className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p>
      </div>
    </div>
  );
});

export default Dashboard;
