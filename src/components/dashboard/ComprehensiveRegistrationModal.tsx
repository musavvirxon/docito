import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ComprehensiveRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  practiceId: string;
  existingPracticeData?: any;
}

const practiceTypes = [
  "Clinic", "Private Practice", "Hospital", "Dental Office", "Urgent Care",
  "Specialty Center", "Multi-Specialty Group", "Community Health Center"
];

const practiceSizes = [
  "1-5 providers", "6-10 providers", "11-25 providers", 
  "26-50 providers", "51-100 providers", "100+ providers"
];

const allSpecialties = [
  "Cardiology", "Dermatology", "Endocrinology", "Family Medicine",
  "Gastroenterology", "General Practice", "Internal Medicine", "Neurology",
  "Obstetrics & Gynecology", "Oncology", "Orthopedics", "Pediatrics",
  "Psychiatry", "Pulmonology", "Rheumatology", "Urology", "Dentistry"
];

const hearAboutOptions = [
  "Search Engine (Google, Bing)", "Social Media", "Referral from Colleague",
  "Medical Conference", "Advertisement", "Other"
];

export function ComprehensiveRegistrationModal({ 
  open, 
  onOpenChange, 
  onSuccess,
  practiceId,
  existingPracticeData
}: ComprehensiveRegistrationModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    // Basic Information
    name: existingPracticeData?.name || "",
    legalBusinessName: existingPracticeData?.legal_business_name || "",
    practiceType: existingPracticeData?.practice_type || "",
    practiceSize: existingPracticeData?.practice_size || "",
    country: existingPracticeData?.country || "United States",
    state: existingPracticeData?.state || "",
    city: existingPracticeData?.city || "",
    zipCode: existingPracticeData?.zip_code || "",
    address: existingPracticeData?.address || "",
    email: existingPracticeData?.email || "",
    phone: existingPracticeData?.phone || "",
    website: existingPracticeData?.website || "",
    
    // Business Information
    businessRegistrationNumber: existingPracticeData?.business_registration_number || "",
    taxId: existingPracticeData?.tax_id || "",
    yearEstablished: existingPracticeData?.year_established?.toString() || "",
    businessOwner: existingPracticeData?.business_owner || "",
    description: existingPracticeData?.description || "",
    
    // Specialties & Services
    specialties: existingPracticeData?.specialties || [] as string[],
    customSpecialty: "",
    servicesOffered: existingPracticeData?.services_offered || [] as string[],
    customService: "",
    operatingHours: existingPracticeData?.operating_hours || {
      monday: { start: "09:00", end: "17:00", enabled: true },
      tuesday: { start: "09:00", end: "17:00", enabled: true },
      wednesday: { start: "09:00", end: "17:00", enabled: true },
      thursday: { start: "09:00", end: "17:00", enabled: true },
      friday: { start: "09:00", end: "17:00", enabled: true },
      saturday: { start: "10:00", end: "14:00", enabled: false },
      sunday: { start: "10:00", end: "14:00", enabled: false },
    },
    
    // Discovery
    howHeardAboutUs: existingPracticeData?.how_heard_about_us || "",
    
    // Agreements
    agreesToUpdates: existingPracticeData?.agrees_to_updates || false,
    agreesToTerms: existingPracticeData?.agrees_to_terms || false,
  });

  const addSpecialty = (specialty: string) => {
    if (!formData.specialties.includes(specialty)) {
      setFormData({ 
        ...formData, 
        specialties: [...formData.specialties, specialty] 
      });
    }
  };

  const removeSpecialty = (specialty: string) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter(s => s !== specialty)
    });
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validation
    if (!formData.agreesToTerms) {
      toast.error("You must agree to the Terms of Service and Privacy Policy");
      return;
    }

    if (!formData.name || !formData.legalBusinessName || !formData.businessRegistrationNumber || !formData.taxId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // Update practice with complete information
      const { error: practiceError } = await supabase
        .from('practices')
        .update({
          name: formData.name,
          legal_business_name: formData.legalBusinessName,
          practice_type: formData.practiceType,
          practice_size: formData.practiceSize,
          country: formData.country,
          state: formData.state,
          city: formData.city,
          zip_code: formData.zipCode,
          address: formData.address,
          email: formData.email,
          phone: formData.phone,
          website: formData.website || null,
          business_registration_number: formData.businessRegistrationNumber,
          tax_id: formData.taxId,
          year_established: formData.yearEstablished ? parseInt(formData.yearEstablished) : null,
          business_owner: formData.businessOwner,
          description: formData.description || null,
          specialties: formData.specialties,
          services_offered: formData.servicesOffered,
          operating_hours: formData.operatingHours,
          how_heard_about_us: formData.howHeardAboutUs,
          agrees_to_updates: formData.agreesToUpdates,
          agrees_to_terms: formData.agreesToTerms,
        })
        .eq('id', practiceId);

      if (practiceError) throw practiceError;

      // Create verification record
      const { error: verificationError } = await supabase
        .from('practice_verification' as any)
        .insert({
          practice_id: practiceId,
          business_name: formData.name,
          business_type: formData.practiceType,
          practice_size: formData.practiceSize,
          country: formData.country,
          state: formData.state,
          city: formData.city,
          zip_code: formData.zipCode,
          full_address: formData.address,
          phone: formData.phone,
          business_email: formData.email,
          website_url: formData.website || null,
          operating_hours: formData.operatingHours,
          services_offered: formData.servicesOffered,
          specialties: formData.specialties,
          practice_description: formData.description,
          status: 'pending',
          submitted_at: new Date().toISOString()
        });

      if (verificationError) throw verificationError;

      // Update practice verification status
      await supabase
        .from('practices')
        .update({ verification_status: 'pending' })
        .eq('id', practiceId);

      toast.success("Verification information submitted! You'll be redirected to upload required documents.");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('Error submitting verification:', err);
      toast.error(err.message || "Failed to submit verification");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Practice Name *</Label>
        <Input
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Central Medical Clinic"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="legalBusinessName">Legal Business Name *</Label>
        <Input
          id="legalBusinessName"
          required
          value={formData.legalBusinessName}
          onChange={(e) => setFormData({ ...formData, legalBusinessName: e.target.value })}
          placeholder="Central Medical Clinic LLC"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="practiceType">Practice Type *</Label>
          <Select 
            value={formData.practiceType} 
            onValueChange={(value) => setFormData({ ...formData, practiceType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {practiceTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="practiceSize">Practice Size *</Label>
          <Select 
            value={formData.practiceSize} 
            onValueChange={(value) => setFormData({ ...formData, practiceSize: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {practiceSizes.map(size => (
                <SelectItem key={size} value={size}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country">Country *</Label>
          <Input
            id="country"
            required
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State/Region *</Label>
          <Input
            id="state"
            required
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            placeholder="California"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            required
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Los Angeles"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zipCode">ZIP Code *</Label>
          <Input
            id="zipCode"
            required
            value={formData.zipCode}
            onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
            placeholder="90001"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Street Address *</Label>
        <Input
          id="address"
          required
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="123 Medical Street"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="contact@clinic.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Website (Optional)</Label>
        <Input
          id="website"
          type="url"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder="https://yourpractice.com"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="businessRegistrationNumber">Business Registration Number *</Label>
          <Input
            id="businessRegistrationNumber"
            required
            value={formData.businessRegistrationNumber}
            onChange={(e) => setFormData({ ...formData, businessRegistrationNumber: e.target.value })}
            placeholder="BR-123456789"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxId">Tax ID / VAT Number *</Label>
          <Input
            id="taxId"
            required
            value={formData.taxId}
            onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
            placeholder="12-3456789"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="yearEstablished">Year Established *</Label>
          <Input
            id="yearEstablished"
            type="number"
            required
            min="1900"
            max={new Date().getFullYear()}
            value={formData.yearEstablished}
            onChange={(e) => setFormData({ ...formData, yearEstablished: e.target.value })}
            placeholder="2020"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessOwner">Business Owner / Director Name *</Label>
          <Input
            id="businessOwner"
            required
            value={formData.businessOwner}
            onChange={(e) => setFormData({ ...formData, businessOwner: e.target.value })}
            placeholder="Dr. John Smith"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Business Description *</Label>
        <Textarea
          id="description"
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of your practice and services..."
          rows={4}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Specialties *</Label>
        <Select onValueChange={addSpecialty}>
          <SelectTrigger>
            <SelectValue placeholder="Select specialties" />
          </SelectTrigger>
          <SelectContent>
            {allSpecialties
              .filter(s => !formData.specialties.includes(s))
              .map(spec => (
                <SelectItem key={spec} value={spec}>{spec}</SelectItem>
              ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.specialties.map(specialty => (
            <Badge key={specialty} variant="secondary" className="cursor-pointer" onClick={() => removeSpecialty(specialty)}>
              {specialty} ×
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customSpecialty">Custom Specialty (if not listed)</Label>
        <div className="flex gap-2">
          <Input
            id="customSpecialty"
            value={formData.customSpecialty}
            onChange={(e) => setFormData({ ...formData, customSpecialty: e.target.value })}
            placeholder="Enter custom specialty"
          />
          <Button 
            type="button" 
            variant="outline"
            onClick={() => {
              if (formData.customSpecialty.trim()) {
                addSpecialty(formData.customSpecialty.trim());
                setFormData({ ...formData, customSpecialty: "" });
              }
            }}
          >
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customService">Services Offered</Label>
        <div className="flex gap-2">
          <Input
            id="customService"
            value={formData.customService}
            onChange={(e) => setFormData({ ...formData, customService: e.target.value })}
            placeholder="Enter service name"
          />
          <Button 
            type="button" 
            variant="outline"
            onClick={() => {
              if (formData.customService.trim()) {
                setFormData({ 
                  ...formData, 
                  servicesOffered: [...formData.servicesOffered, formData.customService.trim()],
                  customService: "" 
                });
              }
            }}
          >
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.servicesOffered.map((service, idx) => (
            <Badge 
              key={idx} 
              variant="secondary" 
              className="cursor-pointer"
              onClick={() => setFormData({
                ...formData,
                servicesOffered: formData.servicesOffered.filter((_, i) => i !== idx)
              })}
            >
              {service} ×
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="howHeardAboutUs">How did you hear about us? *</Label>
        <Select 
          value={formData.howHeardAboutUs} 
          onValueChange={(value) => setFormData({ ...formData, howHeardAboutUs: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            {hearAboutOptions.map(option => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="agreesToUpdates"
            checked={formData.agreesToUpdates}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, agreesToUpdates: checked as boolean })
            }
          />
          <label htmlFor="agreesToUpdates" className="text-sm leading-relaxed cursor-pointer">
            I agree to receive updates, newsletters, and promotional communications
          </label>
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="agreesToTerms"
            checked={formData.agreesToTerms}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, agreesToTerms: checked as boolean })
            }
          />
          <label htmlFor="agreesToTerms" className="text-sm leading-relaxed cursor-pointer">
            I agree to the <span className="text-primary underline">Terms of Service</span> and <span className="text-primary underline">Privacy Policy</span> * (required)
          </label>
        </div>
      </div>

      {!formData.agreesToTerms && (
        <p className="text-xs text-destructive">You must agree to the Terms of Service to continue</p>
      )}
    </div>
  );

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.legalBusinessName && formData.practiceType && 
               formData.practiceSize && formData.state && formData.city && formData.zipCode && 
               formData.address && formData.email && formData.phone;
      case 2:
        return formData.businessRegistrationNumber && formData.taxId && 
               formData.yearEstablished && formData.businessOwner && formData.description;
      case 3:
        return formData.specialties.length > 0;
      case 4:
        return formData.howHeardAboutUs && formData.agreesToTerms;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Practice Verification - Complete Details</DialogTitle>
          <DialogDescription>
            Step {currentStep} of {totalSteps} - Provide accurate information for verification
          </DialogDescription>
        </DialogHeader>

        <Progress value={(currentStep / totalSteps) * 100} className="mb-4" />

        <div className="mb-4 flex justify-between text-xs text-muted-foreground">
          <span className={currentStep === 1 ? "font-semibold text-foreground" : ""}>Basic Info</span>
          <span className={currentStep === 2 ? "font-semibold text-foreground" : ""}>Business Info</span>
          <span className={currentStep === 3 ? "font-semibold text-foreground" : ""}>Services</span>
          <span className={currentStep === 4 ? "font-semibold text-foreground" : ""}>Agreements</span>
        </div>

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        <div className="flex gap-3 pt-4 border-t">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={loading}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="ml-auto"
          >
            Cancel
          </Button>

          {currentStep < totalSteps ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed() || loading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit for Verification"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}