// PATH: src/pages/PracticeVerification.tsx
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          setDocuments(prev => prev.map(doc => {
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
          }));
        }
      } else {
        // Pre-fill from practice data
        setFormData(prev => ({
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
    setDocuments(prev => prev.map(doc =>
      doc.type === docType ? { ...doc, file } : doc
    ));
  };

  const handleOperatingHoursChange = (day: string, field: "open" | "close" | "closed", value: string | boolean) => {
    setFormData(prev => ({
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

    setFormData(prev => ({
      ...prev,
      [type === "service" ? "services_offered" : "specialties"]: [
        ...prev[type === "service" ? "services_offered" : "specialties"],
        value.trim()
      ],
    }));

    if (type === "service") setCustomService("");
    else setCustomSpecialty("");
  };

  const removeItem = (type: "service" | "specialty", index: number) => {
    setFormData(prev => ({
      ...prev,
      [type === "service" ? "services_offered" : "specialties"]:
        prev[type === "service" ? "services_offered" : "specialties"].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.business_name || !formData.business_type || !formData.phone || !formData.business_email) {
      toast.error("Please fill in all required business information fields");
      return;
    }

    // Check required documents
    const missingDocs = documents.filter(doc => doc.required && !doc.file && !doc.uploaded);
    if (missingDocs.length > 0) {
      toast.error(`Please upload all required documents: ${missingDocs.map(d => d.label).join(", ")}`);
      return;
    }

    if (!practiceId) return;

    setSaving(true);

    try {
      let vId = verificationId;

      // Create or update verification record
      const verificationPayload = {
        practice_id: practiceId,
        ...formData,
        status: "under_review",
        submitted_at: new Date().toISOString(),
      };

      if (vId) {
        const { error: updateError } = await supabase
          .from("practice_verification" as any)
          .update(verificationPayload)
          .eq("id", vId);

        if (updateError) throw updateError;
      } else {
        const { data: newVerification, error: createError } = await supabase
          .from("practice_verification" as any)
          .insert(verificationPayload)
          .select()
          .single();

        if (createError) throw createError;
        vId = (newVerification as any).id;
        setVerificationId(vId);
      }

      // Upload documents
      for (const doc of documents) {
        if (doc.file && !doc.uploaded) {
          const filePath = await uploadFile(doc.file, `verification/${practiceId}/${doc.type}`);
          if (!filePath) continue;

          await supabase
            .from("verification_documents" as any)
            .insert({
              verification_id: vId,
              document_type: doc.type,
              file_path: filePath,
              status: "submitted",
            });
        }
      }

      setCurrentStatus("under_review");
      toast.success("Verification submitted successfully!");
    } catch (error: any) {
      console.error("Error submitting verification:", error);
      toast.error("Failed to submit verification");
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "under_review":
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "under_review":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading verification...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/practice-dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Practice Verification</h1>
              <p className="text-muted-foreground text-sm">
                Complete verification to unlock full platform access
              </p>
            </div>
          </div>

          <Badge className={`border ${getStatusColor(currentStatus)}`}>
            <span className="flex items-center gap-2">
              {getStatusIcon(currentStatus)}
              {currentStatus.replace("_", " ").toUpperCase()}
            </span>
          </Badge>
        </div>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>Provide accurate information about your practice</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Business Name *</Label>
              <Input value={formData.business_name} onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Business Type *</Label>
              <Input value={formData.business_type} onChange={(e) => setFormData(prev => ({ ...prev, business_type: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Practice Size</Label>
              <Select value={formData.practice_size} onValueChange={(v) => setFormData(prev => ({ ...prev, practice_size: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">Solo Practitioner</SelectItem>
                  <SelectItem value="small">Small (2-5 providers)</SelectItem>
                  <SelectItem value="medium">Medium (6-20 providers)</SelectItem>
                  <SelectItem value="large">Large (20+ providers)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Business Email *</Label>
              <Input value={formData.business_email} onChange={(e) => setFormData(prev => ({ ...prev, business_email: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={formData.website_url} onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Full Address</Label>
              <Textarea value={formData.full_address} onChange={(e) => setFormData(prev => ({ ...prev, full_address: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Operating Hours</CardTitle>
            <CardDescription>Set your practice hours for each day</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="flex items-center justify-between gap-4 flex-wrap border rounded-xl p-4">
                <div className="font-medium w-28">{day}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-xs text-muted-foreground">Open</Label>
                  <Input
                    type="time"
                    value={formData.operating_hours[day].open}
                    disabled={formData.operating_hours[day].closed}
                    onChange={(e) => handleOperatingHoursChange(day, "open", e.target.value)}
                    className="w-32"
                  />
                  <Label className="text-xs text-muted-foreground">Close</Label>
                  <Input
                    type="time"
                    value={formData.operating_hours[day].close}
                    disabled={formData.operating_hours[day].closed}
                    onChange={(e) => handleOperatingHoursChange(day, "close", e.target.value)}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.operating_hours[day].closed}
                    onChange={(e) => handleOperatingHoursChange(day, "closed", e.target.checked)}
                  />
                  <span className="text-sm text-muted-foreground">Closed</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Services & Specialties</CardTitle>
            <CardDescription>Tell us what you offer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Services Offered</Label>
              <div className="flex gap-2">
                <Input value={customService} onChange={(e) => setCustomService(e.target.value)} placeholder="Add a service..." />
                <Button type="button" onClick={() => addCustomItem("service")} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.services_offered.map((s, idx) => (
                  <Badge key={`${s}-${idx}`} variant="secondary" className="gap-2">
                    {s}
                    <button type="button" onClick={() => removeItem("service", idx)} className="opacity-70 hover:opacity-100">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Specialties</Label>
              <div className="flex gap-2">
                <Input value={customSpecialty} onChange={(e) => setCustomSpecialty(e.target.value)} placeholder="Add a specialty..." />
                <Button type="button" onClick={() => addCustomItem("specialty")} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.specialties.map((s, idx) => (
                  <Badge key={`${s}-${idx}`} variant="secondary" className="gap-2">
                    {s}
                    <button type="button" onClick={() => removeItem("specialty", idx)} className="opacity-70 hover:opacity-100">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Practice Description</Label>
              <Textarea
                value={formData.practice_description}
                onChange={(e) => setFormData(prev => ({ ...prev, practice_description: e.target.value }))}
                placeholder="Tell us about your practice..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Required Documents</CardTitle>
            <CardDescription>Upload required documentation to verify your practice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.type} className="border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <div className="font-medium">{doc.label}</div>
                      {doc.required && <Badge variant="default">Required</Badge>}
                      {doc.uploaded && <Badge variant="secondary">Uploaded</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">{doc.description}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(doc.type, file);
                      }}
                      className="hidden"
                      id={`file-${doc.type}`}
                    />
                    <Label htmlFor={`file-${doc.type}`} className="cursor-pointer">
                      <Button type="button" variant="outline" disabled={uploading}>
                        <Upload className="w-4 h-4 mr-2" />
                        {doc.uploaded ? "Replace" : "Upload"}
                      </Button>
                    </Label>
                  </div>
                </div>

                {doc.file && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    Selected: <span className="font-medium">{doc.file.name}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-10">
          <Button variant="outline" onClick={() => navigate("/practice-dashboard")}>
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
  );
}
