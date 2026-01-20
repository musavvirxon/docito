// Path: src/components/settings/ClinicAdminWorkspaceSettings.tsx

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
        const { data, error } = await supabase.from("practices").select("*").eq("admin_id", user.id).maybeSingle();

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
          <Button variant="outline" className="mt-4" onClick={() => navigate("/auth")}>
            Create Clinic Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isVerified = Boolean(practice?.verified ?? practice?.is_verified ?? false);

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
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Clinic name" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Contact email" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="About your clinic..." rows={3} />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Badge variant={isVerified ? "default" : "secondary"}>{isVerified ? "Verified" : "Pending Verification"}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Admin Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Controls
          </CardTitle>
          <CardDescription>Manage your organization and staff settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
              <Users className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">Staff Management</p>
                <p className="text-sm text-muted-foreground">Roles & permissions</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">Compliance</p>
                <p className="text-sm text-muted-foreground">Policies & documents</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
              <MapPin className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">Locations</p>
                <p className="text-sm text-muted-foreground">Branches & addresses</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contact Summary
          </CardTitle>
          <CardDescription>Your public-facing contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{phone || "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{email || "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{[address, city].filter(Boolean).join(", ") || "—"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
