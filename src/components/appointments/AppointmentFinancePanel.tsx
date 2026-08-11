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
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import i18n from '@/i18n/config';

interface Props {
  appointmentId: string;
  patientId?: string | null;
  patientName: string;
  appointmentDate?: string;
  doctorName?: string;
  procedures?: Array<{ name: string; code?: string | null; cost: number | null; toothNumbers?: number[] }>;
  /** When provided, the panel renders this data instead of loading a single visit's finance. */
  overrideData?: Partial<AppointmentFinanceData>;
  /** Hide single-visit actions (record payment, add charge, discount, invoice). Default true. */
  showActions?: boolean;
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
  patientName,
  appointmentDate,
  doctorName,
  procedures = [],
  overrideData,
  showActions = true,
  chargesLabel,
  emptyChargesLabel,
  nameMap,
}: Props) {

  const { t } = useTranslation('appointments');
  const { t: tf } = useTranslation('finance');
  const { format: ctxFmtMajor, currency: displayCurrency } = useCurrency();
  const fmt = (n: number, _currency?: string) => ctxFmtMajor(Number(n || 0));
  const liveFinance = useAppointmentFinance(overrideData ? undefined : appointmentId, patientId || undefined);
  const finance: AppointmentFinanceData = overrideData
    ? ({ ...liveFinance, ...overrideData } as AppointmentFinanceData)
    : liveFinance;
  const procedureTotal = procedures.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
  const amountToBill = Math.max(finance.totalBilled, procedureTotal);
  const visitCharges = finance.billing.filter(
    (b) => (b.transaction_type ?? 'charge') === 'charge',
  );



  const [payOpen, setPayOpen] = useState(false);
  const [discOpen, setDiscOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmt, setChargeAmt] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [discountAmt, setDiscountAmt] = useState('');
  const [discountReason, setDiscountReason] = useState('');


  const status =
    finance.outstanding <= 0 && finance.totalBilled > 0
      ? { label: t('finance.status.paid'), variant: 'default' as const }
      : finance.outstanding > 0
        ? { label: t('finance.status.outstanding'), variant: 'outline' as const }
        : { label: t('finance.status.noCharges'), variant: 'secondary' as const };

  const handleRecordPayment = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error(t('finance.errors.enterValidAmount'));
      return;
    }
    try {
      await finance.recordPayment({ amount: n, method, notes: notes || undefined });
      setPayOpen(false);
      setAmount('');
      setNotes('');
    } catch (e: any) {
      toast.error(e?.message || t('finance.errors.recordFailed'));
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
            label={t('finance.kpi.outstanding')}
            value={fmt(finance.outstanding, finance.currency)}
            icon={AlertCircle}
            tone={finance.outstanding > 0 ? 'warn' : 'success'}
          />
        </div>

        {finance.priorBalance > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            {t('finance.priorBalance')} <strong>{fmt(finance.priorBalance, finance.currency)}</strong>
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
              const meta = (c.metadata ?? {}) as Record<string, any>;
              const teeth: number[] = Array.isArray(meta.teeth) ? meta.teeth : [];
              const when = meta.performed_at || c.created_at;
              const rowPatient =
                (c.patient_id && nameMap?.[c.patient_id]) ||
                meta.patient_name ||
                meta.customer_name ||
                patientName ||
                '';
              const rowDoctor =
                (c.doctor_id && nameMap?.[c.doctor_id]) || meta.doctor_name || doctorName || '';
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

                  <span className="shrink-0 font-medium tabular-nums">
                    {fmt((c.amount_cents ?? Number(c.amount) * 100) / 100, finance.currency)}
                  </span>
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

      {/* Record Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('finance.dialog.recordTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('finance.dialog.amount')}</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>{t('finance.dialog.method')}</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('finance.dialog.methods.cash')}</SelectItem>
                  <SelectItem value="card">{t('finance.dialog.methods.card')}</SelectItem>
                  <SelectItem value="insurance">{t('finance.dialog.methods.insurance')}</SelectItem>
                  <SelectItem value="bank_transfer">{t('finance.dialog.methods.bank_transfer')}</SelectItem>
                  <SelectItem value="other">{t('finance.dialog.methods.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('finance.dialog.notes')}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayOpen(false)}>
              {t('finance.dialog.cancel')}
            </Button>
            <Button onClick={handleRecordPayment}>{t('finance.dialog.record')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
