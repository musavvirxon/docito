import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, MapPin, Phone, Mail, Users, Shield, FileText, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function ClinicAdminWorkspaceSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [practice, setPractice] = useState<any>(null);
  
  // Organization settings
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const fetchPractice = async () => {
      if (!user) return;
      
      try {
        // Get practice where user is admin
        const { data, error } = await supabase
          .from("practices")
          .select("*")
          .eq("admin_id", user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          setPractice(data);
          setName(data.name || "");
          setAddress(data.address || "");
          setCity(data.city || "");
          setPhone(data.phone || "");
          setEmail(data.email || "");
          setDescription(data.description || "");
        }
      } catch (err) {
        console.error("Error fetching practice:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPractice();
  }, [user]);

  const handleSave = async () => {
    if (!practice) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("practices")
        .update({
          name,
          address,
          city,
          phone,
          email,
          description,
        })
        .eq("id", practice.id);
      
      if (error) throw error;
      toast.success("Clinic settings saved");
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

  if (!practice) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No clinic found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/register-practice")}>
            Register a Clinic
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Settings
          </CardTitle>
          <CardDescription>Manage your clinic/practice details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clinic Name</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Clinic name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Contact email"
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input 
                value={city} 
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input 
              value={address} 
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="About your clinic..."
              rows={3}
            />
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <Badge variant={practice.is_verified ? "default" : "secondary"}>
              {practice.is_verified ? "Verified" : "Pending Verification"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff & Management
          </CardTitle>
          <CardDescription>Manage your team and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/practices/dashboard")}>
            <Users className="h-4 w-4 mr-2" />
            Manage Staff
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/practices/dashboard")}>
            <Shield className="h-4 w-4 mr-2" />
            View Audit Logs
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/practices/dashboard")}>
            <FileText className="h-4 w-4 mr-2" />
            Billing & Invoices
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Clinic Settings
        </Button>
      </div>
    </div>
  );
}

export default ClinicAdminWorkspaceSettings;
