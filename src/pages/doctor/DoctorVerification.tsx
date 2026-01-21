// Path: src/pages/doctor/DoctorVerification.tsx

import Header from "@/components/Header";
import Footer from "@/components/Footer";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useDoctorVerification } from "@/hooks/useDoctorVerification";

import {
  getAllCountries,
  getCountryRequirements,
  type DocumentRequirement,
} from "@/config/countryDocumentRequirements";
import { getRegionsForCountry } from "@/config/countryRegions";
import {
  specialtyCategories,
  allLanguages,
  consultationTypes,
  experienceOptions,
  validatePhoneNumber,
} from "@/config/doctorFormData";

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

type UploadKind =
  | "avatar"
  | "medical_license"
  | "professional_id"
  | "specialty_document"
  | "additional_certificate"
  | "country_doc";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required").trim(),
  lastName: z.string().min(1, "Last name is required").trim(),
  gender: z.string().min(1, "Gender is required"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .refine((v) => validatePhoneNumber(v).isValid, "Enter a valid phone number"),
  degrees: z.string().min(1, "Degrees are required").trim(),
  experience: z.string().min(1, "Experience is required"),
  licenseNumber: z.string().min(1, "License number is required").trim(),
  country: z.string().min(1, "Country is required"),
  region: z.string().min(1, "Region is required"),
  bio: z.string().min(10, "Bio must be at least 10 characters").trim(),

  username: z.string().optional(),
  profileVisibility: z.enum(["public", "private"]).default("public"),

  accuracyConfirmed: z
    .boolean()
    .refine((v) => v === true, "You must confirm accuracy"),
  termsAccepted: z
    .boolean()
    .refine((v) => v === true, "You must accept Terms"),
});

type FormValues = z.infer<typeof formSchema>;

function acceptToInputAccept(accept: string) {
  return accept;
}

function prettyBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function validateFile(file: File, kind: UploadKind, accept?: string) {
  const maxMb =
    kind === "avatar" ? 5 : kind === "additional_certificate" ? 10 : 10;

  const max = maxMb * 1024 * 1024;

  if (file.size > max) {
    return `File too large. Max ${maxMb}MB. Selected: ${prettyBytes(file.size)}`;
  }

  if (accept) {
    const allowed = accept
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (allowed.length > 0 && !allowed.includes(ext)) {
      return `Invalid file type. Allowed: ${allowed.join(", ")}`;
    }
  }

  return null;
}

function FilePick({
  label,
  hint,
  accept,
  required,
  file,
  onPick,
  onRemove,
  kind,
}: {
  label: string;
  hint?: string;
  accept?: string;
  required?: boolean;
  file: File | null;
  onPick: (f: File) => void;
  onRemove: () => void;
  kind: UploadKind;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="font-medium">
          {label} {required ? <span className="text-red-500">*</span> : null}
        </Label>
        <div className="flex items-center gap-2">
          {file ? (
            <Button type="button" variant="outline" size="sm" onClick={onRemove}>
              Remove
            </Button>
          ) : null}
          <Button
            type="button"
            variant={file ? "secondary" : "default"}
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            {file ? "Change" : "Upload"}
          </Button>
        </div>
      </div>

      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept ? acceptToInputAccept(accept) : undefined}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;

          const err = validateFile(f, kind, accept);
          if (err) {
            toast.error(err);
            e.currentTarget.value = "";
            return;
          }

          onPick(f);
          e.currentTarget.value = "";
        }}
      />

      {file ? (
        <div className="rounded-md border p-3 text-sm">
          <div className="font-medium">{file.name}</div>
          <div className="text-muted-foreground">{prettyBytes(file.size)}</div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No file selected
        </div>
      )}
    </div>
  );
}

