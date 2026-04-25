import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DollarSign, ChevronDown, ChevronUp, Loader2, Plus, Tag, CheckCheck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAppointmentFinance, type PaymentMethod } from "@/hooks/useAppointmentFinance";

interface Props {
  appointmentId: string;
  patientId?: string;
  defaultOpen?: boolean;
}

export function AppointmentFinancePanel({ appointmentId, patientId, defaultOpen = false }: Props) {
  const { t } = useTranslation("dashboard");
  const tf = (k: string, fb: string) => {
    const v = t(`appointmentPreview.finance.${k}`);
    return v === `appointmentPreview.finance.${k}` ? fb : v;
  };
  const [open, setOpen] = useState(defaultOpen);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountReason, setDiscountReason] = useState("");

  const {
    loading,
    payments,
    insurance,
    totalBilled,
    totalPaid,
    totalDiscounts,
    outstanding,
    priorBalance,
    currency,
    recordPayment,
    applyDiscount,
    markFullyPaid,
  } = useAppointmentFinance(appointmentId, patientId);

  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
    } catch {
      return `${currency} ${n.toFixed(2)}`;
    }
  };

  const handleRecord = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setBusy(true);
    try {
      await recordPayment({ amount: amt, method, notes: notes || undefined });
      setAmount("");
      setNotes("");
    } finally {
      setBusy(false);
    }
  };

  const handleDiscount = async () => {
    const amt = parseFloat(discountAmount);
    if (!amt || amt <= 0) return;
    setBusy(true);
    try {
      await applyDiscount({ amount: amt, reason: discountReason || undefined });
      setDiscountAmount("");
      setDiscountReason("");
      setDiscountOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          {tf("title", "Finance")}
          {outstanding > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
              {fmt(outstanding)}
            </Badge>
          )}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted/50 px-2 py-1.5">
                  <div className="text-muted-foreground">{tf("totalBilled", "Billed")}</div>
                  <div className="font-semibold">{fmt(totalBilled)}</div>
                </div>
                <div className="rounded-md bg-muted/50 px-2 py-1.5">
                  <div className="text-muted-foreground">{tf("totalPaid", "Paid")}</div>
                  <div className="font-semibold text-emerald-600">{fmt(totalPaid)}</div>
                </div>
                {totalDiscounts > 0 && (
                  <div className="rounded-md bg-muted/50 px-2 py-1.5">
                    <div className="text-muted-foreground">{tf("discount", "Discount")}</div>
                    <div className="font-semibold">−{fmt(totalDiscounts)}</div>
                  </div>
                )}
                <div className={`rounded-md px-2 py-1.5 ${outstanding > 0 ? "bg-destructive/10" : "bg-emerald-500/10"}`}>
                  <div className="text-muted-foreground">{tf("outstanding", "Outstanding")}</div>
                  <div className={`font-semibold ${outstanding > 0 ? "text-destructive" : "text-emerald-600"}`}>
                    {fmt(outstanding)}
                  </div>
                </div>
              </div>

              {priorBalance > 0 && (
                <div className="text-xs flex items-center justify-between rounded-md bg-amber-500/10 px-2 py-1.5">
                  <span className="text-muted-foreground">{tf("priorBalance", "Prior balance")}</span>
                  <span className="font-medium text-amber-700 dark:text-amber-400">{fmt(priorBalance)}</span>
                </div>
              )}

              {insurance && (
                <div className="text-xs flex items-center gap-2 rounded-md border px-2 py-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">{tf("insurance", "Insurance")}:</span>
                  <span className="font-medium">{insurance.member_id || "—"}</span>
                  {insurance.co_pay != null && (
                    <span className="ml-auto">
                      {tf("copay", "Copay")}: {fmt(Number(insurance.co_pay))}
                    </span>
                  )}
                </div>
              )}

              <Separator />

              {/* Record payment */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">{tf("recordPayment", "Record payment")}</div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                    <SelectTrigger className="h-8 w-[130px] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{tf("cash", "Cash")}</SelectItem>
                      <SelectItem value="card">{tf("card", "Card")}</SelectItem>
                      <SelectItem value="insurance">{tf("insuranceMethod", "Insurance")}</SelectItem>
                      <SelectItem value="bank_transfer">{tf("bankTransfer", "Bank transfer")}</SelectItem>
                      <SelectItem value="other">{tf("other", "Other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder={tf("notesOptional", "Notes (optional)")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleRecord} disabled={busy || !amount} className="gap-1 flex-1">
                    <Plus className="h-3.5 w-3.5" /> {tf("record", "Record")}
                  </Button>
                  {outstanding > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => markFullyPaid(method)} disabled={busy} className="gap-1">
                      <CheckCheck className="h-3.5 w-3.5" /> {tf("markFullyPaid", "Mark fully paid")}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setDiscountOpen((v) => !v)} disabled={busy} className="gap-1">
                    <Tag className="h-3.5 w-3.5" /> {tf("applyDiscount", "Discount")}
                  </Button>
                </div>

                {discountOpen && (
                  <div className="space-y-2 rounded-md border p-2 bg-muted/30">
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder={tf("amount", "Amount")}
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder={tf("reason", "Reason")}
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setDiscountOpen(false)}>
                        {tf("cancel", "Cancel")}
                      </Button>
                      <Button size="sm" onClick={handleDiscount} disabled={busy || !discountAmount}>
                        {tf("apply", "Apply")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {payments.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    <div className="text-xs font-medium text-muted-foreground">{tf("history", "Payment history")}</div>
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs py-1">
                        <span className="text-muted-foreground capitalize">
                          {(p.payment_method || "—").replace(/_/g, " ")}
                        </span>
                        <span className="font-medium">{fmt(Number(p.amount) || 0)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
