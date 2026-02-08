// File: src/components/staff/AttendanceAdminPanel.tsx
// Step 34: Admin/Manager attendance review + approve daily attendance rows
// - Reads staff_daily_attendance rows for a date range
// - Allows setting is_approved + approved_by + approved_at
// - Uses existing RLS (can_access_entity required for entity admins)

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, CheckCircle2, XCircle, CalendarDays } from "lucide-react";

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type AttendanceRow = {
  id: string;
  entity_type: FinanceEntityType;
  entity_id: string;
  staff_user_id: string;
  work_date: string; // YYYY-MM-DD
  minutes_worked: number;
  first_clock_in_at: string | null;
  last_clock_out_at: string | null;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
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

  const fromIso = useMemo(() => new Date(`${fromDate}T00:00:00`).toISOString(), [fromDate]);
  const toIsoExclusive = useMemo(() => {
    const d = new Date(`${toDate}T00:00:00`);
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }, [toDate]);

  const unapprovedCount = useMemo(() => rows.filter((r) => !r.is_approved).length, [rows]);

  const fetchRows = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff_daily_attendance")
        .select(
          "id,entity_type,entity_id,staff_user_id,work_date,minutes_worked,first_clock_in_at,last_clock_out_at,is_approved,approved_by,approved_at,created_at",
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

      // Batch update (best-effort; split if needed)
      const chunks: string[][] = [];
      for (let i = 0; i < pending.length; i += 100) chunks.push(pending.slice(i, i + 100));

      for (const ids of chunks) {
        const { error } = await supabase
          .from("staff_daily_attendance")
          .update({ is_approved: true, approved_by: uid, approved_at: nowIso })
          .in("id", ids);

        if (error) throw error;
      }

      setRows((prev) => prev.map((r) => (r.is_approved ? r : { ...r, is_approved: true, approved_by: uid, approved_at: nowIso })));
      toast.success(`Approved ${pending.length} day(s)`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to approve all");
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
            {rows.map((r) => (
              <div key={r.id} className="rounded-md border p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {r.work_date} · {minutesToHoursLabel(Number(r.minutes_worked || 0))}
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
                </div>

                <div className="flex items-center gap-2">
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
            ))}
          </div>
        )}

        <div className="rounded-md border p-3 bg-muted/20">
          <div className="text-sm font-medium">Notes</div>
          <div className="text-xs text-muted-foreground mt-1 space-y-1">
            <div>• Staff clock in/out writes sessions and daily totals automatically.</div>
            <div>• Approval is required for clean payroll periods (hourly calculations will use approved days).</div>
            <div>• If you need manual edits (minutes override), we’ll add that in the next step.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
