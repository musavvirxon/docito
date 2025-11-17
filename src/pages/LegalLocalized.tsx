import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';

const Legal = lazy(() => import('./Legal'));

export default function LegalLocalized() {
  const { t } = useTranslation(['legal']);

  return (
    <>
      <SEOHead
        title={t('legal:title')}
        description={t('legal:subtitle')}
        keywords="legal, privacy policy, terms of service, GDPR, compliance"
      />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <Legal />
      </Suspense>
    </>
  );
}
