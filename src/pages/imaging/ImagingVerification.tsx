// File: src/pages/imaging/ImagingVerification.tsx

import { useMemo } from "react";
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import EntityFileManager from "@/components/verification/EntityFileManager";
import { useStaffContext } from "@/hooks/useStaffContext";
import { useTranslation } from "react-i18next";

export default function ImagingVerification() {
  const { t } = useTranslation('imagingAdminDashboard');
  const { staffType, permissions } = useStaffContext();

  const entityId = useMemo(() => {
    if (staffType !== "imaging") return null;
    return permissions?.entity_id || null;
  }, [permissions?.entity_id, staffType]);

  if (!entityId) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardTopNav role={"imaging_staff" as AppRole} />
        <div className="p-6 text-sm text-muted-foreground">
          No imaging center is linked to this account.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={"imaging_staff" as AppRole} />
      <div className="p-6">
        <EntityFileManager
          entityType="imaging"
          entityId={entityId}
          heading="Imaging Verification"
        />
      </div>
    </div>
  );
}
