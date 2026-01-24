// File: src/components/doctor/DoctorProfileSection.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ExternalLink, Shield, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDoctorData } from "@/contexts/DoctorDataContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{2,29}$/;

const normalizeUsername = (v: string) => v.trim().toLowerCase();

export default function DoctorProfileSection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { doctorProfile, refreshAllData } = useDoctorData();

  const [saving, setSaving] = useState(false);

  // Profile fields
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [consultationFee, setConsultationFee] = useState<string>("");
  const [yearsExperience, setYearsExperience] = useState<string>("");
  const [languages, setLanguages] = useState<string>("");
  const [phone, setPhone] = useState("");

  // Public profile
  const [isPublic, setIsPublic] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!doctorProfile) return;

    setSpecialty(doctorProfile.specialty || "");
    setBio(doctorProfile.bio || "");
    setConsultationFee(
      doctorProfile.consultation_fee !== null && doctorProfile.consultation_fee !== undefined
        ? String(doctorProfile.consultation_fee)
        : "",
    );
    setYearsExperience(
      doctorProfile.years_experience !== null && doctorProfile.years_experience !== undefined
        ? String(doctorProfile.years_experience)
        : "",
    );
    setLanguages(Array.isArray(doctorProfile.languages) ? doctorProfile.languages.join(", ") : "");
    setPhone(doctorProfile.profiles?.phone || "");

    const vis = doctorProfile.profiles?.profile_visibility;
    setIsPublic(vis === "public");
    setUsername(doctorProfile.profiles?.username || "");
  }, [doctorProfile]);

  const publicSlug = useMemo(() => {
    const vis = isPublic;
    const un = normalizeUsername(username || "");

    if (vis && USERNAME_RE.test(un)) return un;

    // If not public, prefer custom link (unlisted), else fallback to id
    return doctorProfile?.custom_profile_link || doctorProfile?.id || "";
  }, [doctorProfile?.custom_profile_link, doctorProfile?.id, isPublic, username]);

  const publicUrl = useMemo(() => {
    if (!publicSlug) return "";
    return `/doctor/${publicSlug}`;
  }, [publicSlug]);

  const usernameError = useMemo(() => {
    const un = normalizeUsername(username || "");
    if (!isPublic) return "";
    if (!un) return "Username is required for a public profile.";
    if (!USERNAME_RE.test(un)) return "Username must be 3–30 chars and use lowercase letters, numbers, _ or -.";
    return "";
  }, [isPublic, username]);

  const handleSave = async () => {
    if (!doctorProfile) return;
    if (isPublic && usernameError) {
      toast({ title: "Invalid username", description: usernameError, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const un = normalizeUsername(username || "");

      // Update doctor profile fields
      const { error: docErr } = await supabase
        .from("doctors")
        .update({
          specialty: specialty.trim(),
          bio: bio.trim() || null,
          consultation_fee: consultationFee.trim() ? Number(consultationFee) : null,
          years_experience: yearsExperience.trim() ? Number(yearsExperience) : null,
          languages: languages
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        })
        .eq("id", doctorProfile.id);

      if (docErr) throw docErr;

      // Update profile fields (phone + public profile settings)
      const profileUpdate: Record<string, any> = {
        phone: phone.trim() || null,
        profile_visibility: isPublic ? "public" : "private",
        username: isPublic ? un : null,
      };

      const { error: profErr } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", doctorProfile.user_id);

      if (profErr) {
        // Handle unique violations cleanly
        const msg = String((profErr as any)?.message || "");
        if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
          throw new Error("That username is already taken. Please choose another.");
        }
        throw profErr;
      }

      toast({ title: "Saved", description: "Your profile has been updated." });
      await refreshAllData();
    } catch (e: any) {
      console.error("Profile save error:", e);
      toast({ title: "Error", description: e?.message || "Failed to save profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!doctorProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile…
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5" />
            Doctor Profile
          </CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={doctorProfile.verified ? "default" : "secondary"}>
              {doctorProfile.verified ? "Verified" : "Unverified"}
            </Badge>
            {doctorProfile.profiles?.profile_visibility === "public" ? (
              <Badge variant="outline">Public</Badge>
            ) : (
              <Badge variant="outline">Private</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (publicSlug) navigate(`/doctor/${publicSlug}`);
            }}
            disabled={!publicSlug}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty</Label>
            <Input
              id="specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g., Dermatology"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998…" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="consultationFee">Consultation Fee</Label>
            <Input
              id="consultationFee"
              type="number"
              inputMode="decimal"
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
              placeholder="e.g., 200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearsExperience">Years of Experience</Label>
            <Input
              id="yearsExperience"
              type="number"
              inputMode="numeric"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder="e.g., 8"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="languages">Languages</Label>
            <Input
              id="languages"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="English, Russian, Uzbek"
            />
            <p className="text-xs text-muted-foreground">Comma-separated</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              placeholder="Introduce yourself to patients…"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Public Profile
              </h3>
              <p className="text-sm text-muted-foreground">
                When enabled, patients can visit your profile at{" "}
                <span className="font-mono">{publicUrl || "/doctor/username"}</span>.
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., dr_ahmad"
                disabled={!isPublic}
              />
              {usernameError ? (
                <p className="text-xs text-destructive">{usernameError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">3–30 chars, lowercase letters/numbers, _ or -</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Profile URL</Label>
              <Input value={publicUrl || ""} readOnly />
            </div>
          </div>

          {!isPublic && (
            <Alert>
              <AlertDescription>Your profile is private (unlisted). Share your link directly if needed.</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
