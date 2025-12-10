import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, TrendingUp, User, MapPin, Stethoscope, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSearchDiscovery, type SearchSuggestion } from '@/hooks/useSearchDiscovery';
import { useTranslation } from 'react-i18next';

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const suggestionIcons: Record<SearchSuggestion['type'], React.ReactNode> = {
  recent: <Clock className="h-4 w-4 text-muted-foreground" />,
  popular: <TrendingUp className="h-4 w-4 text-primary" />,
  doctor: <User className="h-4 w-4 text-blue-500" />,
  location: <MapPin className="h-4 w-4 text-green-500" />,
  specialty: <Stethoscope className="h-4 w-4 text-purple-500" />,
};

const suggestionLabels: Record<SearchSuggestion['type'], string> = {
  recent: 'Recent',
  popular: 'Popular',
  doctor: 'Doctor',
  location: 'Location',
  specialty: 'Specialty',
};

export function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  placeholder,
  className,
  autoFocus = false,
}: SearchAutocompleteProps) {
  const { t } = useTranslation(['doctors']);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { suggestions, isLoadingSuggestions, getSuggestions, clearSearchHistory, recentSearches } = useSearchDiscovery();

  // Debounced suggestion fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      getSuggestions(value);
    }, 150);
    return () => clearTimeout(timer);
  }, [value, getSuggestions]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          const suggestion = suggestions[selectedIndex];
          onChange(suggestion.text);
          onSearch(suggestion.text);
          setIsOpen(false);
        } else if (value.trim()) {
          onSearch(value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text);
    onSearch(suggestion.text);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            setIsOpen(true);
            getSuggestions(value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('doctors:search.placeholder')}
          className="pl-10 pr-10 h-12 text-base bg-background border-border"
          autoFocus={autoFocus}
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (suggestions.length > 0 || isLoadingSuggestions) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
          >
            {isLoadingSuggestions && suggestions.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="max-h-[300px] overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <motion.button
                      key={`${suggestion.type}-${suggestion.text}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                        "hover:bg-accent",
                        selectedIndex === index && "bg-accent"
                      )}
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      {suggestionIcons[suggestion.type]}
                      <span className="flex-1 truncate">{suggestion.text}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {suggestionLabels[suggestion.type]}
                      </span>
                    </motion.button>
                  ))}
                </div>
                
                {recentSearches.length > 0 && !value && (
                  <div className="border-t border-border px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        clearSearchHistory();
                        getSuggestions('');
                      }}
                    >
                      Clear recent searches
                    </Button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
