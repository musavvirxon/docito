// File: src/components/imaging/ImagingOrdersManager.tsx

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ReferralRow = {
  id: string;
  referral_number: string | null;
  status: string | null;
  imaging_workflow_status: string | null;
  priority: string | null;
  preferred_date: string | null;
  preferred_time_slot: string | null;
  patient_id: string;
  reason: string | null;
  clinical_notes: string | null;
  attachments: any;
  result_notes: string | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  assigned_imaging_staff_id: string | null;
};

type StaffRow = {
  id: string;
  user_id: string;
  staff_role: string;
  status: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
};

function asName(p?: ProfileRow | null) {
  if (!p) return "User";
  return p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "User";
}

function pickExam(attachments: any, fallbackReason: string | null) {
  if (attachments && typeof attachments === "object") {
    const exam = attachments.exam_name || attachments.exam || attachments.study || null;
    const mod = attachments.modality || attachments.mod || null;
    return { examName: String(exam || fallbackReason || "Imaging Exam"), modality: String(mod || "—") };
  }
  return { examName: fallbackReason || "Imaging Exam", modality: "—" };
}

interface Props {
  centerId: string;
}

const WORKFLOW_STATUSES = ["scheduled", "checked_in", "in_progress", "awaiting_report", "completed", "cancelled"];
const REFERRAL_STATUSES = ["pending", "accepted", "declined", "completed"];

