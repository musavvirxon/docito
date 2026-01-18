// File: src/pages/PracticeSettings.tsx
import { useMemo } from "react";
import EntitySettingsPage from "@/components/settings/EntitySettingsPage";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";

export default function PracticeSettings() {
  const { practice } = useAdminDashboard();

  const entityId = useMemo(() => practice?.id || null, [practice?.id]);

  if (!entityId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No practice is linked to this account.
      </div>
    );
  }

  return <EntitySettingsPage entityType="practice" entityId={entityId} heading="Practice Settings" />;
}
