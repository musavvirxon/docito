// File: src/pages/lab/LabVerification.tsx

import { useMemo } from "react";
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import EntityFileManager from "@/components/verification/EntityFileManager";
import { useStaffContext } from "@/hooks/useStaffContext";
import { useTranslation } from "react-i18next";

export default function LabVerification() {
  const { t } = useTranslation('labAdminDashboard');
  const { staffType, permissions } = useStaffContext();

  const entityId = useMemo(() => {
    if (staffType !== "lab") return null;
    return permissions?.entity_id || null;
  }, [permissions?.entity_id, staffType]);

  if (!entityId) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardTopNav role={"lab_staff" as AppRole} />
        <div className="p-6 text-sm text-muted-foreground">
          No lab center is linked to this account.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={"lab_staff" as AppRole} />
      <div className="p-6">
        <EntityFileManager entityType="lab" entityId={entityId} heading="Lab Verification" />
      </div>
    </div>
  );
}
