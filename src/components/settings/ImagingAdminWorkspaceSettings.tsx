// src/components/settings/ImagingAdminWorkspaceSettings.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScanLine, MapPin, Phone, Clock, Shield, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LogoUpload } from "@/components/shared/LogoUpload";

const MODALITIES = ["X-Ray", "CT Scan", "MRI", "Ultrasound", "PET Scan", "Mammography", "Fluoroscopy", "Nuclear Medicine"];

export function ImagingAdminWorkspaceSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [center, setCenter] = useState<any>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [acceptsInsurance, setAcceptsInsurance] = useState(false);
  const [modalities, setModalities] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState<string>("");

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
          setLogoUrl(data.logo_url || "");
        }
      } catch (err) {
        console.error("Error fetching imaging center:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCenter();
  }, [user]);

  const toggleModality = (m: string) => {
    setModalities((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const handleSave = async () => {
    if (!center) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("imaging_centers")
        .update({
          name, address, city, phone, email,
          license_number: licenseNumber,
          accepts_insurance: acceptsInsurance,
          modalities,
          logo_url: logoUrl || null,
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
          <Button variant="outline" className="mt-4" onClick={() => navigate("/auth")}>
            Create Imaging Center Profile
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
            <ScanLine className="h-5 w-5" />
            Imaging Center Settings
          </CardTitle>
          <CardDescription>Manage your imaging center details and capabilities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── Logo ──────────────────────────────────────────────────────── */}
          <LogoUpload
            currentUrl={logoUrl}
            onUpload={(url) => setLogoUrl(url)}
            entityType="imaging"
            entityId={center.id}
            label="Imaging Center Logo"
            description="Printed on imaging referral & report PDFs. PNG or WebP with transparency recommended."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Center Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Imaging center name" />
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
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="imaging@example.com" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><Shield className="h-4 w-4" />Accepts Insurance</Label>
              <Switch checked={acceptsInsurance} onCheckedChange={setAcceptsInsurance} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Available Modalities</Label>
            <div className="flex flex-wrap gap-2">
              {MODALITIES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleModality(m)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    modalities.includes(m)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {m}
                </button>
              ))}
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

export default ImagingAdminWorkspaceSettings;
