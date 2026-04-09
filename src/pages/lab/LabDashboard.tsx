// File: src/pages/lab/LabDashboard.tsx
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import LabDashboardPage from "@/pages/lab/LabDashboardPage";
import { useTranslation } from "react-i18next";

export default function LabDashboard() {
  const { t } = useTranslation('labAdminDashboard');
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={"lab_staff" as AppRole} />
      <LabDashboardPage />
    </div>
  );
}
