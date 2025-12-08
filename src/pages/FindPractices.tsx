import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import Footer from '@/components/Footer';
import { Search, MapPin, Building2, Users, Star, Phone, Mail, Globe, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FindPracticesIllustration } from '@/components/Visuals/illustrations';

export default function FindPractices() {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'practices']);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [practiceType, setPracticeType] = useState('all');

  const { data: practices, isLoading } = useQuery({
    queryKey: ['practices', searchQuery, location, practiceType],
    queryFn: async () => {
      let query = supabase
        .from('practices')
        .select('*')
        .eq('verified', true);

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      if (location) {
        query = query.or(`city.ilike.%${location}%,state.ilike.%${location}%`);
      }

      if (practiceType !== 'all') {
        query = query.eq('practice_type', practiceType);
      }

      const { data, error } = await query.order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  const practiceTypes = [
    { value: 'all', label: t('practices:types.all') },
    { value: 'Clinic', label: t('practices:types.clinic') },
    { value: 'Dental Practice', label: t('practices:types.dental') },
    { value: 'Hospital', label: t('practices:types.hospital') },
    { value: 'Diagnostic Center', label: t('practices:types.diagnostic') },
    { value: 'Urgent Care', label: t('practices:types.urgentCare') },
    { value: 'Medical Center', label: t('practices:types.medicalCenter') }
  ];

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
              {t('common:auth.signIn')}
            </button>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-primary/90 to-primary py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
                {t('practices:page.title')}
              </h1>
              <p className="text-xl text-primary-foreground/80 mb-8">
                {t('practices:page.subtitle')}
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden lg:flex justify-center"
            >
              <FindPracticesIllustration className="w-full max-w-xs" />
            </motion.div>
          </div>

          <div className="max-w-4xl mx-auto bg-card rounded-2xl shadow-2xl p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('practices:page.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('practices:page.locationPlaceholder')}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                />
              </div>

              <select
                value={practiceType}
                onChange={(e) => setPracticeType(e.target.value)}
                className="px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
              >
                {practiceTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {isLoading ? t('practices:page.searching') : t('practices:page.practicesFound', { count: practices?.length || 0 })}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-card rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-muted rounded mb-4" />
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : practices && practices.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {practices.map(practice => (
              <PracticeCard key={practice.id} practice={practice} navigate={navigate} t={t} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground mb-4">{t('practices:page.notFound.description')}</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setLocation('');
                setPracticeType('all');
              }}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('practices:page.notFound.clearFilters')}
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function PracticeCard({ practice, navigate, t }: any) {
  return (
    <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-border hover:border-primary">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground mb-1">{practice.name}</h3>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
            {practice.practice_type || t('practices:types.clinic')}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{practice.city && practice.state ? `${practice.city}, ${practice.state}` : t('practices:card.locationAvailable')}</span>
        </div>
        {practice.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{practice.phone}</span>
          </div>
        )}
        {practice.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>{practice.email}</span>
          </div>
        )}
        {practice.website && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Globe className="w-4 h-4" />
            <a href={practice.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {t('practices:card.visitWebsite')}
            </a>
          </div>
        )}
      </div>

      {practice.average_rating && (
        <div className="flex items-center gap-1 mb-4">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-semibold text-foreground">{practice.average_rating}</span>
          <span className="text-xs text-muted-foreground">({practice.num_reviews || 0} {t('practices:card.reviews')})</span>
        </div>
      )}

      <button
        onClick={() => navigate(`/practices/${practice.id}`)}
        className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold flex items-center justify-center gap-2"
      >
        {t('practices:card.viewPractice')}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
