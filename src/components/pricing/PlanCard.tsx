import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface PlanCardProps {
  plan: any;
  popular?: boolean;
  enterprise?: boolean;
  billingPeriod: "monthly" | "yearly";
}

export const PlanCard = ({ plan, popular, enterprise, billingPeriod }: PlanCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatStorage = (gb: number | null) => {
    if (!gb) return null;
    if (gb >= 1024) return `${gb / 1024}TB`;
    return `${gb}GB`;
  };

  const formatRecords = (records: number | null) => {
    if (!records) return 'Unlimited';
    if (records >= 1000) return `${(records / 1000).toFixed(0)}k`;
    return records.toString();
  };

  const features = plan.features?.features || [];
  const storage = formatStorage(plan.features?.storageGB);
  const records = formatRecords(plan.features?.maxRecords === 'unlimited' ? null : plan.features?.maxRecords);
  const savings = plan.features?.savings;

  const handleSubscribe = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate('/subscription-management', { state: { selectedPlan: plan.id } });
  };

  const handleContactSales = () => {
    window.location.href = 'mailto:sales@docito.com?subject=Enterprise Plan Inquiry';
  };

  return (
    <Card 
      className={`relative flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        popular ? 'border-primary shadow-lg scale-105 z-10' : 'border-border'
      } ${enterprise ? 'bg-gradient-to-br from-card to-primary/5' : 'bg-card'}`}
    >
      {popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
          Most Popular
        </Badge>
      )}
      
      <CardHeader className="text-center pb-8">
        <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
        <CardDescription className="text-base">{plan.description}</CardDescription>
        
        <div className="mt-6">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-bold text-foreground">
              {formatPrice(plan.price)}
            </span>
            {plan.price > 0 && (
              <span className="text-muted-foreground">
                /{billingPeriod === "monthly" ? "mo" : "yr"}
              </span>
            )}
          </div>
          {savings && (
            <p className="text-sm text-primary font-medium mt-2">{savings}</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-6">
        {/* Storage & Limits */}
        <div className="space-y-3">
          {storage && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-medium">Storage</p>
                <p className="text-xs text-muted-foreground">{storage}</p>
              </div>
            </div>
          )}
          
          {records && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-medium">Medical Records</p>
                <p className="text-xs text-muted-foreground">{records}</p>
              </div>
            </div>
          )}
          
        </div>

        {/* Features List */}
        <div className="space-y-3 pt-4 border-t border-border">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Features
          </p>
          {features.map((feature: string, index: number) => (
            <div key={index} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground leading-relaxed">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pt-6">
        <Button 
          className="w-full h-12 text-base font-semibold"
          onClick={handleSubscribe}
          variant={popular ? "default" : "outline"}
        >
          {plan.price === 0 ? "Get Started" : "Subscribe Now"}
        </Button>
        
        {enterprise && (
          <Button 
            className="w-full h-12 text-base font-semibold"
            onClick={handleContactSales}
            variant="secondary"
          >
            Talk to Sales
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
