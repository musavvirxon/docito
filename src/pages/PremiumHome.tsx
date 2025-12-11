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
import GlobalTrust from '@/components/home/premium/GlobalTrust';
import FinalCTA from '@/components/home/premium/FinalCTA';
import MobileAppBanner from '@/components/home/premium/MobileAppBanner';
import PremiumFooter from '@/components/home/premium/PremiumFooter';

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
          {/* Section 1: Hero with 3D Orb */}
          <PremiumHero />

          {/* Section 2: Smart Search */}
          <SmartSearch />

          {/* Section 3: Provider Cards */}
          <ProviderCards />

          {/* Section 4: Platform Pillars */}
          <PlatformPillars />

          {/* Section 5: Live Metrics */}
          <LiveMetrics />

          {/* Section 6: Specialties Carousel */}
          <SpecialtiesCarousel />

          {/* Section 7: Featured Providers */}
          <FeaturedProviders />

          {/* Section 8: Diagnostics Integration */}
          <DiagnosticsSection />

          {/* Section 9: Trending Services */}
          <TrendingServices />

          {/* Section 10: Health Packages */}
          <HealthPackages />

          {/* Section 11: Booking Steps */}
          <BookingSteps />

          {/* Section 12: Platform Capabilities */}
          <CapabilitiesGrid />

          {/* Section 13: Dashboard Demo */}
          <DashboardDemo />

          {/* Section 14: Team Collaboration */}
          <TeamCollaboration />

          {/* Section 15: Global Trust */}
          <GlobalTrust />

          {/* Section 16: Final CTA */}
          <FinalCTA />

          {/* Section 17: Mobile App Banner */}
          <MobileAppBanner />
        </main>

        {/* Footer */}
        <PremiumFooter />
      </div>
    </ThemeProvider>
  );
}
