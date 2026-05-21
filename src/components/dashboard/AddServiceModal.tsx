import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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

const serviceCategories: { value: string; label: string }[] = [
  { value: "general", label: "General" },
  { value: "diagnostic", label: "Diagnostic" },
  { value: "preventive", label: "Preventive" },
  { value: "restorative", label: "Restorative" },
  { value: "cosmetic", label: "Cosmetic" },
  { value: "orthodontic", label: "Orthodontic" },
  { value: "endodontic", label: "Endodontic" },
  { value: "periodontic", label: "Periodontic" },
  { value: "prosthodontic", label: "Prosthodontic" },
  { value: "oral_surgery", label: "Oral Surgery" },
  { value: "minor_surgery", label: "Minor Surgery" },
  { value: "emergency_dental", label: "Emergency" },
  { value: "general_consultation", label: "Consultation" },
  { value: "follow_up", label: "Follow-up" },
  { value: "vaccination", label: "Vaccination" },
  { value: "physical_therapy", label: "Physical Therapy" },
  { value: "mental_health", label: "Mental Health" },
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
  const { t } = useTranslation("dashboard");
  const [practiceId, setPracticeId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    serviceName: "",
    category: "",
    description: "",
    price: "",
    duration: "",
    providers: [] as string[],
    locations: [] as string[],
    tags: [] as string[],
    cptCode: "",
    isPublic: true,
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
          toast.error(t("addService.practiceNotFound"));
          return;
        }

        const { data: prov, error: provErr } = await supabase.rpc(
          "get_practice_providers" as any,
          { p_practice_id: pid }
        );
        if (provErr) throw provErr;
        setProviders((prov as any[]) || []);

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
        toast.error(e?.message || t("addService.loadFailed"));
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
    const tagVal = newTag.trim();
    if (!tagVal) return;
    if (formData.tags.includes(tagVal)) return;
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, tagVal] }));
    setNewTag("");
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((tag) => tag !== tagToRemove) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!practiceId) {
      toast.error(t("addService.practiceNotFoundSubmit"));
      return;
    }

    if (!formData.serviceName.trim()) {
      toast.error(t("addService.serviceNameRequired"));
      return;
    }

    if (!numericPrice || numericPrice <= 0) {
      toast.error(t("addService.validPriceRequired"));
      return;
    }

    if (!durationMinutes || durationMinutes <= 0) {
      toast.error(t("addService.durationRequired"));
      return;
    }

    if (formData.providers.length === 0) {
      toast.error(t("addService.selectProvider"));
      return;
    }

    setSaving(true);
    try {
      const inserts = formData.providers.map((doctorId) => ({
        name: formData.serviceName.trim(),
        description: formData.description.trim() || null,
        category: (formData.category || null) as any,
        default_cost: numericPrice,
        price: numericPrice,
        duration_minutes: durationMinutes,
        estimated_duration_minutes: durationMinutes,
        dentist_id: doctorId,
        is_active: true,
        is_bookable: formData.isPublic,
        notes: formData.cptCode?.trim() ? `Code: ${formData.cptCode.trim()}` : null,
      }));

      const { error } = await supabase.from("procedures").insert(inserts as any);
      if (error) throw error;

      toast.success(t("addService.serviceAdded"));
      onOpenChange(false);
      resetForm();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t("addService.addFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addService.title")}</DialogTitle>
        </DialogHeader>

        {loadingDeps ? (
          <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("addService.loadingData")}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t("addService.basicInfo")}</h3>
              <div>
                <Label htmlFor="serviceName">{t("addService.serviceName")}</Label>
                <Input
                  id="serviceName"
                  value={formData.serviceName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, serviceName: e.target.value }))}
                  placeholder={t("addService.serviceNamePlaceholder")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">{t("addService.category")}</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("addService.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">{t("addService.duration")}</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, duration: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("addService.selectDuration")} />
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
                <Label htmlFor="description">{t("addService.description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={t("addService.descriptionPlaceholder")}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">{t("addService.price")}</Label>
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
                  <Label htmlFor="cptCode">{t("addService.cptCode")}</Label>
                  <Input
                    id="cptCode"
                    value={formData.cptCode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cptCode: e.target.value }))}
                    placeholder="e.g., 99213"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label>{t("addService.providersOffering")}</Label>
              <Card>
                <CardContent className="p-4">
                  {providers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("addService.noProviders")}</p>
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

            <div className="space-y-4">
              <Label>{t("addService.availableAtLocations")}</Label>
              <Card>
                <CardContent className="p-4">
                  {locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("addService.noLocations")}</p>
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
                    {t("addService.locationNote")}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Label>{t("addService.tags")}</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder={t("addService.addTag")}
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

            <div className="space-y-4">
              <Label>{t("addService.serviceImage")}</Label>
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
                    <p className="mt-2 text-sm text-muted-foreground">{t("addService.clickToUpload")}</p>
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
                {t("addService.uploadNote")}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("addService.serviceVisibility")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("addService.visibilityDesc")}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="visibility">{t("addService.internal")}</Label>
                <Switch
                  id="visibility"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isPublic: checked }))}
                />
                <Label htmlFor="visibility">{t("addService.public")}</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                {t("addService.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("addService.saving")}
                  </>
                ) : (
                  t("addService.addServiceBtn")
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
