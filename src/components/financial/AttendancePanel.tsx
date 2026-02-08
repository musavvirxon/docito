import { useEffect, useMemo, useState } from "react";
import { Clock, RefreshCw, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

import type { FinanceEntityType } from "@/components/financial/FinanceHub";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ShiftRow = {
  id: string;
  user_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  duration_minutes: number | null;
  is_manual: boolean;
  notes: string | null;
};

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatDuration(mins: number | null) {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

interface AttendancePanelProps {
  entityType: FinanceEntityType;
  entityId: string;
}

export default function AttendancePanel({ entityType, entityId }: AttendancePanelProps) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ShiftRow[]>([]);
  const [openShift, setOpenShift] = useState<ShiftRow | null>(null);

  const load = async () => {
    if (!entityType || !entityId) return;
    setLoading(true);
    try {
      const { data: shifts, error } = await supabase
        .from("staff_attendance_shifts")
        .select("id,user_id,clock_in_at,clock_out_at,duration_minutes,is_manual,notes")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("clock_in_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const list = (shifts || []) as any as ShiftRow[];
      setRows(list);

      const { data: me } = await supabase.auth.getUser();
      const myId = me?.user?.id;
      if (myId) {
        const found = list.find((r) => r.user_id === myId && r.clock_out_at == null) || null;
        setOpenShift(found);
      } else {
        setOpenShift(null);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load attendance");
      setRows([]);
      setOpenShift(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const meLabel = useMemo(() => {
    return openShift ? "Clocked in" : "Not clocked in";
  }, [openShift]);

  const clock = async (action: "clock_in" | "clock_out") => {
    try {
      const { data, error } = await supabase.functions.invoke("attendance-clock", {
        body: {
          entityType,
          entityId,
          action,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Attendance action failed");

      toast.success(action === "clock_in" ? "Clocked in" : "Clocked out");
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Attendance action failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Attendance</h3>
          <Badge variant="secondary">{meLabel}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>

          {openShift ? (
            <Button onClick={() => clock("clock_out")} disabled={loading} className="gap-2">
              <LogOut className="w-4 h-4" />
              Clock out
            </Button>
          ) : (
            <Button onClick={() => clock("clock_in")} disabled={loading} className="gap-2">
              <LogIn className="w-4 h-4" />
              Clock in
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent shifts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[190px]">Clock in</TableHead>
                  <TableHead className="w-[190px]">Clock out</TableHead>
                  <TableHead className="w-[140px]">Duration</TableHead>
                  <TableHead className="w-[120px]">Manual</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Loading shifts…
                    </TableCell>
                  </TableRow>
                )}

                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      No shifts yet.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{formatDateTime(r.clock_in_at)}</TableCell>
                      <TableCell className="text-sm">
                        {r.clock_out_at ? (
                          formatDateTime(r.clock_out_at)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{formatDuration(r.duration_minutes)}</TableCell>
                      <TableCell className="text-sm">{r.is_manual ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.notes || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
