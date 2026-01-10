import { memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Truck, Shield, Clock, MessageSquare, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useMessageAction } from '@/hooks/useMessageAction';
import type { PharmacyResult } from '@/hooks/useUnifiedSearch';

interface PharmacySearchCardProps {
  pharmacy: PharmacyResult;
  onView?: (pharmacy: PharmacyResult) => void;
  onMessage?: (pharmacy: PharmacyResult) => void;
}

const PharmacySearchCard = memo(({ pharmacy, onView, onMessage }: PharmacySearchCardProps) => {
  const navigate = useNavigate();
  const { startConversation, loading: messageLoading } = useMessageAction();

  const handleViewPharmacy = () => {
    if (onView) {
      onView(pharmacy);
    } else {
      navigate(`/pharmacy/${pharmacy.id}`);
    }
  };

  const handleMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMessage) {
      onMessage(pharmacy);
    } else {
      await startConversation(pharmacy.id);
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
        onClick={handleViewPharmacy}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Image */}
            <Avatar className="w-16 h-16 rounded-lg border-2 border-border">
              <AvatarImage src={pharmacy.image || undefined} alt={pharmacy.name} className="object-cover" />
              <AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-lg font-semibold rounded-lg">
                Rx
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground">{pharmacy.name}</h3>
                
                {pharmacy.rating && (
                  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-md">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="text-sm font-medium">{pharmacy.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Location */}
              {pharmacy.location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{pharmacy.location}</span>
                </div>
              )}

              {/* Status & Features */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {pharmacy.isOpen !== undefined && (
                  <Badge 
                    variant={pharmacy.isOpen ? "default" : "secondary"} 
                    className={pharmacy.isOpen ? "bg-emerald-500 text-white" : ""}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {pharmacy.isOpen ? 'Open' : 'Closed'}
                  </Badge>
                )}
                {pharmacy.deliveryAvailable && (
                  <Badge variant="outline" className="text-xs">
                    <Truck className="w-3 h-3 mr-1" />
                    Delivery
                  </Badge>
                )}
                {pharmacy.acceptsInsurance && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Insurance
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="mt-4 flex gap-2">
            <Button 
              className="flex-1"
              variant="outline"
              onClick={handleViewPharmacy}
            >
              Visit Pharmacy
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

PharmacySearchCard.displayName = 'PharmacySearchCard';

export default PharmacySearchCard;
