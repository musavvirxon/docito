// File: src/pages/lab/LabVerification.tsx
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EntityFileManager from "@/components/files/EntityFileManager";
import { useStaffContext } from "@/hooks/useStaffContext";

export default function LabVerification() {
  const { staffType, permissions } = useStaffContext();

  const entityId = useMemo(() => {
    if (staffType !== "lab") return null;
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
            No lab center is linked to this account.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lab Verification</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Upload verification documents for your lab. Draft is allowed.
        </CardContent>
      </Card>

      <EntityFileManager
        entityType="lab"
        entityId={entityId}
        category="verification"
        title="Verification documents"
        description="Upload trade license, registration certificate, and required lab accreditations."
        accept=".pdf,.png,.jpg,.jpeg,.webp"
      />

      <EntityFileManager
        entityType="lab"
        entityId={entityId}
        category="reports"
        title="Reports & attachments"
        description="Optional: sample reports, SOPs, or other supporting docs."
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
      />
    </div>
  );
}
