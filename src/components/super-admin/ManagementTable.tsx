import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Ban, Trash2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ManagementTableProps {
  title: string;
  type: "doctors" | "practices" | "patients" | "appointments" | "payments";
}

const ManagementTable = ({ title, type }: ManagementTableProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchData();
  }, [type]);

  const fetchDoctorVerification = async (doctorId: string) => {
    try {
      const { data: verificationData, error: verificationError } = await (supabase as any)
        .from("doctor_verification")
        .select("*")
        .eq("doctor_id", doctorId)
        .maybeSingle();

      if (verificationError) throw verificationError;
      setVerification(verificationData);

      if (verificationData?.id) {
        const { data: docsData, error: docsError } = await (supabase as any)
          .from("doctor_verification_documents")
          .select("*")
          .eq("doctor_verification_id", verificationData.id)
          .order("uploaded_at", { ascending: false });

        if (docsError) throw docsError;
        
        // Keep only the latest document per type
        const latestDocs = docsData?.reduce((acc: any[], doc: any) => {
          const existingDoc = acc.find((d: any) => d.document_type === doc.document_type);
          if (!existingDoc) {
            acc.push(doc);
          }
          return acc;
        }, []);
        
        setDocuments(latestDocs || []);
      }
    } catch (error) {
      console.error("Error fetching verification:", error);
      toast.error("Failed to load verification details");
    }
  };

  const handleViewDoctorVerification = async (doctor: any) => {
    setSelectedDoctor(doctor);
    await fetchDoctorVerification(doctor.id);
    setViewModalOpen(true);
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      // Extract the actual file path if it's a full URL
      let cleanPath = filePath;
      
      // Check if it's a full URL containing the storage path
      if (filePath.includes('verification-documents/')) {
        // Extract everything after 'verification-documents/'
        const match = filePath.match(/verification-documents\/(.+?)(?:\?|$)/);
        if (match && match[1]) {
          cleanPath = match[1];
        }
      }
      
      // Clean any remaining leading slashes
      cleanPath = cleanPath.replace(/^\/+/, '');
      
      // Extract file extension from the path
      const pathParts = cleanPath.split('/');
      const actualFileName = pathParts[pathParts.length - 1];
      const extension = actualFileName.includes('.') ? actualFileName.split('.').pop() : 'pdf';
      
      const { data, error } = await supabase.storage
        .from("verification-documents")
        .download(cleanPath);

      if (error) {
        console.error("Storage download error:", error);
        throw error;
      }

      // Create download with correct extension
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.includes('.') ? fileName : `${fileName}.${extension}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Document downloaded successfully");
    } catch (error: any) {
      console.error("Error downloading document:", error);
      toast.error(error.message || "Failed to download document");
    }
  };

  const viewDocument = async (filePath: string) => {
    try {
      // Extract the actual file path if it's a full URL
      let cleanPath = filePath;
      
      // Check if it's a full URL containing the storage path
      if (filePath.includes('verification-documents/')) {
        // Extract everything after 'verification-documents/'
        const match = filePath.match(/verification-documents\/(.+?)(?:\?|$)/);
        if (match && match[1]) {
          cleanPath = match[1];
        }
      }
      
      // Clean any remaining leading slashes
      cleanPath = cleanPath.replace(/^\/+/, '');
      
      const { data, error } = await supabase.storage
        .from("verification-documents")
        .createSignedUrl(cleanPath, 3600);

      if (error) {
        console.error("Storage signed URL error:", error);
        throw error;
      }

      if (!data.signedUrl) {
        throw new Error("No signed URL returned");
      }

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error("Error viewing document:", error);
      toast.error(error.message || "Failed to view document");
    }
  };

  const handleApproveDoctor = async (doctorId: string) => {
    try {
      // Update doctor as verified
      const { error: doctorError } = await supabase
        .from("doctors")
        .update({ verified: true })
        .eq("id", doctorId);

      if (doctorError) throw doctorError;

      // Update verification status
      const { error: verificationError } = await (supabase as any)
        .from("doctor_verification")
        .update({ 
          status: "verified",
          reviewed_at: new Date().toISOString()
        })
        .eq("doctor_id", doctorId);

      if (verificationError) throw verificationError;

      toast.success("Doctor approved successfully");
      fetchData();
    } catch (error: any) {
      console.error("Error approving doctor:", error);
      toast.error(error.message || "Failed to approve doctor");
    }
  };

  const handleRejectDoctor = async (doctorId: string) => {
    try {
      // Update verification status to declined
      const { error: verificationError } = await (supabase as any)
        .from("doctor_verification")
        .update({ 
          status: "declined",
          reviewed_at: new Date().toISOString()
        })
        .eq("doctor_id", doctorId);

      if (verificationError) throw verificationError;

      toast.success("Doctor application rejected");
      fetchData();
    } catch (error: any) {
      console.error("Error rejecting doctor:", error);
      toast.error(error.message || "Failed to reject doctor");
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!confirm("Are you sure you want to permanently delete this doctor? This action cannot be undone.")) {
      return;
    }

    try {
      // First get verification ID if exists
      const { data: verification } = await (supabase as any)
        .from("doctor_verification")
        .select("id")
        .eq("doctor_id", doctorId)
        .maybeSingle();

      // Delete verification documents from storage and DB if they exist
      if (verification?.id) {
        const { data: docs } = await (supabase as any)
          .from("doctor_verification_documents")
          .select("file_path")
          .eq("doctor_verification_id", verification.id);

        if (docs && docs.length > 0) {
          const filePaths = docs.map((doc: any) => doc.file_path.replace(/^\/+/, ''));
          await supabase.storage
            .from("verification-documents")
            .remove(filePaths);

          await (supabase as any)
            .from("doctor_verification_documents")
            .delete()
            .eq("doctor_verification_id", verification.id);
        }

        // Delete verification record
        await (supabase as any)
          .from("doctor_verification")
          .delete()
          .eq("id", verification.id);
      }

      // Delete doctor record
      const { error: doctorError } = await supabase
        .from("doctors")
        .delete()
        .eq("id", doctorId);

      if (doctorError) throw doctorError;

      toast.success("Doctor deleted permanently");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting doctor:", error);
      toast.error(error.message || "Failed to delete doctor");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let query;
      
      switch (type) {
        case "doctors":
          query = supabase
            .from("doctors")
            .select("*, profiles!inner(full_name, email)")
            .limit(10);
          break;
        case "practices":
          query = supabase
            .from("practices")
            .select("*")
            .limit(10);
          break;
        case "patients":
          query = supabase
            .from("profiles")
            .select("*")
            .eq("role", "patient")
            .limit(10);
          break;
        case "appointments":
          query = supabase
            .from("appointments")
            .select("*, doctors(id), profiles!appointments_patient_id_fkey(full_name)")
            .order("appointment_date", { ascending: false })
            .limit(10);
          break;
        case "payments":
          query = supabase
            .from("payments")
            .select("*, profiles!payments_patient_id_fkey(full_name)")
            .order("created_at", { ascending: false })
            .limit(10);
          break;
      }

      const { data: result, error } = await query;
      if (error) throw error;
      setData(result || []);

      // Fetch verification statuses for doctors
      if (type === "doctors" && result && result.length > 0) {
        const doctorIds = result.map((d: any) => d.id);
        const { data: verifications, error: verError } = await (supabase as any)
          .from("doctor_verification")
          .select("doctor_id, status")
          .in("doctor_id", doctorIds);

        if (!verError && verifications) {
          const statusMap: Record<string, any> = {};
          verifications.forEach((v: any) => {
            statusMap[v.doctor_id] = v;
          });
          setVerificationStatuses(statusMap);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const renderTableHeaders = () => {
    switch (type) {
      case "doctors":
        return (
          <>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Specialty</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        );
      case "practices":
        return (
          <>
            <TableHead>Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        );
      case "patients":
        return (
          <>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        );
      case "appointments":
        return (
          <>
            <TableHead>Patient</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        );
      case "payments":
        return (
          <>
            <TableHead>Patient</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        );
    }
  };

  const renderTableRows = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
            Loading...
          </TableCell>
        </TableRow>
      );
    }

    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
            No data available
          </TableCell>
        </TableRow>
      );
    }

    return data.map((item, index) => {
      switch (type) {
        case "doctors":
          return (
            <TableRow key={item.id} className="hover:bg-accent/5">
              <TableCell className="font-medium">{item.profiles?.full_name || "N/A"}</TableCell>
              <TableCell>{item.profiles?.email || "N/A"}</TableCell>
              <TableCell>{item.specialty}</TableCell>
              <TableCell>{item.average_rating?.toFixed(1) || "0.0"} ⭐</TableCell>
              <TableCell>
                {(() => {
                  const verificationStatus = verificationStatuses[item.id];
                  if (!verificationStatus) {
                    return <Badge variant="secondary">Not Submitted</Badge>;
                  }
                  
                  switch (verificationStatus.status) {
                    case "verified":
                      return <Badge variant="default">Verified</Badge>;
                    case "pending":
                      return <Badge variant="secondary">Pending Review</Badge>;
                    case "declined":
                      return <Badge variant="destructive">Declined</Badge>;
                    case "resubmitted":
                      return <Badge variant="outline">Resubmitted</Badge>;
                    case "under_review":
                      return <Badge variant="secondary">Under Review</Badge>;
                    default:
                      return <Badge variant="secondary">{verificationStatus.status}</Badge>;
                  }
                })()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleApproveDoctor(item.id)}
                    disabled={item.verified || !verificationStatuses[item.id]}
                    title="Approve & Make Public"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleViewDoctorVerification(item)}
                    title="View Verification Details"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRejectDoctor(item.id)}
                    disabled={!verificationStatuses[item.id] || verificationStatuses[item.id]?.status === "declined"}
                    title="Reject Application"
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteDoctor(item.id)}
                    title="Delete Permanently"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        case "practices":
          return (
            <TableRow key={item.id} className="hover:bg-accent/5">
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.city || "N/A"}</TableCell>
              <TableCell>{item.practice_type}</TableCell>
              <TableCell>{item.average_rating?.toFixed(1) || "0.0"} ⭐</TableCell>
              <TableCell>
                <Badge variant={item.verified ? "default" : "secondary"}>
                  {item.verification_status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon"><Ban className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        case "patients":
          return (
            <TableRow key={item.id} className="hover:bg-accent/5">
              <TableCell className="font-medium">{item.full_name}</TableCell>
              <TableCell>{item.email}</TableCell>
              <TableCell>{item.phone || "N/A"}</TableCell>
              <TableCell>
                <Badge variant={item.is_verified ? "default" : "secondary"}>
                  {item.is_verified ? "Verified" : "Unverified"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon"><Ban className="w-4 h-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        case "appointments":
          return (
            <TableRow key={item.id} className="hover:bg-accent/5">
              <TableCell className="font-medium">{item.profiles?.full_name || "N/A"}</TableCell>
              <TableCell>{new Date(item.appointment_date).toLocaleDateString()}</TableCell>
              <TableCell>{item.start_time}</TableCell>
              <TableCell>
                <Badge variant={item.status === "confirmed" ? "default" : "secondary"}>
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        case "payments":
          return (
            <TableRow key={item.id} className="hover:bg-accent/5">
              <TableCell className="font-medium">{item.profiles?.full_name || "N/A"}</TableCell>
              <TableCell>${Number(item.amount).toFixed(2)}</TableCell>
              <TableCell>{item.payment_method || "N/A"}</TableCell>
              <TableCell>
                <Badge variant={item.status === "completed" ? "default" : "secondary"}>
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
      }
    });
  };

  return (
    <>
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border-2 border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {renderTableHeaders()}
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderTableRows()}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Doctor Verification Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Doctor Verification Details</DialogTitle>
            <DialogDescription>
              View doctor verification information and uploaded documents
            </DialogDescription>
          </DialogHeader>

          {selectedDoctor && (
            <div className="space-y-6">
              {/* Doctor Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Doctor Information</h3>
                
                {/* Profile Photo */}
                {selectedDoctor.profiles?.avatar_url && (
                  <div className="mb-4 flex justify-center">
                    <img 
                      src={selectedDoctor.profiles.avatar_url} 
                      alt="Doctor profile" 
                      className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Full Name</p>
                    <p className="font-medium">{selectedDoctor.profiles?.full_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedDoctor.profiles?.email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedDoctor.profiles?.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Gender</p>
                    <p className="font-medium capitalize">{selectedDoctor.profiles?.gender || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Specialty</p>
                    <p className="font-medium">{selectedDoctor.specialty}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">License Number</p>
                    <p className="font-medium">{selectedDoctor.license_number || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Consultation Fee</p>
                    <p className="font-medium">${selectedDoctor.consultation_fee || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Verification Status</p>
                    <Badge variant={
                      verification?.status === "verified" ? "default" : 
                      verification?.status === "declined" ? "destructive" :
                      verification?.status === "resubmitted" ? "secondary" :
                      "secondary"
                    }>
                      {verification?.status === "verified" ? "Verified" :
                       verification?.status === "declined" ? "Declined" :
                       verification?.status === "resubmitted" ? "Resubmitted" :
                       verification?.status === "under_review" ? "Under Review" :
                       "Pending"}
                    </Badge>
                  </div>
                  {selectedDoctor.bio && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Bio</p>
                      <p className="font-medium text-sm">{selectedDoctor.bio}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Submission */}
              {verification && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Verification Submission</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge>{verification.status}</Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Submitted At</p>
                        <p className="font-medium">
                          {verification.submitted_at ? new Date(verification.submitted_at).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Years of Experience</p>
                        <p className="font-medium">{verification.years_of_experience || "N/A"}</p>
                      </div>
                      {verification.reviewed_at && (
                        <div>
                          <p className="text-muted-foreground">Reviewed At</p>
                          <p className="font-medium">
                            {new Date(verification.reviewed_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Information from verification_data */}
                  {verification.verification_data && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {verification.verification_data.additional_info?.first_name && (
                          <div>
                            <p className="text-muted-foreground">First Name</p>
                            <p className="font-medium">{verification.verification_data.additional_info.first_name}</p>
                          </div>
                        )}
                        {verification.verification_data.additional_info?.last_name && (
                          <div>
                            <p className="text-muted-foreground">Last Name</p>
                            <p className="font-medium">{verification.verification_data.additional_info.last_name}</p>
                          </div>
                        )}
                        {verification.verification_data.additional_info?.gender && (
                          <div>
                            <p className="text-muted-foreground">Gender</p>
                            <p className="font-medium capitalize">{verification.verification_data.additional_info.gender}</p>
                          </div>
                        )}
                        {verification.verification_data.additional_info?.phone && (
                          <div>
                            <p className="text-muted-foreground">Phone</p>
                            <p className="font-medium">{verification.verification_data.additional_info.phone}</p>
                          </div>
                        )}
                        {verification.verification_data.additional_info?.degrees && (
                          <div>
                            <p className="text-muted-foreground">Degrees</p>
                            <p className="font-medium">{verification.verification_data.additional_info.degrees}</p>
                          </div>
                        )}
                        {verification.verification_data.additional_info?.country && (
                          <div>
                            <p className="text-muted-foreground">Country</p>
                            <p className="font-medium capitalize">{verification.verification_data.additional_info.country}</p>
                          </div>
                        )}
                        {verification.verification_data.additional_info?.region && (
                          <div>
                            <p className="text-muted-foreground">Region/State</p>
                            <p className="font-medium capitalize">{verification.verification_data.additional_info.region}</p>
                          </div>
                        )}
                        {verification.verification_data.additional_info?.avatar_uploaded !== undefined && (
                          <div>
                            <p className="text-muted-foreground">Profile Photo</p>
                            <p className="font-medium">
                              {verification.verification_data.additional_info.avatar_uploaded ? "✓ Uploaded" : "Not uploaded"}
                            </p>
                          </div>
                        )}
                        {verification.verification_data.languages && verification.verification_data.languages.length > 0 && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Languages</p>
                            <p className="font-medium">{verification.verification_data.languages.join(", ")}</p>
                          </div>
                        )}
                        {verification.verification_data.consultation_types && verification.verification_data.consultation_types.length > 0 && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Consultation Types</p>
                            <p className="font-medium">{verification.verification_data.consultation_types.join(", ")}</p>
                          </div>
                        )}
                        {verification.verification_data.additional_info?.practice_association && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Practice Association</p>
                            <p className="font-medium">{verification.verification_data.additional_info.practice_association}</p>
                          </div>
                        )}
                        {verification.verification_data.additional_info?.selected_clinic && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Selected Clinic</p>
                            <p className="font-medium">{verification.verification_data.additional_info.selected_clinic}</p>
                          </div>
                        )}
                        {verification.verification_data.additional_info?.all_specialties && 
                         verification.verification_data.additional_info.all_specialties.length > 0 && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground mb-2">All Specialties ({verification.verification_data.additional_info.all_specialties.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {verification.verification_data.additional_info.all_specialties.map((spec: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Uploaded Documents */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Uploaded Documents ({documents.length})</h3>
                <div className="space-y-2">
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents uploaded</p>
                  ) : (
                    documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">
                              {doc.document_type.replace(/_/g, " ").toUpperCase()}
                            </p>
                            <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewDocument(doc.file_path)}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadDocument(doc.file_path, doc.file_name)}
                          >
                            Download
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManagementTable;
