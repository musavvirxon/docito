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
import { Eye, CheckCircle, XCircle, Clock } from "lucide-react";
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
  const [viewModalOpen, setViewModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Query practices table directly using verification_status column
      let query = supabase
        .from("practices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (status !== "all") {
        query = query.eq("verification_status", status);
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

  const handleView = (practice: any) => {
    setSelectedVerification(practice);
    setViewModalOpen(true);
  };

  const handleUpdateStatus = async (practiceId: string, newStatus: string) => {
    try {
      // Update practice verification status directly
      const { error: practiceError } = await supabase
        .from("practices")
        .update({ 
          verification_status: newStatus,
          verified: newStatus === "verified"
        })
        .eq("id", practiceId);

      if (practiceError) throw practiceError;

      toast.success(`Practice ${newStatus === "verified" ? "approved" : newStatus}`);
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
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.practice_type || "N/A"}</TableCell>
                    <TableCell>{item.city || "N/A"}, {item.state || ""}</TableCell>
                    <TableCell>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.verification_status || "pending")}</TableCell>
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
                    <p className="text-muted-foreground">Practice Name</p>
                    <p className="font-medium">{selectedVerification.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Practice Type</p>
                    <p className="font-medium">{selectedVerification.practice_type || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedVerification.email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedVerification.phone || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium">{selectedVerification.address || "N/A"}</p>
                    <p className="font-medium">
                      {selectedVerification.city || ""}{selectedVerification.city && selectedVerification.state ? ", " : ""}{selectedVerification.state || ""} {selectedVerification.postal_code || ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Specialties */}
              {selectedVerification.specialties?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedVerification.specialties.map((spec: string, idx: number) => (
                      <Badge key={idx} variant="secondary">{spec}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Website</p>
                    <p className="font-medium">{selectedVerification.website || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Verified Status</p>
                    <p className="font-medium">{selectedVerification.verified ? "Verified" : "Not Verified"}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleUpdateStatus(selectedVerification.id, "verified")}
                  className="flex-1"
                  variant="default"
                  disabled={selectedVerification.verification_status === "verified"}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedVerification.id, "rejected")}
                  className="flex-1"
                  variant="destructive"
                  disabled={selectedVerification.verification_status === "rejected"}
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
