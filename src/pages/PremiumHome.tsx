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

          {/* Section 13: Mobile App Banner */}
          <MobileAppBanner />
        </main>

        {/* Footer */}
        <PremiumFooter />
      </div>
    </ThemeProvider>
  );
}
