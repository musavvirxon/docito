import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, DollarSign, CheckCircle, AlertCircle, Plus, Receipt, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAppointmentFinance,
  type PaymentMethod,
  type AppointmentFinanceData,
} from '@/hooks/useAppointmentFinance';
import { generateInvoicePdf } from '@/utils/generateInvoicePdf';
import { RecordPaymentDialog } from '@/components/billing/RecordPaymentDialog';
import { recordBillingPayment, chargeRemaining, chargePaid } from '@/lib/billing/recordBillingPayment';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import i18n from '@/i18n/config';


interface Props {
  appointmentId: string;
  patientId?: string | null;
  /** Manual-patient link (appointments.doctor_patient_id) used to scope prior balances. */
  doctorPatientId?: string | null;
  patientName: string;
  appointmentDate?: string;
  doctorName?: string;
  procedures?: Array<{ name: string; code?: string | null; cost: number | null; toothNumbers?: number[] }>;
  /** When provided, the panel renders this data instead of loading a single visit's finance. */
  overrideData?: Partial<AppointmentFinanceData>;
  /** Hide single-visit actions (record payment, add charge, discount, invoice). Default true. */
  showActions?: boolean;
  /** Allow recording payments (general + per charge) even when showActions is false. */
  allowPayments?: boolean;
  /** Called after a payment has been recorded, so parent stats can refresh. */
  onPaymentRecorded?: () => void;
  /** Optional label override for the charges list heading. */
  chargesLabel?: string;
  /** Optional label override for the empty charges state. */
  emptyChargesLabel?: string;
  /** Optional id → full name map used to label charge rows with patient / doctor. */
  nameMap?: Record<string, string>;
}



