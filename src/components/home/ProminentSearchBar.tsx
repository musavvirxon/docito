import { useState, useEffect } from "react";
import { Search, MapPin, Shield, ArrowRight, Clock, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSearchDiscovery } from "@/hooks/useSearchDiscovery";

interface ProminentSearchBarProps {
  onSearch: (specialty: string, location: string, insurance: string) => void;
  searching?: boolean;
}

const ProminentSearchBar = ({ onSearch, searching }: ProminentSearchBarProps) => {
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [insurance, setInsurance] = useState("");
  const { t } = useTranslation('home');
  const { recentSearches, popularSearches } = useSearchDiscovery();

  const handleSearch = () => {
    onSearch(specialty, location, insurance);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleQuickSearch = (term: string) => {
    setSpecialty(term);
    onSearch(term, location, insurance);
  };

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="w-full max-w-5xl mx-auto mb-8"
    >
      <div className="bg-background rounded-2xl shadow-2xl p-2 border-2 border-input dark:border-border hover:border-primary/30 dark:hover:border-primary/50 transition-all duration-300">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Specialty Input */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder={t('search.specialty')}
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-14 pl-12 border-2 border-transparent dark:border-border bg-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary text-base dark:text-foreground"
            />
          </div>

          {/* Location Input */}
          <div className="relative group">
            <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder={t('search.location')}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-14 pl-12 border-2 border-transparent dark:border-border bg-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary text-base dark:text-foreground"
            />
          </div>

          {/* Insurance Input */}
          <div className="relative group">
            <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder={t('search.insurance')}
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-14 pl-12 border-2 border-transparent dark:border-border bg-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary text-base dark:text-foreground"
            />
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            disabled={searching}
            variant="default"
            className="h-14 text-base font-semibold hover:scale-105 transition-all duration-300"
          >
            {searching ? (
              t('search.searching', 'Searching...')
            ) : (
              <>
                {t('search.searchButton')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Recent & Popular Searches */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {recentSearches.length > 0 && (
          <>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {t('search.recent', 'Recent:')}
            </span>
            {recentSearches.slice(0, 3).map((term, index) => (
              <button
                key={`recent-${index}`}
                onClick={() => handleQuickSearch(term)}
                className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-full border border-border hover:border-primary/50 transition-all duration-200 hover:scale-105"
              >
                {term}
              </button>
            ))}
          </>
        )}
        
        {popularSearches.length > 0 && (
          <>
            <span className="text-sm text-muted-foreground flex items-center gap-1 ml-2">
              <TrendingUp className="w-3.5 h-3.5" />
              {t('search.popular', 'Popular:')}
            </span>
            {popularSearches.slice(0, 4).map((term, index) => (
              <button
                key={`popular-${index}`}
                onClick={() => handleQuickSearch(term)}
                className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-full border border-primary/30 hover:border-primary/50 transition-all duration-200 hover:scale-105"
              >
                {term}
              </button>
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default ProminentSearchBar;
