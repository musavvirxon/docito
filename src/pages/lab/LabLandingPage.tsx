// src/pages/lab/LabLandingPage.tsx
import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  FlaskConical,
  FileText,
  Clock,
  Shield,
  Lock,
  CheckCircle,
  ArrowRight,
  Stethoscope,
  Building2,
  Pill,
  Scan,
  BadgeCheck,
  Zap,
  BarChart3,
  Users,
  Microscope,
  TestTube,
  Activity,
  Calendar,
  DollarSign,
  Truck,
  Bell,
  FileCheck,
  Database,
  Globe,
  ChevronRight,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import AppleNavbar from '@/components/home/AppleNavbar';

const AnimatedSection = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const FeatureCard = ({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: any;
  title: string;
  description: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-xl p-8 h-full hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-300">
            <Icon className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-3 text-foreground">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </Card>
    </motion.div>
  );
};

export default function LabLandingPage() {
  const { t, i18n } = useTranslation(['labLanding']);
  const heroRef = useRef(null);

  const canonical = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://docito.app';
    return `${origin}/lab`;
  }, []);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.97]);

  const features = useMemo(
    () => [
      { icon: Microscope, title: t('features.items.0.title'), description: t('features.items.0.description') },
      { icon: TestTube, title: t('features.items.1.title'), description: t('features.items.1.description') },
      { icon: Truck, title: t('features.items.2.title'), description: t('features.items.2.description') },
      { icon: Calendar, title: t('features.items.3.title'), description: t('features.items.3.description') },
      { icon: DollarSign, title: t('features.items.4.title'), description: t('features.items.4.description') },
      { icon: BarChart3, title: t('features.items.5.title'), description: t('features.items.5.description') },
      { icon: Users, title: t('features.items.6.title'), description: t('features.items.6.description') },
      { icon: Bell, title: t('features.items.7.title'), description: t('features.items.7.description') },
      { icon: FileCheck, title: t('features.items.8.title'), description: t('features.items.8.description') },
    ],
    [t],
  );

  const compliance = useMemo(
    () => [
      { icon: Shield, text: t('compliance.items.0') },
      { icon: Lock, text: t('compliance.items.1') },
      { icon: Users, text: t('compliance.items.2') },
      { icon: FileText, text: t('compliance.items.3') },
      { icon: CheckCircle, text: t('compliance.items.4') },
    ],
    [t],
  );

  const ecosystem = useMemo(
    () => [
      { icon: Stethoscope, label: t('ecosystem.items.0') },
      { icon: Building2, label: t('ecosystem.items.1') },
      { icon: Pill, label: t('ecosystem.items.2') },
      { icon: Scan, label: t('ecosystem.items.3') },
      { icon: FlaskConical, label: t('ecosystem.items.4') },
      { icon: BadgeCheck, label: t('ecosystem.items.5') },
    ],
    [t],
  );

  return (
    <>
      <Helmet htmlAttributes={{ lang: i18n.language || 'en' }}>
        <title>{t('seo.title')}</title>
        <meta name="description" content={t('seo.description')} />
        <meta name="keywords" content={t('seo.keywords')} />
        <link rel="canonical" href={canonical} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'MedicalBusiness',
            name: t('schema.name'),
            description: t('schema.description'),
            areaServed: 'Global',
            serviceType: t('schema.serviceType'),
            url: canonical,
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background overflow-x-hidden">
        <AppleNavbar />

        {/* Hero */}
        <section
          ref={heroRef}
          className="relative min-h-[92vh] flex items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
          <div className="absolute inset-0">
            <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] animate-pulse" />
            <div
              className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] animate-pulse"
              style={{ animationDelay: '1s' }}
            />
          </div>

          <motion.div
            style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
            className="relative z-10 container mx-auto px-4 text-center max-w-5xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8"
            >
              <FlaskConical className="w-4 h-4" />
              <span className="text-sm font-medium tracking-wide">{t('hero.badge')}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[0.95]"
            >
              <span className="text-foreground">{t('hero.title1')}</span>
              <br />
              <span className="text-foreground">{t('hero.title2')}</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                {t('hero.title3')}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed font-light"
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button asChild size="lg" className="text-lg px-10 h-16 rounded-2xl shadow-lg shadow-primary/25">
                <Link to="/lab/register">
                  {t('hero.buttons.primary')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-10 h-16 rounded-2xl">
                <Link to="/contact">{t('hero.buttons.secondary')}</Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-16 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>{t('hero.stats.0')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span>{t('hero.stats.1')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <span>{t('hero.stats.2')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span>{t('hero.stats.3')}</span>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="py-32">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-4xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight">
                {t('features.title1')}{' '}
                <span className="text-primary">{t('features.title2')}</span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">{t('features.subtitle')}</p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {features.map((feature, index) => (
                <FeatureCard
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  delay={index * 0.08}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Connected Ecosystem */}
        <section className="py-32 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-primary/5 rounded-full blur-[170px]" />
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <AnimatedSection className="text-center max-w-4xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight">
                {t('ecosystem.title1')}{' '}
                <span className="text-primary">{t('ecosystem.title2')}</span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">{t('ecosystem.subtitle')}</p>
            </AnimatedSection>

            <AnimatedSection>
              <Card className="max-w-5xl mx-auto p-12 md:p-16 border-border/40 bg-card/40 backdrop-blur-xl">
                <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                  {ecosystem.map((item, index) => (
                    <motion.div
                      key={index}
                      className="flex flex-col items-center gap-4 group"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.08 }}
                      viewport={{ once: true }}
                    >
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center group-hover:border-primary/25 group-hover:shadow-lg transition-all duration-300">
                        <item.icon className="w-10 h-10 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        {item.label}
                      </span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-12 pt-8 border-t border-border/30 text-center">
                  <p className="text-muted-foreground">{t('ecosystem.note')}</p>
                </div>
              </Card>
            </AnimatedSection>
          </div>
        </section>

        {/* Compliance */}
        <section className="py-32">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight">
                {t('compliance.title1')}{' '}
                <span className="text-primary">{t('compliance.title2')}</span>
              </h2>
            </AnimatedSection>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 max-w-5xl mx-auto">
              {compliance.map((item, index) => (
                <AnimatedSection key={index}>
                  <Card className="p-6 md:p-8 text-center border-border/40 bg-card/40 backdrop-blur-xl h-full hover:border-primary/20 transition-all duration-500">
                    <item.icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">{item.text}</p>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <Card className="p-10 md:p-12 border-border/40 bg-gradient-to-br from-primary/10 via-background to-accent/10 backdrop-blur-xl">
                <div className="relative">
                  <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('cta.title')}</h2>
                  <p className="text-muted-foreground text-lg mb-6">{t('cta.description')}</p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" className="rounded-full px-8" asChild>
                      <Link to="/auth?mode=register">
                        {t('cta.primary')}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                      <Link to="/contact">
                        {t('cta.secondary')}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground mt-4">{t('cta.note')}</p>
                </div>
              </Card>
            </AnimatedSection>
          </div>
        </section>
      </div>
    </>
  );
}
