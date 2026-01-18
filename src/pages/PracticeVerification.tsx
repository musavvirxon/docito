// File: src/pages/PracticeVerification.tsx

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePractice } from "@/hooks/usePractice";
import FacilityVerificationForm from "@/components/verification/FacilityVerificationForm";

export default function PracticeVerification() {
  const navigate = useNavigate();
  const { practice, loading } = usePractice();

  const entityName = useMemo(() => practice?.name ?? null, [practice?.id]);
  const entityVerified = useMemo(() => Boolean((practice as any)?.is_verified), [practice?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Clinic Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">No clinic/practice is linked to your account yet.</p>
            <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FacilityVerificationForm
      title="Clinic Verification"
      facilityType="practice"
      facilityId={practice.id}
      entityName={entityName}
      entityVerified={entityVerified}
      onBack={() => navigate("/dashboard")}
      onUpdateDetails={() => navigate("/practice")}
    />
  );
}
