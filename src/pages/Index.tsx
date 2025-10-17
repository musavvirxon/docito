import { ThemeProvider } from "@/contexts/ThemeContext";
import ModernNavbar from "@/components/home/ModernNavbar";
import ModernHeroSection from "@/components/home/ModernHeroSection";
import ValuePropositionSection from "@/components/home/ValuePropositionSection";
import SpecialtiesGrid from "@/components/home/SpecialtiesGrid";
import TopSpecialistsSection from "@/components/TopSpecialistsSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import FeaturesGrid from "@/components/home/FeaturesGrid";
import CTASection from "@/components/home/CTASection";
import ModernFooter from "@/components/home/ModernFooter";

const Index = () => {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background transition-colors duration-300">
        <ModernNavbar />
        <main>
          <ModernHeroSection />
          <ValuePropositionSection />
          <SpecialtiesGrid />
          <TopSpecialistsSection />
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
