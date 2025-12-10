import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid, List, MapPin, Star, Clock, Video, Shield, 
  ChevronDown, ArrowUpDown, Bookmark, BookmarkCheck,
  Calendar, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface SearchResult {
  id: string;
  type: 'doctor' | 'practice';
  name: string;
  specialty?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  consultationFee?: number;
  distance?: number;
  availableToday?: boolean;
  acceptsInsurance?: boolean;
  videoConsultation?: boolean;
  acceptsNewPatients?: boolean;
  nextAvailable?: string;
}

interface SearchResultsEnhancedProps {
  results: SearchResult[];
  loading: boolean;
  totalCount: number;
  onViewProfile: (result: SearchResult) => void;
  onBookAppointment: (result: SearchResult) => void;
  onSaveResult?: (result: SearchResult) => void;
  savedIds?: string[];
  sortBy: string;
  onSortChange: (sort: string) => void;
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'distance', label: 'Distance' },
  { value: 'availability', label: 'Soonest Available' },
];

export function SearchResultsEnhanced({
  results,
  loading,
  totalCount,
  onViewProfile,
  onBookAppointment,
  onSaveResult,
  savedIds = [],
  sortBy,
  onSortChange,
}: SearchResultsEnhancedProps) {
  const { t } = useTranslation(['doctors']);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-40" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <MapPin className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('doctors:page.noDoctors')}</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or search terms
        </p>
      </motion.div>
    );
  }

  const ResultCard = ({ result, index }: { result: SearchResult; index: number }) => {
    const isSaved = savedIds.includes(result.id);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card className={cn(
          "overflow-hidden transition-all hover:shadow-md",
          viewMode === 'grid' ? '' : ''
        )}>
          <CardContent className={cn(
            "p-0",
            viewMode === 'list' ? 'flex gap-4' : ''
          )}>
            {/* Image/Avatar Section */}
            <div className={cn(
              viewMode === 'list' 
                ? 'w-32 h-32 shrink-0' 
                : 'aspect-square'
            )}>
              <Avatar className="w-full h-full rounded-none">
                <AvatarImage src={result.imageUrl} className="object-cover" />
                <AvatarFallback className="rounded-none text-2xl">
                  {result.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Content */}
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-semibold text-lg leading-tight">
                    {result.type === 'doctor' ? 'Dr. ' : ''}{result.name}
                  </h3>
                  {result.specialty && (
                    <p className="text-sm text-muted-foreground">{result.specialty}</p>
                  )}
                </div>
                {onSaveResult && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSaveResult(result);
                    }}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="h-5 w-5 text-primary" />
                    ) : (
                      <Bookmark className="h-5 w-5" />
                    )}
                  </Button>
                )}
              </div>

              {/* Location & Distance */}
              {result.location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  <span>{result.location}</span>
                  {result.distance && (
                    <span className="ml-1">• {result.distance.toFixed(1)} km</span>
                  )}
                </div>
              )}

              {/* Rating */}
              {result.rating !== undefined && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{result.rating.toFixed(1)}</span>
                  </div>
                  {result.reviewCount !== undefined && (
                    <span className="text-sm text-muted-foreground">
                      ({result.reviewCount} {t('doctors:profile.reviews')})
                    </span>
                  )}
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {result.availableToday && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <Clock className="h-3 w-3 mr-1" />
                    Available Today
                  </Badge>
                )}
                {result.videoConsultation && (
                  <Badge variant="secondary" className="text-xs">
                    <Video className="h-3 w-3 mr-1" />
                    Video
                  </Badge>
                )}
                {result.acceptsInsurance && (
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Insurance
                  </Badge>
                )}
              </div>

              {/* Price & Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-1">
                  {result.consultationFee !== undefined && (
                    <span className="font-semibold text-primary">
                      ${result.consultationFee}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">/visit</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewProfile(result)}
                  >
                    {t('doctors:profile.viewProfile')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onBookAppointment(result)}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    {t('doctors:page.bookNow')}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {totalCount} {t('doctors:page.foundText')}
          </span>
          <span className="text-muted-foreground text-sm">
            {t('doctors:page.showingVerified')}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Sort */}
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[180px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex border border-border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results Grid/List */}
      <div className={cn(
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
          : 'space-y-4'
      )}>
        <AnimatePresence mode="popLayout">
          {results.map((result, index) => (
            <ResultCard key={result.id} result={result} index={index} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
