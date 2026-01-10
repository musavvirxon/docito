import { memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Shield, ScanLine, Award, MessageSquare, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useMessageAction } from '@/hooks/useMessageAction';
import type { ImagingResult } from '@/hooks/useUnifiedSearch';

interface ImagingSearchCardProps {
  center: ImagingResult;
  onView?: (center: ImagingResult) => void;
  onMessage?: (center: ImagingResult) => void;
}

const ImagingSearchCard = memo(({ center, onView, onMessage }: ImagingSearchCardProps) => {
  const navigate = useNavigate();
  const { startConversation, loading: messageLoading } = useMessageAction();

  const handleViewCenter = () => {
    if (onView) {
      onView(center);
    } else {
      navigate(`/imaging/${center.id}`);
    }
  };

  const handleMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMessage) {
      onMessage(center);
    } else {
      await startConversation(center.id);
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
        onClick={handleViewCenter}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Icon */}
            <Avatar className="w-16 h-16 rounded-lg border-2 border-border">
              <AvatarImage src={center.image || undefined} alt={center.name} className="object-cover" />
              <AvatarFallback className="bg-violet-500/10 text-violet-600 rounded-lg">
                <ScanLine className="w-7 h-7" />
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground">{center.name}</h3>
                
                {center.rating && (
                  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-md">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="text-sm font-medium">{center.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Location */}
              {center.location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{center.location}</span>
                </div>
              )}

              {/* Features */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {center.acceptsInsurance && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Insurance
                  </Badge>
                )}
                {center.accreditations && center.accreditations.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Award className="w-3 h-3 mr-1" />
                    Accredited
                  </Badge>
                )}
              </div>

              {/* Available Procedures */}
              {center.procedures && center.procedures.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {center.procedures.slice(0, 4).map((proc, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {proc}
                    </Badge>
                  ))}
                  {center.procedures.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{center.procedures.length - 4} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action */}
          <div className="mt-4 flex gap-2">
            <Button 
              className="flex-1"
              variant="outline"
              onClick={handleViewCenter}
            >
              View Center
            </Button>
            <Button 
              variant="outline"
              size="icon"
              onClick={handleMessage}
              disabled={messageLoading}
            >
              {messageLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

ImagingSearchCard.displayName = 'ImagingSearchCard';

export default ImagingSearchCard;
