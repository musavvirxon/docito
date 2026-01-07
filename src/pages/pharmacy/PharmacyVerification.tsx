import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePharmacy } from "@/hooks/usePharmacy";

export default function PharmacyVerification() {
  const navigate = useNavigate();
  const { pharmacies, loading } = usePharmacy();

  const pharmacy = pharmacies?.[0];

  useEffect(() => {
    // usePharmacy auto-fetches on user change
  }, []);

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
            <p className="text-muted-foreground">
              No pharmacy is linked to your account yet.
            </p>
            <Button onClick={() => navigate("/pharmacy/register")}>Register Pharmacy</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = pharmacy.verified ? "Verified" : (pharmacy.verification_status || "Pending");

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Pharmacy Verification</h1>
        <Button variant="outline" onClick={() => navigate("/pharmacy/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{pharmacy.name}</CardTitle>
          <Badge variant="outline">{String(status)}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">
            This page shows your pharmacy verification status from backend and next steps.
          </p>

          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Confirm license number & tax ID</li>
            <li>Upload pharmacy license / compliance docs (next step)</li>
            <li>Wait for Super Admin review</li>
          </ul>

          <Button variant="secondary" onClick={() => navigate("/pharmacy/register")}>
            Update Pharmacy Details
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
