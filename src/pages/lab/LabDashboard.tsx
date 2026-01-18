// File: src/pages/lab/LabDashboard.tsx
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import LabDashboardPage from "@/pages/lab/LabDashboardPage";

export default function LabDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={"lab_staff" as AppRole} />
      <LabDashboardPage />
    </div>
  );
}
