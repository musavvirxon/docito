import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';

const Practices = lazy(() => import('./Practices'));

export default function PracticesLocalized() {
  const { t } = useTranslation(['practices']);

  return (
    <>
      <SEOHead
        title={t('practices:page.title')}
        description={t('practices:page.subtitle')}
        keywords="medical practices, clinics, hospitals, healthcare facilities"
      />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <Practices />
      </Suspense>
    </>
  );
}
