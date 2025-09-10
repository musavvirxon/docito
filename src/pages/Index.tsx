import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TopSpecialistsSection from "@/components/TopSpecialistsSection";
import TopMedicalPracticesSection from "@/components/TopMedicalPracticesSection";
import FeaturesSection from "@/components/FeaturesSection";
import AppSection from "@/components/AppSection";
import PracticeSection from "@/components/PracticeSection";
import HealthSystemsSection from "@/components/HealthSystemsSection";
import CitiesSection from "@/components/CitiesSection";
import CareersSection from "@/components/CareersSection";
import VisitReasonsSection from "@/components/VisitReasonsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-0">
        <HeroSection />
        <TopSpecialistsSection />
        <TopMedicalPracticesSection />
        <FeaturesSection />
        <AppSection />
        <PracticeSection />
        <HealthSystemsSection />
        <CitiesSection />
        <CareersSection />
        <VisitReasonsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
