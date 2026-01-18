// File: src/pages/pharmacy/PharmacySettings.tsx
import { useMemo } from "react";
import EntitySettingsPage from "@/components/settings/EntitySettingsPage";
import { useStaffContext } from "@/hooks/useStaffContext";

export default function PharmacySettings() {
  const { staffType, permissions } = useStaffContext();

  const entityId = useMemo(() => {
    if (staffType !== "pharmacy") return null;
    return permissions?.entity_id || null;
  }, [permissions?.entity_id, staffType]);

  if (!entityId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No pharmacy is linked to this account.
      </div>
    );
  }

  return <EntitySettingsPage entityType="pharmacy" entityId={entityId} heading="Pharmacy Settings" />;
}
