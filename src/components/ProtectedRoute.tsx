// File: src/components/ProtectedRoute.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { AppRole } from "@/lib/rbac";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerification?: boolean;
}

const ADMIN_ROLES: AppRole[] = ["admin", "clinic_admin", "super_admin"];

export default function ProtectedRoute({ children, requireVerification = false }: ProtectedRouteProps) {
  const { user, loading: authLoading, allRoles, activeRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;

      if (!user) {
        navigate("/auth");
        return;
      }

      const roles = (allRoles || []) as AppRole[];
      const effectiveRole = (activeRole || roles[0] || "patient") as AppRole;

      const isAdmin = roles.some((r) => ADMIN_ROLES.includes(r)) || ADMIN_ROLES.includes(effectiveRole);
      if (!isAdmin) {
        navigate("/auth");
        return;
      }

      if (requireVerification) {
        // Use RPC that works for both practice owners (admin_id) and clinic staff/admin (practice_staff).
        const { data: practiceId, error: pidErr } = await supabase.rpc("get_my_primary_practice_id" as any);
        if (pidErr || !practiceId) {
          navigate("/practice-verification");
          return;
        }

        const { data: practice, error } = await supabase
          .from("practices")
          .select("verification_status")
          .eq("id", practiceId as string)
          .maybeSingle();

        if (error || !practice) {
          navigate("/practice-verification");
          return;
        }

        if (String(practice.verification_status || "").toLowerCase() !== "verified") {
          navigate("/practice-verification");
          return;
        }
      }
    };

    void checkAccess();
  }, [activeRole, allRoles, authLoading, navigate, requireVerification, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
