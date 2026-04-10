// File: src/components/imaging/ImagingReportManager.tsx

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Search, CheckCircle, Clock, AlertTriangle, Send, Edit, Eye, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ReportStatus = "pending" | "draft" | "finalized" | "delivered";

interface ReportRow {
  id: string; // referral id
  order_number: string;
  patient_name: string;
  exam_name: string;
  modality: string;
  radiologist: string;
  status: ReportStatus;
  findings: string;
  impression: string;
  critical_findings: boolean;
  created_at: string;
  finalized_at: string | null;
}

interface Props {
  centerId: string;
}

function pickExamAndModality(attachments: unknown, fallbackReason: string | null) {
  const a = (attachments ?? null) as Record<string, unknown> | null;
  const exam = (a?.exam_name as string) || fallbackReason || "Imaging Exam";
  const modality = (a?.modality as string) || "X-ray";
  return { exam_name: exam, modality };
}

function statusLabel(s: ReportStatus) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ImagingReportManager({ centerId }: Props) {
  const { t } = useTranslation("imagingAdminDashboard");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ReportStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    findings: "",
    impression: "",
    critical_findings: false,
  });

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  const fetchReports = async () => {
    if (!centerId) return;
    setLoading(true);

    try {
      // 1) Get imaging referrals
      const { data: refData, error: refErr } = await supabase
        .from("referrals")
        .select("id, referral_number, patient_id, status, reason, attachments, created_at, completed_at")
        .eq("receiver_type", "imaging_center")
        .eq("receiver_entity_id", centerId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (refErr) throw refErr;

      const referrals = (refData ?? []) as Array<{
        id: string;
        referral_number: string | null;
        patient_id: string;
        status: string;
        reason: string | null;
        attachments: unknown;
        created_at: string;
        completed_at: string | null;
      }>;

      const referralIds = referrals.map((r) => r.id);

      // 2) Get imaging_reports for those referrals
      const { data: repData, error: repErr } = await (supabase.from as any)("imaging_reports")
        .select("id, referral_id, status, radiologist_user_id, findings, impression, critical_findings, finalized_at, delivered_at, created_at")
        .eq("imaging_center_id", centerId)
        .in("referral_id", referralIds.length ? referralIds : ["00000000-0000-0000-0000-000000000000"]);

      // If imaging_reports table doesn't exist yet, degrade gracefully
      const imagingReports = repErr ? [] : ((repData ?? []) as Array<any>);
      if (repErr) console.warn(repErr);

      const byReferral = new Map<string, any>();
      for (const r of imagingReports) byReferral.set(r.referral_id, r);

      // 3) Fetch names (patients + radiologists)
      const patientIds = Array.from(new Set(referrals.map((r) => r.patient_id).filter(Boolean)));
      const radiologistIds = Array.from(new Set(imagingReports.map((r: any) => r.radiologist_user_id).filter(Boolean)));

      const profileIds = Array.from(new Set([...patientIds, ...radiologistIds]));
      const nameMap = new Map<string, string>();

      if (profileIds.length) {
        const { data: profData } = await supabase.from("profiles").select("user_id, full_name, first_name, last_name").in("user_id", profileIds);
        for (const p of (profData ?? []) as any[]) {
          const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "User";
          nameMap.set(p.user_id, name);
        }
      }

      const mapped: ReportRow[] = referrals.map((ref) => {
        const rep = byReferral.get(ref.id) ?? null;

        const order_number = ref.referral_number || `IMG-${ref.id.slice(0, 8).toUpperCase()}`;
        const patient_name = nameMap.get(ref.patient_id) || "Patient";
        const { exam_name, modality } = pickExamAndModality(ref.attachments, ref.reason);

        const radiologist = rep?.radiologist_user_id ? nameMap.get(rep.radiologist_user_id) || "Radiologist" : "Unassigned";

        let status: ReportStatus = "pending";
        if (rep) {
          if (rep.delivered_at) status = "delivered";
          else if (rep.finalized_at || rep.status === "finalized") status = "finalized";
          else status = "draft";
        }

        return {
          id: ref.id,
          order_number,
          patient_name,
          exam_name,
          modality,
          radiologist,
          status,
          findings: rep?.findings || "",
          impression: rep?.impression || "",
          critical_findings: Boolean(rep?.critical_findings),
          created_at: rep?.created_at || ref.created_at,
          finalized_at: rep?.finalized_at || null,
        };
      });

      setReports(mapped);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load reports");
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    const styles: Record<ReportStatus, string> = {
      pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      draft: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      finalized: "bg-green-500/10 text-green-600 border-green-500/20",
      delivered: "bg-gray-500/10 text-gray-700 border-gray-500/20",
    };
    return <Badge className={styles[status]}>{statusLabel(status)}</Badge>;
  };

  const openReport = (report: ReportRow) => {
    setSelectedReport(report);
    setFormData({
      findings: report.findings,
      impression: report.impression,
      critical_findings: report.critical_findings,
    });
    setEditMode(report.status === "pending" || report.status === "draft");
  };

  const upsertReport = async (referralId: string, patch: Partial<any>) => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id ?? null;

    const payload = {
      imaging_center_id: centerId,
      referral_id: referralId,
      radiologist_user_id: userId,
      findings: patch.findings ?? "",
      impression: patch.impression ?? "",
      critical_findings: Boolean(patch.critical_findings),
      status: patch.status ?? "draft",
      finalized_at: patch.finalized_at ?? null,
      delivered_at: patch.delivered_at ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase.from as any)("imaging_reports").upsert(payload, { onConflict: "imaging_center_id,referral_id" });
    if (error) throw error;
  };

  const saveDraft = async () => {
    if (!selectedReport) return;
    setSaving(true);
    try {
      await upsertReport(selectedReport.id, {
        findings: formData.findings,
        impression: formData.impression,
        critical_findings: formData.critical_findings,
        status: "draft",
      });

      toast.success("Report saved as draft");
      setSelectedReport(null);
      await fetchReports();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const finalizeReport = async () => {
    if (!selectedReport) return;

    if (!formData.findings.trim() || !formData.impression.trim()) {
      toast.error("Please complete findings and impression before finalizing");
      return;
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();

      await upsertReport(selectedReport.id, {
        findings: formData.findings,
        impression: formData.impression,
        critical_findings: formData.critical_findings,
        status: "finalized",
        finalized_at: nowIso,
      });

      // Mark referral completed (best-effort; depends on your referrals schema/RLS)
      await supabase
        .from("referrals")
        .update({ status: "completed", completed_at: nowIso, updated_at: nowIso } as any)
        .eq("id", selectedReport.id);

      toast.success("Report finalized");
      setSelectedReport(null);
      await fetchReports();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to finalize report");
    } finally {
      setSaving(false);
    }
  };

  const markDelivered = async () => {
    if (!selectedReport) return;
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();

      await upsertReport(selectedReport.id, {
        findings: formData.findings,
        impression: formData.impression,
        critical_findings: formData.critical_findings,
        status: "delivered",
        delivered_at: nowIso,
      });

      toast.success("Report marked as delivered");
      setSelectedReport(null);
      await fetchReports();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to mark delivered");
    } finally {
      setSaving(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesFilter = filter === "all" || report.status === filter;
      const s = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !s ||
        report.patient_name.toLowerCase().includes(s) ||
        report.order_number.toLowerCase().includes(s) ||
        report.exam_name.toLowerCase().includes(s) ||
        report.modality.toLowerCase().includes(s);
      return matchesFilter && matchesSearch;
    });
  }, [reports, filter, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reports.filter((r) => r.status === "pending").length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Edit className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reports.filter((r) => r.status === "draft").length}</p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reports.filter((r) => r.status === "finalized").length}</p>
                <p className="text-sm text-muted-foreground">Finalized</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reports.filter((r) => r.critical_findings).length}</p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search reports..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full md:w-80" />
              </div>
              <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchReports}>
                <RefreshIcon />
                Refresh
              </Button>
              <Button variant="outline" disabled>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Modality</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Radiologist</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.order_number}</TableCell>
                    <TableCell>{report.patient_name}</TableCell>
                    <TableCell>{report.exam_name}</TableCell>
                    <TableCell>{report.modality}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>{report.radiologist}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openReport(report)}>
                        {report.status === "pending" || report.status === "draft" ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredReports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      No reports found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Report dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(o) => !o && setSelectedReport(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedReport?.order_number} - {selectedReport?.patient_name}
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Info label="Exam" value={selectedReport.exam_name} />
                <Info label="Modality" value={selectedReport.modality} />
                <div className="space-y-1">
                  <Label>Status</Label>
                  <div>{getStatusBadge(selectedReport.status)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Findings</Label>
                <Textarea
                  value={formData.findings}
                  onChange={(e) => setFormData((s) => ({ ...s, findings: e.target.value }))}
                  disabled={!editMode}
                  placeholder="Enter findings..."
                  className="min-h-[140px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Impression</Label>
                <Textarea
                  value={formData.impression}
                  onChange={(e) => setFormData((s) => ({ ...s, impression: e.target.value }))}
                  disabled={!editMode}
                  placeholder="Enter impression..."
                  className="min-h-[120px]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Critical Findings
                  </div>
                  <div className="text-sm text-muted-foreground">Flag this report as critical.</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.critical_findings}
                  onChange={(e) => setFormData((s) => ({ ...s, critical_findings: e.target.checked }))}
                  disabled={!editMode}
                  className="h-4 w-4"
                />
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setSelectedReport(null)}>
                    Close
                  </Button>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  {editMode ? (
                    <>
                      <Button variant="outline" onClick={saveDraft} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Edit className="h-4 w-4 mr-2" />}
                        Save Draft
                      </Button>
                      <Button onClick={finalizeReport} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        Finalize
                      </Button>
                    </>
                  ) : (
                    <Button onClick={markDelivered} disabled={saving || selectedReport.status !== "finalized"}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Mark Delivered
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="text-sm text-muted-foreground">{value}</div>
    </div>
  );
}

function RefreshIcon() {
  return <span className="inline-flex h-4 w-4 mr-2" aria-hidden="true" />;
}
