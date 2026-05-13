import { useState } from 'react';
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
import { useAppointmentFinance, type PaymentMethod } from '@/hooks/useAppointmentFinance';
import { generateInvoicePdf } from '@/utils/generateInvoicePdf';
import { toast } from 'sonner';

interface Props {
  appointmentId: string;
  patientId?: string | null;
  patientName: string;
  appointmentDate?: string;
  doctorName?: string;
  procedures?: Array<{ name: string; code?: string | null; cost: number | null; toothNumbers?: number[] }>;
}

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n || 0);

export function AppointmentFinancePanel({
  appointmentId,
  patientId,
  patientName,
  appointmentDate,
  doctorName,
  procedures = [],
}: Props) {
  const finance = useAppointmentFinance(appointmentId, patientId || undefined);
  const procedureTotal = procedures.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
  const amountToBill = Math.max(finance.totalBilled, procedureTotal);

  const [payOpen, setPayOpen] = useState(false);
  const [discOpen, setDiscOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [discountAmt, setDiscountAmt] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  const status =
    finance.outstanding <= 0 && finance.totalBilled > 0
      ? { label: 'Paid', variant: 'default' as const }
      : finance.outstanding > 0
        ? { label: 'Outstanding', variant: 'outline' as const }
        : { label: 'No charges', variant: 'secondary' as const };

  const handleRecordPayment = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      await finance.recordPayment({ amount: n, method, notes: notes || undefined });
      setPayOpen(false);
      setAmount('');
      setNotes('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to record payment');
    }
  };

  const handleApplyDiscount = async () => {
    const n = Number(discountAmt);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Enter a valid discount');
      return;
    }
    try {
      await finance.applyDiscount({ amount: n, reason: discountReason || undefined });
      setDiscOpen(false);
      setDiscountAmt('');
      setDiscountReason('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to apply discount');
    }
  };

  const handleMarkPaid = async () => {
    try {
      await finance.markFullyPaid('cash');
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    }
  };

  const handleInvoicePdf = () => {
    try {
      generateInvoicePdf({
        invoiceNumber: `INV-${appointmentId.slice(0, 8).toUpperCase()}`,
        patientName,
        appointmentDate: appointmentDate || '',
        doctorName: doctorName || '',
        currency: finance.currency,
        items: procedures.length
          ? procedures.map((p) => ({
              name: p.name + (p.toothNumbers?.length ? ` (Teeth ${p.toothNumbers.join(',')})` : ''),
              amount: p.cost || 0,
            }))
          : [{ name: 'Consultation', amount: finance.totalBilled }],
        totalBilled: finance.totalBilled,
        totalDiscount: finance.totalDiscounts,
        totalPaid: finance.totalPaid,
        outstanding: finance.outstanding,
        payments: finance.payments.map((p) => ({
          date: p.paid_at || p.created_at,
          method: p.payment_method || '—',
          amount: Number(p.amount) || 0,
        })),
      });
      toast.success('Invoice PDF generated');
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to generate invoice');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Patient Finance
          </span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Kpi label="Amount to bill" value={fmt(amountToBill, finance.currency)} icon={DollarSign} />
          <Kpi label="Paid" value={fmt(finance.totalPaid, finance.currency)} icon={CheckCircle} tone="success" />
          <Kpi
            label="Discounts"
            value={fmt(finance.totalDiscounts, finance.currency)}
            icon={Receipt}
          />
          <Kpi
            label="Outstanding"
            value={fmt(finance.outstanding, finance.currency)}
            icon={AlertCircle}
            tone={finance.outstanding > 0 ? 'warn' : 'success'}
          />
        </div>

        {finance.priorBalance > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            Prior unpaid balance: <strong>{fmt(finance.priorBalance, finance.currency)}</strong>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setPayOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Record Payment
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDiscOpen(true)}>
            Apply Discount
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkPaid}
            disabled={finance.outstanding <= 0}
          >
            Mark Fully Paid
          </Button>
          <Button size="sm" variant="outline" onClick={handleInvoicePdf} className="gap-1">
            <FileText className="h-4 w-4" /> Invoice PDF
          </Button>
        </div>

        {finance.payments.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Recent payments</p>
            {finance.payments.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-xs rounded border px-2 py-1"
              >
                <span className="truncate">
                  {p.payment_method || 'payment'}{' '}
                  {p.paid_at ? `· ${new Date(p.paid_at).toLocaleDateString()}` : ''}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-medium tabular-nums">
                    {fmt(Number(p.amount) || 0, finance.currency)}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {p.status || 'completed'}
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
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={discOpen} onOpenChange={setDiscOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={discountAmt}
                onChange={(e) => setDiscountAmt(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Input
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="Loyalty, promotion, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDiscOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyDiscount}>Apply</Button>
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
