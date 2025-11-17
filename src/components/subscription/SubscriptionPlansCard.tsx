import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_interval: string;
  target_audience: string;
  features: any;
  is_active: boolean;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
}

interface SubscriptionPlansCardProps {
  plans: Plan[];
  currentPlanId?: string;
  onSelectPlan: (planId: string) => void;
  isLoading?: boolean;
}

export const SubscriptionPlansCard = ({ 
  plans, 
  currentPlanId, 
  onSelectPlan, 
  isLoading 
}: SubscriptionPlansCardProps) => {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price / 100);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {plans?.map((plan) => (
        <Card 
          key={plan.id} 
          className={`relative ${currentPlanId === plan.id ? 'border-primary' : ''}`}
        >
          {currentPlanId === plan.id && (
            <Badge className="absolute -top-2 right-4">Current Plan</Badge>
          )}
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <span className="text-4xl font-bold">
                {formatPrice(plan.price, plan.currency)}
              </span>
              <span className="text-muted-foreground">/{plan.billing_interval}</span>
            </div>
            <ul className="space-y-2">
              {plan.features && typeof plan.features === 'object' && 
                Object.entries(plan.features).map(([key, value]) => (
                  <li key={key} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">{String(value)}</span>
                  </li>
                ))
              }
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={() => onSelectPlan(plan.id)}
              disabled={isLoading || currentPlanId === plan.id}
            >
              {currentPlanId === plan.id ? 'Active' : 'Subscribe'}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
