import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";
import DoctorCard from "@/components/cards/DoctorCard";
import { ClinicCard } from "@/components/cards/ClinicCard";
import { useAuth } from "@/contexts/AuthContext";

interface SearchResult {
  id: string;
  type: 'doctor' | 'practice';
  name: string;
  specialty?: string;
  location?: string;
  rating?: number;
  availability?: string;
  acceptsInsurance?: boolean;
  acceptsNewPatients?: boolean;
  distance?: string;
  reviewCount?: number;
  image?: string;
  bio?: string;
  experience?: string;
  languages?: string[];
  practiceName?: string;
  degree?: string;
  consultationFee?: number;
  practiceType?: string;
  description?: string;
  specialties?: string[];
  doctorCount?: number;
  logoUrl?: string;
  affiliatedPractice?: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  onBookAppointment: (result: SearchResult) => void;
  onViewPractice: (result: SearchResult) => void;
  onFavorite: (result: SearchResult) => void;
}

const SearchResults = ({ 
  results, 
  isLoading, 
}: SearchResultsProps) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="rounded-2xl">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-start gap-4">
                <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-64" />
                  <div className="flex gap-2 mt-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
                <div className="hidden sm:flex flex-col gap-2">
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p className="text-sm">
              Try adjusting your search terms or location to find more providers.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {results.length} provider{results.length !== 1 ? 's' : ''} found
        </h3>
        <div className="text-sm text-muted-foreground">
          Showing doctors and clinics near you
        </div>
      </div>

      <div className="space-y-4">
        {results.map((result) => (
          result.type === 'doctor' ? (
            <DoctorCard
              key={result.id}
              id={result.id}
              name={result.name}
              specialty={result.specialty || ''}
              location={result.location || ''}
              imageUrl={result.image}
              rating={result.rating || 0}
              reviewCount={result.reviewCount || 0}
              languages={result.languages}
              consultationFee={result.consultationFee}
            />
          ) : (
            <ClinicCard
              key={result.id}
              id={result.id}
              name={result.name}
              address={result.location}
              imageUrl={result.logoUrl}
              specialties={result.specialties}
              rating={result.rating}
              reviewCount={result.reviewCount}
              doctorCount={result.doctorCount}
              isAuthenticated={isAuthenticated}
            />
          )
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
