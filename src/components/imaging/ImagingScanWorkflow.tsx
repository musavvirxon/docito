// src/components/imaging/ImagingScanWorkflow.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  FileImage,
  CheckCircle,
  AlertTriangle,
  Play,
  Upload,
  Eye,
  Search,
  Plus,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ImagingManualOrderDialog } from "@/components/imaging/ImagingManualOrderDialog";
import { useImagingOrders, type ImagingOrder, type ImagingWorkflowStatus } from "@/hooks/useImagingOrders";
import { toast } from "sonner";

interface Props {
  centerId: string;
}

const STATUS_FLOW: ImagingWorkflowStatus[] = [
  "scheduled",
  "checked_in",
  "in_progress",
  "images_ready",
  "awaiting_report",
  "completed",
  "delivered",
];

function labelForStatus(status: ImagingWorkflowStatus) {
  const labels: Record<ImagingWorkflowStatus, string> = {
    scheduled: "Scheduled",
    checked_in: "Checked In",
    in_progress: "In Progress",
    images_ready: "Images Ready",
    awaiting_report: "Fully Ready",
    completed: "Completed",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

export default function ImagingScanWorkflow({ centerId }: Props) {
  const { t } = useTranslation("imagingAdminDashboard");
  const { orders, loading, fetchCenterOrders, updateOrderStatus, mergeResultAttachments } = useImagingOrders();

  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedScan, setSelectedScan] = useState<ImagingOrder | null>(null);

  const [manualOpen, setManualOpen] = useState(false);

  const [dicomUploading, setDicomUploading] = useState(false);
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [reportGenerating, setReportGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (centerId) fetchCenterOrders(centerId);
  }, [centerId, fetchCenterOrders]);

  useEffect(() => {
    const ra = selectedScan?.result_attachments;
    const obj = ra && typeof ra === "object" && !Array.isArray(ra) ? (ra as any) : {};
    setFindings(String(obj?.findings ?? ""));
    setImpression(String(obj?.impression ?? ""));
  }, [selectedScan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusBadge = (status: ImagingWorkflowStatus) => {
    const styles: Record<string, string> = {
      scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      checked_in: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      images_ready: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      awaiting_report: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      completed: "bg-green-500/10 text-green-500 border-green-500/20",
      delivered: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return <Badge className={styles[status]}>{labelForStatus(status)}</Badge>;
  };

  const getUrgencyBadge = (priority: ImagingOrder["priority"]) => {
    if (priority === "stat") return <Badge variant="destructive">STAT</Badge>;
    if (priority === "urgent") return <Badge className="bg-orange-500/10 text-orange-500">Urgent</Badge>;
    return null;
  };

  const handleUpdateStatus = async (orderId: string, newStatus: ImagingWorkflowStatus) => {
    await updateOrderStatus(orderId, centerId, newStatus);
  };

  const filteredScans = useMemo(() => {
    const st = searchTerm.trim().toLowerCase();
    return orders.filter((scan) => {
      const matchesFilter = filter === "all" || scan.status === (filter as any);
      const matchesSearch =
        !st ||
        (scan.patient_name || "").toLowerCase().includes(st) ||
        scan.order_number.toLowerCase().includes(st) ||
        scan.exam_name.toLowerCase().includes(st);
      return matchesFilter && matchesSearch;
    });
  }, [orders, filter, searchTerm]);

  const getNextAction = (
    status: ImagingWorkflowStatus,
  ): { label: string; nextStatus: ImagingWorkflowStatus; icon: any } | null => {
    const actions: Partial<Record<ImagingWorkflowStatus, any>> = {
      scheduled: { label: "Check In", nextStatus: "checked_in", icon: User },
      checked_in: { label: "Start Scan", nextStatus: "in_progress", icon: Play },
      in_progress: { label: "Mark Images Ready", nextStatus: "images_ready", icon: Eye },
      completed: { label: "Mark Delivered", nextStatus: "delivered", icon: CheckCircle },
    };
    return actions[status] || null;
  };

  const dicomFiles = useMemo(() => {
    const ra = selectedScan?.result_attachments;
    const obj = ra && typeof ra === "object" && !Array.isArray(ra) ? (ra as any) : {};
    const list = Array.isArray(obj?.dicom_files) ? (obj.dicom_files as any[]) : [];
    return list
      .map((x) => ({
        path: String(x?.path || ""),
        filename: String(x?.filename || ""),
        uploaded_at: String(x?.uploaded_at || ""),
      }))
      .filter((x) => x.path);
  }, [selectedScan?.result_attachments]);

  const reportInfo = useMemo(() => {
    const ra = selectedScan?.result_attachments;
    const obj = ra && typeof ra === "object" && !Array.isArray(ra) ? (ra as any) : {};
    const rep = obj?.report && typeof obj.report === "object" ? (obj.report as any) : null;
    if (!rep) return null;
    const path = rep?.path ? String(rep.path) : null;
    const signedUrl = rep?.signed_url ? String(rep.signed_url) : null;
    const generatedAt = rep?.generated_at ? String(rep.generated_at) : null;
    return path ? { path, signedUrl, generatedAt } : null;
  }, [selectedScan?.result_attachments]);

  const handleUploadDicom = async () => {
    if (!selectedScan) return;
    if (selectedScan.status !== "images_ready") {
      toast.error("DICOM uploads are available when status is Images Ready.");
      return;
    }
    const input = fileInputRef.current;
    const files = input?.files ? Array.from(input.files) : [];
    if (!files.length) return toast.error("Please select DICOM files (or a ZIP) to upload.");

    setDicomUploading(true);
    try {
      const uploaded: Array<{ path: string; filename: string; uploaded_at: string }> = [];

      for (const f of files) {
        const safeName = `${Date.now()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
        const path = `${centerId}/${selectedScan.id}/${safeName}`;

        const { error } = await supabase.storage.from("imaging-dicom").upload(path, f, {
          upsert: false,
          contentType: f.type || "application/octet-stream",
        });

        if (error) throw error;

        uploaded.push({ path, filename: f.name, uploaded_at: new Date().toISOString() });
      }

      const existing = dicomFiles.map((x) => ({ path: x.path, filename: x.filename, uploaded_at: x.uploaded_at }));
      await mergeResultAttachments(selectedScan.id, { dicom_files: [...existing, ...uploaded] });

      toast.success("DICOM uploaded");
      if (input) input.value = "";
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to upload DICOM");
    } finally {
      setDicomUploading(false);
    }
  };

  const handleOpenDicom = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from("imaging-dicom").createSignedUrl(path, 60 * 30);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to open file");
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedScan) return;
    if (selectedScan.status !== "awaiting_report") {
      toast.error("Generate report is available when status is Fully Ready.");
      return;
    }

    setReportGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("imaging-generate-report", {
        body: {
          centerId,
          referralId: selectedScan.id,
          findings: findings.trim() || null,
          impression: impression.trim() || null,
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to generate report");

      toast.success("PDF report generated");

      await fetchCenterOrders(centerId);
      const next = orders.find((o) => o.id === selectedScan.id) || selectedScan;
      setSelectedScan({ ...next, status: "completed" });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to generate report");
    } finally {
      setReportGenerating(false);
    }
  };

  const handleMarkFullyReady = async () => {
    if (!selectedScan) return;
    if (selectedScan.status !== "images_ready") return;
    if (!dicomFiles.length) {
      toast.error("Upload DICOM first before marking Fully Ready.");
      return;
    }
    await handleUpdateStatus(selectedScan.id, "awaiting_report");
    setSelectedScan((prev) => (prev ? { ...prev, status: "awaiting_report" } : prev));
  };

  const handleOpenReport = async () => {
    if (!reportInfo?.path) return;
    try {
      const { data, error } = await supabase.storage.from("imaging-reports").createSignedUrl(reportInfo.path, 60 * 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to open report");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card>
        <CardContent className="pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Scan Workflow</div>
            <div className="text-sm text-muted-foreground">
              Create walk-in orders here and manage scans from scheduling to report delivery.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setManualOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Walk-in Order
            </Button>
            <Button variant="outline" onClick={() => fetchCenterOrders(centerId)}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient, order number, or exam..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="images_ready">Images Ready</SelectItem>
                <SelectItem value="awaiting_report">Fully Ready</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Scan List */}
      <Card>
        <CardHeader>
          <CardTitle>Scan Workflow</CardTitle>
          <CardDescription>Manage imaging scans from scheduling to delivery</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredScans.length === 0 ? (
            <div className="text-center py-12">
              <FileImage className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No scans found</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredScans.map((scan) => {
                  const nextAction = getNextAction(scan.status);
                  return (
                    <div key={scan.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-muted-foreground">{scan.order_number}</span>
                            {getStatusBadge(scan.status)}
                            {getUrgencyBadge(scan.priority)}
                            {!!scan.attachments?.contrast && <Badge variant="outline">Contrast</Badge>}
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {scan.patient_name || "Patient"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Stethoscope className="h-4 w-4 text-muted-foreground" />
                              {scan.doctor_name || "Referring Doctor"}
                            </span>
                          </div>

                          <div>
                            <p className="font-medium">{scan.exam_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {scan.modality} • {scan.body_part || "N/A"}
                            </p>
                          </div>

                          {(scan.preferred_date || scan.preferred_time_slot) && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {scan.preferred_date || "—"}
                              <Clock className="h-4 w-4 ml-2" />
                              {scan.preferred_time_slot || "—"}
                            </div>
                          )}

                          {scan.notes && (
                            <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                              {scan.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedScan(scan)}>
                            View Details
                          </Button>
                          {nextAction && (
                            <Button size="sm" onClick={() => handleUpdateStatus(scan.id, nextAction.nextStatus)}>
                              <nextAction.icon className="h-4 w-4 mr-1" />
                              {nextAction.label}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Walk-in order dialog */}
      <ImagingManualOrderDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        imagingCenterId={centerId}
        onCreated={() => fetchCenterOrders(centerId)}
      />

      {/* Scan Details Dialog */}
      <Dialog open={!!selectedScan} onOpenChange={() => setSelectedScan(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Scan Details - {selectedScan?.order_number}</DialogTitle>
          </DialogHeader>

          {selectedScan && (
            <div className="space-y-6 pt-4">
              {/* Status Progress */}
              <div className="flex items-center justify-between">
                {STATUS_FLOW.map((status, index) => {
                  const currentIndex = STATUS_FLOW.indexOf(selectedScan.status);
                  const isCompleted = index < currentIndex;
                  const isCurrent = index === currentIndex;
                  return (
                    <div key={status} className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          isCompleted
                            ? "bg-primary text-primary-foreground"
                            : isCurrent
                            ? "bg-primary/20 text-primary border-2 border-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                        title={labelForStatus(status)}
                      >
                        {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                      </div>
                      {index < STATUS_FLOW.length - 1 && (
                        <div className={`w-8 h-0.5 ${isCompleted ? "bg-primary" : "bg-muted"}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">{selectedScan.patient_name || "Patient"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Referring Doctor</p>
                  <p className="font-medium">{selectedScan.doctor_name || "Referring Doctor"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Exam</p>
                  <p className="font-medium">{selectedScan.exam_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modality</p>
                  <p className="font-medium">{selectedScan.modality}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Body Part</p>
                  <p className="font-medium">{selectedScan.body_part || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <p className="font-medium capitalize">{selectedScan.priority}</p>
                </div>
              </div>

              {/* Images Ready -> Upload DICOM */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    DICOM Upload
                  </CardTitle>
                  <CardDescription>
                    Available when status is <span className="font-medium">Images Ready</span>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="block w-full text-sm"
                        accept=".dcm,application/dicom,application/octet-stream,.zip"
                        disabled={dicomUploading || selectedScan.status !== "images_ready"}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Upload .dcm files or a ZIP (stored securely).
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleUploadDicom}
                        disabled={dicomUploading || selectedScan.status !== "images_ready"}
                      >
                        {dicomUploading ? (
                          <>
                            <Upload className="h-4 w-4 mr-2 animate-pulse" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload DICOM
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleMarkFullyReady}
                        disabled={selectedScan.status !== "images_ready" || !dicomFiles.length || dicomUploading}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Mark Fully Ready
                      </Button>
                    </div>
                  </div>

                  {dicomFiles.length ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Uploaded files</div>
                      <div className="space-y-2">
                        {dicomFiles.map((f) => (
                          <div
                            key={f.path}
                            className="flex items-center justify-between p-2 rounded border bg-muted/30"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{f.filename || f.path.split("/").pop()}</div>
                              <div className="text-xs text-muted-foreground">
                                {f.uploaded_at ? new Date(f.uploaded_at).toLocaleString() : "—"}
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleOpenDicom(f.path)}>
                              Open
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No DICOM uploaded yet.</div>
                  )}
                </CardContent>
              </Card>

              {/* Fully Ready -> Generate PDF */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF Report
                  </CardTitle>
                  <CardDescription>
                    Available when status is <span className="font-medium">Fully Ready</span>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Findings (optional)</div>
                      <Textarea
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                        rows={4}
                        placeholder="Describe findings..."
                        disabled={selectedScan.status !== "awaiting_report" || reportGenerating}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-medium">Impression (optional)</div>
                      <Textarea
                        value={impression}
                        onChange={(e) => setImpression(e.target.value)}
                        rows={3}
                        placeholder="Summarize impression..."
                        disabled={selectedScan.status !== "awaiting_report" || reportGenerating}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                    <div className="text-sm text-muted-foreground">
                      Generating a report will store a PDF in your secure reports vault and mark the workflow as{" "}
                      <span className="font-medium">Completed</span>.
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleGenerateReport}
                        disabled={selectedScan.status !== "awaiting_report" || reportGenerating}
                      >
                        {reportGenerating ? (
                          <>
                            <FileText className="h-4 w-4 mr-2 animate-pulse" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Generate PDF Report
                          </>
                        )}
                      </Button>

                      {reportInfo?.path ? (
                        <Button variant="outline" onClick={handleOpenReport}>
                          Open Report
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 justify-end">
                {selectedScan.status === "completed" ? (
                  <Button onClick={() => handleUpdateStatus(selectedScan.id, "delivered")}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Delivered
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
