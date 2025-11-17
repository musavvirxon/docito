import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';

const About = lazy(() => import('./About'));

export default function AboutLocalized() {
  const { t } = useTranslation(['about']);

  return (
    <>
      <SEOHead
        title={t('about:hero.title')}
        description={t('about:hero.subtitle')}
        keywords="about docito, healthcare platform, medical technology, patient care"
      />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <About />
      </Suspense>
    </>
  );
}
