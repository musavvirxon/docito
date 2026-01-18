// File: src/pages/imaging/ImagingVerification.tsx
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EntityFileManager from "@/components/files/EntityFileManager";
import { useStaffContext } from "@/hooks/useStaffContext";

export default function ImagingVerification() {
  const { staffType, permissions } = useStaffContext();

  const entityId = useMemo(() => {
    if (staffType !== "imaging") return null;
    return permissions?.entity_id || null;
  }, [permissions?.entity_id, staffType]);

  if (!entityId) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Verification</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No imaging center is linked to this account.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Imaging Center Verification</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Upload verification documents for your imaging center. Draft is allowed.
        </CardContent>
      </Card>

      <EntityFileManager
        entityType="imaging"
        entityId={entityId}
        category="verification"
        title="Verification documents"
        description="Upload facility license, registrations, and required accreditations."
        accept=".pdf,.png,.jpg,.jpeg,.webp"
      />

      <EntityFileManager
        entityType="imaging"
        entityId={entityId}
        category="reports"
        title="Reports & attachments"
        description="Optional: sample imaging reports, SOPs, or supporting docs."
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
      />
    </div>
  );
}
