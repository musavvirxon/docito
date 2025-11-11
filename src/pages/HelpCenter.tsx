import { useState, useEffect } from 'react';
import { Logo } from '@/components/Logo';
import Footer from '@/components/Footer';
import { 
  Search, Book, Video, FileText, CreditCard, 
  Users, Calendar, HelpCircle, ChevronRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useContentTranslation } from '@/hooks/useContentTranslation';

export default function HelpCenter() {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'help']);
  const { getTranslatedField } = useContentTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHelpArticles();
  }, []);

  const fetchHelpArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching help articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedArticles = articles.reduce((acc, article) => {
    if (!acc[article.category]) {
      acc[article.category] = [];
    }
    acc[article.category].push(article);
    return acc;
  }, {} as Record<string, any[]>);

  const popularArticles = articles.filter(a => a.is_popular).slice(0, 5);

  const categoryConfig = [
    {
      key: 'getting_started',
      icon: Book,
      title: t('help:categories.gettingStarted.title'),
      description: t('help:categories.gettingStarted.description'),
      color: 'from-blue-500 to-indigo-600'
    },
    {
      key: 'appointments',
      icon: Calendar,
      title: t('help:categories.appointments.title'),
      description: t('help:categories.appointments.description'),
      color: 'from-green-500 to-teal-600'
    },
    {
      key: 'telemedicine',
      icon: Video,
      title: t('help:categories.telemedicine.title'),
      description: t('help:categories.telemedicine.description'),
      color: 'from-purple-500 to-pink-600'
    },
    {
      key: 'medical_records',
      icon: FileText,
      title: t('help:categories.medicalRecords.title'),
      description: t('help:categories.medicalRecords.description'),
      color: 'from-orange-500 to-red-600'
    },
    {
      key: 'billing_payments',
      icon: CreditCard,
      title: t('help:categories.billingPayments.title'),
      description: t('help:categories.billingPayments.description'),
      color: 'from-cyan-500 to-blue-600'
    },
    {
      key: 'account_management',
      icon: Users,
      title: t('help:categories.accountManagement.title'),
      description: t('help:categories.accountManagement.description'),
      color: 'from-pink-500 to-rose-600'
    }
  ].map(cat => ({
    ...cat,
    articles: groupedArticles[cat.key] || [],
    articleCount: (groupedArticles[cat.key] || []).length
  }));

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="horizontal" size="sm" onClick={() => navigate('/')} className="cursor-pointer" />
            <button
              onClick={() => navigate('/auth')}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('common:nav.signIn')}
            </button>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-primary/90 to-primary py-20">
        <div className="container mx-auto px-4 text-center">
          <HelpCircle className="w-16 h-16 text-primary-foreground mx-auto mb-6" />
          <h1 className="text-5xl font-bold text-primary-foreground mb-6">{t('help:hero.title')}</h1>
          <p className="text-xl text-primary-foreground/80 mb-8">{t('help:hero.subtitle')}</p>

          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('help:hero.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-16 pr-6 py-5 rounded-2xl text-lg border-none shadow-2xl bg-card text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-foreground mb-8">{t('help:categories.title')}</h2>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">{t('common:loading')}</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryConfig.map((category, index) => (
              <CategoryCard key={index} category={category} getTranslatedField={getTranslatedField} />
            ))}
          </div>
        )}
      </div>

      <div className="bg-card py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground mb-8">{t('help:popular.title')}</h2>

          {popularArticles.length === 0 ? (
            <p className="text-center text-muted-foreground">{t('help:popular.noArticles')}</p>
          ) : (
            <div className="space-y-4">
              {popularArticles.map((article, index) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between p-6 bg-background rounded-xl hover:bg-accent cursor-pointer transition-all border-2 border-transparent hover:border-primary"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {index + 1}
                    </div>
                    <span className="text-lg font-medium text-foreground">
                      {getTranslatedField(article, 'title')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {article.views.toLocaleString()} {t('help:popular.views')}
                    </span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">{t('help:cta.title')}</h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            {t('help:cta.subtitle')}
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="px-8 py-4 rounded-lg bg-background text-foreground hover:bg-background/90 font-semibold text-lg"
          >
            {t('help:cta.button')}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function CategoryCard({ category, getTranslatedField }: any) {
  const Icon = category.icon;
  const { t } = useTranslation('help');

  return (
    <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-border hover:border-primary group">
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-7 h-7 text-white" />
      </div>

      <h3 className="text-xl font-bold text-foreground mb-2">{category.title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
      <p className="text-sm text-primary font-semibold mb-4">
        {category.articleCount} {t('categories.articles')}
      </p>

      <ul className="space-y-2">
        {category.articles.slice(0, 4).map((article: any) => (
          <li key={article.id} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer">
            <ChevronRight className="w-4 h-4" />
            {getTranslatedField(article, 'title')}
          </li>
        ))}
      </ul>
    </div>
  );
}
