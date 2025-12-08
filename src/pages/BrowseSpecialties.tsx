import ModernNavbar from '@/components/home/ModernNavbar';
import ModernFooter from '@/components/home/ModernFooter';
import { 
  Heart, Brain, Baby, Bone, Eye, Ear, 
  Smile, Pill, Stethoscope, Activity, 
  User, Microscope 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SpecialtiesIllustration } from '@/components/Visuals/illustrations';

export default function BrowseSpecialties() {
  const navigate = useNavigate();
  const { t } = useTranslation(['specialties', 'doctors']);

  // Fetch specialty counts from backend
  const { data: specialtyCounts, isLoading } = useQuery({
    queryKey: ['specialty-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('specialty')
        .eq('verified', true);
      
      if (error) throw error;
      
      // Count doctors per specialty
      const counts: Record<string, number> = {};
      data?.forEach(doctor => {
        const specialty = doctor.specialty;
        counts[specialty] = (counts[specialty] || 0) + 1;
      });
      
      return counts;
    }
  });

  // Map specialty keys to database values
  const specialtyMapping: Record<string, string> = {
    'cardiology': 'Cardiology',
    'neurology': 'Neurology',
    'pediatrics': 'Pediatrics',
    'orthopedics': 'Orthopedics',
    'ophthalmology': 'Ophthalmology',
    'ent': 'ENT',
    'dentistry': 'Dentistry',
    'dermatology': 'Dermatology',
    'psychiatry': 'Psychiatry',
    'generalPractice': 'General Practice',
    'pharmacy': 'Pharmacy',
    'laboratory': 'Laboratory'
  };

  const specialties = [
    {
      name: t('doctors:specialties.cardiology'),
      key: 'cardiology',
      dbValue: 'Cardiology',
      icon: Heart,
      description: t('specialties:cardiology.description'),
      color: 'from-red-500 to-pink-600'
    },
    {
      name: t('doctors:specialties.neurology'),
      key: 'neurology',
      dbValue: 'Neurology',
      icon: Brain,
      description: t('specialties:neurology.description'),
      color: 'from-purple-500 to-indigo-600'
    },
    {
      name: t('doctors:specialties.pediatrics'),
      key: 'pediatrics',
      dbValue: 'Pediatrics',
      icon: Baby,
      description: t('specialties:pediatrics.description'),
      color: 'from-blue-400 to-cyan-500'
    },
    {
      name: t('doctors:specialties.orthopedics'),
      key: 'orthopedics',
      dbValue: 'Orthopedics',
      icon: Bone,
      description: t('specialties:orthopedics.description'),
      color: 'from-orange-500 to-amber-600'
    },
    {
      name: t('doctors:specialties.ophthalmology'),
      key: 'ophthalmology',
      dbValue: 'Ophthalmology',
      icon: Eye,
      description: t('specialties:ophthalmology.description'),
      color: 'from-green-500 to-emerald-600'
    },
    {
      name: t('doctors:specialties.ent'),
      key: 'ent',
      dbValue: 'ENT',
      icon: Ear,
      description: t('specialties:ent.description'),
      color: 'from-teal-500 to-cyan-600'
    },
    {
      name: t('doctors:specialties.dentistry'),
      key: 'dentistry',
      dbValue: 'Dentistry',
      icon: Smile,
      description: t('specialties:dentistry.description'),
      color: 'from-blue-500 to-indigo-600'
    },
    {
      name: t('doctors:specialties.dermatology'),
      key: 'dermatology',
      dbValue: 'Dermatology',
      icon: Activity,
      description: t('specialties:dermatology.description'),
      color: 'from-pink-500 to-rose-600'
    },
    {
      name: t('doctors:specialties.psychiatry'),
      key: 'psychiatry',
      dbValue: 'Psychiatry',
      icon: User,
      description: t('specialties:psychiatry.description'),
      color: 'from-violet-500 to-purple-600'
    },
    {
      name: t('doctors:specialties.generalPractice'),
      key: 'generalPractice',
      dbValue: 'General Practice',
      icon: Stethoscope,
      description: t('specialties:generalPractice.description'),
      color: 'from-blue-600 to-blue-700'
    },
    {
      name: t('specialties:pharmacy.name'),
      key: 'pharmacy',
      dbValue: 'Pharmacy',
      icon: Pill,
      description: t('specialties:pharmacy.description'),
      color: 'from-green-600 to-teal-600'
    },
    {
      name: t('specialties:laboratory.name'),
      key: 'laboratory',
      dbValue: 'Laboratory',
      icon: Microscope,
      description: t('specialties:laboratory.description'),
      color: 'from-indigo-500 to-blue-600'
    }
  ].map(specialty => ({
    ...specialty,
    doctorCount: specialtyCounts?.[specialty.dbValue] || 0
  }));

  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />

      <div className="bg-gradient-to-br from-primary/90 to-primary py-16 pt-32">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
                {t('specialties:page.title')}
              </h1>
              <p className="text-xl text-primary-foreground/80 max-w-2xl">
                {t('specialties:page.subtitle')}
              </p>
            </div>
            <div className="w-full max-w-xs lg:max-w-sm">
              <SpecialtiesIllustration className="w-full h-auto" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
              <div key={i} className="bg-card rounded-xl p-6 animate-pulse">
                <div className="w-16 h-16 bg-muted rounded-2xl mb-4" />
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded mb-4" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {specialties.map((specialty, index) => (
              <SpecialtyCard key={index} specialty={specialty} navigate={navigate} />
            ))}
          </div>
        )}

        <div className="mt-16 bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            {t('specialties:page.notFound.title')}
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-6">
            {t('specialties:page.notFound.description')}
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="px-8 py-3 rounded-lg bg-background text-foreground hover:bg-background/90 font-semibold"
          >
            {t('specialties:page.notFound.button')}
          </button>
        </div>
      </div>

      <ModernFooter />
    </div>
  );
}

function SpecialtyCard({ specialty, navigate }: any) {
  const Icon = specialty.icon;
  const { t } = useTranslation('specialties');

  return (
    <div
      onClick={() => navigate(`/search-doctors?specialty=${specialty.dbValue}`)}
      className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-border hover:border-primary group"
    >
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${specialty.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-8 h-8 text-white" />
      </div>

      <h3 className="text-xl font-bold text-foreground mb-2">{specialty.name}</h3>
      <p className="text-sm text-muted-foreground mb-4">{specialty.description}</p>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">
          {specialty.doctorCount.toLocaleString()} {t('page.doctors')}
        </span>
        <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
          {t('page.viewAll')} →
        </span>
      </div>
    </div>
  );
}
