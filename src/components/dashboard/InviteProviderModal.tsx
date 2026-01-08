import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePracticeInvitations } from "@/hooks/usePracticeInvitations";

interface InviteProviderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const specialties = [
  "Cardiologist",
  "Dermatologist",
  "Pediatrician",
  "Neurologist",
  "Orthopedist",
  "Gynecologist",
  "Psychiatrist",
  "Radiologist",
  "Anesthesiologist",
  "General Practice",
];

const languages = ["English", "Spanish", "French", "German", "Mandarin", "Arabic", "Russian", "Portuguese"];

type LocationRow = { id: string; name: string };
type ServiceRow = { id: string; name: string };

async function resolveMyPracticeId(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;

  const { data: adminPractice } = await supabase
    .from("practices")
    .select("id")
    .eq("admin_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (adminPractice?.id) return adminPractice.id;

  const { data: staffRow } = await supabase
    .from("practice_staff")
    .select("practice_id,status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (staffRow?.practice_id) return staffRow.practice_id;

  return null;
}

export const InviteProviderModal = ({ open, onOpenChange }: InviteProviderModalProps) => {
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const { sendInvitation } = usePracticeInvitations(practiceId || undefined);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    specialty: "",
    providerType: "", // visiting / consultant / in-house (UI only)
    assignedLocations: [] as string[], // location_id (UI only unless mapping table exists)
    languagesSpoken: [] as string[],
    services: [] as string[], // service_id (UI only unless mapping table exists)
    welcomeMessage: "",
  });

  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [sending, setSending] = useState(false);

  const composedMessage = useMemo(() => {
    const lines: string[] = [];

    if (formData.welcomeMessage?.trim()) lines.push(formData.welcomeMessage.trim());

    lines.push("");
    lines.push("— Provider Details —");
    if (formData.specialty) lines.push(`Specialty: ${formData.specialty}`);
    if (formData.providerType) lines.push(`Type: ${formData.providerType}`);

    if (formData.languagesSpoken.length) lines.push(`Languages: ${formData.languagesSpoken.join(", ")}`);

    if (formData.assignedLocations.length && locations.length) {
      const names = locations
        .filter((l) => formData.assignedLocations.includes(l.id))
        .map((l) => l.name);
      if (names.length) lines.push(`Preferred locations: ${names.join(", ")}`);
    }

    if (formData.services.length && services.length) {
      const names = services
        .filter((s) => formData.services.includes(s.id))
        .map((s) => s.name);
      if (names.length) lines.push(`Intended services: ${names.join(", ")}`);
    }

    return lines.join("\n").trim();
  }, [formData, locations, services]);

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoadingDeps(true);
      try {
        const pid = await resolveMyPracticeId();
        setPracticeId(pid);

        if (!pid) {
          toast.error("Could not determine your practice. Please try again.");
          return;
        }

        const { data: loc, error: locErr } = await supabase.rpc("get_practice_locations" as any, {
          p_practice_id: pid,
        });
        if (locErr) throw locErr;

        setLocations(
          ((loc as any[]) || []).map((l) => ({
            id: l.id,
            name: l.name,
          }))
        );

        const { data: svc, error: svcErr } = await supabase.rpc("get_practice_services" as any, {
          p_practice_id: pid,
        });
        if (svcErr) throw svcErr;

        setServices(
          ((svc as any[]) || []).map((s) => ({
            id: s.id,
            name: s.name,
          }))
        );
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load practice data");
      } finally {
        setLoadingDeps(false);
      }
    })();
  }, [open]);

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      specialty: "",
      providerType: "",
      assignedLocations: [],
      languagesSpoken: [],
      services: [],
      welcomeMessage: "",
    });
    setUploadedPhoto(null);
  };

  const handleLocationChange = (locationId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      assignedLocations: checked
        ? [...prev.assignedLocations, locationId]
        : prev.assignedLocations.filter((l) => l !== locationId),
    }));
  };

  const handleLanguageChange = (language: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      languagesSpoken: checked
        ? [...prev.languagesSpoken, language]
        : prev.languagesSpoken.filter((l) => l !== language),
    }));
  };

  const handleServiceChange = (serviceId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      services: checked ? [...prev.services, serviceId] : prev.services.filter((s) => s !== serviceId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!practiceId) {
      toast.error("Practice not found for this account.");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Email is required.");
      return;
    }

    setSending(true);
    try {
      // IMPORTANT: Use legacy role 'doctor' so AcceptInvite.tsx routes correctly
      const result = await sendInvitation({
        email: formData.email.trim(),
        full_name: formData.fullName.trim() || undefined,
        role: "doctor",
        custom_message: composedMessage || undefined,
      });

      if ((result as any)?.success) {
        toast.success("Invitation sent");
        onOpenChange(false);
        resetForm();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite New Provider</DialogTitle>
        </DialogHeader>

        {loadingDeps ? (
          <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading practice data...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Professional Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="specialty">Specialty</Label>
                  <Select
                    value={formData.specialty}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, specialty: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="providerType">Provider Type</Label>
                  <Select
                    value={formData.providerType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, providerType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visiting">Visiting</SelectItem>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="in-house">In-House</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Assigned Locations (UI only unless mapping exists) */}
            <div className="space-y-4">
              <Label>Assigned Locations (optional)</Label>
              <Card>
                <CardContent className="p-4">
                  {locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No locations found.</p>
                  ) : (
                    <div className="space-y-2">
                      {locations.map((location) => (
                        <div key={location.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`loc-${location.id}`}
                            checked={formData.assignedLocations.includes(location.id)}
                            onCheckedChange={(checked) => handleLocationChange(location.id, checked as boolean)}
                          />
                          <Label htmlFor={`loc-${location.id}`}>{location.name}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Note: mapping provider↔location requires a junction table (not implemented here).
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Languages Spoken */}
            <div className="space-y-4">
              <Label>Languages Spoken</Label>
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {languages.map((language) => (
                      <div key={language} className="flex items-center space-x-2">
                        <Checkbox
                          id={`lang-${language}`}
                          checked={formData.languagesSpoken.includes(language)}
                          onCheckedChange={(checked) => handleLanguageChange(language, checked as boolean)}
                        />
                        <Label htmlFor={`lang-${language}`}>{language}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Services (UI only unless mapping exists) */}
            <div className="space-y-4">
              <Label>Services They Will Provide (optional)</Label>
              <Card>
                <CardContent className="p-4">
                  {services.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No services found.</p>
                  ) : (
                    <div className="space-y-2">
                      {services.map((service) => (
                        <div key={service.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`svc-${service.id}`}
                            checked={formData.services.includes(service.id)}
                            onCheckedChange={(checked) => handleServiceChange(service.id, checked as boolean)}
                          />
                          <Label htmlFor={`svc-${service.id}`}>{service.name}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Note: mapping provider↔services requires a junction table (not implemented here).
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Upload Profile Photo (UI only) */}
            <div className="space-y-4">
              <Label>Profile Photo (Optional)</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                {uploadedPhoto ? (
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{uploadedPhoto.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setUploadedPhoto(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Click to upload</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setUploadedPhoto(file);
                      }}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload requires Supabase Storage wiring (not included in this modal).
              </p>
            </div>

            {/* Welcome Message */}
            <div className="space-y-4">
              <Label htmlFor="welcomeMessage">Custom Welcome Message (Optional)</Label>
              <Textarea
                id="welcomeMessage"
                placeholder="Enter a personal welcome message for the new provider..."
                value={formData.welcomeMessage}
                onChange={(e) => setFormData((prev) => ({ ...prev, welcomeMessage: e.target.value }))}
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending || !formData.email.trim()}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
