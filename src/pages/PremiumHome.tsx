// File: src/pages/PremiumHome.tsx
import { useEffect } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SEOHead } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";
import LazySection from "@/components/home/premium/LazySection";

// Critical above-the-fold components (load immediately)
import PremiumHero from "@/components/home/premium/PremiumHero";
import SmartSearch from "@/components/home/premium/SmartSearch";

// Patient-first below-the-fold
const providerCardsFactory = () => import("@/components/home/premium/ProviderCards");
const specialtiesFactory = () => import("@/components/home/premium/SpecialtiesCarousel");
const diagnosticsFactory = () => import("@/components/home/premium/DiagnosticsSection");
const bookingStepsFactory = () => import("@/components/home/premium/BookingSteps");
const faqFactory = () => import("@/components/home/premium/FAQ");
const mobileAppFactory = () => import("@/components/home/premium/MobileAppShowcase");

// B2B / facility-first below-the-fold
const capabilitiesFactory = () => import("@/components/home/premium/CapabilitiesGrid");
const platformPillarsFactory = () => import("@/components/home/premium/PlatformPillars");
const facilityAutomationFactory = () =>
  import("@/components/home/premium/FacilityAutomationSection");
const teamCollaborationFactory = () =>
  import("@/components/home/premium/TeamCollaboration");
const insuranceProvidersFactory = () =>
  import("@/components/home/premium/InsuranceProviders");

// General
const globalTrustFactory = () => import("@/components/home/premium/GlobalTrust");
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
        keywords={t(
          "home:seo.keywords",
          "healthcare, doctors, clinics, labs, pharmacies, medical appointments"
        )}
      />

      <main className="bg-background text-foreground antialiased">
        {/* HERO (mixed audience) */}
        <PremiumHero />

        {/* PATIENT-FIRST */}
        <SmartSearch />
        <LazySection factory={providerCardsFactory} />
        <LazySection factory={specialtiesFactory} />
        <LazySection factory={diagnosticsFactory} />
        <LazySection factory={bookingStepsFactory} />
        <LazySection factory={faqFactory} />
        <LazySection factory={mobileAppFactory} />

        {/* B2B / FACILITY-FIRST */}
        <LazySection factory={capabilitiesFactory} />
        <LazySection factory={platformPillarsFactory} />
        <LazySection factory={facilityAutomationFactory} />
        <LazySection factory={teamCollaborationFactory} />
        <LazySection factory={insuranceProvidersFactory} />

        {/* GENERAL */}
        <LazySection factory={globalTrustFactory} />
        <LazySection factory={finalCtaFactory} />
        <LazySection factory={scrollToTopFactory} rootMargin="0px" fallback={null} />
      </main>
    </ThemeProvider>
  );
}
