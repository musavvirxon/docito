// File: src/pages/Pricing.tsx

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SEOHead } from "@/components/SEOHead";
import { PricingHeader } from "@/components/pricing/PricingHeader";
import { PricingFAQ } from "@/components/pricing/PricingFAQ";
import { TrustIndicators } from "@/components/pricing/TrustIndicators";
import { CallToAction } from "@/components/pricing/CallToAction";
import { PricingIllustration } from "@/components/Visuals/illustrations";
import { PricingMatrix } from "@/components/pricing/PricingMatrix";

const Pricing = () => {
  const { t } = useTranslation("pricing");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  return (
    <>
      <SEOHead title={t("seo.title")} description={t("seo.description")} keywords={t("seo.keywords")} />
      <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          <main className="flex-1 container mx-auto px-4 py-16 pt-12 space-y-20">
            {/* HERO */}
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-1">
                <PricingHeader />
              </div>
              <div className="w-full max-w-xs lg:max-w-sm">
                <PricingIllustration className="w-full h-auto" />
              </div>
            </div>

            {/* Apple-style plans (3) on top, roles on left + monthly/yearly toggle */}
            <PricingMatrix period={billingPeriod} onChangePeriod={setBillingPeriod} />

            {/* Premium sections */}
            <TrustIndicators />
            <PricingFAQ />
            <CallToAction />
          </main>
        </div>
      </div>
    </>
  );
};

export default Pricing;
