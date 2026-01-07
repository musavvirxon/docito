import { useEffect } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SEOHead } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";

// Premium sections (CONTENT ONLY)
import PremiumHero from "@/components/home/premium/PremiumHero";
import SmartSearch from "@/components/home/premium/SmartSearch";
import ProviderCards from "@/components/home/premium/ProviderCards";
import PlatformPillars from "@/components/home/premium/PlatformPillars";
import LiveMetrics from "@/components/home/premium/LiveMetrics";
import SpecialtiesCarousel from "@/components/home/premium/SpecialtiesCarousel";
import FeaturedProviders from "@/components/home/premium/FeaturedProviders";
import DiagnosticsSection from "@/components/home/premium/DiagnosticsSection";
import BookingSteps from "@/components/home/premium/BookingSteps";
import CapabilitiesGrid from "@/components/home/premium/CapabilitiesGrid";
import DashboardDemo from "@/components/home/premium/DashboardDemo";
import TeamCollaboration from "@/components/home/premium/TeamCollaboration";
import TrendingServices from "@/components/home/premium/TrendingServices";
import NearbyPharmacies from "@/components/home/premium/NearbyPharmacies";
import InsuranceProviders from "@/components/home/premium/InsuranceProviders";
import FAQ from "@/components/home/premium/FAQ";
import GlobalTrust from "@/components/home/premium/GlobalTrust";
import FinalCTA from "@/components/home/premium/FinalCTA";
import MobileAppShowcase from "@/components/home/premium/MobileAppShowcase";
import ScrollToTop from "@/components/home/premium/ScrollToTop";

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

      {/* NOTE: Navbar/Footer are provided by PublicLayout */}
      <div className="bg-background text-foreground antialiased">
        <main>
          <PremiumHero />
          <SmartSearch />
          <ProviderCards />
          <PlatformPillars />
          <LiveMetrics />
          <SpecialtiesCarousel />
          <FeaturedProviders />
          <DiagnosticsSection />
          <TrendingServices />
          <NearbyPharmacies />
          <BookingSteps />
          <CapabilitiesGrid />
          <DashboardDemo />
          <TeamCollaboration />
          <InsuranceProviders />
          <FAQ />
          <GlobalTrust />
          <MobileAppShowcase />
          <FinalCTA />
        </main>

        <ScrollToTop />
      </div>
    </ThemeProvider>
  );
}
