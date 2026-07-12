// src/pages/PharmacyPublicProfile.tsx
import { Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, MessageSquare, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEOHead } from '@/components/SEOHead';
import { usePharmacyPublicProfile } from '@/hooks/usePharmacyPublicProfile';
import { useMessageAction } from '@/hooks/useMessageAction';
import { useAuth } from '@/contexts/AuthContext';
import FacilityHeroSection from '@/components/facility/public/FacilityHeroSection';
import FacilityStatsBar from '@/components/facility/public/FacilityStatsBar';
import FacilityContactSection from '@/components/facility/public/FacilityContactSection';
import PharmacyServicesSection from '@/components/facility/public/PharmacyServicesSection';
import PracticeTrustSection from '@/components/practice/public/PracticeTrustSection';

const Spinner = () => (
  <div className="flex justify-center py-6">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  </div>
);

export default function PharmacyPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('practicePage');
  const { user } = useAuth();
  const { startConversation, loading: messageLoading } = useMessageAction();

  const { pharmacy, loading, notFound } = usePharmacyPublicProfile(id);

  const isAdmin = !!(user && pharmacy && user.id === pharmacy.admin_id);

  const handleMessage = () => {
    if (pharmacy) startConversation(pharmacy.id);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: pharmacy?.name ?? 'Pharmacy', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">{t('practicePage.loading')}</p>
      </div>
    );
  }

  if (notFound || !pharmacy) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-semibold mb-2">{t('practicePage.pharmacy.notFoundTitle')}</h1>
            <p className="text-sm text-muted-foreground mb-6">{t('practicePage.pharmacy.notFoundDescription')}</p>
            <Button onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('practicePage.notFound.back')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const seoTitle = `${pharmacy.name}${pharmacy.city ? ` — ${pharmacy.city}` : ''} | Docito`;
  const seoDesc = `${pharmacy.name} on Docito.${pharmacy.city ? ` Located in ${pharmacy.city}.` : ''}${
    pharmacy.delivery_available ? ' Delivery available.' : ''
  }`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    name: pharmacy.name,
    image: pharmacy.logo_url || undefined,
    telephone: pharmacy.phone || undefined,
    email: pharmacy.email || undefined,
    url: pharmacy.website || `https://docito.app/pharmacy/${pharmacy.id}`,
    address: pharmacy.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: pharmacy.address,
          addressLocality: pharmacy.city || undefined,
          addressCountry: pharmacy.country || undefined,
        }
      : undefined,
    aggregateRating:
      pharmacy.average_rating && pharmacy.num_reviews
        ? { '@type': 'AggregateRating', ratingValue: pharmacy.average_rating, reviewCount: pharmacy.num_reviews }
        : undefined,
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={seoTitle.slice(0, 60)}
        description={seoDesc.slice(0, 160)}
        image={pharmacy.logo_url || undefined}
        structuredData={structuredData}
        keywords={[pharmacy.name, pharmacy.city, 'pharmacy', 'Docito'].filter(Boolean) as string[]}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-1">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('practicePage.back')}
        </Button>
      </div>

      <FacilityHeroSection
        facility={pharmacy}
        typeLabel={t('practicePage.pharmacy.title')}
        typeIcon={Pill}
        isAdmin={isAdmin}
        onEditClick={() => navigate('/pharmacy/dashboard')}
        onShare={handleShare}
        primaryAction={{
          label: t('practicePage.pharmacy.cta'),
          icon: MessageSquare,
          onClick: handleMessage,
        }}
        extraBadges={
          pharmacy.delivery_available ? [{ label: t('practicePage.pharmacy.delivery'), icon: Pill }] : []
        }
      />

      <div className="mt-4">
        <FacilityStatsBar facility={pharmacy} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 mt-8 space-y-10">
        <PharmacyServicesSection pharmacy={pharmacy} />

        <FacilityContactSection facility={pharmacy} />

        <Suspense fallback={<Spinner />}>
          <PracticeTrustSection />
        </Suspense>
      </div>
    </div>
  );
}
