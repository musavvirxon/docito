// File: src/pages/pharmacy/PharmacyVerification.tsx
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EntityFileManager from "@/components/files/EntityFileManager";
import { useStaffContext } from "@/hooks/useStaffContext";

export default function PharmacyVerification() {
  const { staffType, permissions } = useStaffContext();

  const entityId = useMemo(() => {
    if (staffType !== "pharmacy") return null;
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
            No pharmacy is linked to this account.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pharmacy Verification</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Upload verification documents for your pharmacy. Draft is allowed.
        </CardContent>
      </Card>

      <EntityFileManager
        entityType="pharmacy"
        entityId={entityId}
        category="verification"
        title="Verification documents"
        description="Upload pharmacy license, registration certificate, and required compliance docs."
        accept=".pdf,.png,.jpg,.jpeg,.webp"
      />

      <EntityFileManager
        entityType="pharmacy"
        entityId={entityId}
        category="reports"
        title="Reports & attachments"
        description="Optional: sample labels, SOPs, or supporting docs."
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
      />
    </div>
  );
}
