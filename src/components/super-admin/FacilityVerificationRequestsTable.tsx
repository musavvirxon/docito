// File: src/components/super-admin/FacilityVerificationRequestsTable.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Clock, Download, Eye, FileText, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

type FacilityType = "practice" | "lab" | "imaging" | "pharmacy";
type Status = "submitted" | "in_review" | "approved" | "rejected" | "cancelled" | "all";

function StatusBadge({ status }: { status: string }) {
  const s = String(status || "submitted");
  if (s === "approved") return <Badge className="gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>;
  if (s === "rejected") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
  if (s === "in_review") return <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" />In review</Badge>;
  if (s === "cancelled") return <Badge variant="outline">Cancelled</Badge>;
  return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Submitted</Badge>;
}


function VerificationDocuments({ facilityId, facilityType }: { facilityId: string; facilityType: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      setLoading(true);
      try {
        // Try verification_files table via edge function
        const { data: vfData } = await supabase.functions.invoke("verification-files", {
          body: {
            action: "list",
            entityType: facilityType === "practice" ? "clinic" : facilityType,
            entityId: facilityId,
          },
        });

        if (vfData?.ok && vfData.files?.length > 0) {
          setDocs(vfData.files);
          setLoading(false);
          return;
        }

        // Fallback: list files directly from storage bucket
        const prefix = facilityType === "practice" ? facilityId : `${facilityType}/${facilityId}`;
        const { data: storageFiles } = await supabase.storage
          .from("verification-documents")
          .list(prefix, { limit: 50 });

        if (storageFiles && storageFiles.length > 0) {
          setDocs(storageFiles.map(f => ({
            id: f.id,
            file_name: f.name,
            object_path: `${prefix}/${f.name}`,
            mime_type: f.metadata?.mimetype || null,
            size_bytes: f.metadata?.size || null,
            bucket: "verification-documents",
          })));
        }
      } catch (e) {
        console.error("Failed to fetch verification documents", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, [facilityId, facilityType]);

  const handleDownload = async (doc: any) => {
    setDownloading(doc.id);
    try {
      const path = doc.object_path || doc.file_path;
      const bucket = doc.bucket || "verification-documents";
      const { data, error } = await supabase.storage.from(bucket).download(path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name || path.split("/").pop() || "document";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to download file");
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground py-2">Loading documents...</div>;
  if (docs.length === 0) return <div className="text-sm text-muted-foreground py-2">No documents uploaded</div>;

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{doc.file_name}</div>
              {doc.mime_type && (
                <div className="text-xs text-muted-foreground">{doc.mime_type}</div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload(doc)}
            disabled={downloading === doc.id}
          >
            {downloading === doc.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
export default function FacilityVerificationRequestsTable() {
  const [facilityType, setFacilityType] = useState<FacilityType | "all">("all");
  const [status, setStatus] = useState<Status>("submitted");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [comment, setComment] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("facility-verification-admin", {
        body: {
          action: "list",
          facility_type: facilityType === "all" ? undefined : facilityType,
          status,
          limit: 200,
        },
      });
      if (error) throw error;
      setRows((data as any)?.requests ?? []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load verification requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityType, status]);

  const counts = useMemo(() => {
    const c = { submitted: 0, in_review: 0, approved: 0, rejected: 0 };
    for (const r of rows) {
      const s = r.status;
      if (s in c) (c as any)[s] += 1;
    }
    return c;
  }, [rows]);

  const openReview = (r: any) => {
    setSelected(r);
    setComment(r.comment ?? "");
    setRejectionReason(r.rejection_reason ?? "");
    setOpen(true);
  };

  const setStatusAction = async (newStatus: "in_review" | "approved" | "rejected" | "cancelled") => {
    if (!selected) return;
    try {
      const { data, error } = await supabase.functions.invoke("facility-verification-admin", {
        body: {
          action: "set_status",
          request_id: selected.id,
          status: newStatus,
          comment: comment || undefined,
          rejection_reason: newStatus === "rejected" ? (rejectionReason || "Rejected") : undefined,
        },
      });
      if (error) throw error;

      toast.success(`Updated: ${newStatus}`);
      setOpen(false);
      await fetchRows();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update request");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Facility Verification Requests</CardTitle>
          <div className="flex flex-col md:flex-row gap-3">
            <Select value={facilityType} onValueChange={(v) => setFacilityType(v as any)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Facility type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All facilities</SelectItem>
                <SelectItem value="practice">Clinics</SelectItem>
                <SelectItem value="pharmacy">Pharmacies</SelectItem>
                <SelectItem value="lab">Labs</SelectItem>
                <SelectItem value="imaging">Imaging</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Submitted ({counts.submitted})</SelectItem>
                <SelectItem value="in_review">In review ({counts.in_review})</SelectItem>
                <SelectItem value="approved">Approved ({counts.approved})</SelectItem>
                <SelectItem value="rejected">Rejected ({counts.rejected})</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchRows} disabled={loading}>
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No requests found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.facility_name ?? r.facility_id}</TableCell>
                    <TableCell className="capitalize">{r.facility_type}</TableCell>
                    <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openReview(r)}>
                        <Eye className="h-4 w-4 mr-2" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Request</DialogTitle>
            <DialogDescription>Approve or reject this facility verification request.</DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Facility</div>
                  <div className="font-medium">{selected.facility_name ?? selected.facility_id}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Type</div>
                  <div className="font-medium capitalize">{selected.facility_type}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-medium"><StatusBadge status={selected.status} /></div>
                </div>
                <div>
                  <div className="text-muted-foreground">Submitted</div>
                  <div className="font-medium">{selected.created_at ? new Date(selected.created_at).toLocaleString() : "—"}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Payload (draft snapshot)</div>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
{JSON.stringify(selected.payload ?? {}, null, 2)}
                </pre>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-medium">Verification Documents</div>
                <VerificationDocuments facilityId={selected.facility_id} facilityType={selected.facility_type} />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-medium">Admin comment (optional)</div>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Internal reviewer note" />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Rejection reason (required to reject)</div>
                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason shown to facility" />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="secondary" onClick={() => setStatusAction("in_review")}>
                  Mark In Review
                </Button>
                <Button onClick={() => setStatusAction("approved")}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!rejectionReason.trim()) {
                      toast.error("Rejection reason required");
                      return;
                    }
                    setStatusAction("rejected");
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button variant="outline" onClick={() => setStatusAction("cancelled")}>
                  Cancel Request
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
