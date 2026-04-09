// File: src/pages/PracticeSettings.tsx

import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import EntitySettingsPage from "@/components/settings/EntitySettingsPage";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { useTranslation } from "react-i18next";

export default function PracticeSettings() {
  const { t } = useTranslation('dashboard');
  const { practice } = useAdminDashboard();

  if (!practice?.id) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardTopNav role={"admin" as AppRole} />
        <div className="p-6 text-sm text-muted-foreground">
          No practice is linked to this account.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={"admin" as AppRole} />
      <EntitySettingsPage
        entityType="practice"
        entityId={practice.id}
        heading="Practice Settings"
      />
    </div>
  );
}
