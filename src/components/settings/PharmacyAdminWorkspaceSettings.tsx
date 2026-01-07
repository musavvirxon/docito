import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Pill, MapPin, Phone, Clock, Truck, Package, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function PharmacyAdminWorkspaceSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pharmacy, setPharmacy] = useState<any>(null);
  
  // Pharmacy settings
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [acceptsInsurance, setAcceptsInsurance] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [is24Hours, setIs24Hours] = useState(false);

  useEffect(() => {
    const fetchPharmacy = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("pharmacies")
          .select("*")
          .eq("admin_id", user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          setPharmacy(data);
          setName(data.name || "");
          setAddress(data.address || "");
          setCity(data.city || "");
          setPhone(data.phone || "");
          setEmail(data.email || "");
          setLicenseNumber(data.license_number || "");
          setAcceptsInsurance(data.accepts_insurance ?? false);
          setDeliveryAvailable(data.delivery_available ?? false);
          setIs24Hours(data.operating_hours === "24_hours" || false);
        }
      } catch (err) {
        console.error("Error fetching pharmacy:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPharmacy();
  }, [user]);

  const handleSave = async () => {
    if (!pharmacy) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("pharmacies")
        .update({
          name,
          address,
          city,
          phone,
          email,
          license_number: licenseNumber,
          accepts_insurance: acceptsInsurance,
          delivery_available: deliveryAvailable,
        })
        .eq("id", pharmacy.id);
      
      if (error) throw error;
      toast.success("Pharmacy settings saved");
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

  if (!pharmacy) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No pharmacy found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/pharmacy/register")}>
            Register a Pharmacy
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pharmacy Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Pharmacy Settings
          </CardTitle>
          <CardDescription>Manage your pharmacy details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pharmacy Name</Label>
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
            <Badge variant={pharmacy.is_verified ? "default" : "secondary"}>
              {pharmacy.is_verified ? "Verified" : "Pending Verification"}
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
          <CardDescription>Configure pharmacy service options</CardDescription>
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
              <p className="font-medium">Delivery Service</p>
              <p className="text-sm text-muted-foreground">Offer prescription delivery</p>
            </div>
            <Switch checked={deliveryAvailable} onCheckedChange={setDeliveryAvailable} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">24-Hour Service</p>
              <p className="text-sm text-muted-foreground">Open 24 hours</p>
            </div>
            <Switch checked={is24Hours} onCheckedChange={setIs24Hours} />
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Pharmacy Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/pharmacy/dashboard")}>
            <Package className="h-4 w-4 mr-2" />
            Inventory Management
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/pharmacy/dashboard")}>
            <Clock className="h-4 w-4 mr-2" />
            Prescription Queue
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Pharmacy Settings
        </Button>
      </div>
    </div>
  );
}

export default PharmacyAdminWorkspaceSettings;
