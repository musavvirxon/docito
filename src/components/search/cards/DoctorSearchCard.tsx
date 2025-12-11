import { memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, BadgeCheck, Calendar, Languages, DollarSign } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { DoctorResult } from '@/hooks/useUnifiedSearch';

interface DoctorSearchCardProps {
  doctor: DoctorResult;
  onBook?: (doctor: DoctorResult) => void;
}

const DoctorSearchCard = memo(({ doctor, onBook }: DoctorSearchCardProps) => {
  const navigate = useNavigate();

  const handleViewProfile = () => {
    navigate(`/doctor/${doctor.id}`);
  };

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBook) {
      onBook(doctor);
    } else {
      navigate(`/doctor/${doctor.id}?book=true`);
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
        onClick={handleViewProfile}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Avatar */}
            <Avatar className="w-20 h-20 border-2 border-border">
              <AvatarImage src={doctor.image || undefined} alt={doctor.name} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {getInitials(doctor.name)}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                    {doctor.name}
                    <BadgeCheck className="w-4 h-4 text-primary" />
                  </h3>
                  <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                </div>
                
                {doctor.rating && (
                  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-md">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="text-sm font-medium">{doctor.rating.toFixed(1)}</span>
                    {doctor.reviewCount > 0 && (
                      <span className="text-xs opacity-75">({doctor.reviewCount})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="mt-2 space-y-1">
                {doctor.clinicAffiliation && (
                  <p className="text-xs text-muted-foreground truncate">
                    {doctor.clinicAffiliation}
                  </p>
                )}
                
                {doctor.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{doctor.location}</span>
                  </div>
                )}

                {doctor.languages && doctor.languages.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Languages className="w-3 h-3" />
                    <span className="truncate">{doctor.languages.slice(0, 3).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {doctor.acceptsNewPatients && (
                  <Badge variant="secondary" className="text-xs">
                    Accepting Patients
                  </Badge>
                )}
                {doctor.consultationFee && (
                  <Badge variant="outline" className="text-xs">
                    <DollarSign className="w-3 h-3 mr-0.5" />
                    From ${doctor.consultationFee}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="mt-4 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleViewProfile}
            >
              View Profile
            </Button>
            <Button 
              size="sm" 
              className="flex-1"
              onClick={handleBook}
            >
              <Calendar className="w-4 h-4 mr-1.5" />
              Book
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

DoctorSearchCard.displayName = 'DoctorSearchCard';

export default DoctorSearchCard;
