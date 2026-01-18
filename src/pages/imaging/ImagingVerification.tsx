// File: src/pages/imaging/ImagingVerification.tsx

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useImagingCenter } from "@/hooks/useImagingCenter";
import FacilityVerificationForm from "@/components/verification/FacilityVerificationForm";

export default function ImagingVerification() {
  const navigate = useNavigate();
  const { myImagingCenter, loading } = useImagingCenter();

  const entityName = useMemo(() => myImagingCenter?.name ?? null, [myImagingCenter?.id]);
  const entityVerified = useMemo(() => Boolean(myImagingCenter?.is_verified), [myImagingCenter?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!myImagingCenter) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Imaging Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">No imaging center is linked to your account yet.</p>
            <Button onClick={() => navigate("/imaging/register")}>Register Imaging Center</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FacilityVerificationForm
      title="Imaging Center Verification"
      facilityType="imaging"
      facilityId={myImagingCenter.id}
      entityName={entityName}
      entityVerified={entityVerified}
      onBack={() => navigate("/imaging/dashboard")}
      onUpdateDetails={() => navigate("/imaging/register")}
    />
  );
}
