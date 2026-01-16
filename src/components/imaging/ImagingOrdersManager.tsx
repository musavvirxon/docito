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
import { RefreshCw, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagingManualOrderDialog } from "@/components/imaging/ImagingManualOrderDialog";

type ReferralRow = {
  id: string;
  referral_number: string | null;
  status: string | null;
  priority: string | null;
  preferred_date: string | null;
  preferred_time_slot: string | null;

  patient_id: string | null;
  facility_patient_id: string | null;
  patient_name: string | null;
  patient_phone: string | null;

  reason: string | null;
  clinical_notes: string | null;
  attachments: any;
  result_notes: string | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
};

type FacilityPatientRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
};

type OrderStateRow = {
  referral_id: string;
  imaging_center_id: string;
  workflow_status: string;
  priority: string;
  assigned_staff_id: string | null;
  updated_at: string;
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
const PRIORITIES = ["routine", "urgent", "stat"];

export default function ImagingOrdersManager({ centerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [orders, setOrders] = useState<ReferralRow[]>([]);
  const [orderState, setOrderState] = useState<Record<string, OrderStateRow>>({});
  const [patientProfiles, setPatientProfiles] = useState<Record<string, ProfileRow>>({});
  const [facilityPatients, setFacilityPatients] = useState<Record<string, FacilityPatientRow>>({});
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<Record<string, ProfileRow>>({});

  const [query, setQuery] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [manualOpen, setManualOpen] = useState(false);

  const fetchAll = async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      // Orders from referrals (supports registered + walk-in via facility_patient_id)
      const { data: refData, error: refErr } = await supabase
        .from("referrals")
        .select(
          "id, referral_number, status, priority, preferred_date, preferred_time_slot, patient_id, facility_patient_id, patient_name, patient_phone, reason, clinical_notes, attachments, result_notes, created_at, accepted_at, completed_at"
        )
        .eq("receiver_type", "imaging_center")
        .eq("receiver_entity_id", centerId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (refErr) throw refErr;
      const refRows = (refData || []) as ReferralRow[];
      setOrders(refRows);

      const referralIds = refRows.map((r) => r.id);
      const patientIds = Array.from(new Set(refRows.map((r) => r.patient_id).filter(Boolean))) as string[];
      const facilityIds = Array.from(new Set(refRows.map((r) => r.facility_patient_id).filter(Boolean))) as string[];

      // Order state (workflow + assigned staff)
      if (referralIds.length) {
        const { data: stData, error: stErr } = await supabase
          .from("imaging_order_state")
          .select("referral_id, imaging_center_id, workflow_status, priority, assigned_staff_id, updated_at")
          .eq("imaging_center_id", centerId)
          .in("referral_id", referralIds);

        if (stErr) throw stErr;

        const map: Record<string, OrderStateRow> = {};
        for (const s of (stData || []) as OrderStateRow[]) map[s.referral_id] = s;
        setOrderState(map);
      } else {
        setOrderState({});
      }

      // Patient profiles (registered)
      if (patientIds.length) {
        const { data: pData, error: pErr } = await supabase
          .from("profiles")
          .select("user_id, full_name, first_name, last_name")
          .in("user_id", patientIds);

        if (pErr) throw pErr;

        const pMap: Record<string, ProfileRow> = {};
        for (const p of (pData || []) as ProfileRow[]) pMap[p.user_id] = p;
        setPatientProfiles(pMap);
      } else {
        setPatientProfiles({});
      }

      // Facility patients (walk-in)
      if (facilityIds.length) {
        const { data: fData, error: fErr } = await supabase
          .from("facility_patients")
          .select("id, full_name, phone, email")
          .in("id", facilityIds);

        if (fErr) throw fErr;

        const fMap: Record<string, FacilityPatientRow> = {};
        for (const fp of (fData || []) as FacilityPatientRow[]) fMap[fp.id] = fp;
        setFacilityPatients(fMap);
      } else {
        setFacilityPatients({});
      }

      // Staff list for assignment dropdown
      const { data: sData, error: sErr } = await supabase
        .from("imaging_staff")
        .select("id, user_id, staff_role, status")
        .eq("imaging_center_id", centerId)
        .eq("status", "active")
        .order("staff_role", { ascending: true });

      if (sErr) throw sErr;
      const staffRows = (sData || []) as StaffRow[];
      setStaff(staffRows);

      const staffUserIds = staffRows.map((s) => s.user_id);
      if (staffUserIds.length) {
        const { data: spData, error: spErr } = await supabase
          .from("profiles")
          .select("user_id, full_name, first_name, last_name")
          .in("user_id", staffUserIds);

        if (spErr) throw spErr;

        const spMap: Record<string, ProfileRow> = {};
        for (const p of (spData || []) as ProfileRow[]) spMap[p.user_id] = p;
        setStaffProfiles(spMap);
      } else {
        setStaffProfiles({});
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load orders");
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
      const st = orderState[o.id]?.workflow_status || "scheduled";
      const referralStatus = (o.status || "pending").toLowerCase();

      const matchesWorkflow = workflowFilter === "all" || st === workflowFilter;
      const matchesStatus = statusFilter === "all" || referralStatus === statusFilter;

      const patientDisplay =
        (o.facility_patient_id && facilityPatients[o.facility_patient_id]?.full_name) ||
        o.patient_name ||
        (o.patient_id ? asName(patientProfiles[o.patient_id]) : "") ||
        "";

      const exam = pickExam(o.attachments, o.reason);

      const hay = [
        o.referral_number || "",
        exam.examName,
        exam.modality,
        patientDisplay,
        referralStatus,
        st,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !q || hay.includes(q);

      return matchesWorkflow && matchesStatus && matchesQuery;
    });
  }, [orders, orderState, patientProfiles, facilityPatients, query, workflowFilter, statusFilter]);

  const updateWorkflow = async (referralId: string, patch: Partial<OrderStateRow>) => {
    setSavingId(referralId);
    try {
      const existing = orderState[referralId];
      const next: OrderStateRow = {
        referral_id: referralId,
        imaging_center_id: centerId,
        workflow_status: patch.workflow_status || existing?.workflow_status || "scheduled",
        priority: patch.priority || existing?.priority || "routine",
        assigned_staff_id: patch.assigned_staff_id ?? existing?.assigned_staff_id ?? null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("imaging_order_state").upsert(next, { onConflict: "referral_id" });
      if (error) throw error;

      setOrderState((prev) => ({ ...prev, [referralId]: next }));
      toast.success("Order updated");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update order");
    } finally {
      setSavingId(null);
    }
  };

  const updateReferralStatus = async (referralId: string, status: string, resultNotes?: string | null) => {
    setSavingId(referralId);
    try {
      const patch: any = { status };
      if (status === "accepted") patch.accepted_at = new Date().toISOString();
      if (status === "completed") patch.completed_at = new Date().toISOString();
      if (resultNotes !== undefined) patch.result_notes = resultNotes;

      const { error } = await supabase.from("referrals").update(patch).eq("id", referralId);
      if (error) throw error;

      setOrders((prev) => prev.map((o) => (o.id === referralId ? { ...o, ...patch } : o)));
      toast.success("Referral updated");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update referral");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Orders</CardTitle>
            <CardDescription>Manage referrals and imaging workflow for your center.</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setManualOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Manual Order
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-1">
              <Label>Search</Label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by referral #, patient, exam..."
              />
            </div>

            <div className="space-y-2">
              <Label>Workflow</Label>
              <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All workflows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {WORKFLOW_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Referral status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {REFERRAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referral</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((o) => {
                    const st = orderState[o.id]?.workflow_status || "scheduled";
                    const pri = orderState[o.id]?.priority || o.priority || "routine";
                    const assigned = orderState[o.id]?.assigned_staff_id || null;

                    const patientDisplay =
                      (o.facility_patient_id && facilityPatients[o.facility_patient_id]?.full_name) ||
                      o.patient_name ||
                      (o.patient_id ? asName(patientProfiles[o.patient_id]) : "Walk-in");

                    const exam = pickExam(o.attachments, o.reason);

                    const saving = savingId === o.id;

                    return (
                      <TableRow key={o.id}>
                        <TableCell>
                          <div className="font-medium">{o.referral_number || "REF"}</div>
                          <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                        </TableCell>

                        <TableCell className="font-medium">{patientDisplay}</TableCell>

                        <TableCell>
                          <div className="font-medium">{exam.examName}</div>
                          <div className="text-xs text-muted-foreground">{exam.modality}</div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={pri === "stat" ? "destructive" : pri === "urgent" ? "default" : "secondary"}>
                            {pri}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Select
                            value={st}
                            onValueChange={(v) => updateWorkflow(o.id, { workflow_status: v })}
                            disabled={saving}
                          >
                            <SelectTrigger className="w-[160px]">
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
                        </TableCell>

                        <TableCell>
                          <Select
                            value={assigned || "unassigned"}
                            onValueChange={(v) => updateWorkflow(o.id, { assigned_staff_id: v === "unassigned" ? null : v })}
                            disabled={saving}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {staff.map((s) => (
                                <SelectItem key={s.user_id} value={s.user_id}>
                                  {asName(staffProfiles[s.user_id])} · {s.staff_role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell>
                          <Badge variant="secondary">{o.status || "pending"}</Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" disabled={saving}>
                                  Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Order Details</DialogTitle>
                                </DialogHeader>

                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-sm text-muted-foreground">Patient</div>
                                      <div className="font-medium">{patientDisplay}</div>
                                      {o.patient_phone ? (
                                        <div className="text-xs text-muted-foreground mt-1">{o.patient_phone}</div>
                                      ) : null}
                                    </div>
                                    <div>
                                      <div className="text-sm text-muted-foreground">Referral #</div>
                                      <div className="font-medium">{o.referral_number || "REF"}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-muted-foreground">Preferred date</div>
                                      <div className="font-medium">{o.preferred_date || "—"}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-muted-foreground">Preferred time slot</div>
                                      <div className="font-medium">{o.preferred_time_slot || "—"}</div>
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-sm text-muted-foreground mb-2">Clinical notes</div>
                                    <Card className="p-3 bg-muted/50">
                                      <div className="text-sm whitespace-pre-wrap">{o.clinical_notes || "—"}</div>
                                    </Card>
                                  </div>

                                  <div>
                                    <div className="text-sm text-muted-foreground mb-2">Result notes</div>
                                    <ResultNotesEditor
                                      referralId={o.id}
                                      initial={o.result_notes || ""}
                                      saving={savingId === o.id}
                                      onSave={(val) => updateReferralStatus(o.id, o.status || "pending", val)}
                                    />
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Select
                              value={o.status || "pending"}
                              onValueChange={(v) => updateReferralStatus(o.id, v)}
                              disabled={saving}
                            >
                              <SelectTrigger className="w-[150px]">
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

      <ImagingManualOrderDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        imagingCenterId={centerId}
        onCreated={fetchAll}
      />
    </div>
  );
}

function ResultNotesEditor({
  referralId,
  initial,
  saving,
  onSave,
}: {
  referralId: string;
  initial: string;
  saving: boolean;
  onSave: (val: string) => void;
}) {
  const [val, setVal] = useState(initial);

  useEffect(() => {
    setVal(initial);
  }, [initial, referralId]);

  return (
    <div className="space-y-2">
      <Textarea value={val} onChange={(e) => setVal(e.target.value)} rows={4} placeholder="Enter result notes..." />
      <div className="flex justify-end">
        <Button size="sm" onClick={() => onSave(val)} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </div>
  );
}
