import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, ChevronDown, Star, DollarSign, Clock, MapPin, 
  Video, UserCheck, Shield, Globe, X, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { SearchFilters } from '@/hooks/useSearchDiscovery';

interface EnhancedFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  specialties?: string[];
  languages?: string[];
  className?: string;
  variant?: 'sidebar' | 'inline';
}

const PRICE_RANGES = [
  { label: 'Any', min: 0, max: 10000 },
  { label: '$0 - $50', min: 0, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: '$100 - $200', min: 100, max: 200 },
  { label: '$200+', min: 200, max: 10000 },
];

const DISTANCE_OPTIONS = [
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
  { label: 'Any distance', value: 0 },
];

const DEFAULT_SPECIALTIES = [
  'General Practice',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Orthopedics',
  'Neurology',
  'Psychiatry',
  'Dentistry',
  'Ophthalmology',
  'ENT',
];

const DEFAULT_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Russian',
  'Chinese',
  'Arabic',
  'Turkish',
  'Uzbek',
];

export function EnhancedFilters({
  filters,
  onFiltersChange,
  specialties = DEFAULT_SPECIALTIES,
  languages = DEFAULT_LANGUAGES,
  className,
  variant = 'sidebar',
}: EnhancedFiltersProps) {
  const { t } = useTranslation(['doctors']);
  const [expandedSections, setExpandedSections] = useState<string[]>(['specialty', 'availability']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.values(filters).filter(v => 
    v !== undefined && v !== null && v !== '' && v !== false && v !== 0
  ).length;

  const FilterSection = ({ 
    id, 
    title, 
    icon: Icon, 
    children 
  }: { 
    id: string; 
    title: string; 
    icon: React.ComponentType<{ className?: string }>; 
    children: React.ReactNode;
  }) => (
    <Collapsible
      open={expandedSections.includes(id)}
      onOpenChange={() => toggleSection(id)}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto hover:bg-accent/50"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{title}</span>
          </div>
          <ChevronDown 
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expandedSections.includes(id) && "rotate-180"
            )} 
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-4 space-y-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div className={cn("bg-card rounded-lg border border-border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <span className="font-semibold">{t('doctors:search.filters')}</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            {t('doctors:search.clearFilters')}
          </Button>
        )}
      </div>

      <div className="divide-y divide-border">
        {/* Specialty */}
        <FilterSection id="specialty" title={t('doctors:search.specialty')} icon={Filter}>
          <Select
            value={filters.specialty || '_all'}
            onValueChange={(value) => updateFilter('specialty', value === '_all' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('doctors:specialties.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Specialties</SelectItem>
              {specialties.map(spec => (
                <SelectItem key={spec} value={spec}>{spec}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>

        {/* Location & Distance */}
        <FilterSection id="location" title={t('doctors:search.location')} icon={MapPin}>
          <div className="space-y-3">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                Distance
              </Label>
              <Select
                value={filters.distance?.toString() || '0'}
                onValueChange={(value) => updateFilter('distance', parseInt(value) || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any distance" />
                </SelectTrigger>
                <SelectContent>
                  {DISTANCE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FilterSection>

        {/* Rating */}
        <FilterSection id="rating" title={t('doctors:search.rating')} icon={Star}>
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">
              Minimum Rating: {filters.minRating || 0}+ ★
            </Label>
            <Slider
              value={[filters.minRating || 0]}
              onValueChange={([value]) => updateFilter('minRating', value || undefined)}
              max={5}
              min={0}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Any</span>
              <span>5 ★</span>
            </div>
          </div>
        </FilterSection>

        {/* Price Range */}
        <FilterSection id="price" title={t('doctors:search.consultationFee')} icon={DollarSign}>
          <div className="space-y-2">
            {PRICE_RANGES.map(range => (
              <Button
                key={range.label}
                variant={
                  filters.minPrice === range.min && filters.maxPrice === range.max
                    ? 'secondary'
                    : 'ghost'
                }
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  if (range.min === 0 && range.max === 10000) {
                    updateFilter('minPrice', undefined);
                    updateFilter('maxPrice', undefined);
                  } else {
                    onFiltersChange({
                      ...filters,
                      minPrice: range.min,
                      maxPrice: range.max,
                    });
                  }
                }}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </FilterSection>

        {/* Availability */}
        <FilterSection id="availability" title={t('doctors:search.availability')} icon={Clock}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="availableToday" className="text-sm">
                Available Today
              </Label>
              <Switch
                id="availableToday"
                checked={filters.availableToday || false}
                onCheckedChange={(checked) => updateFilter('availableToday', checked || undefined)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="acceptsNewPatients" className="text-sm">
                Accepts New Patients
              </Label>
              <Switch
                id="acceptsNewPatients"
                checked={filters.acceptsNewPatients || false}
                onCheckedChange={(checked) => updateFilter('acceptsNewPatients', checked || undefined)}
              />
            </div>
          </div>
        </FilterSection>

        {/* Services */}
        <FilterSection id="services" title="Services" icon={Video}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="videoConsultation" className="text-sm flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video Consultation
              </Label>
              <Switch
                id="videoConsultation"
                checked={filters.videoConsultation || false}
                onCheckedChange={(checked) => updateFilter('videoConsultation', checked || undefined)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="acceptsInsurance" className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Accepts Insurance
              </Label>
              <Switch
                id="acceptsInsurance"
                checked={filters.acceptsInsurance || false}
                onCheckedChange={(checked) => updateFilter('acceptsInsurance', checked || undefined)}
              />
            </div>
          </div>
        </FilterSection>

        {/* Language */}
        <FilterSection id="language" title="Language" icon={Globe}>
          <Select
            value={filters.language || '_all'}
            onValueChange={(value) => updateFilter('language', value === '_all' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Any language</SelectItem>
              {languages.map(lang => (
                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>
      </div>

      {/* Active Filters */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4 border-t border-border"
          >
            <div className="flex flex-wrap gap-2">
              {filters.specialty && (
                <Badge variant="secondary" className="gap-1">
                  {filters.specialty}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('specialty', undefined)}
                  />
                </Badge>
              )}
              {filters.minRating && (
                <Badge variant="secondary" className="gap-1">
                  {filters.minRating}+ ★
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('minRating', undefined)}
                  />
                </Badge>
              )}
              {filters.availableToday && (
                <Badge variant="secondary" className="gap-1">
                  Available Today
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('availableToday', undefined)}
                  />
                </Badge>
              )}
              {filters.videoConsultation && (
                <Badge variant="secondary" className="gap-1">
                  Video
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('videoConsultation', undefined)}
                  />
                </Badge>
              )}
              {filters.language && (
                <Badge variant="secondary" className="gap-1">
                  {filters.language}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('language', undefined)}
                  />
                </Badge>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
