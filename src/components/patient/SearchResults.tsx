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
  XCircle,
  CreditCard,
  Languages,
  GraduationCap,
  Calendar
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
    <div className="w-full space-y-4 pb-8">
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
              <div className="flex items-start space-x-4">
                {/* Profile Image/Logo */}
                <div className="flex-shrink-0">
                  {result.type === 'doctor' ? (
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={result.image || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {result.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      {result.logoUrl ? (
                        <img src={result.logoUrl} alt={result.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg text-foreground mb-1">
                        {result.name}
                      </h4>
                      
                      {/* Doctor-specific info */}
                      {result.type === 'doctor' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">Doctor</Badge>
                          {result.degree && (
                            <div className="flex items-center gap-1">
                              <GraduationCap className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{result.degree}</span>
                            </div>
                          )}
                          {result.specialty && (
                            <span className="text-sm font-medium text-primary">{result.specialty}</span>
                          )}
                        </div>
                      )}
                      
                      {/* Practice-specific info */}
                      {result.type === 'practice' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">{result.practiceType || 'Practice'}</Badge>
                          {result.specialties && result.specialties.length > 0 && (
                            <span className="text-sm text-muted-foreground">
                              {result.specialties.join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Affiliated Practice for Doctors */}
                      {result.type === 'doctor' && result.affiliatedPractice && (
                        <div className="flex items-center gap-1 mb-2">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{result.affiliatedPractice}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Favorite Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFavorite(result)}
                      className="text-muted-foreground hover:text-red-500 p-1"
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Description */}
                  {(result.bio || result.description) && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {result.type === 'doctor' ? result.bio : result.description}
                    </p>
                  )}

                  {/* Rating and Location Row */}
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{result.rating}</span>
                      {result.reviewCount && (
                        <span className="text-xs text-muted-foreground">({result.reviewCount} reviews)</span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {result.location}
                      </span>
                    </div>
                  </div>

                  {/* Additional Details Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {/* Doctor-specific details */}
                    {result.type === 'doctor' && result.consultationFee && (
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">${result.consultationFee} consultation</span>
                      </div>
                    )}
                    
                    {result.type === 'doctor' && result.languages && result.languages.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Languages className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{result.languages.join(', ')}</span>
                      </div>
                    )}
                    
                    {/* Practice-specific details */}
                    {result.type === 'practice' && result.doctorCount && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{result.doctorCount} doctors</span>
                      </div>
                    )}

                    {/* Availability */}
                    {result.availability && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-700">{result.availability}</span>
                      </div>
                    )}
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {result.acceptsNewPatients && (
                      <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">
                        New patients
                      </Badge>
                    )}
                    {result.acceptsInsurance && (
                      <Badge variant="outline" className="text-purple-600 border-purple-600 text-xs">
                        Insurance
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    {result.type === 'doctor' ? (
                      <Button
                        onClick={() => onBookAppointment(result)}
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Book Appointment
                      </Button>
                    ) : (
                      <Button
                        onClick={() => onViewPractice(result)}
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Book Appointment
                      </Button>
                    )}
                    <Button
                      onClick={() => result.type === 'doctor' ? onBookAppointment(result) : onViewPractice(result)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      View Profile
                    </Button>
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