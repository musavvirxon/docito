// src/pages/PremiumHome.tsx
import { Suspense, lazy } from "react";
import { SEOHead } from "@/components/SEOHead";

const LazySection = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="min-h-screen" />}>{children}</Suspense>
);

// Lazy load premium home components
const PremiumHero = lazy(() => import("@/components/home/premium/PremiumHero"));
const CapabilitiesGrid = lazy(() => import("@/components/home/premium/CapabilitiesGrid"));
const SmartSearch = lazy(() => import("@/components/home/premium/SmartSearch"));
const ProviderCards = lazy(() => import("@/components/home/premium/ProviderCards"));
const PlatformPillars = lazy(() => import("@/components/home/premium/PlatformPillars"));
const SpecialtiesCarousel = lazy(() => import("@/components/home/premium/SpecialtiesCarousel"));
const DiagnosticsSection = lazy(() => import("@/components/home/premium/DiagnosticsSection"));
const BookingSteps = lazy(() => import("@/components/home/premium/BookingSteps"));
const DashboardDemo = lazy(() => import("@/components/home/premium/DashboardDemo"));
const TeamCollaboration = lazy(() => import("@/components/home/premium/TeamCollaboration"));
const InsuranceSection = lazy(() => import("@/components/home/premium/InsuranceSection"));
const MedicalSpecialties = lazy(() => import("@/components/home/premium/MedicalSpecialties"));
const GlobalTrust = lazy(() => import("@/components/home/premium/GlobalTrust"));
const MobileAppShowcase = lazy(() => import("@/components/home/premium/MobileAppShowcase"));
const FinalCTA = lazy(() => import("@/components/home/premium/FinalCTA"));

export default function PremiumHome() {
  return (
    <>
      <SEOHead
        title="Docito | Less admin. More care."
        description="Docito connects patients and providers in one operating system — scheduling, records, prescriptions, payments, and analytics in sync."
        keywords="healthcare platform, clinic management, patient scheduling, EHR, prescriptions, billing, healthcare analytics"
      />

      <LazySection>
        <PremiumHero />
      </LazySection>

      <LazySection>
        <CapabilitiesGrid />
      </LazySection>

      <LazySection>
        <SmartSearch />
      </LazySection>

      <LazySection>
        <PlatformPillars />
      </LazySection>

      <LazySection>
        <ProviderCards />
      </LazySection>

      <LazySection>
        <DiagnosticsSection />
      </LazySection>

      <LazySection>
        <BookingSteps />
      </LazySection>

      <LazySection>
        <DashboardDemo />
      </LazySection>

      <LazySection>
        <TeamCollaboration />
      </LazySection>

      <LazySection>
        <InsuranceSection />
      </LazySection>

      <LazySection>
        <SpecialtiesCarousel />
      </LazySection>

      <LazySection>
        <MedicalSpecialties />
      </LazySection>

      <LazySection>
        <GlobalTrust />
      </LazySection>

      <LazySection>
        <MobileAppShowcase />
      </LazySection>

      <LazySection>
        <FinalCTA />
      </LazySection>
    </>
  );
}
