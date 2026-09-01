// File: src/components/financial/PayrollCommissionSummary.tsx
//
// Commission-based compensation, surfaced inside the Payroll (salary) section.
// Reads the same event-driven accrual ledger as the Doctor Payments tab, so the
// two views can never disagree. Recording a payout here also posts a payroll
// finance entry, which is what makes commissions show up as payroll cost.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Percent, Wallet } from "lucide-react";

import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import type { FinanceEntityType } from "@/components/financial/FinanceHub";
import { useCompensationProfiles } from "@/hooks/useCompensationProfiles";
import { useDoctorCommissionLedger } from "@/hooks/useDoctorCommissionLedger";
import { useCurrency } from "@/hooks/useCurrency";

type Props = {
  entityType: FinanceEntityType;
  entityId: string;
  currency?: string;
  /** Called after a payout posts a payroll entry so the parent can reload. */
  onPayrollPosted?: () => void;
};

type Row = {
  userId: string;
  name: string;
  rate: number | null;
  percentageOf: string | null;
  accruedCents: number;
  paidCents: number;
  balanceCents: number;
};

function parseMajorToCents(v: string) {
  const s = String(v || "").trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export default function PayrollCommissionSummary({ entityType, entityId, currency, onPayrollPosted }: Props) {
  const { t } = useTranslation("dashboard");
  const { formatCents } = useCurrency();

  const { rows: compProfiles, loading: compLoading } = useCompensationProfiles({ entityType, entityId });
  const {
    totalsByUser,
    accrualsByUser,
    totals,
    loading: ledgerLoading,
    recordPayout,
  } = useDoctorCommissionLedger({ mode: "entity", entityType, entityId });

  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [expanded, setExpanded] = useState<string | null>(null);

  const [payoutTarget, setPayoutTarget] = useState<Row | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const percentageProfiles = useMemo(
    () => compProfiles.filter((p) => p.compensation_type === "percentage" && p.is_active),
    [compProfiles],
  );

  const userIds = useMemo(() => {
    const set = new Set<string>();
    percentageProfiles.forEach((p) => p.user_id && set.add(p.user_id));
    totalsByUser.forEach((_v, k) => set.add(k));
    return Array.from(set);
  }, [percentageProfiles, totalsByUser]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userIds.length) {
        setNames(new Map());
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email")
        .in("user_id", userIds);
      if (cancelled) return;
      const m = new Map<string, string>();
      (data || []).forEach((p: any) => {
        const label = p.full_name || p.email || "";
        if (p.user_id) m.set(p.user_id, label);
      });
      setNames(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [userIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows: Row[] = useMemo(() => {
    return userIds
      .map((userId) => {
        const profile = percentageProfiles.find((p) => p.user_id === userId) || null;
        const tot = totalsByUser.get(userId) || { accruedCents: 0, paidCents: 0, balanceCents: 0 };
        return {
          userId,
          name: names.get(userId) || t("doctorSettlements.unknownDoctor"),
          rate: profile?.percentage_rate ?? null,
          percentageOf: profile?.percentage_of ?? null,
          accruedCents: tot.accruedCents,
          paidCents: tot.paidCents,
          balanceCents: tot.balanceCents,
        };
      })
      .filter((r) => r.rate !== null || r.accruedCents > 0 || r.paidCents > 0)
      .sort((a, b) => b.balanceCents - a.balanceCents);
  }, [userIds, percentageProfiles, totalsByUser, names, t]);

  const openPayout = useCallback((row: Row) => {
    setPayoutTarget(row);
    setPayoutAmount(String(Math.max(0, row.balanceCents) / 100));
    setPayoutNotes("");
  }, []);

  const submitPayout = useCallback(async () => {
    if (!payoutTarget) return;
    const cents = parseMajorToCents(payoutAmount);
    if (cents === null || cents > payoutTarget.balanceCents) {
      toast.error(t("doctorSettlements.invalidPayoutAmount"));
      return;
    }
    setSaving(true);
    try {
      await recordPayout({
        entityType,
        entityId,
        doctorUserId: payoutTarget.userId,
        amountCents: cents,
        notes: payoutNotes.trim() || null,
        postToPayroll: true,
        payrollCurrency: currency || "USD",
        payrollCategoryName: t("payrollCommission.categoryName"),
        doctorName: payoutTarget.name,
      });
      toast.success(t("payrollCommission.payoutPosted"));
      setPayoutTarget(null);
      onPayrollPosted?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t("doctorSettlements.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [payoutTarget, payoutAmount, payoutNotes, recordPayout, entityType, entityId, currency, t, onPayrollPosted]);

  const loading = compLoading || ledgerLoading;

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="h-4 w-4 text-muted-foreground" />
          {t("payrollCommission.title")}
        </CardTitle>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{t("payrollCommission.hint")}</p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{t("payrollCommission.accruedNotPaid")}</div>
            <div className="text-lg font-semibold">{formatCents(totals.balanceCents)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{t("payrollCommission.postedToPayroll")}</div>
            <div className="text-lg font-semibold">{formatCents(totals.paidCents)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{t("doctorSettlements.accruedTotal")}</div>
            <div className="text-lg font-semibold">{formatCents(totals.accruedCents)}</div>
          </div>
        </div>

        {!loading && rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("payrollCommission.empty")}</div>
        ) : null}

        <div className="space-y-3">
          {rows.map((r) => {
            const accruals = accrualsByUser(r.userId);
            const isOpen = expanded === r.userId;
            return (
              <div key={r.userId} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {r.rate !== null ? (
                        <Badge variant="secondary" className="font-normal">
                          {r.rate}% · {r.percentageOf || "doctor_revenue"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal">
                          {t("doctorSettlements.inactive")}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">{t("doctorSettlements.accruedTotal")}</div>
                      <div className="font-medium">{formatCents(r.accruedCents)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">{t("doctorSettlements.paidOutTotal")}</div>
                      <div className="font-medium">{formatCents(r.paidCents)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">{t("doctorSettlements.balanceOwed")}</div>
                      <div className="font-semibold">{formatCents(r.balanceCents)}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      disabled={r.balanceCents <= 0}
                      onClick={() => openPayout(r)}
                    >
                      <Wallet className="h-4 w-4" />
                      {t("doctorSettlements.recordPayout")}
                    </Button>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setExpanded(isOpen ? null : r.userId)}
                >
                  {isOpen ? t("doctorSettlements.hideAccruals") : t("doctorSettlements.viewAccruals")}
                </Button>

                {isOpen ? (
                  accruals.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="text-muted-foreground">
                          <tr className="text-left">
                            <th className="py-1 pr-3 font-medium">{t("payrollCommission.date")}</th>
                            <th className="py-1 pr-3 font-medium">{t("payrollCommission.gross")}</th>
                            <th className="py-1 pr-3 font-medium">{t("payrollCommission.rate")}</th>
                            <th className="py-1 font-medium">{t("payrollCommission.commission")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accruals.map((a) => (
                            <tr key={a.id} className="border-t">
                              <td className="py-1 pr-3">{new Date(a.accrued_at).toLocaleDateString()}</td>
                              <td className="py-1 pr-3">{formatCents(a.gross_amount_cents)}</td>
                              <td className="py-1 pr-3">{a.percentage_rate}%</td>
                              <td className="py-1">{formatCents(a.commission_amount_cents)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">{t("doctorSettlements.noAccruals")}</div>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>

      <Dialog open={Boolean(payoutTarget)} onOpenChange={(o) => (!o ? setPayoutTarget(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("doctorSettlements.recordPayout")}
              {payoutTarget ? ` — ${payoutTarget.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {t("doctorSettlements.balanceOwed")}: {formatCents(payoutTarget?.balanceCents || 0)}
            </div>
            <div className="space-y-1">
              <Label>{t("doctorSettlements.amount")}</Label>
              <Input value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label>{t("doctorSettlements.notes")}</Label>
              <Textarea value={payoutNotes} onChange={(e) => setPayoutNotes(e.target.value)} rows={2} />
            </div>
            <p className="text-xs text-muted-foreground">{t("payrollCommission.postsPayrollNote")}</p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayoutTarget(null)} disabled={saving}>
              {t("doctorSettlements.cancel")}
            </Button>
            <Button onClick={submitPayout} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("doctorSettlements.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
