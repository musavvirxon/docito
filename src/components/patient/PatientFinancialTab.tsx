import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, RefreshCw, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useCurrency } from "@/hooks/useCurrency";
import { usePatientLedger, type LedgerRow } from "@/hooks/usePatientLedger";

interface Props {
  /** Patient auth user id, or manual (doctor_patients) id */
  patientId?: string | null;
  className?: string;
}

interface DisplayRow extends LedgerRow {
  chargeMajor: number;
  paymentMajor: number;
  running: number;
}

export function PatientFinancialTab({ patientId, className }: Props) {
  const { t } = useTranslation("finance");
  const { format: fmt, convert, currency: displayCurrency } = useCurrency();
  const { rows, loading, error, refresh } = usePatientLedger(patientId);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Convert every row into the viewer's display currency, then accumulate the
  // running balance chronologically (oldest → newest).
  const chronological = useMemo<DisplayRow[]>(() => {
    let running = 0;
    return rows.map((r) => {
      const src = (r.currency || displayCurrency).toUpperCase();
      const chargeMajor = convert(Number(r.charge_cents) / 100, src, displayCurrency);
      const paymentMajor = convert(Number(r.payment_cents) / 100, src, displayCurrency);
      running += chargeMajor - paymentMajor;
      return { ...r, chargeMajor, paymentMajor, running };
    });
  }, [rows, convert, displayCurrency]);

  const outstanding = chronological.length
    ? chronological[chronological.length - 1].running
    : 0;

  const visible = useMemo(() => {
    const filtered = chronological.filter((r) => {
      const d = new Date(r.entry_date);
      if (from && d < new Date(`${from}T00:00:00`)) return false;
      if (to && d > new Date(`${to}T23:59:59`)) return false;
      return true;
    });
    return [...filtered].reverse(); // newest first
  }, [chronological, from, to]);

  const credit = outstanding < -0.005 ? -outstanding : 0;
  const settled = outstanding <= 0.005;


  const label = (r: DisplayRow) => {
    if (r.kind === "opening") return t("ledger.openingBalance", "Opening balance");
    if (r.kind === "payment")
      return r.description && r.description !== "Payment"
        ? r.description
        : t("ledger.payment", "Payment");
    if (r.kind === "discount")
      return r.description || t("discount", "Discount");
    return r.description || t("ledger.charge", "Charge");
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Outstanding balance */}
      <Card
        className={cn(
          "border",
          settled ? "border-border" : "border-destructive/40 bg-destructive/5",
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {t("ledger.outstandingBalance", "Outstanding balance")}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={refresh} aria-label={t("refresh")}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "text-3xl font-bold tabular-nums",
                  settled ? "text-muted-foreground" : "text-destructive",
                )}
              >
                {fmt(Math.max(outstanding, 0))}
              </span>
              {settled ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("ledger.settled", "Settled")}
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t("outstanding")}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ledger */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{t("ledger.title", "Ledger")}</CardTitle>
            {chronological.length > 5 && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="grid gap-1">
                  <Label className="text-[11px] text-muted-foreground">{t("from")}</Label>
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-8 w-[140px]"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[11px] text-muted-foreground">{t("to")}</Label>
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-8 w-[140px]"
                  />
                </div>
                {(from || to) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFrom("");
                      setTo("");
                    }}
                  >
                    {t("all")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{t("loadFailed")}</p>
          ) : visible.length === 0 ? (
            <div className="py-10 text-center">
              <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("ledger.empty", "No charges or payments recorded yet.")}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="py-2 text-left font-medium">{t("date")}</th>
                      <th className="py-2 text-left font-medium">{t("description")}</th>
                      <th className="py-2 text-right font-medium">{t("ledger.charge", "Charge")}</th>
                      <th className="py-2 text-right font-medium">{t("ledger.payment", "Payment")}</th>
                      <th className="py-2 text-right font-medium">
                        {t("ledger.runningBalance", "Balance")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr key={r.entry_id} className="border-b last:border-0">
                        <td className="py-2 whitespace-nowrap text-muted-foreground">
                          {new Date(r.entry_date).toLocaleDateString()}
                        </td>
                        <td className="py-2">
                          <span className="line-clamp-1">{label(r)}</span>
                          {r.method && (
                            <span className="text-xs text-muted-foreground">
                              {" "}
                              · {t(`dialog.methods.${r.method}`, r.method)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {r.chargeMajor !== 0 ? fmt(r.chargeMajor) : "—"}
                        </td>
                        <td className="py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          {r.paymentMajor !== 0 ? fmt(r.paymentMajor) : "—"}
                        </td>
                        <td className="py-2 text-right font-medium tabular-nums">
                          {fmt(r.running)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {visible.map((r) => (
                  <div key={r.entry_id} className="rounded-md border px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{label(r)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.entry_date).toLocaleDateString()}
                          {r.method ? ` · ${t(`dialog.methods.${r.method}`, r.method)}` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular-nums",
                          r.paymentMajor > 0 && "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {r.paymentMajor > 0
                          ? `− ${fmt(r.paymentMajor)}`
                          : `+ ${fmt(r.chargeMajor)}`}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("ledger.runningBalance", "Balance")}:{" "}
                      <span className="font-medium tabular-nums text-foreground">
                        {fmt(r.running)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PatientFinancialTab;
