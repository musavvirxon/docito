import { Logo } from '@/components/Logo';
import Footer from '@/components/Footer';
import { 
  Heart, Brain, Baby, Bone, Eye, Ear, 
  Smile, Pill, Stethoscope, Activity, 
  User, Microscope 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function BrowseSpecialties() {
  const navigate = useNavigate();
  const { t } = useTranslation(['specialties', 'doctors']);

  const specialties = [
    {
      name: t('doctors:specialties.cardiology'),
      key: 'cardiology',
      icon: Heart,
      description: t('specialties:cardiology.description'),
      doctorCount: 1247,
      color: 'from-red-500 to-pink-600'
    },
    {
      name: t('doctors:specialties.neurology'),
      key: 'neurology',
      icon: Brain,
      description: t('specialties:neurology.description'),
      doctorCount: 892,
      color: 'from-purple-500 to-indigo-600'
    },
    {
      name: t('doctors:specialties.pediatrics'),
      key: 'pediatrics',
      icon: Baby,
      description: t('specialties:pediatrics.description'),
      doctorCount: 2103,
      color: 'from-blue-400 to-cyan-500'
    },
    {
      name: t('doctors:specialties.orthopedics'),
      key: 'orthopedics',
      icon: Bone,
      description: t('specialties:orthopedics.description'),
      doctorCount: 1456,
      color: 'from-orange-500 to-amber-600'
    },
    {
      name: t('doctors:specialties.ophthalmology'),
      key: 'ophthalmology',
      icon: Eye,
      description: t('specialties:ophthalmology.description'),
      doctorCount: 678,
      color: 'from-green-500 to-emerald-600'
    },
    {
      name: t('doctors:specialties.ent'),
      key: 'ent',
      icon: Ear,
      description: t('specialties:ent.description'),
      doctorCount: 534,
      color: 'from-teal-500 to-cyan-600'
    },
    {
      name: t('doctors:specialties.dentistry'),
      key: 'dentistry',
      icon: Smile,
      description: t('specialties:dentistry.description'),
      doctorCount: 1789,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      name: t('doctors:specialties.dermatology'),
      key: 'dermatology',
      icon: Activity,
      description: t('specialties:dermatology.description'),
      doctorCount: 923,
      color: 'from-pink-500 to-rose-600'
    },
    {
      name: t('doctors:specialties.psychiatry'),
      key: 'psychiatry',
      icon: User,
      description: t('specialties:psychiatry.description'),
      doctorCount: 1145,
      color: 'from-violet-500 to-purple-600'
    },
    {
      name: t('doctors:specialties.generalPractice'),
      key: 'generalPractice',
      icon: Stethoscope,
      description: t('specialties:generalPractice.description'),
      doctorCount: 3421,
      color: 'from-blue-600 to-blue-700'
    },
    {
      name: t('specialties:pharmacy.name'),
      key: 'pharmacy',
      icon: Pill,
      description: t('specialties:pharmacy.description'),
      doctorCount: 2567,
      color: 'from-green-600 to-teal-600'
    },
    {
      name: t('specialties:laboratory.name'),
      key: 'laboratory',
      icon: Microscope,
      description: t('specialties:laboratory.description'),
      doctorCount: 456,
      color: 'from-indigo-500 to-blue-600'
    }
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
              {t('specialties:page.signIn')}
            </button>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-primary/90 to-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            {t('specialties:page.title')}
          </h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            {t('specialties:page.subtitle')}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {specialties.map((specialty, index) => (
            <SpecialtyCard key={index} specialty={specialty} navigate={navigate} />
          ))}
        </div>

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

      <Footer />
    </div>
  );
}

function SpecialtyCard({ specialty, navigate }: any) {
  const Icon = specialty.icon;
  const { t } = useTranslation('specialties');

  return (
    <div
      onClick={() => navigate(`/search-doctors?specialty=${specialty.key}`)}
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
