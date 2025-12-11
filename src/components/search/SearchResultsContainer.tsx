import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import SearchFiltersBar from './SearchFiltersBar';
import DoctorSearchCard from './cards/DoctorSearchCard';
import ClinicSearchCard from './cards/ClinicSearchCard';
import PharmacySearchCard from './cards/PharmacySearchCard';
import LabSearchCard from './cards/LabSearchCard';
import ImagingSearchCard from './cards/ImagingSearchCard';
import type { UnifiedSearchResults, SearchFilters, DoctorResult } from '@/hooks/useUnifiedSearch';

interface SearchResultsContainerProps {
  results: UnifiedSearchResults;
  loading: boolean;
  error: string | null;
  filters: SearchFilters;
  hasSearched: boolean;
  onFilterChange: (key: keyof SearchFilters) => void;
  onBookDoctor?: (doctor: DoctorResult) => void;
  className?: string;
}

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="p-4 border border-border rounded-xl space-y-3">
        <div className="flex gap-3">
          <Skeleton className="w-16 h-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ hasSearched }: { hasSearched: boolean }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-16 text-center"
  >
    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
      <Search className="w-10 h-10 text-muted-foreground" />
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-2">
      {hasSearched ? 'No results found' : 'Start searching'}
    </h3>
    <p className="text-muted-foreground max-w-md">
      {hasSearched 
        ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
        : 'Enter a specialty, doctor name, or condition to find healthcare providers near you.'}
    </p>
  </motion.div>
);

const ResultSection = memo(({ 
  title, 
  count, 
  children 
}: { 
  title: string; 
  count: number; 
  children: React.ReactNode 
}) => {
  if (count === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        {title}
        <span className="text-sm font-normal text-muted-foreground">
          ({count} {count === 1 ? 'result' : 'results'})
        </span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </motion.div>
  );
});

ResultSection.displayName = 'ResultSection';

const SearchResultsContainer = memo(({
  results,
  loading,
  error,
  filters,
  hasSearched,
  onFilterChange,
  onBookDoctor,
  className,
}: SearchResultsContainerProps) => {
  const totalCount = 
    results.doctors.length + 
    results.clinics.length + 
    results.pharmacies.length + 
    results.labs.length + 
    results.imaging.length;

  const resultCounts = {
    doctors: results.doctors.length,
    clinics: results.clinics.length,
    pharmacies: results.pharmacies.length,
    labs: results.labs.length,
    imaging: results.imaging.length,
  };

  return (
    <div className={className}>
      {/* Filter Bar */}
      <SearchFiltersBar
        filters={filters}
        onFilterChange={onFilterChange}
        resultCounts={hasSearched ? resultCounts : undefined}
        className="mb-6"
      />

      {/* Loading State */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-muted-foreground">Searching...</span>
            </div>
            <LoadingSkeleton />
          </motion.div>
        )}

        {/* Error State */}
        {!loading && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
          >
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !error && totalCount === 0 && (
          <EmptyState hasSearched={hasSearched} />
        )}

        {/* Results */}
        {!loading && !error && totalCount > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Total Count */}
            <div className="text-sm text-muted-foreground">
              Found <span className="font-medium text-foreground">{totalCount}</span> results
            </div>

            {/* Doctors Section */}
            <ResultSection title="Doctors" count={results.doctors.length}>
              {results.doctors.map(doctor => (
                <DoctorSearchCard
                  key={doctor.id}
                  doctor={doctor}
                  onBook={onBookDoctor}
                />
              ))}
            </ResultSection>

            {/* Clinics Section */}
            <ResultSection title="Clinics" count={results.clinics.length}>
              {results.clinics.map(clinic => (
                <ClinicSearchCard key={clinic.id} clinic={clinic} />
              ))}
            </ResultSection>

            {/* Pharmacies Section */}
            <ResultSection title="Pharmacies" count={results.pharmacies.length}>
              {results.pharmacies.map(pharmacy => (
                <PharmacySearchCard key={pharmacy.id} pharmacy={pharmacy} />
              ))}
            </ResultSection>

            {/* Labs Section */}
            <ResultSection title="Laboratories" count={results.labs.length}>
              {results.labs.map(lab => (
                <LabSearchCard key={lab.id} lab={lab} />
              ))}
            </ResultSection>

            {/* Imaging Section */}
            <ResultSection title="Imaging Centers" count={results.imaging.length}>
              {results.imaging.map(center => (
                <ImagingSearchCard key={center.id} center={center} />
              ))}
            </ResultSection>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

SearchResultsContainer.displayName = 'SearchResultsContainer';

export default SearchResultsContainer;
