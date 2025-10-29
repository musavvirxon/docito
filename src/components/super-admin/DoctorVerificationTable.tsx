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
import { Eye, CheckCircle, XCircle, Clock, FileText, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface DoctorVerificationTableProps {
  title: string;
  status?: "pending" | "under_review" | "verified" | "rejected" | "all";
}

const DoctorVerificationTable = ({ title, status = "all" }: DoctorVerificationTableProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("doctor_verification" as any)
        .select(`
          *,
          doctors!inner(
            id,
            specialty,
            user_id,
            profiles!doctors_user_id_fkey(full_name, email, phone)
          )
        `)
        .order("submitted_at", { ascending: false })
        .limit(50);

      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data: result, error } = await query;
      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error("Error fetching doctor verifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (verificationId: string) => {
    try {
      const { data, error } = await supabase
        .from("doctor_verification_documents" as any)
        .select("*")
        .eq("doctor_verification_id", verificationId);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const handleView = async (verification: any) => {
    setSelectedVerification(verification);
    await fetchDocuments(verification.id);
    setViewModalOpen(true);
  };

  const handleUpdateStatus = async (verificationId: string, newStatus: string, doctorId: string) => {
    try {
      // Update verification status
      const { error: verificationError } = await supabase
        .from("doctor_verification" as any)
        .update({ 
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("id", verificationId);

      if (verificationError) throw verificationError;

      // Update doctor verified status
      const { error: doctorError } = await supabase
        .from("doctors")
        .update({ verified: newStatus === "verified" })
        .eq("id", doctorId);

      if (doctorError) throw doctorError;

      toast.success(`Doctor verification ${newStatus}`);
      fetchData();
      setViewModalOpen(false);
    } catch (error: any) {
      console.error("Error updating verification:", error);
      toast.error("Failed to update verification status");
    }
  };

  const handleDelete = async (verificationId: string, doctorId: string) => {
    if (!confirm("Are you sure you want to delete this verification request? This action cannot be undone.")) {
      return;
    }

    try {
      // Delete the verification (documents will be cascade deleted)
      const { error: deleteError } = await supabase
        .from("doctor_verification" as any)
        .delete()
        .eq("id", verificationId);

      if (deleteError) throw deleteError;

      // Optionally delete the doctor profile as well
      if (confirm("Do you also want to delete the doctor profile?")) {
        const { error: doctorError } = await supabase
          .from("doctors")
          .delete()
          .eq("id", doctorId);

        if (doctorError) throw doctorError;
      }

      toast.success("Verification deleted successfully");
      fetchData();
      setViewModalOpen(false);
    } catch (error: any) {
      console.error("Error deleting verification:", error);
      toast.error("Failed to delete verification");
    }
  };

  const getStatusBadge = (status: string) => {
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

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("verification-documents")
        .download(filePath);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor Name</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>License Number</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No doctor verification submissions found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.full_name || item.doctors?.profiles?.full_name}
                    </TableCell>
                    <TableCell>{item.specialty || item.doctors?.specialty}</TableCell>
                    <TableCell>{item.license_number || "N/A"}</TableCell>
                    <TableCell>
                      {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(item)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Details Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Doctor Verification Details</DialogTitle>
            <DialogDescription>
              Review doctor verification information and documents
            </DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-6">
              {/* Doctor Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Doctor Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Full Name</p>
                    <p className="font-medium">{selectedVerification.full_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Specialty</p>
                    <p className="font-medium">{selectedVerification.specialty}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedVerification.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedVerification.phone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">License Number</p>
                    <p className="font-medium">{selectedVerification.license_number || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Years of Experience</p>
                    <p className="font-medium">{selectedVerification.years_of_experience || "N/A"}</p>
                  </div>
                  {selectedVerification.medical_school && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Medical School</p>
                      <p className="font-medium">
                        {selectedVerification.medical_school}
                        {selectedVerification.graduation_year && ` (${selectedVerification.graduation_year})`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadDocument(doc.file_path, doc.file_name)}
                        >
                          Download
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleUpdateStatus(selectedVerification.id, "verified", selectedVerification.doctor_id)}
                  className="flex-1"
                  variant="default"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Verification
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedVerification.id, "rejected", selectedVerification.doctor_id)}
                  className="flex-1"
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleDelete(selectedVerification.id, selectedVerification.doctor_id)}
                  variant="outline"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DoctorVerificationTable;
