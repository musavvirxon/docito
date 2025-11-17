import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';

const Support = lazy(() => import('./Support'));

export default function SupportLocalized() {
  const { t } = useTranslation(['support']);

  return (
    <>
      <SEOHead
        title={t('support:hero.title')}
        description={t('support:hero.subtitle')}
        keywords="customer support, help center, contact support, technical assistance"
      />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <Support />
      </Suspense>
    </>
  );
}
