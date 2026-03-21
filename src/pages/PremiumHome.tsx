// File: src/pages/PremiumHome.tsx
import { useEffect, lazy, Suspense } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SEOHead } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";
import LazySection from "@/components/home/premium/LazySection";
import { usePublicChrome } from "@/contexts/PublicChromeContext";

// Critical above-the-fold components (load immediately)
import PremiumHero from "@/components/home/premium/PremiumHero";
import SmartSearch from "@/components/home/premium/SmartSearch";

// Lazy-load nav/footer for standalone rendering (when not wrapped by PublicLayout)
const PremiumTopNav = lazy(() => import("@/components/home/premium/PremiumTopNav"));
const PremiumFooter = lazy(() => import("@/components/home/premium/PremiumFooter"));

// Minimal skeleton for nav to prevent layout shift
const NavSkeleton = () => (
  <>
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-2xl border-b border-border/40">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 h-full flex items-center">
        <div className="w-20 h-6 bg-muted/50 rounded animate-pulse" />
      </div>
    </nav>
    <div className="h-14" />
  </>
);

// Patient-first below-the-fold
const providerCardsFactory = () => import("@/components/home/premium/ProviderCards");
const specialtiesFactory = () => import("@/components/home/premium/SpecialtiesCarousel");
const diagnosticsFactory = () => import("@/components/home/premium/DiagnosticsSection");
const faqFactory = () => import("@/components/home/premium/FAQ");
const mobileAppFactory = () => import("@/components/home/premium/MobileAppShowcase");

// B2B / facility-first below-the-fold
const capabilitiesFactory = () => import("@/components/home/premium/CapabilitiesGrid");
const platformPillarsFactory = () => import("@/components/home/premium/PlatformPillars");
const facilityAutomationFactory = () =>
  import("@/components/home/premium/FacilityAutomationSection");
const teamCollaborationFactory = () => import("@/components/home/premium/TeamCollaboration");
const insuranceProvidersFactory = () => import("@/components/home/premium/InsuranceProviders");

// General
const globalTrustFactory = () => import("@/components/home/premium/GlobalTrust");
const finalCtaFactory = () => import("@/components/home/premium/FinalCTA");
const scrollToTopFactory = () => import("@/components/home/premium/ScrollToTop");

export default function PremiumHome() {
  const { t } = useTranslation(["home", "common"]);
  const { headerProvided, footerProvided } = usePublicChrome();
  const showMobileAppSection = false;

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
          "The complete healthcare operating system. Automates all healthcare facilities in one place. Find doctors, clinics, labs, pharmacies, and imaging centers.",
        )}
        keywords={t(
          "home:seo.keywords",
          "healthcare, doctors, clinics, labs, pharmacies, medical appointments, clinic automatization, patient records, medical management",
        )}
      />

      <div className="min-h-screen flex flex-col bg-background text-foreground antialiased">
        {/* Standalone header (only if layout did not provide one) */}
        {!headerProvided ? (
          <Suspense fallback={<NavSkeleton />}>
            <PremiumTopNav />
          </Suspense>
        ) : null}

        <main className="flex-1">
          {/* HERO (mixed audience) */}
          <PremiumHero />

          {/* PATIENT-FIRST */}
          <SmartSearch />
          <LazySection factory={providerCardsFactory} />
          <LazySection factory={specialtiesFactory} />
          <LazySection factory={diagnosticsFactory} />

          {/* B2B / FACILITY-FIRST */}
          <LazySection factory={capabilitiesFactory} />
          <LazySection factory={platformPillarsFactory} />
          <LazySection factory={facilityAutomationFactory} />
          <LazySection factory={teamCollaborationFactory} />
          <LazySection factory={insuranceProvidersFactory} />

          {/* GENERAL */}
          <LazySection factory={globalTrustFactory} />
          {showMobileAppSection ? <LazySection factory={mobileAppFactory} /> : null}
          <LazySection factory={faqFactory} />
          <LazySection factory={finalCtaFactory} />
          <LazySection factory={scrollToTopFactory} rootMargin="0px" fallback={null} />
        </main>

        {/* Standalone footer (only if layout did not provide one) */}
        {!footerProvided ? (
          <Suspense fallback={null}>
            <PremiumFooter />
          </Suspense>
        ) : null}
      </div>
    </ThemeProvider>
  );
}
