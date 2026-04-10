// File: src/components/doctor/DoctorProfileSection.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ExternalLink, Shield, UserRound, Camera, Link2, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDoctorData } from "@/contexts/DoctorDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{2,29}$/;

const normalizeUsername = (v: string) => v.trim().toLowerCase();

export default function DoctorProfileSection() {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { doctorProfile, refreshAllData } = useDoctorData();

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState("");

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
    setAvatarUrl(doctorProfile.profiles?.avatar_url || profile?.avatar_url || "");
  }, [doctorProfile, profile?.avatar_url]);

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

  const bookingLink = useMemo(() => {
    if (!doctorProfile?.id) return "";
    const slug = doctorProfile.custom_profile_link || doctorProfile.id;
    return `${window.location.origin}/book-appointment/${slug}`;
  }, [doctorProfile?.id, doctorProfile?.custom_profile_link]);

  const [linkCopied, setLinkCopied] = useState(false);

  const copyBookingLink = async () => {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink);
      setLinkCopied(true);
      toast({ title: "Copied!", description: "Booking link copied to clipboard." });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const usernameError = useMemo(() => {
    const un = normalizeUsername(username || "");
    if (!isPublic) return "";
    if (!un) return "Username is required for a public profile.";
    if (!USERNAME_RE.test(un)) return "Username must be 3–30 chars and use lowercase letters, numbers, _ or -.";
    return "";
  }, [isPublic, username]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !doctorProfile) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 5MB.", variant: "destructive" });
      return;
    }

    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `avatars/${doctorProfile.user_id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(filePath);
      const newUrl = urlData?.publicUrl || "";

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: newUrl })
        .eq("user_id", doctorProfile.user_id);

      if (profErr) throw profErr;

      setAvatarUrl(newUrl);
      toast({ title: "Photo updated", description: "Your profile photo has been updated." });
      await refreshAllData();
    } catch (err: any) {
      console.error("Photo upload error:", err);
      toast({ title: "Upload failed", description: err?.message || "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

  const initials = (profile?.full_name || doctorProfile.profiles?.full_name || "D")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

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
        {/* Profile Photo */}
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 ring-2 ring-primary/20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {uploadingPhoto ? (
                <Loader2 className="h-6 w-6 text-background animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-background" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">{profile?.full_name || "Doctor"}</p>
            <p className="text-sm text-muted-foreground">{profile?.email || ""}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="mt-2 gap-2"
            >
              {uploadingPhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              Change Photo
            </Button>
          </div>
        </div>

        <Separator />

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

        <Separator />

        {/* Booking Link Section */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Patient Booking Link
          </h3>
          <p className="text-sm text-muted-foreground">
            Share this link with patients so they can book an appointment directly with you.
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={bookingLink}
              readOnly
              className="font-mono text-sm bg-muted/50"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyBookingLink}
              disabled={!bookingLink}
              className="shrink-0"
            >
              {linkCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}