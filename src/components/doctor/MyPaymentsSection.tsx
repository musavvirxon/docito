// File: src/components/doctor/MyPaymentsSection.tsx
//
// Doctor-facing "My Payments": read-only view of their rent obligation,
// commission rate and settlement history, plus a payment log they can submit
// for admin approval.

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Wallet, DoorOpen, Percent, Handshake, Plus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useMyDoctorFinance } from "@/hooks/useMyDoctorFinance";
import { useDoctorPaymentSubmissions } from "@/hooks/useDoctorPaymentSubmissions";

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function periodFromMonth(value: string) {
  const [y, m] = value.split("-").map((n) => Number(n));
  return {
    start: isoDate(new Date(y, (m || 1) - 1, 1)),
    end: isoDate(new Date(y, m || 1, 0)),
  };
}

export default function MyPaymentsSection() {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const { formatCents } = useCurrency();

  const {
    loading,
    settlements,
    activeRent,
    activeCommission,
    roomLabel,
    scope,
  } = useMyDoctorFinance(user?.id);

  const {
    rows: submissions,
    loading: subsLoading,
    submit,
  } = useDoctorPaymentSubmissions({ mode: "user", userId: user?.id });

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"rent_payment" | "commission_received">("rent_payment");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState<string>(() => monthKey(new Date()));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const currentPeriod = useMemo(() => periodFromMonth(monthKey(new Date())), []);
  const currentSettlement = settlements.find(
    (s) => s.period_start === currentPeriod.start && s.period_end === currentPeriod.end,
  );

  const resetForm = () => {
    setType("rent_payment");
    setAmount("");
    setMonth(monthKey(new Date()));
    setNote("");
  };

  const handleSubmit = async () => {
    if (!scope || !user?.id) return;
    const amountCents = Math.round((Number(amount) || 0) * 100);
    if (amountCents <= 0) {
      toast.error(t("myPayments.enterAmount"));
      return;
    }
    setSaving(true);
    try {
      const period = month ? periodFromMonth(month) : { start: null, end: null };
      await submit({
        entityType: scope.entityType,
        entityId: scope.entityId,
        userId: user.id,
        paymentType: type,
        amountCents,
        periodStart: period.start,
        periodEnd: period.end,
        note,
      });
      toast.success(t("myPayments.submitted"));
      setOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e?.message || t("myPayments.submitFailed"));
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="text-xs">{t("myPayments.statusApproved")}</Badge>;
    if (status === "rejected") return <Badge variant="destructive" className="text-xs">{t("myPayments.statusRejected")}</Badge>;
    return <Badge variant="secondary" className="text-xs">{t("myPayments.statusPending")}</Badge>;
  };

  const typeLabel = (v: string) =>
    v === "rent_payment" ? t("myPayments.typeRent") : t("myPayments.typeCommission");

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <DoorOpen className="h-4 w-4" />
              {t("myPayments.rentObligation")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : activeRent ? (
              <>
                <p className="text-2xl font-semibold">{formatCents(Number(activeRent.rent_amount_cents) || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  {activeRent.rent_frequency}
                  {roomLabel ? ` · ${roomLabel}` : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("myPayments.noRent")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Percent className="h-4 w-4" />
              {t("myPayments.commissionRate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : activeCommission ? (
              <>
                <p className="text-2xl font-semibold">{activeCommission.percentage_rate}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(activeCommission.percentage_of || "").replace(/_/g, " ")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("myPayments.noCommission")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Handshake className="h-4 w-4" />
              {t("myPayments.currentNet")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : currentSettlement ? (
              <>
                <p
                  className={`text-2xl font-semibold ${
                    Number(currentSettlement.net_cents) >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  }`}
                >
                  {formatCents(Number(currentSettlement.net_cents) || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Number(currentSettlement.net_cents) >= 0
                    ? t("myPayments.clinicOwesYou")
                    : t("myPayments.youOweClinic")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("myPayments.noSettlementYet")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settlement history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Handshake className="h-5 w-5" />
            {t("myPayments.settlementHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("myPayments.loading")}</span>
            </div>
          ) : settlements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("myPayments.noSettlements")}</p>
          ) : (
            <div className="space-y-3">
              {settlements.map((s) => (
                <div key={s.id} className="p-3 rounded-xl border border-border bg-muted/40">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm font-medium">
                      {s.period_start} — {s.period_end}
                    </p>
                    <Badge variant="secondary" className="text-xs capitalize">{s.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-2 text-xs text-muted-foreground">
                    <div>
                      <p>{t("myPayments.commission")}</p>
                      <p className="font-medium text-foreground">{formatCents(Number(s.commission_owed_cents) || 0)}</p>
                    </div>
                    <div>
                      <p>{t("myPayments.rent")}</p>
                      <p className="font-medium text-foreground">{formatCents(Number(s.rent_owed_cents) || 0)}</p>
                    </div>
                    <div>
                      <p>{t("myPayments.net")}</p>
                      <p className="font-medium text-foreground">{formatCents(Number(s.net_cents) || 0)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5" />
            {t("myPayments.mySubmissions")}
          </CardTitle>
          <Button size="sm" onClick={() => setOpen(true)} disabled={!scope}>
            <Plus className="h-4 w-4 mr-1" />
            {t("myPayments.logPayment")}
          </Button>
        </CardHeader>
        <CardContent>
          {!scope && !loading && (
            <p className="text-sm text-muted-foreground mb-3">{t("myPayments.noScope")}</p>
          )}
          {subsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("myPayments.loading")}</span>
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("myPayments.noSubmissions")}</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((s) => (
                <div key={s.id} className="p-3 rounded-xl border border-border bg-muted/40">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium">{formatCents(Number(s.amount_cents) || 0)}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{typeLabel(s.payment_type)}</Badge>
                        {s.period_start && (
                          <span className="text-xs text-muted-foreground">
                            {s.period_start} — {s.period_end}
                          </span>
                        )}
                      </div>
                      {s.note && <p className="text-xs text-muted-foreground mt-1">{s.note}</p>}
                      {s.status === "rejected" && s.review_note && (
                        <p className="text-xs text-destructive mt-1">
                          {t("myPayments.rejectionReason")}: {s.review_note}
                        </p>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      {statusBadge(s.status)}
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("myPayments.logPayment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("myPayments.paymentType")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent_payment">{t("myPayments.typeRent")}</SelectItem>
                  <SelectItem value="commission_received">{t("myPayments.typeCommission")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mp-amount">{t("myPayments.amount")}</Label>
              <Input
                id="mp-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="mp-period">{t("myPayments.period")}</Label>
              <Input id="mp-period" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="mp-note">{t("myPayments.note")}</Label>
              <Textarea id="mp-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
            <p className="text-xs text-muted-foreground">{t("myPayments.pendingHint")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("myPayments.cancel")}</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("myPayments.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
