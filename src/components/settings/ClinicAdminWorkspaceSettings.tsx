// src/components/settings/ClinicAdminWorkspaceSettings.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Phone, Mail, Users, Shield, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LogoUpload } from "@/components/shared/LogoUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClinicServicesManager from "@/components/clinic/ClinicServicesManager";

export function ClinicAdminWorkspaceSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [practice, setPractice] = useState<any>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");

  useEffect(() => {
    const fetchPractice = async () => {
      if (!user) return;
      try {
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
          setLogoUrl(data.logo_url || "");
          setBannerUrl((data as any).banner_url || "");
          setInstagramUrl((data as any).instagram_url || "");
          setFacebookUrl((data as any).facebook_url || "");
          setTwitterUrl((data as any).twitter_url || "");
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
          logo_url: logoUrl || null,
          banner_url: bannerUrl || null,
          instagram_url: instagramUrl || null,
          facebook_url: facebookUrl || null,
          twitter_url: twitterUrl || null,
        } as any)
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
          <Button variant="outline" className="mt-4" onClick={() => navigate("/auth")}>
            Create Clinic Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isVerified = Boolean(practice?.verified ?? practice?.is_verified ?? false);

  return (
    <Tabs defaultValue="organization" className="space-y-6">
      <TabsList>
        <TabsTrigger value="organization">Organization</TabsTrigger>
        <TabsTrigger value="services">Services & Pricing</TabsTrigger>
      </TabsList>

      <TabsContent value="organization" className="space-y-6">
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
            {isVerified && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <Shield className="h-3 w-3 mr-1" /> Verified
              </Badge>
            )}

            {/* ── Logo upload ─────────────────────────────────────────────── */}
            <LogoUpload
              currentUrl={logoUrl}
              onUpload={(url) => setLogoUrl(url)}
              entityType="clinic"
              entityId={practice.id}
              label="Clinic Logo"
              description="Appears on treatment plans, referrals & patient summary PDFs. PNG or WebP with transparency recommended (max 2 MB)."
            />

            {/* ── Banner ─────────────────────────────────────────────── */}
            <div className="space-y-2 pt-2 border-t">
              <div>
                <Label className="text-base">Clinic Banner Image</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Displayed at the top of your public clinic profile.
                  Recommended: 1440 × 400 px · JPG or WebP · max 5 MB.
                </p>
              </div>
              {bannerUrl && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                  <img src={bannerUrl} alt="Banner preview" className="w-full h-full object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setBannerUrl("")}
                  >
                    ✕ Remove
                  </Button>
                </div>
              )}
              <LogoUpload
                currentUrl={bannerUrl}
                onUpload={(url) => setBannerUrl(url)}
                entityType="clinic"
                entityId={practice.id}
                label="Banner Image"
                description="Wide landscape image. Will be cropped to fill the banner area."
              />
            </div>

            {/* ── Social Links ────────────────────────────────────────── */}
            <div className="space-y-3 pt-2 border-t">
              <div>
                <Label className="text-base">Social Media Links</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Links shown on your public clinic profile page.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Instagram URL</Label>
                <Input
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/yourclinic"
                />
              </div>
              <div className="space-y-2">
                <Label>Facebook URL</Label>
                <Input
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/yourclinic"
                />
              </div>
              <div className="space-y-2">
                <Label>Twitter / X URL</Label>
                <Input
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://x.com/yourclinic"
                />
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Clinic Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Clinic name" />
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
                <Label className="flex items-center gap-1"><Mail className="h-3 w-3" />Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="clinic@example.com" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1"><FileText className="h-3 w-3" />Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your clinic..."
                rows={3}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="services">
        <ClinicServicesManager practiceId={practice.id} />
      </TabsContent>
    </Tabs>
  );
}

export default ClinicAdminWorkspaceSettings;
