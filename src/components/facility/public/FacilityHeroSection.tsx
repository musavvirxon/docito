// src/components/facility/public/FacilityHeroSection.tsx
//
// Shared hero for pharmacy / lab / imaging profile pages. Pharmacies,
// lab centers, and imaging centers don't have a banner_url column
// (unlike practices), so this uses a decorative gradient band instead
// of an uploaded banner — simpler, and nothing to upload/manage.
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BadgeCheck, MapPin, Phone, Star, Share2, Globe, ExternalLink } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { FacilityPublicData } from '@/types/facility';

export interface FacilityHeroAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

export interface FacilityHeroBadge {
  label: string;
  icon: LucideIcon;
}

interface Props {
  facility: FacilityPublicData;
  typeLabel: string;
  typeIcon: LucideIcon;
  isAdmin: boolean;
  onEditClick?: () => void;
  onShare: () => void;
  primaryAction: FacilityHeroAction;
  extraBadges?: FacilityHeroBadge[];
}

export default function FacilityHeroSection({
  facility,
  typeLabel,
  typeIcon: TypeIcon,
  isAdmin,
  onEditClick,
  onShare,
  primaryAction,
  extraBadges = [],
}: Props) {
  const { t, i18n } = useTranslation('practicePage');
  const isRTL = i18n.language === 'ar';

  const location = [facility.address, facility.city, facility.country].filter(Boolean).join(', ');
  const rating = facility.average_rating ?? 0;
  const numReviews = facility.num_reviews ?? 0;
  const initials = facility.name.slice(0, 2).toUpperCase();
  const PrimaryIcon = primaryAction.icon;

  return (
    <div className={cn('relative', isRTL && 'rtl')}>
      {/* Decorative header band */}
      <div className="relative w-full h-40 sm:h-48 overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-8 gap-5 opacity-[0.05] select-none pointer-events-none px-8">
            {Array.from({ length: 32 }).map((_, i) => (
              <TypeIcon key={i} className="w-9 h-9 text-primary" />
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="relative -mt-14 sm:-mt-16 pb-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card border border-border shadow-xl rounded-2xl p-5 sm:p-7"
          >
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-7 items-start">
              {/* Logo */}
              <div className="relative flex-shrink-0">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 ring-4 ring-primary/10 shadow-lg rounded-2xl">
                  <AvatarImage
                    src={facility.logo_url ?? undefined}
                    alt={facility.name}
                    className="rounded-2xl object-contain bg-white dark:bg-white/5 p-1"
                  />
                  <AvatarFallback className="rounded-2xl text-2xl font-bold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {facility.verified && (
                  <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-background rounded-full flex items-center justify-center shadow-md border border-border">
                    <BadgeCheck className="w-4 h-4 text-blue-500" />
                  </div>
                )}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex flex-wrap items-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
                    {facility.name}
                  </h1>
                  {facility.verified && (
                    <Badge className="mt-1 bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 text-xs shrink-0">
                      <BadgeCheck className="w-3 h-3 mr-1" />
                      {t('practicePage.verified')}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="mt-1 text-xs shrink-0 gap-1">
                    <TypeIcon className="w-3 h-3" />
                    {typeLabel}
                  </Badge>
                  {extraBadges.map((b) => {
                    const BIcon = b.icon;
                    return (
                      <Badge key={b.label} variant="outline" className="mt-1 text-xs shrink-0 gap-1">
                        <BIcon className="w-3 h-3" />
                        {b.label}
                      </Badge>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                  {location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      {location}
                    </span>
                  )}
                  {facility.phone && (
                    <a href={`tel:${facility.phone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      {facility.phone}
                    </a>
                  )}
                  {facility.website && (
                    <a
                      href={facility.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      {t('practicePage.website')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {numReviews > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-4 h-4',
                            i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/25',
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">
                      {t(numReviews === 1 ? 'practicePage.hero.reviews' : 'practicePage.hero.reviews_plural', {
                        count: numReviews,
                      })}
                    </span>
                  </div>
                )}

                {isAdmin && (
                  <p className="text-[11px] text-primary/70 font-medium">{t('practicePage.admin.isAdmin')}</p>
                )}
              </div>

              {/* CTA column */}
              <div className="flex flex-row sm:flex-col gap-2 sm:items-stretch w-full sm:w-auto flex-shrink-0">
                <Button onClick={primaryAction.onClick} className="gap-2 flex-1 sm:flex-none sm:min-w-[160px]">
                  <PrimaryIcon className="w-4 h-4" />
                  {primaryAction.label}
                </Button>

                {facility.phone && (
                  <Button variant="outline" className="gap-2 flex-1 sm:flex-none" asChild>
                    <a href={`tel:${facility.phone}`}>
                      <Phone className="w-4 h-4" />
                      {t('practicePage.call')}
                    </a>
                  </Button>
                )}

                {isAdmin && onEditClick && (
                  <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={onEditClick}>
                    {t('practicePage.admin.editProfile')}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onShare}
                  title={t('practicePage.shareProfile')}
                  className="shrink-0"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
