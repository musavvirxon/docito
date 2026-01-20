// src/pages/PracticeVerification.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Upload, CheckCircle, XCircle, Clock, Loader2, FileText, Plus, X } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";

interface VerificationData {
  business_name: string;
  business_type: string;
  practice_size: string;
  country: string;
  state: string;
  city: string;
  zip_code: string;
  full_address: string;
  phone: string;
  business_email: string;
  website_url: string;
  operating_hours: Record<string, { open: string; close: string; closed: boolean }>;
  services_offered: string[];
  specialties: string[];
  practice_description: string;
}

interface DocumentUpload {
  type: string;
  category: string;
  label: string;
  description: string;
  required: boolean;
  file?: File;
  uploaded?: boolean;
  file_path?: string;
  status?: string;
}

const REQUIRED_DOCUMENTS: DocumentUpload[] = [
  { type: "business_license", category: "business", label: "Business License", description: "Valid business operating license or permit", required: true },
  { type: "business_registration", category: "business", label: "Business Registration Certificate", description: "Official registration document", required: true },
  { type: "tax_certificate", category: "business", label: "Tax Certificate / VAT Registration", description: "Tax identification document", required: true },
  { type: "address_proof", category: "business", label: "Proof of Business Address", description: "Utility bill or lease agreement", required: true },
  { type: "medical_license", category: "professional", label: "Practice Medical/Dental License", description: "Professional practice license", required: true },
  { type: "liability_insurance", category: "professional", label: "Professional Liability Insurance", description: "Current insurance certificate", required: true },
  { type: "dea_registration", category: "professional", label: "DEA Registration", description: "Drug Enforcement Administration certificate (if applicable)", required: false },
  { type: "board_certifications", category: "professional", label: "Board Certifications", description: "Relevant board certifications", required: false },
  { type: "hipaa_compliance", category: "compliance", label: "HIPAA Compliance Documentation", description: "HIPAA compliance certificate", required: true },
  { type: "osha_compliance", category: "compliance", label: "OSHA Compliance Certificate", description: "Workplace safety compliance (if applicable)", required: false },
  { type: "background_check", category: "compliance", label: "Background Check", description: "Background verification for practice owner", required: true },
  { type: "facility_inspection", category: "compliance", label: "Facility Inspection Certificate", description: "Recent facility inspection report (if applicable)", required: false },
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function PracticeVerification() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { uploadFile, uploading } = useFileUpload();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>("pending");

  const [formData, setFormData] = useState<VerificationData>({
    business_name: "",
    business_type: "",
    practice_size: "",
    country: "United States",
    state: "",
    city: "",
    zip_code: "",
    full_address: "",
    phone: "",
    business_email: "",
    website_url: "",
    operating_hours: {
      Monday: { open: "09:00", close: "17:00", closed: false },
      Tuesday: { open: "09:00", close: "17:00", closed: false },
      Wednesday: { open: "09:00", close: "17:00", closed: false },
      Thursday: { open: "09:00", close: "17:00", closed: false },
      Friday: { open: "09:00", close: "17:00", closed: false },
      Saturday: { open: "10:00", close: "14:00", closed: true },
      Sunday: { open: "10:00", close: "14:00", closed: true },
    },
    services_offered: [],
    specialties: [],
    practice_description: "",
  });

  const [documents, setDocuments] = useState<DocumentUpload[]>(REQUIRED_DOCUMENTS);
  const [customService, setCustomService] = useState("");
  const [customSpecialty, setCustomSpecialty] = useState("");

  useEffect(() => {
    fetchPracticeAndVerification();
  }, [user]);

  const fetchPracticeAndVerification = async () => {
    if (!user) return;

    try {
      // Fetch practice
      const { data: practiceData, error: practiceError } = await supabase
        .from("practices")
        .select("*")
        .eq("admin_id", user.id)
        .maybeSingle();

      if (practiceError) throw practiceError;
      if (!practiceData) {
        toast.error("No practice found. Please create a practice first.");
        navigate("/dashboard");
        return;
      }

      setPracticeId(practiceData.id);

      // Fetch existing verification
      const { data: verificationData, error: verificationError } = await supabase
        .from("practice_verification" as any)
        .select("*")
        .eq("practice_id", practiceData.id)
        .maybeSingle();

      if (verificationError && verificationError.code !== "PGRST116") {
        throw verificationError;
      }

      if (verificationData) {
        const vData = verificationData as any;
        setVerificationId(vData.id);
        setCurrentStatus(vData.status);
        setFormData({
          business_name: vData.business_name || "",
          business_type: vData.business_type || "",
          practice_size: vData.practice_size || "",
          country: vData.country || "United States",
          state: vData.state || "",
          city: vData.city || "",
          zip_code: vData.zip_code || "",
          full_address: vData.full_address || "",
          phone: vData.phone || "",
          business_email: vData.business_email || "",
          website_url: vData.website_url || "",
          operating_hours: vData.operating_hours || formData.operating_hours,
          services_offered: vData.services_offered || [],
          specialties: vData.specialties || [],
          practice_description: vData.practice_description || "",
        });

        // Fetch uploaded documents
        const { data: docsData } = await supabase
          .from("verification_documents" as any)
          .select("*")
          .eq("verification_id", vData.id);

        if (docsData) {
          setDocuments((prev) =>
            prev.map((doc) => {
              const uploaded = (docsData as any[]).find((d: any) => d.document_type === doc.type);
              if (uploaded) {
                return {
                  ...doc,
                  uploaded: true,
                  file_path: uploaded.file_path,
                  status: uploaded.status,
                };
              }
              return doc;
            })
          );
        }
      } else {
        // Pre-fill from practice data
        setFormData((prev) => ({
          ...prev,
          business_name: practiceData.name || "",
          business_type: practiceData.practice_type || "",
          phone: practiceData.phone || "",
          business_email: practiceData.email || "",
          website_url: practiceData.website || "",
          city: practiceData.city || "",
          state: practiceData.state || "",
          country: practiceData.country || "United States",
          full_address: practiceData.address || "",
          zip_code: practiceData.zip_code || "",
          services_offered: practiceData.services_offered || [],
          specialties: practiceData.specialties || [],
        }));
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load verification data");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (docType: string, file: File) => {
    setDocuments((prev) => prev.map((doc) => (doc.type === docType ? { ...doc, file } : doc)));
  };

  const handleOperatingHoursChange = (
    day: string,
    field: "open" | "close" | "closed",
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: {
          ...prev.operating_hours[day],
          [field]: value,
        },
      },
    }));
  };

  const addCustomItem = (type: "service" | "specialty") => {
    const value = type === "service" ? customService : customSpecialty;
    if (!value.trim()) return;

    setFormData((prev) => ({
      ...prev,
      [type === "service" ? "services_offered" : "specialties"]: [
        ...prev[type === "service" ? "services_offered" : "specialties"],
        value.trim(),
      ],
    }));

    if (type === "service") setCustomService("");
    else setCustomSpecialty("");
  };

  const removeItem = (type: "service" | "specialty", index: number) => {
    setFormData((prev) => ({
      ...prev,
      [type === "service" ? "services_offered" : "specialties"]: prev[
        type === "service" ? "services_offered" : "specialties"
      ].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.business_name || !formData.business_type || !formData.phone || !formData.business_email) {
      toast.error("Please fill in all required business information fields");
      return;
    }

    // Check required documents
    const missingDocs = documents.filter((doc) => doc.required && !doc.file && !doc.uploaded);
    if (missingDocs.length > 0) {
      toast.error(`Please upload required documents: ${missingDocs.map((d) => d.label).join(", ")}`);
      return;
    }

    setSaving(true);

    try {
      // Create or update verification record
      let currentVerificationId = verificationId;

      if (!verificationId) {
        const { data: newVerification, error: verificationError } = await supabase
          .from("practice_verification" as any)
          .insert({
            practice_id: practiceId,
            ...formData,
            status: "under_review",
            submitted_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (verificationError) throw verificationError;
        currentVerificationId = (newVerification as any).id;
        setVerificationId((newVerification as any).id);
      } else {
        const { error: updateError } = await supabase
          .from("practice_verification" as any)
          .update({
            ...formData,
            status: "under_review",
            submitted_at: new Date().toISOString(),
          })
          .eq("id", verificationId);

        if (updateError) throw updateError;
      }

      // Upload new documents
      for (const doc of documents) {
        if (doc.file && !doc.uploaded) {
          const result = await uploadFile(doc.file, "verification-documents", `${practiceId}/${doc.type}-${Date.now()}`);

          if (result) {
            await supabase.from("verification_documents" as any).insert({
              verification_id: currentVerificationId,
              document_type: doc.type,
              document_category: doc.category,
              file_name: doc.file.name,
              file_path: result.path,
              file_size: doc.file.size,
              status: "pending",
            });
          }
        }
      }

      toast.success(
        "Verification request submitted successfully! We'll review your application within 2-3 business days."
      );
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error submitting verification:", error);
      toast.error("Failed to submit verification request");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const variants: Record<string, { color: string; icon: any }> = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      under_review: { color: "bg-blue-100 text-blue-800", icon: Clock },
      verified: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      rejected: { color: "bg-red-100 text-red-800", icon: XCircle },
    };

    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;

    return (
      <Badge className={variant.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Practice Verification</h1>
              <p className="text-muted-foreground">Complete all sections to verify your practice</p>
            </div>
            {currentStatus !== "pending" && getStatusBadge(currentStatus)}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle>1. Business Information</CardTitle>
              <CardDescription>Basic details about your practice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_name">Practice/Clinic Name *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="Enter practice name"
                  />
                </div>
                <div>
                  <Label htmlFor="business_type">Business Type *</Label>
                  <Select
                    value={formData.business_type}
                    onValueChange={(value) => setFormData({ ...formData, business_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dental">Dental</SelectItem>
                      <SelectItem value="Medical">Medical</SelectItem>
                      <SelectItem value="Multispecialty">Multispecialty</SelectItem>
                      <SelectItem value="Clinic">Clinic</SelectItem>
                      <SelectItem value="Hospital">Hospital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="practice_size">Practice Size</Label>
                  <Input
                    id="practice_size"
                    value={formData.practice_size}
                    onChange={(e) => setFormData({ ...formData, practice_size: e.target.value })}
                    placeholder="Number of providers"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Input id="country" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="state">State / Region *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Enter state"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Enter city"
                  />
                </div>
                <div>
                  <Label htmlFor="zip_code">ZIP / Postal Code *</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    placeholder="Enter ZIP code"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="full_address">Full Address *</Label>
                  <Input
                    id="full_address"
                    value={formData.full_address}
                    onChange={(e) => setFormData({ ...formData, full_address: e.target.value })}
                    placeholder="Enter complete address"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="business_email">Business Email *</Label>
                  <Input
                    id="business_email"
                    type="email"
                    value={formData.business_email}
                    onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                    placeholder="Enter email"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <Label className="mb-4 block">Operating Hours</Label>
                <div className="space-y-3">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="flex items-center gap-4">
                      <div className="w-28 font-medium text-sm">{day}</div>
                      <Input
                        type="time"
                        value={formData.operating_hours[day]?.open || "09:00"}
                        onChange={(e) => handleOperatingHoursChange(day, "open", e.target.value)}
                        disabled={formData.operating_hours[day]?.closed}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={formData.operating_hours[day]?.close || "17:00"}
                        onChange={(e) => handleOperatingHoursChange(day, "close", e.target.value)}
                        disabled={formData.operating_hours[day]?.closed}
                        className="w-32"
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.operating_hours[day]?.closed || false}
                          onChange={(e) => handleOperatingHoursChange(day, "closed", e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">Closed</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents Upload */}
          <Card>
            <CardHeader>
              <CardTitle>2. Upload Business Documents</CardTitle>
              <CardDescription>Upload all required verification documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {["business", "professional", "compliance"].map((category) => (
                <div key={category}>
                  <h3 className="font-semibold text-lg mb-4 capitalize">{category} Documents</h3>
                  <div className="space-y-4">
                    {documents
                      .filter((doc) => doc.category === category)
                      .map((doc) => (
                        <div key={doc.type} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Label className="font-medium">{doc.label}</Label>
                                {doc.required && (
                                  <Badge variant="destructive" className="text-xs">
                                    Required
                                  </Badge>
                                )}
                                {doc.uploaded && getStatusBadge(doc.status)}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                            </div>
                          </div>

                          {doc.uploaded ? (
                            <div className="flex items-center gap-2 mt-3">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Document uploaded</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDocuments((prev) =>
                                    prev.map((d) => (d.type === doc.type ? { ...d, uploaded: false, file_path: undefined } : d))
                                  );
                                }}
                              >
                                Replace
                              </Button>
                            </div>
                          ) : (
                            <div className="mt-3">
                              <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileSelect(doc.type, file);
                                }}
                                className="cursor-pointer"
                              />
                              {doc.file && (
                                <p className="text-sm text-muted-foreground mt-2">Selected: {doc.file.name}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Practice Information */}
          <Card>
            <CardHeader>
              <CardTitle>3. Practice Information</CardTitle>
              <CardDescription>Services and specialties offered</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Services Offered</Label>
                <div className="flex gap-2 mt-2 mb-3 flex-wrap">
                  {formData.services_offered.map((service, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {service}
                      <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeItem("service", index)} />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customService}
                    onChange={(e) => setCustomService(e.target.value)}
                    placeholder="Add custom service"
                    onKeyPress={(e) => e.key === "Enter" && addCustomItem("service")}
                  />
                  <Button type="button" onClick={() => addCustomItem("service")}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Specialties</Label>
                <div className="flex gap-2 mt-2 mb-3 flex-wrap">
                  {formData.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {specialty}
                      <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeItem("specialty", index)} />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customSpecialty}
                    onChange={(e) => setCustomSpecialty(e.target.value)}
                    placeholder="Add custom specialty"
                    onKeyPress={(e) => e.key === "Enter" && addCustomItem("specialty")}
                  />
                  <Button type="button" onClick={() => addCustomItem("specialty")}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="practice_description">Practice Description</Label>
                <Textarea
                  id="practice_description"
                  value={formData.practice_description}
                  onChange={(e) => setFormData({ ...formData, practice_description: e.target.value })}
                  placeholder="Describe your practice..."
                  rows={5}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving || uploading}>
              {saving || uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
