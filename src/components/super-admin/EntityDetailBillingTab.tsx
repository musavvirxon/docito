import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, DollarSign } from "lucide-react";
import type { InsightData } from "@/components/super-admin/entityDetailTypes";
import {
  formatCurrency,
  planStaffLimit,
  STATUS_CONFIG,
  SUB_STATUS_BADGE,
  toIsoDate,
} from "@/components/super-admin/entityDetailTypes";

type Props = {
  insights: InsightData | null | undefined;
  insightsLoading: boolean;
  activeStaff: number;
};

export default function EntityDetailBillingTab({ insights, insightsLoading, activeStaff }: Props) {
  const revenueCents = insights?.analytics?.revenue_cents ?? 0;
  const revenueCurrency = insights?.analytics?.currency ?? "usd";

  const subscription = insights?.billing?.subscription ?? null;
  const plan = subscription?.plan ?? null;

  const staffLimit = planStaffLimit(plan?.code);
  const staffUsageLabel = staffLimit ? `${activeStaff} / ${staffLimit}` : `${activeStaff}`;

  const subStatus = String(subscription?.status || "inactive").toLowerCase();
  const subBadge = SUB_STATUS_BADGE[subStatus] || SUB_STATUS_BADGE.inactive;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Billing & Subscription
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insightsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-lg font-semibold">{plan?.name || "No subscription"}</p>
                <p className="text-xs text-muted-foreground">
                  {plan
                    ? `${formatCurrency(plan.amount_cents, plan.currency)} / ${plan.interval}`
                    : "Create a subscription for this entity to enable billing."}
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  <Badge className={subBadge.className}>{subBadge.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Next renewal: {toIsoDate(subscription?.current_period_end)}
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Revenue (All-time)</p>
                <p className="text-lg font-semibold">{formatCurrency(revenueCents, revenueCurrency)}</p>
                <p className="text-xs text-muted-foreground mt-1">Staff usage: {staffUsageLabel}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recent Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  {insights?.billing?.invoices?.length ? (
                    <div className="space-y-2">
                      {insights.billing.invoices.map((inv) => {
                        const paid = Number(inv.amount_paid_cents || 0) > 0;
                        const invoiceLabel = String(inv.status || (paid ? "paid" : "due")).toUpperCase();
                        return (
                          <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">Invoice</p>
                              <p className="text-xs text-muted-foreground">Created: {toIsoDate(inv.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">
                                {formatCurrency(inv.amount_due_cents, inv.currency)}
                              </p>
                              <Badge className={paid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                                {invoiceLabel}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No invoices found.</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {insights?.billing?.transactions?.length ? (
                    <div className="space-y-2">
                      {insights.billing.transactions.map((tx) => {
                        const statusKey = String(tx.status || "pending").toLowerCase();
                        const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
                        const StatusIcon = statusConfig.icon;
                        return (
                          <div key={tx.id} className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                                <DollarSign className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{tx.transaction_type}</p>
                                <p className="text-xs text-muted-foreground">{toIsoDate(tx.created_at)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{formatCurrency(tx.amount_cents, tx.currency)}</p>
                              <Badge className={statusConfig.className}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No transactions found.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
