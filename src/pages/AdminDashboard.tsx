// File: src/pages/AdminDashboard.tsx
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import AdminDashboardPage from "@/pages/AdminDashboardPage";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={"admin" as AppRole} />
      <AdminDashboardPage />
    </div>
  );
}
