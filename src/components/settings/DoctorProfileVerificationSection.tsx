import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Stethoscope, Clock, Calendar, GraduationCap, 
  Loader2, AlertCircle, Upload, Shield, CheckCircle2, XCircle, Camera
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useDoctorVerification } from "@/hooks/useDoctorVerification";
import { useDoctorVerificationStatus } from "@/hooks/useDoctorVerificationStatus";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAllCountries } from "@/config/countryDocumentRequirements";
import { getRegionsForCountry } from "@/config/countryRegions";
import {
  allLanguages,
  consultationTypes,
  experienceOptions,
} from "@/config/doctorFormData";

type UploadedFile = {
  file: File | null;
  url?: string;
  name?: string;
};

export function DoctorProfileVerificationSection() {
  const { user } = useAuth();
  const { uploadFile } = useFileUpload();
  const { submitForVerification, isSubmitting } = useDoctorVerification();
  const { verificationStatus, refetch: refetchStatus } = useDoctorVerificationStatus();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);
  
  // Profile fields that sync with doctor cards
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [acceptsNewPatients, setAcceptsNewPatients] = useState(true);
  const [telemedEnabled, setTelemedEnabled] = useState(false);
  
  // Location
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  
  // Multi-selects
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedConsultationTypes, setSelectedConsultationTypes] = useState<string[]>([]);
  
  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  // Verification documents
  const [medicalLicense, setMedicalLicense] = useState<UploadedFile>({ file: null });
  const [professionalId, setProfessionalId] = useState<UploadedFile>({ file: null });
  
  // Country requirements
  const availableCountries = useMemo(() => getAllCountries(), []);
  const availableRegions = useMemo(() => {
    if (!country) return [];
    return getRegionsForCountry(country);
  }, [country]);
  
  // Verification status helpers
  const isPending = verificationStatus?.status === "pending";
  const isVerified = verificationStatus?.status === "verified" || doctor?.verified;
  const isDeclined = verificationStatus?.status === "declined";
  
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, phone, avatar_url, address")
          .eq("user_id", user.id)
          .maybeSingle();
        
        // Fetch doctor
        const { data: doctorData, error } = await supabase
          .from("doctors")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (profileData) {
          const nameParts = (profileData.full_name || "").split(" ");
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(" ") || "");
          setAvatarUrl(profileData.avatar_url || null);
          
          // Parse address
          if (profileData.address) {
            const addressParts = profileData.address.split(",").map((s: string) => s.trim());
            if (addressParts.length >= 2) {
              setCountry(addressParts[addressParts.length - 1]);
              setRegion(addressParts.slice(0, -1).join(", "));
            } else if (addressParts.length === 1) {
              setCountry(addressParts[0]);
            }
          }
        }
        
        if (doctorData) {
          setDoctor(doctorData);
          setSpecialty(doctorData.specialty || "");
          setBio(doctorData.bio || "");
          setLicenseNumber(doctorData.license_number || "");
          setYearsExperience(doctorData.years_experience?.toString() || "");
          setConsultationFee(doctorData.consultation_fee?.toString() || "");
          setAcceptsNewPatients(doctorData.accepts_new_patients ?? true);
          setTelemedEnabled(doctorData.consultation_types?.includes("telehealth") || false);
          
          if (doctorData.specialty) {
            setSelectedSpecialties([doctorData.specialty]);
          }
          if (doctorData.languages?.length) {
            setSelectedLanguages(doctorData.languages);
          }
          if (doctorData.consultation_types?.length) {
            setSelectedConsultationTypes(doctorData.consultation_types);
          }
        }
      } catch (err) {
        console.error("Error fetching doctor data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Avatar must be under 5MB");
        return;
      }
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      let newAvatarUrl = avatarUrl;
      
      // Upload avatar if changed
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const result = await uploadFile(
          avatarFile,
          "avatars",
          `${user.id}/avatar-${Date.now()}.${ext}`
        );
        if (result?.url) {
          newAvatarUrl = result.url;
        }
      }
      
      const fullName = `${firstName} ${lastName}`.trim();
      const address = [region, country].filter(Boolean).join(", ") || null;
      
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          avatar_url: newAvatarUrl,
          address,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      
      if (profileError) throw profileError;
      
      // Update doctor record (this syncs with doctor cards)
      const consultationTypesList = telemedEnabled 
        ? [...new Set([...selectedConsultationTypes, "telehealth"])]
        : selectedConsultationTypes.filter(t => t !== "telehealth");
      
      const doctorPayload = {
        specialty: selectedSpecialties[0] || specialty || "General Practice",
        bio,
        license_number: licenseNumber,
        years_experience: yearsExperience ? parseInt(yearsExperience) : null,
        consultation_fee: consultationFee ? parseFloat(consultationFee) : null,
        accepts_new_patients: acceptsNewPatients,
        consultation_types: consultationTypesList.length ? consultationTypesList : null,
        languages: selectedLanguages.length ? selectedLanguages : null,
      };
      
      if (doctor?.id) {
        const { error: doctorError } = await supabase
          .from("doctors")
          .update(doctorPayload)
          .eq("id", doctor.id);
        
        if (doctorError) throw doctorError;
      } else {
        // Create doctor record if doesn't exist
        const { data: newDoctor, error: createError } = await supabase
          .from("doctors")
          .insert({
            ...doctorPayload,
            user_id: user.id,
          })
          .select("id")
          .single();
        
        if (createError) throw createError;
        setDoctor({ ...doctorPayload, id: newDoctor.id });
      }
      
      setAvatarFile(null);
      toast.success("Profile saved - your doctor card has been updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!user || !doctor?.id) {
      toast.error("Please save your profile first");
      return;
    }
    
    if (!medicalLicense.file && !medicalLicense.url) {
      toast.error("Please upload your medical license");
      return;
    }
    
    if (!professionalId.file && !professionalId.url) {
      toast.error("Please upload your professional ID");
      return;
    }
    
    const result = await submitForVerification(doctor.id, {
      specialty: selectedSpecialties[0] || specialty || "General Practice",
      bio,
      license_number: licenseNumber,
      consultation_fee: consultationFee ? parseFloat(consultationFee) : 0,
      years_experience: yearsExperience,
      languages: selectedLanguages,
      consultation_types: selectedConsultationTypes,
      documents: {
        medical_license: medicalLicense.file || undefined,
        professional_id: professionalId.file || undefined,
        medical_license_url: medicalLicense.url,
        professional_id_url: professionalId.url,
      },
      additional_data: {
        first_name: firstName,
        last_name: lastName,
        email: user.email || "",
        country,
        region,
        all_specialties: selectedSpecialties,
      },
    });
    
    if (result?.success) {
      await refetchStatus();
      toast.success("Verification submitted! You'll be notified once reviewed.");
    }
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const toggleConsultationType = (type: string) => {
    setSelectedConsultationTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verification Status Banner */}
      {verificationStatus && (
        <Alert className={cn(
          isVerified && "border-green-500/50 bg-green-500/10",
          isPending && "border-blue-500/50 bg-blue-500/10",
          isDeclined && "border-red-500/50 bg-red-500/10"
        )}>
          {isVerified && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          {isPending && <Clock className="h-4 w-4 text-blue-600" />}
          {isDeclined && <XCircle className="h-4 w-4 text-red-600" />}
          <AlertTitle className={cn(
            isVerified && "text-green-700 dark:text-green-400",
            isPending && "text-blue-700 dark:text-blue-400",
            isDeclined && "text-red-700 dark:text-red-400"
          )}>
            {isVerified && "Profile Verified"}
            {isPending && "Verification Pending"}
            {isDeclined && "Verification Declined"}
          </AlertTitle>
          <AlertDescription className="text-sm">
            {isVerified && "Your profile is verified. Patients can book appointments with you."}
            {isPending && "Your application is under review. We'll notify you once it's processed."}
            {isDeclined && (
              <>
                {verificationStatus.rejection_reason || "Your application was declined. Please update your information and resubmit."}
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!verificationStatus && !isVerified && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">Complete Your Verification</AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-300">
            Fill out your profile and upload required documents to get verified. Once verified, patients will be able to book appointments with you.
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Photo & Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Doctor Profile
          </CardTitle>
          <CardDescription>
            This information appears on your doctor card and profile page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10">
                  {firstName?.charAt(0) || "D"}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Profile Photo</p>
              <p className="text-sm text-muted-foreground">
                This photo will appear on your doctor card
              </p>
            </div>
          </div>

          <Separator />

          {/* Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
              />
            </div>
          </div>

          {/* Specialty */}
          <div className="space-y-2">
            <Label>Primary Specialty</Label>
            <Input 
              value={specialty} 
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g., General Dentistry, Cardiology"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label>Professional Bio</Label>
            <Textarea 
              value={bio} 
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell patients about your experience, approach to care, and specializations..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This appears on your public profile and helps patients choose you
            </p>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {availableCountries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Region / City</Label>
              {availableRegions.length > 0 ? (
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRegions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input 
                  value={region} 
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Enter city or region"
                />
              )}
            </div>
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <Label>Languages Spoken</Label>
            <div className="flex flex-wrap gap-2">
              {allLanguages.slice(0, 15).map((lang) => (
                <Badge
                  key={lang}
                  variant={selectedLanguages.includes(lang) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleLanguage(lang)}
                >
                  {lang}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Professional Credentials
          </CardTitle>
          <CardDescription>Your medical license and experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input 
                value={licenseNumber} 
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="Medical license number"
              />
            </div>
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Select value={yearsExperience} onValueChange={setYearsExperience}>
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduling & Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Availability & Pricing
          </CardTitle>
          <CardDescription>Configure your appointment settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Consultation Fee ($)</Label>
            <Input 
              type="number"
              value={consultationFee} 
              onChange={(e) => setConsultationFee(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-3">
            <Label>Consultation Types</Label>
            <div className="flex flex-wrap gap-2">
              {consultationTypes.map((type) => (
                <Badge
                  key={type}
                  variant={selectedConsultationTypes.includes(type) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleConsultationType(type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Accept New Patients</p>
              <p className="text-sm text-muted-foreground">Allow new patients to book with you</p>
            </div>
            <Switch checked={acceptsNewPatients} onCheckedChange={setAcceptsNewPatients} />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Telemedicine</p>
              <p className="text-sm text-muted-foreground">Offer video consultations</p>
            </div>
            <Switch checked={telemedEnabled} onCheckedChange={setTelemedEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Verification Documents */}
      {!isVerified && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Verification Documents
            </CardTitle>
            <CardDescription>
              Upload your credentials to get verified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Medical License */}
            <div className="space-y-2">
              <Label>Medical License *</Label>
              <div className="border rounded-lg p-4 space-y-2">
                {medicalLicense.file ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{medicalLicense.file.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setMedicalLicense({ file: null })}
                    >
                      Remove
                    </Button>
                  </div>
                ) : medicalLicense.url ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Document uploaded ✓</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setMedicalLicense({ file: null })}
                    >
                      Replace
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    <span>Upload medical license (PDF, JPG, PNG)</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setMedicalLicense({ file });
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Professional ID */}
            <div className="space-y-2">
              <Label>Professional ID *</Label>
              <div className="border rounded-lg p-4 space-y-2">
                {professionalId.file ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{professionalId.file.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setProfessionalId({ file: null })}
                    >
                      Remove
                    </Button>
                  </div>
                ) : professionalId.url ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Document uploaded ✓</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setProfessionalId({ file: null })}
                    >
                      Replace
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    <span>Upload professional ID (PDF, JPG, PNG)</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setProfessionalId({ file });
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {(isDeclined || !verificationStatus) && (
              <Button 
                onClick={handleSubmitVerification} 
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isDeclined ? "Resubmit for Verification" : "Submit for Verification"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button onClick={handleSaveProfile} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Profile
        </Button>
      </div>
    </div>
  );
}

export default DoctorProfileVerificationSection;