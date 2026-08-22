import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BillingPaymentMethod } from '@/lib/billing/recordBillingPayment';

export interface PaymentPatientOption {
  /** Stable key: patient user id, or `appointment:<id>` for manually added patients. */
  key: string;
  label: string;
  /** Outstanding total (major units). */
  outstanding: number;
}

export interface PaymentChargeOption {
  id: string;
  patientKey: string;
  description: string;
  /** Remaining amount (major units). */
  remaining: number;
}

export interface RecordPaymentSubmit {
  amount: number;
  method: BillingPaymentMethod;
  notes?: string;
  discount?: number;
  patientKey?: string;
  chargeId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled amount (major units). */
  defaultAmount?: number;
  /** Optional context line, e.g. the procedure being paid. */
  subtitle?: string;
  submitting?: boolean;
  /** When true, the patient select is shown and required. */
  requirePatient?: boolean;
  patients?: PaymentPatientOption[];
  charges?: PaymentChargeOption[];
  /** Formats amounts shown inside the selects. */
  formatAmount?: (value: number) => string;
  onSubmit: (input: RecordPaymentSubmit) => Promise<void> | void;
}

const ALL_CHARGES = '__all__';

export function RecordPaymentDialog({
  open,
  onOpenChange,
  defaultAmount,
  subtitle,
  submitting = false,
  requirePatient = false,
  patients = [],
  charges = [],
  formatAmount,
  onSubmit,
}: Props) {
  const { t } = useTranslation('appointments');
  const { t: tf } = useTranslation('finance');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<BillingPaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState('');
  const [patientKey, setPatientKey] = useState('');
  const [chargeId, setChargeId] = useState(ALL_CHARGES);

  const money = (n: number) => (formatAmount ? formatAmount(n) : String(Number(n || 0).toFixed(2)));

  const setAmountValue = (n: number) =>
    setAmount(n && n > 0 ? String(Number(n.toFixed(2))) : '');

  useEffect(() => {
    if (open) {
      setAmountValue(Number(defaultAmount || 0));
      setMethod('cash');
      setNotes('');
      setDiscount('');
      setPatientKey('');
      setChargeId(ALL_CHARGES);
    }
  }, [open, defaultAmount]);

  const patientCharges = useMemo(
    () => charges.filter((c) => c.patientKey === patientKey),
    [charges, patientKey],
  );

  const handlePatientChange = (key: string) => {
    setPatientKey(key);
    setChargeId(ALL_CHARGES);
    const p = patients.find((x) => x.key === key);
    setAmountValue(Number(p?.outstanding || 0));
  };

  const handleChargeChange = (id: string) => {
    setChargeId(id);
    if (id === ALL_CHARGES) {
      const p = patients.find((x) => x.key === patientKey);
      setAmountValue(Number(p?.outstanding || 0));
    } else {
      const c = charges.find((x) => x.id === id);
      setAmountValue(Number(c?.remaining || 0));
    }
  };

  const handleSubmit = async () => {
    await onSubmit({
      amount: Number(amount) || 0,
      method,
      notes: notes || undefined,
      discount: Number(discount) || 0,
      patientKey: requirePatient ? patientKey : undefined,
      chargeId: requirePatient && chargeId !== ALL_CHARGES ? chargeId : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('finance.dialog.recordTitle')}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          {requirePatient && (
            <>
              <div>
                <Label>{tf('ledger.patient', 'Patient')}</Label>
                <Select value={patientKey} onValueChange={handlePatientChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={tf('ledger.selectPatient', 'Select a patient')} />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {patients.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label} · {money(p.outstanding)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tf('ledger.procedureOptional', 'Procedure (optional)')}</Label>
                <Select
                  value={chargeId}
                  onValueChange={handleChargeChange}
                  disabled={!patientKey}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value={ALL_CHARGES}>
                      {tf('ledger.allOldestFirst', 'All (oldest first)')}
                    </SelectItem>
                    {patientCharges.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.description} · {money(c.remaining)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
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
            <Select value={method} onValueChange={(v) => setMethod(v as BillingPaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="cash">{t('finance.dialog.methods.cash')}</SelectItem>
                <SelectItem value="card">{t('finance.dialog.methods.card')}</SelectItem>
                <SelectItem value="insurance">{t('finance.dialog.methods.insurance')}</SelectItem>
                <SelectItem value="bank_transfer">{t('finance.dialog.methods.bank_transfer')}</SelectItem>
                <SelectItem value="other">{t('finance.dialog.methods.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('finance.dialog.discount', 'Discount (optional)')}</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0.00"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t('finance.dialog.discountHint', 'Written off from the balance, not counted as collected money.')}
            </p>
          </div>
          <div>
            <Label>{t('finance.dialog.notes')}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('finance.dialog.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || (requirePatient && !patientKey)}>
            {t('finance.dialog.record')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RecordPaymentDialog;
