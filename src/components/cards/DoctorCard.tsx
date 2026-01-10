import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Calendar, User } from "lucide-react";
import { useBookingAuth } from "@/hooks/useBookingAuth";
import { useIsMobile } from "@/hooks/use-mobile";

interface DoctorCardProps {
  id: string;
  name: string;
  specialty: string;
  location: string;
  rating: number;
  reviewCount: number;
  imageUrl?: string;
  availableToday?: boolean;
  consultationFee?: number;
  nextAvailable?: string;
  languages?: string[];
  isPremium?: boolean;
}

const DoctorCard = memo(({
  id,
  name,
  specialty,
  location,
  rating,
  reviewCount,
  imageUrl,
  availableToday = false,
  consultationFee,
  nextAvailable,
  languages = [],
  isPremium = false,
}: DoctorCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { handleBookingClick, isLoggedIn: isAuthenticated } = useBookingAuth();
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = () => {
    navigate(`/doctor-profile/${id}`);
  };

  const handleNavigation = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    navigate(path);
  };

  const handleBookingNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Use our booking auth hook for consistent behavior
    handleBookingClick(id);
  };

  return (
    <Card 
      className={`overflow-hidden transition-all duration-300 cursor-pointer ${
        isHovered ? 'shadow-lg scale-[1.02]' : 'shadow-sm'
      } ${isPremium ? 'border-primary/20 bg-gradient-to-br from-background to-primary/5' : ''}`}
      onClick={handleCardClick}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
    >
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Doctor Image & Premium Badge */}
          <div className="relative flex-shrink-0 self-center sm:self-start">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
              <AvatarImage src={imageUrl} alt={name} />
              <AvatarFallback className="bg-primary/10">
                <User className="h-10 w-10 text-primary" />
              </AvatarFallback>
            </Avatar>
            {isPremium && (
              <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-purple-500 text-white border-0">
                Premium
              </Badge>
            )}
          </div>

          {/* Doctor Info */}
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-semibold text-center sm:text-left">
                Dr. {name}
              </h3>
              <p className="text-muted-foreground text-center sm:text-left">
                {specialty}
              </p>
            </div>

            {/* Rating & Reviews */}
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{rating.toFixed(1)}</span>
              </div>
              <span className="text-muted-foreground">
                ({reviewCount} reviews)
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center justify-center sm:justify-start gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{location}</span>
            </div>

            {/* Languages */}
            {languages.length > 0 && (
              <div className="flex flex-wrap justify-center sm:justify-start gap-1">
                {languages.slice(0, 3).map((lang) => (
                  <Badge key={lang} variant="secondary" className="text-xs">
                    {lang}
                  </Badge>
                ))}
                {languages.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{languages.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            {/* Availability & Fee */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm">
              <div className="flex items-center justify-center sm:justify-start gap-1">
                <Calendar className="h-4 w-4 text-primary" />
                <span className={availableToday ? "text-green-600 font-medium" : "text-muted-foreground"}>
                  {availableToday ? "Available today" : nextAvailable || "Check availability"}
                </span>
              </div>
              {consultationFee && (
                <div className="text-center sm:text-left">
                  <span className="text-muted-foreground">From </span>
                  <span className="font-medium">${consultationFee}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={handleBookingNavigation}
                size="sm"
                className="flex-1 sm:flex-none gap-1.5"
              >
                <Calendar className="h-4 w-4" />
                Book Appointment
              </Button>
              
              <Button
                onClick={(e) => handleNavigation(e, `/book-appointment/${id}`)}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                View Profile
              </Button>
            </div>

            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground text-center sm:text-left">
                Sign in required to book
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
});

DoctorCard.displayName = "DoctorCard";

export default DoctorCard;
