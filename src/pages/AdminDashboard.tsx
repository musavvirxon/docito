// PATH: src/pages/AdminDashboard.tsx
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import { inferRoleFromPathname } from "@/lib/rbac";
import { useAuth } from "@/contexts/AuthContext";
import AdminDashboardPage from "@/pages/AdminDashboardPage";

export default function AdminDashboard() {
  const loc = useLocation();
  const { activeRole } = useAuth();

  const role = useMemo<AppRole>(() => {
    const inferred = inferRoleFromPathname(loc.pathname);
    return (inferred ?? activeRole) as AppRole;
  }, [activeRole, loc.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={role} />
      <AdminDashboardPage />
    </div>
  );
}
