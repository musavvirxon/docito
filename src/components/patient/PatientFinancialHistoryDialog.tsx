import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronDown, CreditCard, Wallet } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { useCurrency } from '@/hooks/useCurrency';
import { usePatientFinancialHistory } from '@/hooks/usePatientFinancialHistory';
import { PatientFinancialTab } from '@/components/patient/PatientFinancialTab';
import { RecordPaymentDialog } from '@/components/billing/RecordPaymentDialog';
import { recordBillingPayment } from '@/lib/billing/recordBillingPayment';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string | null;
  doctorPatientId?: string | null;
  patientName?: string;
  /** Allow recording a payment from within the history view. */
  allowPayments?: boolean;
  onPaymentRecorded?: () => void;
}

export function PatientFinancialHistoryDialog({
  open,
  onOpenChange,
  patientId,
  doctorPatientId,
  patientName,
  allowPayments = true,
  onPaymentRecorded,
}: Props) {
  const { t } = useTranslation('finance');
  const { format: ctxFmt } = useCurrency();
  const { loading, visits, totals, refresh } = usePatientFinancialHistory(patientId, doctorPatientId);

  const [payOpen, setPayOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fmt = (n: number, src?: string) => ctxFmt(Number(n || 0), src || totals.currency);

  const unpaidCharges = visits
    .flatMap((v) => v.charges)
    .filter((c) => c.remaining > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const handleRecordPayment = async ({
    amount,
    method,
    notes,
    discount = 0,
  }: {
    amount: number;
    method: any;
    notes?: string;
    discount?: number;
  }) => {
    const disc = Math.max(0, Number(discount) || 0);
    let left = Math.max(0, Number(amount) || 0);
    if (left <= 0 && disc <= 0) {
      toast.error(t('enterAmount'));
      return;
    }
    setSubmitting(true);
    try {
      let discLeft = disc;
      let applied = 0;
      for (const charge of unpaidCharges) {
        if (left <= 0 && discLeft <= 0) break;
        const applyDisc = Math.min(discLeft, charge.remaining);
        const applyCash = Math.min(left, charge.remaining - applyDisc);
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
        toast.error(t('saveFailed'));
        return;
      }
      toast.success(t('saveSuccess'));
      setPayOpen(false);
      await refresh();
      onPaymentRecorded?.();
    } catch (e: any) {
      toast.error(e?.message || t('saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const Kpi = ({
    label,
    value,
    tone,
  }: {
    label: string;
    value: string;
    tone?: 'warn' | 'success';
  }) => (
    <Card
      className={cn(
        'border',
        tone === 'warn' && 'border-destructive/40 bg-destructive/5',
        tone === 'success' && 'border-emerald-500/40 bg-emerald-500/5',
      )}
    >
      <CardContent className="p-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={cn(
            'mt-1 text-lg font-semibold tabular-nums',
            tone === 'warn' && 'text-destructive',
            tone === 'success' && 'text-emerald-600 dark:text-emerald-400',
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              {t('history.title', 'Full financial history')}
            </DialogTitle>
            {patientName && <DialogDescription>{patientName}</DialogDescription>}
          </DialogHeader>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {loading ? (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[70px] w-full" />)
            ) : (
              <>
                <Kpi label={t('history.billed', 'Total billed')} value={fmt(totals.billed)} />
                <Kpi label={t('amountPaid')} value={fmt(totals.paid)} />
                <Kpi label={t('discount')} value={fmt(totals.discounts)} />
                <Kpi
                  label={
                    totals.credit > 0
                      ? t('ledger.creditBalance', 'Credit balance')
                      : t('outstanding')
                  }
                  value={fmt(totals.credit > 0 ? totals.credit : totals.outstanding)}
                  tone={totals.credit > 0 ? 'success' : totals.outstanding > 0 ? 'warn' : undefined}
                />
              </>
            )}
          </div>

          {allowPayments && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setPayOpen(true)}>
                <CreditCard className="mr-2 h-4 w-4" />
                {t('history.recordPayment', 'Record payment')}
              </Button>
            </div>
          )}

          {/* Visits & procedures */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t('history.visits', 'Visits & procedures')}</h3>
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : visits.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('history.noHistory', 'No charges recorded for this patient yet.')}
              </p>
            ) : (
              visits.map((v) => (
                <Collapsible key={v.appointmentId || 'other'} defaultOpen={visits.length <= 3}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-muted/50">
                    <span className="flex min-w-0 items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">
                        {v.appointmentId
                          ? v.date || t('history.visit', 'Visit')
                          : t('history.otherCharges', 'Other charges')}
                      </span>
                      {v.appointmentType && (
                        <Badge variant="secondary" className="hidden sm:inline-flex">
                          {v.appointmentType}
                        </Badge>
                      )}
                    </span>
                    <span className="flex items-center gap-3 text-xs tabular-nums">
                      <span className="text-muted-foreground">
                        {t('history.billed', 'Total billed')}: {fmt(v.billed, v.currency)}
                      </span>
                      <span
                        className={cn(
                          v.remaining > 0.005 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        {v.remaining > 0.005
                          ? `${t('history.remaining', 'Remaining')}: ${fmt(v.remaining, v.currency)}`
                          : t('paid')}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3">
                    {v.charges.length === 0 ? (
                      <p className="pt-2 text-xs text-muted-foreground">
                        {t('noEntries')}
                      </p>
                    ) : (
                      <table className="mt-2 w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="py-1 text-left font-medium">{t('procedure')}</th>
                            <th className="py-1 text-right font-medium">{t('amount')}</th>
                            <th className="py-1 text-right font-medium">{t('paid')}</th>
                            <th className="py-1 text-right font-medium">
                              {t('history.remaining', 'Remaining')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {v.charges.map((c) => (
                            <tr key={c.id} className="border-b last:border-0">
                              <td className="py-1.5 pr-2">
                                {c.description}
                                {c.teeth?.length ? (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    ({c.teeth.join(', ')})
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-1.5 text-right tabular-nums">{fmt(c.amount, c.currency)}</td>
                              <td className="py-1.5 text-right tabular-nums">{fmt(c.paid, c.currency)}</td>
                              <td
                                className={cn(
                                  'py-1.5 text-right tabular-nums',
                                  c.remaining > 0.005 && 'text-destructive',
                                )}
                              >
                                {fmt(c.remaining, c.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </section>

          {/* Chronological ledger */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t('ledger.title', 'Ledger')}</h3>
            <PatientFinancialTab patientId={patientId || doctorPatientId} />
          </section>
        </DialogContent>
      </Dialog>

      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        defaultAmount={totals.outstanding}
        subtitle={patientName}
        submitting={submitting}
        formatAmount={(v) => fmt(v)}
        onSubmit={handleRecordPayment}
      />
    </>
  );
}
