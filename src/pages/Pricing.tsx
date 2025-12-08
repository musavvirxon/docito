import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SEOHead } from "@/components/SEOHead";
import ModernNavbar from "@/components/home/ModernNavbar";
import ModernFooter from "@/components/home/ModernFooter";
import { PricingHeader } from "@/components/pricing/PricingHeader";
import { BillingToggle } from "@/components/pricing/BillingToggle";
import { PricingNavigation } from "@/components/pricing/PricingNavigation";
import { PatientPlans } from "@/components/pricing/PatientPlans";
import { DoctorPlans } from "@/components/pricing/DoctorPlans";
import { ClinicPlans } from "@/components/pricing/ClinicPlans";
import { FeatureComparisonTable } from "@/components/pricing/FeatureComparisonTable";
import { PricingFAQ } from "@/components/pricing/PricingFAQ";
import { TrustIndicators } from "@/components/pricing/TrustIndicators";
import { EnterpriseContact } from "@/components/pricing/EnterpriseContact";
import { MoneyBackGuarantee } from "@/components/pricing/MoneyBackGuarantee";
import { CallToAction } from "@/components/pricing/CallToAction";
import { PricingIllustration } from "@/components/Visuals/illustrations";

const Pricing = () => {
  const { t } = useTranslation('pricing');
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  return (
    <>
      <SEOHead
        title={t('seo.title')}
        description={t('seo.description')}
        keywords={t('seo.keywords')}
      />
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col min-h-screen">
          <ModernNavbar />
        
        <main className="flex-1 container mx-auto px-4 py-16 pt-28 space-y-20">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1">
              <PricingHeader />
            </div>
            <div className="w-full max-w-xs lg:max-w-sm">
              <PricingIllustration className="w-full h-auto" />
            </div>
          </div>
          
          <BillingToggle 
            period={billingPeriod} 
            onToggle={setBillingPeriod} 
          />
          
          <PricingNavigation onNavigate={(section) => console.log(section)} />
          
          <TrustIndicators />
          
          <section id="patients" className="scroll-mt-20">
            <PatientPlans billingPeriod={billingPeriod} />
          </section>
          
          <section id="doctors" className="scroll-mt-20">
            <DoctorPlans billingPeriod={billingPeriod} />
          </section>
          
          <section id="clinics" className="scroll-mt-20">
            <ClinicPlans billingPeriod={billingPeriod} />
          </section>
          
          <FeatureComparisonTable />
          
          <EnterpriseContact />
          
          <MoneyBackGuarantee />
          
          <PricingFAQ />
          
          <CallToAction />
        </main>
          
          <ModernFooter />
        </div>
      </div>
    </>
  );
};

export default Pricing;
