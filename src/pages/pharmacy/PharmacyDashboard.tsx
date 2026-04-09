import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import PharmacyDashboardPage from "@/pages/pharmacy/PharmacyDashboardPage";
import { useTranslation } from "react-i18next";

export default function PharmacyDashboard() {
  const { t } = useTranslation('pharmacyAdminDashboard');
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={"pharmacy_staff" as AppRole} />
      <PharmacyDashboardPage />
    </div>
  );
}
