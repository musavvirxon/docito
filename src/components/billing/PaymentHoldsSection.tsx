import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { usePaymentHolds, PaymentHold } from '@/hooks/usePaymentHolds';
import { format } from 'date-fns';

interface PaymentHoldsSectionProps {
  userId: string;
  canCapture?: boolean;
}

const formatAmount = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

const getStatusIcon = (status: PaymentHold['status']) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'held':
      return <Lock className="h-4 w-4" />;
    case 'captured':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'released':
    case 'refunded':
      return <Unlock className="h-4 w-4 text-amber-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getStatusBadge = (status: PaymentHold['status']) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    held: 'default',
    captured: 'default',
    released: 'outline',
    refunded: 'outline',
    failed: 'destructive',
  };
  
  return (
    <Badge variant={variants[status] || 'secondary'} className="flex items-center gap-1">
      {getStatusIcon(status)}
      {status}
    </Badge>
  );
};

export const PaymentHoldsSection = ({ userId, canCapture = false }: PaymentHoldsSectionProps) => {
  const { holds, isLoading, captureHold, releaseHold } = usePaymentHolds(userId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeHolds = holds?.filter(h => ['pending', 'held'].includes(h.status)) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Payment Holds
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!holds?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payment holds</p>
          </div>
        ) : (
          <div className="space-y-3">
            {holds.map((hold) => (
              <div
                key={hold.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {formatAmount(hold.amount, hold.currency)}
                    </span>
                    {getStatusBadge(hold.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created: {format(new Date(hold.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                  {hold.hold_expires_at && hold.status === 'held' && (
                    <p className="text-xs text-muted-foreground">
                      Expires: {format(new Date(hold.hold_expires_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                  {hold.refund_reason && (
                    <p className="text-xs text-muted-foreground">
                      Reason: {hold.refund_reason}
                    </p>
                  )}
                </div>
                
                {hold.status === 'held' && canCapture && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => releaseHold.mutate({ holdId: hold.id })}
                      disabled={releaseHold.isPending}
                    >
                      {releaseHold.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Unlock className="h-4 w-4 mr-1" />
                          Release
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => captureHold.mutate(hold.id)}
                      disabled={captureHold.isPending}
                    >
                      {captureHold.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Capture
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {activeHolds.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium">
              Active Holds: {formatAmount(
                activeHolds.reduce((sum, h) => sum + h.amount, 0),
                'usd'
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
