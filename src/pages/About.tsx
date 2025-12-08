import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Target, Eye, Heart, Shield } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useContentTranslation } from '@/hooks/useContentTranslation';
import { AboutIllustration } from '@/components/Visuals/illustrations';

interface AboutSection {
  id: string;
  section_key: string;
  title: string;
  content: string;
  order_index: number;
}

const sectionIcons: Record<string, any> = {
  mission: Target,
  vision: Eye,
  values: Heart,
  story: Shield,
};

export default function About() {
  const { t } = useTranslation(['common', 'about']);
  const { getTranslatedField } = useContentTranslation();
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAboutContent();
  }, []);

  const fetchAboutContent = async () => {
    try {
      const { data, error } = await supabase
        .from('about_content')
        .select('*')
        .eq('is_published', true)
        .order('order_index');

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching about content:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-8 text-primary-foreground hover:bg-white/20">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('about:hero.backButton')}
            </Button>
          </Link>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {t('about:hero.title')}
              </h1>
              <p className="text-xl md:text-2xl text-primary-foreground/90 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                {t('about:hero.subtitle')}
              </p>
            </div>
            <div className="hidden md:block">
              <AboutIllustration className="w-full max-w-md mx-auto" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {sections.map((section, index) => {
              const Icon = sectionIcons[section.section_key] || Target;
              return (
                <Card 
                  key={section.id}
                  className="transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-2xl">{getTranslatedField(section, 'title')}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <ReactMarkdown>{getTranslatedField(section, 'content')}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Technology Section */}
        <Card className="mt-12 border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Shield className="h-6 w-6 text-accent" />
              {t('about:technology.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t('about:technology.description')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold mb-2">{t('about:technology.features.encrypted.title')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('about:technology.features.encrypted.description')}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold mb-2">{t('about:technology.features.realtime.title')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('about:technology.features.realtime.description')}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background/50">
                <h4 className="font-semibold mb-2">{t('about:technology.features.access.title')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('about:technology.features.access.description')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <div className="mt-12 text-center">
          <h3 className="text-2xl font-semibold mb-4">{t('about:contact.title')}</h3>
          <p className="text-muted-foreground mb-6">
            {t('about:contact.subtitle')}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button variant="default" asChild>
              <a href="mailto:info@docito.com">{t('about:contact.generalInquiries')}</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:partnerships@docito.com">{t('about:contact.partnerships')}</a>
            </Button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/legal">
            <Button variant="ghost" size="sm">
              {t('about:contact.legalPolicies')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
