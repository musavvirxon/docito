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
import { Upload, CheckCircle, AlertCircle, Clock, FileCheck, Lock, ExternalLink } from "lucide-react";
import { useDoctorData } from "@/contexts/DoctorDataContext";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useDoctorVerificationStatus } from "@/hooks/useDoctorVerificationStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface DoctorProfileSectionProps {
  doctorProfile?: any;
}

const DoctorProfileSection = ({ doctorProfile: propProfile }: DoctorProfileSectionProps) => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { doctorProfile: profile, loading, stats, refreshAll } = useDoctorData();
  const { verificationStatus, loading: verificationLoading } = useDoctorVerificationStatus();
  const { uploadFile, uploading } = useFileUpload();

  const doctorProfile = propProfile || profile;
  const profileCompletion = stats?.profileCompletion || 0;

  // Check if editing is locked based on verification status
  const isEditingLocked = verificationStatus?.status === 'pending' || verificationStatus?.status === 'resubmitted';

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

  useEffect(() => {
    const fetchProfileData = async () => {
      if (doctorProfile && user) {
        // Fetch username and profile_visibility from profiles table
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, profile_visibility')
          .eq('user_id', user.id)
          .single();

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
  }, [doctorProfile, user]);

  const verificationStatusText: "pending" | "verified" = doctorProfile?.verified ? "verified" : "pending";

  const specialties = [
    "Cardiology", "Dermatology", "Family Medicine", "Internal Medicine", 
    "Pediatrics", "Orthopedics", "Psychiatry", "Neurology", 
    "Gastroenterology", "Obstetrics & Gynecology"
  ];

  const languages = [
    "English", "Spanish", "Mandarin", "Hindi", "Arabic", "Portuguese", 
    "Russian", "Japanese", "German", "French", "Italian", "Korean"
  ];

  const consultationTypes = ["In-person", "Video", "Chat"];

  const handleSaveChanges = async () => {
    if (!user || !doctorProfile) {
      toast.error("User not authenticated");
      return;
    }

    if (isEditingLocked) {
      toast.error("Profile editing is locked while verification is pending");
      return;
    }

    try {
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

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('user_id', user.id);

      if (profileError) {
        toast.error('Failed to update profile information');
        return;
      }

      // Generate custom link
      let customLink = formData.custom_link;
      if (formData.profile_visibility === 'public' && formData.username) {
        customLink = formData.username.toLowerCase().replace(/\s+/g, '-');
      } else if (formData.profile_visibility === 'private') {
        customLink = `private-${doctorProfile.id.substring(0, 8)}`;
      }

      // Update doctors table
      const { error: doctorError } = await supabase
        .from('doctors')
        .update({
          specialty: formData.specialty,
          bio: formData.bio,
          license_number: formData.license_number,
          consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : undefined,
          custom_profile_link: customLink,
          years_experience: parseInt(formData.years_experience) || 5,
          languages: selectedLanguages,
          consultation_types: selectedConsultationTypes
        })
        .eq('user_id', user.id);

      if (doctorError) throw doctorError;

      toast.success('Profile updated successfully');
      
      // Refresh all data
      if (refreshAll) {
        await refreshAll();
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const result = await uploadFile(file, 'avatars', `${user.id}/avatar-${Date.now()}.jpg`);
    if (result) {
      await supabase
        .from('profiles')
        .update({ avatar_url: result.url })
        .eq('user_id', user.id);
      
      toast.success('Avatar uploaded successfully');
      
      if (refreshAll) {
        await refreshAll();
      }
    }
  };

  const toggleLanguage = (language: string) => {
    if (isEditingLocked) return;
    setSelectedLanguages(prev => 
      prev.includes(language) ? prev.filter(l => l !== language) : [...prev, language]
    );
  };

  const toggleConsultationType = (type: string) => {
    if (isEditingLocked) return;
    setSelectedConsultationTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!doctorProfile) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">{t("doctor.profile.noProfile")}</p>
      </div>
    );
  }

  const getVerificationIcon = () => {
    switch (verificationStatusText) {
      case "verified":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Clock className="w-5 h-5 text-amber-600" />;
    }
  };

  const getVerificationBadge = () => {
    switch (verificationStatusText) {
      case "verified":
        return <Badge className="bg-green-100 text-green-700">{t("doctor.profile.verified")}</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700">{t("doctor.profile.pendingVerification")}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Verification Status Alert */}
      {isEditingLocked && (
        <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-yellow-100/50 dark:from-yellow-950/20 dark:to-yellow-900/20 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Verification Pending
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-200 mt-1">
                  Your profile is locked for editing while your verification is being reviewed. 
                  You can view the status and manage documents in the Doctor Signup page.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => navigate('/doctor-signup')}
                >
                  View Verification Status <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          <div className="space-y-2 mt-4">
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
              <Button
                variant="outline"
                size="sm"
                disabled={uploading || isEditingLocked}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement)?.files?.[0];
                    if (file) {
                      handleAvatarUpload(file);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? t("doctor.profile.uploading") : t("doctor.profile.uploadPhoto")}
              </Button>
              <p className="text-sm text-muted-foreground">{t("doctor.profile.professionalHeadshot")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="fullName">{t("doctor.profile.fullName")}</Label>
              <Input
                id="fullName"
                value={doctorProfile.profiles?.full_name || ''}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="yearsExp">{t("doctor.profile.yearsExperience")}</Label>
              <Select
                value={formData.years_experience}
                onValueChange={(value) => setFormData(prev => ({ ...prev, years_experience: value }))}
                disabled={isEditingLocked}
              >
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
              <Select
                value={formData.specialty}
                onValueChange={(value) => setFormData(prev => ({ ...prev, specialty: value }))}
                disabled={isEditingLocked}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label htmlFor="email">{t("doctor.profile.email")}</Label>
              <Input
                id="email"
                value={doctorProfile.profiles?.email || ''}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bio">{t("doctor.profile.aboutMe")}</Label>
            <Textarea
              id="bio"
              placeholder={t("doctor.profile.bioPlaceholder")}
              className="min-h-[100px]"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              disabled={isEditingLocked}
            />
          </div>

          <div>
            <Label>{t("doctor.profile.languagesSpoken")}</Label>
            <p className="text-sm text-muted-foreground mb-3">{t("doctor.profile.languagesDescription")}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {languages.map((language) => (
                <div key={language} className="flex items-center space-x-2">
                  <Checkbox
                    id={language}
                    checked={selectedLanguages.includes(language)}
                    onCheckedChange={() => toggleLanguage(language)}
                    disabled={isEditingLocked}
                  />
                  <Label htmlFor={language} className="text-sm">{language}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Profile Visibility Settings */}
          <div className="border-t pt-6">
            <Label className="text-base mb-3 block">Profile Visibility</Label>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="public"
                  name="visibility"
                  checked={formData.profile_visibility === 'public'}
                  onChange={() => !isEditingLocked && setFormData(prev => ({ ...prev, profile_visibility: 'public' }))}
                  disabled={isEditingLocked}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="public" className="font-medium">Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Your profile will be searchable and visible to everyone
                  </p>
                </div>
              </div>

              {formData.profile_visibility === 'public' && (
                <div className="ml-6">
                  <Label htmlFor="username">Custom Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="dr-john-smith"
                    disabled={isEditingLocked}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your profile will be: {window.location.origin}/doctor/{formData.username || 'your-username'}
                  </p>
                </div>
              )}

              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="private"
                  name="visibility"
                  checked={formData.profile_visibility === 'private'}
                  onChange={() => !isEditingLocked && setFormData(prev => ({ ...prev, profile_visibility: 'private' }))}
                  disabled={isEditingLocked}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="private" className="font-medium">Private Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Only accessible via direct link (not searchable)
                  </p>
                </div>
              </div>
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
              <Input
                id="license"
                placeholder={t("doctor.profile.licenseNumber")}
                value={formData.license_number}
                onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                disabled={isEditingLocked}
              />
            </div>
            <div>
              <Label htmlFor="phone">{t("doctor.profile.phoneNumber")}</Label>
              <Input
                id="phone"
                placeholder={t("doctor.profile.phoneNumberPlaceholder")}
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={isEditingLocked}
              />
            </div>
          </div>

          <div>
            <Label>{t("doctor.profile.consultationTypes")}</Label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              {consultationTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={selectedConsultationTypes.includes(type)}
                    onCheckedChange={() => toggleConsultationType(type)}
                    disabled={isEditingLocked}
                  />
                  <Label htmlFor={type}>{type}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="fee">{t("doctor.profile.consultationFee")}</Label>
            <Input
              id="fee"
              type="number"
              placeholder={t("doctor.profile.consultationFeePlaceholder")}
              value={formData.consultation_fee}
              onChange={(e) => setFormData(prev => ({ ...prev, consultation_fee: e.target.value }))}
              disabled={isEditingLocked}
            />
          </div>

          {/* Note about verification documents */}
          <div className="border-t pt-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Verification Documents
              </h3>
              <p className="text-sm text-muted-foreground">
                To upload or update verification documents (medical license, professional ID, specialty certificates), 
                please visit the Doctor Signup page.
              </p>
              <Button 
                variant="link" 
                className="px-0 mt-2"
                onClick={() => navigate('/doctor-signup')}
              >
                Go to Doctor Signup <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveChanges}
          disabled={isEditingLocked}
          size="lg"
        >
          {isEditingLocked ? (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Profile Locked
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
};

export default DoctorProfileSection;
