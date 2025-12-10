import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useTranslation } from 'react-i18next';

interface LocationSearchProps {
  value: string;
  onChange: (value: string, coords?: { lat: number; lng: number }) => void;
  className?: string;
  placeholder?: string;
}

export function LocationSearch({
  value,
  onChange,
  className,
  placeholder,
}: LocationSearchProps) {
  const { t } = useTranslation(['doctors']);
  const [isUsingLocation, setIsUsingLocation] = useState(false);
  const { 
    getCurrentPosition, 
    loading: geoLoading, 
    error: geoError,
    latitude,
    longitude,
    isSupported 
  } = useGeolocation();

  const handleUseMyLocation = async () => {
    try {
      const position = await getCurrentPosition();
      setIsUsingLocation(true);
      
      // Try to get city name from coordinates using reverse geocoding
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
        );
        const data = await response.json();
        const city = data.address?.city || data.address?.town || data.address?.village || 'My Location';
        onChange(city, { lat: position.coords.latitude, lng: position.coords.longitude });
      } catch {
        onChange('My Location', { lat: position.coords.latitude, lng: position.coords.longitude });
      }
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsUsingLocation(false);
    onChange(e.target.value);
  };

  const handleClearLocation = () => {
    setIsUsingLocation(false);
    onChange('');
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder || t('doctors:search.location')}
            className={cn(
              "pl-10 pr-10 h-12 text-base bg-background border-border",
              isUsingLocation && "border-primary"
            )}
          />
          {isUsingLocation && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </motion.div>
          )}
        </div>
        
        {isSupported && (
          <Button
            type="button"
            variant={isUsingLocation ? "default" : "outline"}
            size="icon"
            className="h-12 w-12 shrink-0"
            onClick={handleUseMyLocation}
            disabled={geoLoading}
            title="Use my location"
          >
            {geoLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Navigation className={cn(
                "h-5 w-5",
                isUsingLocation && "text-primary-foreground"
              )} />
            )}
          </Button>
        )}
      </div>

      {/* Error message */}
      {geoError && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-2 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4" />
          <span>{geoError}</span>
        </motion.div>
      )}

      {/* Location detected badge */}
      {isUsingLocation && latitude && longitude && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mt-2 text-sm text-muted-foreground"
        >
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            Location detected
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={handleClearLocation}
          >
            Clear
          </Button>
        </motion.div>
      )}
    </div>
  );
}
