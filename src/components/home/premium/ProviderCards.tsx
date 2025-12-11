import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Stethoscope, 
  Building2, 
  Pill, 
  FlaskConical, 
  ScanLine, 
  Building,
  ArrowRight
} from 'lucide-react';

const providers = [
  {
    id: 'doctors',
    title: 'Doctors',
    icon: Stethoscope,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    glowColor: 'shadow-blue-500/20',
    iconColor: '#3b82f6',
  },
  {
    id: 'clinics',
    title: 'Clinics',
    icon: Building2,
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    glowColor: 'shadow-emerald-500/20',
    iconColor: '#10b981',
  },
  {
    id: 'pharmacies',
    title: 'Pharmacies',
    icon: Pill,
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    glowColor: 'shadow-amber-500/20',
    iconColor: '#f59e0b',
  },
  {
    id: 'labs',
    title: 'Labs',
    icon: FlaskConical,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    glowColor: 'shadow-purple-500/20',
    iconColor: '#8b5cf6',
  },
  {
    id: 'imaging',
    title: 'Imaging',
    icon: ScanLine,
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    glowColor: 'shadow-cyan-500/20',
    iconColor: '#06b6d4',
  },
  {
    id: 'hospitals',
    title: 'Hospitals',
    icon: Building,
    color: 'from-rose-500 to-rose-600',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    glowColor: 'shadow-rose-500/20',
    iconColor: '#f43f5e',
  },
];

function ProviderCard({ provider, index }: { provider: typeof providers[0]; index: number }) {
  const { t } = useTranslation(['home']);
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: '-100px' });
  const Icon = provider.icon;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="h-full"
    >
      <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        className={`relative group p-8 bg-background/50 backdrop-blur-xl border ${provider.borderColor} rounded-3xl shadow-xl ${provider.glowColor} hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden h-full flex flex-col`}
      >
        {/* Background glow */}
        <div className={`absolute inset-0 ${provider.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        
        {/* Animated border */}
        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${provider.color} opacity-20`} />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Icon */}
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={`w-16 h-16 ${provider.bgColor} rounded-2xl flex items-center justify-center mb-6`}
          >
            <Icon className="w-8 h-8" style={{ color: provider.iconColor }} />
          </motion.div>

          {/* Title - Capitalized */}
          <h3 className="text-xl font-semibold text-foreground mb-3 capitalize">
            {provider.title}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed flex-grow">
            {t(`home:providers.${provider.id}.description`, `Find and book with verified ${provider.title.toLowerCase()}`)}
          </p>

          {/* CTA */}
          <motion.button
            whileHover={{ x: 5 }}
            className="flex items-center gap-2 text-sm font-medium text-primary mt-auto"
          >
            <span>{t('home:providers.findProviders', 'Find Providers')}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-transparent via-transparent to-primary/5 rounded-full blur-2xl" />
      </motion.div>
    </motion.div>
  );
}

export default function ProviderCards() {
  const { t } = useTranslation(['home']);

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-background" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4"
          >
            Healthcare Network
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-foreground mb-4">
            Complete Healthcare Ecosystem
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Access verified healthcare providers across all specialties and services
          </p>
        </div>

        {/* Cards Grid - Equal height */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {providers.map((provider, index) => (
            <ProviderCard key={provider.id} provider={provider} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
