// File: src/components/profile/AccountAnalyticsSection.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RefreshCw, TrendingUp, Calendar, Receipt, Activity } from "lucide-react";
import { toast } from "sonner";

type AnalyticsPayload = {
  window_days: number;
  patient: {
    appointments_total: number;
    appointments_upcoming: number;
    appointments_completed: number;
    invoices_count: number;
    invoices_total_amount: number;
    invoices_paid_amount: number;
    payments_total_amount: number;
  };
  provider: {
    doctor_id: string | null;
    appointments_total: number;
    appointments_upcoming: number;
    appointments_completed: number;
  };
};

function money(n: number) {
  const v = Number(n || 0);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v);
}

export default function AccountAnalyticsSection() {
  const { user } = useAuth();
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  const load = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("account-dashboard", {
        body: { action: "analytics", days },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data?.error || "Failed to load analytics");
      setData((data?.data || null) as AnalyticsPayload | null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load analytics");
      setData(null);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, days]);

  const isDoctor = useMemo(() => Boolean(data?.provider?.doctor_id), [data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const patient = data?.patient;
  const provider = data?.provider;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Analytics</h3>
          <p className="text-sm text-muted-foreground">A lightweight snapshot for the last {days} days.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={days === 7 ? "default" : "outline"} size="sm" onClick={() => setDays(7)}>
            7d
          </Button>
          <Button variant={days === 30 ? "default" : "outline"} size="sm" onClick={() => setDays(30)}>
            30d
          </Button>
          <Button variant={days === 90 ? "default" : "outline"} size="sm" onClick={() => setDays(90)}>
            90d
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {!data ? (
        <Card className="rounded-2xl">
          <CardContent className="p-6 text-sm text-muted-foreground">No analytics available yet.</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Appointments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">{patient?.appointments_total ?? 0}</div>
                <div className="text-xs text-muted-foreground">
                  Upcoming: {patient?.appointments_upcoming ?? 0} • Completed: {patient?.appointments_completed ?? 0}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Invoices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">{patient?.invoices_count ?? 0}</div>
                <div className="text-xs text-muted-foreground">
                  Total: {money(patient?.invoices_total_amount ?? 0)} • Paid: {money(patient?.invoices_paid_amount ?? 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">{money(patient?.payments_total_amount ?? 0)}</div>
                <div className="text-xs text-muted-foreground">Total paid amount in window</div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Provider view
              </CardTitle>
              <Badge variant={isDoctor ? "default" : "secondary"}>{isDoctor ? "Doctor" : "Not a doctor"}</Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {isDoctor ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Appointments</div>
                    <div className="text-lg font-semibold text-foreground">{provider?.appointments_total ?? 0}</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Upcoming</div>
                    <div className="text-lg font-semibold text-foreground">{provider?.appointments_upcoming ?? 0}</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">Completed</div>
                    <div className="text-lg font-semibold text-foreground">{provider?.appointments_completed ?? 0}</div>
                  </div>
                </div>
              ) : (
                <div>Your provider analytics will appear here if your account is linked to a doctor profile.</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
