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
      <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-lg mb-3 shadow-sm">
        <img 
          src={result.image || "/placeholder.svg"} 
          alt={result.name}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-foreground mb-1">
            {result.name}
          </h3>
          <Badge variant="secondary" className="text-xs mb-2">
            {result.type === 'doctor' ? 'Doctor' : 'Practice'}
          </Badge>
          <p className="text-sm text-muted-foreground mb-2">
            {result.specialty}
          </p>
          <div className="flex items-center gap-1 mb-3">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{result.rating}</span>
            {result.reviewCount && (
              <span className="text-xs text-muted-foreground">({result.reviewCount})</span>
            )}
          </div>
          <Button onClick={handleViewProfile} variant="outline" size="sm" className="w-full">
            View More
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-lg mb-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Left Column - Profile Image */}
      <img 
        src={result.image || "/placeholder.svg"} 
        alt={result.name}
        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
      />
      
      {/* Right Column - Info Section */}
      <div className="flex-1 min-w-0">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {result.name}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                {result.type === 'doctor' ? 'Doctor' : 'Practice'}
              </Badge>
              <span className="text-sm text-muted-foreground">{result.specialty}</span>
            </div>
            {result.practiceName && result.type === 'doctor' && (
              <p className="text-sm text-muted-foreground mb-2">{result.practiceName}</p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-4">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium text-sm">{result.rating}</span>
            {result.reviewCount && (
              <span className="text-xs text-muted-foreground">({result.reviewCount})</span>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm truncate">{result.location}</span>
            {result.distance && (
              <span className="text-xs text-muted-foreground">• {result.distance}</span>
            )}
          </div>

          {result.experience && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⏳ {result.experience} experience</span>
            </div>
          )}

          {result.languages && result.languages.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate">{result.languages.join(', ')}</span>
            </div>
          )}

          {result.availability && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{result.availability}</span>
            </div>
          )}
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {result.availability?.includes('today') && (
            <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
              Available today
            </Badge>
          )}
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
        <div className="flex gap-3">
          <Button onClick={handleBookAppointment} size="sm" className="flex-1 max-w-[140px]">
            Book Appointment
          </Button>
          <Button onClick={handleViewProfile} variant="outline" size="sm" className="flex-1 max-w-[120px]">
            View Profile
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;