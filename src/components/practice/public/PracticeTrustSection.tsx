// src/components/practice/public/PracticeTrustSection.tsx
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Lock, Star, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { icon: BadgeCheck, key: 'verified', color: 'text-emerald-500', from: 'from-emerald-500/20', to: 'to-teal-500/10'   },
  { icon: Lock,       key: 'secure',   color: 'text-blue-500',    from: 'from-blue-500/20',   to: 'to-cyan-500/10'    },
  { icon: Star,       key: 'rated',    color: 'text-amber-500',   from: 'from-amber-500/20',  to: 'to-yellow-500/10'  },
  { icon: Calendar,   key: 'booked',   color: 'text-violet-500',  from: 'from-violet-500/20', to: 'to-purple-500/10'  },
] as const;

export default function PracticeTrustSection() {
  const { t, i18n } = useTranslation('practicePage');
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const isRTL  = i18n.language === 'ar';

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45 }}
      className={cn('py-4', isRTL && 'rtl')}
    >
      <h2 className="text-lg font-bold text-foreground mb-5 text-center">
        {t('practicePage.trust.title')}
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: i * 0.08, duration: 0.35 }}
              className={cn(
                'relative overflow-hidden rounded-2xl border border-border/60 p-4',
                'bg-gradient-to-br',
                item.from,
                item.to,
              )}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-background/60">
                <Icon className={cn('w-5 h-5', item.color)} />
              </div>
              <p className="text-sm font-semibold text-foreground leading-tight">
                {t(`practicePage.trust.${item.key}.title`)}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">
                {t(`practicePage.trust.${item.key}.description`)}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
