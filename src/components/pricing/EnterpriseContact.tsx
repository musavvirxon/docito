import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Mail, Phone, CheckCircle2 } from "lucide-react";

export const EnterpriseContact = () => {
  const enterpriseFeatures = [
    "Custom integration with existing systems",
    "Dedicated account manager",
    "24/7 priority support",
    "Custom SLA agreements",
    "Advanced security features",
    "Compliance consulting",
    "Unlimited users and storage",
    "On-premise deployment options"
  ];

  return (
    <Card className="max-w-5xl mx-auto bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="text-center pb-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mx-auto mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-3xl md:text-4xl">
          Need an Enterprise Solution?
        </CardTitle>
        <CardDescription className="text-lg mt-2">
          For hospitals, large clinics, and healthcare networks
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-8">
        <div className="grid md:grid-cols-2 gap-4">
          {enterpriseFeatures.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button 
            size="lg" 
            className="gap-2"
            onClick={() => window.location.href = 'mailto:enterprise@docito.com?subject=Enterprise Plan Inquiry'}
          >
            <Mail className="w-5 h-5" />
            Email Sales Team
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="gap-2"
            onClick={() => window.location.href = 'tel:+1234567890'}
          >
            <Phone className="w-5 h-5" />
            Schedule a Call
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Response time: Within 24 hours on business days
        </p>
      </CardContent>
    </Card>
  );
};
