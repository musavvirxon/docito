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
import { Upload, Info, User, Briefcase, Building2, FileText, Settings, Shield, FileCheck, ChevronDown, ChevronRight } from "lucide-react";
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
  const {
    t
  } = useTranslation('auth');
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const [hasAssociatedPractice, setHasAssociatedPractice] = useState<string>("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [languageSearch, setLanguageSearch] = useState("");
  const [clinicSearch, setClinicSearch] = useState("");
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [showManualClinic, setShowManualClinic] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [medicalLicense, setMedicalLicense] = useState<File | null>(null);
  const [professionalId, setProfessionalId] = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [accuracyConfirmed, setAccuracyConfirmed] = useState(false);
  
  // Additional fields for verification
  const [selectedAppointmentTypes, setSelectedAppointmentTypes] = useState<string[]>([]);
  const [consultationFeeFrom, setConsultationFeeFrom] = useState<string>("");
  const [consultationFeeTo, setConsultationFeeTo] = useState<string>("");
  const [manualClinicName, setManualClinicName] = useState<string>("");
  const [manualClinicPhone, setManualClinicPhone] = useState<string>("");
  const [manualClinicEmail, setManualClinicEmail] = useState<string>("");
  const [manualClinicAddress, setManualClinicAddress] = useState<string>("");
  
  const {
    navigateToDoctorDashboard
  } = useQuickNavigate();
  const {
    uploadFile,
    uploading
  } = useFileUpload();
  const {
    submitForVerification,
    isSubmitting
  } = useDoctorVerification();

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
  const specialtyCategories = {
    "Internal Medicine": [
      "Cardiology",
      "Endocrinology",
      "Gastroenterology",
      "Hepatology",
      "Nephrology",
      "Pulmonology / Respiratory Medicine",
      "Rheumatology",
      "Infectious Diseases",
      "Hematology",
      "Oncology",
      "Allergy & Immunology",
      "Geriatric Medicine",
      "Adolescent Medicine",
      "Hospital Medicine",
    ],
    "Pediatrics": [
      "Pediatric Cardiology",
      "Pediatric Neurology",
      "Pediatric Endocrinology",
      "Pediatric Gastroenterology",
      "Pediatric Pulmonology",
      "Pediatric Nephrology",
      "Pediatric Hematology & Oncology",
      "Neonatology",
      "Pediatric Surgery",
      "Pediatric Intensive Care",
    ],
    "Obstetrics & Gynecology": [
      "Maternal–Fetal Medicine",
      "Reproductive Endocrinology & Infertility",
      "Gynecologic Oncology",
      "Urogynecology",
    ],
    "Neurology": [
      "Clinical Neurophysiology",
      "Neuromuscular Medicine",
      "Vascular Neurology (Stroke)",
      "Neurocritical Care",
      "Epileptology",
      "Movement Disorders",
      "Headache Medicine",
      "Sleep Medicine",
    ],
    "Psychiatry": [
      "Child & Adolescent Psychiatry",
      "Geriatric Psychiatry",
      "Addiction Psychiatry",
      "Forensic Psychiatry",
      "Consultation–Liaison Psychiatry",
      "Sleep Psychiatry",
    ],
    "Dermatology": [
      "Cosmetic Dermatology",
      "Dermatopathology",
      "Pediatric Dermatology",
      "Mohs Surgery",
    ],
    "Emergency Medicine": [
      "Medical Toxicology",
      "Sports Medicine",
      "Pediatric Emergency Medicine",
      "Disaster Medicine",
      "Critical Care",
    ],
    "Family Medicine": [
      "Sports Medicine",
      "Geriatric Medicine",
      "Preventive Medicine",
    ],
    "Anesthesiology": [
      "Cardiothoracic Anesthesia",
      "Neuroanesthesia",
      "Pediatric Anesthesia",
      "Critical Care",
      "Pain Medicine",
    ],
    "Radiology": [
      "Neuroradiology",
      "Musculoskeletal Radiology",
      "Abdominal Imaging",
      "Breast Imaging",
      "Pediatric Radiology",
      "Vascular & Interventional Radiology",
      "Nuclear Medicine",
    ],
    "Pathology": [
      "Anatomical Pathology",
      "Clinical Pathology",
      "Cytopathology",
      "Hematopathology",
      "Forensic Pathology",
      "Molecular Pathology",
    ],
    "Physical Medicine & Rehabilitation": [
      "Sports Medicine",
      "Pain Medicine",
      "Spinal Cord Injury Medicine",
    ],
    "Oncology": [
      "Medical Oncology",
      "Surgical Oncology",
      "Radiation Oncology",
      "Gynecologic Oncology",
      "Hematologic Oncology",
    ],
    "General Surgery": [
      "Bariatric Surgery",
      "Breast Surgery",
      "Transplant Surgery",
      "Trauma Surgery",
      "Colorectal Surgery",
      "Minimally Invasive Surgery",
    ],
    "Orthopedic Surgery": [
      "Spine Surgery",
      "Joint Replacement",
      "Sports Medicine",
      "Hand Surgery",
      "Pediatric Orthopedics",
      "Trauma Orthopedics",
    ],
    "Neurosurgery": [
      "Skull Base Surgery",
      "Spine Surgery",
      "Vascular Neurosurgery",
      "Pediatric Neurosurgery",
      "Functional Neurosurgery",
      "Neuro-Oncology",
    ],
    "Cardiothoracic Surgery": [
      "Adult Cardiac Surgery",
      "Thoracic Surgery",
      "Congenital Heart Surgery",
    ],
    "Plastic Surgery": [
      "Aesthetic (Cosmetic) Surgery",
      "Craniofacial Surgery",
      "Burn Surgery",
      "Hand Surgery",
      "Microsurgery",
    ],
    "Urology": [
      "Endourology",
      "Pediatric Urology",
      "Andrology",
      "Oncologic Urology",
      "Female Urology",
    ],
    "Vascular Surgery": [
      "Endovascular Surgery",
      "Aortic Surgery",
      "Peripheral Vascular Surgery",
    ],
    "Otolaryngology (ENT)": [
      "Rhinology",
      "Laryngology",
      "Otology & Neurotology",
      "Head & Neck Surgery",
      "Pediatric ENT",
      "Facial Plastics",
    ],
    "Ophthalmology": [
      "Retina & Vitreous",
      "Cornea & External Disease",
      "Glaucoma",
      "Oculoplastics",
      "Neuro-ophthalmology",
      "Pediatric Ophthalmology",
      "Refractive Surgery",
    ],
    "General Dentistry": [],
    "Orthodontics & Dentofacial Orthopedics": [],
    "Oral & Maxillofacial Surgery": [
      "Implant Surgery",
      "Orthognathic Surgery",
      "TMJ Surgery",
      "Facial Trauma",
      "Dentoalveolar Surgery",
    ],
    "Periodontics": [
      "Periodontal Surgery",
      "Soft Tissue Grafting",
      "Implant Periodontics",
    ],
    "Prosthodontics": [
      "Fixed Prosthodontics",
      "Removable Prosthodontics",
      "Implant Prosthodontics",
    ],
    "Endodontics": [],
    "Pediatric Dentistry": [],
    "Oral Medicine": [
      "Oral Mucosal Diseases",
      "Orofacial Pain",
      "Dental Sleep Medicine",
    ],
    "Oral & Maxillofacial Radiology": [],
    "Oral & Maxillofacial Pathology": [],
    "Physiotherapy": [],
    "Occupational Therapy": [],
    "Speech & Language Therapy": [],
    "Dietetics / Nutrition": [],
    "Audiology": [],
    "Optometry": [],
    "Radiography": [],
    "Laboratory Medicine": [],
    "Pharmacy": [],
    "Midwifery": [],
    "Nursing": [
      "Critical Care Nursing",
      "ER Nursing",
      "Oncology Nursing",
      "Pediatric Nursing",
    ],
    "Public Health": [
      "Epidemiology",
      "Health Policy",
      "Environmental Health",
      "Preventive Medicine",
      "Lifestyle Medicine",
      "Aerospace Medicine",
    ],
    "Integrative Medicine": [
      "Acupuncture",
      "Chiropractic",
      "Traditional Chinese Medicine",
      "Homeopathy",
    ],
  };

  const [expandedSpecialty, setExpandedSpecialty] = useState<string | null>(null);
  const allLanguages = [
    "Afar", "Abkhazian", "Avestan", "Afrikaans", "Akan", "Amharic", "Aragonese", "Arabic", "Assamese", "Avaric", "Aymara", "Azerbaijani",
    "Bashkir", "Belarusian", "Bulgarian", "Bihari", "Bislama", "Bambara", "Bengali", "Tibetan", "Breton", "Bosnian",
    "Catalan", "Chechen", "Chamorro", "Corsican", "Cree", "Czech", "Church Slavic", "Chuvash", "Welsh",
    "Danish", "German", "Divehi", "Dzongkha",
    "Ewe", "Greek", "English", "Esperanto", "Spanish", "Estonian", "Basque",
    "Persian (Farsi)", "Fulah", "Finnish", "Fijian", "Faroese", "French", "Western Frisian",
    "Irish", "Scottish Gaelic", "Galician", "Guarani", "Gujarati", "Manx",
    "Hausa", "Hebrew", "Hindi", "Hiri Motu", "Croatian", "Haitian Creole", "Hungarian", "Armenian", "Herero",
    "Interlingua", "Indonesian", "Interlingue", "Igbo", "Sichuan Yi", "Inupiaq", "Ido", "Icelandic", "Italian", "Inuktitut",
    "Japanese", "Javanese",
    "Georgian", "Kongo", "Kikuyu", "Kuanyama", "Kazakh", "Kalaallisut", "Khmer", "Kannada", "Korean", "Kanuri", "Kashmiri", "Kurdish", "Komi", "Cornish", "Kyrgyz",
    "Latin", "Luxembourgish", "Ganda", "Limburgan", "Lingala", "Lao", "Lithuanian", "Luba-Katanga", "Latvian",
    "Malagasy", "Marshallese", "Maori", "Macedonian", "Malayalam", "Mongolian", "Marathi", "Malay", "Maltese", "Burmese",
    "Nauru", "Norwegian Bokmål", "North Ndebele", "Nepali", "Ndonga", "Dutch", "Norwegian Nynorsk", "Norwegian", "South Ndebele", "Navajo", "Chichewa",
    "Occitan", "Ojibwa", "Oromo", "Oriya", "Ossetian",
    "Punjabi", "Pali", "Polish", "Pashto", "Portuguese",
    "Quechua",
    "Romansh", "Rundi", "Romanian", "Russian", "Kinyarwanda",
    "Sanskrit", "Sardinian", "Sindhi", "Northern Sami", "Sango", "Sinhala", "Slovak", "Slovenian", "Samoan", "Shona", "Somali", "Albanian", "Serbian", "Swati", "Southern Sotho", "Sundanese", "Swedish", "Swahili",
    "Tamil", "Telugu", "Tajik", "Thai", "Tigrinya", "Turkmen", "Tagalog", "Tswana", "Tongan", "Turkish", "Tsonga", "Tatar", "Twi", "Tahitian",
    "Uyghur", "Ukrainian", "Urdu", "Uzbek",
    "Venda", "Vietnamese", "Volapük",
    "Walloon", "Wolof",
    "Xhosa",
    "Yiddish", "Yoruba",
    "Zhuang", "Chinese", "Zulu"
  ];
  const countries = ["United States", "Canada", "United Kingdom", "Australia", "Germany", "France", "Spain", "Italy", "Netherlands", "Sweden", "Norway"];
  const usStates = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];
  const mockClinics = [{
    id: 1,
    name: "Metro Medical Center",
    address: "123 Main St, New York, NY",
    verified: true
  }, {
    id: 2,
    name: "Downtown Health Clinic",
    address: "456 Oak Ave, Los Angeles, CA",
    verified: true
  }, {
    id: 3,
    name: "Family Care Associates",
    address: "789 Pine St, Chicago, IL",
    verified: false
  }];
  const toggleSpecialty = (specialty: string, parentSpecialty: string) => {
    const fullName = `${parentSpecialty} - ${specialty}`;
    
    setSelectedSpecialties(prev => {
      if (prev.includes(fullName)) {
        return prev.filter(s => s !== fullName);
      }
      if (prev.length >= 5) {
        toast.error('You can select up to 5 subspecialties');
        return prev;
      }
      return [...prev, fullName];
    });
  };

  const removeSpecialty = (specialty: string) => {
    setSelectedSpecialties(prev => prev.filter(s => s !== specialty));
  };

  // Flatten all specialties for search
  const allSpecialtiesFlat = Object.entries(specialtyCategories).flatMap(([main, subs]) => 
    subs.map(sub => `${main} - ${sub}`)
  );

  const filteredMainSpecialties = Object.keys(specialtyCategories).filter(spec => {
    const subs = specialtyCategories[spec as keyof typeof specialtyCategories];
    // Only show main specialties that have subspecialties
    if (subs.length === 0) return false;
    // Filter by search
    if (specialtySearch) {
      const searchLower = specialtySearch.toLowerCase();
      return spec.toLowerCase().includes(searchLower) || 
             subs.some(sub => sub.toLowerCase().includes(searchLower));
    }
    return true;
  });

  const toggleExpandSpecialty = (specialty: string) => {
    setExpandedSpecialty(prev => prev === specialty ? null : specialty);
  };
  
  const toggleLanguage = (language: string) => {
    setSelectedLanguages(prev => prev.includes(language) ? prev.filter(l => l !== language) : [...prev, language]);
  };
  const removeLanguage = (language: string) => {
    setSelectedLanguages(prev => prev.filter(l => l !== language));
  };
  const filteredLanguages = allLanguages.filter(lang => lang.toLowerCase().includes(languageSearch.toLowerCase()) && !selectedLanguages.includes(lang));
  const filteredClinics = mockClinics.filter(clinic => clinic.name.toLowerCase().includes(clinicSearch.toLowerCase()));
  const handleAvatarUpload = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file format. Only PNG and JPG files are allowed.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit.');
      return;
    }
    setAvatar(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    toast.success(t('doctorSignup.messages.photoSelected'));
  };
  const handleDocumentUpload = (type: 'medical_license' | 'professional_id', file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpg', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file format. Only PDF, PNG, and JPG files are allowed.');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }
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
        const fileExt = avatar.name.split('.').pop() || 'jpg';
        const avatarResult = await uploadFile(avatar, 'avatars', `${user.id}/avatar-${Date.now()}.${fileExt}`);
        if (avatarResult) avatar_url = avatarResult.url;
      }

      // Update user profile with personal information
      const {
        error: profileError
      } = await supabase.from('profiles').update({
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone,
        gender: formData.gender as any,
        address: `${formData.region}, ${formData.country}`,
        avatar_url: avatar_url || undefined,
        updated_at: new Date().toISOString()
      }).eq('user_id', user.id);
      if (profileError) throw profileError;

      // Check if doctor profile already exists
      const {
        data: existingDoctor
      } = await supabase.from('doctors').select('id').eq('user_id', user.id).single();
      let doctorId: string;
      if (existingDoctor) {
        // Update existing doctor profile
        const {
          error: updateError
        } = await supabase.from('doctors').update({
          specialty: formData.specialty || 'General Practice',
          bio: formData.bio,
          license_number: formData.license,
          consultation_fee: 0
        }).eq('id', existingDoctor.id);
        if (updateError) throw updateError;
        doctorId = existingDoctor.id;
      } else {
        // Create new doctor profile (unverified by default)
        const {
          data: doctorData,
          error: doctorError
        } = await supabase.from('doctors').insert({
          user_id: user.id,
          specialty: formData.specialty || 'General Practice',
          bio: formData.bio,
          license_number: formData.license,
          consultation_fee: 0,
          verified: false
        }).select().single();
        if (doctorError) throw doctorError;
        doctorId = doctorData.id;
      }

      // Submit for super-admin verification with all information
      const result = await submitForVerification(doctorId, {
        specialty: selectedSpecialties[0] || 'General Practice', // Primary specialty
        bio: formData.bio || '',
        license_number: formData.license || '',
        consultation_fee: 0,
        years_experience: formData.experience,
        languages: selectedLanguages,
        consultation_types: ['In-person', 'Video'],
        documents: {
          medical_license: medicalLicense || undefined,
          professional_id: professionalId || undefined
        },
        // Additional information for super admin review
        additional_data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          gender: formData.gender,
          phone: formData.phone,
          degrees: formData.degrees,
          country: formData.country,
          region: formData.region,
          avatar_uploaded: !!avatar,
          practice_association: hasAssociatedPractice,
          selected_clinic: selectedClinic?.name || null,
          linked_clinic_id: selectedClinic?.id || null,
          manual_clinic: showManualClinic || (!clinicSearch && !selectedClinic) ? {
            name: manualClinicName,
            phone: manualClinicPhone,
            email: manualClinicEmail,
            address: manualClinicAddress
          } : null,
          all_specialties: selectedSpecialties,
          preferred_appointment_types: selectedAppointmentTypes,
          consultation_fee_from: consultationFeeFrom,
          consultation_fee_to: consultationFeeTo
        }
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

    // Validate required fields
    const requiredFields = {
      'First Name': formData.firstName,
      'Last Name': formData.lastName,
      'Gender': formData.gender,
      'Phone': formData.phone,
      'Degrees': formData.degrees,
      'Years of Experience': formData.experience,
      'License Number': formData.license,
      'Country': formData.country,
      'Region': formData.region,
      'Bio': formData.bio
    };
    const emptyFields = Object.entries(requiredFields).filter(([_, value]) => !value || value.trim() === '').map(([field, _]) => field);
    if (emptyFields.length > 0) {
      toast.error(`Please fill in all required fields: ${emptyFields.join(', ')}`);
      return;
    }

    // Validate file uploads
    if (!medicalLicense) {
      toast.error('Please upload your medical license');
      return;
    }
    if (!professionalId) {
      toast.error('Please upload your professional ID');
      return;
    }

    // Validate specialties
    if (selectedSpecialties.length === 0) {
      toast.error('Please select at least one specialty');
      return;
    }
    
    // Validate languages
    if (selectedLanguages.length === 0) {
      toast.error('Please select at least one language you speak');
      return;
    }

    // Validate checkboxes
    if (!accuracyConfirmed) {
      toast.error('Please confirm the accuracy of your information');
      return;
    }
    if (!termsAccepted) {
      toast.error('Please accept the Terms of Service and Privacy Policy');
      return;
    }
    await handleSubmit(handleDoctorOnboarding, {
      skipValidation: true
    });
  };

  // Show loading state while checking auth
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>;
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }
  return <div className="min-h-screen bg-background">
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
                    <Label htmlFor="firstName">{t('doctorSignup.fields.firstName')} <span className="text-red-500">*</span></Label>
                    <Input id="firstName" placeholder={t('doctorSignup.placeholders.firstName')} value={formData.firstName} onChange={e => updateField('firstName', e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="lastName">{t('doctorSignup.fields.lastName')} <span className="text-red-500">*</span></Label>
                    <Input id="lastName" placeholder={t('doctorSignup.placeholders.lastName')} value={formData.lastName} onChange={e => updateField('lastName', e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="gender">{t('doctorSignup.fields.gender')} <span className="text-red-500">*</span></Label>
                    <Select value={formData.gender} onValueChange={value => updateField('gender', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('doctorSignup.placeholders.selectGender')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t('doctorSignup.gender.male')}</SelectItem>
                        <SelectItem value="female">{t('doctorSignup.gender.female')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="phone">{t('doctorSignup.fields.phone')} <span className="text-red-500">*</span></Label>
                    <Input id="phone" placeholder={t('doctorSignup.placeholders.phone')} value={formData.phone} onChange={e => updateField('phone', e.target.value)} required />
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
                  <Label>{t('doctorSignup.fields.specialty')} <span className="text-red-500">*</span></Label>
                  <p className="text-sm text-muted-foreground mb-3">Select up to 5 subspecialties from the categories below</p>
                  
                  {/* Selected Specialties */}
                  {selectedSpecialties.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Selected ({selectedSpecialties.length}/5):</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSpecialties.map(specialty => (
                          <Badge key={specialty} variant="secondary" className="px-3 py-1">
                            {specialty}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-2 h-auto p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => removeSpecialty(specialty)}
                            >
                              ×
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Specialty Search */}
                  <div className="relative mb-3">
                    <Input placeholder="Search specialties..." value={specialtySearch} onChange={e => setSpecialtySearch(e.target.value)} />
                  </div>

                  {/* Specialty Options */}
                  <div className="max-h-96 overflow-y-auto border rounded-md bg-background">
                    {filteredMainSpecialties.map(mainSpecialty => {
                      const subs = specialtyCategories[mainSpecialty as keyof typeof specialtyCategories];
                      const isExpanded = expandedSpecialty === mainSpecialty;
                      
                      return (
                        <div key={mainSpecialty} className="border-b last:border-b-0">
                          {/* Main Specialty Header - Not selectable, just expandable */}
                          <div 
                            className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleExpandSpecialty(mainSpecialty)}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-foreground">
                                {mainSpecialty}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {subs.length}
                              </Badge>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>

                          {/* Subspecialties Dropdown - These are selectable */}
                          {isExpanded && subs.length > 0 && (
                            <div className="bg-muted/30 border-t">
                              {subs.map(subSpecialty => {
                                const fullName = `${mainSpecialty} - ${subSpecialty}`;
                                const isSubSelected = selectedSpecialties.includes(fullName);
                                
                                return (
                                  <div 
                                    key={subSpecialty} 
                                    className="flex items-center space-x-2 p-2 pl-10 hover:bg-muted"
                                  >
                                    <Checkbox 
                                      id={`subspecialty-${fullName}`} 
                                      checked={isSubSelected}
                                      onCheckedChange={() => toggleSpecialty(subSpecialty, mainSpecialty)}
                                    />
                                    <Label 
                                      htmlFor={`subspecialty-${fullName}`} 
                                      className="text-sm cursor-pointer flex-1"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        toggleSpecialty(subSpecialty, mainSpecialty);
                                      }}
                                    >
                                      {subSpecialty}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {filteredMainSpecialties.length === 0 && (
                      <p className="text-sm text-muted-foreground p-3">No specialties found</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="degrees">{t('doctorSignup.fields.degrees')} <span className="text-red-500">*</span></Label>
                  <Input id="degrees" placeholder={t('doctorSignup.placeholders.degrees')} value={formData.degrees} onChange={e => updateField('degrees', e.target.value)} required />
                  <p className="text-sm text-muted-foreground mt-1">{t('doctorSignup.help.degreesMultiple')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="experience">{t('doctorSignup.fields.experience')} <span className="text-red-500">*</span></Label>
                    <Select value={formData.experience} onValueChange={value => updateField('experience', value)}>
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
                    <Label htmlFor="license">{t('doctorSignup.fields.license')} <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input id="license" placeholder={t('doctorSignup.placeholders.license')} value={formData.license} onChange={e => updateField('license', e.target.value)} required />
                      <Info className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{t('doctorSignup.help.licenseVerification')}</p>
                  </div>
                </div>

                <div>
                  <Label>{t('doctorSignup.fields.languages')} <span className="text-red-500">*</span></Label>
                  <p className="text-sm text-muted-foreground mb-3">{t('doctorSignup.help.languagesSelect')}</p>
                  
                  {/* Selected Languages */}
                  {selectedLanguages.length > 0 && <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {selectedLanguages.map(language => <Badge key={language} variant="secondary" className="px-3 py-1">
                            {language}
                            <Button type="button" variant="ghost" size="sm" className="ml-2 h-auto p-0 text-muted-foreground hover:text-foreground" onClick={() => removeLanguage(language)}>
                              ×
                            </Button>
                          </Badge>)}
                      </div>
                    </div>}

                  {/* Language Search */}
                  <div className="relative mb-3">
                    <Input placeholder={t('doctorSignup.placeholders.searchLanguages')} value={languageSearch} onChange={e => setLanguageSearch(e.target.value)} />
                  </div>

                  {/* Language Options */}
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                    {filteredLanguages.slice(0, 10).map(language => <div key={language} className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer" onClick={() => toggleLanguage(language)}>
                        <Checkbox id={language} checked={selectedLanguages.includes(language)} />
                        <Label htmlFor={language} className="text-sm cursor-pointer">{language}</Label>
                      </div>)}
                    {filteredLanguages.length === 0 && <p className="text-sm text-muted-foreground p-2">{t('doctorSignup.messages.noLanguagesFound')}</p>}
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
                    <Label htmlFor="country">{t('doctorSignup.fields.country')} <span className="text-red-500">*</span></Label>
                    <Select value={formData.country} onValueChange={value => updateField('country', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('doctorSignup.placeholders.selectCountry')} />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map(countryOption => <SelectItem key={countryOption} value={countryOption.toLowerCase()}>
                            {countryOption}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="region">{t('doctorSignup.fields.region')} <span className="text-red-500">*</span></Label>
                    <Select value={formData.region} onValueChange={value => updateField('region', value)} disabled={!formData.country}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('doctorSignup.placeholders.selectRegion')} />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.country === "united states" && usStates.map(state => <SelectItem key={state} value={state.toLowerCase()}>
                            {state}
                          </SelectItem>)}
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
                    <Input id="clinic-search" placeholder={t('doctorSignup.placeholders.clinicSearch')} value={clinicSearch} onChange={e => setClinicSearch(e.target.value)} />
                  </div>

                  {/* Search Results */}
                  {clinicSearch && <div className="mt-3 border rounded-lg max-h-60 overflow-y-auto">
                      {filteredClinics.length > 0 ? filteredClinics.map(clinic => <div key={clinic.id} className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-muted ${selectedClinic?.id === clinic.id ? 'bg-blue-50 border-blue-200' : ''}`} onClick={() => setSelectedClinic(clinic)}>
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{clinic.name}</h4>
                                <p className="text-sm text-muted-foreground">{clinic.address}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {clinic.verified && <Badge variant="default" className="text-xs">{t('doctorSignup.clinic.verified')}</Badge>}
                                {selectedClinic?.id === clinic.id && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                              </div>
                            </div>
                          </div>) : <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-3">
                            {t('doctorSignup.clinic.noClinicFound')}
                          </p>
                          <Button type="button" variant="outline" size="sm" onClick={() => setShowManualClinic(true)}>
                            {t('doctorSignup.clinic.addManually')}
                          </Button>
                        </div>}
                    </div>}
                </div>

                {/* Manual Clinic Entry */}
                {(showManualClinic || !clinicSearch && !selectedClinic) && <Card className="border-orange-200 bg-orange-50/30">
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
                        <Input 
                          id="practice-name" 
                          placeholder={t('doctorSignup.placeholders.practiceName')}
                          value={manualClinicName}
                          onChange={(e) => setManualClinicName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="practice-phone">{t('doctorSignup.fields.practicePhone')}</Label>
                          <Input 
                            id="practice-phone" 
                            placeholder={t('doctorSignup.placeholders.phone')}
                            value={manualClinicPhone}
                            onChange={(e) => setManualClinicPhone(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="practice-email">{t('doctorSignup.fields.practiceEmail')}</Label>
                          <Input 
                            id="practice-email" 
                            type="email" 
                            placeholder={t('doctorSignup.placeholders.email')}
                            value={manualClinicEmail}
                            onChange={(e) => setManualClinicEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="practice-address">{t('doctorSignup.fields.practiceAddress')} {t('doctorSignup.clinic.required')}</Label>
                        <Textarea 
                          id="practice-address" 
                          placeholder={t('doctorSignup.placeholders.practiceAddress')} 
                          className="min-h-[80px]"
                          value={manualClinicAddress}
                          onChange={(e) => setManualClinicAddress(e.target.value)}
                        />
                      </div>
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <p className="text-sm text-amber-700">
                          📍 <strong>{t('doctorSignup.buttons.optional')}:</strong> {t('doctorSignup.help.manualClinicNote')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>}

                {/* Selected Clinic Display */}
                {selectedClinic && <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-green-800">{t('doctorSignup.clinic.selectedClinic')}</h4>
                        <p className="text-green-700">{selectedClinic.name}</p>
                        <p className="text-sm text-green-600">{selectedClinic.address}</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedClinic(null)}>
                        {t('doctorSignup.clinic.change')}
                      </Button>
                    </div>
                  </div>}
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
                  <Label htmlFor="bio">{t('doctorSignup.fields.bio')} <span className="text-red-500">*</span></Label>
                  <Textarea id="bio" placeholder={t('doctorSignup.placeholders.bio')} className="min-h-[100px]" value={formData.bio} onChange={e => updateField('bio', e.target.value)} required />
                  <p className="text-sm text-muted-foreground mt-1">{t('doctorSignup.help.bioLength')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>{t('doctorSignup.fields.profilePhoto')}</Label>
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center ${avatar ? 'border-green-500 bg-green-50' : 'border-border'}`}>
                      {avatarPreview ? <div className="space-y-2">
                          <img src={avatarPreview} alt="Avatar preview" className="w-24 h-24 mx-auto rounded-full object-cover" />
                          <FileCheck className="w-6 h-6 mx-auto text-green-600" />
                        </div> : <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />}
                      <p className="text-sm text-muted-foreground mb-2">
                        {avatar ? avatar.name : t('doctorSignup.placeholders.uploadPhoto')}
                      </p>
                      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.png,.jpg,.jpeg';
                      input.onchange = e => {
                        const file = (e.target as HTMLInputElement)?.files?.[0];
                        if (file) handleAvatarUpload(file);
                      };
                      input.click();
                    }}>
                        {avatar ? t('doctorSignup.buttons.changeFile') : t('doctorSignup.buttons.chooseFile')}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{t('doctorSignup.help.professionalHeadshot')}</p>
                  </div>
                  <div>
                    <Label>{t('doctorSignup.fields.medicalLicense')} <span className="text-red-500">*</span></Label>
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center mb-3 ${medicalLicense ? 'border-green-500 bg-green-50' : 'border-border'}`}>
                      {medicalLicense ? <FileCheck className="w-8 h-8 mx-auto mb-2 text-green-600" /> : <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />}
                      <p className="text-sm text-muted-foreground mb-2">
                        {medicalLicense ? medicalLicense.name : t('doctorSignup.placeholders.uploadLicense')}
                      </p>
                      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf,.jpg,.jpeg,.png';
                      input.onchange = e => {
                        const file = (e.target as HTMLInputElement)?.files?.[0];
                        if (file) handleDocumentUpload('medical_license', file);
                      };
                      input.click();
                    }}>
                        {medicalLicense ? t('doctorSignup.buttons.changeFile') : t('doctorSignup.buttons.chooseFile')}
                      </Button>
                    </div>
                    
                    <Label>{t('doctorSignup.fields.professionalId')} <span className="text-red-500">*</span></Label>
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center ${professionalId ? 'border-green-500 bg-green-50' : 'border-border'}`}>
                      {professionalId ? <FileCheck className="w-8 h-8 mx-auto mb-2 text-green-600" /> : <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />}
                      <p className="text-sm text-muted-foreground mb-2">
                        {professionalId ? professionalId.name : t('doctorSignup.placeholders.uploadId')}
                      </p>
                      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf,.jpg,.jpeg,.png';
                      input.onchange = e => {
                        const file = (e.target as HTMLInputElement)?.files?.[0];
                        if (file) handleDocumentUpload('professional_id', file);
                      };
                      input.click();
                    }}>
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
                    {[{
                    id: "in-person",
                    label: t('doctorSignup.appointmentTypes.inPerson')
                  }, {
                    id: "video",
                    label: t('doctorSignup.appointmentTypes.video')
                  }, {
                    id: "home-visit",
                    label: t('doctorSignup.appointmentTypes.homeVisit')
                  }, {
                    id: "chat",
                    label: t('doctorSignup.appointmentTypes.chat')
                  }].map(type => <div key={type.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={type.id}
                          checked={selectedAppointmentTypes.includes(type.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAppointmentTypes([...selectedAppointmentTypes, type.id]);
                            } else {
                              setSelectedAppointmentTypes(selectedAppointmentTypes.filter(t => t !== type.id));
                            }
                          }}
                        />
                        <Label htmlFor={type.id} className="text-sm cursor-pointer">{type.label}</Label>
                      </div>)}
                  </div>
                </div>

                <div>
                  <Label htmlFor="consultation-fee">{t('doctorSignup.fields.consultationFee')}</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Input 
                      placeholder={t('doctorSignup.placeholders.feeFrom')}
                      type="number"
                      value={consultationFeeFrom}
                      onChange={(e) => setConsultationFeeFrom(e.target.value)}
                    />
                    <Input 
                      placeholder={t('doctorSignup.placeholders.feeTo')}
                      type="number"
                      value={consultationFeeTo}
                      onChange={(e) => setConsultationFeeTo(e.target.value)}
                    />
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
                    <Checkbox id="accuracy" className="mt-1" checked={accuracyConfirmed} onCheckedChange={checked => setAccuracyConfirmed(checked as boolean)} />
                    <Label htmlFor="accuracy" className="text-sm leading-relaxed">
                      {t('doctorSignup.security.accuracyConfirm')} <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox id="terms" className="mt-1" checked={termsAccepted} onCheckedChange={checked => setTermsAccepted(checked as boolean)} />
                    <Label htmlFor="terms" className="text-sm leading-relaxed">
                      {t('doctorSignup.security.termsAgree')} <a href="#" className="text-blue-600 hover:underline">{t('doctorSignup.security.termsOfService')}</a> {t('doctorSignup.security.and')} <a href="#" className="text-blue-600 hover:underline">{t('doctorSignup.security.privacyPolicy')}</a> <span className="text-red-500">*</span>
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

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold" disabled={isLoading || isSubmitting || uploading}>
                  {isLoading || isSubmitting ? t('doctorSignup.buttons.completingProfile') : t('doctorSignup.buttons.completeProfile')}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>

      <Footer />
    </div>;
};
export default DoctorSignUp;