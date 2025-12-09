import { format } from "date-fns";
import { AlertTriangle, Calendar, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { SubscriptionPlans } from "./SubscriptionPlans";

interface SubscriptionManagerProps {
  userId: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  trialing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  past_due: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  canceled: "bg-red-500/10 text-red-500 border-red-500/20",
  incomplete: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export function SubscriptionManager({ userId }: SubscriptionManagerProps) {
  const { currentSubscription, subscriptionLoading, cancelSubscription } = useSubscriptions(userId);

  if (subscriptionLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-20 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!currentSubscription) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>No Active Subscription</CardTitle>
            <CardDescription>
              Choose a plan to unlock premium features and get the most out of your account.
            </CardDescription>
          </CardHeader>
        </Card>
        
        <SubscriptionPlans userId={userId} />
      </div>
    );
  }

  const plan = currentSubscription.subscription_plans;
  const status = currentSubscription.status;
  const currentPeriodEnd = currentSubscription.current_period_end
    ? new Date(currentSubscription.current_period_end)
    : null;
  const billingPeriod = plan?.billing_interval || 'month';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {plan?.name || "Subscription"}
                <Badge variant="outline" className={statusColors[status] || statusColors.incomplete}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </Badge>
              </CardTitle>
              <CardDescription>{plan?.description}</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                ${((plan?.price || 0) / 100).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                per {billingPeriod === 'yearly' || billingPeriod === 'year' ? 'year' : 'month'}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'past_due' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your payment is past due. Please update your payment method to continue your subscription.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Next Billing Date</div>
                <div className="text-sm text-muted-foreground">
                  {currentPeriodEnd ? format(currentPeriodEnd, 'MMMM d, yyyy') : 'N/A'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Payment Method</div>
                <div className="text-sm text-muted-foreground">
                  Configure when payment provider is connected
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Change Plan
              </Button>
              <Button variant="outline" size="sm">
                <CreditCard className="h-4 w-4 mr-2" />
                Update Payment
              </Button>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  Cancel Subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your subscription will remain active until{' '}
                    {currentPeriodEnd ? format(currentPeriodEnd, 'MMMM d, yyyy') : 'the end of your billing period'}.
                    After that, you'll lose access to premium features.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => cancelSubscription.mutate(currentSubscription.id)}
                  >
                    Cancel Subscription
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Upgrade or change your subscription plan at any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionPlans userId={userId} />
        </CardContent>
      </Card>
    </div>
  );
}
