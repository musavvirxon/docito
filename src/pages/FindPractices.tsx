import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ModernNavbar from '@/components/home/ModernNavbar';
import ModernFooter from '@/components/home/ModernFooter';
import { Building2, MapPin, Users, Star, Phone, Mail, Globe, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FindPracticesIllustration } from '@/components/Visuals/illustrations';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import { LocationSearch } from '@/components/search/LocationSearch';
import { EnhancedFilters } from '@/components/search/EnhancedFilters';
import { useSearchDiscovery, type SearchFilters } from '@/hooks/useSearchDiscovery';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Filter, X } from 'lucide-react';

export default function FindPractices() {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'practices']);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [practiceType, setPracticeType] = useState('all');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState('relevance');
  const { recordSearch } = useSearchDiscovery();

  const { data: practices, isLoading, refetch } = useQuery({
    queryKey: ['practices', searchQuery, location, practiceType],
    queryFn: async () => {
      let query = supabase
        .from('practices')
        .select('*')
        .eq('verified', true);

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      if (location) {
        query = query.or(`city.ilike.%${location}%,country.ilike.%${location}%`);
      }

      if (practiceType !== 'all') {
        query = query.eq('practice_type', practiceType);
      }

      const { data, error } = await query.order('average_rating', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const practiceTypes = [
    { value: 'all', label: t('practices:types.all') },
    { value: 'Clinic', label: t('practices:types.clinic') },
    { value: 'Dental Practice', label: t('practices:types.dental') },
    { value: 'Hospital', label: t('practices:types.hospital') },
    { value: 'Diagnostic Center', label: t('practices:types.diagnostic') },
    { value: 'Urgent Care', label: t('practices:types.urgentCare') },
    { value: 'Medical Center', label: t('practices:types.medicalCenter') }
  ];

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    recordSearch(value, 'practice', { location });
  }, [location, recordSearch]);

  const handleLocationChange = useCallback((value: string, newCoords?: { lat: number; lng: number }) => {
    setLocation(value);
    setCoords(newCoords);
  }, []);

  const clearFilters = () => {
    setSearchQuery('');
    setLocation('');
    setPracticeType('all');
    setFilters({});
  };

  // Apply filters to results
  const filteredPractices = practices?.filter(practice => {
    if (filters.minRating && (practice.average_rating || 0) < filters.minRating) return false;
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return (b.average_rating || 0) - (a.average_rating || 0);
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />

      <div className="bg-gradient-to-br from-primary/90 to-primary py-16 pt-32">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
                {t('practices:page.title')}
              </h1>
              <p className="text-xl text-primary-foreground/80 mb-8">
                {t('practices:page.subtitle')}
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden lg:flex justify-center"
            >
              <FindPracticesIllustration className="w-full max-w-xs" />
            </motion.div>
          </div>

          {/* Enhanced Search Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-4xl mx-auto bg-card rounded-2xl shadow-2xl p-4"
          >
            <div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 mb-4">
              <SearchAutocomplete
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                placeholder={t('practices:page.searchPlaceholder')}
              />

              <LocationSearch
                value={location}
                onChange={handleLocationChange}
                placeholder={t('practices:page.locationPlaceholder')}
              />

              <Select value={practiceType} onValueChange={setPracticeType}>
                <SelectTrigger className="h-12 min-w-[180px]">
                  <SelectValue placeholder={t('practices:types.all')} />
                </SelectTrigger>
                <SelectContent>
                  {practiceTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              {/* Mobile Filters */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="md:hidden gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="overflow-y-auto h-[calc(100vh-80px)]">
                    <EnhancedFilters
                      filters={filters}
                      onFiltersChange={setFilters}
                      className="border-0 rounded-none"
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex gap-2">
                {(searchQuery || location || practiceType !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-1"
                  >
                    <X className="w-4 h-4" />
                    Clear all
                  </Button>
                )}
                <Button onClick={() => refetch()} disabled={isLoading}>
                  {isLoading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Desktop Filters Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <EnhancedFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          </div>

          {/* Results */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">
                {isLoading ? t('practices:page.searching') : t('practices:page.practicesFound', { count: filteredPractices?.length || 0 })}
              </h2>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-card rounded-xl p-6 animate-pulse">
                    <div className="h-6 bg-muted rounded mb-4" />
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-4 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : filteredPractices && filteredPractices.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredPractices.map((practice, index) => (
                  <motion.div
                    key={practice.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <PracticeCard practice={practice} navigate={navigate} t={t} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground mb-4">{t('practices:page.notFound.description')}</p>
                <Button onClick={clearFilters}>
                  {t('practices:page.notFound.clearFilters')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ModernFooter />
    </div>
  );
}

function PracticeCard({ practice, navigate, t }: any) {
  return (
    <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-border hover:border-primary">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground mb-1">{practice.name}</h3>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
            {practice.practice_type || t('practices:types.clinic')}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{practice.city && practice.country ? `${practice.city}, ${practice.country}` : t('practices:card.locationAvailable')}</span>
        </div>
        {practice.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{practice.phone}</span>
          </div>
        )}
        {practice.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>{practice.email}</span>
          </div>
        )}
        {practice.website && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Globe className="w-4 h-4" />
            <a href={practice.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {t('practices:card.visitWebsite')}
            </a>
          </div>
        )}
      </div>

      {practice.average_rating && (
        <div className="flex items-center gap-1 mb-4">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-semibold text-foreground">{practice.average_rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({practice.num_reviews || 0} {t('practices:card.reviews')})</span>
        </div>
      )}

      <Button
        onClick={() => navigate(`/practices/${practice.id}`)}
        className="w-full"
      >
        {t('practices:card.viewPractice')}
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
