// src/components/facility/public/FacilityStatsBar.tsx
import { motion } from 'framer-motion';
import { Star, Award } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { FacilityPublicData } from '@/types/facility';

export interface FacilityStat {
  icon: LucideIcon;
  value: string;
  label: string;
}

interface Props {
  facility: FacilityPublicData;
  extraStats?: FacilityStat[];
}

export default function FacilityStatsBar({ facility, extraStats = [] }: Props) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const stats: FacilityStat[] = [
    ...(facility.average_rating != null
      ? [{ icon: Star, value: facility.average_rating.toFixed(1), label: 'Avg. Rating' }]
      : []),
    ...((facility.num_reviews ?? 0) > 0
      ? [{ icon: Award, value: String(facility.num_reviews), label: 'Reviews' }]
      : []),
    ...extraStats,
  ];

  if (stats.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.18 }}
      className={cn('flex flex-wrap gap-2.5 max-w-6xl mx-auto px-4 sm:px-6', isRTL && 'rtl')}
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
