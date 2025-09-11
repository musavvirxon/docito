import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Star, 
  MapPin, 
  Clock, 
  Phone, 
  Building2, 
  Users, 
  Heart,
  CheckCircle,
  XCircle
} from "lucide-react";

interface SearchResult {
  id: string;
  type: 'doctor' | 'practice';
  name: string;
  specialty?: string;
  location: string;
  rating: number;
  availability?: string;
  acceptsInsurance?: boolean;
  acceptsNewPatients?: boolean;
  distance?: string;
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
  onBookAppointment, 
  onViewPractice, 
  onFavorite 
}: SearchResultsProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
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
    <div className="w-full min-h-[80vh] space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {results.length} provider{results.length !== 1 ? 's' : ''} found
        </h3>
        <div className="text-sm text-muted-foreground">
          Showing doctors and practices near you
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {results.map((result) => (
          <Card key={result.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {result.type === 'doctor' ? (
                  <Avatar className="w-12 h-12">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {result.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-foreground truncate">
                      {result.name}
                    </h4>
                    {result.specialty && (
                      <p className="text-xs text-muted-foreground">
                        {result.specialty}
                      </p>
                    )}
                  </div>
                  
                  {/* Favorite Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFavorite(result)}
                    className="text-muted-foreground hover:text-red-500 p-1"
                  >
                    <Heart className="w-3 h-3" />
                  </Button>
                </div>

                {/* Rating and Location */}
                <div className="flex items-center space-x-2 mb-2">
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span className="text-xs font-medium">{result.rating}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">
                      {result.location}
                    </span>
                  </div>
                </div>

                {/* Availability */}
                {result.availability && (
                  <div className="flex items-center space-x-1 mb-2">
                    <Clock className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-700">
                      {result.availability}
                    </span>
                  </div>
                )}

                {/* Action Button */}
                <div className="mt-2">
                  {result.type === 'doctor' ? (
                    <Button
                      onClick={() => onBookAppointment(result)}
                      size="sm"
                      className="w-full text-xs"
                    >
                      Book
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onViewPractice(result)}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                    >
                      <Users className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  )}
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      {results.length >= 10 && (
        <div className="text-center pt-4">
          <Button variant="outline">
            Load more results
          </Button>
        </div>
      )}
    </div>
  );
};

export default SearchResults;