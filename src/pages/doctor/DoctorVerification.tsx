import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctorVerificationStatus } from "@/hooks/useDoctorVerificationStatus";
import { useDoctorVerification } from "@/hooks/useDoctorVerification";
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";
import type { AppRole } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  Upload,
  ArrowLeft,
  User,
  Briefcase,
  MapPin,
  Languages,
  Calendar,
  DollarSign,
  Shield,
  Loader2,
} from "lucide-react";

export default function DoctorVerification() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { verificationStatus, loading: statusLoading, refetch } = useDoctorVerificationStatus();
  const { submitForVerification, isSubmitting } = useDoctorVerification();
  const { uploadFile, uploading } = useFileUpload();

  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [doctorData, setDoctorData] = useState<any>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(true);

  // Form state for new/resubmit applications
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [medicalLicense, setMedicalLicense] = useState<File | null>(null);
  const [professionalId, setProfessionalId] = useState<File | null>(null);

  // Load doctor data
  useEffect(() => {
    const loadDoctorData = async () => {
      if (!user) return;
      setLoadingDoctor(true);
      try {
        const { data, error } = await supabase
          .from("doctors")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setDoctorId(data.id);
          setDoctorData(data);
          setSpecialty(data.specialty || "");
          setBio(data.bio || "");
          setLicenseNumber(data.license_number || "");
          setYearsExperience(data.years_experience?.toString() || "");
          setConsultationFee(data.consultation_fee?.toString() || "");
        }
      } catch (err) {
        console.error("Error loading doctor data:", err);
      } finally {
        setLoadingDoctor(false);
      }
    };

    loadDoctorData();
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async () => {
    if (!doctorId) {
      toast.error("Doctor profile not found");
      return;
    }

    if (!specialty || !licenseNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    const result = await submitForVerification(doctorId, {
      specialty,
      bio,
      license_number: licenseNumber,
      consultation_fee: parseFloat(consultationFee) || 0,
      years_experience: yearsExperience,
      documents: {
        medical_license: medicalLicense || undefined,
        professional_id: professionalId || undefined,
      },
    });

    if (result.success) {
      refetch();
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          icon: <Clock className="h-5 w-5" />,
          color: "bg-blue-100 text-blue-700 border-blue-200",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-200",
          title: "Verification Pending",
          description:
            "Your application is under review. We will notify you once it has been reviewed.",
        };
      case "resubmitted":
        return {
          icon: <Clock className="h-5 w-5" />,
          color: "bg-purple-100 text-purple-700 border-purple-200",
          bgColor: "bg-purple-50 dark:bg-purple-950/20",
          borderColor: "border-purple-200",
          title: "Resubmitted for Review",
          description:
            "Your updated application is being reviewed. We will get back to you shortly.",
        };
      case "approved":
        return {
          icon: <CheckCircle2 className="h-5 w-5" />,
          color: "bg-green-100 text-green-700 border-green-200",
          bgColor: "bg-green-50 dark:bg-green-950/20",
          borderColor: "border-green-200",
          title: "Verification Approved",
          description:
            "Congratulations! Your profile has been verified. You can now accept patients.",
        };
      case "declined":
        return {
          icon: <XCircle className="h-5 w-5" />,
          color: "bg-red-100 text-red-700 border-red-200",
          bgColor: "bg-red-50 dark:bg-red-950/20",
          borderColor: "border-red-200",
          title: "Verification Declined",
          description:
            "Your application was declined. Please review the feedback and resubmit.",
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          color: "bg-gray-100 text-gray-700 border-gray-200",
          bgColor: "bg-gray-50 dark:bg-gray-950/20",
          borderColor: "border-gray-200",
          title: "Unknown Status",
          description: "Status not recognized.",
        };
    }
  };

  const loading = authLoading || statusLoading || loadingDoctor;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardTopNav role={"doctor" as AppRole} />
        <div className="container max-w-4xl py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!doctorId) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardTopNav role={"doctor" as AppRole} />
        <div className="container max-w-4xl py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/doctor-dashboard")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
                <AlertCircle className="h-5 w-5" />
                No Doctor Profile Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-600 dark:text-yellow-400">
                You need to create a doctor profile first before you can apply
                for verification.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show verification status if exists
  if (verificationStatus) {
    const statusConfig = getStatusConfig(verificationStatus.status);
    const additionalInfo =
      verificationStatus.verification_data?.additional_info || {};
    const canResubmit = verificationStatus.status === "declined";

    return (
      <div className="min-h-screen bg-background">
        <DashboardTopNav role={"doctor" as AppRole} />
        <div className="container max-w-4xl py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/doctor-dashboard")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Doctor Verification</h1>
            <Badge className={statusConfig.color}>
              {verificationStatus.status.toUpperCase()}
            </Badge>
          </div>

          <Card className={`${statusConfig.borderColor} ${statusConfig.bgColor} mb-6`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {statusConfig.icon}
                {statusConfig.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className={statusConfig.borderColor}>
                <AlertDescription>{statusConfig.description}</AlertDescription>
              </Alert>

              {verificationStatus.status === "declined" &&
                verificationStatus.rejection_reason && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Reason for decline:</strong>{" "}
                      {verificationStatus.rejection_reason}
                    </AlertDescription>
                  </Alert>
                )}
            </CardContent>
          </Card>

          {/* Submitted Information Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Submitted Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(additionalInfo.first_name || additionalInfo.last_name) && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Name</p>
                      <p className="text-muted-foreground text-sm">
                        {additionalInfo.first_name} {additionalInfo.last_name}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Specialty</p>
                    <p className="text-muted-foreground text-sm">
                      {verificationStatus.specialty}
                    </p>
                  </div>
                </div>

                {verificationStatus.license_number && (
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">License Number</p>
                      <p className="text-muted-foreground text-sm">
                        {verificationStatus.license_number}
                      </p>
                    </div>
                  </div>
                )}

                {verificationStatus.years_of_experience && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Experience</p>
                      <p className="text-muted-foreground text-sm">
                        {verificationStatus.years_of_experience}
                      </p>
                    </div>
                  </div>
                )}

                {(additionalInfo.country || additionalInfo.region) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Location</p>
                      <p className="text-muted-foreground text-sm">
                        {additionalInfo.region && `${additionalInfo.region}, `}
                        {additionalInfo.country}
                      </p>
                    </div>
                  </div>
                )}

                {verificationStatus.verification_data?.languages &&
                  verificationStatus.verification_data.languages.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Languages className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Languages</p>
                        <p className="text-muted-foreground text-sm">
                          {verificationStatus.verification_data.languages.join(
                            ", "
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                {(additionalInfo.consultation_fee_from ||
                  additionalInfo.consultation_fee_to) && (
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Consultation Fee</p>
                      <p className="text-muted-foreground text-sm">
                        ${additionalInfo.consultation_fee_from || "0"} - $
                        {additionalInfo.consultation_fee_to || "0"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Documents */}
              {verificationStatus.documents &&
                verificationStatus.documents.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <p className="font-medium text-sm mb-2">Uploaded Documents</p>
                    <div className="space-y-1">
                      {verificationStatus.documents.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <FileText className="h-4 w-4" />
                          {doc.document_type === "medical_license"
                            ? "Medical License"
                            : doc.document_type === "professional_id"
                            ? "Professional ID"
                            : doc.document_type}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <p className="text-xs text-muted-foreground mt-4">
                Submitted on{" "}
                {new Date(verificationStatus.submitted_at).toLocaleDateString()}
                {verificationStatus.reviewed_at &&
                  ` • Reviewed on ${new Date(
                    verificationStatus.reviewed_at
                  ).toLocaleDateString()}`}
              </p>
            </CardContent>
          </Card>

          {canResubmit && (
            <Card>
              <CardHeader>
                <CardTitle>Resubmit Application</CardTitle>
                <CardDescription>
                  Update your information and resubmit for verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="specialty">Specialty *</Label>
                    <Input
                      id="specialty"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="e.g., General Dentistry"
                    />
                  </div>
                  <div>
                    <Label htmlFor="licenseNumber">License Number *</Label>
                    <Input
                      id="licenseNumber"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="Your medical license number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="yearsExperience">Years of Experience</Label>
                    <Input
                      id="yearsExperience"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      placeholder="e.g., 5-10 years"
                    />
                  </div>
                  <div>
                    <Label htmlFor="consultationFee">Consultation Fee ($)</Label>
                    <Input
                      id="consultationFee"
                      type="number"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about your background and expertise..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Medical License (PDF)</Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        setMedicalLicense(e.target.files?.[0] || null)
                      }
                    />
                  </div>
                  <div>
                    <Label>Professional ID (PDF)</Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        setProfessionalId(e.target.files?.[0] || null)
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Resubmit Application"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // No verification exists - show application form
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav role={"doctor" as AppRole} />
      <div className="container max-w-4xl py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/doctor-dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Doctor Verification</h1>
          <p className="text-muted-foreground">
            Complete your verification to start accepting patients on the platform.
          </p>
        </div>

        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
              <AlertCircle className="h-5 w-5" />
              Verification Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-600 dark:text-yellow-400">
              You need to complete the verification process before you can accept
              patients. Please fill out the form below and upload your credentials.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Verification Application
            </CardTitle>
            <CardDescription>
              Please provide your professional credentials for verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="specialty">Specialty *</Label>
                <Input
                  id="specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g., General Dentistry, Orthodontics"
                />
              </div>
              <div>
                <Label htmlFor="licenseNumber">License Number *</Label>
                <Input
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Your medical license number"
                />
              </div>
              <div>
                <Label htmlFor="yearsExperience">Years of Experience</Label>
                <Input
                  id="yearsExperience"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  placeholder="e.g., 5-10 years"
                />
              </div>
              <div>
                <Label htmlFor="consultationFee">Consultation Fee ($)</Label>
                <Input
                  id="consultationFee"
                  type="number"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about your background, training, and areas of expertise..."
                  rows={4}
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Required Documents
              </h3>
              <div className="grid gap-4">
                <div>
                  <Label>Medical License (PDF) *</Label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) =>
                      setMedicalLicense(e.target.files?.[0] || null)
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a copy of your valid medical license
                  </p>
                </div>
                <div>
                  <Label>Professional ID (PDF)</Label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) =>
                      setProfessionalId(e.target.files?.[0] || null)
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a copy of your professional identification
                  </p>
                </div>
              </div>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                All documents are securely encrypted and only accessed by our
                verification team. Your information is protected and will not be
                shared with third parties.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !specialty || !licenseNumber}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Submit Verification Application
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
