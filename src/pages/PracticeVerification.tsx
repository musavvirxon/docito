// File: src/pages/PracticeVerification.tsx
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EntityFileManager from "@/components/files/EntityFileManager";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";

export default function PracticeVerification() {
  const { practice } = useAdminDashboard();

  const entityId = useMemo(() => practice?.id || null, [practice?.id]);
  const status = practice?.verification_status || "pending";

  if (!entityId) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Verification</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No practice is linked to this account.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Practice Verification</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Current status: <span className="font-medium">{status}</span>. Upload your verification documents below.
        </CardContent>
      </Card>

      <EntityFileManager
        entityType="practice"
        entityId={entityId}
        category="verification"
        title="Verification documents"
        description="Upload trade license, registration certificate, and other required documents. Draft is allowed."
        accept=".pdf,.png,.jpg,.jpeg,.webp"
      />

      <EntityFileManager
        entityType="practice"
        entityId={entityId}
        category="reports"
        title="Reports & attachments"
        description="Optional: upload sample reports or supporting files."
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
      />
    </div>
  );
}
