// src/components/settings/DoctorWorkspaceSettings.tsx
/**
 * Doctor workspace settings — logo upload for independent practitioners.
 *
 * Individual doctors who are NOT part of a practice (or who want a separate
 * personal logo) can upload their own logo here. When a practice logo already
 * exists on the associated practice, that practice logo takes precedence in
 * PDFs; the doctor logo is shown only when no practice logo is available.
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LogoUpload } from "@/components/shared/LogoUpload";

export function DoctorWorkspaceSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [hasPracticeLogo, setHasPracticeLogo] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        // Fetch the doctor row linked to this user
        const { data: doc } = await supabase
          .from("doctors")
          .select("id, user_id, practice_id, logo_url")
          .eq("user_id", user.id)
          .maybeSingle();

        if (doc) {
          setDoctor(doc);
          setLogoUrl(doc.logo_url || "");

          // Check if the associated practice already has a logo so we can
          // show the appropriate contextual message to the doctor.
          if (doc.practice_id) {
            const { data: practice } = await supabase
              .from("practices")
              .select("logo_url")
              .eq("id", doc.practice_id)
              .maybeSingle();
            setHasPracticeLogo(Boolean((practice as any)?.logo_url));
          }
        }
      } catch (err) {
        console.error("Error loading doctor settings:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!doctor) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("doctors")
        .update({ logo_url: logoUrl || null })
        .eq("id", doctor.id);
      if (error) throw error;
      toast.success("Logo saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
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

  if (!doctor) {
    return null; // Not a doctor — render nothing
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Practitioner Logo
          </CardTitle>
          <CardDescription>
            {hasPracticeLogo
              ? "Your practice already has a logo which will appear on PDFs. You can optionally upload a personal logo to use instead when generating documents outside a practice context."
              : "Upload your personal logo to appear on treatment plans, referrals, prescriptions, and patient summaries you generate as an independent practitioner."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LogoUpload
            currentUrl={logoUrl}
            onUpload={(url) => setLogoUrl(url)}
            entityType="doctor"
            entityId={doctor.id}
            label="Practitioner Logo"
            description="PNG or WebP with transparency recommended (max 2 MB). Leave empty to use your practice logo."
          />
          <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Save Logo"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default DoctorWorkspaceSettings;
