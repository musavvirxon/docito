// src/components/auth/RoleProtectedRoute.tsx
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/lib/rbac";

type Props = {
  allowedRoles: AppRole[];            // roles allowed to view the route
  children: ReactNode;
  redirectTo?: string;               // optional override
};

export default function RoleProtectedRoute({
  allowedRoles,
  children,
  redirectTo = "/dashboard",
}: Props) {
  const { user, loading, allRoles } = useAuth();
  const location = useLocation();

  // while auth loads, render nothing (or loader if you want)
  if (loading) return null;

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  const ok = (allRoles || []).some((r) => allowedRoles.includes(r as AppRole));
  if (!ok) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
}
