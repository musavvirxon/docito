import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, Star, Video, Shield, ArrowUpDown, Grid, List } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SearchResult {
  id: string;
  type: "doctor" | "practice";
  name: string;
  specialty?: string;
  rating?: number;
  reviewCount?: number;
  location?: string;
  distance?: number;
  availableToday?: boolean;
  videoConsultation?: boolean;
  acceptsInsurance?: boolean;
  consultationFee?: number;
  imageUrl?: string;
  acceptsNewPatients?: boolean;
}

interface SearchResultsEnhancedProps {
  results: SearchResult[];
  isLoading: boolean;
  viewMode: "grid" | "list";
  sortBy: string;
  onViewModeChange: (mode: "grid" | "list") => void;
  onSortChange: (sort: string) => void;
  onViewProfile: (result: SearchResult) => void;
  onBookAppointment: (result: SearchResult) => void;
  totalCount?: number;
}

const SORT_OPTIONS = [
  { value: 'relevance', labelKey: 'doctors:results.sortOptions.relevance' },
  { value: 'rating', labelKey: 'doctors:results.sortOptions.rating' },
  { value: 'price_low', labelKey: 'doctors:results.sortOptions.price_low' },
  { value: 'price_high', labelKey: 'doctors:results.sortOptions.price_high' },
  { value: 'distance', labelKey: 'doctors:results.sortOptions.distance' },
  { value: 'availability', labelKey: 'doctors:results.sortOptions.availability' },
];

export function SearchResultsEnhanced({
  results,
  isLoading,
  viewMode,
  sortBy,
  onViewModeChange,
  onSortChange,
  onViewProfile,
  onBookAppointment,
  totalCount,
}: SearchResultsEnhancedProps) {
  const { t } = useTranslation(['doctors']);
  const doctorPrefix = t('doctors:results.doctorPrefix', { defaultValue: 'Dr.' }).trim();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isEmpty = !isLoading && results.length === 0;

  if (isEmpty) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold mb-2">{t("doctors:page.noDoctors")}</h3>
        <p className="text-muted-foreground">{t('doctors:results.tryAdjusting')}</p>
      </div>
    );
  }

  const ResultCard = ({ result, index }: { result: SearchResult; index: number }) => (
    <motion.div
      key={result.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(viewMode === "list" && "w-full")}
    >
      <Card
        className={cn(
          "p-4 cursor-pointer hover:shadow-md transition-shadow",
          expandedId === result.id && "ring-2 ring-primary"
        )}
        onClick={() => setExpandedId(expandedId === result.id ? null : result.id)}
      >
        <div className={cn("flex gap-4", viewMode === "list" ? "items-center" : "items-start")}>
          <Avatar className={cn(viewMode === "list" ? "h-16 w-16" : "h-14 w-14")}>
            <AvatarImage src={result.imageUrl} alt={result.name} />
            <AvatarFallback>
              {result.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {result.type === 'doctor' && doctorPrefix ? `${doctorPrefix} ` : ''}{result.name}
                </h3>
                {result.specialty && (
                  <p className="text-sm text-muted-foreground truncate">{result.specialty}</p>
                )}
              </div>

              <div className="text-right shrink-0">
                {typeof result.consultationFee === "number" && (
                  <div className="font-semibold text-primary">
                    ${result.consultationFee}
                    <span className="text-xs text-muted-foreground font-normal">{t('doctors:results.perVisit')}</span>
                  </div>
                )}
              </div>
            </div>

            {(result.location || typeof result.distance === "number") && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <MapPin className="h-4 w-4" />
                {result.location && <span className="truncate">{result.location}</span>}
                {typeof result.distance === "number" && (
                  <span className="shrink-0">• {result.distance.toFixed(1)} km</span>
                )}
              </div>
            )}

            {typeof result.rating === "number" && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{result.rating.toFixed(1)}</span>
                </div>
                {typeof result.reviewCount === "number" && (
                  <span className="text-sm text-muted-foreground">
                    ({result.reviewCount} {t("doctors:profile.reviews")})
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {result.availableToday && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {t('doctors:filters.availability.availableToday')}
                </Badge>
              )}
              {result.videoConsultation && (
                <Badge variant="secondary" className="text-xs">
                  <Video className="h-3 w-3 mr-1" />
                  {t('doctors:filters.badges.video')}
                </Badge>
              )}
              {result.acceptsInsurance && (
                <Badge variant="secondary" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  {t('doctors:filters.badges.insurance')}
                </Badge>
              )}
            </div>

            <AnimatePresence>
              {expandedId === result.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-border flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewProfile(result);
                      }}
                    >
                      {t("doctors:profile.viewProfile")}
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookAppointment(result);
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {t("doctors:page.bookNow")}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            {totalCount !== undefined ? totalCount : results.length} {t("doctors:page.foundText")}
          </h2>
          <p className="text-muted-foreground">{t("doctors:page.showingVerified")}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => onViewModeChange("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => onViewModeChange("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[180px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('doctors:results.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className={cn(
          viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"
        )}
      >
        {results.map((result, index) => (
          <ResultCard key={result.id} result={result} index={index} />
        ))}
      </div>
    </div>
  );
}
