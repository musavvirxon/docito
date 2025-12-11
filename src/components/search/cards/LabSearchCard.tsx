import { memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapPin, FlaskConical, Clock, Shield, TestTube } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { LabResult } from '@/hooks/useUnifiedSearch';

interface LabSearchCardProps {
  lab: LabResult;
  onView?: (lab: LabResult) => void;
}

const LabSearchCard = memo(({ lab, onView }: LabSearchCardProps) => {
  const navigate = useNavigate();

  const handleViewLab = () => {
    if (onView) {
      onView(lab);
    } else {
      navigate(`/lab/${lab.id}`);
    }
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
        onClick={handleViewLab}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Icon */}
            <Avatar className="w-16 h-16 rounded-lg border-2 border-border">
              <AvatarImage src={lab.image || undefined} alt={lab.name} className="object-cover" />
              <AvatarFallback className="bg-blue-500/10 text-blue-600 rounded-lg">
                <FlaskConical className="w-7 h-7" />
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">{lab.name}</h3>

              {/* Location */}
              {lab.location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{lab.location}</span>
                </div>
              )}

              {/* Features */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {lab.turnaroundHours && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {lab.turnaroundHours}h turnaround
                  </Badge>
                )}
                {lab.acceptsInsurance && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Insurance
                  </Badge>
                )}
              </div>

              {/* Available Tests */}
              {lab.servicesOffered && lab.servicesOffered.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {lab.servicesOffered.slice(0, 3).map((test, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <TestTube className="w-3 h-3 mr-1" />
                      {test}
                    </Badge>
                  ))}
                  {lab.servicesOffered.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{lab.servicesOffered.length - 3} more
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
              variant="outline"
              onClick={handleViewLab}
            >
              View Tests
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

LabSearchCard.displayName = 'LabSearchCard';

export default LabSearchCard;
