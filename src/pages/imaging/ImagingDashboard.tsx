// File: src/pages/imaging/ImagingDashboard.tsx
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import ImagingDashboardPage from "@/pages/imaging/ImagingDashboardPage";

export default function ImagingDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={"imaging_staff" as AppRole} />
      <ImagingDashboardPage />
    </div>
  );
}
