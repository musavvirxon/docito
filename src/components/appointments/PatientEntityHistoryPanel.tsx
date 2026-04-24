import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Wallet, ShieldCheck, BarChart3, Activity, Calendar, Receipt } from 'lucide-react';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { usePatientEntityHistory, type ViewerEntityType } from '@/hooks/usePatientEntityHistory';

interface Props {
  patientId: string;
  entityType: ViewerEntityType;
  entityId: string;
  variant: 'billing' | 'insurance' | 'analytics' | 'activity';
}

export function PatientEntityHistoryPanel({ patientId, entityType, entityId, variant }: Props) {
  const { t } = useTranslation('dashboard');
  const { format: fmt } = useCurrencyContext();
  const { loading, billing, insurance, totals, activity } = usePatientEntityHistory(
    patientId,
    entityType,
    entityId,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (variant === 'analytics') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t('patientProfile.analytics.totalSpend', 'Total spend')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{fmt(totals.spendCents / 100)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t('patientProfile.analytics.outstanding', 'Outstanding')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{fmt(totals.outstandingCents / 100)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t('patientProfile.analytics.visits', 'Completed visits')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totals.visitCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t('patientProfile.analytics.lastVisit', 'Last / next visit')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {totals.lastVisit ? format(new Date(totals.lastVisit), 'MMM d, yyyy') : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('patientProfile.analytics.next', 'Next')}: {totals.nextVisit ? format(new Date(totals.nextVisit), 'MMM d, yyyy') : '—'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (variant === 'billing') {
    return (
      <Card>
        <CardContent className="pt-4">
          <ScrollArea className="h-[400px]">
            {billing.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('patientProfile.billing.empty', 'No billing records with this patient')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {billing.map((b) => (
                  <div key={b.id} className="p-3 rounded-lg border bg-card flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{b.description || b.transaction_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(b.created_at), 'MMM d, yyyy')} · {b.transaction_type}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-semibold">{fmt(Number(b.amount), b.currency)}</p>
                      <Badge variant="outline" className="capitalize text-xs mt-1">{b.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'insurance') {
    return (
      <Card>
        <CardContent className="pt-4">
          {insurance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('patientProfile.insurance.empty', 'No insurance records on file with this entity')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insurance.map((i) => (
                <div key={i.id} className="p-3 rounded-lg border bg-card flex items-start justify-between">
                  <div>
                    <p className="font-medium">{i.provider_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{i.plan_name || '—'}</p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">{i.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // activity
  return (
    <Card>
      <CardContent className="pt-4">
        <ScrollArea className="h-[400px]">
          {activity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('patientProfile.activity.empty', 'No activity yet')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((a) => {
                const Icon = a.type === 'appointment' ? Calendar : a.type === 'billing' ? Receipt : Activity;
                return (
                  <div key={a.id} className="p-3 rounded-lg border bg-card flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 text-primary p-2 shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.date ? format(new Date(a.date), 'MMM d, yyyy') : '—'}
                        {a.status ? ` · ${a.status}` : ''}
                      </p>
                    </div>
                    {a.meta?.amount != null && (
                      <p className="text-sm font-semibold shrink-0">
                        {fmt(Number(a.meta.amount), a.meta.currency)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default PatientEntityHistoryPanel;
