// File: src/components/imaging/ImagingBillingSection.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, RefreshCw } from "lucide-react";
import { useBillingTransactions, BillingTransaction } from "@/hooks/useBillingTransactions";
import { format } from "date-fns";

interface Props {
  centerId: string;
}

const formatAmount = (amount: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

const getStatusBadge = (status: BillingTransaction["status"]) => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    completed: "default",
    pending: "secondary",
    processing: "secondary",
    failed: "destructive",
    refunded: "outline",
  };
  return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
};

const getTypeLabel = (type: BillingTransaction["transaction_type"]) => {
  const labels: Record<string, string> = {
    appointment_payment: "Appointment",
    subscription_payment: "Subscription",
    refund: "Refund",
    hold_capture: "Payment Captured",
    hold_release: "Hold Released",
    cancellation_fee: "Cancellation Fee",
  };
  return labels[type] || type;
};

export default function ImagingBillingSection({ centerId }: Props) {
  const { transactions, isLoading, refetch, totalRevenue, totalRefunds, netRevenue } = useBillingTransactions(
    undefined,
    undefined,
    { entityType: "imaging_center", entityId: centerId }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-48 animate-pulse bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatAmount(totalRevenue, "usd")}</div>
            <p className="text-xs text-muted-foreground">
              From{" "}
              {transactions?.filter((t) => ["appointment_payment", "subscription_payment", "hold_capture"].includes(t.transaction_type)).length || 0}{" "}
              transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatAmount(totalRefunds, "usd")}</div>
            <p className="text-xs text-muted-foreground">
              {transactions?.filter((t) => ["refund", "hold_release"].includes(t.transaction_type)).length || 0} refunds processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netRevenue >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatAmount(netRevenue, "usd")}
            </div>
            <p className="text-xs text-muted-foreground">After refunds</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {!transactions?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-xs mt-2">Transactions will appear here once payments are recorded for this imaging center.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 15).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        ["refund", "hold_release"].includes(transaction.transaction_type) ? "bg-destructive/10" : "bg-green-500/10"
                      }`}
                    >
                      {["refund", "hold_release"].includes(transaction.transaction_type) ? (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{getTypeLabel(transaction.transaction_type)}</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(transaction.created_at), "MMM d, yyyy h:mm a")}</p>
                      {transaction.description ? <p className="text-xs text-muted-foreground mt-1">{transaction.description}</p> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(transaction.status)}
                    <span
                      className={`font-semibold ${
                        ["refund", "hold_release"].includes(transaction.transaction_type) ? "text-destructive" : "text-green-600"
                      }`}
                    >
                      {["refund", "hold_release"].includes(transaction.transaction_type) ? "-" : "+"}
                      {formatAmount(transaction.amount, transaction.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
