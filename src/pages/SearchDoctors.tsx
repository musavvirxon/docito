import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, MapPin, Star, DollarSign, Clock, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import { EnhancedFilters } from '@/components/search/EnhancedFilters';
import { SearchResultsEnhanced } from '@/components/search/SearchResultsEnhanced';
import { DoctorProfileModal } from '@/components/search/DoctorProfileModal';
import { BookingModal } from '@/components/search/BookingModal';
import { useDoctorSearch } from '@/hooks/useDoctorSearch';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export default function SearchDoctors() {
  const { t } = useTranslation('doctors');
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    specialty: undefined as string | undefined,
    location: undefined as string | undefined,
    minRating: undefined as number | undefined,
    priceRange: [0, 10000] as [number, number],
    distance: undefined as number | undefined,
    availableToday: false,
    acceptsNewPatients: false,
    videoConsultation: false,
    acceptsInsurance: false,
    language: undefined as string | undefined,
  });

  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('relevance');
  const [savedDoctors, setSavedDoctors] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const { 
    results, 
    isLoading, 
    searchDoctors,
    specialties,
    totalCount,
    error
  } = useDoctorSearch();

  useEffect(() => {
    // Load saved doctors from localStorage
    const saved = localStorage.getItem('savedDoctors');
    if (saved) {
      setSavedDoctors(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (error) {
      toast({
        title: t('page.error'),
        description: t('page.tryAgain'),
        variant: "destructive"
      });
    }
  }, [error, toast, t]);

  const handleSearch = async (query: string) => {
    setHasSearched(true);
    await searchDoctors({
      query,
      filters,
      sortBy
    });
  };

  const handleFiltersChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    
    // Auto-search when filters change if user has already searched
    if (hasSearched) {
      handleSearch(searchQuery);
    }
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    if (hasSearched) {
      handleSearch(searchQuery);
    }
  };

  const handleViewProfile = (doctor: any) => {
    setSelectedDoctor(doctor);
    setShowProfileModal(true);
  };

  const handleBookAppointment = (doctor: any) => {
    setSelectedDoctor(doctor);
    setShowBookingModal(true);
  };

  const handleSaveDoctor = (doctor: any) => {
    const isSaved = savedDoctors.includes(doctor.id);
    const newSaved = isSaved 
      ? savedDoctors.filter(id => id !== doctor.id)
      : [...savedDoctors, doctor.id];
    
    setSavedDoctors(newSaved);
    localStorage.setItem('savedDoctors', JSON.stringify(newSaved));
    
    toast({
      title: isSaved ? t('page.removedFromSaved') : t('page.savedSuccessfully'),
      description: isSaved ? t('page.removedFromSavedDesc') : t('page.savedSuccessfullyDesc')
    });
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{t('page.title')}</h1>
              <p className="text-muted-foreground">{t('page.subtitle')}</p>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 max-w-md">
                <SearchAutocomplete
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={handleSearch}
                  placeholder={t('search.placeholder')}
                  className="w-full"
                />
              </div>
              
              <Button 
                onClick={() => handleSearch(searchQuery)}
                disabled={isLoading}
                className="px-6"
              >
                {isLoading ? t('page.searching') : t('search.submit')}
              </Button>
              
              {/* Mobile Filters */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden relative">
                    <Filter className="h-4 w-4" />
                    {activeFiltersCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                      >
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-96 p-0">
                  <EnhancedFilters
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    specialties={specialties}
                    layout="inline"
                    className="h-full border-0 rounded-none"
                  />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Desktop Filters Sidebar */}
          <div className="hidden lg:block w-80 shrink-0">
            <EnhancedFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              specialties={specialties}
              className="w-full"
            />
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {!hasSearched ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👨‍⚕️</div>
                <h2 className="text-2xl font-bold mb-4">{t('page.readyToFind')}</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  {t('page.readyToFindDesc')}
                </p>
                
                {/* Popular Searches */}
                <div className="max-w-2xl mx-auto">
                  <h3 className="font-semibold mb-4">{t('page.popularSearches')}</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {specialties.slice(0, 6).map((specialty) => (
                      <Button
                        key={specialty}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery(specialty);
                          handleSearch(specialty);
                        }}
                        className="rounded-full"
                      >
                        {specialty}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <SearchResultsEnhanced
                results={results}
                isLoading={isLoading}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                sortBy={sortBy}
                onSortChange={handleSortChange}
                onViewProfile={handleViewProfile}
                onBookAppointment={handleBookAppointment}
                onSaveResult={handleSaveDoctor}
                savedIds={savedDoctors}
                totalCount={totalCount}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <DoctorProfileModal
        doctor={selectedDoctor}
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        onBookAppointment={() => {
          setShowProfileModal(false);
          setShowBookingModal(true);
        }}
        isLoggedIn={!!user}
      />

      <BookingModal
        doctor={selectedDoctor}
        open={showBookingModal}
        onOpenChange={setShowBookingModal}
        isLoggedIn={!!user}
        onLoginRequired={() => {
          toast({
            title: t('page.loginRequired'),
            description: t('page.loginRequiredDesc'),
            variant: "destructive"
          });
        }}
      />
    </div>
  );
}
