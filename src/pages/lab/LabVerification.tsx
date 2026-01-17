// File: src/pages/lab/LabVerification.tsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLabCenter } from "@/hooks/useLabCenter";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardTopBar } from "@/hooks/useDashboardTopBar";
import { toast } from "@/hooks/use-toast";

export default function LabVerification() {
  const navigate = useNavigate();
  const { myLabCenter, loading } = useLabCenter();
  const { activeRole } = useAuth();
  const topbar = useDashboardTopBar(activeRole);
  const [submitting, setSubmitting] = useState(false);

  const statusLabel = useMemo(() => {
    if (!myLabCenter) return "Pending";
    if (myLabCenter.is_verified) return "Verified";
    if (myLabCenter.status === "suspended") return "Suspended";
    return "Pending";
  }, [myLabCenter]);

  const canSubmit = Boolean(myLabCenter && !myLabCenter.is_verified);

  const onSubmit = async () => {
    try {
      if (!canSubmit) return;
      setSubmitting(true);
      await topbar.requestVerification("Lab verification request submitted from dashboard.");
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
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Lab Verification</h1>
        <Button variant="outline" onClick={() => navigate("/lab/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{myLabCenter.name}</CardTitle>
          <Badge variant="outline">{statusLabel}</Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Submit a verification request to enable public visibility and unlock full platform features.
          </p>

          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Confirm license number & accreditation details</li>
            <li>Ensure contact info is accurate</li>
            <li>Submit request for Super Admin review</li>
          </ul>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate("/lab/register")}>
              Update Lab Details
            </Button>

            <Button onClick={onSubmit} disabled={!canSubmit || submitting}>
              {submitting ? "Submitting..." : myLabCenter.is_verified ? "Already Verified" : "Submit Verification Request"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
