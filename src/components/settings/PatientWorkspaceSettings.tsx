import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  User, Heart, Shield, CreditCard, Users, Loader2, Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export function PatientWorkspaceSettings() {
  const navigate = useNavigate();
  const [loading] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Family Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Family Members / Dependents
          </CardTitle>
          <CardDescription>Manage profiles for children or dependents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No dependents added yet</p>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Family Member
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Insurance Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Insurance Information
          </CardTitle>
          <CardDescription>Your insurance details for claims</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Insurance Provider</Label>
              <Input placeholder="e.g., Blue Cross" />
            </div>
            <div className="space-y-2">
              <Label>Policy Number</Label>
              <Input placeholder="Policy ID" />
            </div>
            <div className="space-y-2">
              <Label>Group Number</Label>
              <Input placeholder="Group ID (if applicable)" />
            </div>
            <div className="space-y-2">
              <Label>Member ID</Label>
              <Input placeholder="Member ID" />
            </div>
          </div>
          <Button variant="outline">Save Insurance Info</Button>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>Saved cards and billing address</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No payment methods saved</p>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Medical Info Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Medical Information
          </CardTitle>
          <CardDescription>Allergies, conditions (shared with providers)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Known Allergies</Label>
            <Input placeholder="e.g., Penicillin, Latex" />
          </div>
          <div className="space-y-2">
            <Label>Current Medications</Label>
            <Input placeholder="List any current medications" />
          </div>
          <div className="space-y-2">
            <Label>Chronic Conditions</Label>
            <Input placeholder="e.g., Diabetes, Hypertension" />
          </div>
          <Button variant="outline">Save Medical Info</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default PatientWorkspaceSettings;
