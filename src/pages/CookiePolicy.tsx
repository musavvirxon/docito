import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';

export default function CookiePolicy() {
  const { t } = useTranslation('legal');

  const title = t('cookiePolicy.title');
  const description = t('cookiePolicy.seoDescription');
  const email = t('cookiePolicy.contactEmail', 'support@docito.app');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <SEOHead title={t('cookiePolicy.seoTitle', title)} description={description} type="article" />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link to="/legal">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('detail.backToLegal')}
            </Button>
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold mb-2">{title}</h1>
              <div className="flex flex-col gap-1 text-muted-foreground">
                <p>
                  {t('detail.effectiveDate')}: {t('cookiePolicy.effectiveDate')}
                </p>
                <p>
                  {t('lastUpdated')}: {t('cookiePolicy.lastUpdated')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none p-8">
            <ReactMarkdown>{t('cookiePolicy.content')}</ReactMarkdown>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t('detail.questions')}{' '}
            <a href={`mailto:${email}`} className="text-primary hover:underline">
              {email}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
