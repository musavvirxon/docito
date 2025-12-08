import { Logo } from '@/components/Logo';
import Footer from '@/components/Footer';
import { 
  Calendar, Users, FileText, Bell, Shield, BarChart3, 
  Clock, CreditCard, MessageSquare, Video, Pill, 
  Check, Zap, Heart, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FeaturesIllustration } from '@/components/Visuals/illustrations';
import { motion } from 'framer-motion';

export default function Features() {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'features']);

  const mainFeatures = [
    {
      icon: Calendar,
      title: t('features:mainFeatures.scheduling.title'),
      description: t('features:mainFeatures.scheduling.description'),
      color: 'from-blue-500 to-indigo-600',
      benefits: [
        t('features:mainFeatures.scheduling.benefit1'),
        t('features:mainFeatures.scheduling.benefit2'),
        t('features:mainFeatures.scheduling.benefit3'),
        t('features:mainFeatures.scheduling.benefit4')
      ]
    },
    {
      icon: Users,
      title: t('features:mainFeatures.patientManagement.title'),
      description: t('features:mainFeatures.patientManagement.description'),
      color: 'from-purple-500 to-pink-600',
      benefits: [
        t('features:mainFeatures.patientManagement.benefit1'),
        t('features:mainFeatures.patientManagement.benefit2'),
        t('features:mainFeatures.patientManagement.benefit3'),
        t('features:mainFeatures.patientManagement.benefit4')
      ]
    },
    {
      icon: FileText,
      title: t('features:mainFeatures.healthRecords.title'),
      description: t('features:mainFeatures.healthRecords.description'),
      color: 'from-green-500 to-teal-600',
      benefits: [
        t('features:mainFeatures.healthRecords.benefit1'),
        t('features:mainFeatures.healthRecords.benefit2'),
        t('features:mainFeatures.healthRecords.benefit3'),
        t('features:mainFeatures.healthRecords.benefit4')
      ]
    },
    {
      icon: Video,
      title: t('features:mainFeatures.telemedicine.title'),
      description: t('features:mainFeatures.telemedicine.description'),
      color: 'from-red-500 to-orange-600',
      benefits: [
        t('features:mainFeatures.telemedicine.benefit1'),
        t('features:mainFeatures.telemedicine.benefit2'),
        t('features:mainFeatures.telemedicine.benefit3'),
        t('features:mainFeatures.telemedicine.benefit4')
      ]
    },
    {
      icon: Pill,
      title: t('features:mainFeatures.medication.title'),
      description: t('features:mainFeatures.medication.description'),
      color: 'from-cyan-500 to-blue-600',
      benefits: [
        t('features:mainFeatures.medication.benefit1'),
        t('features:mainFeatures.medication.benefit2'),
        t('features:mainFeatures.medication.benefit3'),
        t('features:mainFeatures.medication.benefit4')
      ]
    },
    {
      icon: BarChart3,
      title: t('features:mainFeatures.analytics.title'),
      description: t('features:mainFeatures.analytics.description'),
      color: 'from-indigo-500 to-purple-600',
      benefits: [
        t('features:mainFeatures.analytics.benefit1'),
        t('features:mainFeatures.analytics.benefit2'),
        t('features:mainFeatures.analytics.benefit3'),
        t('features:mainFeatures.analytics.benefit4')
      ]
    },
    {
      icon: CreditCard,
      title: t('features:mainFeatures.billing.title'),
      description: t('features:mainFeatures.billing.description'),
      color: 'from-emerald-500 to-green-600',
      benefits: [
        t('features:mainFeatures.billing.benefit1'),
        t('features:mainFeatures.billing.benefit2'),
        t('features:mainFeatures.billing.benefit3'),
        t('features:mainFeatures.billing.benefit4')
      ]
    },
    {
      icon: MessageSquare,
      title: t('features:mainFeatures.messaging.title'),
      description: t('features:mainFeatures.messaging.description'),
      color: 'from-pink-500 to-rose-600',
      benefits: [
        t('features:mainFeatures.messaging.benefit1'),
        t('features:mainFeatures.messaging.benefit2'),
        t('features:mainFeatures.messaging.benefit3'),
        t('features:mainFeatures.messaging.benefit4')
      ]
    },
    {
      icon: Bell,
      title: t('features:mainFeatures.notifications.title'),
      description: t('features:mainFeatures.notifications.description'),
      color: 'from-yellow-500 to-amber-600',
      benefits: [
        t('features:mainFeatures.notifications.benefit1'),
        t('features:mainFeatures.notifications.benefit2'),
        t('features:mainFeatures.notifications.benefit3'),
        t('features:mainFeatures.notifications.benefit4')
      ]
    }
  ];

  const securityFeatures = [
    { icon: Shield, title: t('features:security.hipaa.title'), description: t('features:security.hipaa.description') },
    { icon: Lock, title: t('features:security.encryption.title'), description: t('features:security.encryption.description') },
    { icon: Zap, title: t('features:security.backups.title'), description: t('features:security.backups.description') },
    { icon: Heart, title: t('features:security.uptime.title'), description: t('features:security.uptime.description') }
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
              {t('common:nav.signIn')}
            </button>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-primary/90 to-primary py-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              className="text-center lg:text-left"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-6xl font-bold text-primary-foreground mb-6">
                {t('features:hero.title')}
              </h1>
              <p className="text-xl text-primary-foreground/80 max-w-xl mb-8">
                {t('features:hero.subtitle')}
              </p>
              <button
                onClick={() => navigate('/signup')}
                className="px-8 py-4 rounded-lg bg-background text-foreground hover:bg-background/90 font-semibold text-lg transition-transform hover:scale-105"
              >
                {t('features:hero.cta')}
              </button>
            </motion.div>
            
            <motion.div 
              className="hidden lg:grid grid-cols-2 gap-4"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <FeaturesIllustration feature="appointments" className="w-full" />
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mt-8">
                <FeaturesIllustration feature="prescriptions" className="w-full" />
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 -mt-4">
                <FeaturesIllustration feature="files" className="w-full" />
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mt-4">
                <FeaturesIllustration feature="analytics" className="w-full" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            {t('features:mainSection.title')}
          </h2>
          <p className="text-xl text-muted-foreground">{t('features:mainSection.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mainFeatures.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </div>

      <div className="bg-slate-900 dark:bg-slate-950 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">{t('features:securitySection.title')}</h2>
            <p className="text-xl text-slate-300">{t('features:securitySection.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {securityFeatures.map((feature, index) => (
              <SecurityFeatureCard key={index} feature={feature} />
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-12 text-center">
          <h2 className="text-4xl font-bold text-primary-foreground mb-4">
            {t('features:cta.title')}
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            {t('features:cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 rounded-lg bg-background text-foreground hover:bg-background/90 font-semibold text-lg"
            >
              {t('features:cta.startTrial')}
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="px-8 py-4 rounded-lg border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 font-semibold text-lg"
            >
              {t('features:cta.scheduleDemo')}
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function FeatureCard({ feature }: any) {
  const Icon = feature.icon;

  return (
    <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border-2 border-border hover:border-primary">
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}>
        <Icon className="w-8 h-8 text-white" />
      </div>

      <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
      <p className="text-muted-foreground mb-6">{feature.description}</p>

      <ul className="space-y-2">
        {feature.benefits.map((benefit: string, index: number) => (
          <li key={index} className="flex items-center gap-2 text-sm text-foreground">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            {benefit}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SecurityFeatureCard({ feature }: any) {
  const Icon = feature.icon;

  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-blue-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
      <p className="text-slate-300 text-sm">{feature.description}</p>
    </div>
  );
}
