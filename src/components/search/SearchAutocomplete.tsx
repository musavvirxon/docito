import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, User, Stethoscope, TrendingUp, Clock, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'doctor' | 'location' | 'specialty';
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

const suggestionIcons = {
  recent: Clock,
  popular: TrendingUp,
  doctor: User,
  location: MapPin,
  specialty: Stethoscope
};

export function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  placeholder = 'Search doctors, specialties, locations...',
  className
}: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation(['doctors']);

  const getSuggestionLabel = (type: SearchSuggestion['type']) =>
    t(`doctors:autocomplete.labels.${type}`, { defaultValue: type });
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock suggestions - replace with actual API call
  const getMockSuggestions = (query: string): SearchSuggestion[] => {
    const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const popularSearches = [
      'Cardiologist',
      'Dermatologist',
      'Pediatrician',
      'Dentist',
      'General Practice'
    ];

    if (!query) {
      return [
        ...recentSearches.slice(0, 3).map((search: string, index: number) => ({
          id: `recent-${index}`,
          text: search,
          type: 'recent' as const
        })),
        ...popularSearches.slice(0, 3).map((search, index) => ({
          id: `popular-${index}`,
          text: search,
          type: 'popular' as const
        }))
      ];
    }

    // Filter and return suggestions based on query
    const filtered = [...popularSearches, ...recentSearches]
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);

    return filtered.map((text, index) => ({
      id: `suggestion-${index}`,
      text,
      type: popularSearches.includes(text) ? 'popular' : 'recent'
    }));
  };

  useEffect(() => {
    if (isOpen) {
      setSuggestions(getMockSuggestions(value));
    }
  }, [value, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0) {
          const selected = suggestions[highlightedIndex];
          handleSuggestionSelect(selected);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSearch(suggestion.text);
    saveRecentSearch(suggestion.text);
  };

  const handleSearch = () => {
    if (value.trim()) {
      onSearch(value.trim());
      saveRecentSearch(value.trim());
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const saveRecentSearch = (search: string) => {
    const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const updated = [search, ...recentSearches.filter((s: string) => s !== search)].slice(0, 10);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    localStorage.removeItem('recentSearches');
    setSuggestions(getMockSuggestions(value));
  };

  const getIcon = (type: SearchSuggestion['type']) => {
    const IconComponent = suggestionIcons[type];
    return <IconComponent className="h-4 w-4" />;
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <Card
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 p-2 shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          <div className="space-y-1">
            {/* Header for recent searches */}
            {!value && suggestions.some(s => s.type === 'recent') && (
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {getSuggestionLabel('recent')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={clearRecentSearches}
                >
                  {t('doctors:autocomplete.clearRecent')}
                </Button>
              </div>
            )}

            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors",
                  highlightedIndex === index
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => handleSuggestionSelect(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-md",
                  suggestion.type === 'popular' ? "bg-primary/10 text-primary" :
                  suggestion.type === 'recent' ? "bg-muted text-muted-foreground" :
                  "bg-secondary text-secondary-foreground"
                )}>
                  {getIcon(suggestion.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{suggestion.text}</div>
                  <div className="text-xs text-muted-foreground">
                    {getSuggestionLabel(suggestion.type)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
