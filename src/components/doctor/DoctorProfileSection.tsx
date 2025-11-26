import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, CheckCircle, AlertCircle, Clock, FileCheck } from "lucide-react";
import { useDoctorData } from "@/contexts/DoctorDataContext";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useDoctorVerification } from "@/hooks/useDoctorVerification";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
interface DoctorProfileSectionProps {
  doctorProfile?: {
    id: string;
    user_id: string;
    specialty: string;
    bio?: string;
    verified: boolean;
    license_number?: string;
    consultation_fee?: number;
    average_rating: number;
    num_reviews: number;
    profiles?: {
      full_name: string;
      email: string;
      avatar_url?: string;
      phone?: string;
    };
    practices?: {
      name: string;
      city: string;
      country: string;
      verified: boolean;
    };
  };
}
const DoctorProfileSection = ({
  doctorProfile: propProfile
}: DoctorProfileSectionProps) => {
  const {
    t
  } = useTranslation("dashboard");
  const {
    doctorProfile: profile,
    loading,
    updateProfile,
    stats,
    refreshAll
  } = useDoctorData();
  const doctorProfile = propProfile || profile;
  const profileCompletion = stats?.profileCompletion || 0;
  const {
    uploadFile,
    uploading
  } = useFileUpload();
  const {
    submitForVerification,
    isSubmitting
  } = useDoctorVerification();
  const [formData, setFormData] = useState({
    specialty: '',
    bio: '',
    license_number: '',
    consultation_fee: '',
    years_experience: '',
    phone: '',
    username: '',
    profile_visibility: 'public',
    custom_link: ''
  });
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["English"]);
  const [selectedConsultationTypes, setSelectedConsultationTypes] = useState<string[]>(["In-person", "Video"]);
  const [documents, setDocuments] = useState<{
    medical_license?: File;
    professional_id?: File;
    medical_license_url?: string;
    professional_id_url?: string;
  }>({});
  useEffect(() => {
    const fetchProfileData = async () => {
      if (doctorProfile) {
        // Fetch username and profile_visibility from profiles table
        const {
          data: profileData
        } = await supabase.from('profiles').select('username, profile_visibility').eq('user_id', doctorProfile.user_id).single();
        setFormData({
          specialty: doctorProfile.specialty || '',
          bio: doctorProfile.bio || '',
          license_number: doctorProfile.license_number || '',
          consultation_fee: doctorProfile.consultation_fee?.toString() || '',
          years_experience: (doctorProfile as any).years_experience?.toString() || '5',
          phone: doctorProfile.profiles?.phone || '',
          username: profileData?.username || '',
          profile_visibility: profileData?.profile_visibility || 'public',
          custom_link: (doctorProfile as any).custom_profile_link || ''
        });
        if ((doctorProfile as any).languages) {
          setSelectedLanguages((doctorProfile as any).languages);
        }
        if ((doctorProfile as any).consultation_types) {
          setSelectedConsultationTypes((doctorProfile as any).consultation_types);
        }
      }
    };
    fetchProfileData();
  }, [doctorProfile]);
  const verificationStatus: "pending" | "verified" = doctorProfile?.verified ? "verified" : "pending";
  const specialties = ["Cardiology", "Dermatology", "Family Medicine", "Internal Medicine", "Pediatrics", "Orthopedics", "Psychiatry", "Neurology", "Gastroenterology", "Obstetrics & Gynecology"];
  const languages = ["English", "Spanish", "Mandarin", "Hindi", "Arabic", "Portuguese", "Russian", "Japanese", "German", "French", "Italian", "Korean"];
  const consultationTypes = ["In-person", "Video", "Chat"];
  const handleSaveChanges = async () => {
    if (!updateProfile || !doctorProfile?.user_id) return;

    // Update profiles table (phone, username, profile_visibility)
    const profileUpdates: any = {
      phone: formData.phone
    };
    if (formData.username) {
      profileUpdates.username = formData.username;
    }
    if (formData.profile_visibility) {
      profileUpdates.profile_visibility = formData.profile_visibility;
    }
    const {
      error: profileError
    } = await supabase.from('profiles').update(profileUpdates).eq('user_id', doctorProfile.user_id);
    if (profileError) {
      toast.error('Failed to update profile information');
      return;
    }

    // Generate custom link if needed
    let customLink = formData.custom_link;
    if (formData.profile_visibility === 'public' && formData.username) {
      customLink = formData.username.toLowerCase().replace(/\s+/g, '-');
    } else if (formData.profile_visibility === 'private') {
      customLink = `private-${doctorProfile.id.substring(0, 8)}`;
    }

    // Update doctors table
    const updates = {
      specialty: formData.specialty,
      bio: formData.bio,
      license_number: formData.license_number,
      consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : undefined,
      custom_profile_link: customLink,
      years_experience: parseInt(formData.years_experience) || 5,
      languages: selectedLanguages,
      consultation_types: selectedConsultationTypes
    };
    const result = await updateProfile(updates);
    if (result.success) {
      toast.success('Profile updated successfully');
      // Refresh all data to update completion percentage
      if (refreshAll) {
        await refreshAll();
      }
    }
  };
  const handleAvatarUpload = async (file: File) => {
    if (!doctorProfile?.user_id) return;
    const result = await uploadFile(file, 'avatars', `${doctorProfile.user_id}/avatar-${Date.now()}.jpg`);
    if (result) {
      toast.success('Avatar uploaded successfully');
      // Refresh profile to show new avatar
    }
  };
  const handleDocumentUpload = (type: 'medical_license' | 'professional_id', file: File) => {
    setDocuments(prev => ({
      ...prev,
      [type]: file
    }));
    toast.success(`${type === 'medical_license' ? 'Medical License' : 'Professional ID'} selected`);
  };
  const handleSubmitVerification = async () => {
    if (!doctorProfile?.id) {
      toast.error('Doctor profile not found');
      return;
    }
    if (!formData.license_number) {
      toast.error('License number is required for verification');
      return;
    }
    if (!documents.medical_license && !documents.medical_license_url) {
      toast.error('Medical license document is required');
      return;
    }
    const result = await submitForVerification(doctorProfile.id, {
      specialty: formData.specialty,
      bio: formData.bio,
      license_number: formData.license_number,
      consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : 0,
      years_experience: formData.years_experience,
      languages: selectedLanguages,
      consultation_types: selectedConsultationTypes,
      documents
    });
    if (result.success) {
      // Clear documents after successful submission
      setDocuments({});
    }
  };
  const toggleLanguage = (language: string) => {
    setSelectedLanguages(prev => prev.includes(language) ? prev.filter(l => l !== language) : [...prev, language]);
  };
  const toggleConsultationType = (type: string) => {
    setSelectedConsultationTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };
  if (loading) {
    return <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  if (!doctorProfile) {
    return <div className="text-center p-8">
        <p className="text-muted-foreground">{t("doctor.profile.description")}</p>
      </div>;
  }
  const getVerificationIcon = () => {
    switch (verificationStatus) {
      case "verified":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Clock className="w-5 h-5 text-amber-600" />;
    }
  };
  const getVerificationBadge = () => {
    switch (verificationStatus) {
      case "verified":
        return <Badge className="bg-green-100 text-green-700">{t("doctor.profile.verified")}</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700">{t("doctor.profile.pendingVerification")}</Badge>;
    }
  };
  return <div className="space-y-6">
      {/* Profile Completion Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {t("doctor.profile.title")}
                {getVerificationIcon()}
              </CardTitle>
              <p className="text-muted-foreground">{t("doctor.profile.description")}</p>
            </div>
            {getVerificationBadge()}
          </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("doctor.profile.progress")}</span>
                <span className="font-medium">{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} className="h-2" />
            </div>
        </CardHeader>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("doctor.profile.basicInformation")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={doctorProfile.profiles?.avatar_url} />
              <AvatarFallback className="text-lg">
                {doctorProfile.profiles?.full_name?.charAt(0) || 'DR'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = e => {
                const file = (e.target as HTMLInputElement)?.files?.[0];
                if (file) {
                  handleAvatarUpload(file);
                }
              };
              input.click();
            }}>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? t("doctor.profile.uploading") : t("doctor.profile.uploadPhoto")}
              </Button>
              <p className="text-sm text-muted-foreground">{t("doctor.profile.professionalHeadshot")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="fullName">{t("doctor.profile.fullName")}</Label>
              <Input id="fullName" value={doctorProfile.profiles?.full_name || ''} readOnly className="bg-muted" />
            </div>
            <div>
              <Label htmlFor="degree">{t("doctor.profile.yearsExperience")}</Label>
              <Select value={formData.years_experience} onValueChange={value => setFormData(prev => ({
              ...prev,
              years_experience: value
            }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-2">0-2 years</SelectItem>
                  <SelectItem value="3-5">3-5 years</SelectItem>
                  <SelectItem value="6-10">6-10 years</SelectItem>
                  <SelectItem value="11-15">11-15 years</SelectItem>
                  <SelectItem value="16-20">16-20 years</SelectItem>
                  <SelectItem value="20+">20+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="specialty">{t("doctor.profile.specialty")} *</Label>
              <Select value={formData.specialty.toLowerCase()} onValueChange={value => setFormData(prev => ({
              ...prev,
              specialty: value
            }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map(specialty => <SelectItem key={specialty} value={specialty.toLowerCase()}>
                      {specialty}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="email">{t("doctor.profile.email")}</Label>
              <Input id="email" value={doctorProfile.profiles?.email || ''} readOnly className="bg-muted" />
            </div>
          </div>

          <div>
            <Label htmlFor="bio">{t("doctor.profile.aboutMe")}</Label>
            <Textarea id="bio" placeholder={t("doctor.profile.bioPlaceholder")} className="min-h-[100px]" value={formData.bio} onChange={e => setFormData(prev => ({
            ...prev,
            bio: e.target.value
          }))} />
          </div>

          <div>
            <Label>{t("doctor.profile.languagesSpoken")}</Label>
            <p className="text-sm text-muted-foreground mb-3">{t("doctor.profile.languagesDescription")}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {languages.map(language => <div key={language} className="flex items-center space-x-2">
                  <Checkbox id={language} checked={selectedLanguages.includes(language)} onCheckedChange={() => toggleLanguage(language)} />
                  <Label htmlFor={language} className="text-sm">{language}</Label>
                </div>)}
            </div>
          </div>

          {/* Profile Visibility Settings */}
          <div className="border-t pt-6">
            <Label className="text-base mb-3 block">Profile Visibility</Label>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <input type="radio" id="public" name="visibility" checked={formData.profile_visibility === 'public'} onChange={() => setFormData(prev => ({
                ...prev,
                profile_visibility: 'public'
              }))} className="mt-1" />
                <div>
                  <Label htmlFor="public" className="font-medium">Public Profile</Label>
                  <p className="text-sm text-muted-foreground">Your profile will be searchable and visible to everyone</p>
                </div>
              </div>
              
              {formData.profile_visibility === 'public' && <div className="ml-6">
                  <Label htmlFor="username">Custom Username</Label>
                  <Input id="username" value={formData.username} onChange={e => setFormData(prev => ({
                ...prev,
                username: e.target.value
              }))} placeholder="dr-john-smith" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your profile will be: {window.location.origin}/doctor/{formData.username || 'your-username'}
                  </p>
                </div>}

              <div className="flex items-start space-x-3">
                <input type="radio" id="private" name="visibility" checked={formData.profile_visibility === 'private'} onChange={() => setFormData(prev => ({
                ...prev,
                profile_visibility: 'private'
              }))} className="mt-1" />
                <div>
                  <Label htmlFor="private" className="font-medium">Private Profile</Label>
                  <p className="text-sm text-muted-foreground">Only accessible via direct link (not searchable)</p>
                </div>
              </div>

              {formData.custom_link && <div className="ml-6 p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Your private profile link:</p>
                  <p className="text-sm font-mono">{window.location.origin}/doctor/{formData.custom_link}</p>
                </div>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t("doctor.profile.professionalDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="license">{t("doctor.profile.medicalLicense")}</Label>
              <Input id="license" placeholder={t("doctor.profile.licenseNumber")} value={formData.license_number} onChange={e => setFormData(prev => ({
              ...prev,
              license_number: e.target.value
            }))} />
            </div>
            <div>
              <Label htmlFor="phone">{t("doctor.profile.phoneNumber")}</Label>
              <Input id="phone" placeholder={t("doctor.profile.phoneNumber")} value={formData.phone || doctorProfile.profiles?.phone || ''} onChange={e => setFormData(prev => ({
              ...prev,
              phone: e.target.value
            }))} />
            </div>
          </div>

          <div>
            <Label>{t("doctor.profile.consultationTypes")}</Label>
            <div className="flex space-x-4 mt-2">
              {consultationTypes.map(type => <div key={type} className="flex items-center space-x-2">
                  <Checkbox id={type} checked={selectedConsultationTypes.includes(type)} onCheckedChange={() => toggleConsultationType(type)} />
                  <Label htmlFor={type} className="text-sm">{type}</Label>
                </div>)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="defaultPrice">{t("doctor.profile.defaultPrice")}</Label>
              <Input id="defaultPrice" placeholder="150" type="number" value={formData.consultation_fee} onChange={e => setFormData(prev => ({
              ...prev,
              consultation_fee: e.target.value
            }))} />
            </div>
            <div>
              <Label htmlFor="location">{t("doctor.profile.primaryLocation")}</Label>
              <Input id="location" placeholder="City, State" defaultValue={doctorProfile.practices ? `${doctorProfile.practices.city}, ${doctorProfile.practices.country}` : ''} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Documents */}
      <Card>
        <CardHeader>
          <CardTitle>{t("doctor.profile.verificationDocuments")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`border-2 border-dashed rounded-lg p-6 text-center ${documents.medical_license ? 'border-green-500 bg-green-50' : 'border-border'}`}>
              {documents.medical_license ? <FileCheck className="w-8 h-8 mx-auto mb-2 text-green-600" /> : <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />}
              <p className="text-sm font-medium mb-1">{t("doctor.profile.medicalLicenseDoc")}</p>
              <p className="text-xs text-muted-foreground mb-2">
                {documents.medical_license ? documents.medical_license.name : t("doctor.profile.uploadLicenseDoc")}
              </p>
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf,.jpg,.jpeg,.png';
              input.onchange = e => {
                const file = (e.target as HTMLInputElement)?.files?.[0];
                if (file) handleDocumentUpload('medical_license', file);
              };
              input.click();
            }}>
                {documents.medical_license ? t("doctor.profile.changeFile") : t("doctor.profile.chooseFile")}
              </Button>
            </div>
            <div className={`border-2 border-dashed rounded-lg p-6 text-center ${documents.professional_id ? 'border-green-500 bg-green-50' : 'border-border'}`}>
              {documents.professional_id ? <FileCheck className="w-8 h-8 mx-auto mb-2 text-green-600" /> : <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />}
              <p className="text-sm font-medium mb-1">Professional ID</p>
              <p className="text-xs text-muted-foreground mb-2">
                {documents.professional_id ? documents.professional_id.name : 'Government issued ID (PDF, JPG, PNG)'}
              </p>
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf,.jpg,.jpeg,.png';
              input.onchange = e => {
                const file = (e.target as HTMLInputElement)?.files?.[0];
                if (file) handleDocumentUpload('professional_id', file);
              };
              input.click();
            }}>
                {documents.professional_id ? 'Change File' : 'Choose File'}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSaveChanges} disabled={isSubmitting}>Save Changes</Button>
            
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default DoctorProfileSection;