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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLocation?: any;
  onSaved?: () => void;
}

type PracticeLocationInsert = {
  practice_id: string;
  name: string;
  address?: string | null;
  zip_code?: string | null;
  phone?: string | null;
  email?: string | null;
  operating_hours?: any;
  photo_urls?: string[] | null;
  is_primary?: boolean | null;
};

type ProviderRow = {
  doctor_id: string;
  user_id: string;
  full_name: string | null;
  specialty: string | null;
  verified: boolean | null;
};

type ServiceRow = {
  id: string;
  name: string;
};

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

async function resolveMyPracticeId(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;

  const { data: adminPractice, error: adminErr } = await supabase
    .from("practices")
    .select("id")
    .eq("admin_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!adminErr && adminPractice?.id) return adminPractice.id;

  const { data: staffRow, error: staffErr } = await supabase
    .from("practice_staff")
    .select("practice_id,status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!staffErr && staffRow?.practice_id) return staffRow.practice_id;

  return null;
}

export const AddLocationModal = ({ open, onOpenChange, editingLocation, onSaved }: AddLocationModalProps) => {
  const { t } = useTranslation("dashboard");
  const isEditing = !!editingLocation;
  const [practiceId, setPracticeId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    locationName: "",
    address: "",
    zipCode: "",
    phoneNumber: "",
    email: "",
    assignedProviders: [] as string[],
    services: [] as string[],
    coordinates: "",
    isPrimary: false,
  });

  const [workingHours, setWorkingHours] = useState(
    daysOfWeek.reduce(
      (acc, day) => ({
        ...acc,
        [day]: { isOpen: true, startTime: "09:00", endTime: "17:00" },
      }),
      {} as Record<string, { isOpen: boolean; startTime: string; endTime: string }>
    )
  );

  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [saving, setSaving] = useState(false);

  const operatingHoursPayload = useMemo(() => {
    const obj: Record<string, any> = {};
    for (const day of daysOfWeek) {
      obj[day] = {
        isOpen: !!workingHours[day]?.isOpen,
        startTime: workingHours[day]?.startTime || null,
        endTime: workingHours[day]?.endTime || null,
      };
    }
    return obj;
  }, [workingHours]);

  useEffect(() => {
    if (!open) return;
    if (editingLocation) {
      setFormData({
        locationName: editingLocation.name || "",
        address: editingLocation.address || "",
        zipCode: editingLocation.zip_code || "",
        phoneNumber: editingLocation.phone || "",
        email: editingLocation.email || "",
        assignedProviders: [],
        services: [],
        coordinates: "",
        isPrimary: editingLocation.is_primary || false,
      });
      if (editingLocation.operating_hours && typeof editingLocation.operating_hours === "object") {
        const hours: Record<string, { isOpen: boolean; startTime: string; endTime: string }> = {};
        for (const day of daysOfWeek) {
          const dayData = (editingLocation.operating_hours as any)[day];
          hours[day] = {
            isOpen: dayData?.isOpen ?? true,
            startTime: dayData?.startTime || "09:00",
            endTime: dayData?.endTime || "17:00",
          };
        }
        setWorkingHours(hours);
      }
    } else {
      resetForm();
    }
  }, [open, editingLocation]);

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoadingDeps(true);
      try {
        const pid = editingLocation?.practice_id || await resolveMyPracticeId();
        setPracticeId(pid);

        if (!pid) {
          toast.error(t("addLocation.practiceNotFound"));
          return;
        }

        const { data: prov, error: provErr } = await supabase.rpc(
          "get_practice_providers" as any,
          { p_practice_id: pid }
        );
        if (provErr) throw provErr;
        setProviders((prov as any[]) || []);

        const { data: svc, error: svcErr } = await supabase.rpc(
          "get_practice_services" as any,
          { p_practice_id: pid }
        );
        if (svcErr) throw svcErr;

        const normalized: ServiceRow[] = ((svc as any[]) || []).map((s) => ({
          id: s.id,
          name: s.name,
        }));
        setServices(normalized);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || t("addLocation.loadFailed"));
      } finally {
        setLoadingDeps(false);
      }
    })();
  }, [open, editingLocation]);

  const resetForm = () => {
    setFormData({
      locationName: "",
      address: "",
      zipCode: "",
      phoneNumber: "",
      email: "",
      assignedProviders: [],
      services: [],
      coordinates: "",
      isPrimary: false,
    });
    setWorkingHours(
      daysOfWeek.reduce(
        (acc, day) => ({
          ...acc,
          [day]: { isOpen: true, startTime: "09:00", endTime: "17:00" },
        }),
        {} as Record<string, { isOpen: boolean; startTime: string; endTime: string }>
      )
    );
    setUploadedPhotos([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!practiceId) {
      toast.error(t("addLocation.practiceNotFoundSubmit"));
      return;
    }

    if (!formData.locationName.trim() || !formData.address.trim()) {
      toast.error(t("addLocation.nameAddressRequired"));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        practice_id: practiceId,
        name: formData.locationName.trim(),
        address: formData.address.trim(),
        zip_code: formData.zipCode.trim() || null,
        phone: formData.phoneNumber.trim() || null,
        email: formData.email.trim() || null,
        operating_hours: operatingHoursPayload,
        is_primary: formData.isPrimary ? true : false,
      };

      if (isEditing && editingLocation?.id) {
        const { error } = await supabase
          .from("practice_locations")
          .update(payload as any)
          .eq("id", editingLocation.id);
        if (error) throw error;
        toast.success(t("addLocation.locationUpdated"));
      } else {
        const { error } = await supabase.from("practice_locations").insert({ ...payload, photo_urls: null } as any);
        if (error) throw error;
        toast.success(t("addLocation.locationAdded"));
      }

      onOpenChange(false);
      resetForm();
      onSaved?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || (isEditing ? t("addLocation.updateFailed") : t("addLocation.addFailed")));
    } finally {
      setSaving(false);
    }
  };

  const handleProviderChange = (doctorId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      assignedProviders: checked
        ? [...prev.assignedProviders, doctorId]
        : prev.assignedProviders.filter((p) => p !== doctorId),
    }));
  };

  const handleServiceChange = (serviceId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      services: checked
        ? [...prev.services, serviceId]
        : prev.services.filter((s) => s !== serviceId),
    }));
  };

  const handleWorkingHoursChange = (
    day: string,
    field: string,
    value: string | boolean
  ) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const addPhoto = (file: File) => {
    if (uploadedPhotos.length < 6) {
      setUploadedPhotos((prev) => [...prev, file]);
    }
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("addLocation.titleEdit") : t("addLocation.titleAdd")}</DialogTitle>
        </DialogHeader>

        {loadingDeps ? (
          <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("addLocation.loadingData")}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t("addLocation.locationDetails")}</h3>

                  <div>
                    <Label htmlFor="locationName">{t("addLocation.locationName")}</Label>
                    <Input
                      id="locationName"
                      value={formData.locationName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          locationName: e.target.value,
                        }))
                      }
                      placeholder={t("addLocation.locationNamePlaceholder")}
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">{t("addLocation.address")}</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, address: e.target.value }))
                      }
                      placeholder={t("addLocation.addressPlaceholder")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zipCode">{t("addLocation.zipCode")}</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, zipCode: e.target.value }))
                        }
                        placeholder="12345"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber">{t("addLocation.phoneNumber")}</Label>
                      <Input
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            phoneNumber: e.target.value,
                          }))
                        }
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">{t("addLocation.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder={t("addLocation.emailPlaceholder")}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isPrimary"
                      checked={formData.isPrimary}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, isPrimary: !!checked }))
                      }
                    />
                    <Label htmlFor="isPrimary">{t("addLocation.setPrimary")}</Label>
                  </div>

                  <div>
                    <Label htmlFor="coordinates">{t("addLocation.coordinates")}</Label>
                    <Input
                      id="coordinates"
                      value={formData.coordinates}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          coordinates: e.target.value,
                        }))
                      }
                      placeholder={t("addLocation.coordinatesPlaceholder")}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">{t("addLocation.workingHours")}</h3>
                  </div>
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {daysOfWeek.map((day) => (
                          <div key={day} className="flex items-center gap-4">
                            <div className="w-20">
                              <Checkbox
                                id={day}
                                checked={workingHours[day]?.isOpen}
                                onCheckedChange={(checked) =>
                                  handleWorkingHoursChange(day, "isOpen", checked as boolean)
                                }
                              />
                              <Label htmlFor={day} className="ml-2 text-sm">
                                {day.slice(0, 3)}
                              </Label>
                            </div>

                            {workingHours[day]?.isOpen ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={workingHours[day]?.startTime}
                                  onChange={(e) =>
                                    handleWorkingHoursChange(day, "startTime", e.target.value)
                                  }
                                  className="w-24"
                                />
                                <span className="text-sm text-muted-foreground">{t("addLocation.to")}</span>
                                <Input
                                  type="time"
                                  value={workingHours[day]?.endTime}
                                  onChange={(e) =>
                                    handleWorkingHoursChange(day, "endTime", e.target.value)
                                  }
                                  className="w-24"
                                />
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">{t("addLocation.closed")}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>{t("addLocation.assignProviders")}</Label>
                  <Card>
                    <CardContent className="p-4">
                      {providers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("addLocation.noProviders")}</p>
                      ) : (
                        <div className="space-y-2">
                          {providers.map((p) => {
                            const label = p.full_name || "Unknown";
                            return (
                              <div key={p.doctor_id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`prov-${p.doctor_id}`}
                                  checked={formData.assignedProviders.includes(p.doctor_id)}
                                  onCheckedChange={(checked) =>
                                    handleProviderChange(p.doctor_id, checked as boolean)
                                  }
                                />
                                <Label htmlFor={`prov-${p.doctor_id}`}>
                                  {label}
                                  {p.specialty ? ` • ${p.specialty}` : ""}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="mt-3 text-xs text-muted-foreground">
                        {t("addLocation.providerNote")}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Label>{t("addLocation.servicesOffered")}</Label>
                  <Card>
                    <CardContent className="p-4">
                      {services.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("addLocation.noServices")}</p>
                      ) : (
                        <div className="space-y-2">
                          {services.map((s) => (
                            <div key={s.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`svc-${s.id}`}
                                checked={formData.services.includes(s.id)}
                                onCheckedChange={(checked) =>
                                  handleServiceChange(s.id, checked as boolean)
                                }
                              />
                              <Label htmlFor={`svc-${s.id}`}>{s.name}</Label>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="mt-3 text-xs text-muted-foreground">
                        {t("addLocation.serviceNote")}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Label>{t("addLocation.locationPhotos")}</Label>
                  <div className="space-y-4">
                    {uploadedPhotos.length < 6 && (
                      <label className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer block">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          {t("addLocation.clickToUploadPhotos", { current: uploadedPhotos.length })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("addLocation.photoSuggestion")}
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            files.forEach((file) => addPhoto(file));
                          }}
                        />
                      </label>
                    )}

                    {uploadedPhotos.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {uploadedPhotos.map((photo, index) => (
                          <div key={index} className="relative bg-muted p-2 rounded">
                            <div className="flex items-center justify-between">
                              <span className="text-sm truncate">{photo.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removePhoto(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t("addLocation.photoNote")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                {t("addLocation.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("addLocation.saving")}
                  </>
                ) : (
                  isEditing ? t("addLocation.updateLocation") : t("addLocation.addLocationBtn")
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
