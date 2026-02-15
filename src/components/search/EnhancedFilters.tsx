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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { LocationSearch } from './LocationSearch';

export interface EnhancedFiltersProps {
  filters: {
    specialty?: string;
    location?: string;
    minRating?: number;
    priceRange?: [number, number];
    distance?: number;
    availableToday?: boolean;
    acceptsNewPatients?: boolean;
    videoConsultation?: boolean;
    acceptsInsurance?: boolean;
    language?: string;
  };
  onFiltersChange: (filters: any) => void;
  specialties?: string[];
  languages?: string[];
  layout?: 'sidebar' | 'inline';
  className?: string;
}

const PRICE_RANGES = [
  { key: 'any', min: 0, max: 10000 },
  { key: '0_50', min: 0, max: 50 },
  { key: '50_100', min: 50, max: 100 },
  { key: '100_200', min: 100, max: 200 },
  { key: '200_plus', min: 200, max: 10000 }
] as const;

const DISTANCE_OPTIONS = [
  { key: 'any', value: 50 },
  { key: 'km5', value: 5 },
  { key: 'km10', value: 10 },
  { key: 'km25', value: 25 },
  { key: 'km50', value: 50 }
] as const;

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
  'ENT'
] as const;

const DEFAULT_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Russian',
  'Chinese',
  'Arabic',
  'Turkish',
  'Uzbek'
] as const;

const SPECIALTY_KEY_MAP: Record<string, string> = {
  'General Practice': 'generalPractice',
  'Cardiology': 'cardiology',
  'Neurology': 'neurology',
  'Ophthalmology': 'ophthalmology',
  'Orthopedics': 'orthopedics',
  'Pediatrics': 'pediatrics',
  'Dentistry': 'dentistry',
  'Dermatology': 'dermatology',
  'Endocrinology': 'endocrinology',
  'Pathology': 'pathology',
  'Pulmonology': 'pulmonology',
  'ENT': 'ent',
  'Rheumatology': 'rheumatology',
  'Surgery': 'surgery',
  'Urology': 'urology',
  'Psychiatry': 'psychiatry',
  'Oncology': 'oncology',
  'Nephrology': 'nephrology',
  'Gynecology': 'gynecology',
  'Radiology': 'radiology',
  'Allergy & Immunology': 'allergyImmunology',
  'Gastroenterology': 'gastroenterology',
  'General Medicine': 'generalMedicine'
};

const LANGUAGE_KEY_MAP: Record<string, string> = {
  'English': 'english',
  'Spanish': 'spanish',
  'French': 'french',
  'German': 'german',
  'Russian': 'russian',
  'Chinese': 'chinese',
  'Arabic': 'arabic',
  'Turkish': 'turkish',
  'Uzbek': 'uzbek'
};

