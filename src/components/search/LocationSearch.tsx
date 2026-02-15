import { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLocationSearch } from '@/hooks/useLocationSearch';
import { useTranslation } from 'react-i18next';

interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationSearch({ value, onChange, placeholder = 'Search location...' }: LocationSearchProps) {
  const { t } = useTranslation(['doctors']);
  const myLocationLabel = t('doctors:location.myLocation');
  const [isUsingLocation, setIsUsingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    suggestions,
    isLoading,
    isOpen,
    setIsOpen,
    searchLocation,
    selectLocation
  } = useLocationSearch();

  useEffect(() => {
    if (value) {
      searchLocation(value);
    }
  }, [value, searchLocation]);

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) return;
    
    setIsUsingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      // Reverse geocoding - convert coordinates to address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
      );
      const data = await response.json();
      
      if (data.display_name) {
        const city = data.address.city || data.address.town || data.address.village || myLocationLabel;
        const country = data.address.country || '';
        const newValue = country ? `${city}, ${country}` : city;
        
        onChange(newValue);
        setLocationDetected(true);
        setTimeout(() => setLocationDetected(false), 3000);
      }
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      setIsUsingLocation(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-12"
        />
        
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          onClick={handleUseMyLocation}
          disabled={isUsingLocation}
          title={t('doctors:location.useMyLocation')}
        >
          {isUsingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
        </Button>
      </div>

      {locationDetected && (
        <div className="mt-1">
          <Badge variant="secondary" className="text-xs">
            <Navigation className="h-3 w-3 mr-1" />
            {t('doctors:location.locationDetected')}
          </Badge>
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 p-2 shadow-lg z-50 max-h-60 overflow-y-auto">
          <div className="space-y-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-muted transition-colors",
                  suggestion.selected && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  selectLocation(suggestion);
                  onChange(suggestion.display_name);
                  setIsOpen(false);
                }}
              >
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{suggestion.main_text}</div>
                  {suggestion.secondary_text && (
                    <div className="text-xs text-muted-foreground truncate">
                      {suggestion.secondary_text}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {value && (
        <div className="mt-1 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => onChange('')}
          >
            {t('doctors:location.clear')}
          </Button>
        </div>
      )}
    </div>
  );
}
