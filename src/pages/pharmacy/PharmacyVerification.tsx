// File: src/pages/pharmacy/PharmacyVerification.tsx

import { useMemo } from "react";
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import EntityFileManager from "@/components/verification/EntityFileManager";
import { useStaffContext } from "@/hooks/useStaffContext";

export default function PharmacyVerification() {
  const { staffType, permissions } = useStaffContext();

  const entityId = useMemo(() => {
    if (staffType !== "pharmacy") return null;
    return permissions?.entity_id || null;
  }, [permissions?.entity_id, staffType]);

  if (!entityId) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardTopNav role={"pharmacy_staff" as AppRole} />
        <div className="p-6 text-sm text-muted-foreground">
          No pharmacy is linked to this account.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={"pharmacy_staff" as AppRole} />
      <div className="p-6">
        <EntityFileManager
          entityType="pharmacy"
          entityId={entityId}
          heading="Pharmacy Verification"
        />
      </div>
    </div>
  );
}
