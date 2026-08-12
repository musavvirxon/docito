import { useEffect, useState } from 'react';
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled amount (major units). */
  defaultAmount?: number;
  /** Optional context line, e.g. the procedure being paid. */
  subtitle?: string;
  submitting?: boolean;
  onSubmit: (input: { amount: number; method: BillingPaymentMethod; notes?: string }) => Promise<void> | void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  defaultAmount,
  subtitle,
  submitting = false,
  onSubmit,
}: Props) {
  const { t } = useTranslation('appointments');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<BillingPaymentMethod>('cash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount && defaultAmount > 0 ? String(Number(defaultAmount.toFixed(2))) : '');
      setMethod('cash');
      setNotes('');
    }
  }, [open, defaultAmount]);

  const handleSubmit = async () => {
    await onSubmit({ amount: Number(amount), method, notes: notes || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('finance.dialog.recordTitle')}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
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
            <Label>{t('finance.dialog.notes')}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('finance.dialog.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {t('finance.dialog.record')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RecordPaymentDialog;
