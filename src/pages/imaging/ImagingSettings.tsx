// File: src/pages/imaging/ImagingSettings.tsx

import { useMemo } from "react";
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import EntitySettingsPage from "@/components/settings/EntitySettingsPage";
import { useStaffContext } from "@/hooks/useStaffContext";

export default function ImagingSettings() {
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
      <EntitySettingsPage
        entityType="imaging"
        entityId={entityId}
        heading="Imaging Settings"
      />
    </div>
  );
}
