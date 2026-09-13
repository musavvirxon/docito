import { CreditCard, CheckCircle, AlertCircle, DollarSign, TrendingDown, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';

interface Payment {
  id?: string;
  amount?: number;
  amount_cents?: number;
  status?: string;
  payment_method?: string;
  created_at?: string;
  due_date?: string;
  description?: string;
  patient_name?: string;
  customer_name?: string;
  metadata?: { patient_name?: string; service_name?: string; doctor_name?: string; [key: string]: any };
  [key: string]: any;
}

interface Props {
  patientName: string;
  payments: Payment[];
  compact?: boolean;
  onCreateInvoice?: () => void;
  onAddPayment?: () => void;
  disabled?: boolean;
}


const getAmount = (p: Payment) =>
  p.amount_cents ? p.amount_cents / 100 : p.amount || 0;

const matchStatus = (p: Payment, ...s: string[]) =>
  s.includes((p.status || '').toLowerCase());

export function PatientFinanceSection({
  patientName,
  payments,
  compact,
  onCreateInvoice,
  onAddPayment,
  disabled,
}: Props) {
  const { format: ctxFmtMajor } = useCurrency();
  const { t } = useTranslation('admin');
  const fmt = (n: number) => ctxFmtMajor(Number(n || 0));
  const mine = (payments || []).filter(
    (p) =>
      !patientName ||
      p.metadata?.patient_name === patientName ||
      p.patient_name === patientName ||
      p.customer_name === patientName,
  );

  const billed = mine.reduce((s, p) => s + getAmount(p), 0);
  const paid = mine
    .filter((p) => matchStatus(p, 'paid', 'completed', 'succeeded'))
    .reduce((s, p) => s + getAmount(p), 0);
  const refunded = mine
    .filter((p) => matchStatus(p, 'refunded'))
    .reduce((s, p) => s + getAmount(p), 0);
  const balance = billed - paid - refunded;
  const overdue =
    balance > 0 &&
    mine.some(
      (p) =>
        matchStatus(p, 'overdue') ||
        (matchStatus(p, 'pending', 'unpaid') && p.due_date && new Date(p.due_date) < new Date()),
    );

  const statusLabel = balance <= 0 ? t('adminUi.clear') : overdue ? t('adminUi.overdue') : t('adminUi.outstanding');
  const statusVariant = (balance <= 0 ? 'default' : overdue ? 'destructive' : 'outline') as
    | 'default'
    | 'destructive'
    | 'outline';

  const kpis = [
    { label: t('adminUi.billed'), value: fmt(billed), color: 'text-foreground' },
    { label: t('adminUi.paid'), value: fmt(paid), color: 'text-green-600' },
    {
      label: t('adminUi.balance'),
      value: fmt(balance),
      color: balance > 0 ? (overdue ? 'text-red-600' : 'text-amber-600') : 'text-green-600',
    },
    { label: t('adminUi.refunded'), value: fmt(refunded), color: 'text-muted-foreground' },
  ];

  /* ── COMPACT (appointment session / overview sidebar) ─────────── */
  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> {t('adminUi.patientFinance')}
            </span>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-md border bg-muted/30 p-2 text-center">
                <p className={`text-sm font-semibold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </p>
              </div>
            ))}
          </div>

          {mine.length > 0 && (
            <div className="space-y-1">
              {mine
                .slice(-3)
                .reverse()
                .map((p, i) => (
                  <div
                    key={p.id || i}
                    className="flex items-center justify-between text-xs rounded border px-2 py-1"
                  >
                    <span className="truncate">
                       {p.metadata?.service_name || p.description || t('adminUi.payment')}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="font-medium">{fmt(getAmount(p))}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {p.status || 'pending'}
                      </Badge>
                    </span>
                  </div>
                ))}
            </div>
          )}

          {mine.length === 0 && (
             <p className="text-xs text-muted-foreground">{t('adminUi.noPatientBillingRecords')}</p>
          )}

          {(onCreateInvoice || onAddPayment) && (
            <div className="flex gap-2">
              {onCreateInvoice && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={onCreateInvoice}
                  disabled={disabled}
                >
                   + {t('adminUi.invoice')}
                </Button>
              )}
              {onAddPayment && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={onAddPayment}
                  disabled={disabled}
                >
                   + {t('adminUi.payment')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  /* ── FULL (patient profile billing tab) ───────────────────────── */
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
             <CreditCard className="h-5 w-5" /> {t('adminUi.financialStatus')}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant}>{statusLabel}</Badge>
            {onCreateInvoice && (
              <Button size="sm" variant="outline" onClick={onCreateInvoice} disabled={disabled}>
                 {t('adminUi.createInvoice')}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
               label: t('adminUi.totalBilled'),
              value: fmt(billed),
              icon: DollarSign,
              color: 'text-foreground',
              bg: 'bg-muted/40',
            },
            {
               label: t('adminUi.totalPaid'),
              value: fmt(paid),
              icon: CheckCircle,
              color: 'text-green-600',
              bg: 'bg-green-50 dark:bg-green-950/20',
            },
            {
               label: t('adminUi.outstandingBalance'),
              value: fmt(balance),
              icon: AlertCircle,
              color:
                balance <= 0 ? 'text-green-600' : overdue ? 'text-red-600' : 'text-amber-600',
              bg:
                balance <= 0
                  ? 'bg-green-50 dark:bg-green-950/20'
                  : overdue
                    ? 'bg-red-50 dark:bg-red-950/20'
                    : 'bg-amber-50 dark:bg-amber-950/20',
            },
            {
               label: t('adminUi.refunded'),
              value: fmt(refunded),
              icon: TrendingDown,
              color: 'text-muted-foreground',
              bg: 'bg-muted/40',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-lg border p-4 ${item.bg}`}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
                <p className={`text-xl font-semibold ${item.color}`}>{item.value}</p>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        {billed > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
               <span>{t('adminUi.paymentProgress')}</span>
               <span>{t('adminUi.percentPaid', { percent: Math.round((paid / billed) * 100) })}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-green-600 transition-all"
                style={{ width: `${Math.min(100, Math.round((paid / billed) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Transaction list */}
        <div className="space-y-2">
           <h4 className="text-sm font-medium">{t('adminUi.transactionHistory')}</h4>
          {mine.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              <Receipt className="mx-auto h-6 w-6 mb-2 opacity-60" />
               {t('adminUi.noBillingRecords')}
            </div>
          ) : (
            mine
              .slice()
              .reverse()
              .map((p, i) => {
                let ds = '';
                try {
                  ds = p.created_at ? new Date(p.created_at).toLocaleDateString() : '';
                } catch {
                  /* ignore */
                }
                return (
                  <div
                    key={p.id || i}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                         {p.metadata?.service_name || p.description || t('adminUi.payment')}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {ds}
                        {p.payment_method ? ` · ${p.payment_method}` : ''}
                        {p.metadata?.doctor_name ? ` · ${p.metadata.doctor_name}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">{fmt(getAmount(p))}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {p.status || 'pending'}
                      </Badge>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PatientFinanceSection;