export default function ImagingOrdersManager({ centerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [orders, setOrders] = useState<ReferralRow[]>([]);
  const [patientProfiles, setPatientProfiles] = useState<Record<string, ProfileRow>>({});
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<Record<string, ProfileRow>>({});

  const [query, setQuery] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchAll = async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      // Orders
      const { data: refData, error: refErr } = await supabase
        .from("referrals")
        .select(
          "id, referral_number, status, imaging_workflow_status, priority, preferred_date, preferred_time_slot, patient_id, reason, clinical_notes, attachments, result_notes, created_at, accepted_at, completed_at, assigned_imaging_staff_id"
        )
        .eq("receiver_type", "imaging_center")
        .eq("receiver_entity_id", centerId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (refErr) throw refErr;
      const refRows = (refData || []) as ReferralRow[];
      setOrders(refRows);

      // Staff
      const { data: staffData, error: staffErr } = await supabase
        .from("imaging_staff")
        .select("id, user_id, staff_role, status")
        .eq("imaging_center_id", centerId)
        .order("created_at", { ascending: true });

      if (staffErr) throw staffErr;
      const staffRows = (staffData || []) as StaffRow[];
      setStaff(staffRows);

      // Profiles: patients + staff
      const patientIds = Array.from(new Set(refRows.map((r) => r.patient_id).filter(Boolean)));
      const staffUserIds = Array.from(new Set(staffRows.map((s) => s.user_id).filter(Boolean)));
      const ids = Array.from(new Set([...patientIds, ...staffUserIds]));

      if (ids.length) {
        const { data: profs, error: profErr } = await supabase.from("profiles").select("user_id, full_name, first_name, last_name").in("user_id", ids);
        if (profErr) throw profErr;

        const byId: Record<string, ProfileRow> = {};
        for (const p of (profs || []) as ProfileRow[]) byId[p.user_id] = p;

        const patientMap: Record<string, ProfileRow> = {};
        for (const id of patientIds) if (byId[id]) patientMap[id] = byId[id];

        const staffMap: Record<string, ProfileRow> = {};
        for (const id of staffUserIds) if (byId[id]) staffMap[id] = byId[id];

        setPatientProfiles(patientMap);
        setStaffProfiles(staffMap);
      } else {
        setPatientProfiles({});
        setStaffProfiles({});
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (workflowFilter !== "all" && (o.imaging_workflow_status || "scheduled") !== workflowFilter) return false;
      if (statusFilter !== "all" && (o.status || "pending") !== statusFilter) return false;

      if (!q) return true;

      const pn = o.referral_number || "";
      const patientName = asName(patientProfiles[o.patient_id]).toLowerCase();
      const { examName, modality } = pickExam(o.attachments, o.reason);
      return (
        pn.toLowerCase().includes(q) ||
        patientName.includes(q) ||
        String(examName).toLowerCase().includes(q) ||
        String(modality).toLowerCase().includes(q)
      );
    });
  }, [orders, query, workflowFilter, statusFilter, patientProfiles]);

  const staffOptions = useMemo(() => {
    return staff
      .filter((s) => s.status === "active")
      .map((s) => ({
        id: s.id,
        label: `${asName(staffProfiles[s.user_id])} • ${s.staff_role}`,
      }));
  }, [staff, staffProfiles]);

  const saveOrder = async (id: string, patch: Partial<ReferralRow>) => {
    setSavingId(id);
    try {
      const { error } = await supabase.from("referrals").update(patch).eq("id", id);
      if (error) throw error;

      setOrders((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      toast.success("Order updated");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update order");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <CardTitle>Orders Control</CardTitle>
            <CardDescription>Search, assign staff, and update workflow/status without leaving the dashboard</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Button variant="outline" size="sm" onClick={fetchAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Search</Label>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Referral #, patient, exam, modality..." />
            </div>

            <div className="space-y-1">
              <Label>Workflow</Label>
              <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Workflow" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {WORKFLOW_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {REFERRAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referral</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Preferred</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="py-10 text-center text-muted-foreground">No matching orders.</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((o) => {
                    const patientName = asName(patientProfiles[o.patient_id]);
                    const { examName, modality } = pickExam(o.attachments, o.reason);
                    const wf = o.imaging_workflow_status || "scheduled";
                    const st = o.status || "pending";
                    const assigned = staff.find((s) => s.id === o.assigned_imaging_staff_id) || null;
                    const assignedLabel = assigned ? `${asName(staffProfiles[assigned.user_id])} • ${assigned.staff_role}` : "—";

                    return (
                      <TableRow key={o.id}>
                        <TableCell>
                          <div className="font-medium">{o.referral_number || `IMG-${o.id.slice(0, 8).toUpperCase()}`}</div>
                          <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                        </TableCell>

                        <TableCell>{patientName}</TableCell>

                        <TableCell>
                          <div className="font-medium">{examName}</div>
                          <div className="text-xs text-muted-foreground">{modality}</div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">{o.preferred_date || "—"}</div>
                          <div className="text-xs text-muted-foreground">{o.preferred_time_slot || "—"}</div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={st === "completed" ? "default" : st === "declined" ? "destructive" : "outline"}>{st}</Badge>
                        </TableCell>

                        <TableCell>
                          <Badge variant={wf === "completed" ? "default" : wf === "cancelled" ? "destructive" : "secondary"}>{wf}</Badge>
                        </TableCell>

                        <TableCell className="max-w-[220px] truncate">{assignedLabel}</TableCell>

                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Manage
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Manage Order</DialogTitle>
                              </DialogHeader>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                  <Label>Status</Label>
                                  <Select
                                    value={st}
                                    onValueChange={(v) => saveOrder(o.id, { status: v })}
                                    disabled={savingId === o.id}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {REFERRAL_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                          {s}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Workflow</Label>
                                  <Select
                                    value={wf}
                                    onValueChange={(v) => saveOrder(o.id, { imaging_workflow_status: v })}
                                    disabled={savingId === o.id}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {WORKFLOW_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                          {s}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Assign Staff</Label>
                                  <Select
                                    value={o.assigned_imaging_staff_id || "none"}
                                    onValueChange={(v) => saveOrder(o.id, { assigned_imaging_staff_id: v === "none" ? null : v })}
                                    disabled={savingId === o.id}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select staff" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Unassigned</SelectItem>
                                      {staffOptions.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                          {s.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Priority</Label>
                                  <Select
                                    value={o.priority || "routine"}
                                    onValueChange={(v) => saveOrder(o.id, { priority: v })}
                                    disabled={savingId === o.id}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="routine">routine</SelectItem>
                                      <SelectItem value="urgent">urgent</SelectItem>
                                      <SelectItem value="stat">stat</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                  <Label>Clinical Notes</Label>
                                  <Textarea value={o.clinical_notes || ""} readOnly className="min-h-[80px]" />
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                  <Label>Result Notes</Label>
                                  <Textarea
                                    defaultValue={o.result_notes || ""}
                                    className="min-h-[120px]"
                                    onBlur={(e) => {
                                      const v = e.currentTarget.value;
                                      if ((o.result_notes || "") !== v) saveOrder(o.id, { result_notes: v || null });
                                    }}
                                    disabled={savingId === o.id}
                                  />
                                  <div className="text-xs text-muted-foreground">
                                    Tip: result notes are used in reports and analytics turnaround calculations.
                                  </div>
                                </div>

                                <div className="md:col-span-2 flex items-center justify-end gap-2">
                                  <Button variant="outline" onClick={() => fetchAll()} disabled={savingId === o.id}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Reload
                                  </Button>
                                  <Button disabled>
                                    <Save className="h-4 w-4 mr-2" />
                                    Auto-saved
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
