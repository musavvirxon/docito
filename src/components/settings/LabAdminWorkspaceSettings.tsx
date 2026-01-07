import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  FlaskConical, MapPin, Phone, Clock, Truck, FileText, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function LabAdminWorkspaceSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lab, setLab] = useState<any>(null);
  
  // Lab settings
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [turnaroundHours, setTurnaroundHours] = useState("");
  const [acceptsInsurance, setAcceptsInsurance] = useState(false);
  const [homeCollection, setHomeCollection] = useState(false);

  useEffect(() => {
    const fetchLab = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("lab_centers")
          .select("*")
          .eq("admin_id", user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          setLab(data);
          setName(data.name || "");
          setAddress(data.address || "");
          setCity(data.city || "");
          setPhone(data.phone || "");
          setEmail(data.email || "");
          setLicenseNumber(data.license_number || "");
          setTurnaroundHours(data.average_turnaround_hours?.toString() || "");
          setAcceptsInsurance(data.accepts_insurance ?? false);
          setHomeCollection(data.services_offered?.includes("home_collection") ?? false);
        }
      } catch (err) {
        console.error("Error fetching lab:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLab();
  }, [user]);

  const handleSave = async () => {
    if (!lab) return;
    
    setSaving(true);
    try {
      const servicesOffered = homeCollection 
        ? [...(lab.services_offered || []).filter((s: string) => s !== "home_collection"), "home_collection"]
        : (lab.services_offered || []).filter((s: string) => s !== "home_collection");
      
      const { error } = await supabase
        .from("lab_centers")
        .update({
          name,
          address,
          city,
          phone,
          email,
          license_number: licenseNumber,
          average_turnaround_hours: turnaroundHours ? parseInt(turnaroundHours) : null,
          accepts_insurance: acceptsInsurance,
          services_offered: servicesOffered,
        })
        .eq("id", lab.id);
      
      if (error) throw error;
      toast.success("Lab settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
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

  if (!lab) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No lab center found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/lab/register")}>
            Register a Lab
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lab Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Lab Center Settings
          </CardTitle>
          <CardDescription>Manage your laboratory details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lab Name</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input 
                value={licenseNumber} 
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input 
                value={city} 
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Avg. Turnaround (hours)</Label>
              <Input 
                type="number"
                value={turnaroundHours} 
                onChange={(e) => setTurnaroundHours(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input 
              value={address} 
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <Badge variant={lab.is_verified ? "default" : "secondary"}>
              {lab.is_verified ? "Verified" : "Pending Verification"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Service Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Services & Options
          </CardTitle>
          <CardDescription>Configure lab service options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Accept Insurance</p>
              <p className="text-sm text-muted-foreground">Process insurance claims</p>
            </div>
            <Switch checked={acceptsInsurance} onCheckedChange={setAcceptsInsurance} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Home Collection</p>
              <p className="text-sm text-muted-foreground">Offer sample collection at home</p>
            </div>
            <Switch checked={homeCollection} onCheckedChange={setHomeCollection} />
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Lab Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/lab/dashboard")}>
            <FileText className="h-4 w-4 mr-2" />
            Test Catalog
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/lab/dashboard")}>
            <Clock className="h-4 w-4 mr-2" />
            Sample Workflow
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Lab Settings
        </Button>
      </div>
    </div>
  );
}

export default LabAdminWorkspaceSettings;
