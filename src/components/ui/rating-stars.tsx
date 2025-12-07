import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating?: number;
  reviewCount?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

const RatingStars = ({ 
  rating, 
  reviewCount, 
  size = "md", 
  showCount = true,
  className 
}: RatingStarsProps) => {
  if (!rating && rating !== 0) return null;

  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const textClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Star className={cn(sizeClasses[size], "text-yellow-500 fill-yellow-500")} />
      <span className={cn(textClasses[size], "font-medium text-foreground")}>
        {rating.toFixed(1)}
      </span>
      {showCount && reviewCount !== undefined && reviewCount > 0 && (
        <span className={cn(textClasses[size], "text-muted-foreground")}>
          ({reviewCount})
        </span>
      )}
    </div>
  );
};

export { RatingStars };
