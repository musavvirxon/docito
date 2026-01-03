// medicalbook-55/src/pages/Index.tsx

import { Suspense, lazy, memo, useEffect } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import {
  SEOHead,
  generateOrganizationSchema,
  generateMedicalWebsiteSchema,
} from "@/components/SEOHead";
import { useTranslation } from "react-i18next";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";

// Eagerly load above-the-fold components
import ModernNavbar from "@/components/home/ModernNavbar";
import ModernHeroSection from "@/components/home/ModernHeroSection";

// Lazy load below-the-fold components for faster initial load
const LiveCareMoment = lazy(() => import("@/components/home/LiveCareMoment"));
const TrustIndicators = lazy(() => import("@/components/home/TrustIndicators"));
const ValuePropositionSection = lazy(
  () => import("@/components/home/ValuePropositionSection")
);
const TopSpecialties = lazy(() =>
  import("@/components/home/sections").then((m) => ({ default: m.TopSpecialties }))
);
const TopClinics = lazy(() =>
  import("@/components/home/sections").then((m) => ({ default: m.TopClinics }))
);
const TopPharmacies = lazy(() =>
  import("@/components/home/sections").then((m) => ({ default: m.TopPharmacies }))
);
const MostBookedServices = lazy(() =>
  import("@/components/home/sections").then((m) => ({ default: m.MostBookedServices }))
);
const HowItWorksSection = lazy(() => import("@/components/home/HowItWorksSection"));
const FeaturesGrid = lazy(() => import("@/components/home/FeaturesGrid"));
const CollaborationSection = lazy(() => import("@/components/home/CollaborationSection"));
const MobileFriendlySection = lazy(() => import("@/components/home/MobileFriendlySection"));
const CTASection = lazy(() => import("@/components/home/CTASection"));
const ModernFooter = lazy(() => import("@/components/home/ModernFooter"));

// Lightweight section skeleton
const SectionSkeleton = memo(() => (
  <div className="w-full py-16 animate-pulse">
    <div className="container mx-auto px-4">
      <div className="h-8 w-48 bg-muted rounded mb-8 mx-auto" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  </div>
));

SectionSkeleton.displayName = "SectionSkeleton";

const Index = () => {
  const { t, i18n } = useTranslation(["home", "common"]);
  useSmoothScroll(0.2);

  // Keep HTML lang/dir synced with i18n for SEO + accessibility (RTL support)
  useEffect(() => {
    const lang = i18n.language || "en";
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [i18n.language]);

  // Combined structured data for the homepage
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      generateOrganizationSchema(),
      generateMedicalWebsiteSchema(),
      {
        "@type": "WebPage",
        "@id": "https://docito.app/#webpage",
        url: "https://docito.app/",
        name: t("home:seo.title", "Docito® — Unified Healthcare Management & Booking Platform"),
        description: t(
          "home:seo.description",
          "Docito® is a unified healthcare management and booking platform connecting patients, doctors, clinics, labs, pharmacies, imaging centers, hospitals, and insurance—secure scheduling, referrals, records, prescriptions, messaging, and analytics."
        ),
        isPartOf: { "@id": "https://docito.app/#website" },
        about: { "@id": "https://docito.app/#organization" },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: "https://docito.app/logos/social/docito-og-image.png",
        },
      },
    ],
  };

  return (
    <ThemeProvider>
      <SEOHead
        title={t("home:seo.title", "Docito® — Unified Healthcare Management & Booking Platform")}
        description={t(
          "home:seo.description",
          "Docito® is a unified healthcare management and booking platform connecting patients, doctors, clinics, labs, pharmacies, imaging centers, hospitals, and insurance—secure scheduling, referrals, records, prescriptions, messaging, and analytics."
        )}
        keywords={t(
          "home:seo.keywords",
          "healthcare management platform, doctor booking system, clinic management software, lab management system, pharmacy platform, imaging center software, patient appointment booking, healthcare referrals, medical records system, HIPAA compliant healthcare software, multilingual healthcare SaaS"
        )}
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-background transition-colors duration-300">
        <ModernNavbar />

        <main>
          {/* Hero is critical - load immediately */}
          <ModernHeroSection />

          {/* Below fold - lazy load with suspense */}
          <Suspense fallback={<SectionSkeleton />}>
            <LiveCareMoment />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <TrustIndicators />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <ValuePropositionSection />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <TopSpecialties />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <TopClinics />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <TopPharmacies />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <MostBookedServices />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <HowItWorksSection />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <FeaturesGrid />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <CollaborationSection />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <MobileFriendlySection />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <CTASection />
          </Suspense>
        </main>

        <Suspense fallback={<div className="h-64 bg-muted animate-pulse" />}>
          <ModernFooter />
        </Suspense>
      </div>
    </ThemeProvider>
  );
};

export default memo(Index);
