import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useImagingCenter } from "@/hooks/useImagingCenter";

export default function ImagingVerification() {
  const navigate = useNavigate();
  const { myImagingCenter, fetchMyImagingCenter, loading } = useImagingCenter();

  useEffect(() => {
    fetchMyImagingCenter();
  }, [fetchMyImagingCenter]);

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
            <CardTitle>Imaging Center Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              No imaging center is linked to your account yet.
            </p>
            <Button onClick={() => navigate("/imaging/register")}>Register Imaging Center</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status =
    myImagingCenter.is_verified ? "Verified" : (myImagingCenter.status || "Pending");

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Imaging Verification</h1>
        <Button variant="outline" onClick={() => navigate("/imaging/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{myImagingCenter.name}</CardTitle>
          <Badge variant="outline">{String(status)}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">
            This page shows your imaging center verification status from backend and next steps.
          </p>

          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Confirm modalities and accreditations</li>
            <li>Upload imaging facility documents (next step)</li>
            <li>Wait for Super Admin review</li>
          </ul>

          <Button variant="secondary" onClick={() => navigate("/imaging/register")}>
            Update Imaging Details
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
