// src/components/practice/public/PracticeHeroSection.tsx
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  BadgeCheck, MapPin, Phone, Star, Share2,
  Calendar, ExternalLink, ImagePlus, X, Loader2,
  Building2, Globe, Settings,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PracticePublicData } from '@/hooks/usePracticePublicProfile';

interface Props {
  practice: PracticePublicData;
  isAdmin: boolean;
  onBookClick: () => void;
  onShare: () => void;
  onBannerChange: (url: string | null) => void;
}

const BUCKET = 'entity-logos';

export default function PracticeHeroSection({
  practice,
  isAdmin,
  onBookClick,
  onShare,
  onBannerChange,
}: Props) {
  const { t, i18n } = useTranslation('practicePage');
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const lang = i18n.language as 'en' | 'ru' | 'uz' | 'ar';
  const localName =
    (practice as any)[`name_${lang}`] || practice.name;

  const location = [practice.address, practice.city, practice.country]
    .filter(Boolean)
    .join(', ');

  const rating = practice.average_rating ?? 0;
  const numReviews = practice.num_reviews ?? 0;
  const initials = localName.slice(0, 2).toUpperCase();

  // ── Banner upload ─────────────────────────────────────────────────────────
  const handleBannerUpload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image.');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `banners/practice-${practice.id}-banner.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { error: dbErr } = await supabase
        .from('practices')
        .update({ banner_url: publicUrl } as any)
        .eq('id', practice.id);
      if (dbErr) throw dbErr;

      onBannerChange(publicUrl);
      toast.success(t('practicePage.admin.bannerUploaded'));
    } catch (e: any) {
      toast.error(e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveBanner = async () => {
    await supabase
      .from('practices')
      .update({ banner_url: null } as any)
      .eq('id', practice.id);
    onBannerChange(null);
    toast.success(t('practicePage.admin.bannerRemoved'));
  };

  return (
    <div className={cn('relative', isRTL && 'rtl')}>
      {/* ── Banner strip ─────────────────────────────────────────────── */}
      <div className="relative w-full h-52 sm:h-64 lg:h-80 overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background">
        {practice.banner_url ? (
          <img
            src={practice.banner_url}
            alt={`${localName} banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          /* Decorative grid fallback */
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-8 gap-5 opacity-[0.04] select-none pointer-events-none px-8">
              {Array.from({ length: 40 }).map((_, i) => (
                <Building2 key={i} className="w-10 h-10 text-primary" />
              ))}
            </div>
          </div>
        )}

        {/* Bottom fade-out so the card below reads cleanly */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />

        {/* Admin banner controls */}
        {isAdmin && (
          <div className="absolute top-3 right-3 z-20 flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && handleBannerUpload(e.target.files[0])
              }
            />
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 shadow-lg backdrop-blur-sm bg-white/90 dark:bg-zinc-900/80 text-xs"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              {uploading
                ? t('practicePage.admin.uploadingBanner')
                : practice.banner_url
                ? t('practicePage.admin.editBanner')
                : t('practicePage.admin.uploadBanner')}
            </Button>

            {practice.banner_url && (
              <Button
                size="sm"
                variant="destructive"
                className="gap-1 shadow-lg text-xs"
                onClick={handleRemoveBanner}
              >
                <X className="h-3.5 w-3.5" />
                {t('practicePage.admin.removeBanner')}
              </Button>
            )}
          </div>
        )}

        {/* Hint when admin hasn't uploaded a banner */}
        {isAdmin && !practice.banner_url && (
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full whitespace-nowrap pointer-events-none">
            {t('practicePage.admin.bannerHint')}
          </p>
        )}
      </div>

      {/* ── Identity card ────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="relative -mt-16 sm:-mt-20 pb-2">
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
                    src={practice.logo_url ?? undefined}
                    alt={localName}
                    className="rounded-2xl object-contain bg-white dark:bg-white/5 p-1"
                  />
                  <AvatarFallback className="rounded-2xl text-2xl font-bold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {practice.verified && (
                  <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-background rounded-full flex items-center justify-center shadow-md border border-border">
                    <BadgeCheck className="w-4 h-4 text-blue-500" />
                  </div>
                )}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0 space-y-2.5">
                {/* Name row */}
                <div className="flex flex-wrap items-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
                    {localName}
                  </h1>
                  {practice.verified && (
                    <Badge className="mt-1 bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 text-xs shrink-0">
                      <BadgeCheck className="w-3 h-3 mr-1" />
                      {t('practicePage.verified')}
                    </Badge>
                  )}
                  {practice.practice_type && (
                    <Badge variant="secondary" className="mt-1 text-xs capitalize shrink-0">
                      {practice.practice_type}
                    </Badge>
                  )}
                </div>

                {/* Meta strip */}
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                  {location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      {location}
                    </span>
                  )}
                  {practice.phone && (
                    <a
                      href={`tel:${practice.phone}`}
                      className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      {practice.phone}
                    </a>
                  )}
                  {practice.website && (
                    <a
                      href={practice.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      {t('practicePage.website')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {practice.year_established && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 flex-shrink-0" />
                      {t('practicePage.hero.established', {
                        year: practice.year_established,
                      })}
                    </span>
                  )}
                </div>

                {/* Rating */}
                {numReviews > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-4 h-4',
                            i < Math.round(rating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-muted-foreground/25',
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t(
                        numReviews === 1
                          ? 'practicePage.hero.reviews'
                          : 'practicePage.hero.reviews_plural',
                        { count: numReviews },
                      )}
                    </span>
                  </div>
                )}

                {/* Admin indicator */}
                {isAdmin && (
                  <p className="text-[11px] text-primary/70 font-medium flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    {t('practicePage.admin.isAdmin')}
                  </p>
                )}
              </div>

              {/* CTA column */}
              <div className="flex flex-row sm:flex-col gap-2 sm:items-stretch w-full sm:w-auto flex-shrink-0">
                <Button onClick={onBookClick} className="gap-2 flex-1 sm:flex-none sm:min-w-[160px]">
                  <Calendar className="w-4 h-4" />
                  {t('practicePage.bookAppointment')}
                </Button>

                {practice.phone && (
                  <Button
                    variant="outline"
                    className="gap-2 flex-1 sm:flex-none"
                    asChild
                  >
                    <a href={`tel:${practice.phone}`}>
                      <Phone className="w-4 h-4" />
                      {t('practicePage.callClinic')}
                    </a>
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
