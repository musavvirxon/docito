import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';

const Contact = lazy(() => import('./Contact'));

export default function ContactLocalized() {
  const { t } = useTranslation(['contact']);

  return (
    <>
      <SEOHead
        title={t('contact:hero.title')}
        description={t('contact:hero.subtitle')}
        keywords="contact us, customer support, help desk, healthcare support"
      />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <Contact />
      </Suspense>
    </>
  );
}
