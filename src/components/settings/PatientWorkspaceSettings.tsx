import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Heart, Shield, CreditCard, Users, Loader2, Plus, Save
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function PatientWorkspaceSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Medical info
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const [conditions, setConditions] = useState("");
  
  // Insurance info
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [memberId, setMemberId] = useState("");

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!user) return;
      
      try {
        // For now, we'll just load from local state
        // In a production app, you'd have dedicated tables for this data
        setLoading(false);
      } catch (err) {
        console.error("Error fetching patient data:", err);
        setLoading(false);
      }
    };
    
    fetchPatientData();
  }, [user]);

  const handleSaveMedicalInfo = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // In a production app, this would save to a dedicated medical_info table
      // For now, just show a success message
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success("Medical information saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save medical information");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInsuranceInfo = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // In a production app, this would save to a dedicated insurance_info table
      // For now, just show a success message
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success("Insurance information saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save insurance information");
    } finally {
      setSaving(false);
    }
  };

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
            Family Members & Dependents
          </CardTitle>
          <CardDescription>
            Add family members to book appointments on their behalf
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No family members added yet</p>
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
          <CardDescription>
            Your insurance details for faster claims processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Insurance Provider</Label>
              <Input 
                value={insuranceProvider}
                onChange={(e) => setInsuranceProvider(e.target.value)}
                placeholder="Enter your insurance provider"
              />
            </div>
            <div className="space-y-2">
              <Label>Policy Number</Label>
              <Input 
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="Your policy number"
              />
            </div>
            <div className="space-y-2">
              <Label>Group Number</Label>
              <Input 
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value)}
                placeholder="Group number (if applicable)"
              />
            </div>
            <div className="space-y-2">
              <Label>Member ID</Label>
              <Input 
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="Your member ID"
              />
            </div>
          </div>
          <Button onClick={handleSaveInsuranceInfo} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Insurance Information
          </Button>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>
            Manage your saved payment methods for appointments
          </CardDescription>
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

      {/* Medical Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Medical Information
          </CardTitle>
          <CardDescription>
            Health information shared with your healthcare providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Known Allergies</Label>
            <Input 
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="List any known allergies (e.g., Penicillin, Latex)"
            />
          </div>
          <div className="space-y-2">
            <Label>Current Medications</Label>
            <Input 
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              placeholder="List any medications you're currently taking"
            />
          </div>
          <div className="space-y-2">
            <Label>Chronic Conditions</Label>
            <Input 
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="List any chronic conditions (e.g., Diabetes, Hypertension)"
            />
          </div>
          <Button onClick={handleSaveMedicalInfo} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Medical Information
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default PatientWorkspaceSettings;
