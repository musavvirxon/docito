import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  role: string | string[];
  children: React.ReactNode;
  redirectTo?: string; // default: /dashboard
};

export default function RoleProtectedRoute({
  role,
  children,
  redirectTo = "/dashboard",
}: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    const checkRole = async () => {
      if (!user) {
        if (!mounted) return;
        setAllowed(false);
        setChecking(false);
        return;
      }

      setChecking(true);

      try {
        const roles = Array.isArray(role) ? role : [role];

        // ✅ Source of truth: user_roles table
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", roles);

        if (error) {
          console.error("Role check error:", error);
          if (!mounted) return;
          setAllowed(false);
        } else {
          if (!mounted) return;
          setAllowed((data?.length ?? 0) > 0);
        }
      } catch (e) {
        console.error("Role check exception:", e);
        if (!mounted) return;
        setAllowed(false);
      } finally {
        if (!mounted) return;
        setChecking(false);
      }
    };

    checkRole();

    return () => {
      mounted = false;
    };
  }, [user?.id, role]);

  // Auth loading
  if (loading || checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  // Signed in but not allowed
  if (!allowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
