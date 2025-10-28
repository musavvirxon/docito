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
import { useState } from "react";
import { Eye, EyeOff, Upload, Info, User, Briefcase, Building2, FileText, Settings, Shield, FileCheck } from "lucide-react";
import { useSimpleForm } from "@/hooks/useSimpleForm";
import { useQuickNavigate } from "@/hooks/useQuickNavigate";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useDoctorVerification } from "@/hooks/useDoctorVerification";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DoctorSignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    email: "",
    password: "",
    confirmPassword: "",
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

  const getPasswordStrength = (password: string) => {
    if (password.length < 4) return { level: 0, text: "Too weak", color: "text-red-500" };
    if (password.length < 6) return { level: 1, text: "Weak", color: "text-orange-500" };
    if (password.length < 8) return { level: 2, text: "Fair", color: "text-yellow-500" };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) 
      return { level: 3, text: "Strong", color: "text-green-500" };
    return { level: 2, text: "Fair", color: "text-yellow-500" };
  };

  const passwordStrength = getPasswordStrength(formData.password || "");
  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;

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
    toast.success('Profile photo selected');
  };

  const handleDocumentUpload = (type: 'medical_license' | 'professional_id', file: File) => {
    if (type === 'medical_license') {
      setMedicalLicense(file);
      toast.success('Medical license document selected');
    } else {
      setProfessionalId(file);
      toast.success('Professional ID document selected');
    }
  };

  const handleDoctorSignUp = async () => {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.firstName} ${formData.lastName}`,
            role: 'doctor'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Upload avatar if provided
      let avatar_url = '';
      if (avatar) {
        const avatarResult = await uploadFile(avatar, 'avatars', `${authData.user.id}/avatar-${Date.now()}.jpg`);
        if (avatarResult) avatar_url = avatarResult.url;
      }

      // Create doctor profile
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .insert({
          user_id: authData.user.id,
          specialty: formData.specialty || 'general',
          bio: formData.bio,
          license_number: formData.license,
          consultation_fee: 0,
        })
        .select()
        .single();

      if (doctorError) throw doctorError;

      // Submit for verification if documents provided
      if (medicalLicense || professionalId) {
        await submitForVerification(doctorData.id, {
          specialty: formData.specialty || 'general',
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
      }

      toast.success('Profile created successfully! Redirecting...');
      setTimeout(() => navigateToDoctorDashboard(), 1500);
    } catch (error: any) {
      console.error('Error creating doctor profile:', error);
      toast.error(error.message || 'Failed to create profile');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(handleDoctorSignUp, { skipValidation: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Create Your Doctor Profile
            </h1>
            <p className="text-xl text-muted-foreground">
              Join our trusted healthcare network and start connecting with patients
            </p>
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
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="firstName">First Name (Optional)</Label>
                    <Input id="firstName" placeholder="John" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name (Optional)</Label>
                    <Input id="lastName" placeholder="Smith" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="gender">Gender (Optional)</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input id="phone" placeholder="(555) 123-4567" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address (Optional)</Label>
                  <Input id="email" type="email" placeholder="doctor@example.com" />
                  <p className="text-sm text-muted-foreground mt-1">Used for login and patient communication</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="password">Password (Optional)</Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Enter password"
                        value={formData.password}
                        onChange={(e) => updateField('password', e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-1 bg-muted rounded">
                            <div 
                              className={`h-full rounded transition-all duration-300 ${
                                passwordStrength.level === 0 ? 'w-1/4 bg-red-500' :
                                passwordStrength.level === 1 ? 'w-1/2 bg-orange-500' :
                                passwordStrength.level === 2 ? 'w-3/4 bg-yellow-500' :
                                'w-full bg-green-500'
                              }`}
                            />
                          </div>
                          <span className={`text-sm font-medium ${passwordStrength.color}`}>
                            {passwordStrength.text}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password (Optional)</Label>
                    <div className="relative">
                      <Input 
                        id="confirmPassword" 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="Confirm password"
                        value={formData.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {formData.confirmPassword && (
                      <div className={`mt-2 text-sm font-medium ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordsMatch ? '✅ Passwords match' : '❌ Passwords do not match'}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Professional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
                  Professional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="specialty">Specialty (Optional)</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your specialty" />
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
                  <Label htmlFor="degrees">Degrees / Certifications</Label>
                  <Input id="degrees" placeholder="MD, Board Certified in Internal Medicine" />
                  <p className="text-sm text-muted-foreground mt-1">Separate multiple entries with commas</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience" />
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
                  <div>
                    <Label htmlFor="license">Medical License Number</Label>
                    <div className="relative">
                      <Input id="license" placeholder="License number" />
                      <Info className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Used to verify your medical credentials</p>
                  </div>
                </div>

                <div>
                  <Label>Languages Spoken</Label>
                  <p className="text-sm text-muted-foreground mb-3">Search and select languages you speak fluently</p>
                  
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
                      placeholder="Search languages..."
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
                      <p className="text-sm text-muted-foreground p-2">No languages found</p>
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
                  Location & Clinic Connection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Country and Region */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country (Optional)</Label>
                    <Select value={formData.country} onValueChange={(value) => updateField('country', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
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
                    <Label htmlFor="region">Region/State (Optional)</Label>
                    <Select value={formData.region} onValueChange={(value) => updateField('region', value)} disabled={!formData.country}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region/state" />
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
                  <Label htmlFor="clinic-search">Search for Registered Clinics</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Find your clinic in our database or add it manually if not found
                  </p>
                  <div className="relative">
                    <Input
                      id="clinic-search"
                      placeholder="Search by clinic name, address..."
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
                                  <Badge variant="default" className="text-xs">Verified</Badge>
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
                            No clinics found. You can add your clinic manually.
                          </p>
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowManualClinic(true)}
                          >
                            Add Clinic Manually
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
                        Add Clinic Information
                      </CardTitle>
                      <p className="text-sm text-orange-700">
                        This information will be flagged for admin verification
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="practice-name">Practice Name (Optional)</Label>
                        <Input id="practice-name" placeholder="Enter clinic/practice name" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="practice-phone">Phone Number</Label>
                          <Input id="practice-phone" placeholder="(555) 123-4567" />
                        </div>
                        <div>
                          <Label htmlFor="practice-email">Email</Label>
                          <Input id="practice-email" type="email" placeholder="info@clinic.com" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="practice-address">Address *</Label>
                        <Textarea 
                          id="practice-address" 
                          placeholder="Full address including street, city, state, ZIP"
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <p className="text-sm text-amber-700">
                          📍 <strong>Note:</strong> Manually entered clinics require admin verification before going live.
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
                        <h4 className="font-semibold text-green-800">Selected Clinic</h4>
                        <p className="text-green-700">{selectedClinic.name}</p>
                        <p className="text-sm text-green-600">{selectedClinic.address}</p>
                      </div>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedClinic(null)}
                      >
                        Change
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
                  Profile Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="bio">About You / Bio</Label>
                  <Textarea 
                    id="bio" 
                    placeholder="Tell patients about your experience, approach to care, and what makes you unique..."
                    className="min-h-[100px]"
                    value={formData.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">300-500 characters recommended</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Profile Photo</Label>
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
                        {avatar ? avatar.name : 'Upload your photo'}
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
                        {avatar ? 'Change File' : 'Choose File'}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Professional headshot recommended</p>
                  </div>
                  <div>
                    <Label>Medical License Document</Label>
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center mb-3 ${
                      medicalLicense ? 'border-green-500 bg-green-50' : 'border-border'
                    }`}>
                      {medicalLicense ? (
                        <FileCheck className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      ) : (
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      )}
                      <p className="text-sm text-muted-foreground mb-2">
                        {medicalLicense ? medicalLicense.name : 'Upload medical license'}
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
                        {medicalLicense ? 'Change File' : 'Choose File'}
                      </Button>
                    </div>
                    
                    <Label>Professional ID</Label>
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                      professionalId ? 'border-green-500 bg-green-50' : 'border-border'
                    }`}>
                      {professionalId ? (
                        <FileCheck className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      ) : (
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      )}
                      <p className="text-sm text-muted-foreground mb-2">
                        {professionalId ? professionalId.name : 'Upload professional ID'}
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
                        {professionalId ? 'Change File' : 'Choose File'}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">PDF or image files accepted</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 5: Availability & Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-blue-600" />
                  Availability & Preferences <Badge variant="secondary">Optional</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Preferred Appointment Types</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    {[
                      { id: "in-person", label: "In-person" },
                      { id: "video", label: "Video" },
                      { id: "home-visit", label: "Home Visit" },
                      { id: "chat", label: "Chat" }
                    ].map((type) => (
                      <div key={type.id} className="flex items-center space-x-2">
                        <Checkbox id={type.id} />
                        <Label htmlFor={type.id} className="text-sm">{type.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="consultation-fee">Consultation Fee Range</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Input placeholder="From $" />
                    <Input placeholder="To $" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">You can adjust this later in your profile</p>
                </div>
              </CardContent>
            </Card>

            {/* Section 6: Security & Agreements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-blue-600" />
                  Security, Agreements & Final Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox id="accuracy" className="mt-1" />
                    <Label htmlFor="accuracy" className="text-sm leading-relaxed">
                      I confirm that all information provided is accurate and verifiable
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox id="terms" className="mt-1" />
                    <Label htmlFor="terms" className="text-sm leading-relaxed">
                      I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                    </Label>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-3">Your data is secure with us</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-green-600" />
                      HIPAA Compliant
                    </div>
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-green-600" />
                      End-to-End Encryption
                    </div>
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-green-600" />
                      Data Privacy Protection
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold"
                  disabled={isLoading || isSubmitting || uploading}
                >
                  {isLoading || isSubmitting ? 'Creating Profile...' : 'Create My Profile'}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account? <a href="#" className="text-blue-600 hover:underline">Log In</a>
                </p>
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