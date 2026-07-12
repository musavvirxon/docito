// src/pages/ImagingPublicProfile.tsx
import { Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, MessageSquare, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEOHead } from '@/components/SEOHead';
import { useImagingPublicProfile } from '@/hooks/useImagingPublicProfile';
import { useMessageAction } from '@/hooks/useMessageAction';
import { useAuth } from '@/contexts/AuthContext';
import FacilityHeroSection from '@/components/facility/public/FacilityHeroSection';
import FacilityStatsBar from '@/components/facility/public/FacilityStatsBar';
import FacilityContactSection from '@/components/facility/public/FacilityContactSection';
import ImagingProceduresSection from '@/components/facility/public/ImagingProceduresSection';
import PracticeTrustSection from '@/components/practice/public/PracticeTrustSection';

const Spinner = () => (
  <div className="flex justify-center py-6">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  </div>
);

export default function ImagingPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('practicePage');
  const { user } = useAuth();
  const { startConversation } = useMessageAction();

  const { center, loading, notFound } = useImagingPublicProfile(id);

  const isAdmin = !!(user && center && user.id === center.admin_id);

  const handleMessage = () => {
    if (center) startConversation(center.id);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: center?.name ?? 'Imaging Center', url: window.location.href });
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

  if (notFound || !center) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-semibold mb-2">{t('practicePage.imaging.notFoundTitle')}</h1>
            <p className="text-sm text-muted-foreground mb-6">{t('practicePage.imaging.notFoundDescription')}</p>
            <Button onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('practicePage.notFound.back')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const seoTitle = `${center.name}${center.city ? ` — ${center.city}` : ''} | Docito`;
  const seoDesc = `${center.name} on Docito.${center.city ? ` Located in ${center.city}.` : ''}${
    center.modalities?.length ? ` Imaging: ${center.modalities.slice(0, 3).join(', ')}.` : ''
  }`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'MedicalOrganization',
    name: center.name,
    image: center.logo_url || undefined,
    telephone: center.phone || undefined,
    email: center.email || undefined,
    url: center.website || `https://docito.app/imaging/${center.id}`,
    address: center.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: center.address,
          addressLocality: center.city || undefined,
          addressCountry: center.country || undefined,
        }
      : undefined,
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={seoTitle.slice(0, 60)}
        description={seoDesc.slice(0, 160)}
        image={center.logo_url || undefined}
        structuredData={structuredData}
        keywords={[center.name, center.city, 'imaging center', 'radiology', 'Docito'].filter(Boolean) as string[]}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-1">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('practicePage.back')}
        </Button>
      </div>

      <FacilityHeroSection
        facility={center}
        typeLabel={t('practicePage.imaging.title')}
        typeIcon={ScanLine}
        isAdmin={isAdmin}
        onEditClick={() => navigate('/imaging/dashboard')}
        onShare={handleShare}
        primaryAction={{
          label: t('practicePage.imaging.cta'),
          icon: MessageSquare,
          onClick: handleMessage,
        }}
      />

      <div className="mt-4">
        <FacilityStatsBar facility={center} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 mt-8 space-y-10">
        <ImagingProceduresSection center={center} />

        <FacilityContactSection facility={center} />

        <Suspense fallback={<Spinner />}>
          <PracticeTrustSection />
        </Suspense>
      </div>
    </div>
  );
}
