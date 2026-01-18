// File: src/pages/pharmacy/PharmacyDashboard.tsx
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import PharmacyDashboardPage from "@/pages/pharmacy/PharmacyDashboardPage";

export default function PharmacyDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={"pharmacy_staff" as AppRole} />
      <PharmacyDashboardPage />
    </div>
  );
}
