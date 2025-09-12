import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Search, Building2, Users, MapPin, Phone, Mail, Stethoscope, Shield, ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const formSchema = z.object({
  practiceName: z.string().optional(),
  practiceType: z.string().optional(),
  practiceSize: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  customSpecialty: z.string().optional(),
  howDidYouHear: z.string().optional(),
  agreeToMessages: z.boolean().optional(),
  agreeToTerms: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

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

const countries = ["United States", "Canada", "United Kingdom"];
const usStates = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia"];

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
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      specialties: [],
      agreeToMessages: false,
      agreeToTerms: false,
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
    },
  });

  const filteredSpecialties = allSpecialties.filter(specialty =>
    specialty.toLowerCase().includes(specialtySearch.toLowerCase()) &&
    !selectedSpecialties.includes(specialty)
  );

  const addSpecialty = (specialty: string) => {
    const newSpecialties = [...selectedSpecialties, specialty];
    setSelectedSpecialties(newSpecialties);
    form.setValue("specialties", newSpecialties);
    setSpecialtySearch("");
    setShowSpecialtyDropdown(false);
  };

  const removeSpecialty = (specialty: string) => {
    const newSpecialties = selectedSpecialties.filter(s => s !== specialty);
    setSelectedSpecialties(newSpecialties);
    form.setValue("specialties", newSpecialties);
  };

  const onSubmit = (data: FormData) => {
    console.log("Form submitted:", data);
    // Allow submission with any data - redirect to processing page
    window.location.href = "/processing-practice";
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Register Your Practice</h1>
          <p className="text-muted-foreground">Join our trusted healthcare network and start attracting new patients today</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
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
                  <FormField
                    control={form.control}
                    name="practiceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Practice Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter practice name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="practiceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Practice Type (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select practice type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {practiceTypes.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="practiceSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Practice Size (Optional)
                          <span className="text-xs text-muted-foreground ml-1">(total providers including MDs, PAs, NPs)</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select practice size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {practiceSizes.map((size) => (
                              <SelectItem key={size} value={size}>{size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">ZIP Code (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="12345" 
                            maxLength={5}
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                        {field.value && field.value.length === 5 && !/^\d{5}$/.test(field.value) && (
                          <p className="text-xs text-destructive">Maximum character limit reached</p>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Country (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country} value={country}>{country}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">State/Region (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select state/region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {usStates.map((state) => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Email Address (Optional)</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="practice@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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

                <FormField
                  control={form.control}
                  name="customSpecialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">If your specialty is not listed, please specify:</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter custom specialty" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 3: Discovery */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">How did you hear about us?</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="howDidYouHear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Discovery Source (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select how you heard about us" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {hearAboutOptions.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <FormField
                  control={form.control}
                  name="agreeToMessages"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm">
                          By checking this box I agree to receive text messages and emails about updates and offers *
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agreeToTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm">
                          I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a> *
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Your Data. Fully Protected.</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your practice and patient data is encrypted and protected with enterprise-grade security. 
                    We are HIPAA-compliant and follow strict data privacy regulations.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Section 5: Call to Action */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button type="submit" className="flex-1 h-12 text-base font-medium">
                    Sign Up
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 h-12 text-base">
                    Request a Demo
                  </Button>
                </div>
                
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <a href="#" className="text-primary hover:underline font-medium">
                      Log In
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

          </form>
        </Form>
      </main>

      <Footer />
    </div>
  );
};

export default RegisterPractice;