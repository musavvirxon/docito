import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PricingHeader } from "@/components/pricing/PricingHeader";
import { BillingToggle } from "@/components/pricing/BillingToggle";
import { PatientPlans } from "@/components/pricing/PatientPlans";
import { DoctorPlans } from "@/components/pricing/DoctorPlans";
import { ClinicPlans } from "@/components/pricing/ClinicPlans";

const Pricing = () => {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  return (
    <>
      <SEOHead
        title="Pricing Plans - Docito Healthcare Platform"
        description="Choose the perfect plan for patients, doctors, or clinics. Flexible pricing with monthly and yearly options."
        keywords="healthcare pricing, medical platform plans, doctor subscription, clinic management pricing"
      />
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-16 space-y-20">
          <PricingHeader />
          
          <BillingToggle 
            period={billingPeriod} 
            onToggle={setBillingPeriod} 
          />
          
          <PatientPlans billingPeriod={billingPeriod} />
          
          <DoctorPlans billingPeriod={billingPeriod} />
          
          <ClinicPlans billingPeriod={billingPeriod} />
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default Pricing;
