import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Upload, Info, User, Briefcase, Building2, FileText, Settings, Shield, FileCheck } from "lucide-react";
import { useSimpleForm } from "@/hooks/useSimpleForm";
import { useQuickNavigate } from "@/hooks/useQuickNavigate";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useDoctorVerification } from "@/hooks/useDoctorVerification";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const DoctorSignUp = () => {
  const { t } = useTranslation('auth');
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [hasAssociatedPractice, setHasAssociatedPractice] = useState<string>("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [languageSearch, setLanguageSearch] = useState("");
  const [clinicSearch, setClinicSearch] = useState("");
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [showManualClinic, setShowManualClinic] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [medicalLicense, setMedicalLicense] = useState<File | null>(null);
  const [professionalId, setProfessionalId] = useState<File | null>(null);
  
  const { navigateToDoctorDashboard } = useQuickNavigate();
  const { uploadFile, uploading } = useFileUpload();
  const { submitForVerification, isSubmitting } = useDoctorVerification();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      toast.error('Please log in to complete your doctor profile');
      navigate('/auth');
    }
  }, [user, loading, navigate]);
  
  const {
    formData,
    updateField,
    fillDummyData,
    isLoading,
    handleSubmit,
    canFillDummy,
    isDevMode
  } = useSimpleForm({
    firstName: "",
    lastName: "",
    gender: "",
    phone: "",
    specialty: "",
    degrees: "",
    experience: "",
    license: "",
    country: "",
    region: "",
    bio: ""
  }, 'doctor');

  const specialties = [
    "Family Medicine", "Internal Medicine", "Cardiology", "Dermatology", 
    "Pediatrics", "Orthopedics", "Psychiatry", "Neurology", "Gastroenterology",
    "Obstetrics & Gynecology", "Radiology", "Anesthesiology", "Emergency Medicine",
    "Pediatric Dentist", "General Dentist", "Orthodontist", "Endodontist"
  ];

  const allLanguages = [
    "English", "Spanish", "Mandarin", "Hindi", "Arabic", "Portuguese", 
    "Russian", "Japanese", "German", "French", "Italian", "Korean",
    "Chinese", "Urdu", "Persian", "Turkish", "Uzbek", "Vietnamese",
    "Thai", "Indonesian", "Malay", "Filipino", "Dutch", "Swedish",
    "Norwegian", "Danish", "Finnish", "Polish", "Czech", "Hungarian",
    "Romanian", "Bulgarian", "Greek", "Hebrew", "Swahili", "Amharic"
  ];

  const countries = [
    "United States", "Canada", "United Kingdom", "Australia", "Germany",
    "France", "Spain", "Italy", "Netherlands", "Sweden", "Norway"
  ];

  const usStates = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"
  ];

  const mockClinics = [
    { id: 1, name: "Metro Medical Center", address: "123 Main St, New York, NY", verified: true },
    { id: 2, name: "Downtown Health Clinic", address: "456 Oak Ave, Los Angeles, CA", verified: true },
    { id: 3, name: "Family Care Associates", address: "789 Pine St, Chicago, IL", verified: false }
  ];

  const toggleLanguage = (language: string) => {
    setSelectedLanguages(prev => 
      prev.includes(language) 
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  const removeLanguage = (language: string) => {
    setSelectedLanguages(prev => prev.filter(l => l !== language));
  };

  const filteredLanguages = allLanguages.filter(lang => 
    lang.toLowerCase().includes(languageSearch.toLowerCase()) &&
    !selectedLanguages.includes(lang)
  );

  const filteredClinics = mockClinics.filter(clinic =>
    clinic.name.toLowerCase().includes(clinicSearch.toLowerCase())
  );

  const handleAvatarUpload = (file: File) => {
    setAvatar(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    toast.success(t('doctorSignup.messages.photoSelected'));
  };

  const handleDocumentUpload = (type: 'medical_license' | 'professional_id', file: File) => {
    if (type === 'medical_license') {
      setMedicalLicense(file);
      toast.success(t('doctorSignup.messages.licenseSelected'));
    } else {
      setProfessionalId(file);
      toast.success(t('doctorSignup.messages.idSelected'));
    }
  };

  const handleDoctorOnboarding = async () => {
    if (!user) {
      toast.error('You must be logged in to complete your profile');
      navigate('/auth');
      return;
    }

    try {
      // Upload avatar if provided
      let avatar_url = '';
      if (avatar) {
        const avatarResult = await uploadFile(avatar, 'avatars', `${user.id}/avatar-${Date.now()}.jpg`);
        if (avatarResult) avatar_url = avatarResult.url;
      }

      // Check if doctor profile already exists
      const { data: existingDoctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let doctorId: string;

      if (existingDoctor) {
        // Update existing doctor profile
        const { error: updateError } = await supabase
          .from('doctors')
          .update({
            specialty: formData.specialty || 'General Practice',
            bio: formData.bio,
            license_number: formData.license,
            consultation_fee: 0,
          })
          .eq('id', existingDoctor.id);

        if (updateError) throw updateError;
        doctorId = existingDoctor.id;
      } else {
        // Create new doctor profile (unverified by default)
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .insert({
            user_id: user.id,
            specialty: formData.specialty || 'General Practice',
            bio: formData.bio,
            license_number: formData.license,
            consultation_fee: 0,
            verified: false,
          })
          .select()
          .single();

        if (doctorError) throw doctorError;
        doctorId = doctorData.id;
      }

      // Submit for super-admin verification
      const result = await submitForVerification(doctorId, {
        specialty: formData.specialty || 'General Practice',
        bio: formData.bio || '',
        license_number: formData.license || '',
        consultation_fee: 0,
        years_experience: formData.experience,
        languages: selectedLanguages,
        consultation_types: ['In-person', 'Video'],
        documents: {
          medical_license: medicalLicense || undefined,
          professional_id: professionalId || undefined,
        },
      });

      if (result.success) {
        toast.success('Profile submitted for verification!');
        toast.info('A super admin will review your application. You will be notified once it is reviewed.');
        navigate('/doctor-dashboard');
      }
    } catch (error: any) {
      console.error('Error submitting profile:', error);
      toast.error(error.message || 'Failed to submit profile for verification');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(handleDoctorOnboarding, { skipValidation: true });
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Complete Your Doctor Profile
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              Submit your profile for verification by our team
            </p>
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <Shield className="w-4 h-4 inline mr-2" />
                Your profile will be reviewed by a super admin before becoming public. You'll receive a notification once verified.
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <div key={step} className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-medium">
                    {step}
                  </div>
                  {step < 6 && <div className="w-8 h-0.5 bg-blue-200"></div>}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-8">
            {/* Section 1: Personal Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  {t('doctorSignup.sections.personal')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="firstName">{t('doctorSignup.fields.firstName')} ({t('doctorSignup.buttons.optional')})</Label>
                    <Input id="firstName" placeholder={t('doctorSignup.placeholders.firstName')} />
                  </div>
                  <div>
                    <Label htmlFor="lastName">{t('doctorSignup.fields.lastName')} ({t('doctorSignup.buttons.optional')})</Label>
                    <Input id="lastName" placeholder={t('doctorSignup.placeholders.lastName')} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="gender">{t('doctorSignup.fields.gender')} ({t('doctorSignup.buttons.optional')})</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder={t('doctorSignup.placeholders.selectGender')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t('doctorSignup.gender.male')}</SelectItem>
                        <SelectItem value="female">{t('doctorSignup.gender.female')}</SelectItem>
                        <SelectItem value="other">{t('doctorSignup.gender.other')}</SelectItem>
                        <SelectItem value="prefer-not-to-say">{t('doctorSignup.gender.preferNotToSay')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="phone">{t('doctorSignup.fields.phone')} ({t('doctorSignup.buttons.optional')})</Label>
                    <Input id="phone" placeholder={t('doctorSignup.placeholders.phone')} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Professional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
                  {t('doctorSignup.sections.professional')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="specialty">{t('doctorSignup.fields.specialty')} ({t('doctorSignup.buttons.optional')})</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={t('doctorSignup.placeholders.selectSpecialty')} />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.map((specialty) => (
                        <SelectItem key={specialty} value={specialty.toLowerCase().replace(/\s+/g, '-')}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="degrees">{t('doctorSignup.fields.degrees')}</Label>
                  <Input id="degrees" placeholder={t('doctorSignup.placeholders.degrees')} />
                  <p className="text-sm text-muted-foreground mt-1">{t('doctorSignup.help.degreesMultiple')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="experience">{t('doctorSignup.fields.experience')}</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder={t('doctorSignup.placeholders.selectExperience')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-2">{t('doctorSignup.experience.0-2')}</SelectItem>
                        <SelectItem value="3-5">{t('doctorSignup.experience.3-5')}</SelectItem>
                        <SelectItem value="6-10">{t('doctorSignup.experience.6-10')}</SelectItem>
                        <SelectItem value="11-15">{t('doctorSignup.experience.11-15')}</SelectItem>
                        <SelectItem value="16-20">{t('doctorSignup.experience.16-20')}</SelectItem>
                        <SelectItem value="20+">{t('doctorSignup.experience.20+')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="license">{t('doctorSignup.fields.license')}</Label>
                    <div className="relative">
                      <Input id="license" placeholder={t('doctorSignup.placeholders.license')} />
                      <Info className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{t('doctorSignup.help.licenseVerification')}</p>
                  </div>
                </div>

                <div>
                  <Label>{t('doctorSignup.fields.languages')}</Label>
                  <p className="text-sm text-muted-foreground mb-3">{t('doctorSignup.help.languagesSelect')}</p>
                  
                  {/* Selected Languages */}
                  {selectedLanguages.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {selectedLanguages.map((language) => (
                          <Badge key={language} variant="secondary" className="px-3 py-1">
                            {language}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-2 h-auto p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => removeLanguage(language)}
                            >
                              ×
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Language Search */}
                  <div className="relative mb-3">
                    <Input
                      placeholder={t('doctorSignup.placeholders.searchLanguages')}
                      value={languageSearch}
                      onChange={(e) => setLanguageSearch(e.target.value)}
                    />
                  </div>

                  {/* Language Options */}
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                    {filteredLanguages.slice(0, 10).map((language) => (
                      <div 
                        key={language} 
                        className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => toggleLanguage(language)}
                      >
                        <Checkbox 
                          id={language}
                          checked={selectedLanguages.includes(language)}
                        />
                        <Label htmlFor={language} className="text-sm cursor-pointer">{language}</Label>
                      </div>
                    ))}
                    {filteredLanguages.length === 0 && (
                      <p className="text-sm text-muted-foreground p-2">{t('doctorSignup.messages.noLanguagesFound')}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Location & Clinic Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                  {t('doctorSignup.sections.location')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Country and Region */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">{t('doctorSignup.fields.country')} ({t('doctorSignup.buttons.optional')})</Label>
                    <Select value={formData.country} onValueChange={(value) => updateField('country', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('doctorSignup.placeholders.selectCountry')} />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((countryOption) => (
                          <SelectItem key={countryOption} value={countryOption.toLowerCase()}>
                            {countryOption}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="region">{t('doctorSignup.fields.region')} ({t('doctorSignup.buttons.optional')})</Label>
                    <Select value={formData.region} onValueChange={(value) => updateField('region', value)} disabled={!formData.country}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('doctorSignup.placeholders.selectRegion')} />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.country === "united states" && usStates.map((state) => (
                          <SelectItem key={state} value={state.toLowerCase()}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Clinic Search */}
                <div>
                  <Label htmlFor="clinic-search">{t('doctorSignup.clinic.searchTitle')}</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('doctorSignup.help.clinicSearch')}
                  </p>
                  <div className="relative">
                    <Input
                      id="clinic-search"
                      placeholder={t('doctorSignup.placeholders.clinicSearch')}
                      value={clinicSearch}
                      onChange={(e) => setClinicSearch(e.target.value)}
                    />
                  </div>

                  {/* Search Results */}
                  {clinicSearch && (
                    <div className="mt-3 border rounded-lg max-h-60 overflow-y-auto">
                      {filteredClinics.length > 0 ? (
                        filteredClinics.map((clinic) => (
                          <div
                            key={clinic.id}
                            className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-muted ${
                              selectedClinic?.id === clinic.id ? 'bg-blue-50 border-blue-200' : ''
                            }`}
                            onClick={() => setSelectedClinic(clinic)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{clinic.name}</h4>
                                <p className="text-sm text-muted-foreground">{clinic.address}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {clinic.verified && (
                                  <Badge variant="default" className="text-xs">{t('doctorSignup.clinic.verified')}</Badge>
                                )}
                                {selectedClinic?.id === clinic.id && (
                                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-3">
                            {t('doctorSignup.clinic.noClinicFound')}
                          </p>
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowManualClinic(true)}
                          >
                            {t('doctorSignup.clinic.addManually')}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Manual Clinic Entry */}
                {(showManualClinic || (!clinicSearch && !selectedClinic)) && (
                  <Card className="border-orange-200 bg-orange-50/30">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Info className="w-5 h-5 mr-2 text-orange-600" />
                        {t('doctorSignup.clinic.addInformation')}
                      </CardTitle>
                      <p className="text-sm text-orange-700">
                        {t('doctorSignup.clinic.verificationNote')}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="practice-name">{t('doctorSignup.fields.practiceName')} ({t('doctorSignup.buttons.optional')})</Label>
                        <Input id="practice-name" placeholder={t('doctorSignup.placeholders.practiceName')} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="practice-phone">{t('doctorSignup.fields.practicePhone')}</Label>
                          <Input id="practice-phone" placeholder={t('doctorSignup.placeholders.phone')} />
                        </div>
                        <div>
                          <Label htmlFor="practice-email">{t('doctorSignup.fields.practiceEmail')}</Label>
                          <Input id="practice-email" type="email" placeholder={t('doctorSignup.placeholders.email')} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="practice-address">{t('doctorSignup.fields.practiceAddress')} {t('doctorSignup.clinic.required')}</Label>
                        <Textarea 
                          id="practice-address" 
                          placeholder={t('doctorSignup.placeholders.practiceAddress')}
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <p className="text-sm text-amber-700">
                          📍 <strong>{t('doctorSignup.buttons.optional')}:</strong> {t('doctorSignup.help.manualClinicNote')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Selected Clinic Display */}
                {selectedClinic && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-green-800">{t('doctorSignup.clinic.selectedClinic')}</h4>
                        <p className="text-green-700">{selectedClinic.name}</p>
                        <p className="text-sm text-green-600">{selectedClinic.address}</p>
                      </div>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedClinic(null)}
                      >
                        {t('doctorSignup.clinic.change')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 4: Profile Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  {t('doctorSignup.sections.profile')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="bio">{t('doctorSignup.fields.bio')}</Label>
                  <Textarea 
                    id="bio" 
                    placeholder={t('doctorSignup.placeholders.bio')}
                    className="min-h-[100px]"
                    value={formData.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">{t('doctorSignup.help.bioLength')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>{t('doctorSignup.fields.profilePhoto')}</Label>
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                      avatar ? 'border-green-500 bg-green-50' : 'border-border'
                    }`}>
                      {avatarPreview ? (
                        <div className="space-y-2">
                          <img src={avatarPreview} alt="Avatar preview" className="w-24 h-24 mx-auto rounded-full object-cover" />
                          <FileCheck className="w-6 h-6 mx-auto text-green-600" />
                        </div>
                      ) : (
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      )}
                      <p className="text-sm text-muted-foreground mb-2">
                        {avatar ? avatar.name : t('doctorSignup.placeholders.uploadPhoto')}
                      </p>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        disabled={uploading}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement)?.files?.[0];
                            if (file) handleAvatarUpload(file);
                          };
                          input.click();
                        }}
                      >
                        {avatar ? t('doctorSignup.buttons.changeFile') : t('doctorSignup.buttons.chooseFile')}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{t('doctorSignup.help.professionalHeadshot')}</p>
                  </div>
                  <div>
                    <Label>{t('doctorSignup.fields.medicalLicense')}</Label>
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center mb-3 ${
                      medicalLicense ? 'border-green-500 bg-green-50' : 'border-border'
                    }`}>
                      {medicalLicense ? (
                        <FileCheck className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      ) : (
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      )}
                      <p className="text-sm text-muted-foreground mb-2">
                        {medicalLicense ? medicalLicense.name : t('doctorSignup.placeholders.uploadLicense')}
                      </p>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        disabled={uploading}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.pdf,.jpg,.jpeg,.png';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement)?.files?.[0];
                            if (file) handleDocumentUpload('medical_license', file);
                          };
                          input.click();
                        }}
                      >
                        {medicalLicense ? t('doctorSignup.buttons.changeFile') : t('doctorSignup.buttons.chooseFile')}
                      </Button>
                    </div>
                    
                    <Label>{t('doctorSignup.fields.professionalId')}</Label>
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                      professionalId ? 'border-green-500 bg-green-50' : 'border-border'
                    }`}>
                      {professionalId ? (
                        <FileCheck className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      ) : (
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      )}
                      <p className="text-sm text-muted-foreground mb-2">
                        {professionalId ? professionalId.name : t('doctorSignup.placeholders.uploadId')}
                      </p>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        disabled={uploading}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.pdf,.jpg,.jpeg,.png';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement)?.files?.[0];
                            if (file) handleDocumentUpload('professional_id', file);
                          };
                          input.click();
                        }}
                      >
                        {professionalId ? t('doctorSignup.buttons.changeFile') : t('doctorSignup.buttons.chooseFile')}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{t('doctorSignup.help.pdfOrImage')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 5: Availability & Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-blue-600" />
                  {t('doctorSignup.sections.availability')} <Badge variant="secondary">{t('doctorSignup.buttons.optional')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>{t('doctorSignup.fields.appointmentTypes')}</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    {[
                      { id: "in-person", label: t('doctorSignup.appointmentTypes.inPerson') },
                      { id: "video", label: t('doctorSignup.appointmentTypes.video') },
                      { id: "home-visit", label: t('doctorSignup.appointmentTypes.homeVisit') },
                      { id: "chat", label: t('doctorSignup.appointmentTypes.chat') }
                    ].map((type) => (
                      <div key={type.id} className="flex items-center space-x-2">
                        <Checkbox id={type.id} />
                        <Label htmlFor={type.id} className="text-sm">{type.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="consultation-fee">{t('doctorSignup.fields.consultationFee')}</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Input placeholder={t('doctorSignup.placeholders.feeFrom')} />
                    <Input placeholder={t('doctorSignup.placeholders.feeTo')} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{t('doctorSignup.help.adjustFee')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Section 6: Security & Agreements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-blue-600" />
                  {t('doctorSignup.sections.security')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox id="accuracy" className="mt-1" />
                    <Label htmlFor="accuracy" className="text-sm leading-relaxed">
                      {t('doctorSignup.security.accuracyConfirm')}
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox id="terms" className="mt-1" />
                    <Label htmlFor="terms" className="text-sm leading-relaxed">
                      {t('doctorSignup.security.termsAgree')} <a href="#" className="text-blue-600 hover:underline">{t('doctorSignup.security.termsOfService')}</a> {t('doctorSignup.security.and')} <a href="#" className="text-blue-600 hover:underline">{t('doctorSignup.security.privacyPolicy')}</a>
                    </Label>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-3">{t('doctorSignup.security.dataSecure')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-green-600" />
                      {t('doctorSignup.security.hipaaCompliant')}
                    </div>
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-green-600" />
                      {t('doctorSignup.security.encryption')}
                    </div>
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-green-600" />
                      {t('doctorSignup.security.dataPrivacy')}
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold"
                  disabled={isLoading || isSubmitting || uploading}
                >
                  {isLoading || isSubmitting ? t('doctorSignup.buttons.completingProfile') : t('doctorSignup.buttons.completeProfile')}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default DoctorSignUp;