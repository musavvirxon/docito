import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  ScanLine, MapPin, Phone, Clock, Shield, FileText, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function ImagingAdminWorkspaceSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [center, setCenter] = useState<any>(null);
  
  // Imaging center settings
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [acceptsInsurance, setAcceptsInsurance] = useState(false);
  const [modalities, setModalities] = useState<string[]>([]);

  useEffect(() => {
    const fetchCenter = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("imaging_centers")
          .select("*")
          .eq("admin_id", user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          setCenter(data);
          setName(data.name || "");
          setAddress(data.address || "");
          setCity(data.city || "");
          setPhone(data.phone || "");
          setEmail(data.email || "");
          setLicenseNumber(data.license_number || "");
          setAcceptsInsurance(data.accepts_insurance ?? false);
          setModalities(data.modalities || []);
        }
      } catch (err) {
        console.error("Error fetching imaging center:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCenter();
  }, [user]);

  const handleSave = async () => {
    if (!center) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("imaging_centers")
        .update({
          name,
          address,
          city,
          phone,
          email,
          license_number: licenseNumber,
          accepts_insurance: acceptsInsurance,
          modalities,
        })
        .eq("id", center.id);
      
      if (error) throw error;
      toast.success("Imaging center settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleModality = (mod: string) => {
    setModalities(prev => 
      prev.includes(mod) 
        ? prev.filter(m => m !== mod)
        : [...prev, mod]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!center) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No imaging center found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/imaging-center/register")}>
            Register an Imaging Center
          </Button>
        </CardContent>
      </Card>
    );
  }

  const availableModalities = ["X-Ray", "CT", "MRI", "Ultrasound", "Mammography", "PET", "DEXA"];

  return (
    <div className="space-y-6">
      {/* Imaging Center Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Imaging Center Settings
          </CardTitle>
          <CardDescription>Manage your imaging center details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Center Name</Label>
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
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input 
              value={address} 
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <Badge variant={center.is_verified ? "default" : "secondary"}>
              {center.is_verified ? "Verified" : "Pending Verification"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Modalities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Available Modalities
          </CardTitle>
          <CardDescription>Select imaging services you offer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableModalities.map(mod => (
              <Badge 
                key={mod}
                variant={modalities.includes(mod) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleModality(mod)}
              >
                {mod}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Services & Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Accept Insurance</p>
              <p className="text-sm text-muted-foreground">Process insurance claims</p>
            </div>
            <Switch checked={acceptsInsurance} onCheckedChange={setAcceptsInsurance} />
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Imaging Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/imaging-center/dashboard")}>
            <FileText className="h-4 w-4 mr-2" />
            Scan Queue
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/imaging-center/dashboard")}>
            <Clock className="h-4 w-4 mr-2" />
            Report Management
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Imaging Center Settings
        </Button>
      </div>
    </div>
  );
}

export default ImagingAdminWorkspaceSettings;
