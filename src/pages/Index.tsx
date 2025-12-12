import { ThemeProvider } from "@/contexts/ThemeContext";
import ModernNavbar from "@/components/home/ModernNavbar";
import ModernHeroSection from "@/components/home/ModernHeroSection";
import ValuePropositionSection from "@/components/home/ValuePropositionSection";
import { TopSpecialties, TopClinics, TopPharmacies, MostBookedServices } from "@/components/home/sections";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import FeaturesGrid from "@/components/home/FeaturesGrid";
import DashboardPreviewSection from "@/components/home/DashboardPreviewSection";
import CollaborationSection from "@/components/home/CollaborationSection";
import MobileFriendlySection from "@/components/home/MobileFriendlySection";
import CTASection from "@/components/home/CTASection";
import ModernFooter from "@/components/home/ModernFooter";
import { SEOHead } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";

const Index = () => {
  const { t } = useTranslation(['home', 'common']);
  useSmoothScroll(0.2);
  
  return (
    <ThemeProvider>
      <SEOHead 
        title={t('home:seo.title', 'Docito - Book Doctor Appointments Online')}
        description={t('home:seo.description', 'Find and book appointments with verified doctors and medical practices. Fast, secure, and convenient healthcare booking platform.')}
        keywords={t('home:seo.keywords', 'doctor appointment, book doctor, medical practice, healthcare, telemedicine')}
      />
      <div className="min-h-screen bg-background transition-colors duration-300">
        <ModernNavbar />
        <main>
          <ModernHeroSection />
          <ValuePropositionSection />
          <TopSpecialties />
          <TopClinics />
          <TopPharmacies />
          <MostBookedServices />
          <HowItWorksSection />
          <FeaturesGrid />
          <DashboardPreviewSection />
          <CollaborationSection />
          <MobileFriendlySection />
          <CTASection />
        </main>
        <ModernFooter />
      </div>
    </ThemeProvider>
  );
};

export default Index;
