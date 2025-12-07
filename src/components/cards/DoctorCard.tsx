import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating-stars";
import { Tag } from "@/components/ui/tag";
import { 
  Building2, 
  Calendar, 
  Clock, 
  Languages, 
  Lock, 
  User 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DoctorCardProps {
  id: string;
  name: string;
  specialty?: string;
  clinicName?: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  experienceYears?: number;
  languages?: string[];
  tags?: string[];
  consultationFee?: number;
  isAuthenticated: boolean;
  className?: string;
}

const DoctorCard = ({
  id,
  name,
  specialty,
  clinicName,
  imageUrl,
  rating,
  reviewCount,
  experienceYears,
  languages,
  tags,
  consultationFee,
  isAuthenticated,
  className,
}: DoctorCardProps) => {
  const navigate = useNavigate();

  const handleNavigation = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate(`/auth?redirect=${encodeURIComponent(path)}`);
    } else {
      navigate(path);
    }
  };

  const handleCardClick = () => {
    const path = `/doctor-profile/${id}`;
    if (!isAuthenticated) {
      navigate(`/auth?redirect=${encodeURIComponent(path)}`);
    } else {
      navigate(path);
    }
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group relative bg-card border border-border rounded-2xl p-4 md:p-5 cursor-pointer",
        "transition-all duration-300 ease-out",
        "hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.02] hover:border-primary/20",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Left Section - Avatar & Basic Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <Avatar className="w-16 h-16 md:w-[70px] md:h-[70px] ring-2 ring-primary/10 flex-shrink-0">
            <AvatarImage src={imageUrl} alt={name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Name & Specialty */}
            <h3 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
              {name}
            </h3>
            {specialty && (
              <p className="text-sm text-primary font-medium">{specialty}</p>
            )}
            {clinicName && (
              <div className="flex items-center gap-1 mt-1">
                <Building2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {clinicName}
                </span>
              </div>
            )}

            {/* Rating & Experience Row */}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <RatingStars rating={rating} reviewCount={reviewCount} size="sm" />
              
              {experienceYears !== undefined && experienceYears > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {experienceYears} yrs exp
                  </span>
                </div>
              )}

              {consultationFee !== undefined && consultationFee > 0 && (
                <span className="text-xs font-medium text-primary">
                  ${consultationFee}
                </span>
              )}
            </div>

            {/* Languages */}
            {languages && languages.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <Languages className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {languages.slice(0, 3).join(", ")}
                  {languages.length > 3 && ` +${languages.length - 3}`}
                </span>
              </div>
            )}

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.slice(0, 3).map((tag, index) => (
                  <Tag key={index} variant="muted" size="sm">
                    {tag}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex sm:flex-col gap-2 sm:justify-center flex-shrink-0">
          <Button
            onClick={(e) => handleNavigation(e, `/book/${id}`)}
            size="sm"
            className="flex-1 sm:flex-none gap-1.5"
          >
            {!isAuthenticated && <Lock className="w-3 h-3" />}
            <Calendar className="w-4 h-4 sm:hidden md:block" />
            <span className="hidden sm:inline">Book Appointment</span>
            <span className="sm:hidden">Book</span>
          </Button>
          <Button
            onClick={(e) => handleNavigation(e, `/doctor-profile/${id}`)}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none gap-1.5"
          >
            {!isAuthenticated && <Lock className="w-3 h-3" />}
            <User className="w-4 h-4 sm:hidden md:block" />
            <span className="hidden sm:inline">View Profile</span>
            <span className="sm:hidden">Profile</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export { DoctorCard };
