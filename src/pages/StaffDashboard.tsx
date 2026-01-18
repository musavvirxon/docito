// File: src/pages/StaffDashboard.tsx
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import StaffDashboardPage from "@/pages/StaffDashboardPage";

export default function StaffDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={"staff" as AppRole} showSettings={false} />
      <StaffDashboardPage />
    </div>
  );
}
