import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';

const FAQs = lazy(() => import('./FAQs'));

export default function FAQsLocalized() {
  const { t } = useTranslation(['faqs']);

  return (
    <>
      <SEOHead
        title={t('faqs:hero.title')}
        description={t('faqs:hero.subtitle')}
        keywords="frequently asked questions, FAQ, help, support, answers"
      />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <FAQs />
      </Suspense>
    </>
  );
}
