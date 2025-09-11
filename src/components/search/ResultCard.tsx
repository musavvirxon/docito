import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Calendar, CreditCard, Languages } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  type: 'doctor' | 'practice';
  name: string;
  specialty?: string;
  location: string;
  rating: number;
  reviewCount?: number;
  availability?: string;
  acceptsInsurance?: boolean;
  acceptsNewPatients?: boolean;
  distance?: string;
  image?: string;
  bio?: string;
  experience?: string;
  languages?: string[];
  practiceName?: string;
}

interface ResultCardProps {
  result: SearchResult;
  isMobile?: boolean;
}

const ResultCard = ({ result, isMobile = false }: ResultCardProps) => {
  const navigate = useNavigate();

  const handleBookAppointment = () => {
    // Check if user is signed in (this would come from auth context)
    const isSignedIn = false; // Replace with actual auth check
    
    if (!isSignedIn) {
      navigate('/signup', { state: { returnTo: `/doctor-profile/${result.id}` } });
    } else {
      // Handle booking logic
      console.log('Book appointment with:', result.name);
    }
  };

  const handleViewProfile = () => {
    navigate(`/doctor-profile/${result.id}`);
  };

  if (isMobile) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <img 
              src={result.image || "/placeholder.svg"} 
              alt={result.name}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base text-foreground truncate">
                {result.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {result.specialty}
              </p>
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{result.rating}</span>
              </div>
              <Button onClick={handleViewProfile} variant="outline" size="sm" className="w-full">
                View More
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <img 
            src={result.image || "/placeholder.svg"} 
            alt={result.name}
            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
          />
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {result.name}
                </h3>
                <Badge variant="secondary" className="mb-2">
                  {result.type === 'doctor' ? 'Doctor' : 'Practice'}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{result.rating}</span>
                {result.reviewCount && (
                  <span className="text-muted-foreground">({result.reviewCount})</span>
                )}
              </div>
            </div>

            {result.specialty && (
              <p className="text-muted-foreground mb-3">{result.specialty}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{result.location}</span>
                {result.distance && (
                  <span className="text-sm text-muted-foreground">• {result.distance}</span>
                )}
              </div>

              {result.availability && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{result.availability}</span>
                </div>
              )}

              {result.languages && result.languages.length > 0 && (
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{result.languages.join(', ')}</span>
                </div>
              )}

              {result.experience && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{result.experience} experience</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4">
              {result.acceptsNewPatients && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  New patients
                </Badge>
              )}
              {result.acceptsInsurance && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  Insurance
                </Badge>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={handleBookAppointment} className="flex-1">
                Book Appointment
              </Button>
              <Button onClick={handleViewProfile} variant="outline" className="flex-1">
                View Profile
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultCard;