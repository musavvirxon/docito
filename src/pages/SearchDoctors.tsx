import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import Footer from '@/components/Footer';
import { Search, MapPin, Star, Clock, DollarSign, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function SearchDoctors() {
  const navigate = useNavigate();
  const { t } = useTranslation('doctors');
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minRating: 0,
    maxPrice: 1000,
    availability: 'any',
    insurance: 'any'
  });

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['search-doctors', searchQuery, location, specialty, filters],
    queryFn: async () => {
      let query = supabase
        .from('doctor_profiles_view')
        .select('*')
        .eq('verified', true);

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,specialty.ilike.%${searchQuery}%`);
      }

      if (specialty !== 'all') {
        query = query.eq('specialty', specialty);
      }

      if (filters.minRating > 0) {
        query = query.gte('average_rating', filters.minRating);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    }
  });

  const specialties = [
    { key: 'all', label: t('specialties.all') },
    { key: 'generalPractice', label: t('specialties.generalPractice') },
    { key: 'cardiology', label: t('specialties.cardiology') },
    { key: 'dermatology', label: t('specialties.dermatology') },
    { key: 'pediatrics', label: t('specialties.pediatrics') },
    { key: 'orthopedics', label: t('specialties.orthopedics') },
    { key: 'neurology', label: t('specialties.neurology') },
    { key: 'psychiatry', label: t('specialties.psychiatry') },
    { key: 'dentistry', label: t('specialties.dentistry') },
    { key: 'ophthalmology', label: t('specialties.ophthalmology') },
    { key: 'ent', label: t('specialties.ent') }
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="horizontal" size="sm" onClick={() => navigate('/')} className="cursor-pointer" />
            <button
              onClick={() => navigate('/auth')}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('page.signIn')}
            </button>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-primary/90 to-primary py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground text-center mb-4">
            {t('page.title')}
          </h1>
          <p className="text-xl text-primary-foreground/80 text-center mb-8">
            {t('page.subtitle')}
          </p>

          <div className="max-w-4xl mx-auto bg-card rounded-2xl shadow-2xl p-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('search.location')}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                />
              </div>

              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
              >
                {specialties.map(spec => (
                  <option key={spec.key} value={spec.key}>{spec.label}</option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? t('page.hideFilters') : t('page.showFilters')}
              </button>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setLocation('');
                  setSpecialty('all');
                  setFilters({ minRating: 0, maxPrice: 1000, availability: 'any', insurance: 'any' });
                }}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {t('page.clearAll')}
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t border-border grid md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">{t('page.minRating')}</label>
                  <select
                    value={filters.minRating}
                    onChange={(e) => setFilters({ ...filters, minRating: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border-2 border-input bg-background text-foreground"
                  >
                    <option value={0}>{t('page.anyRating')}</option>
                    <option value={3}>{t('page.threeStars')}</option>
                    <option value={4}>{t('page.fourStars')}</option>
                    <option value={4.5}>{t('page.fourHalfStars')}</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {isLoading ? t('page.searching') : t('page.doctorsFound', { count: doctors?.length || 0 })}
          </h2>
          <p className="text-muted-foreground">{t('page.showingVerified')}</p>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-card rounded-xl p-6 animate-pulse">
                <div className="w-24 h-24 bg-muted rounded-full mb-4" />
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : doctors && doctors.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map(doctor => (
              <DoctorCard key={doctor.id} doctor={doctor} navigate={navigate} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground mb-4">{t('page.noDoctors')}</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setLocation('');
                setSpecialty('all');
              }}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('search.clearFilters')}
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function DoctorCard({ doctor, navigate }: any) {
  const { t } = useTranslation('doctors');
  return (
    <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-border hover:border-primary">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-2xl font-bold">
          {doctor.full_name?.charAt(0) || 'D'}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground">{t('page.doctorPrefix')} {doctor.full_name}</h3>
          <p className="text-sm text-primary font-medium">{doctor.specialty}</p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-semibold text-foreground">{doctor.average_rating || 4.5}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{t('page.available')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="w-4 h-4" />
          <span>{t('page.consultationFee', { fee: doctor.consultation_fee || 100 })}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => navigate(`/doctor-profile/${doctor.id}`)}
          className="flex-1 px-4 py-2 rounded-lg border-2 border-primary text-primary hover:bg-primary/10 font-semibold"
        >
          {t('profile.viewProfile')}
        </button>
        <button
          onClick={() => navigate(`/booking/${doctor.id}`)}
          className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        >
          {t('page.bookNow')}
        </button>
      </div>
    </div>
  );
}
