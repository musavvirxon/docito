// File: src/pages/lab/LabSettings.tsx
import { useMemo } from "react";
import EntitySettingsPage from "@/components/settings/EntitySettingsPage";
import { useStaffContext } from "@/hooks/useStaffContext";

export default function LabSettings() {
  const { staffType, permissions } = useStaffContext();

  const entityId = useMemo(() => {
    if (staffType !== "lab") return null;
    return permissions?.entity_id || null;
  }, [permissions?.entity_id, staffType]);

  if (!entityId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No lab center is linked to this account.
      </div>
    );
  }

  return <EntitySettingsPage entityType="lab" entityId={entityId} heading="Lab Settings" />;
}
