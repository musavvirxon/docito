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
import { Switch } from "@/components/ui/switch";
import { Upload, X, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const serviceCategories = [
  "Diagnostic",
  "Preventive",
  "Surgical",
  "Therapeutic",
  "Cosmetic",
  "Emergency",
  "Consultation",
];

const durations = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "90", label: "90 minutes" },
  { value: "120", label: "2 hours" },
];

type ProviderRow = {
  doctor_id: string;
  full_name: string | null;
  specialty: string | null;
};

type LocationRow = {
  id: string;
  name: string;
};

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

export const AddServiceModal = ({ open, onOpenChange }: AddServiceModalProps) => {
  const [practiceId, setPracticeId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    serviceName: "",
    category: "",
    description: "",
    price: "",
    duration: "",
    providers: [] as string[], // doctor_id
    locations: [] as string[], // location_id (UI-only unless you add mapping table)
    tags: [] as string[],
    cptCode: "",
    isPublic: true, // maps to is_bookable
  });

  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [newTag, setNewTag] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);

  const [loadingDeps, setLoadingDeps] = useState(false);
  const [saving, setSaving] = useState(false);

  const numericPrice = useMemo(() => {
    const p = parseFloat(formData.price);
    return Number.isFinite(p) ? p : null;
  }, [formData.price]);

  const durationMinutes = useMemo(() => {
    const d = parseInt(formData.duration || "", 10);
    return Number.isFinite(d) ? d : null;
  }, [formData.duration]);

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

        // Providers
        const { data: prov, error: provErr } = await supabase.rpc(
          "get_practice_providers" as any,
          { p_practice_id: pid }
        );
        if (provErr) throw provErr;
        setProviders((prov as any[]) || []);

        // Locations
        const { data: loc, error: locErr } = await supabase.rpc(
          "get_practice_locations" as any,
          { p_practice_id: pid }
        );
        if (locErr) throw locErr;

        const normalized: LocationRow[] = ((loc as any[]) || []).map((l) => ({
          id: l.id,
          name: l.name,
        }));
        setLocations(normalized);
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
      serviceName: "",
      category: "",
      description: "",
      price: "",
      duration: "",
      providers: [],
      locations: [],
      tags: [],
      cptCode: "",
      isPublic: true,
    });
    setNewTag("");
    setUploadedImage(null);
  };

  const handleProviderChange = (doctorId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      providers: checked ? [...prev.providers, doctorId] : prev.providers.filter((p) => p !== doctorId),
    }));
  };

  const handleLocationChange = (locationId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      locations: checked ? [...prev.locations, locationId] : prev.locations.filter((l) => l !== locationId),
    }));
  };

  const addTag = () => {
    const t = newTag.trim();
    if (!t) return;
    if (formData.tags.includes(t)) return;
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    setNewTag("");
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((tag) => tag !== tagToRemove) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!practiceId) {
      toast.error("Practice not found for this account.");
      return;
    }

    if (!formData.serviceName.trim()) {
      toast.error("Service name is required.");
      return;
    }

    if (!numericPrice || numericPrice <= 0) {
      toast.error("Valid price is required.");
      return;
    }

    if (!durationMinutes || durationMinutes <= 0) {
      toast.error("Duration is required.");
      return;
    }

    if (formData.providers.length === 0) {
      toast.error("Select at least one provider.");
      return;
    }

    setSaving(true);
    try {
      // Create ONE procedure per provider because procedures.dentist_id is single-valued
      const inserts = formData.providers.map((doctorId) => ({
        name: formData.serviceName.trim(),
        description: formData.description.trim() || null,
        // category is enum in DB; we pass as any to avoid TS friction
        category: (formData.category || null) as any,
        default_cost: numericPrice,
        price: numericPrice,
        duration_minutes: durationMinutes,
        estimated_duration_minutes: durationMinutes,
        dentist_id: doctorId,
        is_active: true,
        is_bookable: formData.isPublic, // public booking visibility
        notes: formData.cptCode?.trim() ? `Code: ${formData.cptCode.trim()}` : null,
      }));

      const { error } = await supabase.from("procedures").insert(inserts as any);
      if (error) throw error;

      // Locations mapping is UI-only unless you add a junction table (not present in repo).
      // Tags/image upload are UI-only until you add storage + a tags field/table.

      toast.success("Service added successfully");
      onOpenChange(false);
      resetForm();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to add service");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Service</DialogTitle>
        </DialogHeader>

        {loadingDeps ? (
          <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading practice data...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div>
                <Label htmlFor="serviceName">Service Name</Label>
                <Input
                  id="serviceName"
                  value={formData.serviceName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, serviceName: e.target.value }))}
                  placeholder="e.g., General Consultation"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, duration: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {durations.map((duration) => (
                        <SelectItem key={duration.value} value={duration.value}>
                          {duration.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the service and what it includes..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="150"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label htmlFor="cptCode">CPT/ICD Code (Optional)</Label>
                  <Input
                    id="cptCode"
                    value={formData.cptCode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cptCode: e.target.value }))}
                    placeholder="e.g., 99213"
                  />
                </div>
              </div>
            </div>

            {/* Providers */}
            <div className="space-y-4">
              <Label>Providers Offering This Service</Label>
              <Card>
                <CardContent className="p-4">
                  {providers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No providers found.</p>
                  ) : (
                    <div className="space-y-2">
                      {providers.map((p) => (
                        <div key={p.doctor_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`prov-${p.doctor_id}`}
                            checked={formData.providers.includes(p.doctor_id)}
                            onCheckedChange={(checked) => handleProviderChange(p.doctor_id, checked as boolean)}
                          />
                          <Label htmlFor={`prov-${p.doctor_id}`}>
                            {p.full_name || "Unknown"}
                            {p.specialty ? ` • ${p.specialty}` : ""}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Locations (UI only unless mapping table exists) */}
            <div className="space-y-4">
              <Label>Available at Locations (optional)</Label>
              <Card>
                <CardContent className="p-4">
                  {locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No locations found.</p>
                  ) : (
                    <div className="space-y-2">
                      {locations.map((l) => (
                        <div key={l.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`loc-${l.id}`}
                            checked={formData.locations.includes(l.id)}
                            onCheckedChange={(checked) => handleLocationChange(l.id, checked as boolean)}
                          />
                          <Label htmlFor={`loc-${l.id}`}>{l.name}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Note: saving location-service mapping requires a junction table (not implemented here).
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tags (UI only unless you add storage/table) */}
            <div className="space-y-4">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" onClick={addTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <div
                      key={tag}
                      className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center gap-1"
                    >
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTag(tag)}
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Service Image (UI only until storage implemented) */}
            <div className="space-y-4">
              <Label>Service Image/Icon (Optional)</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                {uploadedImage ? (
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{uploadedImage.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setUploadedImage(null)}>
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
                        if (file) setUploadedImage(file);
                      }}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload requires Supabase Storage wiring (not included here).
              </p>
            </div>

            {/* Visibility */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Service Visibility</Label>
                <p className="text-sm text-muted-foreground">
                  Public services appear in patient booking. Internal services are for admin use only.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="visibility">Internal</Label>
                <Switch
                  id="visibility"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isPublic: checked }))}
                />
                <Label htmlFor="visibility">Public</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add Service"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
