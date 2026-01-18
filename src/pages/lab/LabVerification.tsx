// File: src/pages/lab/LabVerification.tsx

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLabCenter } from "@/hooks/useLabCenter";
import FacilityVerificationForm from "@/components/verification/FacilityVerificationForm";

export default function LabVerification() {
  const navigate = useNavigate();
  const { myLabCenter, loading } = useLabCenter();

  const entityName = useMemo(() => myLabCenter?.name ?? null, [myLabCenter?.id]);
  const entityVerified = useMemo(() => Boolean(myLabCenter?.is_verified), [myLabCenter?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!myLabCenter) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Lab Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">No lab center is linked to your account yet.</p>
            <Button onClick={() => navigate("/lab/register")}>Register Lab Center</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FacilityVerificationForm
      title="Lab Verification"
      facilityType="lab"
      facilityId={myLabCenter.id}
      entityName={entityName}
      entityVerified={entityVerified}
      onBack={() => navigate("/lab/dashboard")}
      onUpdateDetails={() => navigate("/lab/register")}
    />
  );
}
