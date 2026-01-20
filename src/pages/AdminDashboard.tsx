// File: src/pages/AdminDashboard.tsx
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminDashboard() {
  const { activeRole, allRoles } = useAuth();
  const role = ((activeRole || allRoles?.[0] || "clinic_admin") as unknown) as AppRole;

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={role} />
      <AdminDashboardPage />
    </div>
  );
}
