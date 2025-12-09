import { Check, Star, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { cn } from "@/lib/utils";

interface SubscriptionPlansProps {
  userId?: string;
  onSelectPlan?: (planId: string) => void;
}

const planIcons: Record<string, React.ReactNode> = {
  basic: <Zap className="h-5 w-5" />,
  professional: <Star className="h-5 w-5" />,
  enterprise: <Crown className="h-5 w-5" />,
};

export function SubscriptionPlans({ userId, onSelectPlan }: SubscriptionPlansProps) {
  const { plans, plansLoading, currentSubscription, createSubscription } = useSubscriptions(userId);

  const handleSelectPlan = async (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
    } else {
      await createSubscription.mutateAsync(planId);
    }
  };

  if (plansLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-6 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-10 bg-muted rounded" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 bg-muted rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const currentPlanId = currentSubscription?.plan_id;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans?.map((plan) => {
        const isCurrentPlan = plan.id === currentPlanId;
        const features = (plan.features as string[]) || [];
        const planKey = plan.name.toLowerCase().replace(/\s+/g, '_');
        const billingPeriod = plan.billing_interval || 'month';

        return (
          <Card
            key={plan.id}
            className={cn(
              "relative flex flex-col transition-all hover:shadow-lg",
              isCurrentPlan && "border-primary ring-2 ring-primary/20"
            )}
          >
            {isCurrentPlan && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Current Plan
              </Badge>
            )}
            
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {planIcons[planKey] || <Star className="h-5 w-5" />}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <div className="mb-6">
                <span className="text-4xl font-bold">
                  ${(plan.price / 100).toFixed(0)}
                </span>
                <span className="text-muted-foreground">
                  /{billingPeriod === 'yearly' || billingPeriod === 'year' ? 'year' : 'month'}
                </span>
              </div>

              <ul className="space-y-3">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant={isCurrentPlan ? "outline" : "default"}
                disabled={isCurrentPlan || createSubscription.isPending}
                onClick={() => handleSelectPlan(plan.id)}
              >
                {isCurrentPlan
                  ? "Current Plan"
                  : createSubscription.isPending
                  ? "Processing..."
                  : "Select Plan"}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
