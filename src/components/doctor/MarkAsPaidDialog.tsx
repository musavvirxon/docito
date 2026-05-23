import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateInvoiceNumber, PaymentMethod, useRecordPayment } from '@/hooks/useRecordPayment';
import { downloadInvoicePdf } from '@/lib/api/invoice-api';
import { toast } from 'sonner';

export interface MarkAsPaidContext {
  appointmentId?: string | null;
  patientId: string;
  doctorId?: string | null;
  practiceId?: string | null;
  patientName?: string;
  serviceName?: string;
  defaultAmount: number;     // remaining balance to collect
  totalAmount?: number;      // optional total invoice amount (defaults to defaultAmount)
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: MarkAsPaidContext | null;
  onSuccess?: () => void;
}

const methodOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

export const MarkAsPaidDialog = ({ open, onOpenChange, context, onSuccess }: Props) => {
  const { recordPayment, submitting } = useRecordPayment();
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState<number>(0);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null);

  const remaining = useMemo(() => {
    if (!context) return 0;
    const due = context.totalAmount ?? context.defaultAmount;
    return Math.max(due - 0, 0);
  }, [context]);

  useEffect(() => {
    if (open && context) {
      setMethod('cash');
      setAmount(context.defaultAmount || 0);
      setInvoiceNumber(generateInvoiceNumber());
      setNotes('');
      setLastInvoiceId(null);
    }
  }, [open, context]);

  const handleSubmit = async () => {
    if (!context) return;
    if (!amount || amount <= 0) {
      toast.error('Enter an amount greater than zero');
      return;
    }
    if (amount > (context.totalAmount ?? context.defaultAmount) + 0.0001) {
      toast.error('Amount cannot exceed the balance due');
      return;
    }
    const res = await recordPayment({
      appointmentId: context.appointmentId,
      patientId: context.patientId,
      patientName: context.patientName,
      doctorId: context.doctorId,
      practiceId: context.practiceId,
      amount,
      amountDue: context.totalAmount ?? context.defaultAmount,
      paymentMethod: method,
      invoiceNumber,
      serviceName: context.serviceName,
      notes: notes || undefined,
    });
    if (res.success) {
      setLastInvoiceId(res.invoiceId ?? null);
      onSuccess?.();
      // keep dialog open briefly so user can download invoice if desired
      if (!res.invoiceId) onOpenChange(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!lastInvoiceId) return;
    try {
      await downloadInvoicePdf(lastInvoiceId, invoiceNumber);
    } catch (e: any) {
      toast.error(e.message || 'Failed to download invoice');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        {context && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">{context.patientName || 'Patient'}</div>
              <div className="text-muted-foreground">{context.serviceName || 'Service'}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Balance due: ${remaining.toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount paid</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Partial payments are allowed. Remaining balance will stay pending.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {methodOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Invoice number</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reference, receipt id, comments…"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          {lastInvoiceId && (
            <Button variant="outline" onClick={handleDownloadInvoice}>
              Download invoice
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {lastInvoiceId ? 'Close' : 'Cancel'}
          </Button>
          {!lastInvoiceId && (
            <Button onClick={handleSubmit} disabled={submitting || !amount}>
              {submitting ? 'Saving…' : 'Record payment'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarkAsPaidDialog;
