// src/components/practice/public/PracticeStatsBar.tsx
import { motion } from 'framer-motion';
import { Users, Star, Award, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { PracticePublicData, AffiliatedDoctor } from '@/hooks/usePracticePublicProfile';

interface Props {
  practice: PracticePublicData;
  doctors: AffiliatedDoctor[];
}

export default function PracticeStatsBar({ practice, doctors }: Props) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const stats = [
    {
      icon: Users,
      value: doctors.length > 0 ? String(doctors.length) : null,
      label: doctors.length === 1 ? 'Doctor' : 'Doctors',
    },
    {
      icon: Star,
      value: practice.average_rating != null ? practice.average_rating.toFixed(1) : null,
      label: 'Avg. Rating',
    },
    {
      icon: Award,
      value: (practice.num_reviews ?? 0) > 0 ? String(practice.num_reviews) : null,
      label: 'Reviews',
    },
    {
      icon: Stethoscope,
      value:
        (practice.specialties?.length ?? 0) > 0
          ? String(practice.specialties!.length)
          : null,
      label: 'Specialties',
    },
  ].filter((s) => s.value !== null);

  if (stats.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.18 }}
      className={cn(
        'flex flex-wrap gap-2.5 max-w-6xl mx-auto px-4 sm:px-6',
        isRTL && 'rtl',
      )}
    >
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <div
            key={i}
            className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-4 py-2 shadow-sm text-sm"
          >
            <Icon className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-bold text-foreground">{s.value}</span>
            <span className="text-muted-foreground text-xs">{s.label}</span>
          </div>
        );
      })}
    </motion.div>
  );
}
