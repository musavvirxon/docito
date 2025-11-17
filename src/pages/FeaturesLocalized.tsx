import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';

const Features = lazy(() => import('./Features'));

export default function FeaturesLocalized() {
  const { t } = useTranslation(['features']);

  return (
    <>
      <SEOHead
        title={t('features:hero.title')}
        description={t('features:hero.subtitle')}
        keywords="healthcare features, medical software, patient management, telemedicine"
      />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <Features />
      </Suspense>
    </>
  );
}
