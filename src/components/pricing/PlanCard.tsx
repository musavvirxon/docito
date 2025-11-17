import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

interface PlanCardProps {
  plan: any;
  popular?: boolean;
  enterprise?: boolean;
  billingPeriod: "monthly" | "yearly";
}

export const PlanCard = ({ plan, popular, enterprise, billingPeriod }: PlanCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation('pricing');

  const formatPrice = (price: number) => {
    if (price === 0) return t('card.free');
    // Convert cents to dollars
    const dollars = price / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(dollars);
  };

  const formatStorage = (gb: number | null, mb: number | null) => {
    if (mb && mb < 1024) return `${mb}MB`;
    if (!gb) return null;
    if (gb >= 1024) return `${gb / 1024}TB`;
    return `${gb}GB`;
  };

  const formatRecords = (records: number | null | string) => {
    if (!records || records === 'unlimited') return t('card.unlimited');
    if (typeof records === 'number' && records >= 1000) return `${(records / 1000).toFixed(0)}k`;
    return records.toString();
  };

  const formatDoctors = (doctors: number | null | string) => {
    if (!doctors || doctors === 'unlimited') return t('card.unlimited');
    return doctors.toString();
  };

  const formatFileSize = (mb: number | null) => {
    if (!mb) return null;
    if (mb >= 1024) return `${(mb / 1024).toFixed(0)}GB`;
    return `${mb}MB`;
  };

  const features = plan.features?.features || [];
  const storage = formatStorage(plan.features?.storageGB, plan.features?.storageMB);
  const records = formatRecords(plan.features?.maxRecords);
  const diagnoses = formatRecords(plan.features?.maxDiagnoses);
  const treatmentSummaries = formatRecords(plan.features?.maxTreatmentSummaries);
  const doctors = plan.features?.maxDoctors ? formatDoctors(plan.features?.maxDoctors) : null;
  const maxFileSize = formatFileSize(plan.features?.maxFileSize);
  const savings = plan.features?.savings;

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // TODO: Implement direct subscription flow with payment modal
    console.log('Subscribe to plan:', plan.id);
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
          {t('card.mostPopular')}
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
                {billingPeriod === "monthly" ? t('card.perMonth') : t('card.perYear')}
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
                <p className="text-sm font-medium">{t('card.storage')}</p>
                <p className="text-xs text-muted-foreground">{storage}</p>
              </div>
            </div>
          )}
          
          {records && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-medium">{t('card.maxRecords')}</p>
                <p className="text-xs text-muted-foreground">{records}</p>
              </div>
            </div>
          )}

          {diagnoses && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-medium">{t('card.maxDiagnoses')}</p>
                <p className="text-xs text-muted-foreground">{diagnoses}</p>
              </div>
            </div>
          )}

          {treatmentSummaries && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-medium">{t('card.maxTreatmentSummaries')}</p>
                <p className="text-xs text-muted-foreground">{treatmentSummaries}</p>
              </div>
            </div>
          )}
          
          {doctors && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-medium">{t('card.maxDoctors')}</p>
                <p className="text-xs text-muted-foreground">{doctors}</p>
              </div>
            </div>
          )}

          {maxFileSize && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-medium">{t('card.maxFileSize')}</p>
                <p className="text-xs text-muted-foreground">{maxFileSize}</p>
              </div>
            </div>
          )}
        </div>

        {/* Features List */}
        <div className="space-y-3 pt-4 border-t border-border">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('card.features')}
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
