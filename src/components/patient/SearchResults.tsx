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
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {results.length} provider{results.length !== 1 ? 's' : ''} found
        </h3>
        <div className="text-sm text-muted-foreground">
          Showing doctors and practices near you
        </div>
      </div>

      {results.map((result) => (
        <Card key={result.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              {/* Avatar/Icon */}
              <div className="flex-shrink-0">
                {result.type === 'doctor' ? (
                  <Avatar className="w-16 h-16">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {result.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-blue-600" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-lg font-semibold text-foreground truncate">
                      {result.name}
                    </h4>
                    {result.specialty && (
                      <p className="text-sm text-muted-foreground">
                        {result.specialty}
                      </p>
                    )}
                  </div>
                  
                  {/* Favorite Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFavorite(result)}
                    className="text-muted-foreground hover:text-red-500"
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>

                {/* Rating and Location */}
                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium">{result.rating}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground truncate">
                      {result.location}
                    </span>
                  </div>
                  
                  {result.distance && (
                    <div className="text-sm text-muted-foreground">
                      {result.distance}
                    </div>
                  )}
                </div>

                {/* Availability and Status */}
                <div className="flex items-center space-x-4 mb-4">
                  {result.availability && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">
                        {result.availability}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      {result.acceptsInsurance ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        Insurance
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {result.acceptsNewPatients ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        New patients
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {result.type === 'doctor' && (
                    <Badge variant="secondary" className="text-xs">
                      Doctor
                    </Badge>
                  )}
                  {result.type === 'practice' && (
                    <Badge variant="secondary" className="text-xs">
                      Practice
                    </Badge>
                  )}
                  {result.acceptsInsurance && (
                    <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                      Accepts Insurance
                    </Badge>
                  )}
                  {result.acceptsNewPatients && (
                    <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">
                      New Patients
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col space-y-2 flex-shrink-0">
                {result.type === 'doctor' ? (
                  <Button
                    onClick={() => onBookAppointment(result)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Book
                  </Button>
                ) : (
                  <Button
                    onClick={() => onViewPractice(result)}
                    variant="outline"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    View Doctors
                  </Button>
                )}
                
                <Button variant="outline" size="sm">
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

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