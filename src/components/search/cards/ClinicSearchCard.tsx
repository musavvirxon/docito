import { memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Building2, Stethoscope } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ClinicResult } from '@/hooks/useUnifiedSearch';

interface ClinicSearchCardProps {
  clinic: ClinicResult;
  onView?: (clinic: ClinicResult) => void;
}

const ClinicSearchCard = memo(({ clinic, onView }: ClinicSearchCardProps) => {
  const navigate = useNavigate();

  const handleViewClinic = () => {
    if (onView) {
      onView(clinic);
    } else {
      navigate(`/practice/${clinic.id}`);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30"
        onClick={handleViewClinic}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Image */}
            <Avatar className="w-20 h-20 rounded-lg border-2 border-border">
              <AvatarImage src={clinic.image || undefined} alt={clinic.name} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold rounded-lg">
                <Building2 className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground">{clinic.name}</h3>
                
                {clinic.rating && (
                  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-md">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="text-sm font-medium">{clinic.rating.toFixed(1)}</span>
                    {clinic.reviewCount > 0 && (
                      <span className="text-xs opacity-75">({clinic.reviewCount})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Location */}
              {clinic.location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{clinic.location}</span>
                </div>
              )}

              {/* Specialties */}
              {clinic.specialties && clinic.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {clinic.specialties.slice(0, 3).map((specialty, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <Stethoscope className="w-3 h-3 mr-1" />
                      {specialty}
                    </Badge>
                  ))}
                  {clinic.specialties.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{clinic.specialties.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action */}
          <div className="mt-4">
            <Button 
              className="w-full"
              onClick={handleViewClinic}
            >
              View Clinic
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

ClinicSearchCard.displayName = 'ClinicSearchCard';

export default ClinicSearchCard;
