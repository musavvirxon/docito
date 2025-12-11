import { useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CreditCard, Calendar, FolderOpen, BarChart3 } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const pillars = [
  {
    id: 'payments',
    icon: CreditCard,
    gradient: 'from-violet-500 to-purple-600',
    features: ['Secure Processing', 'Multiple Methods', 'Auto-invoicing'],
  },
  {
    id: 'scheduling',
    icon: Calendar,
    gradient: 'from-blue-500 to-cyan-500',
    features: ['Smart Booking', 'Reminders', 'Sync Calendar'],
  },
  {
    id: 'records',
    icon: FolderOpen,
    gradient: 'from-emerald-500 to-teal-500',
    features: ['Digital Files', 'Secure Storage', 'Easy Access'],
  },
  {
    id: 'analytics',
    icon: BarChart3,
    gradient: 'from-orange-500 to-amber-500',
    features: ['Real-time Data', 'Reports', 'Insights'],
  },
];

function PillarCard({ pillar, index }: { pillar: typeof pillars[0]; index: number }) {
  const { t } = useTranslation(['home']);
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: '-50px' });
  const Icon = pillar.icon;

  const directions = ['left', 'right', 'left', 'right'];
  const direction = directions[index];

  return (
    <motion.div
      ref={cardRef}
      initial={{ 
        opacity: 0, 
        x: direction === 'left' ? -100 : 100 
      }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative group"
    >
      <div className="relative overflow-hidden bg-background/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 lg:p-10 hover:border-primary/30 transition-all duration-500">
        {/* Gradient background on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${pillar.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
        
        {/* Icon with draw animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={isInView ? { scale: 1, rotate: 0 } : {}}
          transition={{ duration: 0.6, delay: index * 0.15 + 0.3, type: 'spring' }}
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${pillar.gradient} flex items-center justify-center mb-6 shadow-lg`}
        >
          <Icon className="w-8 h-8 text-white" />
        </motion.div>

        {/* Title */}
        <h3 className="text-2xl font-semibold text-foreground mb-4">
          {t(`home:pillars.${pillar.id}.title`, pillar.id)}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {t(`home:pillars.${pillar.id}.description`, `Comprehensive ${pillar.id} management for your practice`)}
        </p>

        {/* Features */}
        <ul className="space-y-3">
          {pillar.features.map((feature, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.15 + 0.4 + i * 0.1 }}
              className="flex items-center gap-3 text-sm text-foreground"
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${pillar.gradient}`} />
              {feature}
            </motion.li>
          ))}
        </ul>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.8, delay: index * 0.15 + 0.5 }}
          className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${pillar.gradient} origin-left`}
        />
      </div>
    </motion.div>
  );
}

export default function PlatformPillars() {
  const { t } = useTranslation(['home']);
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <section ref={sectionRef} className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4"
          >
            {t('home:pillars.badge', 'Platform Features')}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-light text-foreground mb-4"
          >
            {t('home:pillars.title', 'Four Pillars of Excellence')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            {t('home:pillars.subtitle', 'Everything you need to run a modern healthcare practice')}
          </motion.p>
        </div>

        {/* Pillars Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {pillars.map((pillar, index) => (
            <PillarCard key={pillar.id} pillar={pillar} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
