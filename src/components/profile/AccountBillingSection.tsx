// File: src/components/profile/AccountBillingSection.tsx

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreditCard, RefreshCw, Receipt } from "lucide-react";
import { toast } from "sonner";

type PaymentMethod = {
  id: string;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean | null;
  created_at: string;
};

type Invoice = {
  id: string;
  status: string;
  currency: string;
  total_amount: number;
  created_at: string;
  issued_at: string | null;
  paid_at: string | null;
  practice_id: string | null;
  appointment_id: string | null;
};

type BillingSummaryResponse = {
  payment_methods?: PaymentMethod[];
  invoices?: Invoice[];
  summary?: {
    total_due?: number;
    total_paid?: number;
    overdue_count?: number;
    default_payment_method_id?: string | null;
  };
};

function formatMoney(amount: number, currency: string) {
  const n = Number(amount || 0);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: String(currency || "USD").toUpperCase(),
  }).format(n);
}

export default function AccountBillingSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<BillingSummaryResponse | null>(null);

  const load = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("patient-billing", {
        body: { action: "get_summary" },
      });
      if (error) throw error;
      setData((data || {}) as BillingSummaryResponse);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load billing data");
      setData(null);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const currency = useMemo(() => {
    const inv = data?.invoices?.find((i) => i.currency)?.currency;
    return inv || "USD";
  }, [data]);

  const paymentMethods = data?.payment_methods || [];
  const invoices = data?.invoices || [];

  const totals = useMemo(() => {
    const totalPaid = Number(data?.summary?.total_paid ?? 0);
    const totalDue = Number(data?.summary?.total_due ?? 0);
    const overdue = Number(data?.summary?.overdue_count ?? 0);
    return { totalPaid, totalDue, overdue };
  }, [data]);

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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Billing</h3>
          <p className="text-sm text-muted-foreground">Your payment methods and invoice history.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totals.totalPaid, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totals.totalDue, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.overdue}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Payment methods
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentMethods.length === 0 ? (
            <div className="text-sm text-muted-foreground">No saved payment methods yet.</div>
          ) : (
            <div className="space-y-2">
              {paymentMethods
                .slice()
                .sort((a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default)))
                .map((pm) => (
                  <div key={pm.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="font-medium">
                        {String(pm.brand || "card").toUpperCase()} •••• {pm.last4 || "????"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Expires {pm.exp_month ?? "??"}/{pm.exp_year ?? "????"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">{pm.is_default ? <Badge variant="default">Default</Badge> : null}</div>
                  </div>
                ))}
            </div>
          )}

          <Separator />
          <div className="text-xs text-muted-foreground">Add / update payment methods from the checkout flow when you pay an invoice.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-sm text-muted-foreground">No invoices yet.</div>
          ) : (
            <div className="space-y-2">
              {invoices.slice(0, 20).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">Invoice #{inv.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={inv.status === "paid" ? "default" : inv.status === "issued" ? "secondary" : "outline"}>{inv.status}</Badge>
                    <div className="font-semibold">{formatMoney(inv.total_amount, inv.currency)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
