import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import ModernNavbar from '@/components/home/ModernNavbar';
import ModernFooter from '@/components/home/ModernFooter';
import { useBookingAuth } from '@/hooks/useBookingAuth';
import { useSearchDiscovery, type SearchFilters } from '@/hooks/useSearchDiscovery';
import { searchApi } from '@/lib/api/supabase-api';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DoctorSearchIllustration } from '@/components/Visuals/illustrations';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import { LocationSearch } from '@/components/search/LocationSearch';
import { EnhancedFilters } from '@/components/search/EnhancedFilters';
import { SearchResultsEnhanced, type SearchResult } from '@/components/search/SearchResultsEnhanced';
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

export default function SearchDoctors() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('doctors');
  
  const initialSpecialty = searchParams.get('specialty') || '';
  const initialQuery = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState('relevance');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { handleBookingClick } = useBookingAuth();
  const { recordSearch } = useSearchDiscovery();

  const specialties = [
    { key: '', label: t('specialties.all') },
    { key: 'generalPractice', label: t('specialties.generalPractice') },
    { key: 'cardiology', label: t('specialties.cardiology') },
    { key: 'dermatology', label: t('specialties.dermatology') },
    { key: 'pediatrics', label: t('specialties.pediatrics') },
    { key: 'orthopedics', label: t('specialties.orthopedics') },
    { key: 'neurology', label: t('specialties.neurology') },
    { key: 'psychiatry', label: t('specialties.psychiatry') },
    { key: 'dentistry', label: t('specialties.dentistry') },
    { key: 'ophthalmology', label: t('specialties.ophthalmology') },
    { key: 'ent', label: t('specialties.ent') },
  ];

  const transformResults = useCallback((doctorsData: any[]): SearchResult[] => {
    return doctorsData
      .filter((doctor) => doctor.full_name)
      .map((doctor) => ({
        id: doctor.id,
        type: 'doctor' as const,
        name: doctor.full_name,
        imageUrl: doctor.avatar_url,
        specialty: doctor.specialty,
        rating: doctor.weighted_rating || doctor.average_rating,
        reviewCount: doctor.num_reviews || 0,
        location: doctor.practice_city && doctor.practice_country 
          ? `${doctor.practice_city}, ${doctor.practice_country}` 
          : undefined,
        consultationFee: doctor.consultation_fee,
        acceptsNewPatients: doctor.accepts_new_patients,
        videoConsultation: doctor.consultation_types?.includes('video'),
        acceptsInsurance: true,
        languages: doctor.languages,
      }));
  }, []);

  const applyFiltersAndSort = useCallback((results: SearchResult[]): SearchResult[] => {
    let filtered = [...results];

    // Apply filters
    if (filters.minRating) {
      filtered = filtered.filter(r => (r.rating || 0) >= (filters.minRating || 0));
    }
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      filtered = filtered.filter(r => {
        if (r.consultationFee === undefined) return true;
        return r.consultationFee >= (filters.minPrice || 0) && r.consultationFee <= (filters.maxPrice || 10000);
      });
    }
    if (filters.acceptsNewPatients) {
      filtered = filtered.filter(r => r.acceptsNewPatients);
    }
    if (filters.videoConsultation) {
      filtered = filtered.filter(r => r.videoConsultation);
    }
    if (filters.acceptsInsurance) {
      filtered = filtered.filter(r => r.acceptsInsurance);
    }

    // Apply sorting
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'price_low':
        filtered.sort((a, b) => (a.consultationFee || 0) - (b.consultationFee || 0));
        break;
      case 'price_high':
        filtered.sort((a, b) => (b.consultationFee || 0) - (a.consultationFee || 0));
        break;
      default:
        // Keep default order (relevance)
        break;
    }

    return filtered;
  }, [filters, sortBy]);

  const performSearch = useCallback(async () => {
    setIsLoading(true);
    const searchTerm = searchQuery || specialty;
    
    try {
      const result = await searchApi.advancedDoctorSearch({
        query: searchTerm,
        specialty: specialty || undefined,
        location: location || undefined,
        minRating: filters.minRating,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        acceptsNewPatients: filters.acceptsNewPatients,
        videoConsultation: filters.videoConsultation,
        acceptsInsurance: filters.acceptsInsurance,
        language: filters.language,
        gender: filters.gender,
      });

      if ('success' in result && result.success) {
        const results = transformResults(result.data || []);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
      setHasSearched(true);
      
      // Record search
      recordSearch(searchTerm, 'doctor', { specialty, location, ...filters }, searchResults.length);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, location, specialty, filters, transformResults, recordSearch, searchResults.length]);

  useEffect(() => {
    performSearch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const urlSpecialty = searchParams.get('specialty');
    if (urlSpecialty && urlSpecialty !== specialty) {
      setSpecialty(urlSpecialty);
    }
  }, [searchParams]);

  const handleSearchSubmit = (value: string) => {
    setSearchQuery(value);
    performSearch();
  };

  const handleLocationChange = (value: string, newCoords?: { lat: number; lng: number }) => {
    setLocation(value);
    setCoords(newCoords);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setLocation('');
    setSpecialty('');
    setFilters({});
    performSearch();
  };

  const handleViewProfile = (result: SearchResult) => {
    if (result.type === 'doctor') {
      navigate(`/doctor-profile/${result.id}`);
    } else {
      navigate(`/practice/${result.id}`);
    }
  };

  const handleSaveResult = (result: SearchResult) => {
    setSavedIds(prev => 
      prev.includes(result.id) 
        ? prev.filter(id => id !== result.id)
        : [...prev, result.id]
    );
  };

  const displayedResults = applyFiltersAndSort(searchResults);

  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />

      {/* Search Header */}
      <div className="bg-gradient-to-br from-primary/90 to-primary py-12 pt-32">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
                {t('page.title')}
              </h1>
              <p className="text-primary-foreground/80">
                {t('page.subtitle')}
              </p>
            </motion.div>
            <div className="hidden md:flex justify-end">
              <DoctorSearchIllustration className="w-full max-w-xs" />
            </div>
          </div>

          {/* Enhanced Search Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-4xl mx-auto bg-card rounded-2xl shadow-2xl p-4"
          >
            <div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 mb-4">
              <SearchAutocomplete
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearchSubmit}
                placeholder={t('search.placeholder')}
              />

              <LocationSearch
                value={location}
                onChange={handleLocationChange}
                placeholder={t('search.location')}
              />

              <Select value={specialty} onValueChange={(val) => { setSpecialty(val === 'all' ? '' : val); }}>
                <SelectTrigger className="h-12 min-w-[180px]">
                  <SelectValue placeholder={t('specialties.all')} />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map(spec => (
                    <SelectItem key={spec.key || 'all'} value={spec.key || 'all'}>
                      {spec.label}
                    </SelectItem>
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
                    {t('search.filters')}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>{t('search.filters')}</SheetTitle>
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
                {(searchQuery || location || specialty || Object.keys(filters).length > 0) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-1"
                  >
                    <X className="w-4 h-4" />
                    {t('page.clearAll')}
                  </Button>
                )}
                <Button onClick={performSearch} disabled={isLoading}>
                  {isLoading ? t('page.searching') : 'Search'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Results Section with Sidebar */}
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <SearchResultsEnhanced
              results={displayedResults}
              loading={isLoading && !hasSearched}
              totalCount={displayedResults.length}
              onViewProfile={handleViewProfile}
              onBookAppointment={(result) => handleBookingClick(result.id, result.name)}
              onSaveResult={handleSaveResult}
              savedIds={savedIds}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </motion.div>
        </div>
      </div>

      <ModernFooter />
    </div>
  );
}
