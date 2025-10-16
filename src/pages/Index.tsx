import ModernNavbar from "@/components/home/ModernNavbar";
import ModernHeroSection from "@/components/home/ModernHeroSection";
import ValuePropositionSection from "@/components/home/ValuePropositionSection";
import SpecialtiesGrid from "@/components/home/SpecialtiesGrid";
import TopSpecialistsSection from "@/components/TopSpecialistsSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import FeaturesGrid from "@/components/home/FeaturesGrid";
import StatsCounter from "@/components/home/StatsCounter";
import CTASection from "@/components/home/CTASection";
import ModernFooter from "@/components/home/ModernFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />
      <main>
        <ModernHeroSection />
        <ValuePropositionSection />
        <SpecialtiesGrid />
        <TopSpecialistsSection />
        <HowItWorksSection />
        <FeaturesGrid />
        <StatsCounter />
        <CTASection />
      </main>
      <ModernFooter />
    </div>
  );
};

export default Index;
