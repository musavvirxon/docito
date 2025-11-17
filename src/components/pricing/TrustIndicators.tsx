import { Shield, Lock, Award, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export const TrustIndicators = () => {
  const { t } = useTranslation('pricing');
  
  const indicators = [
    {
      icon: Shield,
      title: t('trust.hipaa.title'),
      description: t('trust.hipaa.description')
    },
    {
      icon: Lock,
      title: t('trust.encryption.title'),
      description: t('trust.encryption.description')
    },
    {
      icon: Award,
      title: t('trust.iso.title'),
      description: t('trust.iso.description')
    },
    {
      icon: Users,
      title: t('trust.trusted.title'),
      description: t('trust.trusted.description')
    }
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
      {indicators.map((indicator, index) => {
        const Icon = indicator.icon;
        return (
          <Card key={index} className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="pt-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">{indicator.title}</h3>
              <p className="text-sm text-muted-foreground">{indicator.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
