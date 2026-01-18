// File: src/pages/pharmacy/PharmacyVerification.tsx

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePharmacy } from "@/hooks/usePharmacy";
import FacilityVerificationForm from "@/components/verification/FacilityVerificationForm";

export default function PharmacyVerification() {
  const navigate = useNavigate();
  const { pharmacy, loading } = usePharmacy();

  const entityName = useMemo(() => pharmacy?.name ?? null, [pharmacy?.id]);
  const entityVerified = useMemo(() => Boolean((pharmacy as any)?.verified), [pharmacy?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Pharmacy Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">No pharmacy is linked to your account yet.</p>
            <Button onClick={() => navigate("/pharmacy/register")}>Register Pharmacy</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FacilityVerificationForm
      title="Pharmacy Verification"
      facilityType="pharmacy"
      facilityId={pharmacy.id}
      entityName={entityName}
      entityVerified={entityVerified}
      onBack={() => navigate("/pharmacy/dashboard")}
      onUpdateDetails={() => navigate("/pharmacy/register")}
    />
  );
}
