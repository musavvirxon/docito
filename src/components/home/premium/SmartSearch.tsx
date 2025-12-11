import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Shield, Mic, Sparkles, X, Clock, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';

const recentSearches = [
  { type: 'doctor', text: 'Dr. Sarah Johnson - Cardiologist' },
  { type: 'lab', text: 'Complete Blood Count Test' },
  { type: 'pharmacy', text: 'Central Pharmacy - Open Now' },
];

const trendingSearches = [
  'General Practitioner',
  'COVID-19 Test',
  'Dental Cleaning',
  'Eye Exam',
  'Blood Pressure Check',
];

export default function SmartSearch() {
  const { t } = useTranslation(['home']);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [insurance, setInsurance] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      );
    }
  }, []);

  const handleSearch = () => {
    console.log('Searching:', { query, location, insurance });
  };

  return (
    <section className="relative py-20 -mt-20 z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={containerRef}
          className={`relative bg-background/80 backdrop-blur-2xl border border-border/50 rounded-3xl shadow-2xl shadow-black/5 transition-all duration-500 ${
            focused ? 'scale-[1.02] shadow-primary/10' : ''
          }`}
        >
          {/* Glow effect */}
          <div className={`absolute inset-0 rounded-3xl transition-opacity duration-500 ${
            focused ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-xl" />
          </div>

          <div className="relative p-6 lg:p-8">
            {/* Main Search Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Search Input */}
              <div className="lg:col-span-5 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setTimeout(() => setFocused(false), 200)}
                  placeholder={t('home:search.specialty', 'Search doctors, labs, services...')}
                  className="w-full pl-12 pr-12 py-4 bg-muted/30 rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                  <Mic className="w-5 h-5" />
                </button>
              </div>

              {/* Location Input */}
              <div className="lg:col-span-3 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <MapPin className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('home:search.location', 'Location')}
                  className="w-full pl-12 pr-4 py-4 bg-muted/30 rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              {/* Insurance Input */}
              <div className="lg:col-span-2 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Shield className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={insurance}
                  onChange={(e) => setInsurance(e.target.value)}
                  placeholder={t('home:search.insurance', 'Insurance')}
                  className="w-full pl-12 pr-4 py-4 bg-muted/30 rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              {/* Search Button */}
              <div className="lg:col-span-2">
                <motion.button
                  onClick={handleSearch}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-primary text-primary-foreground font-medium rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  <span>{t('home:search.button', 'Search')}</span>
                </motion.button>
              </div>
            </div>

            {/* Expanded Search Panel */}
            <AnimatePresence>
              {focused && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6 pt-6 border-t border-border/50"
                >
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Recent Searches */}
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                        <Clock className="w-4 h-4" />
                        <span>{t('home:search.recent', 'Recent Searches')}</span>
                      </div>
                      <div className="space-y-2">
                        {recentSearches.map((item, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted/50 rounded-xl transition-colors"
                          >
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <span>{item.text}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Trending */}
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                        <TrendingUp className="w-4 h-4" />
                        <span>{t('home:search.trending', 'Trending')}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {trendingSearches.map((item, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="px-4 py-2 text-sm text-foreground bg-muted/50 hover:bg-muted rounded-full transition-colors"
                          >
                            {item}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Suggestion */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl"
                  >
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="text-sm text-foreground">
                      {t('home:search.aiSuggestion', 'Try "Find a cardiologist near me accepting Blue Cross"')}
                    </span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
