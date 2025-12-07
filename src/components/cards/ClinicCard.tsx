import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating-stars";
import { Tag } from "@/components/ui/tag";
import { 
  Building2, 
  Calendar, 
  Clock, 
  Lock, 
  MapPin 
} from "lucide-react";
import { cn } from "@/lib/utils";

type OpenStatus = "open" | "closed" | "closingSoon";

interface ClinicCardProps {
  id: string;
  name: string;
  address?: string;
  imageUrl?: string;
  specialties?: string[];
  openStatus?: OpenStatus;
  rating?: number;
  reviewCount?: number;
  doctorCount?: number;
  isAuthenticated: boolean;
  className?: string;
}

const ClinicCard = ({
  id,
  name,
  address,
  imageUrl,
  specialties,
  openStatus,
  rating,
  reviewCount,
  doctorCount,
  isAuthenticated,
  className,
}: ClinicCardProps) => {
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
    const path = `/practice/${id}`;
    if (!isAuthenticated) {
      navigate(`/auth?redirect=${encodeURIComponent(path)}`);
    } else {
      navigate(path);
    }
  };

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const getStatusConfig = (status?: OpenStatus) => {
    switch (status) {
      case "open":
        return { label: "Open Now", variant: "success" as const };
      case "closingSoon":
        return { label: "Closing Soon", variant: "warning" as const };
      case "closed":
        return { label: "Closed", variant: "muted" as const };
      default:
        return null;
    }
  };

  const statusConfig = getStatusConfig(openStatus);

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
        {/* Left Section - Logo & Basic Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-16 h-16 md:w-[70px] md:h-[70px] rounded-xl bg-muted flex items-center justify-center overflow-hidden ring-2 ring-primary/10 flex-shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name */}
            <h3 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
              {name}
            </h3>

            {/* Address */}
            {address && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {address}
                </span>
              </div>
            )}

            {/* Rating & Doctor Count */}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <RatingStars rating={rating} reviewCount={reviewCount} size="sm" />
              
              {doctorCount !== undefined && doctorCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    {doctorCount} doctor{doctorCount !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {statusConfig && (
                <Tag variant={statusConfig.variant} size="sm">
                  <Clock className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Tag>
              )}
            </div>

            {/* Specialties */}
            {specialties && specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {specialties.slice(0, 4).map((specialty, index) => (
                  <Tag key={index} variant="primary" size="sm">
                    {specialty}
                  </Tag>
                ))}
                {specialties.length > 4 && (
                  <Tag variant="muted" size="sm">
                    +{specialties.length - 4} more
                  </Tag>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex sm:flex-col gap-2 sm:justify-center flex-shrink-0">
          <Button
            onClick={(e) => handleNavigation(e, `/practice/${id}/book`)}
            size="sm"
            className="flex-1 sm:flex-none gap-1.5"
          >
            {!isAuthenticated && <Lock className="w-3 h-3" />}
            <Calendar className="w-4 h-4 sm:hidden md:block" />
            <span className="hidden sm:inline">Book Appointment</span>
            <span className="sm:hidden">Book</span>
          </Button>
          <Button
            onClick={(e) => handleNavigation(e, `/practice/${id}`)}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none gap-1.5"
          >
            {!isAuthenticated && <Lock className="w-3 h-3" />}
            <Building2 className="w-4 h-4 sm:hidden md:block" />
            <span className="hidden sm:inline">View Clinic</span>
            <span className="sm:hidden">View</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export { ClinicCard };
