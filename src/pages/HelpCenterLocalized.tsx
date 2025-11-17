import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';

const HelpCenter = lazy(() => import('./HelpCenter'));

export default function HelpCenterLocalized() {
  const { t } = useTranslation(['help']);

  return (
    <>
      <SEOHead
        title={t('help:hero.title')}
        description={t('help:hero.subtitle')}
        keywords="help center, knowledge base, documentation, guides, tutorials"
      />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <HelpCenter />
      </Suspense>
    </>
  );
}
