import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Calendar, CreditCard, Languages, Loader2, Building2, Users, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBookingAuth } from "@/hooks/useBookingAuth";

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
  degree?: string;
  consultationFee?: number;
  practiceType?: string;
  description?: string;
  specialties?: string[];
  doctorCount?: number;
  logoUrl?: string;
  affiliatedPractice?: string;
}

interface ResultCardProps {
  result: SearchResult;
  isMobile?: boolean;
}

const ResultCard = ({ result, isMobile = false }: ResultCardProps) => {
  const navigate = useNavigate();
  const { handleBookingClick } = useBookingAuth();
  const [isBookingLoading, setIsBookingLoading] = useState(false);

  const handleBookAppointment = async () => {
    setIsBookingLoading(true);
    
    // Small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    handleBookingClick(result.id, result.name);
    setIsBookingLoading(false);
  };

  const handleViewProfile = () => {
    if (result.type === 'doctor') {
      navigate(`/doctor/${result.id}`);
    } else {
      navigate(`/practice/${result.id}`);
    }
  };

  if (isMobile) {
    return (
      <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-lg mb-3 shadow-sm">
        <img 
          src={result.type === 'practice' ? (result.logoUrl || "/placeholder.svg") : (result.image || "/placeholder.svg")} 
          alt={result.name}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-foreground mb-1">
            {result.name}
          </h3>
          
          {/* Type and Specialty/Degree */}
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              {result.type === 'doctor' ? 'Doctor' : 'Practice'}
            </Badge>
            {result.degree && result.type === 'doctor' && (
              <span className="text-xs text-muted-foreground">{result.degree}</span>
            )}
          </div>
          
          {/* Specialty or Practice Type */}
          <p className="text-sm text-muted-foreground mb-2">
            {result.type === 'doctor' ? result.specialty : result.practiceType}
          </p>
          
          {/* Location and Practice Info */}
          <div className="text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{result.location}</span>
            </div>
            {result.type === 'doctor' && result.affiliatedPractice && (
              <div className="flex items-center gap-1 mt-1">
                <Building2 className="w-3 h-3" />
                <span>{result.affiliatedPractice}</span>
              </div>
            )}
          </div>
          
          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{result.rating}</span>
            {result.reviewCount && (
              <span className="text-xs text-muted-foreground">({result.reviewCount} reviews)</span>
            )}
          </div>
          
          {/* Consultation Fee or Doctor Count */}
          {result.type === 'doctor' && result.consultationFee && (
            <div className="flex items-center gap-1 mb-2">
              <CreditCard className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">${result.consultationFee} consultation</span>
            </div>
          )}
          
          {result.type === 'practice' && result.doctorCount && (
            <div className="flex items-center gap-1 mb-2">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{result.doctorCount} doctors</span>
            </div>
          )}
          
          <div className="flex gap-2 mt-3">
            <Button 
              onClick={handleBookAppointment} 
              size="sm" 
              className="flex-1 min-h-[44px] bg-primary hover:bg-primary/90 active:scale-95 transition-all duration-150"
              disabled={isBookingLoading}
            >
              {isBookingLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Now
                </>
              )}
            </Button>
            <Button onClick={handleViewProfile} variant="outline" size="sm" className="min-h-[44px] active:scale-95 transition-all duration-150">
              View Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 p-6 bg-card border border-border rounded-lg mb-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Left Column - Profile Image/Logo */}
      <img 
        src={result.type === 'practice' ? (result.logoUrl || "/placeholder.svg") : (result.image || "/placeholder.svg")} 
        alt={result.name}
        className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
      />
      
      {/* Right Column - Info Section */}
      <div className="flex-1 min-w-0">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-foreground mb-1">
              {result.name}
            </h3>
            
            {/* Doctor-specific info */}
            {result.type === 'doctor' && (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">Doctor</Badge>
                {result.degree && (
                  <div className="flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{result.degree}</span>
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
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{result.affiliatedPractice}</span>
              </div>
            )}
          </div>
          
          {/* Rating */}
          <div className="flex items-center gap-1 ml-4">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-lg">{result.rating}</span>
            {result.reviewCount && (
              <span className="text-sm text-muted-foreground">({result.reviewCount} reviews)</span>
            )}
          </div>
        </div>

        {/* Description */}
        {(result.bio || result.description) && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {result.type === 'doctor' ? result.bio : result.description}
          </p>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm truncate">{result.location}</span>
            {result.distance && (
              <span className="text-xs text-muted-foreground">• {result.distance}</span>
            )}
          </div>

          {/* Doctor-specific details */}
          {result.type === 'doctor' && (
            <>
              {result.experience && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">⏳ {result.experience} experience</span>
                </div>
              )}
              
              {result.consultationFee && (
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">${result.consultationFee} consultation</span>
                </div>
              )}
              
              {result.languages && result.languages.length > 0 && (
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{result.languages.join(', ')}</span>
                </div>
              )}
            </>
          )}

          {/* Practice-specific details */}
          {result.type === 'practice' && result.doctorCount && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{result.doctorCount} affiliated doctors</span>
            </div>
          )}

          {/* Availability */}
          {result.availability && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{result.availability}</span>
            </div>
          )}
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {result.availability?.includes('today') && (
            <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
              Available today
            </Badge>
          )}
          {result.acceptsNewPatients && (
            <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs">
              Accepting new patients
            </Badge>
          )}
          {result.acceptsInsurance && (
            <Badge variant="outline" className="text-purple-600 border-purple-600 text-xs">
              Accepts insurance
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={handleBookAppointment} 
            size="sm" 
            className="flex-1 max-w-[160px] min-h-[42px] bg-primary hover:bg-primary/90 hover:shadow-md active:scale-95 transition-all duration-150"
            disabled={isBookingLoading}
          >
            {isBookingLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Booking...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Book Appointment
              </>
            )}
          </Button>
          <Button 
            onClick={handleViewProfile} 
            variant="outline" 
            size="sm" 
            className="flex-1 max-w-[140px] min-h-[42px] hover:bg-muted active:scale-95 transition-all duration-150"
          >
            View Profile
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;