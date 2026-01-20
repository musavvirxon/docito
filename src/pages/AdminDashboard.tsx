// PATH: src/pages/AdminDashboard.tsx
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import { useAuth } from "@/contexts/AuthContext";
import { inferRoleFromPathname, type AppRole, getPrimaryRole } from "@/lib/rbac";

export default function AdminDashboard() {
  const location = useLocation();
  const { allRoles, activeRole } = useAuth();

  const resolvedRole = useMemo<AppRole>(() => {
    const inferred = inferRoleFromPathname(location.pathname);
    if (inferred && allRoles.length > 0 && allRoles.includes(inferred)) return inferred;

    if (activeRole) return activeRole as AppRole;

    if (allRoles.length > 0) return getPrimaryRole(allRoles as AppRole[]);

    return "admin";
  }, [activeRole, allRoles, location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={resolvedRole} />
      <AdminDashboardPage />
    </div>
  );
}
