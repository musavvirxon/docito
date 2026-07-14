import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import SearchResultsContainer from '@/components/search/SearchResultsContainer';
import { BookingModal } from '@/components/search/BookingModal';
import type { DoctorResult } from '@/hooks/useUnifiedSearch';

const POPULAR = [
  'General Practitioner',
  'Dentist',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Neurology',
];

export default function SearchDoctors() {
  const { t } = useTranslation('doctors');
  const { toast } = useToast();
  const { user } = useAuth();
  const [params] = useSearchParams();

  const {
    results,
    loading,
    error,
    filters,
    hasSearched,
    search,
    updateFilters,
  } = useUnifiedSearch();

  const [query, setQuery] = useState(params.get('q') ?? '');
  const [location, setLocation] = useState(params.get('location') ?? '');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorResult | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  // Seed page as doctor-focused; users can broaden via the filter bar.
  useEffect(() => {
    updateFilters({ clinics: false, pharmacies: false, labs: false, imaging: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = async (q: string, loc = location, next = filters) => {
    await search(q, loc, next);
  };

  const handleFilterToggle = (key: keyof typeof filters) => {
    const next = { ...filters, [key]: !filters[key] };
    updateFilters({ [key]: next[key] });
    if (hasSearched) runSearch(query, location, next);
  };

  const handleBook = (doctor: DoctorResult) => {
    setSelectedDoctor(doctor);
    setBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-2xl font-bold">{t('page.title')}</h1>
              <p className="text-muted-foreground">{t('page.subtitle')}</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSearch(query);
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search.placeholder')}
                  className="pl-10"
                />
              </div>
              <div className="relative sm:w-64">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('search.locationPlaceholder', 'Location')}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={loading} className="sm:w-32">
                {loading ? t('page.searching') : t('search.submit')}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {!hasSearched ? (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold mb-3">{t('page.readyToFind')}</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {t('page.readyToFindDesc')}
            </p>
            <div className="max-w-2xl mx-auto">
              <h3 className="font-semibold mb-4">{t('page.popularSearches')}</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {POPULAR.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery(s);
                      runSearch(s);
                    }}
                    className="rounded-full"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <SearchResultsContainer
            results={results}
            loading={loading}
            error={error}
            filters={filters}
            hasSearched={hasSearched}
            onFilterChange={handleFilterToggle}
            onBookDoctor={handleBook}
          />
        )}
      </div>

      <BookingModal
        doctor={selectedDoctor}
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        isLoggedIn={!!user}
        onLoginRequired={() => {
          toast({
            title: t('page.loginRequired'),
            description: t('page.loginRequiredDesc'),
            variant: 'destructive',
          });
        }}
      />
    </div>
  );
}
