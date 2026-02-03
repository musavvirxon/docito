// src/pages/SuperAdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { Shield, RefreshCw, CheckCircle2, XCircle, FileText, Activity, Search } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  listDoctorVerifications,
  getDoctorVerification,
  approveDoctorVerification,
  rejectDoctorVerification,
  listAuditLogs,
  type DoctorVerification,
  type DoctorVerificationDocument,
  type AuditLog,
} from "@/lib/superadminApi";

type StatusTab = "pending" | "verified" | "rejected";

function statusColor(status: string) {
  switch (status) {
    case "verified":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
    case "rejected":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
    default:
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
  }
}

function safeStatus(v?: string | null) {
  const s = (v || "pending").toLowerCase();
  if (s === "verified" || s === "rejected" || s === "pending") return s;
  return "pending";
}

function formatDate(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

function fileNameFromPath(path?: string | null) {
  if (!path) return "document";
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "document";
}

export default function SuperAdminDashboard() {
  const { user, activeRole } = useAuth();

  const [statusTab, setStatusTab] = useState<StatusTab>("pending");
  const [loading, setLoading] = useState(false);

  // Doctor verifications list
  const [items, setItems] = useState<DoctorVerification[]>([]);
  const [search, setSearch] = useState("");

  // Selected verification (detail)
  const [openDetail, setOpenDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<DoctorVerification | null>(null);
  const [documents, setDocuments] = useState<DoctorVerificationDocument[]>([]);

  // Reject modal
  const [openReject, setOpenReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Audit logs
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState("");

  const canUse = !!user && activeRole === "super_admin";

  const loadVerifications = async (status: StatusTab) => {
    setLoading(true);
    try {
      const res = await listDoctorVerifications({ status, limit: 50, offset: 0 });
      setItems(res.data || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load verifications");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await listAuditLogs({ limit: 100, offset: 0 });
      setAuditLogs(res.data || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load audit logs");
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (!canUse) return;
    loadVerifications(statusTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUse, statusTab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((v) => {
      const id = (v.id || "").toLowerCase();
      const doctorId = (v.doctor_id || "").toLowerCase();
      const spec = (v.specialty || "").toLowerCase();
      const lic = (v.license_number || "").toLowerCase();
      return id.includes(q) || doctorId.includes(q) || spec.includes(q) || lic.includes(q);
    });
  }, [items, search]);

  const filteredAudit = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return auditLogs;

    return auditLogs.filter((l) => {
      const a = (l.action_type || "").toLowerCase();
      const e = (l.entity_type || "").toLowerCase();
      const id = (l.entity_id || "").toLowerCase();
      const u = (l.user_id || "").toLowerCase();
      const d = JSON.stringify(l.details || {}).toLowerCase();
      return a.includes(q) || e.includes(q) || id.includes(q) || u.includes(q) || d.includes(q);
    });
  }, [auditLogs, auditSearch]);

  const openVerification = async (verification: DoctorVerification) => {
    setSelected(verification);
    setDocuments([]);
    setOpenDetail(true);

    setDetailLoading(true);
    try {
      const res = await getDoctorVerification(verification.id);
      setSelected(res.data);
      setDocuments(res.documents || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load verification details");
    } finally {
      setDetailLoading(false);
    }
  };

  const approveSelected = async () => {
    if (!selected) return;
    try {
      toast.loading("Approving…", { id: "sa-approve" });
      await approveDoctorVerification(selected.id);
      toast.success("Approved", { id: "sa-approve" });
      setOpenDetail(false);
      await loadVerifications(statusTab);
    } catch (e: any) {
      toast.error(e?.message || "Approve failed", { id: "sa-approve" });
    }
  };

  const rejectSelected = async () => {
    if (!selected) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Please enter a rejection reason.");
      return;
    }

    try {
      toast.loading("Rejecting…", { id: "sa-reject" });
      await rejectDoctorVerification(selected.id, reason);
      toast.success("Rejected", { id: "sa-reject" });
      setOpenReject(false);
      setOpenDetail(false);
      setRejectReason("");
      await loadVerifications(statusTab);
    } catch (e: any) {
      toast.error(e?.message || "Reject failed", { id: "sa-reject" });
    }
  };

  if (!canUse) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Super Admin
              </CardTitle>
              <CardDescription>Access restricted. Switch to the Super Admin role to continue.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                You are currently signed in as:{" "}
                <span className="font-medium text-foreground">{activeRole}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Super Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review provider verification and monitor system activity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => loadVerifications(statusTab)}
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={loadAudit}
              disabled={auditLoading}
            >
              <Activity className={cn("w-4 h-4", auditLoading && "animate-spin")} />
              Audit Logs
            </Button>
          </div>
        </div>

        <Tabs defaultValue="verifications" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="verifications" className="gap-2">
              <FileText className="w-4 h-4" />
              Verifications
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="gap-2"
              onClick={() => {
                if (auditLogs.length === 0) loadAudit();
              }}
            >
              <Activity className="w-4 h-4" />
              Audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verifications" className="mt-4">
            <Card className="border-border/50">
              <CardHeader className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <CardTitle>Doctor Verification</CardTitle>
                    <CardDescription>Approve or reject provider verification requests.</CardDescription>
                  </div>

                  <div className="relative w-full lg:w-[360px]">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by ID, doctor ID, specialty, license…"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {(["pending", "verified", "rejected"] as StatusTab[]).map((s) => (
                    <Button
                      key={s}
                      variant={statusTab === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusTab(s)}
                      className="rounded-full"
                      disabled={loading}
                    >
                      {s === "pending" ? "Pending" : s === "verified" ? "Verified" : "Rejected"}
                      <Badge variant="secondary" className="ml-2">
                        {statusTab === s ? filtered.length : items.filter((x) => safeStatus(x.status || x.verification_status) === s).length}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </CardHeader>

              <CardContent>
                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-muted/30 text-xs font-medium text-muted-foreground">
                    <div className="col-span-4">Verification</div>
                    <div className="col-span-3">Doctor</div>
                    <div className="col-span-2">Specialty</div>
                    <div className="col-span-2">Submitted</div>
                    <div className="col-span-1 text-right">Status</div>
                  </div>

                  <div className="divide-y divide-border/50">
                    {loading ? (
                      <div className="px-4 py-10 text-sm text-muted-foreground text-center">Loading…</div>
                    ) : filtered.length === 0 ? (
                      <div className="px-4 py-10 text-sm text-muted-foreground text-center">
                        No records found.
                      </div>
                    ) : (
                      filtered.map((v) => {
                        const st = safeStatus(v.status || v.verification_status);
                        return (
                          <button
                            key={v.id}
                            className="w-full text-left grid grid-cols-12 gap-3 px-4 py-3 hover:bg-accent/30 transition-colors"
                            onClick={() => openVerification(v)}
                          >
                            <div className="col-span-4">
                              <div className="text-sm font-medium text-foreground truncate">{v.id}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                License: {v.license_number || "—"} • Exp: {v.years_of_experience || "—"}
                              </div>
                            </div>

                            <div className="col-span-3">
                              <div className="text-sm font-medium text-foreground truncate">{v.doctor_id}</div>
                              <div className="text-xs text-muted-foreground truncate">Doctor ID</div>
                            </div>

                            <div className="col-span-2">
                              <div className="text-sm text-foreground truncate">{v.specialty || "—"}</div>
                            </div>

                            <div className="col-span-2">
                              <div className="text-sm text-foreground truncate">{formatDate(v.created_at)}</div>
                            </div>

                            <div className="col-span-1 flex justify-end">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium",
                                  statusColor(st)
                                )}
                              >
                                {st}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Card className="border-border/50">
              <CardHeader className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <CardTitle>System Audit Logs</CardTitle>
                    <CardDescription>Recent administrative actions and system events.</CardDescription>
                  </div>

                  <div className="relative w-full lg:w-[360px]">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      placeholder="Search action, entity, user, details…"
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-muted/30 text-xs font-medium text-muted-foreground">
                    <div className="col-span-3">When</div>
                    <div className="col-span-4">Action</div>
                    <div className="col-span-2">Entity</div>
                    <div className="col-span-3">User</div>
                  </div>

                  <div className="divide-y divide-border/50">
                    {auditLoading ? (
                      <div className="px-4 py-10 text-sm text-muted-foreground text-center">Loading…</div>
                    ) : filteredAudit.length === 0 ? (
                      <div className="px-4 py-10 text-sm text-muted-foreground text-center">
                        No logs found.
                      </div>
                    ) : (
                      filteredAudit.map((l) => (
                        <div key={l.id} className="grid grid-cols-12 gap-3 px-4 py-3">
                          <div className="col-span-3 text-sm text-foreground">{formatDate(l.created_at)}</div>
                          <div className="col-span-4 text-sm text-foreground truncate">{l.action_type || "—"}</div>
                          <div className="col-span-2 text-sm text-foreground truncate">
                            {(l.entity_type || "—") + (l.entity_id ? ` • ${l.entity_id}` : "")}
                          </div>
                          <div className="col-span-3 text-sm text-foreground truncate">{l.user_id || "—"}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail dialog */}
        <Dialog open={openDetail} onOpenChange={setOpenDetail}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Verification Details
              </DialogTitle>
              <DialogDescription>
                Review submitted info and supporting documents. Then approve or reject.
              </DialogDescription>
            </DialogHeader>

            <Separator />

            {detailLoading || !selected ? (
              <div className="py-10 text-sm text-muted-foreground text-center">Loading…</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Submission</CardTitle>
                      <CardDescription className="truncate">ID: {selected.id}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-muted-foreground">Doctor ID</div>
                        <div className="text-sm font-medium text-foreground truncate">{selected.doctor_id}</div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-muted-foreground">Specialty</div>
                        <div className="text-sm font-medium text-foreground truncate">{selected.specialty || "—"}</div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-muted-foreground">License</div>
                        <div className="text-sm font-medium text-foreground truncate">{selected.license_number || "—"}</div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-muted-foreground">Experience</div>
                        <div className="text-sm font-medium text-foreground truncate">{selected.years_of_experience || "—"}</div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-muted-foreground">Submitted</div>
                        <div className="text-sm font-medium text-foreground truncate">{formatDate(selected.created_at)}</div>
                      </div>

                      <div className="pt-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium",
                            statusColor(safeStatus(selected.status || selected.verification_status))
                          )}
                        >
                          {safeStatus(selected.status || selected.verification_status)}
                        </span>
                      </div>

                      {safeStatus(selected.status || selected.verification_status) === "rejected" &&
                        selected.rejection_reason && (
                          <div className="mt-3 p-3 rounded-xl border border-border/50 bg-muted/30 text-sm">
                            <div className="font-medium text-foreground mb-1">Rejection reason</div>
                            <div className="text-muted-foreground whitespace-pre-wrap">{selected.rejection_reason}</div>
                          </div>
                        )}
                    </CardContent>
                  </Card>

                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Documents</CardTitle>
                      <CardDescription>Files submitted with this verification.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {documents.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No documents uploaded.</div>
                      ) : (
                        <ScrollArea className="h-[240px] pr-3">
                          <div className="space-y-2">
                            {documents.map((d) => (
                              <div
                                key={d.id}
                                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/50 hover:bg-accent/30 transition-colors"
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">
                                    {d.file_name || fileNameFromPath(d.file_path)}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {d.document_type || "document"} • {formatDate(d.uploaded_at)}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">{d.file_path || "—"}</div>
                                </div>
                                <Badge variant="secondary" className="shrink-0">
                                  {d.document_type || "doc"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Actions</CardTitle>
                      <CardDescription>Approve or reject this request.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button
                        className="w-full gap-2"
                        onClick={approveSelected}
                        disabled={safeStatus(selected.status || selected.verification_status) === "verified"}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </Button>

                      <Button
                        variant="destructive"
                        className="w-full gap-2"
                        onClick={() => setOpenReject(true)}
                        disabled={safeStatus(selected.status || selected.verification_status) === "rejected"}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </Button>

                      <div className="text-xs text-muted-foreground pt-2">
                        This will update the verification status and create an audit log entry.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpenDetail(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject dialog */}
        <Dialog open={openReject} onOpenChange={setOpenReject}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Reject verification</DialogTitle>
              <DialogDescription>Provide a clear reason that will be stored with the request.</DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason</Label>
              <Input
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Example: Missing license document, unclear specialty, invalid registration…"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpenReject(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={rejectSelected}>
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
