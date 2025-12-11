import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronDown, CreditCard, Calendar, FileText, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import ProminentSearchBar from "./ProminentSearchBar";
import SearchResults from "@/components/patient/SearchResults";
import { useDoctors } from "@/hooks/useDoctors";
import { usePractices } from "@/hooks/usePractices";
import { useBookingAuth } from "@/hooks/useBookingAuth";
import { Logo } from "@/components/Logo";
import HeroIllustration from "./illustrations/HeroIllustration";
import SearchBarAnimation from "./illustrations/SearchBarAnimation";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const ModernHeroSection = () => {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { t } = useTranslation('home');
  const { searchDoctors } = useDoctors();
  const { searchPractices } = usePractices();
  const { handleBookingClick } = useBookingAuth();

  const handleSearch = useCallback(async (specialty: string, location: string, insurance: string) => {
    if (!specialty.trim() && !location.trim()) return;

    setSearching(true);
    
    // Scroll to results section
    setTimeout(() => {
      const resultsSection = document.getElementById('search-results');
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    try {
      const [doctorsResults, practicesResults] = await Promise.all([
        searchDoctors(specialty, location),
        searchPractices(specialty, location),
      ]);

      const transformedDoctors = doctorsResults
        .filter((doctor) => doctor.profiles?.full_name)
        .map((doctor) => {
          const practice = doctor.practices as any;
          const profile = doctor.profiles as any;
          const hasLocation = practice?.city && practice?.country;
          
          return {
            id: doctor.id,
            type: "doctor" as const,
            name: profile?.full_name,
            image: profile?.avatar_url,
            specialty: doctor.specialty,
            rating: doctor.weighted_rating || doctor.average_rating,
            reviewCount: doctor.num_reviews || 0,
            affiliatedPractice: practice?.name,
            location: hasLocation ? `${practice.city}, ${practice.country}` : undefined,
            consultationFee: doctor.consultation_fee,
            acceptsNewPatients: doctor.accepts_new_patients,
            languages: doctor.languages,
          };
        });

      const transformedPractices = practicesResults
        .filter((practice) => practice.name)
        .map((practice) => {
          const hasLocation = practice.city && practice.country;
          
          return {
            id: practice.id,
            type: "practice" as const,
            name: practice.name,
            logoUrl: practice.logo_url,
            location: hasLocation ? `${practice.city}, ${practice.country}` : undefined,
            rating: practice.weighted_rating || practice.average_rating,
            reviewCount: practice.num_reviews || 0,
            specialties: practice.specialties,
          };
        });

      setSearchResults([...transformedDoctors, ...transformedPractices]);
      setShowResults(true);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  }, [searchDoctors, searchPractices]);

  // Listen for specialty search events from SpecialtiesGrid
  useEffect(() => {
    const handleSpecialtySearch = (event: CustomEvent) => {
      const { specialty, location, insurance } = event.detail;
      handleSearch(specialty, location, insurance);
    };

    window.addEventListener('homepage-search', handleSpecialtySearch as EventListener);
    return () => window.removeEventListener('homepage-search', handleSpecialtySearch as EventListener);
  }, [handleSearch]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* Animated Geometric Accents */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl" 
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-8 max-w-5xl mx-auto"
        >
          {/* Professional Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <Logo variant="horizontal" size="xl" />
          </motion.div>

          {/* Search Bar - PROMINENT with animation */}
          <div className="relative">
            {!prefersReducedMotion && (
              <SearchBarAnimation isTyping={isTyping} showSuggestions={false} />
            )}
            <ProminentSearchBar 
              onSearch={handleSearch} 
              searching={searching}
            />
          </div>

          {/* Search Results Section - Appears right below search bar */}
          {showResults && (
            <motion.div
              id="search-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-6xl mx-auto"
            >
              <SearchResults
                results={searchResults}
                onBookAppointment={(result) => handleBookingClick(result.id, result.name)}
                onViewPractice={(result) => handleBookingClick(result.id, result.name)}
                onFavorite={() => {}}
              />
            </motion.div>
          )}

          {/* Only show hero content when no search results */}
          {!showResults && (
            <>
              {/* Professional Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="inline-flex items-center space-x-2 bg-primary/10 dark:bg-primary/5 backdrop-blur-sm border-2 border-primary/30 dark:border-primary/30 rounded-full px-6 py-2"
              >
                <span className="text-primary dark:text-primary font-semibold">{t('hero.badge')}</span>
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="text-5xl md:text-7xl font-bold text-foreground leading-tight tracking-tight"
              >
                {t('hero.title1')}
                <br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {t('hero.title2')}
                </span>
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.5 }}
                className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              >
                {t('hero.description')}
              </motion.p>

              {/* Feature Pills */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="flex flex-wrap justify-center gap-4"
              >
                {[
                  { icon: CreditCard, key: "payments" },
                  { icon: Calendar, key: "scheduling" },
                  { icon: FileText, key: "records" },
                  { icon: BarChart3, key: "analytics" }
                ].map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={feature.key}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.2 + index * 0.1 }}
                      className="flex items-center space-x-2 bg-card/80 dark:bg-card/80 backdrop-blur-sm border-2 border-input dark:border-border dark:hover:border-primary rounded-full px-6 py-3 transition-all duration-300 hover:shadow-lg dark:hover:shadow-glow-blue"
                    >
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="text-foreground font-medium">{t(`hero.features.${feature.key}`)}</span>
                    </motion.div>
                  );
                })}
              </motion.div>
            </>
          )}
        </motion.div>

        {/* Hero Illustration - Dashboard Preview (only show when no results) */}
        {!showResults && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="mt-16 hidden lg:block"
          >
            <HeroIllustration />
          </motion.div>
        )}

        {/* Scroll Indicator (only show when no results) */}
        {!showResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
            className="flex justify-center pt-8"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="cursor-pointer"
            >
              <ChevronDown className="w-8 h-8 text-muted-foreground" />
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ModernHeroSection;
