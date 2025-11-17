import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { SubscriptionPlansCard } from "@/components/subscription/SubscriptionPlansCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const SubscriptionManagement = () => {
  const { user } = useAuth();
  const { 
    plans, 
    plansLoading, 
    currentSubscription, 
    subscriptionLoading,
    createSubscription,
    cancelSubscription 
  } = useSubscriptions(user?.id);

  const handleSelectPlan = (planId: string) => {
    createSubscription.mutate(planId);
  };

  const handleCancelSubscription = () => {
    if (currentSubscription?.id) {
      cancelSubscription.mutate(currentSubscription.id);
    }
  };

  if (plansLoading || subscriptionLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription plan and billing
        </p>
      </div>

      {currentSubscription && (
        <Card>
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription>Your active plan details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{currentSubscription.subscription_plans?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentSubscription.subscription_plans?.description}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Cancel Subscription</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelSubscription}>
                        Cancel Subscription
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{currentSubscription.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Next Billing Date</p>
                  <p className="font-medium">
                    {format(new Date(currentSubscription.current_period_end), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-semibold mb-4">
          {currentSubscription ? 'Change Plan' : 'Choose a Plan'}
        </h2>
        <SubscriptionPlansCard
          plans={plans || []}
          currentPlanId={currentSubscription?.plan_id}
          onSelectPlan={handleSelectPlan}
          isLoading={createSubscription.isPending}
        />
      </div>
    </div>
  );
};

export default SubscriptionManagement;
