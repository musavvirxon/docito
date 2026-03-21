// src/components/home/premium/SpecialtiesCarousel.tsx
import { useMemo } from 'react';
import {
  Heart, Brain, Eye, Bone, Baby, Smile, Stethoscope, Activity,
  Pill, Syringe, Microscope, Wind, Ear, Hand, Scissors, Shield,
  Users, Sparkles, Flower2, ScanLine, Thermometer, Droplets,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import FadeIn from '@/components/howItWorks/FadeIn';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const specialties = [
  { icon: Heart, key: 'cardiology' },
  { icon: Brain, key: 'neurology' },
  { icon: Eye, key: 'ophthalmology' },
  { icon: Bone, key: 'orthopedics' },
  { icon: Baby, key: 'pediatrics' },
  { icon: Smile, key: 'dentistry' },
  { icon: Stethoscope, key: 'generalMedicine' },
  { icon: Activity, key: 'gastroenterology' },
  { icon: Pill, key: 'dermatology' },
  { icon: Syringe, key: 'endocrinology' },
  { icon: Microscope, key: 'pathology' },
  { icon: Wind, key: 'pulmonology' },
  { icon: Ear, key: 'ent' },
  { icon: Hand, key: 'rheumatology' },
  { icon: Scissors, key: 'surgery' },
  { icon: Shield, key: 'urology' },
  { icon: Users, key: 'psychiatry' },
  { icon: Sparkles, key: 'oncology' },
  { icon: Droplets, key: 'nephrology' },
  { icon: Flower2, key: 'gynecology' },
  { icon: ScanLine, key: 'radiology' },
  { icon: Thermometer, key: 'allergyImmunology' },
];

export default function SpecialtiesCarousel() {
  const { t } = useTranslation('premium');
  const navigate = useNavigate();
  const localizedSpecialties = useMemo(
    () =>
      specialties.map((specialty) => ({
        ...specialty,
        name: t(`specialties.list.${specialty.key}`, { defaultValue: specialty.key }),
      })),
    [t],
  );

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <FadeIn className="text-center">
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            {t('specialties.title', { defaultValue: 'Medical Specialties' })}
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto mb-6">
            {t('specialties.subtitle', { defaultValue: 'Find specialists across all medical disciplines' })}
          </p>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => navigate('/specialties')}
          >
            {t('specialties.viewAll', { defaultValue: 'View all specialties' })}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </FadeIn>
      </div>

      <div className="flex gap-6 overflow-x-auto scrollbar-hide px-8 pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {localizedSpecialties.map((specialty) => (
          <div
            key={specialty.key}
            className="flex-shrink-0 snap-center transition-transform duration-300 hover:scale-105 hover:-translate-y-1"
          >
            <button
              type="button"
              onClick={() => navigate('/specialties')}
              className="text-left"
              aria-label={t('specialties.browseAria', {
                specialty: specialty.name,
                defaultValue: `Browse ${specialty.name} providers`,
              })}
            >
              <div className="w-44 h-52 bg-card/80 backdrop-blur-sm rounded-3xl border border-border/50 p-6 flex flex-col items-center justify-center gap-4 cursor-pointer group transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
                <div className="w-18 h-18 rounded-2xl bg-primary/10 border border-primary/20 p-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <specialty.icon className="w-9 h-9 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground text-center leading-tight">{specialty.name}</span>
              </div>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
