// File: src/components/financial/PayrollRunsPanel.tsx
// Step 32: Minimal UI to create payroll run + mark paid (creates finance ledger payroll entry)

import { useEffect, useMemo, useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, BadgeCheck, CreditCard, CalendarDays } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type FinanceEntityType = "clinic" | "lab" | "imaging" | "pharmacy";

type PayrollRunRow = {
  id: string;
  entity_type: FinanceEntityType;
  entity_id: string;
  period_start: string;
  period_end: string;
  payout_date: string;
  currency: string;
  status: "draft" | "approved" | "paid" | "void";
  total_gross_cents: number;
  total_net_cents: number;
  total_deductions_cents: number;
  finance_entry_id: string | null;
  created_at: string;
};

function yyyyMmDd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMoney(currency: string, cents: number) {
  const value = (Number(cents || 0) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function parseMoneyToCents(input: string) {
  const s = String(input || "").trim();
  if (!s) return null;
  const normalized = s.replace(/,/g, ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return Math.round(n * 100);
}

export default function PayrollRunsPanel(props: { entityType: FinanceEntityType; entityId: string }) {
  const { entityType, entityId } = props;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PayrollRunRow[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return yyyyMmDd(d);
  });
  const [periodEnd, setPeriodEnd] = useState(() => yyyyMmDd(new Date()));
  const [payoutDate, setPayoutDate] = useState(() => yyyyMmDd(new Date()));
  const [currency, setCurrency] = useState("USD");
  const [grossAmount, setGrossAmount] = useState(""); // optional; can be 0 if items will be added later

  const canCreate = useMemo(() => {
    if (!entityId) return false;
    if (!periodStart || !periodEnd || !payoutDate) return false;
    if (new Date(periodStart) > new Date(periodEnd)) return false;
    if (!currency.trim()) return false;
    if (grossAmount.trim()) {
      const cents = parseMoneyToCents(grossAmount);
      if (cents === null) return false;
    }
    return true;
  }, [currency, entityId, grossAmount, payoutDate, periodEnd, periodStart]);

  const fetchRuns = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance_payroll_runs")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(25);

      if (error) throw error;
      setRows((data || []) as PayrollRunRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load payroll runs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const createRun = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const { data: userResp, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userResp?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const grossCents = grossAmount.trim() ? parseMoneyToCents(grossAmount)! : 0;

      const { error } = await supabase.from("finance_payroll_runs").insert({
        entity_type: entityType,
        entity_id: entityId,
        period_start: periodStart,
        period_end: periodEnd,
        payout_date: payoutDate,
        currency: currency.trim().toUpperCase(),
        status: "draft",
        total_gross_cents: grossCents,
        total_net_cents: 0,
        total_deductions_cents: 0,
        created_by: uid,
      });

      if (error) throw error;

      toast.success("Payroll run created");
      setDialogOpen(false);
      setGrossAmount("");
      await fetchRuns();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create payroll run");
    } finally {
      setCreating(false);
    }
  };

  const payRun = async (runId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("finance-payroll-pay", {
        body: { runId },
      });
      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error || "Failed to pay payroll");

      toast.success("Payroll marked as paid (ledger updated)");
      await fetchRuns();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to mark payroll as paid");
    }
  };

  useEffect(() => {
    void fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-base">Payroll</CardTitle>
          <div className="text-sm text-muted-foreground">
            Create a payroll run and mark it paid to automatically post a payroll ledger entry.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void fetchRuns()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New run
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <UiDialogHeader>
                <UiDialogTitle>Create payroll run</UiDialogTitle>
                <DialogDescription>
                  Start with a draft run. You can add staff items later. Marking paid posts a payroll expense to the finance ledger.
                </DialogDescription>
              </UiDialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    Period start
                  </Label>
                  <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    Period end
                  </Label>
                  <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Payout date
                  </Label>
                  <Input type="date" value={payoutDate} onChange={(e) => setPayoutDate(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Input placeholder="USD" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label>Optional gross total (you can leave blank and add staff items later)</Label>
                  <Input inputMode="decimal" placeholder="0.00" value={grossAmount} onChange={(e) => setGrossAmount(e.target.value)} />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={() => void createRun()} disabled={!canCreate || creating} className="gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No payroll runs yet.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const paid = r.status === "paid";
              const canPay = r.status !== "paid" && r.status !== "void";
              const label = `${r.period_start} → ${r.period_end}`;
              const gross = formatMoney(r.currency || "USD", r.total_gross_cents || 0);

              return (
                <div
                  key={r.id}
                  className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {label}{" "}
                      <span className="text-xs text-muted-foreground">
                        · payout {r.payout_date} · {gross}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      status: <span className="font-medium">{r.status}</span>
                      {paid && r.finance_entry_id ? (
                        <span className="ml-2">· ledger entry linked</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={paid ? "outline" : "default"}
                      disabled={!canPay}
                      onClick={() => void payRun(r.id)}
                      className="gap-2"
                    >
                      <BadgeCheck className="h-4 w-4" />
                      {paid ? "Paid" : "Mark paid"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
