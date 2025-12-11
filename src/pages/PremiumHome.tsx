import { useEffect } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SEOHead } from '@/components/SEOHead';
import { useTranslation } from 'react-i18next';

// Premium components
import GlassHeader from '@/components/home/premium/GlassHeader';
import PremiumHero from '@/components/home/premium/PremiumHero';
import SmartSearch from '@/components/home/premium/SmartSearch';
import ProviderCards from '@/components/home/premium/ProviderCards';
import PlatformPillars from '@/components/home/premium/PlatformPillars';
import LiveMetrics from '@/components/home/premium/LiveMetrics';
import SpecialtiesCarousel from '@/components/home/premium/SpecialtiesCarousel';
import FeaturedProviders from '@/components/home/premium/FeaturedProviders';
import DiagnosticsSection from '@/components/home/premium/DiagnosticsSection';
import BookingSteps from '@/components/home/premium/BookingSteps';
import CapabilitiesGrid from '@/components/home/premium/CapabilitiesGrid';
import DashboardDemo from '@/components/home/premium/DashboardDemo';
import TeamCollaboration from '@/components/home/premium/TeamCollaboration';
import HealthPackages from '@/components/home/premium/HealthPackages';
import TrendingServices from '@/components/home/premium/TrendingServices';
import InsuranceProviders from '@/components/home/premium/InsuranceProviders';
import Testimonials from '@/components/home/premium/Testimonials';
import FAQ from '@/components/home/premium/FAQ';
import GlobalTrust from '@/components/home/premium/GlobalTrust';
import FinalCTA from '@/components/home/premium/FinalCTA';
import MobileAppBanner from '@/components/home/premium/MobileAppBanner';
import PremiumFooter from '@/components/home/premium/PremiumFooter';
import ScrollToTop from '@/components/home/premium/ScrollToTop';

export default function PremiumHome() {
  const { t } = useTranslation(['home', 'common']);

  // Smooth scroll behavior
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <ThemeProvider>
      <SEOHead
        title={t('home:seo.title', 'Docito - Professional Healthcare Platform')}
        description={t('home:seo.description', 'The complete healthcare operating system. Find doctors, clinics, labs, pharmacies, and imaging centers.')}
        keywords={t('home:seo.keywords', 'healthcare, doctors, clinics, labs, pharmacies, medical appointments')}
      />

      <div className="min-h-screen bg-background text-foreground antialiased">
        {/* Glass Header - Fixed */}
        <GlassHeader />

        <main>
          {/* Hero with 3D Orb */}
          <PremiumHero />

          {/* Smart Search */}
          <SmartSearch />

          {/* Provider Cards */}
          <ProviderCards />

          {/* Platform Pillars */}
          <PlatformPillars />

          {/* Live Metrics */}
          <LiveMetrics />

          {/* Specialties Carousel */}
          <SpecialtiesCarousel />

          {/* Featured Providers */}
          <FeaturedProviders />

          {/* Diagnostics Integration */}
          <DiagnosticsSection />

          {/* Trending Services */}
          <TrendingServices />

          {/* Health Packages */}
          <HealthPackages />

          {/* Booking Steps */}
          <BookingSteps />

          {/* Platform Capabilities */}
          <CapabilitiesGrid />

          {/* Dashboard Demo */}
          <DashboardDemo />

          {/* Team Collaboration */}
          <TeamCollaboration />

          {/* Insurance Providers */}
          <InsuranceProviders />

          {/* Testimonials */}
          <Testimonials />

          {/* FAQ */}
          <FAQ />

          {/* Global Trust */}
          <GlobalTrust />

          {/* Final CTA */}
          <FinalCTA />

          {/* Mobile App Banner */}
          <MobileAppBanner />
        </main>

        {/* Footer */}
        <PremiumFooter />

        {/* Scroll to Top */}
        <ScrollToTop />
      </div>
    </ThemeProvider>
  );
}