export default function DoctorVerification() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { uploadFile, uploading: uploadingAvatar } = useFileUpload();
  const { submitForVerification, isSubmitting } = useDoctorVerification();

  // Multi-select states (kept outside RHF for simplicity + UI control)
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  const [languageSearch, setLanguageSearch] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const [selectedConsultationTypes, setSelectedConsultationTypes] = useState<
    string[]
  >([]);

  // Files
  const [avatar, setAvatar] = useState<File | null>(null);
  const [medicalLicense, setMedicalLicense] = useState<File | null>(null);
  const [professionalId, setProfessionalId] = useState<File | null>(null);
  const [specialtyDocuments, setSpecialtyDocuments] = useState<File[]>([]);
  const [additionalCertificates, setAdditionalCertificates] = useState<File[]>(
    []
  );
  const [countryDocs, setCountryDocs] = useState<Record<string, File>>({});

  // Country requirements
  const availableCountries = useMemo(() => getAllCountries(), []);
  const [countryCode, setCountryCode] = useState<string>("");
  const [requiredDocuments, setRequiredDocuments] = useState<
    DocumentRequirement[]
  >([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "",
      phone: "",
      degrees: "",
      experience: "",
      licenseNumber: "",
      country: "",
      region: "",
      bio: "",

      username: "",
      profileVisibility: "public",

      accuracyConfirmed: false,
      termsAccepted: false,
    },
    mode: "onTouched",
  });

  const watchedCountry = form.watch("country");
  const availableRegions = useMemo(() => {
    if (!watchedCountry) return [];
    return getRegionsForCountry(watchedCountry);
  }, [watchedCountry]);

  // Auth gate
  useEffect(() => {
    if (!loading && !user) {
      toast.error("Please log in to complete your doctor profile");
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // When country code changes -> update requirements
  useEffect(() => {
    if (!countryCode) {
      setRequiredDocuments([]);
      return;
    }
    setRequiredDocuments(getCountryRequirements(countryCode));
  }, [countryCode]);

  // Load draft (existing doctors/profiles data)
  useEffect(() => {
    const loadDraft = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, gender, username, profile_visibility")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: doctor } = await supabase
        .from("doctors")
        .select(
          "id, specialty, bio, license_number, languages, consultation_types, years_experience"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.full_name) {
        const parts = profile.full_name.split(" ").filter(Boolean);
        form.setValue("firstName", parts[0] ?? "");
        form.setValue("lastName", parts.slice(1).join(" ") ?? "");
      }
      if (profile?.phone) form.setValue("phone", profile.phone);
      if (profile?.gender) form.setValue("gender", profile.gender);
      if (profile?.username) form.setValue("username", profile.username);
      if (profile?.profile_visibility) {
        form.setValue(
          "profileVisibility",
          (profile.profile_visibility as any) || "public"
        );
      }

      if (doctor?.specialty) setSelectedSpecialties([doctor.specialty]);
      if (doctor?.bio) form.setValue("bio", doctor.bio);
      if (doctor?.license_number)
        form.setValue("licenseNumber", doctor.license_number);
      if (doctor?.languages?.length) setSelectedLanguages(doctor.languages);
      if (doctor?.consultation_types?.length)
        setSelectedConsultationTypes(doctor.consultation_types);

      if (doctor?.years_experience != null) {
        const match = experienceOptions.find((opt) =>
          opt.value.startsWith(String(doctor.years_experience))
        );
        if (match) form.setValue("experience", match.value);
      }
    };

    loadDraft().catch((e) => {
      console.error(e);
      toast.error("Failed to load draft");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filteredCategories = useMemo(() => {
    const q = specialtySearch.trim().toLowerCase();
    const keys = Object.keys(specialtyCategories);

    if (!q) return keys;

    return keys.filter((cat) => {
      if (cat.toLowerCase().includes(q)) return true;
      const subs = specialtyCategories[cat] || [];
      return subs.some((s) => s.toLowerCase().includes(q));
    });
  }, [specialtySearch]);

  const filteredLanguages = useMemo(() => {
    const q = languageSearch.trim().toLowerCase();
    if (!q) return allLanguages.filter((l) => !selectedLanguages.includes(l));
    return allLanguages
      .filter((l) => l.toLowerCase().includes(q))
      .filter((l) => !selectedLanguages.includes(l));
  }, [languageSearch, selectedLanguages]);

  const toggleSpecialty = (cat: string, sub: string) => {
    const full = `${cat} - ${sub}`;
    setSelectedSpecialties((prev) => {
      if (prev.includes(full)) return prev.filter((x) => x !== full);
      if (prev.length >= 5) {
        toast.error("Max 5 specialties allowed");
        return prev;
      }
      return [...prev, full];
    });
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((x) => x !== lang) : [...prev, lang]
    );
  };

  const toggleConsultationType = (t: string) => {
    setSelectedConsultationTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    try {
      let avatarUrl: string | undefined = undefined;
      if (avatar) {
        const ext = avatar.name.split(".").pop() || "jpg";
        const res = await uploadFile(
          avatar,
          "avatars",
          `${user.id}/avatar-${Date.now()}.${ext}`
        );
        avatarUrl = res?.url;
      }

      await supabase
        .from("profiles")
        .update({
          full_name:
            `${form.getValues("firstName")} ${form.getValues("lastName")}`.trim() ||
            undefined,
          phone: form.getValues("phone") || undefined,
          gender: (form.getValues("gender") as any) || undefined,
          username: form.getValues("username") || null,
          profile_visibility: form.getValues("profileVisibility") || "public",
          avatar_url: avatarUrl || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      const { data: existingDoctor } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const yearsExp = form.getValues("experience");
      const parsedYears = yearsExp ? parseInt(yearsExp.split("-")[0], 10) : null;

      const doctorPayload = {
        specialty: selectedSpecialties[0] || "General Practice",
        bio: form.getValues("bio") || null,
        license_number: form.getValues("licenseNumber") || null,
        languages: selectedLanguages.length ? selectedLanguages : null,
        consultation_types: selectedConsultationTypes.length
          ? selectedConsultationTypes
          : null,
        years_experience: Number.isFinite(parsedYears as any) ? parsedYears : null,
        verified: false,
      };

      if (existingDoctor?.id) {
        await supabase.from("doctors").update(doctorPayload).eq("id", existingDoctor.id);
      } else {
        await supabase.from("doctors").insert({
          ...doctorPayload,
          user_id: user.id,
        });
      }

      toast.success("Draft saved");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save draft");
    }
  };

  const validateDocumentsBeforeSubmit = () => {
    if (!countryCode) {
      toast.error("Please select a country (from the list) so we can show required documents.");
      return false;
    }

    const req = requiredDocuments.filter((d) => d.required);
    const missing: string[] = [];

    for (const d of req) {
      if (d.key === "medical_license") {
        if (!medicalLicense) missing.push(d.label);
        continue;
      }
      if (d.key === "professional_id") {
        if (!professionalId) missing.push(d.label);
        continue;
      }
      if (!countryDocs[d.key]) missing.push(d.label);
    }

    if (missing.length) {
      toast.error(`Missing required documents: ${missing.join(", ")}`);
      return false;
    }

    return true;
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    if (selectedSpecialties.length === 0) {
      toast.error("Please select at least one specialty");
      return;
    }
    if (selectedLanguages.length === 0) {
      toast.error("Please select at least one language");
      return;
    }
    if (!medicalLicense || !professionalId) {
      toast.error("Please upload your medical license and professional ID");
      return;
    }
    if (!validateDocumentsBeforeSubmit()) return;

    try {
      let avatarUrl: string | undefined = undefined;
      if (avatar) {
        const ext = avatar.name.split(".").pop() || "jpg";
        const res = await uploadFile(
          avatar,
          "avatars",
          `${user.id}/avatar-${Date.now()}.${ext}`
        );
        avatarUrl = res?.url;
      }

      const fullName = `${values.firstName} ${values.lastName}`.trim();
      const profileVisibility = values.profileVisibility;

      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: values.phone,
          gender: values.gender as any,
          address: `${values.region}, ${values.country}`,
          username: values.username || null,
          profile_visibility: profileVisibility,
          avatar_url: avatarUrl || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      const { data: existingDoctor } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const generatedLink =
        profileVisibility === "private"
          ? `doctor-${user.id.substring(0, 8)}-${Date.now()}`
          : values.username || null;

      let doctorId: string;

      if (existingDoctor?.id) {
        await supabase
          .from("doctors")
          .update({
            specialty: selectedSpecialties[0] || "General Practice",
            bio: values.bio,
            license_number: values.licenseNumber,
            consultation_fee: 0,
            custom_profile_link: generatedLink,
            verified: false,
          })
          .eq("id", existingDoctor.id);

        doctorId = existingDoctor.id;
      } else {
        const { data: inserted, error } = await supabase
          .from("doctors")
          .insert({
            user_id: user.id,
            specialty: selectedSpecialties[0] || "General Practice",
            bio: values.bio,
            license_number: values.licenseNumber,
            consultation_fee: 0,
            custom_profile_link: generatedLink,
            verified: false,
          })
          .select("id")
          .single();

        if (error) throw error;
        doctorId = inserted.id;
      }

      const result = await submitForVerification(doctorId, {
        specialty: selectedSpecialties[0] || "General Practice",
        bio: values.bio,
        license_number: values.licenseNumber,
        consultation_fee: 0,
        years_experience: values.experience,
        languages: selectedLanguages,
        consultation_types: selectedConsultationTypes.length
          ? selectedConsultationTypes
          : ["In-person", "Video"],
        documents: {
          medical_license: medicalLicense,
          professional_id: professionalId,
          specialty_documents: specialtyDocuments.length
            ? specialtyDocuments
            : undefined,
          additional_certificates: additionalCertificates.length
            ? additionalCertificates
            : undefined,
          country_specific_documents: countryDocs,
        },
        additional_data: {
          first_name: values.firstName,
          last_name: values.lastName,
          gender: values.gender,
          phone: values.phone,
          email: user.email || "",
          degrees: values.degrees,
          country: values.country,
          region: values.region,
          avatar_uploaded: !!avatar,
          avatar_url: avatarUrl || "",
          all_specialties: selectedSpecialties,
          preferred_appointment_types: selectedConsultationTypes,
        },
      });

      if (result?.success) {
        toast.success("Profile submitted for verification!");
        toast.info(
          "A super admin will review your application. You'll be notified once reviewed."
        );
        navigate("/doctor-dashboard");
      } else {
        toast.error("Submission failed");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to submit profile for verification");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold">Doctor Verification</h1>
            <p className="text-muted-foreground">
              Fill out your profile and upload documents. Your account stays private until verified.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={uploadingAvatar || isSubmitting}
            >
              Save Draft
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/doctor-dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Personal */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="prefer_not_to_say">
                                Prefer not to say
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone *</FormLabel>
                          <FormControl>
                            <Input placeholder="+1234567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FilePick
                    label="Profile photo"
                    hint="PNG/JPG, max 5MB"
                    accept=".png,.jpg,.jpeg"
                    required={false}
                    file={avatar}
                    kind="avatar"
                    onPick={(f) => setAvatar(f)}
                    onRemove={() => setAvatar(null)}
                  />
                </CardContent>
              </Card>

              {/* Profile visibility */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="dr-johndoe" {...field} />
                          </FormControl>
                          <p className="text-sm text-muted-foreground">
                            Used as your public profile link when visibility is public.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="profileVisibility"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visibility</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="public">
                                Public (after verification)
                              </SelectItem>
                              <SelectItem value="private">Private link only</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Professional */}
              <Card>
                <CardHeader>
                  <CardTitle>Professional details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="degrees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Degrees *</FormLabel>
                        <FormControl>
                          <Input placeholder="MD, MBBS, DDS..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select experience" />
                            </SelectTrigger>
                            <SelectContent>
                              {experienceOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="licenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License number *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="License / registration number"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio *</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={5}
                            placeholder="Short professional bio, experience, areas of focus..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(name) => {
                              field.onChange(name);
                              const found = availableCountries.find(
                                (c) => c.name === name
                              );
                              setCountryCode(found?.code || "");
                              form.setValue("region", "");
                              setCountryDocs({});
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCountries
                                .slice()
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((c) => (
                                  <SelectItem key={c.code} value={c.name}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region/State *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  watchedCountry ? "Select region" : "Select country first"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRegions.length ? (
                                availableRegions.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {r}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__none" disabled>
                                  No regions available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Specialties */}
              <Card>
                <CardHeader>
                  <CardTitle>Specialties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Selected (max 5) *</Label>
                    {selectedSpecialties.length ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedSpecialties.map((s) => (
                          <Badge
                            key={s}
                            className="cursor-pointer"
                            variant="secondary"
                            onClick={() =>
                              setSelectedSpecialties((prev) =>
                                prev.filter((x) => x !== s)
                              )
                            }
                            title="Click to remove"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No specialties selected
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Search specialties</Label>
                    <Input
                      value={specialtySearch}
                      onChange={(e) => setSpecialtySearch(e.target.value)}
                      placeholder="Type to filter categories/specialties..."
                    />
                  </div>

                  <div className="space-y-3">
                    {filteredCategories.map((cat) => {
                      const subs = specialtyCategories[cat] || [];
                      const isOpen = expandedCategory === cat;

                      return (
                        <div key={cat} className="rounded-lg border">
                          <button
                            type="button"
                            className="w-full px-4 py-3 flex items-center justify-between"
                            onClick={() =>
                              setExpandedCategory((p) => (p === cat ? null : cat))
                            }
                          >
                            <span className="font-medium">{cat}</span>
                            <span className="text-sm text-muted-foreground">
                              {isOpen ? "Hide" : "Show"}
                            </span>
                          </button>

                          {isOpen ? (
                            <div className="px-4 pb-4 space-y-2">
                              {subs.map((sub) => {
                                const full = `${cat} - ${sub}`;
                                const checked = selectedSpecialties.includes(full);
                                return (
                                  <label
                                    key={full}
                                    className={cn(
                                      "flex items-center justify-between gap-3 rounded-md border p-3 cursor-pointer",
                                      checked && "bg-muted"
                                    )}
                                  >
                                    <div className="text-sm">{sub}</div>
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() =>
                                        toggleSpecialty(cat, sub)
                                      }
                                    />
                                  </label>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Languages + consultation types */}
              <Card>
                <CardHeader>
                  <CardTitle>Languages & consultation types</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Languages you speak *</Label>
                    {selectedLanguages.length ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedLanguages.map((l) => (
                          <Badge
                            key={l}
                            className="cursor-pointer"
                            variant="secondary"
                            onClick={() =>
                              setSelectedLanguages((prev) =>
                                prev.filter((x) => x !== l)
                              )
                            }
                            title="Click to remove"
                          >
                            {l}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No languages selected
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Search languages</Label>
                    <Input
                      value={languageSearch}
                      onChange={(e) => setLanguageSearch(e.target.value)}
                      placeholder="Type to filter languages..."
                    />
                    <div className="max-h-64 overflow-auto rounded-lg border p-3 space-y-2">
                      {filteredLanguages.slice(0, 80).map((lang) => (
                        <label
                          key={lang}
                          className="flex items-center justify-between gap-3 rounded-md border p-2 cursor-pointer"
                        >
                          <span className="text-sm">{lang}</span>
                          <Checkbox
                            checked={selectedLanguages.includes(lang)}
                            onCheckedChange={() => toggleLanguage(lang)}
                          />
                        </label>
                      ))}
                      {filteredLanguages.length > 80 ? (
                        <p className="text-xs text-muted-foreground pt-2">
                          Showing first 80 results. Keep typing to narrow down.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Consultation types (optional)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {consultationTypes.map((t) => (
                        <label
                          key={t}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-md border p-3 cursor-pointer",
                            selectedConsultationTypes.includes(t) && "bg-muted"
                          )}
                        >
                          <span className="text-sm">{t}</span>
                          <Checkbox
                            checked={selectedConsultationTypes.includes(t)}
                            onCheckedChange={() => toggleConsultationType(t)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Documents */}
              <Card>
                <CardHeader>
                  <CardTitle>Verification documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <FilePick
                    label="Medical license"
                    required
                    accept=".pdf,.jpg,.jpeg,.png"
                    file={medicalLicense}
                    kind="medical_license"
                    onPick={(f) => setMedicalLicense(f)}
                    onRemove={() => setMedicalLicense(null)}
                  />

                  <FilePick
                    label="Professional ID / Medical council registration"
                    required
                    accept=".pdf,.jpg,.jpeg,.png"
                    file={professionalId}
                    kind="professional_id"
                    onPick={(f) => setProfessionalId(f)}
                    onRemove={() => setProfessionalId(null)}
                  />

                  <div className="space-y-3">
                    <Label>Country-specific required documents</Label>
                    {!countryCode ? (
                      <p className="text-sm text-muted-foreground">
                        Select a country above to see the required document list.
                      </p>
                    ) : (
                      <div className="space-y-6">
                        {requiredDocuments
                          .filter(
                            (d) =>
                              !["medical_license", "professional_id"].includes(d.key)
                          )
                          .map((doc) => {
                            const current = countryDocs[doc.key] || null;

                            return (
                              <FilePick
                                key={doc.key}
                                label={doc.label}
                                required={doc.required}
                                hint={
                                  doc.description
                                    ? `${doc.description} • Formats: ${doc.acceptedFormats}`
                                    : `Formats: ${doc.acceptedFormats}`
                                }
                                accept={doc.acceptedFormats}
                                file={current}
                                kind="country_doc"
                                onPick={(f) =>
                                  setCountryDocs((prev) => ({
                                    ...prev,
                                    [doc.key]: f,
                                  }))
                                }
                                onRemove={() =>
                                  setCountryDocs((prev) => {
                                    const next = { ...prev };
                                    delete next[doc.key];
                                    return next;
                                  })
                                }
                              />
                            );
                          })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Optional: Specialty documents</Label>
                    <p className="text-sm text-muted-foreground">
                      Upload certificates relevant to your selected specialties (optional).
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = ".pdf,.jpg,.jpeg,.png";
                          input.onchange = () => {
                            const f = input.files?.[0];
                            if (!f) return;
                            const err = validateFile(
                              f,
                              "specialty_document",
                              ".pdf,.jpg,.jpeg,.png"
                            );
                            if (err) return toast.error(err);
                            setSpecialtyDocuments((prev) => [...prev, f]);
                          };
                          input.click();
                        }}
                      >
                        Add specialty document
                      </Button>
                      {specialtyDocuments.length ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setSpecialtyDocuments([])}
                        >
                          Clear all
                        </Button>
                      ) : null}
                    </div>

                    {specialtyDocuments.length ? (
                      <div className="space-y-2">
                        {specialtyDocuments.map((f, idx) => (
                          <div
                            key={`${f.name}-${idx}`}
                            className="flex items-center justify-between gap-3 rounded-md border p-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {f.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {prettyBytes(f.size)}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSpecialtyDocuments((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No specialty documents added
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Optional: Additional certificates</Label>
                    <p className="text-sm text-muted-foreground">
                      Up to 10 files. (CPD, board certs, trainings, etc.)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (additionalCertificates.length >= 10) {
                            toast.error("Maximum 10 additional certificates");
                            return;
                          }
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = ".pdf,.jpg,.jpeg,.png";
                          input.onchange = () => {
                            const f = input.files?.[0];
                            if (!f) return;
                            const err = validateFile(
                              f,
                              "additional_certificate",
                              ".pdf,.jpg,.jpeg,.png"
                            );
                            if (err) return toast.error(err);
                            setAdditionalCertificates((prev) => [...prev, f]);
                          };
                          input.click();
                        }}
                      >
                        Add certificate
                      </Button>
                      {additionalCertificates.length ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setAdditionalCertificates([])}
                        >
                          Clear all
                        </Button>
                      ) : null}
                    </div>

                    {additionalCertificates.length ? (
                      <div className="space-y-2">
                        {additionalCertificates.map((f, idx) => (
                          <div
                            key={`${f.name}-${idx}`}
                            className="flex items-center justify-between gap-3 rounded-md border p-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {f.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {prettyBytes(f.size)}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setAdditionalCertificates((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No certificates added
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Confirmations */}
              <Card>
                <CardHeader>
                  <CardTitle>Confirm & submit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <FormField
                    control={form.control}
                    name="accuracyConfirmed"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <div className="space-y-1">
                            <FormLabel className="cursor-pointer">
                              I confirm all information provided is accurate
                            </FormLabel>
                            <p className="text-sm text-muted-foreground">
                              False information can lead to rejection or account suspension.
                            </p>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <div className="space-y-1">
                            <FormLabel className="cursor-pointer">
                              I accept the Terms of Service and Privacy Policy
                            </FormLabel>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      type="submit"
                      className="w-full sm:w-auto"
                      disabled={isSubmitting || uploadingAvatar}
                    >
                      {isSubmitting ? "Submitting..." : "Submit for verification"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={handleSaveDraft}
                      disabled={isSubmitting || uploadingAvatar}
                    >
                      Save draft
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    After submission, your profile will be reviewed by a super admin. You’ll be notified once verified.
                  </p>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
