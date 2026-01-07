import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLabCenter } from "@/hooks/useLabCenter";

export default function LabVerification() {
  const navigate = useNavigate();
  const { myLabCenter, fetchMyLabCenter, loading } = useLabCenter();

  useEffect(() => {
    fetchMyLabCenter();
  }, [fetchMyLabCenter]);

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
            <p className="text-muted-foreground">
              No lab center is linked to your account yet.
            </p>
            <Button onClick={() => navigate("/lab/register")}>Register Lab Center</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = myLabCenter.is_verified ? "Verified" : "Pending";

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
          <Badge variant="outline">{status}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">
            This page should show your verification state from the backend and the next steps.
          </p>

          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Ensure license number & address are correct</li>
            <li>Upload required compliance documents (next step)</li>
            <li>Wait for review by Super Admin</li>
          </ul>

          <Button variant="secondary" onClick={() => navigate("/lab/register")}>
            Update Lab Details
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
