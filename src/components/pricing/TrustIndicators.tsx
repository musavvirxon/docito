import { Shield, Lock, Award, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const TrustIndicators = () => {
  const indicators = [
    {
      icon: Shield,
      title: "HIPAA Compliant",
      description: "Your medical data is protected with enterprise-grade security"
    },
    {
      icon: Lock,
      title: "Bank-Level Encryption",
      description: "All data encrypted in transit and at rest with AES-256"
    },
    {
      icon: Award,
      title: "ISO 27001 Certified",
      description: "International standard for information security management"
    },
    {
      icon: Users,
      title: "Trusted by 50,000+",
      description: "Healthcare professionals and patients worldwide"
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
