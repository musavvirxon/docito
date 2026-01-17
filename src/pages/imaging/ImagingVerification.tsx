// File: src/pages/imaging/ImagingVerification.tsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useImagingCenter } from "@/hooks/useImagingCenter";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardTopBar } from "@/hooks/useDashboardTopBar";
import { toast } from "@/hooks/use-toast";

export default function ImagingVerification() {
  const navigate = useNavigate();
  const { myImagingCenter, loading } = useImagingCenter();
  const { activeRole } = useAuth();
  const topbar = useDashboardTopBar(activeRole);
  const [submitting, setSubmitting] = useState(false);

  const statusLabel = useMemo(() => {
    if (!myImagingCenter) return "Pending";
    if (myImagingCenter.is_verified) return "Verified";
    if (myImagingCenter.status === "suspended") return "Suspended";
    return "Pending";
  }, [myImagingCenter]);

  const canSubmit = Boolean(myImagingCenter && !myImagingCenter.is_verified);

  const onSubmit = async () => {
    try {
      if (!canSubmit) return;
      setSubmitting(true);
      await topbar.requestVerification("Imaging center verification request submitted from dashboard.");
      toast({ title: "Submitted", description: "Verification request sent. A reviewer will contact you if needed." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to submit verification request", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

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
            <p className="text-muted-foreground">No imaging center is linked to your account yet.</p>
            <Button onClick={() => navigate("/imaging/register")}>Register Imaging Center</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Imaging Center Verification</h1>
        <Button variant="outline" onClick={() => navigate("/imaging/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{myImagingCenter.name}</CardTitle>
          <Badge variant="outline">{statusLabel}</Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Submit a verification request to enable public visibility and unlock full platform features.
          </p>

          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Confirm license number & modalities</li>
            <li>Ensure contact info is accurate</li>
            <li>Submit request for Super Admin review</li>
          </ul>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate("/imaging/register")}>
              Update Center Details
            </Button>

            <Button onClick={onSubmit} disabled={!canSubmit || submitting}>
              {submitting ? "Submitting..." : myImagingCenter.is_verified ? "Already Verified" : "Submit Verification Request"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
