// src/pages/PremiumHome.tsx
import { useEffect, lazy, Suspense } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SEOHead } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";

// Critical above-the-fold components (load immediately)
import PremiumHero from "@/components/home/premium/PremiumHero";
import SmartSearch from "@/components/home/premium/SmartSearch";

// Lazy load below-the-fold sections to reduce TBT
const ProviderCards = lazy(() => import("@/components/home/premium/ProviderCards"));
const PlatformPillars = lazy(() => import("@/components/home/premium/PlatformPillars"));
const SpecialtiesCarousel = lazy(() => import("@/components/home/premium/SpecialtiesCarousel"));
const FeaturedProviders = lazy(() => import("@/components/home/premium/FeaturedProviders"));
const TopLabs = lazy(() => import("@/components/home/premium/TopLabs"));
const NearbyPharmacies = lazy(() => import("@/components/home/premium/NearbyPharmacies"));
const DiagnosticsSection = lazy(() => import("@/components/home/premium/DiagnosticsSection"));
const BookingSteps = lazy(() => import("@/components/home/premium/BookingSteps"));
const CapabilitiesGrid = lazy(() => import("@/components/home/premium/CapabilitiesGrid"));
const DashboardDemo = lazy(() => import("@/components/home/premium/DashboardDemo"));
const TeamCollaboration = lazy(() => import("@/components/home/premium/TeamCollaboration"));
const InsuranceProviders = lazy(() => import("@/components/home/premium/InsuranceProviders"));
const FAQ = lazy(() => import("@/components/home/premium/FAQ"));
const GlobalTrust = lazy(() => import("@/components/home/premium/GlobalTrust"));
const FinalCTA = lazy(() => import("@/components/home/premium/FinalCTA"));
const MobileAppShowcase = lazy(() => import("@/components/home/premium/MobileAppShowcase"));
const ScrollToTop = lazy(() => import("@/components/home/premium/ScrollToTop"));

// Lightweight skeleton for lazy sections
const SectionSkeleton = () => (
  <div className="w-full py-16 flex items-center justify-center">
    <div className="animate-pulse w-full max-w-6xl mx-auto px-4">
      <div className="h-8 w-48 bg-muted rounded mb-6 mx-auto" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
      </div>
    </div>
  </div>
);

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

        {/* Lazy-loaded below-the-fold sections */}
        <Suspense fallback={<SectionSkeleton />}>
          <CapabilitiesGrid />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <ProviderCards />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <PlatformPillars />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <SpecialtiesCarousel />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <FeaturedProviders />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <TopLabs />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <NearbyPharmacies />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <DiagnosticsSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <BookingSteps />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <DashboardDemo />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <TeamCollaboration />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <InsuranceProviders />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <FAQ />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <GlobalTrust />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <MobileAppShowcase />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <FinalCTA />
        </Suspense>

        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
      </main>
    </ThemeProvider>
  );
}
