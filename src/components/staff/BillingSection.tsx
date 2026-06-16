import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign, CreditCard, RefreshCw, Clock, CheckCircle, XCircle, FileText,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import type { StaffPayment } from "@/hooks/useStaffDashboard";

type Props = {
  payments: StaffPayment[];
  onRefresh: () => void;
  canManageBilling?: boolean;
};

function formatCurrency(amountCents: number, currency: string = "USD") {
  const value = Number(amountCents || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency || "USD").toUpperCase(),
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export default function BillingSection({ payments, onRefresh, canManageBilling = false }: Props) {
  const { t } = useTranslation('dashboard');

  const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
    pending: { label: t('staff.billing.status.pending', 'Pending'), className: "bg-yellow-100 text-yellow-800", icon: Clock },
    completed: { label: t('staff.billing.status.paid', 'Paid'), className: "bg-green-100 text-green-800", icon: CheckCircle },
    failed: { label: t('staff.billing.status.failed', 'Failed'), className: "bg-red-100 text-red-800", icon: XCircle },
    refunded: { label: t('staff.billing.status.refunded', 'Refunded'), className: "bg-gray-100 text-gray-800", icon: RefreshCw },
  };

  const totalRevenueCents = payments
    .filter((p) => String(p.status || "").toLowerCase() === "completed")
    .reduce((sum, p) => sum + Number(p.amount_cents || 0), 0);

  const pendingCents = payments
    .filter((p) => String(p.status || "").toLowerCase() === "pending")
    .reduce((sum, p) => sum + Number(p.amount_cents || 0), 0);

  const currency = payments.find((p) => p.currency)?.currency || "usd";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('staff.billing.title', 'Billing & Payments')}</h2>
          <p className="text-muted-foreground">{t('staff.billing.subtitle', 'Real-time billing activity for this clinic.')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('staff.billing.refresh', 'Refresh')}
          </Button>
          {canManageBilling ? (
            <Button size="sm" disabled title={t('staff.billing.invoiceComingSoon', 'Invoice creation is coming next')}>
              <FileText className="w-4 h-4 mr-2" />
              {t('staff.billing.createInvoice', 'Create Invoice')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('staff.billing.totalCollected', 'Total Collected')}</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenueCents, currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('staff.billing.pending', 'Pending')}</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(pendingCents, currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('staff.billing.transactions', 'Transactions')}</p>
                <p className="text-2xl font-bold text-foreground">{payments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {t('staff.billing.recentPayments', 'Recent Payments')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('staff.billing.noTransactions', 'No transactions found')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => {
                const statusKey = String(payment.status || "pending").toLowerCase();
                const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                const displayName = payment.patient_name?.trim() ? payment.patient_name : t('staff.billing.patient', 'Patient');

                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg flex-wrap"
                  >
                    <div className="flex items-center gap-4 min-w-[240px]">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{displayName}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(payment.created_at), "MMM d, yyyy")} • {payment.payment_type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(payment.amount_cents, payment.currency)}
                      </p>
                      <Badge className={statusConfig.className}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
