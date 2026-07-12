// src/pages/LabPublicProfile.tsx
import { Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, MessageSquare, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEOHead } from '@/components/SEOHead';
import { useLabPublicProfile } from '@/hooks/useLabPublicProfile';
import { useMessageAction } from '@/hooks/useMessageAction';
import { useAuth } from '@/contexts/AuthContext';
import FacilityHeroSection from '@/components/facility/public/FacilityHeroSection';
import FacilityStatsBar from '@/components/facility/public/FacilityStatsBar';
import FacilityContactSection from '@/components/facility/public/FacilityContactSection';
import LabTestsSection from '@/components/facility/public/LabTestsSection';
import PracticeTrustSection from '@/components/practice/public/PracticeTrustSection';

const Spinner = () => (
  <div className="flex justify-center py-6">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  </div>
);

export default function LabPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('practicePage');
  const { user } = useAuth();
  const { startConversation } = useMessageAction();

  const { lab, loading, notFound } = useLabPublicProfile(id);

  const isAdmin = !!(user && lab && user.id === lab.admin_id);

  const handleMessage = () => {
    if (lab) startConversation(lab.id);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: lab?.name ?? 'Laboratory', url: window.location.href });
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

  if (notFound || !lab) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-semibold mb-2">{t('practicePage.lab.notFoundTitle')}</h1>
            <p className="text-sm text-muted-foreground mb-6">{t('practicePage.lab.notFoundDescription')}</p>
            <Button onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('practicePage.notFound.back')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const seoTitle = `${lab.name}${lab.city ? ` — ${lab.city}` : ''} | Docito`;
  const seoDesc = `${lab.name} on Docito.${lab.city ? ` Located in ${lab.city}.` : ''}${
    lab.services_offered?.length ? ` Tests: ${lab.services_offered.slice(0, 3).join(', ')}.` : ''
  }`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'MedicalOrganization',
    name: lab.name,
    image: lab.logo_url || undefined,
    telephone: lab.phone || undefined,
    email: lab.email || undefined,
    url: lab.website || `https://docito.app/lab/${lab.id}`,
    address: lab.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: lab.address,
          addressLocality: lab.city || undefined,
          addressCountry: lab.country || undefined,
        }
      : undefined,
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={seoTitle.slice(0, 60)}
        description={seoDesc.slice(0, 160)}
        image={lab.logo_url || undefined}
        structuredData={structuredData}
        keywords={[lab.name, lab.city, 'laboratory', 'lab tests', 'Docito'].filter(Boolean) as string[]}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-1">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('practicePage.back')}
        </Button>
      </div>

      <FacilityHeroSection
        facility={lab}
        typeLabel={lab.type || t('practicePage.lab.title')}
        typeIcon={FlaskConical}
        isAdmin={isAdmin}
        onEditClick={() => navigate('/lab/dashboard')}
        onShare={handleShare}
        primaryAction={{
          label: t('practicePage.lab.cta'),
          icon: MessageSquare,
          onClick: handleMessage,
        }}
      />

      <div className="mt-4">
        <FacilityStatsBar facility={lab} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 mt-8 space-y-10">
        <LabTestsSection lab={lab} />

        <FacilityContactSection facility={lab} />

        <Suspense fallback={<Spinner />}>
          <PracticeTrustSection />
        </Suspense>
      </div>
    </div>
  );
}