const FilterSection = ({ 
  id, 
  title, 
  icon: Icon, 
  children, 
  isExpanded, 
  onToggle 
}: {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}) => (
  <div className="border-b border-border last:border-b-0">
    <Button
      variant="ghost"
      className="w-full justify-between p-4 h-auto"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="font-medium">{title}</span>
      </div>
      <ChevronDown 
        className={cn(
          "h-4 w-4 transition-transform",
          isExpanded && "rotate-180"
        )} 
      />
    </Button>
    
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="p-4 pt-0 space-y-4">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export function EnhancedFilters({ 
  filters, 
  onFiltersChange, 
  specialties = [...DEFAULT_SPECIALTIES],
  languages = [...DEFAULT_LANGUAGES],
  layout = 'sidebar',
  className 
}: EnhancedFiltersProps) {
  const { t } = useTranslation(['doctors']);
  const [expandedSections, setExpandedSections] = useState<string[]>(['specialty', 'availability']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const clearAllFilters = () => {
    onFiltersChange({
      specialty: undefined,
      location: undefined,
      minRating: undefined,
      priceRange: [0, 10000],
      distance: undefined,
      availableToday: false,
      acceptsNewPatients: false,
      videoConsultation: false,
      acceptsInsurance: false,
      language: undefined
    });
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const getSpecialtyLabel = (specialty: string) => {
    const key = SPECIALTY_KEY_MAP[specialty];
    if (!key) return specialty;
    return t(`doctors:specialties.${key}`, { defaultValue: specialty });
  };

  const getLanguageLabel = (language: string) => {
    const key = LANGUAGE_KEY_MAP[language];
    if (!key) return language;
    return t(`doctors:filters.languages.${key}`, { defaultValue: language });
  };

  return (
    <div className={cn(
      "bg-card rounded-xl border border-border",
      layout === 'sidebar' && "sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <span className="font-semibold">{t('doctors:search.filters')}</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 px-2 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                {t('doctors:search.clearFilters')}
              </Button>
            )}
            {layout === 'sidebar' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onFiltersChange({ showFilters: false })}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Active Filter Badges */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {filters.availableToday && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {t('doctors:filters.availability.availableToday')}
              </Badge>
            )}
            {filters.videoConsultation && (
              <Badge variant="outline" className="text-xs">
                <Video className="h-3 w-3 mr-1" />
                {t('doctors:filters.badges.video')}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Filter Sections */}
      <div>
        {/* Specialty */}
        <FilterSection 
          id="specialty" 
          title={t('doctors:search.specialty')} 
          icon={Filter}
          isExpanded={expandedSections.includes('specialty')}
          onToggle={() => toggleSection('specialty')}
        >
          <Select
            value={filters.specialty || '_all'}
            onValueChange={(value) => 
              onFiltersChange({ specialty: value === '_all' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t('doctors:specialties.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">{t('doctors:specialties.all')}</SelectItem>
              {specialties.map((specialty) => (
                <SelectItem key={specialty} value={specialty}>
                  {getSpecialtyLabel(specialty)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>

        {/* Location & Distance */}
        <FilterSection 
          id="location" 
          title={t('doctors:search.location')} 
          icon={MapPin}
          isExpanded={expandedSections.includes('location')}
          onToggle={() => toggleSection('location')}
        >
          <LocationSearch
            value={filters.location || ''}
            onChange={(location) => onFiltersChange({ location })}
            placeholder={t('doctors:search.location')}
          />
          
          <div>
            <Label className="text-sm">{t('doctors:filters.distance.label')}</Label>
            <Select
              value={String(filters.distance || 50)}
              onValueChange={(value) => onFiltersChange({ distance: parseInt(value) })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={t('doctors:filters.distance.any')} />
              </SelectTrigger>
              <SelectContent>
                {DISTANCE_OPTIONS.map((option) => (
                  <SelectItem key={option.key} value={String(option.value)}>
                    {t(`doctors:filters.distance.${option.key}`, { defaultValue: `${option.value} km` })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FilterSection>

        {/* Rating */}
        <FilterSection 
          id="rating" 
          title={t('doctors:search.rating')} 
          icon={Star}
          isExpanded={expandedSections.includes('rating')}
          onToggle={() => toggleSection('rating')}
        >
          <div>
            <Label className="text-sm">
              {t('doctors:filters.rating.minimum', { rating: filters.minRating || 0 })}
            </Label>
            <div className="mt-3">
              <Slider
                value={[filters.minRating || 0]}
                onValueChange={([value]) => onFiltersChange({ minRating: value })}
                max={5}
                min={0}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{t('doctors:filters.rating.any')}</span>
                <span>{t('doctors:filters.rating.max')}</span>
              </div>
            </div>
          </div>
        </FilterSection>

        {/* Price Range */}
        <FilterSection 
          id="price" 
          title={t('doctors:search.consultationFee')} 
          icon={DollarSign}
          isExpanded={expandedSections.includes('price')}
          onToggle={() => toggleSection('price')}
        >
          <div className="space-y-2">
            {PRICE_RANGES.map((range) => (
              <Button
                key={range.key}
                variant={filters.priceRange?.[1] === range.max ? "default" : "outline"}
                className="w-full justify-start text-sm"
                onClick={() => onFiltersChange({ priceRange: [range.min, range.max] })}
              >
                {t(`doctors:filters.priceRanges.${range.key}`, { defaultValue: range.key })}
              </Button>
            ))}
          </div>
        </FilterSection>

        {/* Availability */}
        <FilterSection 
          id="availability" 
          title={t('doctors:search.availability')} 
          icon={Clock}
          isExpanded={expandedSections.includes('availability')}
          onToggle={() => toggleSection('availability')}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                <Label className="text-sm">
                  {t('doctors:filters.availability.availableToday')}
                </Label>
              </div>
              <Switch
                checked={filters.availableToday || false}
                onCheckedChange={(checked) => onFiltersChange({ availableToday: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <Label className="text-sm">
                  {t('doctors:filters.availability.acceptsNewPatients')}
                </Label>
              </div>
              <Switch
                checked={filters.acceptsNewPatients || false}
                onCheckedChange={(checked) => onFiltersChange({ acceptsNewPatients: checked })}
              />
            </div>
          </div>
        </FilterSection>

        {/* Services */}
        <FilterSection 
          id="services" 
          title={t('doctors:filters.services.title')} 
          icon={Shield}
          isExpanded={expandedSections.includes('services')}
          onToggle={() => toggleSection('services')}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-purple-600" />
                <Label className="text-sm">
                  {t('doctors:filters.services.videoConsultation')}
                </Label>
              </div>
              <Switch
                checked={filters.videoConsultation || false}
                onCheckedChange={(checked) => onFiltersChange({ videoConsultation: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                <Label className="text-sm">
                  {t('doctors:filters.services.acceptsInsurance')}
                </Label>
              </div>
              <Switch
                checked={filters.acceptsInsurance || false}
                onCheckedChange={(checked) => onFiltersChange({ acceptsInsurance: checked })}
              />
            </div>
          </div>
        </FilterSection>

        {/* Language */}
        <FilterSection 
          id="language" 
          title={t('doctors:filters.language.title')} 
          icon={Globe}
          isExpanded={expandedSections.includes('language')}
          onToggle={() => toggleSection('language')}
        >
          <Select
            value={filters.language || '_all'}
            onValueChange={(value) => 
              onFiltersChange({ language: value === '_all' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t('doctors:filters.language.any')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">{t('doctors:filters.language.any')}</SelectItem>
              {languages.map((language) => (
                <SelectItem key={language} value={language}>
                  {getLanguageLabel(language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>
      </div>
    </div>
  );
}
