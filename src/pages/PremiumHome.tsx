// src/pages/PremiumHome.tsx
import { useEffect, useCallback } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SEOHead } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";
import LazySection from "@/components/home/premium/LazySection";

// Critical above-the-fold components (load immediately)
import PremiumHero from "@/components/home/premium/PremiumHero";
import SmartSearch from "@/components/home/premium/SmartSearch";

// Factory functions for below-the-fold sections (only loaded when near viewport)
const capabilitiesFactory = () => import("@/components/home/premium/CapabilitiesGrid");
const providerCardsFactory = () => import("@/components/home/premium/ProviderCards");
const platformPillarsFactory = () => import("@/components/home/premium/PlatformPillars");
const specialtiesFactory = () => import("@/components/home/premium/SpecialtiesCarousel");
const diagnosticsFactory = () => import("@/components/home/premium/DiagnosticsSection");
const bookingStepsFactory = () => import("@/components/home/premium/BookingSteps");
const dashboardDemoFactory = () => import("@/components/home/premium/DashboardDemo");
const teamCollaborationFactory = () => import("@/components/home/premium/TeamCollaboration");
const insuranceProvidersFactory = () => import("@/components/home/premium/InsuranceProviders");
const faqFactory = () => import("@/components/home/premium/FAQ");
const globalTrustFactory = () => import("@/components/home/premium/GlobalTrust");
const mobileAppFactory = () => import("@/components/home/premium/MobileAppShowcase");
const finalCtaFactory = () => import("@/components/home/premium/FinalCTA");
const scrollToTopFactory = () => import("@/components/home/premium/ScrollToTop");

export default function PremiumHome() {
  const { t } = useTranslation(["home", "common"]);

  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = prev || "auto";
    };
  }, []);

  return (
    <ThemeProvider>
      <SEOHead
        title={t("home:seo.title", "Docito - Professional Healthcare Platform")}
        description={t(
          "home:seo.description",
          "The complete healthcare operating system. Find doctors, clinics, labs, pharmacies, and imaging centers."
        )}
        keywords={t("home:seo.keywords", "healthcare, doctors, clinics, labs, pharmacies, medical appointments")}
      />

      {/* Navbar + Footer come from PublicLayout */}
      <main className="bg-background text-foreground antialiased">
        {/* Critical above-the-fold content */}
        <PremiumHero />
        <SmartSearch />

        {/* Below-the-fold sections: only loaded when approaching viewport */}
        <LazySection factory={capabilitiesFactory} />
        <LazySection factory={providerCardsFactory} />
        <LazySection factory={platformPillarsFactory} />
        <LazySection factory={specialtiesFactory} />
        <LazySection factory={diagnosticsFactory} />
        <LazySection factory={bookingStepsFactory} />
        <LazySection factory={dashboardDemoFactory} />
        <LazySection factory={teamCollaborationFactory} />
        <LazySection factory={insuranceProvidersFactory} />
        <LazySection factory={faqFactory} />
        <LazySection factory={globalTrustFactory} />
        <LazySection factory={mobileAppFactory} />
        <LazySection factory={finalCtaFactory} />
        <LazySection factory={scrollToTopFactory} rootMargin="0px" fallback={null} />
      </main>
    </ThemeProvider>
  );
}
