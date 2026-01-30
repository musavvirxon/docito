// File: src/components/billing/BillingOverview.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, RefreshCw } from "lucide-react";
import { useBillingTransactions, BillingTransaction, BillingEntityType } from "@/hooks/useBillingTransactions";
import { format } from "date-fns";

interface BillingOverviewProps {
  entityType: BillingEntityType;
  entityId: string;
}

type TxStatus = "completed" | "pending" | "failed" | "refunded" | "unknown";
type TxType = "charge" | "refund" | "adjustment" | "unknown";

function normalizeStatus(status: BillingTransaction["status"]): TxStatus {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "completed";
  if (s === "pending") return "pending";
  if (s === "failed") return "failed";
  if (s === "refunded") return "refunded";
  return "unknown";
}

function normalizeType(type: BillingTransaction["transaction_type"]): TxType {
  const t = String(type || "").toLowerCase();
  if (t === "charge") return "charge";
  if (t === "refund") return "refund";
  if (t === "adjustment") return "adjustment";
  return "unknown";
}

const formatCents = (amountCents: number, currency: string) => {
  const cents = Number(amountCents || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "USD").toUpperCase(),
  }).format(cents / 100);
};

const getStatusBadge = (status: BillingTransaction["status"]) => {
  const variants: Record<TxStatus, "default" | "secondary" | "destructive" | "outline"> = {
    completed: "default",
    pending: "secondary",
    failed: "destructive",
    refunded: "outline",
    unknown: "secondary",
  };

  const s = normalizeStatus(status);
  return <Badge variant={variants[s] || "secondary"}>{s}</Badge>;
};

const getTypeLabel = (type: BillingTransaction["transaction_type"]) => {
  const labels: Record<TxType, string> = {
    charge: "Charge",
    refund: "Refund",
    adjustment: "Adjustment",
    unknown: "Transaction",
  };
  const t = normalizeType(type);
  return labels[t] || "Transaction";
};

const isRefundLike = (t: BillingTransaction) => normalizeType(t.transaction_type) === "refund" || normalizeStatus(t.status) === "refunded";

export const BillingOverview = ({ entityType, entityId }: BillingOverviewProps) => {
  const { transactions, isLoading, refetch, totalRevenue, totalRefunds, netRevenue } = useBillingTransactions({
    entityType,
    entityId,
  });

  const currency = transactions.find((t) => t.currency)?.currency || "usd";

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
      </div>
    );
  }

  const revenueTxCount = transactions.filter((t) => normalizeStatus(t.status) === "completed" && !isRefundLike(t)).length;
  const refundTxCount = transactions.filter((t) => isRefundLike(t)).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCents(totalRevenue, currency)}</div>
            <p className="text-xs text-muted-foreground">From {revenueTxCount} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCents(totalRefunds, currency)}</div>
            <p className="text-xs text-muted-foreground">{refundTxCount} refunds processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netRevenue >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatCents(netRevenue, currency)}
            </div>
            <p className="text-xs text-muted-foreground">After refunds</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {!transactions.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 10).map((transaction) => {
                const refundLike = isRefundLike(transaction);
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${refundLike ? "bg-destructive/10" : "bg-green-500/10"}`}>
                        {refundLike ? (
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
                      <span className={`font-semibold ${refundLike ? "text-destructive" : "text-green-600"}`}>
                        {refundLike ? "-" : "+"}
                        {formatCents(Math.abs(Number(transaction.amount_cents || 0)), transaction.currency || "usd")}
                      </span>
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
};
