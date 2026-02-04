import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CreditCard, Calendar, FileText, BarChart3, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import ProminentSearchBar from "./ProminentSearchBar";
import SearchResultsContainer from "@/components/search/SearchResultsContainer";
import { useUnifiedSearch, type SearchFilters } from "@/hooks/useUnifiedSearch";
import { useBookingAuth } from "@/hooks/useBookingAuth";
import { Logo } from "@/components/Logo";
import HeroIllustration from "./illustrations/HeroIllustration";
import SearchBarAnimation from "./illustrations/SearchBarAnimation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Button } from "@/components/ui/button";

const ModernHeroSection = () => {
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { t } = useTranslation('home');
  const { handleBookingClick } = useBookingAuth();
  
  const {
    results,
    loading,
    error,
    filters,
    hasSearched,
    totalResultCount,
    search,
    updateFilters,
    resetSearch,
  } = useUnifiedSearch();

  const handleSearch = useCallback(async (specialty: string, location: string, insurance: string) => {
    if (!specialty.trim() && !location.trim()) return;

    setSearchQuery(specialty);
    setSearchLocation(location);

    await search(specialty, location);
    
    // Scroll to results section after search
    setTimeout(() => {
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, [search]);

  const handleFilterChange = useCallback((key: keyof SearchFilters) => {
    const newFilters = { ...filters, [key]: !filters[key] };
    updateFilters(newFilters);
    
    // Re-run search with new filters
    if (hasSearched && (searchQuery || searchLocation)) {
      search(searchQuery, searchLocation, newFilters);
    }
  }, [filters, updateFilters, search, hasSearched, searchQuery, searchLocation]);

  const handleClearSearch = useCallback(() => {
    resetSearch();
    setSearchQuery("");
    setSearchLocation("");
  }, [resetSearch]);

  const handleBookDoctor = useCallback((doctor: any) => {
    handleBookingClick(doctor.id, doctor.name);
  }, [handleBookingClick]);

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
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* Animated Geometric Accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
      <div className="relative z-10 container mx-auto px-4 py-20 flex-1">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-8 max-w-5xl mx-auto"
        >
          {/* Professional Logo - render immediately for LCP */}
          <div className="flex justify-center mb-8">
            <Logo variant="horizontal" size="xl" />
          </div>

          {/* Search Bar - PROMINENT with animation */}
          <div className="relative">
            {!prefersReducedMotion && (
              <SearchBarAnimation isTyping={isTyping} showSuggestions={false} />
            )}
            <ProminentSearchBar 
              onSearch={handleSearch} 
              searching={loading}
            />
          </div>

          {/* Only show hero content when no search results */}
          <AnimatePresence mode="wait">
            {!hasSearched && (
              <motion.div
                key="hero-content"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Professional Badge */}
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="inline-flex items-center space-x-2 bg-primary/10 dark:bg-primary/5 backdrop-blur-sm border-2 border-primary/30 dark:border-primary/30 rounded-full px-6 py-2"
                >
                  <span className="text-primary dark:text-primary font-semibold">{t('hero.badge')}</span>
                </motion.div>

                {/* Main Headline - Critical for LCP, reduce delay */}
                <motion.h1
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="text-5xl md:text-7xl font-bold text-foreground leading-tight tracking-tight mt-6"
                >
                  {t('hero.title1')}
                  <br />
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {t('hero.title2')}
                  </span>
                </motion.h1>

                {/* Description */}
                <motion.p
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6"
                >
                  {t('hero.description')}
                </motion.p>

                {/* Feature Pills */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className="flex flex-wrap justify-center gap-4 mt-8"
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
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                        className="flex items-center space-x-2 bg-card/80 dark:bg-card/80 backdrop-blur-sm border-2 border-input dark:border-border dark:hover:border-primary rounded-full px-6 py-3 transition-all duration-300 hover:shadow-lg dark:hover:shadow-glow-blue"
                      >
                        <Icon className="w-5 h-5 text-primary" />
                        <span className="text-foreground font-medium">{t(`hero.features.${feature.key}`)}</span>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Search Results Section - Appears right below search bar */}
        <AnimatePresence>
          {hasSearched && (
            <motion.div
              ref={resultsRef}
              id="search-results"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-7xl mx-auto mt-8"
            >
              {/* Search Header with Clear Button */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {searchQuery && (
                    <span>Results for "<span className="font-medium text-foreground">{searchQuery}</span>"</span>
                  )}
                  {searchLocation && (
                    <span>in <span className="font-medium text-foreground">{searchLocation}</span></span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>

              <SearchResultsContainer
                results={results}
                loading={loading}
                error={error}
                filters={filters}
                hasSearched={hasSearched}
                onFilterChange={handleFilterChange}
                onBookDoctor={handleBookDoctor}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Illustration - Dashboard Preview (only show when no results) */}
        {!hasSearched && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-16 hidden lg:block"
          >
            <HeroIllustration />
          </motion.div>
        )}

        {/* Scroll Indicator (only show when no results) */}
        {!hasSearched && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
            className="flex justify-center pt-8"
          >
            <motion.div
              animate={prefersReducedMotion ? {} : { y: [0, 10, 0] }}
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
