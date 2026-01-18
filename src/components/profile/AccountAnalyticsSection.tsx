// File: src/components/profile/AccountAnalyticsSection.tsx

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type RangeKey = "7" | "30" | "90";

type AccountAnalytics = {
  window_days: number;
  patient?: {
    appointments_total: number;
    appointments_upcoming: number;
    appointments_completed: number;
    invoices_count: number;
    invoices_total_amount: number;
    invoices_paid_amount: number;
    payments_total_amount: number;
  };
  provider?: {
    doctor_id: string | null;
    appointments_total: number;
    appointments_upcoming: number;
    appointments_completed: number;
  };
};

function formatMoney(amount: number, currency = "USD") {
  const n = Number(amount || 0);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: String(currency || "USD").toUpperCase(),
  }).format(n);
}

export default function AccountAnalyticsSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeDays, setRangeDays] = useState<RangeKey>("30");
  const [data, setData] = useState<AccountAnalytics | null>(null);

  const load = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("account-analytics", {
        body: { days: Number(rangeDays) },
      });
      if (error) throw error;
      setData((data || null) as any);
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
  }, [user?.id, rangeDays]);

  const patient = data?.patient;
  const provider = data?.provider;

  const currency = useMemo(() => "USD", []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="h-24 animate-pulse bg-muted rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="h-48 animate-pulse bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Analytics
          </h3>
          <p className="text-sm text-muted-foreground">Your activity and billing summary over time.</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={rangeDays} onValueChange={(v) => setRangeDays(v as RangeKey)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patient?.appointments_total ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {patient?.appointments_upcoming ?? 0} upcoming • {patient?.appointments_completed ?? 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(patient?.payments_total_amount ?? 0, currency)}</div>
            <p className="text-xs text-muted-foreground">Total paid in the selected window</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patient?.invoices_count ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatMoney(patient?.invoices_paid_amount ?? 0, currency)} paid • {formatMoney(patient?.invoices_total_amount ?? 0, currency)} total
            </p>
          </CardContent>
        </Card>
      </div>

      {provider?.doctor_id ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-2xl font-bold">{provider.appointments_total}</div>
                <div className="text-xs text-muted-foreground">Appointments (as doctor)</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{provider.appointments_upcoming}</div>
                <div className="text-xs text-muted-foreground">Upcoming</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{provider.appointments_completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
