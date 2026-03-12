// src/components/settings/PharmacyAdminWorkspaceSettings.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Pill, MapPin, Phone, Clock, Truck, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LogoUpload } from "@/components/shared/LogoUpload";

export function PharmacyAdminWorkspaceSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pharmacy, setPharmacy] = useState<any>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [acceptsInsurance, setAcceptsInsurance] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [is24Hours, setIs24Hours] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");

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
          setLogoUrl(data.logo_url || "");
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
          name, address, city, phone, email,
          license_number: licenseNumber,
          accepts_insurance: acceptsInsurance,
          delivery_available: deliveryAvailable,
          operating_hours: is24Hours ? "24_hours" : null,
          logo_url: logoUrl || null,
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
          <Button variant="outline" className="mt-4" onClick={() => navigate("/auth")}>
            Create Pharmacy Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Pharmacy Settings
          </CardTitle>
          <CardDescription>Manage your pharmacy details and services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── Logo ──────────────────────────────────────────────────────── */}
          <LogoUpload
            currentUrl={logoUrl}
            onUpload={(url) => setLogoUrl(url)}
            entityType="pharmacy"
            entityId={pharmacy.id}
            label="Pharmacy Logo"
            description="Printed on prescription PDFs dispensed from your pharmacy. PNG or WebP with transparency recommended."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Pharmacy Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pharmacy name" />
            </div>
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="License #" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" />Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Phone className="h-3 w-3" />Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pharmacy@example.com" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><Package className="h-4 w-4" />Accepts Insurance</Label>
              <Switch checked={acceptsInsurance} onCheckedChange={setAcceptsInsurance} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><Truck className="h-4 w-4" />Delivery Available</Label>
              <Switch checked={deliveryAvailable} onCheckedChange={setDeliveryAvailable} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><Clock className="h-4 w-4" />Open 24 Hours</Label>
              <Switch checked={is24Hours} onCheckedChange={setIs24Hours} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default PharmacyAdminWorkspaceSettings;
