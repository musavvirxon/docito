import { ThemeProvider } from "@/contexts/ThemeContext";
import ModernNavbar from "@/components/home/ModernNavbar";
import ModernHeroSection from "@/components/home/ModernHeroSection";
import ValuePropositionSection from "@/components/home/ValuePropositionSection";
import SpecialtiesGrid from "@/components/home/SpecialtiesGrid";
import TopSpecialistsSection from "@/components/TopSpecialistsSection";
import TopMedicalPracticesSection from "@/components/TopMedicalPracticesSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import FeaturesGrid from "@/components/home/FeaturesGrid";
import CTASection from "@/components/home/CTASection";
import ModernFooter from "@/components/home/ModernFooter";
import { SEOHead } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation(['home', 'common']);
  
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
          <SpecialtiesGrid />
          <TopSpecialistsSection />
          <TopMedicalPracticesSection />
          <HowItWorksSection />
          <FeaturesGrid />
          <CTASection />
        </main>
        <ModernFooter />
      </div>
    </ThemeProvider>
  );
};

export default Index;
