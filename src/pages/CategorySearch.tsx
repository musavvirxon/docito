import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import SearchResultsContainer from '@/components/search/SearchResultsContainer';
import type { DoctorResult } from '@/hooks/useUnifiedSearch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BookingModal } from '@/components/search/BookingModal';

const CategorySearch = () => {
  const { t } = useTranslation(['doctors', 'common']);
  const { category } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    results,
    loading,
    error,
    filters,
    hasSearched,
    search,
    updateFilters,
  } = useUnifiedSearch();

  const [query, setQuery] = useState(category ?? '');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorResult | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    if (category) {
      setQuery(category);
      search(category, '', filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleFilterToggle = (key: keyof typeof filters) => {
    const next = { ...filters, [key]: !filters[key] };
    updateFilters({ [key]: next[key] });
    if (hasSearched) search(query, '', next);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <div className="bg-primary/5 py-8">
          <div className="container mx-auto px-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                search(query, '', filters);
              }}
              className="max-w-3xl mx-auto flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('doctors:search.placeholder')}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? t('doctors:page.searching') : t('doctors:search.submit')}
              </Button>
            </form>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-foreground mb-6 capitalize">
            {category}
          </h1>
          <SearchResultsContainer
            results={results}
            loading={loading}
            error={error}
            filters={filters}
            hasSearched={hasSearched}
            onFilterChange={handleFilterToggle}
            onBookDoctor={(d) => {
              setSelectedDoctor(d);
              setBookingOpen(true);
            }}
          />
        </div>
      </main>

      <BookingModal
        doctor={selectedDoctor}
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        isLoggedIn={!!user}
        onLoginRequired={() => {
          toast({
            title: t('doctors:page.loginRequired'),
            description: t('doctors:page.loginRequiredDesc'),
            variant: 'destructive',
          });
        }}
      />
    </div>
  );
};

export default CategorySearch;
