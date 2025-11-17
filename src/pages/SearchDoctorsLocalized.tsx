import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';

const SearchDoctors = lazy(() => import('./SearchDoctors'));

export default function SearchDoctorsLocalized() {
  const { t } = useTranslation(['doctors']);

  return (
    <>
      <SEOHead
        title={t('doctors:page.title')}
        description={t('doctors:page.subtitle')}
        keywords="find doctors, search doctors, book appointments, healthcare providers"
      />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <SearchDoctors />
      </Suspense>
    </>
  );
}
