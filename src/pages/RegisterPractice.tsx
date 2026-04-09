import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Search, Building2, Stethoscope, Shield } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSimpleForm } from "@/hooks/useSimpleForm";
import { useQuickNavigate } from "@/hooks/useQuickNavigate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { countryRegions, getRegionsForCountry } from "@/config/countryRegions";
import { useTranslation } from "react-i18next";

const practiceTypes = [
  "Private Clinic",
  "Hospital", 
  "Dental Office",
  "Diagnostic Center",
  "Telehealth Only"
];

const practiceSizes = [
  "1 provider",
  "2-5 providers", 
  "6-10 providers",
  "11-15 providers",
  "15+ providers"
];

// Countries and regions are now loaded from countryRegions config

const allSpecialties = [
  "Cardiologist", "Dentist", "Pediatrician", "CT Scan Facility", "Pain Management",
  "Dermatology", "Orthopedics", "Psychiatry", "Neurology", "Gastroenterology",
  "Radiology", "Emergency Medicine", "Family Medicine", "Internal Medicine",
  "Obstetrics & Gynecology", "Ophthalmology", "Physical Therapy", "Urology",
  "Rheumatology", "Endocrinology", "Pulmonology", "Infectious Disease",
  "Anesthesiology", "Pathology", "Hematology", "Oncology"
];

const hearAboutOptions = [
  "Google Search",
  "Colleague Referral", 
  "Social Media",
  "Online Ad",
  "Other"
];

