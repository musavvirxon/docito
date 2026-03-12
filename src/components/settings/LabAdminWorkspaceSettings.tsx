// src/components/settings/LabAdminWorkspaceSettings.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, MapPin, Phone, Clock, Truck, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LogoUpload } from "@/components/shared/LogoUpload";

export function LabAdminWorkspaceSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lab, setLab] = useState<any>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [turnaroundHours, setTurnaroundHours] = useState("");
  const [acceptsInsurance, setAcceptsInsurance] = useState(false);
  const [homeCollection, setHomeCollection] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");

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
          setLogoUrl(data.logo_url || "");
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
          name, address, city, phone, email,
          license_number: licenseNumber,
          average_turnaround_hours: turnaroundHours ? parseInt(turnaroundHours) : null,
          accepts_insurance: acceptsInsurance,
          services_offered: servicesOffered,
          logo_url: logoUrl || null,
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
          <p className="text-muted-foreground">No laboratory found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/auth")}>
            Create Lab Profile
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
            <FlaskConical className="h-5 w-5" />
            Laboratory Settings
          </CardTitle>
          <CardDescription>Manage your laboratory details and services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── Logo ──────────────────────────────────────────────────────── */}
          <LogoUpload
            currentUrl={logoUrl}
            onUpload={(url) => setLogoUrl(url)}
            entityType="lab"
            entityId={lab.id}
            label="Lab Logo"
            description="Appears on lab order & referral PDFs sent to your center. PNG or WebP with transparency recommended."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Lab Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Laboratory name" />
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
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lab@example.com" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Clock className="h-3 w-3" />Average Turnaround (hours)</Label>
              <Input
                type="number"
                value={turnaroundHours}
                onChange={(e) => setTurnaroundHours(e.target.value)}
                placeholder="24"
                min="1"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><FileText className="h-4 w-4" />Accepts Insurance</Label>
              <Switch checked={acceptsInsurance} onCheckedChange={setAcceptsInsurance} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><Truck className="h-4 w-4" />Home Collection</Label>
              <Switch checked={homeCollection} onCheckedChange={setHomeCollection} />
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

export default LabAdminWorkspaceSettings;