export function AppointmentFinancePanel({
  appointmentId,
  patientId,
  doctorPatientId,
  patientName,
  appointmentDate,
  doctorName,
  procedures = [],
  overrideData,
  showActions = true,
  allowPayments,
  onPaymentRecorded,
  chargesLabel,
  emptyChargesLabel,
  nameMap,
}: Props) {

  const { t } = useTranslation('appointments');
  const { t: tf } = useTranslation('finance');
  const { format: ctxFmtMajor, currency: displayCurrency } = useCurrency();
  const liveFinance = useAppointmentFinance(
    overrideData ? undefined : appointmentId,
    patientId || undefined,
    doctorPatientId,
  );
  const finance: AppointmentFinanceData = overrideData
    ? ({ ...liveFinance, ...overrideData } as AppointmentFinanceData)
    : liveFinance;
  // Always convert from the amount's own stored currency into the display currency.
  const fmt = (n: number, src?: string) => ctxFmtMajor(Number(n || 0), src || finance.currency);
  const procedureTotal = procedures.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
  const amountToBill = Math.max(finance.totalBilled, procedureTotal);
  const visitCharges = finance.billing.filter(
    (b) => (b.transaction_type ?? 'charge') === 'charge',
  );
  const paymentsEnabled = allowPayments ?? showActions;

  const [payOpen, setPayOpen] = useState(false);
  const [payingCharge, setPayingCharge] = useState<any | null>(null);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [discOpen, setDiscOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmt, setChargeAmt] = useState('');
  const [discountAmt, setDiscountAmt] = useState('');
  const [discountReason, setDiscountReason] = useState('');



  const status =
    finance.outstanding <= 0 && finance.totalBilled > 0
      ? { label: t('finance.status.paid'), variant: 'default' as const }
      : finance.outstanding > 0
        ? { label: t('finance.status.outstanding'), variant: 'outline' as const }
        : { label: t('finance.status.noCharges'), variant: 'secondary' as const };

  const chargeDate = (c: any) =>
    new Date((c?.metadata as any)?.performed_at || c?.created_at || 0).getTime();

  const unpaidCharges = visitCharges
    .filter((c) => chargeRemaining(c) > 0)
    .slice()
    .sort((a, b) => chargeDate(a) - chargeDate(b));

  const refreshAfterPayment = async () => {
    await finance.refresh?.();
    onPaymentRecorded?.();
  };

  /** Aggregate mode: the panel shows charges of many patients. */
  const aggregateMode = !appointmentId;

  const chargePatientKey = (row: any): string =>
    row?.patient_id || (row?.appointment_id ? `appointment:${row.appointment_id}` : 'unknown');

  const chargePatientLabel = (row: any): string => {
    const meta = (row?.metadata ?? {}) as Record<string, any>;
    return (
      (row?.patient_id && nameMap?.[row.patient_id]) ||
      (row?.appointment_id && nameMap?.[`appointment:${row.appointment_id}`]) ||
      meta.patient_name ||
      meta.customer_name ||
      patientName ||
      tf('ledger.unknownPatient', 'Unknown patient')
    );
  };

  const patientOptions = aggregateMode
    ? Object.values(
        unpaidCharges.reduce((acc: Record<string, { key: string; label: string; outstanding: number }>, c: any) => {
          const key = chargePatientKey(c);
          if (!acc[key]) acc[key] = { key, label: chargePatientLabel(c), outstanding: 0 };
          acc[key].outstanding += chargeRemaining(c);
          return acc;
        }, {}),
      ).sort((a, b) => a.label.localeCompare(b.label))
    : [];

  const chargeOptions = aggregateMode
    ? unpaidCharges.map((c: any) => ({
        id: c.id,
        patientKey: chargePatientKey(c),
        description: `${c.description || tf('ledger.charge', 'Charge')} · ${new Date(
          chargeDate(c),
        ).toLocaleDateString()}`,
        remaining: chargeRemaining(c),
      }))
    : [];

  /** General payment: FIFO across the oldest unpaid charges. */
  const handleRecordPayment = async ({
    amount: n,
    method,
    notes,
    discount = 0,
    patientKey,
    chargeId,
  }: {
    amount: number;
    method: PaymentMethod;
    notes?: string;
    discount?: number;
    patientKey?: string;
    chargeId?: string;
  }) => {
    const disc = Math.max(0, Number(discount) || 0);
    if ((!Number.isFinite(n) || n <= 0) && disc <= 0) {
      toast.error(t('finance.errors.enterValidAmount'));
      return;
    }
    if (aggregateMode && !patientKey) {
      toast.error(tf('ledger.selectPatient', 'Select a patient'));
      return;
    }
    setPaySubmitting(true);
    try {
      if (appointmentId) {
        // Server-side FIFO allocation within this visit.
        await recordBillingPayment({
          amount: n,
          method,
          notes,
          discount: disc,
          appointmentId,
          patientId: patientId || undefined,
        });
        toast.success(t('finance.paymentRecorded', 'Payment recorded'));
        await refreshAfterPayment();
      } else {
        // Aggregate view: apply to the chosen charge, or oldest-first for that patient.
        const target = chargeId
          ? unpaidCharges.filter((c: any) => c.id === chargeId)
          : unpaidCharges.filter((c: any) => chargePatientKey(c) === patientKey);
        let left = Number(n) || 0;
        let discLeft = disc;
        let applied = 0;
        for (const charge of target) {
          if (left <= 0 && discLeft <= 0) break;
          const remaining = chargeRemaining(charge);
          if (remaining <= 0) continue;
          const applyDisc = Math.min(discLeft, remaining);
          const applyCash = Math.min(left, remaining - applyDisc);
          if (applyCash <= 0 && applyDisc <= 0) continue;
          await recordBillingPayment({
            amount: applyCash,
            method,
            notes,
            discount: applyDisc,
            chargeId: charge.id,
          });
          left -= applyCash;
          discLeft -= applyDisc;
          applied += applyCash + applyDisc;
        }
        if (applied <= 0) {
          toast.error(t('finance.errors.recordFailed'));
          return;
        }
        toast.success(t('finance.paymentRecorded', 'Payment recorded'));
        await refreshAfterPayment();
      }
      setPayOpen(false);
    } catch (e: any) {
      toast.error(e?.message || t('finance.errors.recordFailed'));
    } finally {
      setPaySubmitting(false);
    }
  };

  /** Payment applied to one specific charge/procedure. */
  const handleRecordChargePayment = async ({
    amount: n,
    method,
    notes,
    discount = 0,
  }: {
    amount: number;
    method: PaymentMethod;
    notes?: string;
    discount?: number;
  }) => {
    if (!payingCharge) return;
    const remaining = chargeRemaining(payingCharge);
    const disc = Math.min(Math.max(0, Number(discount) || 0), remaining);
    const cash = Math.min(Math.max(0, Number(n) || 0), Math.max(0, remaining - disc));
    if (cash <= 0 && disc <= 0) {
      toast.error(t('finance.errors.enterValidAmount'));
      return;
    }
    setPaySubmitting(true);
    try {
      await recordBillingPayment({
        amount: cash,
        method,
        notes,
        discount: disc,
        chargeId: payingCharge.id,
      });
      toast.success(t('finance.paymentRecorded', 'Payment recorded'));
      setPayingCharge(null);
      await refreshAfterPayment();
    } catch (e: any) {
      toast.error(e?.message || t('finance.errors.recordFailed'));
    } finally {
      setPaySubmitting(false);
    }
  };


  const handleApplyDiscount = async () => {
    const n = Number(discountAmt);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error(t('finance.errors.enterValidDiscount'));
      return;
    }
    try {
      await finance.applyDiscount({ amount: n, reason: discountReason || undefined });
      setDiscOpen(false);
      setDiscountAmt('');
      setDiscountReason('');
    } catch (e: any) {
      toast.error(e?.message || t('finance.errors.discountFailed'));
    }
  };

  const handleAddCharge = async () => {
    const n = Number(chargeAmt);
    if (!chargeDesc.trim() || !Number.isFinite(n) || n <= 0) {
      toast.error(t('finance.errors.enterValidAmount'));
      return;
    }
    try {
      await finance.addCharge({
        description: chargeDesc.trim(),
        amount: n,
        currency: displayCurrency,
      });
      setChargeOpen(false);
      setChargeDesc('');
      setChargeAmt('');
    } catch (e: any) {
      toast.error(e?.message || t('finance.errors.recordFailed'));
    }
  };

  const handleMarkPaid = async () => {

    try {
      await finance.markFullyPaid('cash');
    } catch (e: any) {
      toast.error(e?.message || t('finance.errors.markFailed'));
    }
  };

  const handleInvoicePdf = async () => {
    try {
      await generateInvoicePdf({
        invoiceNumber: `INV-${appointmentId.slice(0, 8).toUpperCase()}`,
        patientName,
        appointmentDate: appointmentDate || '',
        doctorName: doctorName || '',
        currency: displayCurrency,
        items: procedures.length
          ? procedures.map((p) => ({
              name:
                (p.code ? `[${p.code}] ` : '') +
                p.name +
                (p.toothNumbers?.length ? ` (${t('finance.teethLabel', { list: p.toothNumbers.join(',') })})` : ''),
              code: p.code || undefined,
              amount: p.cost || 0,
            }))
          : [{ name: t('finance.consultation'), amount: finance.totalBilled }],
        totalBilled: finance.totalBilled,
        totalDiscount: finance.totalDiscounts,
        totalPaid: finance.totalPaid,
        outstanding: finance.outstanding,
        payments: finance.payments.map((p) => ({
          date: p.paid_at || p.created_at,
          method: p.payment_method || '—',
          amount: Number(p.amount) || 0,
        })),
      }, i18n.language);
      toast.success(t('finance.invoiceSuccess'));
    } catch (e: any) {
      console.error(e);
      toast.error(t('finance.errors.invoiceFailed'));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> {t('finance.title')}
          </span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Kpi label={t('finance.kpi.amountToBill')} value={fmt(amountToBill, finance.currency)} icon={DollarSign} />
          <Kpi label={t('finance.kpi.paid')} value={fmt(finance.totalPaid, finance.currency)} icon={CheckCircle} tone="success" />
          <Kpi
            label={t('finance.kpi.discounts')}
            value={fmt(finance.totalDiscounts, finance.currency)}
            icon={Receipt}
          />
          <Kpi
            label={
              finance.outstanding + finance.priorBalance < 0
                ? t('finance.kpi.credit', { defaultValue: 'Credit balance' })
                : t('finance.kpi.outstanding')
            }
            value={fmt(Math.abs(finance.outstanding + finance.priorBalance), finance.currency)}
            icon={AlertCircle}
            tone={finance.outstanding + finance.priorBalance > 0 ? 'warn' : 'success'}
          />
        </div>

        {finance.priorBalance > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            {t('finance.priorBalance')} <strong>{fmt(finance.priorBalance, finance.currency)}</strong>
          </div>
        )}

        {!showActions && paymentsEnabled && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => setPayOpen(true)}
              className="gap-1"
              disabled={finance.outstanding <= 0}
            >
              <Plus className="h-4 w-4" /> {t('finance.recordPayment')}
            </Button>
          </div>
        )}

        {showActions && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setPayOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> {t('finance.recordPayment')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setChargeOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> {tf('ledger.addCharge', 'Add charge')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDiscOpen(true)}>
            {t('finance.applyDiscount')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkPaid}
            disabled={finance.outstanding <= 0}
          >
            {t('finance.markFullyPaid')}
          </Button>
          <Button size="sm" variant="outline" onClick={handleInvoicePdf} className="gap-1">
            <FileText className="h-4 w-4" /> {t('finance.invoicePdf')}
          </Button>
        </div>
        )}


        {/* Charges recorded during this visit */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {chargesLabel ?? tf('ledger.visitCharges', 'Charges this visit')}
            </p>
            <p className="text-xs font-semibold tabular-nums">
              {tf('subtotal')}: {fmt(finance.totalBilled, finance.currency)}
            </p>
          </div>
          {visitCharges.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {emptyChargesLabel ?? tf('ledger.noVisitCharges', 'No charges recorded for this visit yet.')}
            </p>
          ) : (
            visitCharges.map((c) => {
              const row = c as any;
              const meta = (c.metadata ?? {}) as Record<string, any>;
              const teeth: number[] = Array.isArray(meta.teeth) ? meta.teeth : [];
              const when = meta.performed_at || c.created_at;
              const rowPatient =
                (row.patient_id && nameMap?.[row.patient_id]) ||
                 (row.appointment_id && nameMap?.[`appointment:${row.appointment_id}`]) ||
                meta.patient_name ||
                meta.customer_name ||
                patientName ||
                '';
              const rowDoctor =
                 (row.doctor_id && nameMap?.[row.doctor_id]) ||
                 (row.appointment_id && nameMap?.[`appointment-doctor:${row.appointment_id}`]) ||
                 meta.doctor_name ||
                 doctorName ||
                 '';

              return (
                <div
                  key={c.id}
                  className="flex items-start justify-between gap-2 rounded border px-2 py-1.5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate">{c.description || tf('ledger.charge', 'Charge')}</span>
                      {teeth.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {t('finance.teethLabel', {
                            list: teeth.slice().sort((a, b) => a - b).join(', '),
                          })}
                        </Badge>
                      )}
                    </div>
                    {(rowPatient || rowDoctor) && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        {rowPatient && <span className="truncate">{rowPatient}</span>}
                        {rowPatient && rowDoctor && <span>·</span>}
                        {rowDoctor && (
                          <span className="truncate">
                            {t('clinicalHistory.drPrefix', { name: rowDoctor })}
                          </span>
                        )}
                      </div>
                    )}
                    {when && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {new Date(when).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="font-medium tabular-nums">
                      {fmt((c.amount_cents ?? Number(c.amount) * 100) / 100, c.currency || finance.currency)}
                    </div>
                    {chargePaid(row) > 0 && (
                      <div className="text-[10px] text-muted-foreground tabular-nums">
                        {tf('ledger.paidAmount', {
                          paid: fmt(chargePaid(row), c.currency || finance.currency),
                          defaultValue: '{{paid}} paid',
                        })}
                      </div>
                    )}
                    {chargeRemaining(row) > 0 && (
                      <div className="text-[10px] font-medium text-amber-600 tabular-nums">
                        {tf('ledger.remaining', {
                          amount: fmt(chargeRemaining(row), c.currency || finance.currency),
                          defaultValue: '{{amount}} left',
                        })}
                      </div>
                    )}
                    <div className="mt-0.5">
                      <Badge
                        variant={
                          chargeRemaining(row) <= 0
                            ? 'secondary'
                            : chargePaid(row) > 0
                              ? 'outline'
                              : 'destructive'
                        }
                        className="text-[10px]"
                      >
                        {chargeRemaining(row) <= 0
                          ? t('finance.status.paid')
                          : chargePaid(row) > 0
                            ? tf('ledger.partiallyPaid', 'Partially paid')
                            : tf('ledger.unpaid', 'Unpaid')}
                      </Badge>
                    </div>
                    {paymentsEnabled &&
                      (chargeRemaining(row) > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1 h-6 px-2 text-[10px]"
                          onClick={() => setPayingCharge(row)}
                        >
                          {tf('ledger.pay', 'Pay')}
                        </Button>
                      ) : null)}
                  </div>

                </div>
              );
            })
          )}

        </div>


        {finance.payments.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t('finance.recentPayments')}</p>
            {finance.payments.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-xs rounded border px-2 py-1"
              >
                <span className="truncate">
                  {p.payment_method || t('finance.paymentFallback')}{' '}
                  {p.paid_at ? `· ${new Date(p.paid_at).toLocaleDateString()}` : ''}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-medium tabular-nums">
                    {fmt(Number(p.amount) || 0, finance.currency)}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {p.status || t('finance.completed')}
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Record Payment Dialog (general, FIFO across oldest unpaid charges) */}
      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        defaultAmount={aggregateMode ? 0 : finance.outstanding}
        subtitle={tf('ledger.fifoHint', 'Applied to the oldest unpaid procedure first.')}
        submitting={paySubmitting}
        requirePatient={aggregateMode}
        patients={patientOptions}
        charges={chargeOptions}
        formatAmount={(v) => fmt(v)}
        onSubmit={handleRecordPayment}
      />

      {/* Record Payment Dialog (single procedure) */}
      <RecordPaymentDialog
        open={!!payingCharge}
        onOpenChange={(o) => !o && setPayingCharge(null)}
        defaultAmount={payingCharge ? chargeRemaining(payingCharge) : 0}
        subtitle={payingCharge?.description || undefined}
        submitting={paySubmitting}
        onSubmit={handleRecordChargePayment}
      />


      {/* Add Charge Dialog */}
      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tf('ledger.addCharge', 'Add charge')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{tf('description')}</Label>
              <Input
                value={chargeDesc}
                onChange={(e) => setChargeDesc(e.target.value)}
                placeholder={tf('enterDescription')}
              />
            </div>
            <div>
              <Label>{tf('amount')}</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={chargeAmt}
                onChange={(e) => setChargeAmt(e.target.value)}
                placeholder={tf('enterAmount')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChargeOpen(false)}>
              {tf('cancel')}
            </Button>
            <Button onClick={handleAddCharge}>{tf('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Discount Dialog */}
      <Dialog open={discOpen} onOpenChange={setDiscOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('finance.dialog.discountTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('finance.dialog.amount')}</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={discountAmt}
                onChange={(e) => setDiscountAmt(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>{t('finance.dialog.reason')}</Label>
              <Input
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder={t('finance.dialog.reasonPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDiscOpen(false)}>
              {t('finance.dialog.cancel')}
            </Button>
            <Button onClick={handleApplyDiscount}>{t('finance.dialog.apply')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: any;
  tone?: 'success' | 'warn';
}) {
  const color =
    tone === 'success' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-foreground';
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className={`text-sm font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