const RegisterPractice = () => {
  const { t } = useTranslation('common');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false);
  
  const { navigateToAdminDashboard } = useQuickNavigate();
  
  const {
    formData,
    updateField,
    fillDummyData,
    isLoading,
    handleSubmit,
    canFillDummy,
    isDevMode
  } = useSimpleForm({
    practiceName: "",
    practiceType: "",
    practiceSize: "",
    zipCode: "",
    country: "",
    state: "",
    phoneNumber: "",
    email: "",
    customSpecialty: "",
    howDidYouHear: "",
    agreeToMessages: false,
    agreeToTerms: false
  }, 'practice');

  // Get available regions based on selected country
  const availableRegions = useMemo(() => {
    if (!formData.country) return [];
    return getRegionsForCountry(formData.country);
  }, [formData.country]);

  const filteredSpecialties = allSpecialties.filter(specialty =>
    specialty.toLowerCase().includes(specialtySearch.toLowerCase()) &&
    !selectedSpecialties.includes(specialty)
  );

  const addSpecialty = (specialty: string) => {
    const newSpecialties = [...selectedSpecialties, specialty];
    setSelectedSpecialties(newSpecialties);
    setSpecialtySearch("");
    setShowSpecialtyDropdown(false);
  };

  const removeSpecialty = (specialty: string) => {
    const newSpecialties = selectedSpecialties.filter(s => s !== specialty);
    setSelectedSpecialties(newSpecialties);
  };

  const handlePracticeRegistration = async () => {
    if (!formData.practiceName) {
      toast.error("Please enter a practice name");
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to register a practice");
        return;
      }

      // Create minimal practice record
      const { error } = await supabase
        .from('practices')
        .insert({
          admin_id: user.id,
          name: formData.practiceName,
          practice_type: formData.practiceType || null,
          practice_size: formData.practiceSize || null,
          zip_code: formData.zipCode || null,
          country: formData.country || "United States",
          state: formData.state || null,
          phone: formData.phoneNumber || null,
          email: formData.email || null,
          specialties: selectedSpecialties,
          how_heard_about_us: formData.howDidYouHear || null,
          agrees_to_updates: formData.agreeToMessages,
          agrees_to_terms: formData.agreeToTerms,
          verified: false,
          verification_status: 'pending'
        });

      if (error) throw error;

      toast.success("Practice created! You can now access your dashboard.");
      window.location.href = "/dashboard";
    } catch (error: any) {
      console.error("Error creating practice:", error);
      toast.error(error.message || "Failed to create practice");
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(handlePracticeRegistration, { skipValidation: true });
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create Your Practice Profile</h1>
          <p className="text-muted-foreground">Get started with basic information - you can complete verification later from your dashboard</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          {/* Section 1: Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="h-5 w-5 text-primary" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium">Practice Name *</Label>
                  <Input 
                    placeholder="Enter practice name" 
                    value={formData.practiceName}
                    onChange={(e) => updateField('practiceName', e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">This is the only required field to get started</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Practice Type (Optional)</Label>
                  <Select onValueChange={(value) => updateField('practiceType', value)} value={formData.practiceType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select practice type" />
                    </SelectTrigger>
                    <SelectContent>
                      {practiceTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    Practice Size (Optional)
                    <span className="text-xs text-muted-foreground ml-1">(total providers including MDs, PAs, NPs)</span>
                  </Label>
                  <Select onValueChange={(value) => updateField('practiceSize', value)} value={formData.practiceSize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select practice size" />
                    </SelectTrigger>
                    <SelectContent>
                      {practiceSizes.map((size) => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">ZIP Code (Optional)</Label>
                  <Input 
                    placeholder="12345" 
                    maxLength={5}
                    value={formData.zipCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      updateField('zipCode', value);
                    }}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Country (Optional)</Label>
                  <Select 
                    onValueChange={(value) => {
                      updateField('country', value);
                      updateField('state', ''); // Reset state when country changes
                    }} 
                    value={formData.country}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countryRegions.map((country) => (
                        <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">State/Region (Optional)</Label>
                  <Select 
                    onValueChange={(value) => updateField('state', value)} 
                    value={formData.state}
                    disabled={!formData.country || availableRegions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={availableRegions.length === 0 ? "Select country first" : "Select state/region"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRegions.map((region) => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Phone Number (Optional)</Label>
                  <Input 
                    placeholder="(555) 123-4567" 
                    value={formData.phoneNumber}
                    onChange={(e) => updateField('phoneNumber', e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Email Address (Optional)</Label>
                  <Input 
                    type="email" 
                    placeholder="practice@example.com" 
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Specialties & Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Stethoscope className="h-5 w-5 text-primary" />
                Specialties & Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Specialties (Optional)</Label>
                <div className="mt-2 relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search specialties..."
                      value={specialtySearch}
                      onChange={(e) => setSpecialtySearch(e.target.value)}
                      onFocus={() => setShowSpecialtyDropdown(true)}
                      className="pl-10"
                    />
                  </div>
                  
                  {showSpecialtyDropdown && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredSpecialties.map((specialty) => (
                        <button
                          key={specialty}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                          onClick={() => addSpecialty(specialty)}
                        >
                          {specialty}
                        </button>
                      ))}
                      {filteredSpecialties.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No specialties found</div>
                      )}
                    </div>
                  )}
                </div>
                
                {selectedSpecialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedSpecialties.map((specialty) => (
                      <Badge key={specialty} variant="secondary" className="px-3 py-1">
                        {specialty}
                        <button
                          type="button"
                          onClick={() => removeSpecialty(specialty)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">If your specialty is not listed, please specify:</Label>
                <Input 
                  placeholder="Enter custom specialty" 
                  value={formData.customSpecialty}
                  onChange={(e) => updateField('customSpecialty', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Discovery */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">How did you hear about us?</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label className="text-sm font-medium">Discovery Source (Optional)</Label>
                <Select onValueChange={(value) => updateField('howDidYouHear', value)} value={formData.howDidYouHear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select how you heard about us" />
                  </SelectTrigger>
                  <SelectContent>
                    {hearAboutOptions.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Security & Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Shield className="h-5 w-5 text-primary" />
                Security & Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-row items-start space-x-3 space-y-0">
                <Checkbox
                  checked={formData.agreeToMessages}
                  onCheckedChange={(checked) => updateField('agreeToMessages', checked)}
                />
                <div className="space-y-1 leading-none">
                  <Label className="text-sm">
                    I agree to receive updates and marketing communications
                  </Label>
                </div>
              </div>

              <div className="flex flex-row items-start space-x-3 space-y-0">
                <Checkbox
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => updateField('agreeToTerms', checked)}
                />
                <div className="space-y-1 leading-none">
                  <Label className="text-sm">
                    I agree to the Terms of Service and Privacy Policy
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Call to Action */}
          <Card>
            <CardContent className="pt-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Quick Setup:</strong> Enter your practice name to create your account. 
                  You can complete full verification (documents, business details) later from your dashboard.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  type="submit" 
                  className="flex-1 h-12 text-base font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Practice..." : "Create Practice & Continue"}
                </Button>
                <Button type="button" variant="outline" className="flex-1 h-12 text-base">
                  Request a Demo
                </Button>
              </div>
              
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Already have an account? <a href="/auth" className="text-primary hover:underline">Sign in</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default RegisterPractice;