// src/components/super-admin/DoctorVerificationTable.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader as UIDialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Trash2,
  RefreshCcw,
  Download,
  Image as ImageIcon,
  FileIcon,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface DoctorVerificationTableProps {
  title: string;
  status?: "pending" | "under_review" | "verified" | "declined" | "resubmitted" | "all";
}

type VerificationRow = {
  id: string;
  doctor_id: string;
  status: string;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  rejection_reason?: string | null;
  specialty?: string | null;
  license_number?: string | null;
  years_of_experience?: string | null;
  verification_data?: any;
  doctors?: {
    id: string;
    specialty: string | null;
    user_id: string | null;
    verified: boolean | null;
    license_number?: string | null;
    bio?: string | null;
  } | null;
  profile?: {
    user_id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

type DocRow = {
  id: string;
  doctor_verification_id: string;
  document_type: string;
  file_path: string;
  file_name: string;
  uploaded_at?: string | null;
  signedUrl?: string | null;
  mimeType?: string | null;
};

type FilePreview = {
  doc: DocRow;
  url: string;
  mimeType: string;
  loading: boolean;
  error?: string;
};

function normalizeStatus(s: string | null | undefined) {
  const v = String(s || "pending").toLowerCase();
  if (v === "rejected") return "declined";
  if (v === "denied") return "declined";
  if (v === "approved") return "verified";
  if (v === "submitted") return "pending";
  return v;
}

function safeDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

function extractStoragePath(filePath: string) {
  let cleanPath = filePath || "";
  if (cleanPath.includes("verification-documents/")) {
    const match = cleanPath.match(/verification-documents\/(.+?)(?:\?|$)/);
    if (match?.[1]) cleanPath = match[1];
  }
  cleanPath = cleanPath.replace(/^\/+/, "");
  return cleanPath;
}

function getStatusBadge(statusRaw: string) {
  const status = normalizeStatus(statusRaw);

  const variants: Record<
    string,
    { label: string; className: string; icon: JSX.Element }
  > = {
    pending: {
      label: "Pending",
      className: "bg-yellow-100 text-yellow-800",
      icon: <Clock className="w-3 h-3 mr-1" />,
    },
    resubmitted: {
      label: "Resubmitted",
      className: "bg-purple-100 text-purple-800",
      icon: <Clock className="w-3 h-3 mr-1" />,
    },
    under_review: {
      label: "Under review",
      className: "bg-blue-100 text-blue-800",
      icon: <Clock className="w-3 h-3 mr-1" />,
    },
    verified: {
      label: "Verified",
      className: "bg-green-100 text-green-800",
      icon: <CheckCircle className="w-3 h-3 mr-1" />,
    },
    declined: {
      label: "Declined",
      className: "bg-red-100 text-red-800",
      icon: <XCircle className="w-3 h-3 mr-1" />,
    },
  };

  const v = variants[status] || variants.pending;

  return (
    <Badge className={v.className}>
      {v.icon}
      {v.label}
    </Badge>
  );
}

async function invokeSuperadmin<T = any>(body: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("superadmin", { body });
  if (error) {
    const msg = (error as any)?.context?.message || (error as any)?.message || "Request failed";
    throw new Error(msg);
  }
  return data as T;
}

export default function DoctorVerificationTable({
  title,
  status = "all",
}: DoctorVerificationTableProps) {
  const [data, setData] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<VerificationRow | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [viewOpen, setViewOpen] = useState(false);

  // File preview state
  const [previewDoc, setPreviewDoc] = useState<FilePreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [rejectionReason, setRejectionReason] = useState("");
  const [search, setSearch] = useState("");

  const effectiveFilter = useMemo(() => normalizeStatus(status), [status]);

  useEffect(() => {
    fetchData().catch((e) => {
      console.error(e);
      toast.error("Failed to load doctor verifications");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("doctor_verification")
        .select(
          `
          *,
          doctors(
            id,
            specialty,
            user_id,
            verified,
            license_number,
            bio
          )
        `
        )
        .order("submitted_at", { ascending: false })
        .limit(100);

      if (effectiveFilter !== "all") {
        if (effectiveFilter === "pending") {
          query = query.in("status", ["pending", "resubmitted", "submitted"] as any);
        } else if (effectiveFilter === "declined") {
          query = query.in("status", ["declined", "rejected", "denied"] as any);
        } else if (effectiveFilter === "verified") {
          query = query.in("status", ["verified", "approved"] as any);
        } else {
          query = query.eq("status", effectiveFilter as any);
        }
      }

      const { data: result, error } = await query;
      if (error) throw error;

      const rows = (result || []) as any[];

      if (!rows.length) {
        setData([]);
        return;
      }

      const userIds = rows
        .map((r) => r?.doctors?.user_id)
        .filter(Boolean) as string[];

      let profiles: any[] = [];
      if (userIds.length) {
        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, phone")
          .in("user_id", userIds);

        if (pErr) throw pErr;
        profiles = (p || []) as any[];
      }

      const enriched: VerificationRow[] = rows.map((r) => ({
        ...(r as any),
        profile: profiles.find((p) => p.user_id === r?.doctors?.user_id) || null,
      }));

      setData(enriched);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (verificationId: string) => {
    const { data, error } = await supabase
      .from("doctor_verification_documents")
      .select("*")
      .eq("doctor_verification_id", verificationId)
      .order("uploaded_at", { ascending: false });

    if (error) throw error;

    const rawData = (data || []) as unknown as DocRow[];
    const latest = rawData.reduce((acc: DocRow[], doc: DocRow) => {
      const exists = acc.find((d) => d.document_type === doc.document_type);
      if (!exists) acc.push(doc);
      return acc;
    }, []);

    setDocs(latest);
  };

  const handleView = async (row: VerificationRow) => {
    setSelected(row);
    setRejectionReason(row.rejection_reason || "");
    try {
      await fetchDocuments(row.id);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load documents");
      setDocs([]);
    }
    setViewOpen(true);
  };

  // Determine mime type from file extension
  const getMimeType = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      bmp: "image/bmp",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      txt: "text/plain",
    };
    return mimeTypes[ext] || "application/octet-stream";
  };

  const isImageType = (mimeType: string) => mimeType.startsWith("image/");
  const isPdfType = (mimeType: string) => mimeType === "application/pdf";

  const openFilePreview = async (doc: DocRow) => {
    setPreviewDoc({ doc, url: "", mimeType: "", loading: true });
    setPreviewOpen(true);

    try {
      const clean = extractStoragePath(doc.file_path);
      const { data, error } = await supabase.storage
        .from("verification-documents")
        .createSignedUrl(clean, 60 * 60);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("No signed URL returned");

      const mimeType = getMimeType(doc.file_name);
      setPreviewDoc({ doc, url: data.signedUrl, mimeType, loading: false });
    } catch (e: any) {
      console.error(e);
      setPreviewDoc((prev) =>
        prev ? { ...prev, loading: false, error: e?.message || "Failed to load file" } : null
      );
    }
  };

  const viewDocument = async (filePath: string) => {
    try {
      const clean = extractStoragePath(filePath);
      const { data, error } = await supabase.storage
        .from("verification-documents")
        .createSignedUrl(clean, 60 * 60);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("No signed URL returned");

      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to view document");
    }
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      const clean = extractStoragePath(filePath);
      const { data, error } = await supabase.storage
        .from("verification-documents")
        .download(clean);

      if (error) throw error;

      const ext = (clean.split("/").pop() || "").split(".").pop() || "pdf";
      const finalName = fileName.includes(".") ? fileName : `${fileName}.${ext}`;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = finalName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to download document");
    }
  };

  // Render file preview content
  const renderFilePreview = () => {
    if (!previewDoc) return null;

    if (previewDoc.loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading file...</span>
        </div>
      );
    }

    if (previewDoc.error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-destructive">
          <XCircle className="w-12 h-12 mb-2" />
          <p>{previewDoc.error}</p>
          <Button variant="outline" className="mt-4" onClick={() => viewDocument(previewDoc.doc.file_path)}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in new tab
          </Button>
        </div>
      );
    }

    if (isImageType(previewDoc.mimeType)) {
      return (
        <div className="flex flex-col items-center justify-center p-4">
          <img
            src={previewDoc.url}
            alt={previewDoc.doc.file_name}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
          />
        </div>
      );
    }

    if (isPdfType(previewDoc.mimeType)) {
      return (
        <iframe
          src={previewDoc.url}
          className="w-full h-[70vh] rounded-lg border"
          title={previewDoc.doc.file_name}
        />
      );
    }

    // For other file types, show download prompt
    return (
      <div className="flex flex-col items-center justify-center h-96 p-6">
        <FileIcon className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">{previewDoc.doc.file_name}</p>
        <p className="text-sm text-muted-foreground mb-4">
          This file type ({previewDoc.mimeType}) cannot be previewed directly.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => viewDocument(previewDoc.doc.file_path)}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in new tab
          </Button>
          <Button variant="secondary" onClick={() => downloadDocument(previewDoc.doc.file_path, previewDoc.doc.file_name)}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    );
  };

  // Get file icon based on mime type
  const getFileIcon = (fileName: string) => {
    const mimeType = getMimeType(fileName);
    if (isImageType(mimeType)) return <ImageIcon className="w-4 h-4" />;
    if (isPdfType(mimeType)) return <FileText className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  const handleUpdateStatus = async (
    verificationId: string,
    doctorId: string,
    newStatusRaw: "pending" | "under_review" | "verified" | "declined" | "resubmitted"
  ) => {
    const newStatus = normalizeStatus(newStatusRaw);

    // Verified / Declined MUST go through Edge Function (service role) so it always works under RLS.
    if (newStatus === "verified") {
      try {
        toast.loading("Approving...", { id: "dv-approve" });
        await invokeSuperadmin({ action: "approve_doctor_verification", id: verificationId });

        // Best-effort: also mark doctor verified client-side (in case your function does not update doctors table).
        await supabase.from("doctors").update({ verified: true }).eq("id", doctorId);

        toast.success("Approved", { id: "dv-approve" });
        setViewOpen(false);
        setSelected(null);
        setDocs([]);
        setRejectionReason("");
        await fetchData();
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to approve", { id: "dv-approve" });
      }
      return;
    }

    if (newStatus === "declined") {
      const reason = rejectionReason.trim();
      if (!reason) {
        toast.error("Please provide a rejection reason");
        return;
      }

      try {
        toast.loading("Declining...", { id: "dv-decline" });
        await invokeSuperadmin({ action: "reject_doctor_verification", id: verificationId, reason });

        // Best-effort: mark doctor unverified.
        await supabase.from("doctors").update({ verified: false }).eq("id", doctorId);

        toast.success("Declined", { id: "dv-decline" });
        setViewOpen(false);
        setSelected(null);
        setDocs([]);
        setRejectionReason("");
        await fetchData();
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to decline", { id: "dv-decline" });
      }
      return;
    }

    // Non-terminal statuses can be updated directly.
    try {
      const { data: auth } = await supabase.auth.getUser();
      const reviewerId = auth?.user?.id || null;

      const updatePayload: any = {
        status: newStatus,
        reviewed_at: newStatus === "pending" || newStatus === "resubmitted" ? null : new Date().toISOString(),
        reviewed_by: newStatus === "pending" || newStatus === "resubmitted" ? null : reviewerId,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      };

      const { error: vErr } = await supabase
        .from("doctor_verification" as any)
        .update(updatePayload)
        .eq("id", verificationId);

      if (vErr) throw vErr;

      // For non-verified statuses, keep doctor.verified false.
      const { error: dErr } = await supabase.from("doctors").update({ verified: false }).eq("id", doctorId);
      if (dErr) throw dErr;

      toast.success("Status updated");
      setViewOpen(false);
      setSelected(null);
      setDocs([]);
      setRejectionReason("");
      await fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update status");
    }
  };

  const handleDeleteVerification = async (row: VerificationRow) => {
    if (!confirm("Delete this verification request and its documents? This cannot be undone.")) return;

    try {
      const { data: allDocs, error: docsErr } = await supabase
        .from("doctor_verification_documents" as any)
        .select("file_path")
        .eq("doctor_verification_id", row.id);

      if (docsErr) throw docsErr;

      const paths =
        (allDocs || [])
          .map((d: any) => extractStoragePath(d.file_path))
          .filter(Boolean) || [];

      if (paths.length) {
        const { error: rmErr } = await supabase.storage.from("verification-documents").remove(paths);
        if (rmErr) console.warn("Storage remove error:", rmErr);
      }

      await supabase
        .from("doctor_verification_documents" as any)
        .delete()
        .eq("doctor_verification_id", row.id);

      const { error: vErr } = await supabase
        .from("doctor_verification" as any)
        .delete()
        .eq("id", row.id);

      if (vErr) throw vErr;

      toast.success("Verification deleted");
      await fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to delete verification");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;

    return data.filter((r) => {
      const name = String(r.profile?.full_name || "").toLowerCase();
      const email = String(r.profile?.email || "").toLowerCase();
      const phone = String(r.profile?.phone || "").toLowerCase();
      const specialty = String(r.doctors?.specialty || r.specialty || "").toLowerCase();
      const license = String(r.license_number || r.doctors?.license_number || "").toLowerCase();
      const st = normalizeStatus(r.status);
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        specialty.includes(q) ||
        license.includes(q) ||
        st.includes(q)
      );
    });
  }, [data, search]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Input
              className="w-full md:w-72"
              placeholder="Search name/email/phone/specialty/license/status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" onClick={() => fetchData()} disabled={loading}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <UITableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </UITableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No verification requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium">{row.profile?.full_name || "Unknown doctor"}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.profile?.email || "—"}
                            {row.profile?.phone ? ` • ${row.profile.phone}` : ""}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>{row.doctors?.specialty || row.specialty || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.license_number || row.doctors?.license_number || "—"}</TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{safeDate(row.submitted_at)}</TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleView(row)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(row.id, row.doctors?.id || row.doctor_id, "verified")}
                            disabled={normalizeStatus(row.status) === "verified"}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelected(row);
                              setRejectionReason(row.rejection_reason || "");
                              setViewOpen(true);
                            }}
                            disabled={normalizeStatus(row.status) === "declined"}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl">
          <UIDialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
            <DialogDescription>Review details and documents, then approve or decline.</DialogDescription>
          </UIDialogHeader>

          {!selected ? (
            <div className="text-sm text-muted-foreground">No selection.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{selected.profile?.full_name || "Unknown doctor"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {selected.profile?.email || "—"}
                      {selected.profile?.phone ? ` • ${selected.profile.phone}` : ""}
                    </div>
                  </div>
                  {getStatusBadge(selected.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Specialty: </span>
                    <span>{selected.doctors?.specialty || selected.specialty || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">License #: </span>
                    <span className="font-mono">{selected.license_number || selected.doctors?.license_number || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted: </span>
                    <span>{safeDate(selected.submitted_at)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reviewed: </span>
                    <span>{safeDate(selected.reviewed_at)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Documents</div>
                  <div className="text-xs text-muted-foreground">Click to preview • Latest per document type</div>
                </div>

                {docs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No documents found.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {docs.map((d) => (
                      <div
                        key={d.id}
                        className="group relative flex flex-col gap-2 rounded-lg border p-3 hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => openFilePreview(d)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            {getFileIcon(d.file_name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{d.document_type}</div>
                            <div className="text-xs text-muted-foreground truncate">{d.file_name}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              openFilePreview(d);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadDocument(d.file_path, d.file_name);
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <div className="font-medium">Rejection reason</div>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Required when declining"
                />
                {normalizeStatus(selected.status) === "declined" && selected.rejection_reason ? (
                  <div className="text-sm text-muted-foreground">
                    Current reason: <span className="text-foreground">{selected.rejection_reason}</span>
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <div className="font-medium">Raw verification payload</div>
                <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-auto max-h-64">
                  {JSON.stringify(selected.verification_data ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pt-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setViewOpen(false)}>
                Close
              </Button>

              {selected ? (
                <Button variant="destructive" onClick={() => handleDeleteVerification(selected)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete request
                </Button>
              ) : null}
            </div>

            {selected ? (
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="secondary"
                  onClick={() =>
                    handleUpdateStatus(selected.id, selected.doctors?.id || selected.doctor_id, "under_review")
                  }
                  disabled={normalizeStatus(selected.status) === "under_review"}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Under review
                </Button>

                <Button
                  onClick={() => handleUpdateStatus(selected.id, selected.doctors?.id || selected.doctor_id, "verified")}
                  disabled={normalizeStatus(selected.status) === "verified"}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => handleUpdateStatus(selected.id, selected.doctors?.id || selected.doctor_id, "declined")}
                  disabled={normalizeStatus(selected.status) === "declined"}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreviewDoc(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <UIDialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDoc && getFileIcon(previewDoc.doc.file_name)}
              <span className="truncate">{previewDoc?.doc.file_name || "File Preview"}</span>
            </DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>{previewDoc?.doc.document_type || "Document"}</span>
              {previewDoc && !previewDoc.loading && !previewDoc.error && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => viewDocument(previewDoc.doc.file_path)}>
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open in new tab
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => downloadDocument(previewDoc.doc.file_path, previewDoc.doc.file_name)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              )}
            </DialogDescription>
          </UIDialogHeader>

          <ScrollArea className="max-h-[75vh]">{renderFilePreview()}</ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
