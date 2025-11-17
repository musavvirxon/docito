import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';

const BrowseSpecialties = lazy(() => import('./BrowseSpecialties'));

export default function BrowseSpecialtiesLocalized() {
  const { t } = useTranslation(['specialties']);

  return (
    <>
      <SEOHead
        title={t('specialties:page.title')}
        description={t('specialties:page.subtitle')}
        keywords="medical specialties, doctors by specialty, healthcare providers, specialists"
      />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <BrowseSpecialties />
      </Suspense>
    </>
  );
}
