import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, CheckCircle2, XCircle, CalendarDays, PencilLine, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type AttendanceRow = {
  id: string;
  entity_type: FinanceEntityType;
  entity_id: string;
  staff_user_id: string;
  work_date: string; // YYYY-MM-DD
  minutes_worked: number;
  minutes_override: number | null;
  override_reason: string | null;
  override_by: string | null;
  override_at: string | null;

  first_clock_in_at: string | null;
  last_clock_out_at: string | null;

  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;

  created_at: string;
};

type AuditRow = {
  id: string;
  action: string;
  before: any;
  after: any;
  created_by: string | null;
  created_at: string;
};

function yyyyMmDd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function minutesToHoursLabel(mins: number) {
  const m = Math.max(0, Math.floor(Number(mins || 0)));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
}

function parseMinutes(v: string) {
  const n = Number(String(v || "").trim());
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return Math.floor(n);
}

export default function AttendanceAdminPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return yyyyMmDd(d);
  });
  const [toDate, setToDate] = useState(() => yyyyMmDd(new Date()));

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AttendanceRow[]>([]);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditTitle, setAuditTitle] = useState("");

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideRow, setOverrideRow] = useState<AttendanceRow | null>(null);
  const [overrideMinutes, setOverrideMinutes] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const unapprovedCount = useMemo(() => rows.filter((r) => !r.is_approved).length, [rows]);

  const fetchRows = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff_daily_attendance")
        .select(
          "id,entity_type,entity_id,staff_user_id,work_date,minutes_worked,minutes_override,override_reason,override_by,override_at,first_clock_in_at,last_clock_out_at,is_approved,approved_by,approved_at,created_at",
        )
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .gte("work_date", fromDate)
        .lte("work_date", toDate)
        .order("work_date", { ascending: false })
        .order("minutes_worked", { ascending: false })
        .limit(500);

      if (error) throw error;

      setRows((data || []) as AttendanceRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load attendance");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const approveRow = async (rowId: string, approve: boolean) => {
    try {
      const { data: userResp, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userResp?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const patch = approve
        ? { is_approved: true, approved_by: uid, approved_at: new Date().toISOString() }
        : { is_approved: false, approved_by: null, approved_at: null };

      const { error } = await supabase.from("staff_daily_attendance").update(patch).eq("id", rowId);
      if (error) throw error;

      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...(patch as any) } : r)));
      toast.success(approve ? "Approved" : "Unapproved");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update approval");
    }
  };

  const approveAll = async () => {
    if (rows.length === 0) return;
    try {
      const { data: userResp, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userResp?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const pending = rows.filter((r) => !r.is_approved).map((r) => r.id);
      if (pending.length === 0) {
        toast.success("No unapproved rows");
        return;
      }

      const nowIso = new Date().toISOString();

      const chunks: string[][] = [];
      for (let i = 0; i < pending.length; i += 100) chunks.push(pending.slice(i, i + 100));

      for (const ids of chunks) {
        const { error } = await supabase
          .from("staff_daily_attendance")
          .update({ is_approved: true, approved_by: uid, approved_at: nowIso })
          .in("id", ids);

        if (error) throw error;
      }

      setRows((prev) =>
        prev.map((r) => (r.is_approved ? r : { ...r, is_approved: true, approved_by: uid, approved_at: nowIso })),
      );
      toast.success(`Approved ${pending.length} day(s)`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to approve all");
    }
  };

  const openOverrideDialog = (r: AttendanceRow) => {
    setOverrideRow(r);
    setOverrideMinutes(String(r.minutes_override ?? r.minutes_worked ?? 0));
    setOverrideReason(r.override_reason ?? "");
    setOverrideOpen(true);
  };

  const saveOverride = async () => {
    if (!overrideRow) return;

    const mins = parseMinutes(overrideMinutes);
    if (mins === null) {
      toast.error("Minutes must be a non-negative number");
      return;
    }

    setOverrideSaving(true);
    try {
      const { error } = await supabase.rpc("staff_attendance_set_override", {
        p_entity_type: overrideRow.entity_type,
        p_entity_id: overrideRow.entity_id,
        p_staff_user_id: overrideRow.staff_user_id,
        p_work_date: overrideRow.work_date,
        p_minutes_override: mins,
        p_reason: overrideReason || null,
      });

      if (error) throw error;

      toast.success("Override saved");
      setOverrideOpen(false);
      await fetchRows();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save override");
    } finally {
      setOverrideSaving(false);
    }
  };

  const clearOverride = async (r: AttendanceRow) => {
    try {
      const { error } = await supabase.rpc("staff_attendance_clear_override", {
        p_entity_type: r.entity_type,
        p_entity_id: r.entity_id,
        p_staff_user_id: r.staff_user_id,
        p_work_date: r.work_date,
      });
      if (error) throw error;

      toast.success("Override cleared");
      await fetchRows();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to clear override");
    }
  };

  const openAudit = async (r: AttendanceRow) => {
    setAuditOpen(true);
    setAuditLoading(true);
    setAuditRows([]);
    setAuditTitle(`${r.work_date} · ${r.staff_user_id}`);

    try {
      const { data, error } = await supabase
        .from("staff_attendance_audit")
        .select("id,action,before,after,created_by,created_at")
        .eq("entity_type", r.entity_type)
        .eq("entity_id", r.entity_id)
        .eq("staff_user_id", r.staff_user_id)
        .eq("work_date", r.work_date)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditRows((data || []) as AuditRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load audit");
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    void fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">Attendance approvals</CardTitle>
          <div className="text-sm text-muted-foreground">
            Review daily totals from staff clock-ins/outs. Approve rows before payroll calculation.
            {unapprovedCount > 0 ? <span className="ml-2 font-medium">({unapprovedCount} pending)</span> : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            />
          </div>

          <Button variant="outline" onClick={() => void fetchRows()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>

          <Button onClick={() => void approveAll()} disabled={loading || unapprovedCount === 0} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Approve all
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading attendance…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No attendance records in this range.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const effectiveMinutes = r.minutes_override ?? r.minutes_worked ?? 0;
              return (
                <div key={r.id} className="rounded-md border p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {r.work_date} · {minutesToHoursLabel(Number(effectiveMinutes))}
                      {r.minutes_override !== null ? (
                        <span className="ml-2 text-xs text-muted-foreground">· override applied</span>
                      ) : null}
                      {r.is_approved ? (
                        <span className="ml-2 text-xs text-muted-foreground">· approved</span>
                      ) : (
                        <span className="ml-2 text-xs text-muted-foreground">· pending</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      staff: <span className="font-mono">{r.staff_user_id}</span>
                      {r.first_clock_in_at ? (
                        <span className="ml-2">· in {new Date(r.first_clock_in_at).toLocaleTimeString()}</span>
                      ) : null}
                      {r.last_clock_out_at ? (
                        <span className="ml-2">· out {new Date(r.last_clock_out_at).toLocaleTimeString()}</span>
                      ) : null}
                    </div>
                    {r.override_reason ? (
                      <div className="text-xs text-muted-foreground">reason: {r.override_reason}</div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={() => openAudit(r)} className="gap-2">
                      <History className="h-4 w-4" />
                      Audit
                    </Button>

                    <Dialog open={overrideOpen && overrideRow?.id === r.id} onOpenChange={(v) => (v ? openOverrideDialog(r) : setOverrideOpen(false))}>
                      <DialogTrigger asChild>
                        <Button variant="outline" onClick={() => openOverrideDialog(r)} className="gap-2">
                          <PencilLine className="h-4 w-4" />
                          Override
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="max-w-lg">
                        <UiDialogHeader>
                          <UiDialogTitle>Override minutes</UiDialogTitle>
                          <DialogDescription>
                            Set the official minutes worked for payroll. This writes an audit record.
                          </DialogDescription>
                        </UiDialogHeader>

                        <div className="space-y-3">
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <Label>Work date</Label>
                              <Input value={r.work_date} readOnly />
                            </div>
                            <div className="space-y-1">
                              <Label>Staff</Label>
                              <Input value={r.staff_user_id} readOnly />
                            </div>
                          </div>

                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <Label>Minutes (override)</Label>
                              <Input
                                inputMode="numeric"
                                placeholder="e.g. 480"
                                value={overrideMinutes}
                                onChange={(e) => setOverrideMinutes(e.target.value)}
                              />
                              <div className="text-xs text-muted-foreground">
                                Computed minutes: {r.minutes_worked} · Effective: {minutesToHoursLabel(Number(parseMinutes(overrideMinutes) ?? r.minutes_worked))}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label>Reason</Label>
                              <Input
                                placeholder="Optional reason"
                                value={overrideReason}
                                onChange={(e) => setOverrideReason(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <DialogFooter className="gap-2">
                          <Button variant="outline" onClick={() => setOverrideOpen(false)} disabled={overrideSaving}>
                            Cancel
                          </Button>
                          <Button variant="outline" onClick={() => void clearOverride(r)} disabled={overrideSaving || r.minutes_override === null}>
                            Clear
                          </Button>
                          <Button onClick={() => void saveOverride()} disabled={overrideSaving} className="gap-2">
                            {overrideSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Save
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {r.is_approved ? (
                      <Button variant="outline" onClick={() => void approveRow(r.id, false)} className="gap-2">
                        <XCircle className="h-4 w-4" />
                        Unapprove
                      </Button>
                    ) : (
                      <Button onClick={() => void approveRow(r.id, true)} className="gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Audit dialog */}
        <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
          <DialogContent className="max-w-2xl">
            <UiDialogHeader>
              <UiDialogTitle>Attendance audit</UiDialogTitle>
              <DialogDescription>{auditTitle}</DialogDescription>
            </UiDialogHeader>

            {auditLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading audit…
              </div>
            ) : auditRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No audit entries.</div>
            ) : (
              <div className="max-h-[55vh] overflow-auto rounded-md border divide-y">
                {auditRows.map((a) => (
                  <div key={a.id} className="p-3 space-y-1">
                    <div className="text-sm font-medium">
                      {a.action} <span className="text-xs text-muted-foreground">· {new Date(a.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">by: {a.created_by ?? "—"}</div>
                    <pre className="text-xs bg-muted/20 rounded-md p-2 overflow-auto">
{JSON.stringify({ before: a.before, after: a.after }, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setAuditOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="rounded-md border p-3 bg-muted/20">
          <div className="text-sm font-medium">Notes</div>
          <div className="text-xs text-muted-foreground mt-1 space-y-1">
            <div>• Overrides change the effective minutes used for hourly payroll (computed later).</div>
            <div>• Every override writes an audit entry for traceability.</div>
            <div>• Approval still required for payroll periods (override doesn’t auto-approve).</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
