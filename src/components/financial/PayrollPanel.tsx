// File: src/components/financial/PayrollPanel.tsx

import { useMemo, useState } from "react";
import { RefreshCw, Wand2, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import type { FinanceEntityType } from "@/components/financial/FinanceHub";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type PreviewItem = {
  userId: string;
  compensationProfileId: string;
  minutesWorked: number | null;
  units: number | null;
  amountCents: number;
  currency: string;
  details: any;
};

type PreviewResponse = {
  ok: boolean;
  error?: string;
  mode: "preview" | "create";
  entityType: FinanceEntityType;
  entityId: string;
  currency: string;
  period: {
    periodStart: string;
    periodEndExclusive: string;
    days: number;
  };
  items: PreviewItem[];
  totals: {
    totalCents: number;
    staffCount: number;
  };
  warnings: string[];
};

const formatCurrency = (cents: number, currency: string = "USD") => {
  const value = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function firstDayOfThisMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function firstDayOfNextMonth() {
  const d = firstDayOfThisMonth();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
}

interface PayrollPanelProps {
  entityType: FinanceEntityType;
  entityId: string;
}

export default function PayrollPanel({ entityType, entityId }: PayrollPanelProps) {
  const [periodStart, setPeriodStart] = useState(() => toIsoDate(firstDayOfThisMonth()));
  const [periodEndExclusive, setPeriodEndExclusive] = useState(() => toIsoDate(firstDayOfNextMonth()));
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const currency = preview?.currency || "USD";
  const total = preview?.totals?.totalCents || 0;

  const warnings = useMemo(() => preview?.warnings || [], [preview]);

  const runPreview = async () => {
    if (!entityType || !entityId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<PreviewResponse>("payroll-run-generate", {
        body: {
          entityType,
          entityId,
          periodStart,
          periodEndExclusive,
          mode: "preview",
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to preview payroll");
      setPreview(data);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to preview payroll");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const createRun = async () => {
    if (!entityType || !entityId) return;
    const ok = window.confirm("Create payroll run and post items to the finance ledger?");
    if (!ok) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<any>("payroll-run-generate", {
        body: {
          entityType,
          entityId,
          periodStart,
          periodEndExclusive,
          mode: "create",
          postToLedger: true,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to create payroll run");

      toast.success(`Payroll run created (${data.itemsCount || 0} items)`);
      await runPreview();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create payroll run");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <ReceiptText className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Payroll</h3>
          <Badge variant="secondary">Runs</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={runPreview} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Preview
          </Button>
          <Button onClick={createRun} disabled={loading} className="gap-2">
            <Wand2 className="w-4 h-4" />
            Create run
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Run period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Period start</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label>Period end (exclusive)</Label>
              <Input
                type="date"
                value={periodEndExclusive}
                onChange={(e) => setPeriodEndExclusive(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Tip: for monthly salary, use <span className="font-medium">first day of month → first day of next month</span>.
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(total, currency)}</div>
            <div className="text-xs text-muted-foreground">{preview?.totals?.staffCount || 0} staff</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Warnings</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {warnings.length === 0 ? (
              <div className="text-sm text-muted-foreground">No warnings.</div>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                {warnings.slice(0, 6).map((w, idx) => (
                  <li key={idx} className="text-muted-foreground">
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">User</TableHead>
                  <TableHead className="w-[140px]">Type</TableHead>
                  <TableHead className="w-[140px]">Hours</TableHead>
                  <TableHead className="text-right w-[170px]">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}

                {!loading && (!preview || preview.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      No preview yet. Click “Preview”.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  preview?.items?.map((it) => {
                    const t = it.details?.compensationType || "—";
                    const hours =
                      it.minutesWorked != null ? Math.round(((it.minutesWorked || 0) / 60) * 100) / 100 : null;

                    return (
                      <TableRow key={`${it.userId}-${it.compensationProfileId}`}>
                        <TableCell className="text-sm font-medium">{it.userId}</TableCell>
                        <TableCell className="text-sm capitalize">{t}</TableCell>
                        <TableCell className="text-sm">
                          {hours == null ? <span className="text-muted-foreground">—</span> : `${hours}`}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(it.amountCents, it.currency || currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
