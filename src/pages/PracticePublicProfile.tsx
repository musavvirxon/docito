// src/pages/PracticePublicProfile.tsx
import { lazy, Suspense, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEOHead } from '@/components/SEOHead';
import { usePracticePublicProfile } from '@/hooks/usePracticePublicProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Lazy-load every section for fast initial paint
const PracticeHeroSection    = lazy(() => import('@/components/practice/public/PracticeHeroSection'));
const PracticeStatsBar       = lazy(() => import('@/components/practice/public/PracticeStatsBar'));
const PracticeAboutSection   = lazy(() => import('@/components/practice/public/PracticeAboutSection'));
const PracticeDoctorsSection = lazy(() => import('@/components/practice/public/PracticeDoctorsSection'));
const PracticeContactSection = lazy(() => import('@/components/practice/public/PracticeContactSection'));
const PracticeTrustSection   = lazy(() => import('@/components/practice/public/PracticeTrustSection'));

const Spinner = () => (
  <div className="flex justify-center py-6">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  </div>
);

export default function PracticePublicProfile() {
  const { id }            = useParams<{ id: string }>();
  const navigate          = useNavigate();
  const { toast }         = useToast();
  const { t, i18n }       = useTranslation('practicePage');
  const { user }          = useAuth();

  const { practice, doctors, loading, notFound } = usePracticePublicProfile(id);

  // Allow the admin to update the banner without refetching everything
  const [bannerOverride, setBannerOverride] = useState<string | null | undefined>(undefined);
  const effectiveBanner =
    bannerOverride !== undefined ? bannerOverride : practice?.banner_url ?? null;

  const isAdmin = !!(user && practice && user.id === practice.admin_id);

  // ── Auth gate ────────────────────────────────────────────────────────────
  const requireAuth = async (cb: () => void) => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      toast({ title: 'Sign in required', description: 'Please sign in to continue.' });
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    cb();
  };

  const handleBookClick = () =>
    requireAuth(() => {
      if (doctors.length > 0) navigate(`/book/${doctors[0].id}`);
      else toast({ title: 'No doctors available for online booking yet.' });
    });

  const handleBookWithDoctor = (doctorId: string) =>
    requireAuth(() => navigate(`/book/${doctorId}`));

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: practice?.name ?? 'Clinic', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: t('practicePage.linkCopied') });
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">{t('practicePage.loading')}</p>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (notFound || !practice) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-semibold mb-2">
              {t('practicePage.notFound.title')}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {t('practicePage.notFound.description')}
            </p>
            <Button onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('practicePage.notFound.back')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Localised text helpers ───────────────────────────────────────────────
  const lang       = i18n.language as 'en' | 'ru' | 'uz' | 'ar';
  const localName  = (practice as any)[`name_${lang}`] || practice.name;
  const localDesc  = (practice as any)[`description_${lang}`] || practice.description || '';

  // ── SEO ──────────────────────────────────────────────────────────────────
  const seoTitle = t('practicePage.seo.titleTemplate', {
    name: localName,
    city: practice.city ?? '',
  }).slice(0, 60);

  const seoDesc = t('practicePage.seo.descriptionTemplate', {
    name: localName,
    city: practice.city ?? '',
    specialties: practice.specialties?.slice(0, 3).join(', ') ?? localDesc.slice(0, 60),
  }).slice(0, 160);

  // Convert stored operating hours into Schema.org openingHours format
  const openingHours = useMemo(() => {
    if (!practice.operating_hours) return undefined;

    const dayOrder = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    const abbr: Record<string, string> = {
      Monday: 'Mo',
      Tuesday: 'Tu',
      Wednesday: 'We',
      Thursday: 'Th',
      Friday: 'Fr',
      Saturday: 'Sa',
      Sunday: 'Su',
    };

    const hours: string[] = [];
    let groupStart: string | null = null;
    let groupEnd: string | null = null;
    let groupSlot: string | null = null;

    const flushGroup = () => {
      if (!groupStart || !groupSlot) return;
      const startAbbr = abbr[groupStart];
      const endAbbr = abbr[groupEnd || groupStart];
      if (groupStart === groupEnd) {
        hours.push(`${startAbbr} ${groupSlot}`);
      } else {
        hours.push(`${startAbbr}-${endAbbr} ${groupSlot}`);
      }
      groupStart = null;
      groupEnd = null;
      groupSlot = null;
    };

    dayOrder.forEach((day) => {
      const entry = practice.operating_hours![day];
      if (!entry || entry.closed || !entry.open || !entry.close) {
        flushGroup();
        return;
      }
      const slot = `${entry.open}-${entry.close}`;
      if (groupSlot === slot) {
        groupEnd = day;
      } else {
        flushGroup();
        groupStart = day;
        groupEnd = day;
        groupSlot = slot;
      }
    });
    flushGroup();

    return hours.length ? hours : undefined;
  }, [practice.operating_hours]);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: localName,
    description: localDesc || undefined,
    image: practice.logo_url || undefined,
    telephone: practice.phone || undefined,
    email: practice.email || undefined,
    url:
      practice.website ||
      `https://docito.app/practices/${practice.id}`,
    address: practice.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: practice.address,
          addressLocality: practice.city || undefined,
          addressCountry: practice.country || undefined,
          postalCode: practice.zip_code || undefined,
        }
      : undefined,
    openingHours: openingHours,
    aggregateRating:
      practice.average_rating && practice.num_reviews
        ? {
            '@type': 'AggregateRating',
            ratingValue: practice.average_rating,
            reviewCount: practice.num_reviews,
          }
        : undefined,
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={seoTitle}
        description={seoDesc}
        image={practice.logo_url || undefined}
        structuredData={structuredData}
        keywords={[
          localName,
          practice.city,
          ...(practice.specialties ?? []),
          'clinic',
          'doctor',
          'Docito',
        ].filter(Boolean) as string[]}
      />

      {/* ── Topbar: back + admin ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-1 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('practicePage.back')}
        </Button>

        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate('/practice-settings')}
          >
            <Settings className="h-3.5 w-3.5" />
            {t('practicePage.admin.editProfile')}
          </Button>
        )}
      </div>

      {/* ── Hero (banner + identity card) ───────────────────────── */}
      <Suspense fallback={<Spinner />}>
        <PracticeHeroSection
          practice={{ ...practice, banner_url: effectiveBanner }}
          isAdmin={isAdmin}
          onBookClick={handleBookClick}
          onShare={handleShare}
          onBannerChange={(url) => setBannerOverride(url)}
        />
      </Suspense>

      {/* ── Stat pills ───────────────────────────────────────────── */}
      <div className="mt-4">
        <Suspense fallback={null}>
          <PracticeStatsBar practice={practice} doctors={doctors} />
        </Suspense>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 mt-8 space-y-10">

        <Suspense fallback={<Spinner />}>
          <PracticeAboutSection practice={practice} />
        </Suspense>

        <Suspense fallback={<Spinner />}>
          <PracticeDoctorsSection
            doctors={doctors}
            onBookWithDoctor={handleBookWithDoctor}
          />
        </Suspense>

        <Suspense fallback={<Spinner />}>
          <PracticeContactSection practice={practice} />
        </Suspense>

        <Suspense fallback={<Spinner />}>
          <PracticeTrustSection />
        </Suspense>

      </div>
    </div>
  );
}
