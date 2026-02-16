import { useState, useCallback } from 'react';

interface LocationSuggestion {
  id: string;
  display_name: string;
  main_text: string;
  secondary_text?: string;
  selected?: boolean;
  lat?: number;
  lon?: number;
}

export function useLocationSearch() {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const searchLocation = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();

      const mapped: LocationSuggestion[] = (data || []).map((item: any) => ({
        id: String(item.place_id),
        display_name: item.display_name,
        main_text: item.display_name?.split(',')[0] || item.display_name,
        secondary_text: item.display_name?.split(',').slice(1).join(',').trim(),
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));

      setSuggestions(mapped);
    } catch (error) {
      console.error('Location search error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectLocation = useCallback((suggestion: LocationSuggestion) => {
    setSuggestions((prev) =>
      prev.map((s) => ({ ...s, selected: s.id === suggestion.id }))
    );
    setIsOpen(false);
  }, []);

  return {
    suggestions,
    isLoading,
    isOpen,
    setIsOpen,
    searchLocation,
    selectLocation,
  };
}
