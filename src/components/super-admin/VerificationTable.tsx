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
import { Eye, CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface VerificationTableProps {
  title: string;
  status?: "pending" | "under_review" | "verified" | "rejected" | "all";
}

const VerificationTable = ({ title, status = "all" }: VerificationTableProps) => {
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
        .from("practice_verification" as any)
        .select(`
          *,
          practices!inner(name, email, phone)
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
      console.error("Error fetching verifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (verificationId: string) => {
    try {
      const { data, error } = await supabase
        .from("verification_documents" as any)
        .select("*")
        .eq("verification_id", verificationId);

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

  const handleUpdateStatus = async (verificationId: string, newStatus: string, practiceId: string) => {
    try {
      // Update verification status
      const { error: verificationError } = await supabase
        .from("practice_verification" as any)
        .update({ status: newStatus })
        .eq("id", verificationId);

      if (verificationError) throw verificationError;

      // Update practice verification status
      const { error: practiceError } = await supabase
        .from("practices")
        .update({ 
          verification_status: newStatus,
          verified: newStatus === "verified"
        })
        .eq("id", practiceId);

      if (practiceError) throw practiceError;

      toast.success(`Verification ${newStatus}`);
      fetchData();
      setViewModalOpen(false);
    } catch (error: any) {
      console.error("Error updating verification:", error);
      toast.error("Failed to update verification status");
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
                <TableHead>Practice Name</TableHead>
                <TableHead>Business Type</TableHead>
                <TableHead>Location</TableHead>
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
                    No verification submissions found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.business_name || item.practices?.name}</TableCell>
                    <TableCell>{item.business_type || "N/A"}</TableCell>
                    <TableCell>{item.city}, {item.state}</TableCell>
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
            <DialogTitle>Verification Details</DialogTitle>
            <DialogDescription>
              Review practice verification information and documents
            </DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-6">
              {/* Business Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Business Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Business Name</p>
                    <p className="font-medium">{selectedVerification.business_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Business Type</p>
                    <p className="font-medium">{selectedVerification.business_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedVerification.business_email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedVerification.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium">{selectedVerification.full_address}</p>
                    <p className="font-medium">
                      {selectedVerification.city}, {selectedVerification.state} {selectedVerification.zip_code}
                    </p>
                  </div>
                </div>
              </div>

              {/* Specialties & Services */}
              {(selectedVerification.specialties?.length > 0 || selectedVerification.services_offered?.length > 0) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Specialties & Services</h3>
                  {selectedVerification.specialties?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-muted-foreground mb-2">Specialties</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedVerification.specialties.map((spec: string, idx: number) => (
                          <Badge key={idx} variant="secondary">{spec}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedVerification.services_offered?.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Services</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedVerification.services_offered.map((service: string, idx: number) => (
                          <Badge key={idx} variant="outline">{service}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                  onClick={() => handleUpdateStatus(selectedVerification.id, "verified", selectedVerification.practice_id)}
                  className="flex-1"
                  variant="default"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Verification
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedVerification.id, "rejected", selectedVerification.practice_id)}
                  className="flex-1"
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VerificationTable;
