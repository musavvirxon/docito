import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import SEO from '@/components/SEO/SEO';

export default function TermsOfService() {
  const { t } = useTranslation(['common', 'legal']);
  const { pathname } = useLocation();

  const canonical =
    typeof window !== 'undefined' ? new URL(pathname, window.location.origin).toString() : undefined;

  const title = t('legal:tos.title');
  const description = t('legal:tos.seoDescription');
  const contentMarkdown = t('legal:tos.contentMarkdown');

  const handleDownloadPDF = () => {
    toast.info(t('legal:detail.pdfComingSoon'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <SEO title={t('legal:tos.seoTitle')} description={description} canonical={canonical} />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link to="/legal">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('legal:tos.backToLegal')}
            </Button>
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold mb-2">{title}</h1>
              <p className="text-muted-foreground">
                {t('legal:tos.effectiveDateLabel')}: {t('legal:tos.effectiveDate')} ·{' '}
                {t('legal:tos.lastUpdatedLabel')}: {t('legal:tos.lastUpdated')}
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              {t('legal:detail.downloadPDF')}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none p-8">
            <ReactMarkdown>{contentMarkdown}</ReactMarkdown>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t('legal:tos.questions')}{' '}
            <a href="mailto:support@docito.app" className="text-primary hover:underline">
              support@docito.app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
