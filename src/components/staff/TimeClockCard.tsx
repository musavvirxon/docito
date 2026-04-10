// File: src/components/staff/TimeClockCard.tsx
// Step 33: Simple time clock UI for staff (clock in/out) — consistent styling

import { useEffect, useMemo, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, LogOut, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";

type FinanceEntityType = "clinic" | "practice" | "lab" | "imaging" | "pharmacy";

type Props = {
  entityType: FinanceEntityType;
  entityId: string;
};

type SessionRow = {
  id: string;
  entity_type: FinanceEntityType;
  entity_id: string;
  staff_user_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
};

function formatDurationMinutes(mins: number) {
  const m = Math.max(0, Math.floor(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
}

export default function TimeClockCard({ entityType, entityId }: Props) {
  const { t } = useTranslation('dashboard');
  const [loading, setLoading] = useState(false);
  const [openSession, setOpenSession] = useState<SessionRow | null>(null);

  const [tick, setTick] = useState(0);

  const elapsedMinutes = useMemo(() => {
    if (!openSession) return 0;
    const start = new Date(openSession.clock_in_at).getTime();
    const now = Date.now();
    if (!Number.isFinite(start)) return 0;
    return Math.max(0, Math.floor((now - start) / 60000));
  }, [openSession, tick]);

  const fetchOpenSession = async () => {
    try {
      const { data: userResp, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userResp?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("staff_time_sessions")
        .select("id,entity_type,entity_id,staff_user_id,clock_in_at,clock_out_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("staff_user_id", uid)
        .is("clock_out_at", null)
        .order("clock_in_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      setOpenSession((data && data.length > 0 ? (data[0] as SessionRow) : null) ?? null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load time clock");
    }
  };

  const clockIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("staff-clock", {
        body: { action: "clock_in", entityType, entityId, source: "web" },
      });
      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error || "Clock in failed");

      toast.success("Clocked in");
      await fetchOpenSession();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to clock in");
    } finally {
      setLoading(false);
    }
  };

  const clockOut = async () => {
    if (!openSession) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("staff-clock", {
        body: { action: "clock_out", sessionId: openSession.id },
      });
      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error || "Clock out failed");

      toast.success(`Clocked out · ${formatDurationMinutes(Number((data as any)?.minutesWorked || 0))}`);
      await fetchOpenSession();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to clock out");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOpenSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  useEffect(() => {
    if (!openSession) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, [openSession]);

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          {t('staff.timeClock.title', 'Time clock')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {openSession ? (
          <div className="space-y-2">
            <div className="text-sm">
              {t('staff.timeClock.clockedIn', 'You are')} <span className="font-medium">{t('staff.timeClock.clockedInStatus', 'clocked in')}</span>{" "}
              <span className="text-muted-foreground">({formatDurationMinutes(elapsedMinutes)} {t('staff.timeClock.soFar', 'so far')})</span>
            </div>

            <Button onClick={() => void clockOut()} disabled={loading} className="gap-2 w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {t('staff.timeClock.clockOut', 'Clock out')}
            </Button>

            <div className="text-xs text-muted-foreground">
              {t('staff.timeClock.started', 'Started')}: {new Date(openSession.clock_in_at).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">{t('staff.timeClock.notClockedIn', 'You are not clocked in.')}</div>

            <Button onClick={() => void clockIn()} disabled={loading} className="gap-2 w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {t('staff.timeClock.clockIn', 'Clock in')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
