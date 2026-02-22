// File: src/components/home/premium/SmartSearch.tsx
import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Search, MapPin, Shield, Mic, Sparkles, Clock, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUnifiedSearch } from "@/hooks/useUnifiedSearch";

// Lazy load heavy search results component
const SearchResultsContainer = lazy(() =>
  import("@/components/search").then((mod) => ({ default: mod.SearchResultsContainer })),
);

type TrendingSearch = { label: string; term: string };

const DEFAULT_TRENDING: TrendingSearch[] = [
  { label: "General Practitioner", term: "General Practitioner" },
  { label: "Dentist", term: "Dentist" },
  { label: "Eye Exam", term: "Eye Exam" },
  { label: "Blood Test", term: "Blood Test" },
  { label: "Cardiology", term: "Cardiology" },
  { label: "Dermatology", term: "Dermatology" },
];

export default function SmartSearch() {
  const { t } = useTranslation(["home", "homeSearch"]);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [insurance, setInsurance] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, loading, error, filters, hasSearched, search, updateFilters } = useUnifiedSearch();

  const trendingRaw = t("homeSearch:search.trendingSearches", {
    returnObjects: true,
    defaultValue: DEFAULT_TRENDING,
  }) as unknown;

  const trendingSearches: TrendingSearch[] = Array.isArray(trendingRaw)
    ? (trendingRaw as TrendingSearch[])
    : DEFAULT_TRENDING;

  const aiHintText = t("homeSearch:search.aiHint", "Try: cardiologist near me");
  const aiHintTerm = t("homeSearch:search.aiHintTerm", "cardiologist");

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleSearch = () => {
    if (query.trim()) {
      search(query.trim(), location.trim() || undefined, filters);
      setFocused(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleTrendingClick = (term: string) => {
    setQuery(term);
    search(term, location.trim() || undefined, filters);
    setFocused(false);
  };

  const handleFilterChange = (key: keyof typeof filters) => {
    const newFilters = { ...filters, [key]: !filters[key] };
    updateFilters(newFilters);
    if (query.trim() && hasSearched) {
      search(query.trim(), location.trim() || undefined, newFilters);
    }
  };

  return (
    <section id="search" className="relative py-20 -mt-20 z-20 scroll-mt-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={containerRef}
          className={`relative bg-background/80 backdrop-blur-2xl border border-border/50 rounded-3xl shadow-2xl shadow-black/5 transition-all duration-500 transform ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          } ${focused ? "scale-[1.02] shadow-primary/10" : ""}`}
          style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        >
          {/* Glow effect */}
          <div
            className={`absolute inset-0 rounded-3xl transition-opacity duration-500 pointer-events-none ${
              focused ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-xl" />
          </div>

          <div className="relative p-6 lg:p-8">
            {/* Main Search Row */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Search Input */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setTimeout(() => setFocused(false), 200)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("home:search.specialty", "Search doctors, labs, services...")}
                    className="w-full pl-12 pr-12 py-4 bg-muted/30 rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center"
                    aria-label={t("homeSearch:search.voiceSearch", "Voice search")}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                </div>

                {/* Location Input */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("home:search.location", "Location")}
                    className="w-full pl-12 pr-4 py-4 bg-muted/30 rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>

                {/* Insurance Input */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Shield className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={insurance}
                    onChange={(e) => setInsurance(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("home:search.insurance", "Insurance")}
                    className="w-full pl-12 pr-4 py-4 bg-muted/30 rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
              </div>

              {/* Centered Search Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-12 py-4 bg-primary text-primary-foreground font-medium rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  <Search className="w-5 h-5" />
                  <span>
                    {loading
                      ? t("home:search.searching", "Searching...")
                      : t("home:search.searchButton", "Search")}
                  </span>
                </button>
              </div>
            </div>

            {/* Expanded Search Panel */}
            {focused && !hasSearched && (
              <div className="mt-6 pt-6 border-t border-border/50 animate-fade-in">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Recent Searches */}
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                      <Clock className="w-4 h-4" />
                      <span>{t("homeSearch:search.recent", "Recent Searches")}</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground italic">
                        {t("homeSearch:search.noRecent", "No recent searches")}
                      </p>
                    </div>
                  </div>

                  {/* Trending */}
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                      <TrendingUp className="w-4 h-4" />
                      <span>{t("homeSearch:search.trending", "Popular Searches")}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {trendingSearches.map((item, i) => (
                        <button
                          key={`${item.term}-${i}`}
                          onClick={() => handleTrendingClick(item.term)}
                          className="px-4 py-2 text-sm text-foreground bg-muted/50 hover:bg-muted rounded-full transition-colors"
                          style={{ animationDelay: `${i * 50}ms` }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Suggestion */}
                <div
                  onClick={() => handleTrendingClick(aiHintTerm)}
                  className="mt-6 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl cursor-pointer hover:from-primary/20 hover:to-accent/20 transition-colors"
                >
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-sm text-foreground">{aiHintText}</span>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {hasSearched && (
            <div className="relative px-6 lg:px-8 pb-6 lg:pb-8">
              <Suspense
                fallback={
                  <div className="py-8 text-center text-muted-foreground">
                    {t("homeSearch:search.resultsLoading", "Loading results...")}
                  </div>
                }
              >
                <SearchResultsContainer
                  results={results}
                  loading={loading}
                  error={error}
                  hasSearched={hasSearched}
                  onFilterChange={handleFilterChange}
                  filters={filters}
                />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
