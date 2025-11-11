import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, FileText, Cookie, Info, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useContentTranslation } from '@/hooks/useContentTranslation';

interface LegalPage {
  id: string;
  slug: string;
  title: string;
  description: string;
  updated_at: string;
}

const iconMap: Record<string, any> = {
  'privacy-policy': Shield,
  'terms-of-service': FileText,
  'cookie-policy': Cookie,
};

export default function Legal() {
  const { t } = useTranslation(['common', 'legal']);
  const { getTranslatedField } = useContentTranslation();
  const [legalPages, setLegalPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLegalPages();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('legal-pages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'legal_pages' }, () => {
        fetchLegalPages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLegalPages = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_pages')
        .select('*')
        .eq('is_published', true)
        .order('title');

      if (error) throw error;
      setLegalPages(data || []);
    } catch (error) {
      console.error('Error fetching legal pages:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('legal:backHome')}
            </Button>
          </Link>
          
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('legal:title')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {t('legal:subtitle')}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-full" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {legalPages.map((page) => {
                const Icon = iconMap[page.slug] || FileText;
                return (
                  <Link key={page.id} to={`/legal/${page.slug}`}>
                    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 group">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="mb-2 group-hover:text-primary transition-colors">
                              {getTranslatedField(page, 'title')}
                            </CardTitle>
                            <CardDescription className="line-clamp-2">
                              {getTranslatedField(page, 'description')}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {t('legal:lastUpdated')}: {format(new Date(page.updated_at), 'MMMM d, yyyy')}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}

              <Link to="/about">
                <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 group">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                        <Info className="h-6 w-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="mb-2 group-hover:text-accent transition-colors">
                          {t('legal:aboutUs.title')}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {t('legal:aboutUs.description')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t('legal:aboutUs.discover')}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <Card className="border-accent/20 bg-accent/5">
              <CardHeader>
                <CardTitle className="text-lg">{t('legal:principles.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span dangerouslySetInnerHTML={{ __html: t('legal:principles.dataIntegrity') }} />
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span dangerouslySetInnerHTML={{ __html: t('legal:principles.transparency') }} />
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span dangerouslySetInnerHTML={{ __html: t('legal:principles.accountability') }} />
                  </li>
                </ul>
              </CardContent>
            </Card>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {t('legal:contact.text')}
              </p>
              <Button variant="outline" asChild>
                <a href="mailto:legal@docito.com">legal@docito.com</a>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
